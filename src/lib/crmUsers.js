/**
 * crmUsers.js – Felhasználók és bejelentkezési adatok
 *
 * Felhasználók tárolása: localStorage["crm_napelem_users"] (Drive szinkron)
 * Jelszavak: SHA-256 hash – plain text soha nem kerül tárolásra.
 *
 * P0-001: Nincs hardcoded default user. Ha nincs konfigurált felhasználó,
 * a rendszer fail-closed – nem hoz létre automatikus hozzáférést.
 *
 * P0-004: A bejelentkezés NEM támaszkodhat kizárólag a helyi böngésző
 * localStorage-ára – az bármely új gépen / böngészőben / privát ablakban
 * üres. A checkLogin() ezért minden próbálkozás előtt frissíti a
 * felhasználói listát a Drive-ról (ha az elérhető), így bárki, aki ismeri
 * a belépési adatokat, bármelyik eszközről be tud lépni – a Drive a
 * kizárólagos, központi "igazság forrása".
 */

import { loadLocal, saveLocal } from "./localDb";
import { driveAvailable } from "./driveApi";

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

/**
 * Menti a felhasználókat localStorage-ba ÉS azonnal a Drive-ra is (ha elérhető).
 * P0-004 előtt ez a függvény CSAK helyben mentett – egy adminisztrátori
 * felhasználó-létrehozás/módosítás/törlés így addig nem terjedt más eszközre,
 * amíg valaki manuálisan meg nem nyomta a "Drive teljes mentés" gombot.
 * Most a saveCollection() gondoskodik a lokális + Drive mentésről egy helyen,
 * így minden más eszköz a következő checkLogin()-nál (refreshUsersFromDrive)
 * már az up-to-date listát látja.
 */
export async function saveUsersLocal(users) {
  if (!driveAvailable()) {
    // Nincs Drive konfigurálva – korábbi, helyi-only viselkedés megőrzése.
    saveLocal(USERS_KEY, users);
    window.dispatchEvent(new CustomEvent("crm-db-updated", {
      detail: { collection: USERS_KEY }
    }));
    return;
  }
  try {
    const { saveCollection } = await import("./dataSync.service");
    await saveCollection(USERS_KEY, users);
  } catch (e) {
    console.warn("[crmUsers] Drive felhasználó-mentés sikertelen, csak helyben mentve:", e?.message || e);
    saveLocal(USERS_KEY, users);
    window.dispatchEvent(new CustomEvent("crm-db-updated", {
      detail: { collection: USERS_KEY }
    }));
  }
}

/** SHA-256 hash számítás (async) */
export async function hashPw(pw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Felhasználólista frissítése a Drive-ról, MIELŐTT bejelentkezést ellenőriznénk.
 * Ez teszi lehetővé, hogy bármely eszközről / bárhonnan a világból be lehessen
 * lépni, nem csak arról a böngészőről, ahol a felhasználót eredetileg létrehozták.
 * A dataSync szolgáltatás id+updatedAt alapján összefésüli a Drive és a helyi
 * listát (soha nem töröl), és a végeredményt visszaírja a localStorage-ba.
 * Ha a Drive nem elérhető / hibázik, csendben a helyi (esetleg üres) listára esik
 * vissza – ez NEM új hiba, csak megőrzi a korábbi offline viselkedést.
 */
export async function refreshUsersFromDrive() {
  if (!driveAvailable()) return;
  try {
    // Lusta import: elkerüli a crmUsers.js ↔ dataSync.service.js közötti
    // felesleges, modulbetöltéskori kereszthivatkozást.
    const { loadCollectionWithStatus } = await import("./dataSync.service");
    // P0-005: a tombstone-lista MINDIG előbb kell, mint a user-lista – enélkül
    // egy már törölt fiók egy korábban használt gépen (aminek a cache-ében még
    // ott a régi rekord) egy pillanatra vissza tudna lépni, mielőtt a teljes
    // szinkron (App.jsx, belépés után) letisztítaná.
    await loadCollectionWithStatus("crm_tombstones");
    await loadCollectionWithStatus("crm_napelem_users");
  } catch (e) {
    console.warn("[crmUsers] Drive felhasználó-szinkron sikertelen:", e?.message || e);
  }
}

/** Bejelentkezés ellenőrzése – username vagy teljes névvel */
export async function checkLogin(username, password) {
  await refreshUsersFromDrive();
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