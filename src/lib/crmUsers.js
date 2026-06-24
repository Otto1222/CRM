/**
 * crmUsers.js – Felhasználók és bejelentkezési adatok
 *
 * Felhasználók tárolása: localStorage["crm_napelem_users"] (Drive szinkron)
 * Jelszavak: SHA-256 hash – plain text soha nem kerül tárolásra.
 *
 * P0-001: Nincs hardcoded default user. Ha nincs konfigurált felhasználó,
 * a rendszer fail-closed – nem hoz létre automatikus hozzáférést.
 */

import { loadLocal, saveLocal } from "./localDb";

const USERS_KEY = "crm_napelem_users";

/** Betölti a felhasználókat – CSAK localStorage / Drive szinkronból.
 *  Ha valamelyik rekordban még él a régi plaintext defaultPassword mező,
 *  egyszeri menet alatt eltávolítja és visszamenti (P0-001 scrub). */
export function getUsers() {
  try {
    const stored = loadLocal(USERS_KEY);
    if (Array.isArray(stored) && stored.length > 0) {
      const hasDirty = stored.some(u => "defaultPassword" in u);
      if (hasDirty) {
        const clean = stored.map(({ defaultPassword: _dp, ...u }) => u);
        saveLocal(USERS_KEY, clean);
        return clean;
      }
      return stored;
    }
  } catch {}
  return [];
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

/** P0-001: nincs beégetett default jelszó – mindig false */
export function hasDefaultPasswords() {
  return false;
}

/** Bejelentkezés ellenőrzése – username vagy teljes névvel */
export async function checkLogin(username, password) {
  const users = getUsers();
  if (users.length === 0) {
    return { ok: false, error: "Nincs konfigurált felhasználó. Adminisztrátori inicializálás szükséges." };
  }
  const user = users.find(u =>
    u.username?.toLowerCase() === username.toLowerCase() ||
    u.name?.toLowerCase()     === username.toLowerCase()
  );
  if (!user) return { ok: false, error: "Nem található ilyen felhasználó!" };
  const hash = await hashPw(password);
  if (hash !== user.passwordHash) return { ok: false, error: "Hibás jelszó!" };
  const { passwordHash: _, defaultPassword: __, ...safe } = user;
  return { ok: true, user: safe };
}