import { loadLocal, addItem, removeItem, updateItem } from "../../lib/localDb.js";

const KEY = "ajanlat_sablonok";

export function loadAjanlatSablonok() {
  return loadLocal(KEY) || [];
}

export function createAjanlatSablon(data) {
  const item = {
    ...data,
    id:        crypto.randomUUID(),
    createdAt: new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString().slice(0, 10),
  };
  addItem(KEY, item);
  return item;
}

export function updateAjanlatSablon(id, updates) {
  return updateItem(KEY, id, { ...updates, updatedAt: new Date().toISOString().slice(0, 10) });
}

export function deleteAjanlatSablon(id) {
  return removeItem(KEY, id);
}
