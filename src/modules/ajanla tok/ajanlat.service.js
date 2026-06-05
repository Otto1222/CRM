import { loadLocal, saveLocal, addItem, removeItem, updateItem } from "../../lib/localDb.js";

const KEY = "ajanla tok";
const COUNTER_KEY = "edi_ajanlat_sorszam_counter";

function nextAjanlatkod() {
  const year = new Date().getFullYear();
  const raw   = loadLocal(COUNTER_KEY) || {};
  const count = (raw[year] || 0) + 1;
  saveLocal(COUNTER_KEY, { ...raw, [year]: count });
  return `AJA-${year}-${String(count).padStart(3, "0")}`;
}

export function loadAjanlatok() {
  return loadLocal(KEY) || [];
}

export function createAjanlat(data, user) {
  const item = {
    ...data,
    id:          crypto.randomUUID(),
    ajanlatkod:  data.ajanlatkod || nextAjanlatkod(),
    keszitette:  user?.name || "",
    createdAt:   new Date().toISOString().slice(0, 10),
    updatedAt:   new Date().toISOString().slice(0, 10),
  };
  addItem(KEY, item);
  return item;
}

export function updateAjanlat(id, updates) {
  return updateItem(KEY, id, { ...updates, updatedAt: new Date().toISOString().slice(0, 10) });
}

export function deleteAjanlat(id) {
  return removeItem(KEY, id);
}
