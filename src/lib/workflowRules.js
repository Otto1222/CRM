/**
 * workflowRules.js – Telepítői láthatóság szabályok
 * Ez az egyetlen forrás – a projectRules.js-ben lévő duplikátum csak kompatibilitási alias.
 */

export const WORKORDER_STATUSES_VISIBLE_TO_INSTALLER = [
  "Felmérés",
  "Kiosztásra vár",
  "Kivitelezésre vár",
  "Megkezdésre Vár",
  "Ütemezett",
  "Kivitelezés",
  "Folyamatban",
  "Bővítés",
  "Hibajavítás",
  "Hibaelhárítás",
  "Szerviz",
];

export const WORKORDER_STATUSES_HIDDEN_FROM_INSTALLER = [
  "Befejezett Felmérés",
  "Ellenőrzés alatt",
  "Lezárva",
  "Számlázva",
  "Kész",
  "Meghiúsult",
  "Elutasított",
];

function norm(v) {
  return String(v || "").trim().toLowerCase();
}

export function isWorkorderAssignedToUser(workorder, currentUser) {
  if (!workorder || !currentUser) return false;

  const userId   = norm(currentUser.id);
  const userName = norm(currentUser.name);

  const assigneeId  = norm(workorder.assigneeId);
  const csapatId    = norm(workorder.csapatId);
  const assigneeNev = norm(workorder.assigneeNev);
  const csapatNev   = norm(workorder.csapatNev);

  // Közvetlen egyezés
  if (userId && (assigneeId === userId || csapatId === userId))     return true;
  if (userName && (assigneeNev === userName || csapatNev === userName)) return true;

  // Csapat tagság: csapatId alatt megkeresi a csapatot, ellenőrzi a tagok tömböt
  const csapatIdToCheck = csapatId || assigneeId;
  if (csapatIdToCheck) {
    try {
      const csapatok = JSON.parse(localStorage.getItem("csapatok") || "[]");
      const csapat   = csapatok.find(c => norm(c.id) === csapatIdToCheck);
      if (csapat) {
        if (userId   && (csapat.tagok    || []).some(tid => norm(tid) === userId))   return true;
        if (userName && (csapat.tagNevek || []).some(tn  => norm(tn)  === userName)) return true;
      }
    } catch { /* localStorage read failure */ }
  }

  return false;
}

export function isInstallerVisibleWorkorder(workorder, currentUser) {
  if (!workorder || !currentUser) return false;
  if (!isWorkorderAssignedToUser(workorder, currentUser)) return false;
  const status = String(workorder.status || "").trim();
  if (WORKORDER_STATUSES_HIDDEN_FROM_INSTALLER.includes(status)) return false;
  return true; // ha hozzá van rendelve és nincs elrejtve, látja
}
