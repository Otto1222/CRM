export const WORKORDER_STATUSES_VISIBLE_TO_INSTALLER = [
  "Felmérés",
  "Kiosztásra vár",
  "Kivitelezésre vár",
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

export function isWorkorderAssignedToUser(workorder, currentUser) {
  if (!workorder || !currentUser) return false;

  return (
    workorder.assigneeNev === currentUser.name ||
    workorder.csapatNev === currentUser.name ||
    workorder.assigneeId === currentUser.id ||
    workorder.csapatId === currentUser.id
  );
}

export function isInstallerVisibleWorkorder(workorder, currentUser) {
  if (!workorder || !currentUser) return false;

  if (!isWorkorderAssignedToUser(workorder, currentUser)) {
    return false;
  }

  if (WORKORDER_STATUSES_HIDDEN_FROM_INSTALLER.includes(workorder.status)) {
    return false;
  }

  return WORKORDER_STATUSES_VISIBLE_TO_INSTALLER.includes(workorder.status);
}