import { getProjekt, updateProjekt } from "./projekt.service.js";
import {
  createWorkorder,
  getWorkordersByProjectId,
  updateWorkorder,
} from "../../services/workorder.service.js";
import {
  validateWorkorderBeforeSave,
  getInitialWorkorderTypeByProjectStatus,
} from "./projectRules.js";

export function getNextWorkorderTypeForProject(projekt) {
  if (!projekt) return "Felmérés";

  if (projekt.status === "Felmérésre vár") return "Felmérés";
  if (projekt.status === "Kivitelezésre vár") return "Kivitelezés";
  if (projekt.status === "Bővítés") return "Bővítés";
  if (projekt.status === "Hibajavítás") return "Hibajavítás";
  if (projekt.status === "Szerviz") return "Szerviz";

  return getInitialWorkorderTypeByProjectStatus(projekt.status) || "Munkavégzés";
}

export function createProjektMunkalap(projektId, options = {}) {
  const projekt = getProjekt(projektId);

  if (!projekt) {
    throw new Error("Projekt nem található");
  }

  const tipus = options.tipus || getNextWorkorderTypeForProject(projekt);

  const workorder = {
    projektId: projekt.id,
    projektKod: projekt.projektkod,
    tipus,
    status: options.status || "Kiosztásra vár",
    datum: options.datum || projekt.tervezettKezdes || "",

    clientId: projekt.clientId || null,
    clientNev: projekt.clientNev || "",
    clientCim: projekt.clientCim || "",
    clientTel: projekt.clientTel || "",
    clientEmail: projekt.clientEmail || "",
    kapcsolattarto: projekt.kapcsolattarto || "",
    telepitesiCim: projekt.telepitesiCim || projekt.clientCim || "",

    assigneeId: projekt.csapatId || "",
    assigneeNev: projekt.csapatNev || "",
    csapatId: projekt.csapatId || "",
    csapatNev: projekt.csapatNev || "",

    projektNev: projekt.nev || "",
    kulsoAzonosito: projekt.kulsoAzonosito || "",

    megjegyzes:
      options.megjegyzes ||
      `A(z) ${projekt.projektkod} projekthez létrehozott ${tipus} munkalap.`,
  };

  const validation = validateWorkorderBeforeSave(workorder);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const saved = createWorkorder(workorder);

  const currentIds = Array.isArray(projekt.munkalapIds)
    ? projekt.munkalapIds
    : [];

  if (!currentIds.includes(saved.id)) {
    updateProjekt(
      projekt.id,
      {
        munkalapIds: [...currentIds, saved.id],
      },
      options.user || ""
    );
  }

  syncProjektFromWorkorders(projekt.id);

  return saved;
}

export function syncProjektFromWorkorders(projektId) {
  const projekt = getProjekt(projektId);

  if (!projekt) return null;

  const munkalapok = getWorkordersByProjectId(projektId);

  if (!munkalapok.length) {
    return projekt;
  }

  const allClosed = munkalapok.every(m =>
    ["Lezárt", "Befejezve", "Elkészült"].includes(m.status)
  );

  const anyInProgress = munkalapok.some(m =>
    ["Folyamatban", "Kivitelezés alatt", "Megkezdve"].includes(m.status)
  );

  const hasFelmérés = munkalapok.some(m => m.tipus === "Felmérés");
  const felmérésClosed = munkalapok.some(m =>
    m.tipus === "Felmérés" &&
    ["Lezárt", "Befejezve", "Elkészült"].includes(m.status)
  );

  let nextStatus = projekt.status;

  if (anyInProgress) {
    nextStatus = "Kivitelezés alatt";
  } else if (allClosed) {
    nextStatus = "Lezárt";
  } else if (hasFelmérés && felmérésClosed) {
    nextStatus = "Árajánlat készítés";
  }

  if (nextStatus !== projekt.status) {
    return updateProjekt(
      projekt.id,
      { status: nextStatus },
      "workflow"
    );
  }

  return projekt;
}

export function updateProjektMunkalapStatus(workorderId, status, user = "") {
  const updated = updateWorkorder(workorderId, { status });

  if (updated?.projektId) {
    syncProjektFromWorkorders(updated.projektId);
  }

  return updated;
}