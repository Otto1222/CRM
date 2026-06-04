/**
 * localDb.js – Helyi adatbázis localStorage-ban
 * BroadcastChannel-lel cross-tab szinkronizáció
 */

// ─── Fázis 0: összes kollekció explicit kulcsneve ────────────
// Ha itt szerepel a kulcs, loadLocal/saveLocal pontosan ezt használja.
// Ha NEM szerepel, a fallback `crm_${key}` – ami eltérő lenne!
// A meglévő adatok kompatibilitása megőrzött: a kulcsnevek nem változnak.
const KEYS = {
  munkalapok:                  "munkalapok",
  ugyfelek:                    "ugyfelek",
  beallitasok:                 "beallitasok",
  karteritesek:                "karteritesek",
  sablonok:                    "sablonok",
  fovallalkozok:               "fovallalkozok",
  munkatipusok:                "munkatipusok",
  elszamolasi_szabalyok:       "elszamolasi_szabalyok",
  projektek:                   "projektek",
  csapatok:                    "csapatok",
  crm_napelem_users:           "crm_napelem_users",
  szamlak:                     "szamlak",
  edi_sorszam_counter:         "edi_sorszam_counter",
  edi_projekt_sorszam_counter:  "edi_projekt_sorszam_counter",
  "ajanla tok":                 "ajanla tok",
  edi_ajanlat_sorszam_counter:  "edi_ajanlat_sorszam_counter",
  anyagtorzs:                   "anyagtorzs",
  ajanlat_sablonok:             "ajanlat_sablonok",
  crm_backups:                  "crm_backups",
};

// ─── Cross-tab szinkronizáció BroadcastChannel-lel ───────────
// Ha egy tab módosít, az összes többi tab kap értesítést
let _bc = null;
try {
  _bc = new BroadcastChannel("crm-db-sync");
  _bc.onmessage = (e) => {
    // Fogadott üzenet más tab-ból → dispatch helyi event
    if (e.data?.collection) {
      window.dispatchEvent(new CustomEvent("crm-db-updated", {
        detail: { ...e.data, fromBroadcast: true }
      }));
    }
  };
} catch {}

function broadcastChange(detail) {
  try { _bc?.postMessage(detail); } catch {}
}

// ─── Régi kulcsok migrációja ──────────────────────────────────
function migrateOldKeys() {
  // Fázis 0: régi "crm_" prefixes kulcsok migrációja az egységes kulcsokra
  const migrations = [
    ["crm_db_munkalapok",         "munkalapok"],
    ["crm_db_ugyfelek",           "ugyfelek"],
    ["crm_beallitasok",           "beallitasok"],
    ["crm_karteritesek",          "karteritesek"],
    ["crm_sablonok",              "sablonok"],
    ["crm_fovallalkozok",         "fovallalkozok"],
    ["crm_munkatipusok",          "munkatipusok"],
    ["crm_elszamolasi_szabalyok", "elszamolasi_szabalyok"],
    ["crm_projektek",             "projektek"],
  ];
  migrations.forEach(([oldKey, newKey]) => {
    try {
      const old = localStorage.getItem(oldKey);
      if (old && !localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, old);
        localStorage.removeItem(oldKey);
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
  const detail = { collection, action: "add", id: item.id };
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail }));
  broadcastChange(detail);
  return next;
}

export function removeItem(collection, id) {
  const current = loadLocal(collection) || [];
  const next = current.filter(i => i.id !== id);
  saveLocal(collection, next);
  const detail = { collection, action: "remove", id };
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail }));
  broadcastChange(detail);
  return next;
}

export function updateItem(collection, id, updates) {
  const current = loadLocal(collection) || [];
  const next = current.map(i => i.id === id ? { ...i, ...updates } : i);
  saveLocal(collection, next);
  const detail = { collection, action: "update", id };
  // Helyi tab
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail }));
  // Többi tab (cross-tab szinkron)
  broadcastChange(detail);
  return next;
}
