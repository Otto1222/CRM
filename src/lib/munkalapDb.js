/**
 * munkalapDb.js – Munkalap-szintű adatbázis
 * Minden munkalaphoz külön localStorage kulcs
 * + Google Drive szinkron (Claude/CRM/Munkák/{id}/)
 */

// ─── LocalStorage kulcs generálás ────────────────────────────
const key = (id, type) => `crm_ml_${id}_${type}`;

export function saveVbf(munkalapId, data) {
  try { localStorage.setItem(key(munkalapId,"vbf"), JSON.stringify({ ...data, _savedAt: new Date().toISOString() })); return true; }
  catch { return false; }
}
export function loadVbf(munkalapId) {
  try { const r = localStorage.getItem(key(munkalapId,"vbf")); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}

export function savePhoto(munkalapId, kategoria, photos) {
  try {
    const all = loadAllPhotos(munkalapId);
    all[kategoria] = photos;
    localStorage.setItem(key(munkalapId,"photos"), JSON.stringify(all));
    return true;
  } catch { return false; }
}
export function loadAllPhotos(munkalapId) {
  try { const r = localStorage.getItem(key(munkalapId,"photos")); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}

export function saveMunkalapadatok(munkalapId, data) {
  try { localStorage.setItem(key(munkalapId,"state"), JSON.stringify({ ...data, _savedAt: new Date().toISOString() })); return true; }
  catch { return false; }
}
export function loadMunkalapadatok(munkalapId) {
  try { const r = localStorage.getItem(key(munkalapId,"state")); return r ? JSON.parse(r) : {}; }
  catch { return {}; }
}

// ─── Validáció: üres mező = "0" szükséges ────────────────────
export function validateVbf(data, fields) {
  const hibak = [];
  fields.forEach(f => {
    const val = data[f.key];
    if (val === undefined || val === null || val === "") {
      hibak.push(f.label);
    }
  });
  return hibak;
}
