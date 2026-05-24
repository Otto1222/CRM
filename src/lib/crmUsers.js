/**
 * crmUsers.js – Felhasználók és bejelentkezési adatok
 *
 * Admin (E.D.I. Solutions) a Beállítások → Felhasználók oldalon
 * tud jelszót változtatni. A változtatások localStorage-ban tárolódnak,
 * így azonnal érvénybe lépnek a saját gépén. Végleges változtatáshoz
 * szóljon a fejlesztőnek hogy frissítse ezt a fájlt.
 *
 * Alapértelmezett jelszavak:
 *   E.D.I. Solutions   → Napelem123
 *   Kutasi László      → Telepito123
 *   Csapat2            → Telepito123
 *   Projektmenedzser   → Projekt123
 *   Iroda/Könyvelés    → Iroda123
 */

export const DEFAULT_USERS = [
  {
    id: "u1",
    name: "E.D.I. Solutions",
    username: "edi",
    role: "Admin",
    color: "#2563EB",
    initials: "ED",
    // SHA-256("Napelem123")
    passwordHash: "324f4c9d63f8ca13bd3f4cc8d44c7580103ca17b0591eb8346f965047e435528",
    defaultPassword: "Napelem123",
  },
  {
    id: "u2",
    name: "Kutasi László",
    username: "kutasi",
    role: "Telepítő",
    color: "#059669",
    initials: "KL",
    // SHA-256("Telepito123")
    passwordHash: "f2a8773390397ff1007b9291dd9211e086761c819d060e0a765a1a41f54c1301",
    defaultPassword: "Telepito123",
  },
  {
    id: "u3",
    name: "Csapat2",
    username: "csapat2",
    role: "Telepítő",
    color: "#9333EA",
    initials: "C2",
    // SHA-256("Telepito123")
    passwordHash: "f2a8773390397ff1007b9291dd9211e086761c819d060e0a765a1a41f54c1301",
    defaultPassword: "Telepito123",
  },
  {
    id: "u4",
    name: "Projektmenedzser",
    username: "projekt",
    role: "Projektmenedzser",
    color: "#D97706",
    initials: "PM",
    // SHA-256("Projekt123")
    passwordHash: "a75190db4985fc14bb80dfe456c2fdaa807be9b7a19c1f83e039fc7acbfbf36f",
    defaultPassword: "Projekt123",
  },
  {
    id: "u5",
    name: "Iroda/Könyvelés",
    username: "iroda",
    role: "Iroda/Könyvelés",
    color: "#0891B2",
    initials: "IK",
    // SHA-256("Iroda123")
    passwordHash: "803743b09a544cf12b3c4b5d97452be87ad8b680aca801c6aab80ebac531f9ac",
    defaultPassword: "Iroda123",
  },
];

const LS_KEY = "crm_napelem_users";

/** Betölti a felhasználókat – localStorage felülbírálja az alapértékeket */
export function getUsers() {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_USERS;
}

/** Menti a felhasználókat localStorage-ba */
export function saveUsersLocal(users) {
  localStorage.setItem(LS_KEY, JSON.stringify(users));
}

/** SHA-256 hash számítás */
export async function hashPw(pw) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Bejelentkezés ellenőrzése */
export async function checkLogin(username, password) {
  const users = getUsers();
  const user  = users.find(u =>
    u.username.toLowerCase() === username.toLowerCase() ||
    u.name.toLowerCase()     === username.toLowerCase()
  );
  if (!user) return { ok: false, error: "Nem található ilyen felhasználó!" };
  const hash = await hashPw(password);
  if (hash !== user.passwordHash) return { ok: false, error: "Hibás jelszó!" };
  const { passwordHash: _, defaultPassword: __, ...safe } = user;
  return { ok: true, user: safe };
}
