/**
 * permissions.js – Felhasználónkénti, pipálós jogosultság-kezelés
 *
 * A meglévő 4 szerepkör (Admin, Projektmenedzser, Iroda/Könyvelés, Telepítő
 * – ld. roles.js) adja az ALAPÉRTELMEZETT jogokat. Ez a legtöbb
 * felhasználónál elég, nincs vele teendő. Ha egy adott embernél ettől el
 * kell térni (pl. egy megbízható telepítő lássa az árakat is), a
 * user.permissions mezőben EGYETLEN kulcsot felülírva (true/false) ez a
 * modul azt veszi figyelembe – a szerepkör összes többi tagját nem érinti.
 *
 * user.permissions hiánya (undefined) = tisztán a szerepkör dönt, 100%
 * visszafelé kompatibilis a meglévő felhasználókkal (nincs migráció).
 *
 * Szándékosan ADDITÍV a roles.js mellett: a régi canSeePrice(role) stb.
 * függvények változatlanul működnek mindenhol, ahol eddig is – ez a modul
 * csak ott ad user-alapú, felülírható változatot, ahol ténylegesen a teljes
 * user objektum (nem csak a role string) elérhető a hívási helyen.
 */
import { ROLE_PAGES, canSeePrice, canCreateMunkalap, canEditMunkalap, canSeeFovallalkozo } from "./roles.js";

export const PERMISSION_GROUPS = [
  {
    id: "oldalak",
    label: "Oldalak, amiket lát",
    permissions: [
      { key: "page_dashboard",         label: "Dashboard" },
      { key: "page_ugyfelek",          label: "Ügyfelek" },
      { key: "page_arajanlatok",       label: "Árajánlatok" },
      { key: "page_projektek",         label: "Projektek" },
      { key: "page_munkalapok",        label: "Munkalapok" },
      { key: "page_naptar",            label: "Naptár" },
      { key: "page_szamlak",           label: "Számlák" },
      { key: "page_karteritesek",      label: "Kártérítések" },
      { key: "page_riportok",          label: "Riportok" },
      { key: "page_tig",               label: "TIG" },
      { key: "page_raktarkeszlet",     label: "Raktárkészlet" },
      { key: "page_csapat",            label: "Csapatok" },
      { key: "page_munkalap_sablonok", label: "Munkalap-sablonok" },
      { key: "page_beallitasok",       label: "Beállítások" },
    ],
  },
  {
    id: "penzugyi",
    label: "Pénzügyi jogok",
    permissions: [
      { key: "lat_arakat",              label: "Árak és összegek látása" },
      { key: "munkalap_letrehozas",     label: "Munkalap létrehozása" },
      { key: "munkalap_szerkesztes",    label: "Munkalap szerkesztése" },
      { key: "lat_fovallalkozoi_adatok",label: "Fővállalkozói adatok látása" },
    ],
  },
  {
    id: "admin",
    label: "Admin funkciók",
    permissions: [
      { key: "felhasznalok_kezelese",         label: "Felhasználók kezelése" },
      { key: "ceges_koltsegek_szerkesztese",  label: "Céges fix költségek szerkesztése" },
      { key: "adattorles",                    label: "Adattörlés / rendszerkarbantartás" },
    ],
  },
];

// Az összes ismert jog-kulcs, csoport-hivatkozás nélkül – kényelmi lista.
export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

/** Egy adott szerepkör alapértelmezett kitöltése az ÖSSZES ismert kulcsra. */
export function getRoleDefaults(role) {
  const pages = new Set(ROLE_PAGES[role] || []);
  const defaults = {};
  PERMISSION_GROUPS[0].permissions.forEach(p => {
    defaults[p.key] = pages.has(p.key.replace(/^page_/, ""));
  });
  defaults.lat_arakat               = canSeePrice(role);
  defaults.munkalap_letrehozas      = canCreateMunkalap(role);
  defaults.munkalap_szerkesztes     = canEditMunkalap(role);
  defaults.lat_fovallalkozoi_adatok = canSeeFovallalkozo(role);
  defaults.felhasznalok_kezelese        = role === "Admin";
  defaults.ceges_koltsegek_szerkesztese = role === "Admin";
  defaults.adattorles                   = role === "Admin";
  return defaults;
}

/** A ténylegesen érvényes jog egy adott kulcsra – felülírás, egyébként szerepkör. */
export function hasPermission(user, key) {
  if (!user) return false;
  const override = user.permissions?.[key];
  if (override !== undefined) return override;
  return !!getRoleDefaults(user.role)[key];
}

/**
 * "Lapított" állapot minden kulcsra – a pipa-mátrixhoz kell:
 * checked = ténylegesen érvényes érték, isOverride = eltér-e a szerepkör
 * alapértelmezettjétől (ez adja az "egyedi" jelzést a UI-n).
 */
export function getEffectivePermissions(user) {
  const defaults = getRoleDefaults(user?.role);
  const result = {};
  ALL_PERMISSION_KEYS.forEach(key => {
    const def      = !!defaults[key];
    const override = user?.permissions?.[key];
    const checked  = override !== undefined ? override : def;
    result[key] = { checked, isOverride: override !== undefined && override !== def };
  });
  return result;
}

/** User-alapú oldal-lista (Sidebar/routing) – override hiányában ugyanaz, mint eddig. */
export function getAllowedPagesForUser(user) {
  if (!user) return [];
  if (!user.permissions) return ROLE_PAGES[user.role] || ["munkalapok"];
  const eff = getEffectivePermissions(user);
  return Object.keys(eff)
    .filter(k => k.startsWith("page_") && eff[k].checked)
    .map(k => k.replace(/^page_/, ""));
}
