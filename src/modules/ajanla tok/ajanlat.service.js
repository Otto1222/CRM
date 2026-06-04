import { loadLocal, saveLocal, addItem, removeItem, updateItem } from "../../lib/localDb.js";

const KEY         = "ajanla tok";
const COUNTER_KEY = "edi_ajanlat_sorszam_counter";

function nextAjanlatkod() {
  const year    = new Date().getFullYear();
  const counter = loadLocal(COUNTER_KEY) || { year, seq: 0 };
  const seq     = counter.year === year ? counter.seq + 1 : 1;
  saveLocal(COUNTER_KEY, { year, seq });
  return `AJA-${year}-${String(seq).padStart(3, "0")}`;
}

export function loadAjanlatok() {
  return loadLocal(KEY) || [];
}

export function createAjanlat(data, currentUser) {
  const item = {
    ...data,
    id:         crypto.randomUUID(),
    ajanlatkod: nextAjanlatkod(),
    keszitette: currentUser?.name || currentUser?.username || "",
    createdAt:  new Date().toISOString().slice(0, 10),
    updatedAt:  new Date().toISOString().slice(0, 10),
    status:     data.status || "Piszkozat",
    projektId:  data.projektId || null,
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
