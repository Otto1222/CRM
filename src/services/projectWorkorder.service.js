import { updateProjekt } from "../modules/projektek/projekt.service.js";
import {
  createWorkorder,
  getWorkordersByProjectId,
} from "./workorder.service.js";

export function createWorkorderFromProject(projekt, options = {}) {
  if (!projekt?.id) {
    throw new Error("Hiányzó projekt azonosító");
  }

  const existing = getWorkordersByProjectId(projekt.id);
  const sorszam = String(existing.length + 1).padStart(3, "0");

  const workorder = createWorkorder({
    projektId: projekt.id,
    projektKod: projekt.projektkod,
    munkalapSzam: `${projekt.projektkod}/${sorszam}`,

    tipus: options.tipus || "Felmérés",
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
      `Automatikusan létrehozva a(z) ${projekt.projektkod} projekthez.`,
  });

  const currentIds = Array.isArray(projekt.munkalapIds)
    ? projekt.munkalapIds
    : [];

  if (!currentIds.includes(workorder.id)) {
    updateProjekt(
      projekt.id,
      {
        munkalapIds: [...currentIds, workorder.id],
      },
      options.user || ""
    );
  }

  return workorder;
}

export function createInitialWorkorderForProject(projekt, options = {}) {
  const existing = getWorkordersByProjectId(projekt.id);

  if (existing.length > 0) {
    return existing[0];
  }

  return createWorkorderFromProject(projekt, {
    tipus: options.tipus || "Felmérés",
    status: options.status || "Kiosztásra vár",
    user: options.user || "",
  });
}