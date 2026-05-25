/**
 * localDb.js – Helyi adatbázis localStorage-ban
 */

const KEYS = {
  munkalapok: "crm_db_munkalapok",
  ugyfelek:   "crm_db_ugyfelek",
};

export function loadLocal(key) {
  const storageKey = KEYS[key] || `crm_${key}`;
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { console.warn("[localDb load]", key, e); return null; }
}

export function saveLocal(key, data) {
  const storageKey = KEYS[key] || `crm_${key}`;
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
    return true;
  } catch (e) { console.warn("[localDb save]", key, e); return false; }
}

export function addItem(collection, item) {
  const current = loadLocal(collection) || [];
  const idx = current.findIndex(i => i.id === item.id);
  const next = idx >= 0
    ? current.map((i, j) => j === idx ? { ...i, ...item } : i)
    : [item, ...current];
  saveLocal(collection, next);
  return next;
}

export function removeItem(collection, id) {
  const current = loadLocal(collection) || [];
  const next = current.filter(i => i.id !== id);
  saveLocal(collection, next);
  return next;
}

export function updateItem(collection, id, updates) {
  const current = loadLocal(collection) || [];
  const next = current.map(i => i.id === id ? { ...i, ...updates } : i);
  saveLocal(collection, next);
  return next;
}
