/**
 * supabaseClient.js – Központi Supabase kliens
 *
 * A kliens KIZÁRÓLAG a következő publikus környezeti változókat használja:
 *   - VITE_SUPABASE_URL       (a Supabase projekt publikus URL-je)
 *   - VITE_SUPABASE_ANON_KEY  (publikus anon kulcs)
 *
 * BIZTONSÁG:
 *   - A service_role kulcs SOHA nem kerülhet ide vagy bármely frontend fájlba.
 *     A böngészőbe kizárólag az anon key kerülhet, és a védelmet az adatbázis
 *     Row Level Security (RLS) házirendjei biztosítják – nem ez a kliens.
 *   - Ha a konfiguráció hiányzik, az alkalmazás NEM omlik össze értelmezhetetlen
 *     hibával: `isSupabaseConfigured` false lesz, és a UI konfigurációs
 *     állapotot jelez. A `supabase` export ilyenkor null.
 */

import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Igaz, ha mindkét kötelező publikus környezeti változó be van állítva.
 * A komponensek ezt használják, hogy elkerüljék a null kliens hívását.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured && import.meta.env.DEV) {
  // Fejlesztői figyelmeztetés – nem dob kivételt, hogy a többi (localStorage
  // alapú) funkció fejlesztés közben továbbra is működjön.
  console.warn(
    "[supabaseClient] Hiányzó konfiguráció: állítsd be a VITE_SUPABASE_URL és " +
      "VITE_SUPABASE_ANON_KEY változókat egy .env.local fájlban " +
      "(minta: .env.example). A hitelesítés addig nem lesz elérhető."
  );
}

/**
 * A megosztott Supabase kliens példány, vagy null ha nincs konfigurálva.
 *
 * A session-kezelést a Supabase hivatalos mechanizmusa végzi (localStorage-ban
 * tárolt token frissítéssel) – NE használj saját session-kulcsot mellette.
 */
export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export default supabase;
