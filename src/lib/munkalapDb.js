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

// Nested → flat séma migráció (régi crm_vbf_{id} telepítői kulcs formátuma)
function migrateToFlat(data) {
  if (!data || typeof data !== "object") return null;
  if ("ac_l1" in data) return data; // már flat formátum
  return {
    ac_l1: data.acFeszultseg?.L1 ?? "",   ac_l2: data.acFeszultseg?.L2 ?? "",   ac_l3: data.acFeszultseg?.L3 ?? "",
    ki_l1: data.kismegsInverter?.L1 ?? "", ki_l2: data.kismegsInverter?.L2 ?? "", ki_l3: data.kismegsInverter?.L3 ?? "",
    km_l1: data.kismegsMero?.L1 ?? "",     km_l2: data.kismegsMero?.L2 ?? "",     km_l3: data.kismegsMero?.L3 ?? "",
    ps_st1: data.panelszam?.ST1 ?? "", ps_st2: data.panelszam?.ST2 ?? "", ps_st3: data.panelszam?.ST3 ?? "",
    ps_st4: data.panelszam?.ST4 ?? "", ps_st5: data.panelszam?.ST5 ?? "", ps_st6: data.panelszam?.ST6 ?? "",
    dc_st1: data.dcFeszultseg?.ST1 ?? "", dc_st2: data.dcFeszultseg?.ST2 ?? "", dc_st3: data.dcFeszultseg?.ST3 ?? "",
    dc_st4: data.dcFeszultseg?.ST4 ?? "", dc_st5: data.dcFeszultseg?.ST5 ?? "", dc_st6: data.dcFeszultseg?.ST6 ?? "",
    hu_l1: data.hurokellenallas?.L1 ?? "", hu_l2: data.hurokellenallas?.L2 ?? "", hu_l3: data.hurokellenallas?.L3 ?? "",
    smart_meter:       data.smartMeter       ?? "",
    akku_db:           data.akku             ?? "",
    dc_teljesitmeny:   data.betapaltDC       ?? "",
    panel_tipus:       data.panelTipus       ?? "",
    panel_voc:         data.panelVoc         ?? "",
    panel_vmp:         data.panelVmp         ?? "",
    panel_imp:         data.panelImp         ?? "",
    panel_isc:         data.panelIsc         ?? "",
    panel_telj:        data.panelTelj        ?? "",
    inv_nevleges:      data.inverterNevleges ?? "",
    epulet_alapfoldes: data.epulet_alapfoldes ?? "",
    tuz_megszakito:    data.tuzMegszakito    ?? "",
  };
}

export function loadVbf(munkalapId) {
  try {
    // 1. Új kulcs (crm_ml_{id}_vbf) – ez az elsődleges forrás
    const newRaw = localStorage.getItem(key(munkalapId, "vbf"));
    if (newRaw) {
      const data = JSON.parse(newRaw);
      return migrateToFlat(data) || {};
    }
    // 2. Fallback: régi telepítői kulcs (crm_vbf_{id}) – átlátszó migráció
    const oldRaw = localStorage.getItem(`crm_vbf_${munkalapId}`);
    if (oldRaw) {
      const migrated = migrateToFlat(JSON.parse(oldRaw));
      if (migrated) {
        // Átírjuk az új kulcsra – következő loadVbf már onnan olvas
        try { localStorage.setItem(key(munkalapId,"vbf"), JSON.stringify({ ...migrated, _savedAt: new Date().toISOString(), _migratedFrom: "crm_vbf" })); } catch {}
        return migrated;
      }
    }
    return {};
  } catch { return {}; }
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

// ─── Felmérési fotók ────────────────────────────────────────
export function saveFelmeresFotok(munkalapId, fotok) {
  try {
    localStorage.setItem(key(munkalapId, "felmeres_fotok"), JSON.stringify(fotok));
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: `felmeres_fotok_${munkalapId}` } }));
    return true;
  } catch { return false; }
}
export function loadFelmeresFotok(munkalapId) {
  try {
    const r = localStorage.getItem(key(munkalapId, "felmeres_fotok"));
    return r ? JSON.parse(r) : [];
  } catch { return []; }
}
