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
  return String(v || "")
    .trim()
    .toLowerCase();
}

export function isWorkorderAssignedToUser(workorder, currentUser) {
  if (!workorder || !currentUser) return false;

  const userId   = norm(currentUser.id);
  const userName = norm(currentUser.name);

  const assigneeId  = norm(workorder.assigneeId);
  const csapatId    = norm(workorder.csapatId);
  const assigneeNev = norm(workorder.assigneeNev);
  const csapatNev   = norm(workorder.csapatNev);

  // Közvetlen ID egyezés
  if (userId && (assigneeId === userId || csapatId === userId)) return true;

  // Közvetlen névegyezés
  if (userName && (assigneeNev === userName || csapatNev === userName)) return true;

  // Csapat tagság ellenőrzése: a csapat tagok tömbjében benne van-e a user ID-ja vagy neve?
  // Ez a legfontosabb eset: csapatId="cs_XXX" ≠ userId="u2", de csapat.tagok=["u2"]
  if (csapatId) {
    try {
      const csapatok = JSON.parse(localStorage.getItem("csapatok") || "[]");
      const csapat = csapatok.find(c => norm(c.id) === csapatId);
      if (csapat) {
        if (userId   && (csapat.tagok    || []).some(tid => norm(tid) === userId))   return true;
        if (userName && (csapat.tagNevek || []).some(tn  => norm(tn)  === userName)) return true;
      }
    } catch { /* localStorage read failure */ }
  }

  // Assignee csapat-tagság is ellenőrzés (assigneeId is lehet csapatId)
  if (assigneeId && assigneeId !== csapatId) {
    try {
      const csapatok = JSON.parse(localStorage.getItem("csapatok") || "[]");
      const csapat = csapatok.find(c => norm(c.id) === assigneeId);
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

  if (!isWorkorderAssignedToUser(workorder, currentUser)) {
    return false;
  }

  const status = String(workorder.status || "").trim();

  if (WORKORDER_STATUSES_HIDDEN_FROM_INSTALLER.includes(status)) {
    return false;
  }

  return WORKORDER_STATUSES_VISIBLE_TO_INSTALLER.includes(status);
}