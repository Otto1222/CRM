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

export function createWorkorder(data) {
  const now = new Date().toISOString();

  const workorder = {
    id: data.id || `ml_${Date.now()}`,
    projektId: data.projektId || "",
    projektKod: data.projektKod || "",
    munkalapSzam: data.munkalapSzam || nextWorkorderNumber(data.projektKod || "ML"),
    tipus: data.tipus || "Felmérés",
    status: data.status || "Kiosztásra vár",
    datum: data.datum || "",
    clientNev: data.clientNev || "",
    clientCim: data.clientCim || "",
    clientTel: data.clientTel || "",
    clientEmail: data.clientEmail || "",
    telepitesiCim: data.telepitesiCim || data.clientCim || "",
    assigneeId: data.assigneeId || "",
    assigneeNev: data.assigneeNev || "",
    csapatId: data.csapatId || "",
    csapatNev: data.csapatNev || "",
    megjegyzes: data.megjegyzes || "",
    createdAt: now,
    updatedAt: now,
    ...data,
  };

  saveWorkorders([workorder, ...loadWorkorders()]);
  return workorder;
}

export function updateWorkorder(id, updates) {
  const now = new Date().toISOString();

  const next = loadWorkorders().map(w =>
    w.id === id ? { ...w, ...updates, updatedAt: now } : w
  );

  saveWorkorders(next);
  return getWorkorder(id);
}

export function deleteWorkorder(id) {
  saveWorkorders(loadWorkorders().filter(w => w.id !== id));
}