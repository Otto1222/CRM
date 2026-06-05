import {
  validateWorkorderBeforeSave,
  getProjectStatusFromWorkorder,
  migrateMunkalapStatus,
} from "../lib/workflowRules.js";
import { driveSave } from "../lib/driveApi.js";
import { syncMunkalapToCalendar, deleteMunkalapFromCalendar } from "./calendarSync.service.js";
import { updateProjekt } from "../modules/projektek/projekt.service.js";

const KEY = "munkalapok";

function dispatch(collection = "munkalapok") {
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection } }));
}

function notifySyncFailed() {
  window.dispatchEvent(new CustomEvent("crm-sync-warning", {
    detail: { message: "Mentve helyileg, de nincs szinkronizálva." },
  }));
}

export function loadWorkorders() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    // Backward compat: régi státuszok migrálása
    return raw.map(w => {
      const ms = migrateMunkalapStatus(w.status);
      return ms !== w.status ? { ...w, status: ms } : w;
    });
  } catch {
    return [];
  }
}

export function saveWorkorders(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch("munkalapok");
  driveSave("munkalapok", { munkalapok: list }).catch(() => notifySyncFailed());
}

export function getWorkorder(id) {
  return loadWorkorders().find(w => w.id === id) || null;
}

export function getWorkordersByProjectId(projectId) {
  return loadWorkorders().filter(w => w.projektId === projectId);
}

// Típus rövidítés a munkalapszámhoz
const TIPUS_ROVID = {
  "Kivitelezés":      "TELEP",
  "Garanciális":      "GAR",
  "Javítás":          "JAV",
  "Karbantartás":     "KARB",
  "Szerviz":          "SZERV",
  "Felmérés":         "FELM",
  "Egyéb":            "EGYEB",
  // backward compat régi típusok
  "Első kivitelezés": "TELEP",
  "Garanciális munka":"GAR",
  "Hibajavítás":      "HIBA",
  "Pótmunkavégzés":   "POT",
};

export function nextWorkorderNumber(projectKod, tipus = "") {
  const rovid = TIPUS_ROVID[tipus] || tipus.toUpperCase().slice(0, 5) || "ML";
  const prefix = `${projectKod}/${rovid}`;
  const existing = loadWorkorders().filter(w =>
    w.munkalapSzam?.startsWith(prefix) || w.projektKod === projectKod
  );
  return `${prefix}/${String(existing.length + 1).padStart(3, "0")}`;
}

function normalizeWorkorder(data = {}) {
  const now = new Date().toISOString();
  return {
    id: data.id || `ml_${Date.now()}`,
    projektId:    data.projektId    || "",
    projektKod:   data.projektKod   || "",
    munkalapSzam: data.munkalapSzam || nextWorkorderNumber(data.projektKod || "ML", data.tipus || ""),
    tipus:        data.tipus        || "Kivitelezés",
    munkalapTipus: data.munkalapTipus || data.tipus || "Kivitelezés",
    status:       migrateMunkalapStatus(data.status || "Létrehozva"),
    // Indoklás (kötelező: Részben kész + Sikertelen esetén)
    indoklas:     data.indoklas     || "",
    datum:        data.datum        || "",
    clientNev:    data.clientNev    || "",
    clientCim:    data.clientCim    || "",
    clientTel:    data.clientTel    || "",
    clientEmail:  data.clientEmail  || "",
    telepitesiCim: data.telepitesiCim || data.clientCim || "",
    assigneeId:   data.assigneeId   || data.csapatId    || "",
    assigneeNev:  data.assigneeNev  || data.csapatNev   || "",
    csapatId:     data.csapatId     || data.assigneeId  || "",
    csapatNev:    data.csapatNev    || data.assigneeNev || "",
    csapatKiosztasok: data.csapatKiosztasok || [],
    megjegyzes:   data.megjegyzes   || "",
    // Audit
    createdAt:    data.createdAt    || now,
    updatedAt:    now,
    createdBy:    data.createdBy    || "",
    updatedBy:    data.updatedBy    || "",
    version:      data.version      || 1,
    syncStatus:   "synced",
    ...data,
    // Az audit mezőket NE írja felül a spread
    updatedAt:    now,
    syncStatus:   "synced",
  };
}

export function createWorkorder(data, user = "") {
  const now = new Date().toISOString();
  const workorder = normalizeWorkorder({
    ...data,
    createdAt: now,
    createdBy: user,
    updatedBy: user,
    version:   1,
  });

  const validation = validateWorkorderBeforeSave(workorder);
  if (!validation.ok) throw new Error(validation.message);

  saveWorkorders([workorder, ...loadWorkorders()]);
  syncMunkalapToCalendar(workorder).catch(() => {});
  return workorder;
}

export function updateWorkorder(id, updates, user = "") {
  const current = getWorkorder(id);
  if (!current) return null;

  const updated = normalizeWorkorder({
    ...current,
    ...updates,
    id,
    createdAt: current.createdAt,
    createdBy: current.createdBy,
    updatedBy: user || current.updatedBy,
    version:   (current.version || 0) + 1,
  });

  const validation = validateWorkorderBeforeSave(updated);
  if (!validation.ok) throw new Error(validation.message);

  const next = loadWorkorders().map(w => w.id === id ? updated : w);
  saveWorkorders(next);

  // Munkalap státusz → Projekt státusz automata frissítés
  if (updates.status && updates.status !== current.status && updated.projektId) {
    const ujProjektStatusz = getProjectStatusFromWorkorder(updates.status);
    if (ujProjektStatusz) {
      updateProjekt(updated.projektId, { status: ujProjektStatusz }, user || "system");
    }
  }

  syncMunkalapToCalendar(updated).catch(() => {});
  return updated;
}

export function deleteWorkorder(id) {
  const toDelete = getWorkorder(id);
  saveWorkorders(loadWorkorders().filter(w => w.id !== id));
  if (toDelete) deleteMunkalapFromCalendar(toDelete).catch(() => {});
}
