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

export function isInstallerVisibleProjectStatus(status) {
  return PROJECT_STATUSES_VISIBLE_TO_INSTALLER.includes(status);
}

export function isInstallerVisibleWorkorder(workorder, currentUser) {
  if (!workorder || !currentUser) return false;

  const statusOk = [
    "Kiosztásra vár",
    "Felmérésre vár",
    "Kivitelezésre vár",
    "Bővítés",
    "Hibajavítás",
    "Szerviz",
    "Folyamatban",
  ].includes(workorder.status);

  const assignedOk =
    workorder.assigneeId === currentUser.id ||
    workorder.csapatId === currentUser.id ||
    workorder.assigneeNev === currentUser.name ||
    workorder.csapatNev === currentUser.name;

  return statusOk && assignedOk;
}

export function requiresInstallerAssignment(projectStatus) {
  return PROJECT_STATUSES_VISIBLE_TO_INSTALLER.includes(projectStatus);
}

export function getRequiredProjectFields(projectStatus) {
  const base = [
    { key: "nev", label: "Projekt neve" },
    { key: "clientNev", label: "Ügyfél neve" },
    { key: "tipus", label: "Munkatípus" },
  ];

  const needsInstaller = requiresInstallerAssignment(projectStatus);

  if (!needsInstaller) {
    return base;
  }

  return [
    ...base,
    { key: "telepitesiCim", label: "Telepítési cím" },
    { key: "csapatId", label: "Kivitelező csapat" },
    { key: "tervezettKezdes", label: "Tervezett kezdés" },
  ];
}

export function validateProjectBeforeSave(form) {
  const required = getRequiredProjectFields(form.status);
  const missing = [];

  for (const field of required) {
    const value = form[field.key];

    if (!value || String(value).trim() === "") {
      missing.push(field.label);
    }
  }

  return {
    ok: missing.length === 0,
    missing,
    message: missing.length
      ? `Kötelező mezők hiányoznak: ${missing.join(", ")}`
      : "",
  };
}

export function getInitialWorkorderTypeByProjectStatus(status) {
  if (status === "Felmérésre vár") return "Felmérés";
  if (status === "Kivitelezésre vár") return "Kivitelezés";
  if (status === "Bővítés") return "Bővítés";
  if (status === "Hibajavítás") return "Hibajavítás";
  if (status === "Szerviz") return "Szerviz";
  return null;
}

export function shouldCreateInitialWorkorder(projectStatus) {
  return !!getInitialWorkorderTypeByProjectStatus(projectStatus);
}