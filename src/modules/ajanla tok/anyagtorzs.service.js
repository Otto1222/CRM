import { loadLocal, saveLocal, addItem, removeItem, updateItem } from "../../lib/localDb.js";
import { SAMPLE_ANYAGTORZS } from "./anyagtorzs.schema.js";

const KEY = "anyagtorzs";

function ensureSampleData() {
  const existing = loadLocal(KEY);
  if (existing && existing.length > 0) return;
  const items = SAMPLE_ANYAGTORZS.map((d, i) => ({
    ...d,
    id:       `at_${String(i + 1).padStart(4, "0")}`,
    aktiv:    true,
    arresPct: d.nettoBeszerzesiAr > 0
      ? Math.round(((d.ajanlatiNetto - d.nettoBeszerzesiAr) / d.nettoBeszerzesiAr) * 100)
      : 0,
    megjegyzes: "",
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  }));
  saveLocal(KEY, items);
}

export function loadAnyagtorzs() {
  ensureSampleData();
  return loadLocal(KEY) || [];
}

export function getAktivAnyagtorzs() {
  return loadAnyagtorzs().filter(a => a.aktiv !== false);
}

export function createAnyagtorzsTetel(data) {
  const item = {
    ...data,
    id:        `at_${Date.now()}`,
    aktiv:     data.aktiv !== false,
    arresPct:  data.nettoBeszerzesiAr > 0
      ? Math.round(((data.ajanlatiNetto - data.nettoBeszerzesiAr) / data.nettoBeszerzesiAr) * 100)
      : 0,
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  addItem(KEY, item);
  return item;
}

export function updateAnyagtorzsTetel(id, updates) {
  const updated = {
    ...updates,
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  if (updated.nettoBeszerzesiAr !== undefined && updated.ajanlatiNetto !== undefined) {
    updated.arresPct = updated.nettoBeszerzesiAr > 0
      ? Math.round(((updated.ajanlatiNetto - updated.nettoBeszerzesiAr) / updated.nettoBeszerzesiAr) * 100)
      : 0;
  }
  return updateItem(KEY, id, updated);
}

export function deleteAnyagtorzsTetel(id) {
  return removeItem(KEY, id);
}
