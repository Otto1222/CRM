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
];

export function isInstallerVisibleProjectStatus(status) {
  return PROJECT_STATUSES_VISIBLE_TO_INSTALLER.includes(status);
}

export function isInstallerVisibleWorkorder(workorder, currentUser) {
  if (!workorder || !currentUser) return false;

  const statusOk = WORKORDER_STATUSES_VISIBLE_TO_INSTALLER.includes(workorder.status);

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

function todayYMD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function isPastDate(dateValue) {
  if (!dateValue) return false;
  return String(dateValue).slice(0, 10) < todayYMD();
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

  if (missing.length > 0) {
    return {
      ok: false,
      missing,
      message: `Kötelező mezők hiányoznak: ${missing.join(", ")}`,
    };
  }

  const hasInstallerAssignment =
    !!form.csapatId ||
    !!form.csapatNev ||
    requiresInstallerAssignment(form.status);

  if (hasInstallerAssignment && isPastDate(form.tervezettKezdes)) {
    return {
      ok: false,
      missing: ["Tervezett kezdés"],
      message: "A kivitelező csapatnak kiosztott projekt tervezett kezdése nem lehet mai napnál régebbi.",
    };
  }

  return {
    ok: true,
    missing: [],
    message: "",
  };
}

export function validateWorkorderBeforeSave(workorder) {
  const assigned =
    !!workorder.assigneeId ||
    !!workorder.assigneeNev ||
    !!workorder.csapatId ||
    !!workorder.csapatNev;

  const dateValue = workorder.datum || workorder.date || workorder.tervezettKezdes;

  if (assigned && isPastDate(dateValue)) {
    return {
      ok: false,
      message: "A csapatnak kiosztott munkalap dátuma nem lehet mai napnál régebbi.",
    };
  }

  return {
    ok: true,
    message: "",
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