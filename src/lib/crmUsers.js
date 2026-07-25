/**
 * crmUsers.js – Felhasználók és bejelentkezési adatok
 *
 * ============================================================================
 * ⚠️ DEPRECATED – RÉGI, NEM BIZTONSÁGOS HITELESÍTÉS
 * ============================================================================
 * Ez a modul a régi, localStorage + SHA-256 alapú hitelesítést valósítja meg.
 * A NORMÁL bejelentkezési folyamat MÁR NEM ezt használja – a bejelentkezés a
 * Supabase Auth-on keresztül történik (src/auth/AuthProvider.jsx, Login.jsx).
 *
 * Miért nem biztonságos (részletek: docs/SECURITY_MIGRATION.md):
 *   - a jelszóhash a kliensen, kulcsnyújtás (salt, iteráció) nélkül készül;
 *   - a felhasználólista és a hash a böngészőben / Drive-on olvasható;
 *   - a "jogosultság" csak kliensoldali – nincs szerveroldali kényszerítés.
 *
 * A régi SHA-256 hasheket NEM migráljuk automatikusan Supabase Auth alá –
 * a felhasználóknak új, Supabase Auth jelszót kell kapniuk.
 *
 * Még függő (importáló) fájlok – a későbbi migráció során átalakítandók:
 *   - src/pages/AdminPanel.jsx        (getUsers, saveUsersLocal, hashPw)
 *   - src/pages/Munkalapok.jsx        (getUsers – szerelő-névfeloldás)
 *   - src/pages/UjMunkalap.jsx        (getUsers)
 *   - src/modules/csapatok/CsapatokPage.jsx   (getUsers)
 *   - src/modules/projektek/ProjektForm.jsx   (getUsers)
 *   - src/lib/store.jsx               (getUsers)
 *   - src/components/DriveStatusPanel.jsx, src/App.jsx (hasDefaultPasswords)
 *
 * Ezért a fájlt EGYELŐRE nem töröljük; a `checkLogin`/`hashPw` a normál
 * belépésből ki van vezetve. A teljes leválasztás külön migrációs feladat.
 * ============================================================================
 */

import { loadLocal, saveLocal } from "./localDb";

const USERS_KEY = "crm_napelem_users";

export const DEFAULT_USERS = [
  {
    id: "u1",
    name: "E.D.I. Solutions",
    username: "edi",
    role: "Admin",
    color: "#2563EB",
    initials: "ED",
    passwordHash: "324f4c9d63f8ca13bd3f4cc8d44c7580103ca17b0591eb8346f965047e435528",
  },
  {
    id: "u2",
    name: "Kutasi László",
    username: "kutasi",
    role: "Telepítő",
    color: "#059669",
    initials: "KL",
    passwordHash: "f2a8773390397ff1007b9291dd9211e086761c819d060e0a765a1a41f54c1301",
  },
  {
    id: "u3",
    name: "Csapat2",
    username: "csapat2",
    role: "Telepítő",
    color: "#9333EA",
    initials: "C2",
    passwordHash: "f2a8773390397ff1007b9291dd9211e086761c819d060e0a765a1a41f54c1301",
  },
  {
    id: "u4",
    name: "Projektmenedzser",
    username: "projekt",
    role: "Projektmenedzser",
    color: "#D97706",
    initials: "PM",
    passwordHash: "a75190db4985fc14bb80dfe456c2fdaa807be9b7a19c1f83e039fc7acbfbf36f",
  },
  {
    id: "u5",
    name: "Iroda/Könyvelés",
    username: "iroda",
    role: "Iroda/Könyvelés",
    color: "#0891B2",
    initials: "IK",
    passwordHash: "803743b09a544cf12b3c4b5d97452be87ad8b680aca801c6aab80ebac531f9ac",
  },
];

/** Betölti a felhasználókat – localStorage / Drive felülbírálja az alapértékeket */
export function getUsers() {
  try {
    const stored = loadLocal(USERS_KEY);
    if (Array.isArray(stored) && stored.length > 0) return stored;
  } catch {}
  return DEFAULT_USERS;
}

/** Menti a felhasználókat localStorage-ba (Drive szinkron automatikus) */
export function saveUsersLocal(users) {
  saveLocal(USERS_KEY, users);
  window.dispatchEvent(new CustomEvent("crm-db-updated", {
    detail: { collection: USERS_KEY }
  }));
}

/** SHA-256 hash számítás (async) */
export async function hashPw(pw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Ellenőrzi, hogy bármelyik user még az alapértelmezett jelszót használja-e */
export function hasDefaultPasswords() {
  const users        = getUsers();
  const defaultHashes = new Set(DEFAULT_USERS.map(u => u.passwordHash));
  return users.some(u => defaultHashes.has(u.passwordHash));
}

/**
 * @deprecated Régi, nem biztonságos bejelentkezés (localStorage + SHA-256).
 * A normál belépés a Supabase Auth-ot használja (AuthProvider / Login.jsx).
 * Ne hívd új kódból.
 *
 * Bejelentkezés ellenőrzése – username vagy teljes névvel
 */
export async function checkLogin(username, password) {
  const users = getUsers();
  const user  = users.find(u =>
    u.username?.toLowerCase() === username.toLowerCase() ||
    u.name?.toLowerCase()     === username.toLowerCase()
  );
  if (!user) return { ok: false, error: "Nem található ilyen felhasználó!" };
  const hash = await hashPw(password);
  if (hash !== user.passwordHash) return { ok: false, error: "Hibás jelszó!" };
  const { passwordHash: _, defaultPassword: __, ...safe } = user;
  return { ok: true, user: safe };
}
