export const PROJECT_STATUSES_VISIBLE_TO_INSTALLER = [
  "Felmérésre vár",
  "Kivitelezésre vár",
  "Bővítés",
  "Hibajavítás",
  "Szerviz",
];

export const PROJECT_STATUSES_NOT_VISIBLE_TO_INSTALLER = [
  "Árajánlat készítés",
  "Árajánlat kiküldve",
  "Beszerzés / előkészítés",
  "Lezárt",
  "Elutasított",
];

export const WORKORDER_STATUSES_VISIBLE_TO_INSTALLER = [
  "Kiosztásra vár",
  "Felmérésre vár",
  "Kivitelezésre vár",
  "Bővítés",
  "Hibajavítás",
  "Szerviz",
  "Folyamatban",
  "Ütemezett",
  "Megkezdésre Vár",
  "Kivitelezés",
];

export function isInstallerVisibleProjectStatus(status) {
  return PROJECT_STATUSES_VISIBLE_TO_INSTALLER.includes(status);
}

export function isInstallerVisibleWorkorder(workorder, currentUser) {
  if (!workorder || !currentUser) return false;
  const statusOk = WORKORDER_STATUSES_VISIBLE_TO_INSTALLER.includes(workorder.status);
  const assignedOk =
    workorder.assigneeId === currentUser.id ||
    workorder.csapatId   === currentUser.id ||
    workorder.assigneeNev === currentUser.name ||
    workorder.csapatNev  === currentUser.name;
  return statusOk && assignedOk;
}

export function requiresInstallerAssignment(projectStatus) {
  return PROJECT_STATUSES_VISIBLE_TO_INSTALLER.includes(projectStatus);
}

export function getRequiredProjectFields(projectStatus) {
  const base = [
    { key: "nev",      label: "Projekt neve" },
    { key: "clientNev", label: "Ügyfél neve" },
  ];
  // Csak Kivitelezésre vár+ státusznál kötelező a cím és csapat
  if (["Kivitelezésre vár","Kivitelezés alatt"].includes(projectStatus)) {
    return [
      ...base,
      { key: "telepitesiCim", label: "Telepítési cím" },
      { key: "csapatId",      label: "Kivitelező csapat" },
    ];
  }
  return base;
}

export function validateProjectBeforeSave(form) {
  const required = getRequiredProjectFields(form.status);
  const missing  = [];
  for (const field of required) {
    const value = form[field.key];
    if (!value || String(value).trim() === "") {
      missing.push(field.label);
    }
  }
  if (missing.length > 0) {
    return { ok: false, missing, message: `Kötelező mezők hiányoznak: ${missing.join(", ")}` };
  }
  return { ok: true, missing: [], message: "" };
}

// Munkalap validáció – CSAK ügyszám és ügyfél kötelező (dátum nem blokkoló)
export function validateWorkorderBeforeSave(workorder) {
  if (!workorder.ugyszam && !workorder.munkalapSzam && !workorder.dokumentumszam) {
    return { ok: false, message: "Munkaszám / Ügyszám megadása kötelező." };
  }
  return { ok: true, message: "" };
}

export function getInitialWorkorderTypeByProjectStatus(status) {
  if (status === "Felmérésre vár")    return "Felmérés";
  if (status === "Kivitelezésre vár") return "Kivitelezés";
  if (status === "Bővítés")           return "Bővítés";
  if (status === "Hibajavítás")       return "Hibajavítás";
  if (status === "Szerviz")           return "Szerviz";
  return null;
}

export function shouldCreateInitialWorkorder(projectStatus) {
  return !!getInitialWorkorderTypeByProjectStatus(projectStatus);
}

export function isPastDate(dateValue) {
  if (!dateValue) return false;
  const today = new Date();
  const yyyy  = today.getFullYear();
  const mm    = String(today.getMonth()+1).padStart(2,"0");
  const dd    = String(today.getDate()).padStart(2,"0");
  return String(dateValue).slice(0,10) < `${yyyy}-${mm}-${dd}`;
}
