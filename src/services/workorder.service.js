import { validateWorkorderBeforeSave } from "../modules/projektek/projectRules.js";
import { driveSave } from "../lib/driveApi.js";
import { syncMunkalapToCalendar, deleteMunkalapFromCalendar } from "./calendarSync.service.js";

const KEY = "munkalapok";

function dispatch(collection = "munkalapok") {
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection } }));
}

export function loadWorkorders() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveWorkorders(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch("munkalapok");
  driveSave("munkalapok", { munkalapok: list }).catch(() => {});
}

export function getWorkorder(id) {
  return loadWorkorders().find(w => w.id === id) || null;
}

export function getWorkordersByProjectId(projectId) {
  return loadWorkorders().filter(w => w.projektId === projectId);
}

// Típus rövidítés a munkalapszámhoz (spec 4. pont: T03680/FELMÉRÉS/001)
const TIPUS_ROVID = {
  "Felmérés":         "FELM",
  "Első kivitelezés": "TELEP",
  "Javítás":          "JAV",
  "Befejezés":        "BEF",
  "Garanciális munka":"GAR",
  "Hibajavítás":      "HIBA",
  "Pótmunkavégzés":   "POT",
  "Karbantartás":     "KARB",
  "Egyéb":            "EGYEB",
  "Kivitelezés":      "TELEP",
  "Szerviz":          "SZERV",
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
    projektId: data.projektId || "",
    projektKod: data.projektKod || "",
    munkalapSzam: data.munkalapSzam || nextWorkorderNumber(data.projektKod || "ML", data.tipus || data.munkalapTipus || ""),

    tipus: data.tipus || data.munkalapTipus || "Felmérés",
    munkalapTipus: data.munkalapTipus || data.tipus || "Felmérés",

    status: data.status || "Kiosztásra vár",

    datum: data.datum || data.date || "",
    date: data.date || data.datum || "",

    clientNev: data.clientNev || "",
    clientCim: data.clientCim || "",
    clientTel: data.clientTel || "",
    clientEmail: data.clientEmail || "",

    telepitesiCim: data.telepitesiCim || data.clientCim || "",

    assigneeId: data.assigneeId || data.csapatId || "",
    assigneeNev: data.assigneeNev || data.csapatNev || "",

    csapatId: data.csapatId || data.assigneeId || "",
    csapatNev: data.csapatNev || data.assigneeNev || "",

    megjegyzes: data.megjegyzes || "",

    createdAt: data.createdAt || now,
    updatedAt: now,

    ...data,
  };
}

export function createWorkorder(data) {
  const workorder = normalizeWorkorder(data);

  const validation = validateWorkorderBeforeSave(workorder);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  saveWorkorders([workorder, ...loadWorkorders()]);
  // Live Google Calendar szinkron – fire-and-forget, nem blokkolja a mentést
  syncMunkalapToCalendar(workorder).catch(() => {});
  return workorder;
}

export function updateWorkorder(id, updates) {
  const current = getWorkorder(id);

  if (!current) {
    return null;
  }

  const updated = normalizeWorkorder({
    ...current,
    ...updates,
    id,
    createdAt: current.createdAt,
  });

  const validation = validateWorkorderBeforeSave(updated);

  if (!validation.ok) {
    throw new Error(validation.message);
  }

  const next = loadWorkorders().map(w =>
    w.id === id ? updated : w
  );

  saveWorkorders(next);
  // Live Google Calendar szinkron – dátum, cím, státusz, assignee változásra
  syncMunkalapToCalendar(updated).catch(() => {});
  return updated;
}

export function deleteWorkorder(id) {
  const toDelete = getWorkorder(id);
  saveWorkorders(loadWorkorders().filter(w => w.id !== id));
  // Törölt munkalap naptár eseményét is eltávolítja
  if (toDelete) deleteMunkalapFromCalendar(toDelete).catch(() => {});
}