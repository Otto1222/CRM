/**
 * roles.js – Szerepkör alapú UI-jogosultság (MEGJELENÍTÉSI védelem)
 *
 * ⚠️ FONTOS BIZTONSÁGI FIGYELMEZTETÉS
 * ---------------------------------------------------------------------------
 * Ez a modul KIZÁRÓLAG megjelenítési (UI) védelmet ad: mit lát / hova
 * navigálhat a felhasználó a felületen. Ez NEM adatbiztonsági határ.
 *
 * A tényleges adatbiztonságot az adatbázis Row Level Security (RLS)
 * házirendjei adják (supabase/migrations/…_rls_policies.sql). A frontend
 * jogosultság megkerülhető (pl. módosított kliens), az RLS nem.
 *
 * Ne készíts olyan függvényt, amely admin jogot KIZÁRÓLAG localStorage /
 * kliensoldali állapot alapján feltételez – az érdemi ellenőrzés a DB-ben van.
 * ---------------------------------------------------------------------------
 *
 * Szerepkör-elnevezések:
 *   - Adatbázis (profiles.role, kisbetűs): admin | projektmenedzser | iroda | telepito
 *   - Régi UI-címkék (magyar):             Admin | Projektmenedzser | Iroda/Könyvelés | Telepítő
 *
 * A `normalizeRole()` mindkét formát egységes, kisbetűs DB-kulccsá alakítja,
 * így a segédfüggvények mindkét jelöléssel hibátlanul működnek a migráció
 * átmeneti időszakában.
 */

// Kanonikus (adatbázis) szerepkörök
export const DB_ROLES = ["admin", "projektmenedzser", "iroda", "telepito"];

// DB szerepkör → régi magyar UI-címke (a meglévő komponensek ezt várják)
export const DB_TO_DISPLAY_ROLE = {
  admin: "Admin",
  projektmenedzser: "Projektmenedzser",
  iroda: "Iroda/Könyvelés",
  telepito: "Telepítő",
};

// Régi magyar UI-címke → DB szerepkör
const DISPLAY_TO_DB_ROLE = {
  admin: "admin",
  projektmenedzser: "projektmenedzser",
  "iroda/könyvelés": "iroda",
  iroda: "iroda",
  "telepítő": "telepito",
  telepito: "telepito",
};

/**
 * Bármely bemenetet (kisbetűs DB-kulcs vagy régi magyar címke) kanonikus
 * DB-szerepkörré normalizál. Ismeretlen érték esetén null.
 */
export function normalizeRole(role) {
  if (!role) return null;
  const key = String(role).trim().toLowerCase();
  if (DB_ROLES.includes(key)) return key;
  return DISPLAY_TO_DB_ROLE[key] || null;
}

/** DB szerepkör → régi magyar UI-címke (a meglévő UI kompatibilitásához). */
export function toDisplayRole(role) {
  const db = normalizeRole(role);
  return db ? DB_TO_DISPLAY_ROLE[db] : null;
}

// ─── Oldal-hozzáférés (kanonikus DB-kulcsokkal) ─────────────────────────────
const ROLE_PAGES_DB = {
  admin: [
    "dashboard",
    "ugyfelek", "arajanlatok",
    "projektek", "munkalapok", "naptar",
    "szamlak", "karteritesek", "riportok",
    "csapat", "munkalap_sablonok", "beallitasok",
  ],
  projektmenedzser: [
    "dashboard",
    "ugyfelek", "arajanlatok",
    "projektek", "munkalapok", "naptar",
    "szamlak", "karteritesek", "riportok",
    "csapat", "munkalap_sablonok", "beallitasok",
  ],
  iroda: [
    "dashboard",
    "ugyfelek",
    "projektek", "munkalapok", "naptar",
    "szamlak", "karteritesek", "riportok",
  ],
  telepito: [
    "munkalapok",
  ],
};

// Visszafelé kompatibilis export (régi magyar kulcsokkal is elérhető).
export const ROLE_PAGES = {
  "Admin": ROLE_PAGES_DB.admin,
  "Projektmenedzser": ROLE_PAGES_DB.projektmenedzser,
  "Iroda/Könyvelés": ROLE_PAGES_DB.iroda,
  "Telepítő": ROLE_PAGES_DB.telepito,
};

const OFFICE_ROLES = ["admin", "projektmenedzser", "iroda"];

export function canSeePrice(role) {
  return OFFICE_ROLES.includes(normalizeRole(role));
}
export function canCreateMunkalap(role) {
  return OFFICE_ROLES.includes(normalizeRole(role));
}
export function canEditMunkalap(role) {
  return OFFICE_ROLES.includes(normalizeRole(role));
}
export function getHomePage(role) {
  return normalizeRole(role) === "telepito" ? "munkalapok" : "dashboard";
}
export function getAllowedPages(role) {
  return ROLE_PAGES_DB[normalizeRole(role)] || ["munkalapok"];
}
export function canSeeFovallalkozo(role) {
  return normalizeRole(role) !== "telepito";
}
