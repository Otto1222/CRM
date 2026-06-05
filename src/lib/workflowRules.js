/**
 * workflowRules.js
 * Projekt ↔ Munkalap workflow – egyetlen forrás az egész rendszerben.
 * Minden státusz, forrás, validáció, jogosultság innen jön.
 */

// ─── Projekt státuszok (8 db) ─────────────────────────────────────────────

export const PROJEKT_STATUSZOK = [
  { id: "Létrehozva",        szin: "#64748B", bg: "#F8FAFC" },
  { id: "Kivitelezésre vár", szin: "#EA580C", bg: "#FFF7ED" },
  { id: "Kivitelezés alatt", szin: "#2563EB", bg: "#EFF6FF" },
  { id: "Vissza kell menni", szin: "#B45309", bg: "#FFFBEB" },
  { id: "Készre jelentve",   szin: "#0891B2", bg: "#ECFEFF" },
  { id: "TIG-re vár",        szin: "#8B5CF6", bg: "#F5F3FF" },
  { id: "Számlázható",       szin: "#15803D", bg: "#F0FDF4" },
  { id: "Lezárt",            szin: "#475569", bg: "#F1F5F9" },
];

// ─── Munkalap státuszok (6 db) ────────────────────────────────────────────
// Részben kész + Sikertelen → kötelező indoklás

export const MUNKALAP_STATUSZOK = [
  { id: "Létrehozva",   szin: "#64748B", bg: "#F8FAFC" },
  { id: "Kiadva",       szin: "#2563EB", bg: "#EFF6FF" },
  { id: "Folyamatban",  szin: "#D97706", bg: "#FFFBEB" },
  { id: "Részben kész", szin: "#7C3AED", bg: "#F5F3FF", indoklas: true },
  { id: "Lezárva",      szin: "#059669", bg: "#ECFDF5" },
  { id: "Sikertelen",   szin: "#DC2626", bg: "#FEF2F2", indoklas: true },
];

// ─── Projekt forrás (3 db) ────────────────────────────────────────────────

export const PROJEKT_FORRAS = [
  {
    id: "sajat_ajanlat",
    label: "Saját ajánlat",
    color: "#2563EB", bg: "#EFF6FF",
    desc: "Elfogadott saját ajánlatból – ügyfél kötelező",
  },
  {
    id: "fovallalkozoi_munka",
    label: "Fővállalkozói munka",
    color: "#7C3AED", bg: "#F5F3FF",
    desc: "Fővállalkozói megbízás – külső munkaszám és elszámolási szabály kötelező",
  },
  {
    id: "belso_munka",
    label: "Belső munka",
    color: "#059669", bg: "#ECFDF5",
    desc: "Garancia, javítás, karbantartás – megrendelő: E.D.I. Solutions Kft.",
  },
];

// ─── Munkalap típusok (garancia/javítás = munkalap típus, nem forrás) ─────

export const MUNKALAP_TIPUSOK = [
  "Kivitelezés",
  "Garanciális",
  "Javítás",
  "Karbantartás",
  "Szerviz",
  "Felmérés",
  "Egyéb",
];

// ─── Munkalap → Projekt státusz automata frissítés ───────────────────────

export const WORKORDER_TO_PROJECT_STATUS = {
  "Folyamatban":  "Kivitelezés alatt",
  "Lezárva":      "Készre jelentve",
  "Részben kész": "Vissza kell menni",
  "Sikertelen":   "Vissza kell menni",
};

// ─── Telepítőnek látható munkalap státuszok ───────────────────────────────

export const WORKORDER_STATUSES_VISIBLE_TO_INSTALLER = [
  "Létrehozva", "Kiadva", "Folyamatban", "Részben kész",
];

export const WORKORDER_STATUSES_HIDDEN_FROM_INSTALLER = [
  "Lezárva", "Sikertelen",
];

export const INSTALLER_SETTABLE_STATUSES = [
  "Folyamatban", "Részben kész", "Lezárva", "Sikertelen",
];

export const PROJECT_CLOSE_ROLES = ["Admin", "Projektmenedzser"];

// ─── Backward compat – régi értékek migrálása ────────────────────────────

export const LEGACY_PROJEKT_STATUS_MAP = {
  "Felmérésre vár":             "Létrehozva",
  "Felmérve":                   "Kivitelezésre vár",
  "Ajánlat kiküldve":           "Kivitelezésre vár",
  "Elfogadva":                  "Kivitelezésre vár",
  "Elkészült":                  "Készre jelentve",
  "Ellenőrzésre vár":           "TIG-re vár",
  "Hiánypótlás":                "Vissza kell menni",
  "Ellenőrizve minden rendben": "TIG-re vár",
  "Leszámlázva":                "Számlázható",
  "Kifizetve":                  "Számlázható",
  "Lezárva":                    "Lezárt",
  "Felfüggesztve":              "Vissza kell menni",
  "Elbukott Projekt":           "Lezárt",
};

export const LEGACY_FORRAS_MAP = {
  "saját_ügyfél":  "sajat_ajanlat",
  "fővállalkozói": "fovallalkozoi_munka",
  "garanciális":   "belso_munka",
  "javítási":      "belso_munka",
};

