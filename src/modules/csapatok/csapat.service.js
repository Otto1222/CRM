const KEY = "csapatok";

function dispatch() {
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "csapatok" } }));
}

export function loadCsapatok() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function saveCsapatok(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch();
}

export function getAktivCsapatok() {
  return loadCsapatok().filter(c => c.aktiv !== false);
}

export function createCsapat(data, createdBy = "") {
  const now = new Date().toISOString();
  const csapat = {
    id: `cs_${Date.now()}`,
    nev: data.nev || "",
    telephely: data.telephely || "",
    szin: data.szin || "#2563EB",
    tagok: data.tagok || [],
    tagNevek: data.tagNevek || [],
    kapacitas: Number(data.kapacitas) || 2,
    hetvegen: !!data.hetvegen,
    munkatipusok: data.munkatipusok || [],
    aktiv: true,
    createdAt: now,
    updatedAt: now,
    createdBy,
  };
  saveCsapatok([...loadCsapatok(), csapat]);
  return csapat;
}

export function updateCsapat(id, updates, updatedBy = "") {
  const list = loadCsapatok();
  const updated = list.map(c =>
    c.id === id
      ? { ...c, ...updates, id, updatedAt: new Date().toISOString(), updatedBy }
      : c
  );
  saveCsapatok(updated);
  return updated.find(c => c.id === id);
}

export function deleteCsapat(id) {
  saveCsapatok(loadCsapatok().filter(c => c.id !== id));
}
