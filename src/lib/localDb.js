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
  csapat_tagok:                "csapat_tagok",
  crm_napelem_users:           "crm_napelem_users",
  szamlak:                     "szamlak",
  edi_sorszam_counter:         "edi_sorszam_counter",
  edi_projekt_sorszam_counter:  "edi_projekt_sorszam_counter",
  ajanlatok:                    "ajanlatok",
  edi_ajanlat_sorszam_counter:  "edi_ajanlat_sorszam_counter",
  crm_backups:                  "crm_backups",
  anyag_ar_verziok:             "anyag_ar_verziok",
  kivitelezesi_csomagok:        "kivitelezesi_csomagok",
  crm_tombstones:               "crm_tombstones",
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

  // P0-2: "ajanla tok" (szóközös, hibás kulcs) → "ajanlatok"
  try {
    const old = localStorage.getItem("ajanla tok");
    if (old && !localStorage.getItem("ajanlatok")) {
      localStorage.setItem("ajanlatok", old);
      localStorage.removeItem("ajanla tok");
    }
  } catch {}
}
migrateOldKeys();

// ─── Tárolási hibajelzés (a néma adatvesztés ellen) ───────────
// parse-hiba / quota-hiba esetén:
//  (1) a sérült nyers adatot megőrizzük (helyreállíthatóság),
//  (2) eseményt küldünk a UI-nak (látható hibasáv),
//  (3) a sérült kulcs felülírását blokkoljuk (force nélkül),
//      hogy egy elavult/üres állapot ne törölje a megőrzött adatot.
const _corruptedKeys = new Set();

function emitStorageError(key, type, extra) {
  try {
    window.dispatchEvent(new CustomEvent("crm-storage-error", {
      detail: { key, type, ...(extra || {}) },
    }));
  } catch {}
}

export function isKeyCorrupted(key) {
  const storageKey = KEYS[key] || `crm_${key}`;
  return _corruptedKeys.has(storageKey);
}

export function loadLocal(key) {
  const storageKey = KEYS[key] || `crm_${key}`;
  let raw = null;
  try {
    raw = localStorage.getItem(storageKey);
    if (raw == null) return null;
    const parsed = JSON.parse(raw);
    // sikeres olvasás → ha korábban sérültnek jelöltük, feloldjuk
    _corruptedKeys.delete(storageKey);
    return parsed;
  } catch (e) {
    console.error("[localDb load] SÉRÜLT JSON:", key, e);
    // a sérült nyers adat megőrzése, hogy NE vesszen el felülíráskor
    try {
      if (raw) localStorage.setItem(`${storageKey}__corrupt_${Date.now()}`, raw);
    } catch {}
    _corruptedKeys.add(storageKey);
    emitStorageError(key, "parse");
    return null;
  }
}

export function saveLocal(key, data, opts) {
  const storageKey = KEYS[key] || `crm_${key}`;
  // A sérült kulcs felülírásának blokkolása (force nélkül)
  if (_corruptedKeys.has(storageKey) && !(opts && opts.force)) {
    console.error("[localDb save] BLOKKOLVA – sérült kulcs felülírása megakadályozva:", key);
    emitStorageError(key, "overwrite-blocked");
    return false;
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
    if (opts && opts.force) _corruptedKeys.delete(storageKey);
    return true;
  } catch (e) {
    console.error("[localDb save] MENTÉSI HIBA:", key, e);
    const quota = e && (e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014);
    emitStorageError(key, quota ? "quota" : "write", { message: e && e.message });
    return false;
  }
}

export function addItem(collection, item) {
  const current = loadLocal(collection) || [];
  const idx = current.findIndex(i => i.id === item.id);
  const next = idx >= 0
    ? current.map((i, j) => j === idx ? { ...i, ...item } : i)
    : [item, ...current];
  // Ha a mentés nem sikerült (sérült kulcs / quota), NE jelezzünk sikert
  // és NE írjuk felül az állapotot – így nem veszik el korábbi adat.
  if (!saveLocal(collection, next)) return current;
  const detail = { collection, action: "add", id: item.id };
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail }));
  broadcastChange(detail);
  return next;
}

export function removeItem(collection, id) {
  const current = loadLocal(collection) || [];
  const next = current.filter(i => i.id !== id);
  if (!saveLocal(collection, next)) return current;
  const detail = { collection, action: "remove", id };
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail }));
  broadcastChange(detail);
  return next;
}

export function updateItem(collection, id, updates) {
  const current = loadLocal(collection) || [];
  const next = current.map(i => i.id === id ? { ...i, ...updates } : i);
  if (!saveLocal(collection, next)) return current;
  const detail = { collection, action: "update", id };
  // Helyi tab
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail }));
  // Többi tab (cross-tab szinkron)
  broadcastChange(detail);
  return next;
}
