/**
 * AuthProvider.jsx – Központi hitelesítési kontextus (Supabase Auth)
 *
 * Feladatai:
 *   - az aktuális Supabase session betöltése és figyelése (onAuthStateChange);
 *   - a felhasználó profiljának betöltése a `profiles` táblából;
 *   - user / session / profile / loading / configured / error állapotok;
 *   - szerepkör (role) biztosítása a profil alapján;
 *   - kijelentkezési függvény;
 *   - INAKTÍV profil esetén automatikus kijelentkeztetés.
 *
 * A sessiont NEM saját localStorage-kulccsal kezeljük – a Supabase kliens
 * hivatalos session-kezelését használjuk (lásd supabaseClient.js).
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState(null);

  /** Profil betöltése a bejelentkezett userhez. Inaktív profil → kijelentkeztetés. */
  const loadProfile = useCallback(async (currentUser) => {
    if (!currentUser || !supabase) {
      setProfile(null);
      return null;
    }
    setProfileLoading(true);
    try {
      const { data, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name, role, active")
        .eq("id", currentUser.id)
        .single();

      if (profErr) {
        setError(profErr.message || "Profil betöltési hiba.");
        setProfile(null);
        return null;
      }

      if (data && data.active === false) {
        // Inaktív profil: ne engedjük be, jelentkeztessük ki.
        setError("A fiók inaktív. Keresd az adminisztrátort.");
        setProfile(null);
        await supabase.auth.signOut();
        return null;
      }

      setError(null);
      setProfile(data);
      return data;
    } catch (e) {
      setError(e?.message || "Ismeretlen profil hiba.");
      setProfile(null);
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    // Konfiguráció hiányában nem próbálunk hálózati hívást – tiszta állapot.
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    (async () => {
      try {
        const { data, error: sessErr } = await supabase.auth.getSession();
        if (!active) return;
        if (sessErr) setError(sessErr.message);

        const currentSession = data?.session ?? null;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await loadProfile(currentSession.user);
        }
      } catch (e) {
        if (active) setError(e?.message || "Session betöltési hiba.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        loadProfile(newSession.user);
      } else {
        setProfile(null);
      }
    });

    return () => {
      active = false;
      sub?.subscription?.unsubscribe();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const value = {
    session,
    user,
    profile,
    role: profile?.role ?? null,
    loading,
    profileLoading,
    error,
    configured: isSupabaseConfigured,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error("useAuth csak <AuthProvider> gyermekében használható.");
  }
  return ctx;
}

export default AuthProvider;
