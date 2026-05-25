/**
 * localDb.js – Helyi adatbázis localStorage-ban
 * Az adatok azonnal mentve vannak, nem vesznek el navigáláskor.
 * Google Drive szinkron erre épül rá (ha elérhető).
 */

const KEYS = {
  munkalapok:  "crm_db_munkalapok",
  ugyfelek:    "crm_db_ugyfelek",
};

// ─── Betöltés ─────────────────────────────────────────────────
export function loadLocal(collection) {
  try {
    const raw = localStorage.getItem(KEYS[collection]);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn("[localDb load]", e); }
  return null;
}

// ─── Mentés ───────────────────────────────────────────────────
export function saveLocal(collection, data) {
  try {
    localStorage.setItem(KEYS[collection], JSON.stringify(data));
    return true;
  } catch (e) { console.warn("[localDb save]", e); return false; }
}

// ─── Egy elem hozzáadása ──────────────────────────────────────
export function addItem(collection, item) {
  const current = loadLocal(collection) || [];
  // Ha már létezik, frissít, különben hozzáad
  const idx = current.findIndex(i => i.id === item.id);
  let next;
  if (idx >= 0) {
    next = current.map((i, j) => j === idx ? { ...i, ...item } : i);
  } else {
    next = [item, ...current];
  }
  saveLocal(collection, next);
  return next;
}

// ─── Egy elem törlése ─────────────────────────────────────────
export function removeItem(collection, id) {
  const current = loadLocal(collection) || [];
  const next = current.filter(i => i.id !== id);
  saveLocal(collection, next);
  return next;
}

// ─── Egy elem frissítése ──────────────────────────────────────
export function updateItem(collection, id, updates) {
  const current = loadLocal(collection) || [];
  const next = current.map(i => i.id === id ? { ...i, ...updates } : i);
  saveLocal(collection, next);
  return next;
}
