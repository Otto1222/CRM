/**
 * localDb.js – Helyi adatbázis localStorage-ban
 */

const KEYS = {
  // EGYSÉGES kulcsok – minden modul ezeket használja direktben is
  munkalapok: "munkalapok",
  ugyfelek:   "ugyfelek",
};

// Régi kulcsokból migráció (egyszeri, web cache esetén)
function migrateOldKeys() {
  const migrations = [
    ["crm_db_munkalapok", "munkalapok"],
    ["crm_db_ugyfelek",   "ugyfelek"],
  ];
  migrations.forEach(([oldKey, newKey]) => {
    try {
      const old = localStorage.getItem(oldKey);
      if (old && !localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, old);
        localStorage.removeItem(oldKey);
        console.info("[localDb] Migrálva:", oldKey, "→", newKey);
      }
    } catch {}
  });
}
migrateOldKeys();

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
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection, action: "add", id: item.id } }));
  return next;
}

export function removeItem(collection, id) {
  const current = loadLocal(collection) || [];
  const next = current.filter(i => i.id !== id);
  saveLocal(collection, next);
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection, action: "remove", id } }));
  return next;
}

export function updateItem(collection, id, updates) {
  const current = loadLocal(collection) || [];
  const next = current.map(i => i.id === id ? { ...i, ...updates } : i);
  saveLocal(collection, next);
  // Értesíti az App-ot hogy frissítse a React state-t
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection, action: "update", id } }));
  return next;
}
