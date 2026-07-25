import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, LogIn, AlertTriangle } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../auth/AuthProvider";

// Kívülről egységes hibaüzenet – NEM árulja el, hogy az email létezik-e.
const GENERIC_AUTH_ERROR = "Hibás email-cím vagy jelszó.";

export default function Login() {
  const { configured, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!configured || !supabase) return;

    if (!email.trim() || !password) {
      setError("Add meg az email-címet és a jelszót!");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      // Sikeres belépésnél az AuthProvider veszi át (session + profil betöltés,
      // inaktív fiók esetén automatikus kijelentkeztetés). Itt nincs teendő.
      if (signInError) {
        // Egységes üzenet – ne szivárogtassuk ki a fiók létezését.
        setError(GENERIC_AUTH_ERROR);
      }
    } catch {
      setError(GENERIC_AUTH_ERROR);
    } finally {
      setLoading(false);
    }
  }

  // Inaktív fiók / profil-hiba üzenete az AuthProvider-től (sikeres jelszó után).
  const displayError = error || (!loading ? authError : "");

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(145deg, #051a17 0%, #082521 45%, ${C.accentDark} 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: FONT,
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .edi-input-wrap:focus-within { border-color: ${C.accent} !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(24,172,160,.12); }
        .edi-login-btn:not(:disabled):hover { background: ${C.accentHover} !important; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(24,172,160,.4) !important; }
      `}</style>

      <div style={{
        animation: "fadeUp .35s ease",
        background: "#fff", borderRadius: 24,
        padding: "44px 40px", width: "100%", maxWidth: 440,
        boxShadow: "0 32px 80px rgba(0,0,0,.45)",
      }}>

        {/* ── E.D.I. Logo ── */}
        <div style={{ marginBottom: 28, borderBottom: `2px solid ${C.accentLight}`, paddingBottom: 24 }}>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 800, fontSize: 36, color: C.accentDark, letterSpacing: 4, lineHeight: 1 }}>
            E.D.I.
          </div>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 13, color: C.accent, letterSpacing: 3, textTransform: "uppercase", marginTop: 4 }}>
            Solutions Kft.
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginTop: 10 }}>
            ELECTRONIC · DEVELOPMENT · INNOVATIONS
          </div>
        </div>

        <p style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 18, color: C.text, marginBottom: 4 }}>
          Bejelentkezés
        </p>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 28, fontWeight: 500 }}>
          CRM rendszer hozzáférés
        </p>

        {/* ── Konfiguráció hiánya – adminisztrátori üzenet ── */}
        {!configured && (
          <div style={{
            background: "#FFFBEB", border: "1.5px solid #FDE68A",
            borderRadius: 10, padding: "12px 14px", fontSize: 13,
            color: "#92400E", fontWeight: 600, marginBottom: 20,
            display: "flex", alignItems: "flex-start", gap: 8,
          }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              A hitelesítés nincs beállítva. Kérjük az adminisztrátort, hogy
              állítsa be a <b>VITE_SUPABASE_URL</b> és <b>VITE_SUPABASE_ANON_KEY</b>{" "}
              környezeti változókat.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Email ── */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
              Email-cím
            </label>
            <div className="edi-input-wrap" style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#F2F8F7",
              border: `1.5px solid ${displayError ? C.danger : C.border}`,
              borderRadius: 12, padding: "0 14px", transition: "all .15s",
            }}>
              <Mail size={16} color={C.muted} />
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
                placeholder="pl. nev@ceg.hu"
                autoFocus
                autoComplete="username"
                disabled={!configured}
                style={{ flex: 1, border: "none", outline: "none", fontSize: 15, padding: "13px 0", fontFamily: FONT, background: "transparent", color: C.text, fontWeight: 500 }}
              />
            </div>
          </div>

          {/* ── Jelszó ── */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
              Jelszó
            </label>
            <div className="edi-input-wrap" style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#F2F8F7",
              border: `1.5px solid ${displayError ? C.danger : C.border}`,
              borderRadius: 12, padding: "0 14px", transition: "all .15s",
            }}>
              <Lock size={16} color={C.muted} />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={!configured}
                style={{ flex: 1, border: "none", outline: "none", fontSize: 15, padding: "13px 0", fontFamily: FONT, background: "transparent", color: C.text, fontWeight: 500 }}
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                style={{ border: "none", background: "none", cursor: "pointer", padding: "4px", color: C.muted, display: "flex", alignItems: "center" }}
                tabIndex={-1}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* ── Hibaüzenet ── */}
          {displayError && (
            <div style={{
              background: C.dangerLight, border: `1.5px solid #FECACA`,
              borderRadius: 10, padding: "10px 14px", fontSize: 13,
              color: C.danger, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>⚠</span> {displayError}
            </div>
          )}

          {/* ── Bejelentkezés gomb ── */}
          <button
            type="submit"
            disabled={loading || !configured}
            className="edi-login-btn"
            style={{
              marginTop: 4, padding: "14px", borderRadius: 12, border: "none",
              background: (loading || !configured) ? C.muted : C.accent,
              color: "#fff", fontWeight: 700, fontSize: 15,
              cursor: (loading || !configured) ? "not-allowed" : "pointer",
              fontFamily: FONT, display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, transition: "all .15s",
              boxShadow: (loading || !configured) ? "none" : `0 4px 16px rgba(24,172,160,.35)`,
              letterSpacing: 0.5,
            }}>
            {loading ? (
              <>
                <span style={{ display: "inline-block", width: 17, height: 17, border: "2.5px solid rgba(255,255,255,.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                Ellenőrzés...
              </>
            ) : (
              <><LogIn size={18} /> Bejelentkezés</>
            )}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 24, fontWeight: 500 }}>
          Elfelejtett jelszó? Kérd az adminisztrátortól.
        </p>
      </div>
    </div>
  );
}
