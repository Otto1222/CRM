import { validateWorkorderBeforeSave } from "../modules/projektek/projectRules.js";

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
}

export function getWorkorder(id) {
  return loadWorkorders().find(w => w.id === id) || null;
}

export function getWorkordersByProjectId(projectId) {
  return loadWorkorders().filter(w => w.projektId === projectId);
}

export function nextWorkorderNumber(projectKod) {
  const existing = loadWorkorders().filter(w => w.projektKod === projectKod);
  return `${projectKod}/${String(existing.length + 1).padStart(3, "0")}`;
}

function normalizeWorkorder(data = {}) {
  const now = new Date().toISOString();

  return {
    id: data.id || `ml_${Date.now()}`,
    projektId: data.projektId || "",
    projektKod: data.projektKod || "",
    munkalapSzam: data.munkalapSzam || nextWorkorderNumber(data.projektKod || "ML"),

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
  return updated;
}

export function deleteWorkorder(id) {
  saveWorkorders(loadWorkorders().filter(w => w.id !== id));
}