export const LEGACY_MUNKALAP_STATUS_MAP = {
  "Kiosztásra vár": "Létrehozva",
  "Elkészült":      "Lezárva",
  "Befejezve":      "Lezárva",
  "Kész":           "Lezárva",
  "Meghiúsult":     "Sikertelen",
};

// ─── Konfig keresők ───────────────────────────────────────────────────────

export function getProjektStatusConfig(statusId) {
  return PROJEKT_STATUSZOK.find(s => s.id === statusId) || { szin: "#64748B", bg: "#F8FAFC" };
}

export function getMunkalapStatusConfig(statusId) {
  return MUNKALAP_STATUSZOK.find(s => s.id === statusId) || { szin: "#64748B", bg: "#F8FAFC" };
}

export function getProjektForrasConfig(forrasId) {
  return PROJEKT_FORRAS.find(f => f.id === forrasId) || { color: "#64748B", bg: "#F8FAFC", label: forrasId };
}

// ─── Segédfüggvények ─────────────────────────────────────────────────────

export function munkalapIndoklasKotelezo(status) {
  return !!(MUNKALAP_STATUSZOK.find(s => s.id === status)?.indoklas);
}

export function getProjectStatusFromWorkorder(workorderStatus) {
  return WORKORDER_TO_PROJECT_STATUS[workorderStatus] || null;
}

export function canInstallerSetStatus(status) {
  return INSTALLER_SETTABLE_STATUSES.includes(status);
}

export function canCloseProject(userRole) {
  return PROJECT_CLOSE_ROLES.includes(userRole);
}

export function getProjektTipus(forras) {
  return PROJEKT_FORRAS.find(f => f.id === forras)?.label
    || (forras === "saját_ügyfél"  ? "Saját projekt"
      : forras === "fővállalkozói" ? "Fővállalkozói projekt"
      : "Egyéb");
}

export function migrateProjektStatus(status) {
  if (!status) return "Létrehozva";
  return LEGACY_PROJEKT_STATUS_MAP[status] || status;
}

export function migrateProjektForras(forras) {
  return LEGACY_FORRAS_MAP[forras] || forras;
}

export function migrateMunkalapStatus(status) {
  return LEGACY_MUNKALAP_STATUS_MAP[status] || status;
}

// ─── Telepítői láthatóság (backward compat: (workorder, currentUser) szignatúra) ────

function norm(v) { return String(v || "").trim().toLowerCase(); }

export function isWorkorderAssignedToUser(workorder, currentUser) {
  if (!workorder || !currentUser) return false;
  const userId   = norm(currentUser.id);
  const userName = norm(currentUser.name);
  if (userId   && (norm(workorder.assigneeId) === userId   || norm(workorder.csapatId)  === userId))   return true;
  if (userName && (norm(workorder.assigneeNev) === userName || norm(workorder.csapatNev) === userName)) return true;
  const csapatIdToCheck = norm(workorder.csapatId) || norm(workorder.assigneeId);
  if (csapatIdToCheck) {
    try {
      const csapatok = JSON.parse(localStorage.getItem("csapatok") || "[]");
      const cs = csapatok.find(c => norm(c.id) === csapatIdToCheck);
      if (cs) {
        if (userId   && (cs.tagok    || []).some(t => norm(t) === userId))   return true;
        if (userName && (cs.tagNevek || []).some(t => norm(t) === userName)) return true;
      }
    } catch { /* ok */ }
  }
  return false;
}

export function isInstallerVisibleWorkorder(workorder, currentUser) {
  if (!workorder || !currentUser) return false;
  if (!isWorkorderAssignedToUser(workorder, currentUser)) return false;
  if (WORKORDER_STATUSES_HIDDEN_FROM_INSTALLER.includes(workorder.status)) return false;
  return true;
}

// ─── Validáció ────────────────────────────────────────────────────────────

export function validateProjektForrás(form) {
  const { forrás, ajanlatId, penzugy, kulsoAzonosito } = form;
  if (!forrás) return { ok: false, message: "A projekt forrásának megadása kötelező." };

  if (forrás === "sajat_ajanlat") {
    if (!ajanlatId)              return { ok: false, message: "Saját ajánlat projektnél kötelező elfogadott ajánlatot kiválasztani." };
    if (!form.clientNev?.trim()) return { ok: false, message: "Az ügyfél neve kötelező." };
  }

  if (forrás === "fovallalkozoi_munka") {
    if (!penzugy?.fovallalkoziId)       return { ok: false, message: "Fővállalkozói munkánál a fővállalkozó kiválasztása kötelező." };
    if (!kulsoAzonosito?.trim())         return { ok: false, message: "Fővállalkozói munkánál a külső munkaszám megadása kötelező." };
    if (!penzugy?.elszamolasiSzabalyId) return { ok: false, message: "Fővállalkozói munkánál az elszámolási szabály kötelező. (Beállítások → Fővállalkozók)" };
  }

  return { ok: true, message: "" };
}

export function validateWorkorderBeforeSave(workorder) {
  const { status, indoklas } = workorder;
  if (munkalapIndoklasKotelezo(status) && !String(indoklas || "").trim()) {
    return { ok: false, message: `"${status}" státusznál kötelező az indoklás megadása.` };
  }
  return { ok: true, message: "" };
}
