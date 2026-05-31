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

  const userId = norm(currentUser.id);
  const userName = norm(currentUser.name);

  const assigneeId = norm(workorder.assigneeId);
  const csapatId = norm(workorder.csapatId);

  const assigneeNev = norm(workorder.assigneeNev);
  const csapatNev = norm(workorder.csapatNev);

  if (userId && (assigneeId === userId || csapatId === userId)) {
    return true;
  }

  if (userName && (assigneeNev === userName || csapatNev === userName)) {
    return true;
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