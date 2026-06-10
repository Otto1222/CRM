/**
 * projektWorkflow.js – Automatikus projekt státusz frissítés
 * Spec 6. pont: munkalap státusz változás → projekt státusz változás
 */
import { getProjekt, updateProjekt } from "./projekt.service.js";
import { createWorkorder, getWorkordersByProjectId, updateWorkorder } from "../../services/workorder.service.js";
import { getInitialWorkorderTypeByProjectStatus } from "./projectRules.js";

// ─── Munkalap típus → következő ajánlott típus ───────────────
export function getNextWorkorderTypeForProject(projekt) {
  if (!projekt) return "Felmérés";
  if (projekt.status === "Felmérésre vár")    return "Felmérés";
  if (projekt.status === "Kivitelezésre vár") return "Első kivitelezés";
  if (projekt.status === "Bővítés")           return "Pótmunkavégzés";
  if (projekt.status === "Hibajavítás")       return "Hibajavítás";
  if (projekt.status === "Szerviz")           return "Karbantartás";
  return getInitialWorkorderTypeByProjectStatus(projekt.status) || "Egyéb";
}

// ─── Projekt létrehozásakor auto-munkalap ─────────────────────
export function createProjektMunkalap(projektId, options = {}) {
  const projekt = getProjekt(projektId);
  if (!projekt) throw new Error("Projekt nem található");

  const tipus = options.tipus || getNextWorkorderTypeForProject(projekt);

  const workorder = {
    projektId:      projekt.id,
    projektKod:     projekt.projektkod,
    tipus,
    munkalapTipus:  tipus,
    status:         options.status || "Kiosztásra vár",
    datum:          options.datum || projekt.tervezettKezdes || "",
    clientId:       projekt.clientId   || null,
    clientNev:      projekt.clientNev  || "",
    clientCim:      projekt.clientCim  || "",
    clientTel:      projekt.clientTel  || "",
    clientEmail:    projekt.clientEmail || "",
    kapcsolattarto: projekt.kapcsolattarto || "",
    telepitesiCim:  projekt.telepitesiCim || projekt.clientCim || "",
    assigneeId:     projekt.csapatId   || "",
    assigneeNev:    projekt.csapatNev  || "",
    csapatId:       projekt.csapatId   || "",
    csapatNev:      projekt.csapatNev  || "",
    projektNev:     projekt.nev        || "",
    megbizoCeg:     projekt.megbizoCeg || "",
    kulsoAzonosito: projekt.kulsoAzonosito || "",
    megjegyzes:     options.megjegyzes || `${projekt.projektkod} – ${tipus} munkalap`,
  };

  const saved = createWorkorder(workorder);

  const currentIds = Array.isArray(projekt.munkalapIds) ? projekt.munkalapIds : [];
  if (!currentIds.includes(saved.id)) {
    updateProjekt(projekt.id, { munkalapIds: [...currentIds, saved.id] }, options.user || "");
  }

  syncProjektFromWorkorders(projekt.id);
  return saved;
}

// ─── Spec 6. pont: munkalap státusz → projekt státusz ────────
//
// Ellenőrzés alatt   → projekt: "TIG-re vár"
// Jóváhagyva          → projekt: "Készre jelentve"  (ha minden munkalap jóváhagyva)
// Számlázásra kész    → projekt: "Számlázható" (ha minden munkalap kész)
// Folyamatban         → projekt: "Kivitelezés alatt"
// Befejezett Felmérés → projekt: "Felmérve"    (ha felmérés típus)

export function syncProjektFromWorkorders(projektId) {
  const projekt = getProjekt(projektId);
  if (!projekt) return null;

  const munkalapok = getWorkordersByProjectId(projektId);
  if (!munkalapok.length) return projekt;

  const statuszok = munkalapok.map(m => m.status);

  let nextStatus = projekt.status;

  // Prioritás szerint (legmagasabb státusz nyer)
  const anyFolyamatban  = statuszok.some(s => ["Folyamatban", "Kivitelezés", "Megkezdésre Vár"].includes(s));
  const anyHelyszinen   = statuszok.some(s => s === "Helyszínen lezárva");
  const anyEllenorzes   = statuszok.some(s => s === "Ellenőrzés alatt");
  const allJovahagyva   = munkalapok.length > 0 && statuszok.every(s => ["Jóváhagyva", "Lezárva", "Számlázva", "Számlázásra kész"].includes(s));
  const allSzamlazasra  = munkalapok.length > 0 && statuszok.every(s => ["Számlázásra kész", "Számlázva", "Lezárva"].includes(s));
  const allLezarva      = munkalapok.length > 0 && statuszok.every(s => ["Lezárva", "Számlázva"].includes(s));

  const felmeresMl      = munkalapok.find(m => m.tipus === "Felmérés");
  const felmeresKesz    = felmeresMl && ["Befejezett Felmérés", "Helyszínen lezárva", "Jóváhagyva", "Lezárva"].includes(felmeresMl.status);

  if (allLezarva) {
    nextStatus = "Lezárt";
  } else if (allSzamlazasra) {
    nextStatus = "Számlázható";
  } else if (allJovahagyva) {
    nextStatus = "Készre jelentve";
  } else if (anyEllenorzes || anyHelyszinen) {
    nextStatus = "TIG-re vár";
  } else if (anyFolyamatban) {
    nextStatus = "Kivitelezés alatt";
  } else if (felmeresKesz && projekt.status === "Felmérésre vár") {
    nextStatus = "Felmérve";
  }

  if (nextStatus !== projekt.status) {
    return updateProjekt(projekt.id, { status: nextStatus }, "workflow_auto");
  }
  return projekt;
}

// ─── Munkalap státusz váltás + projekt szinkron ──────────────
export function updateProjektMunkalapStatus(workorderId, newStatus, user = "") {
  const updated = updateWorkorder(workorderId, { status: newStatus });
  if (updated?.projektId) {
    syncProjektFromWorkorders(updated.projektId);
  }
  return updated;
}
