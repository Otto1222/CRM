import { CSAPAT_SCHEMA, CSAPAT_TAG_SCHEMA } from "./csapat.schema.js";

const KEY            = "csapatok";
const CSAPAT_TAGOK_KEY = "csapat_tagok";

function dispatch(col = "csapatok") {
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: col } }));
}

// ─── Csapatok ────────────────────────────────────────────────

export function loadCsapatok() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
  catch { return []; }
}

function saveCsapatok(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch("csapatok");
}

export function getAktivCsapatok() {
  return loadCsapatok().filter(c => c.aktiv !== false);
}

export function getCsapat(id) {
  return loadCsapatok().find(c => c.id === id) || null;
}

export function createCsapat(data, createdBy = "") {
  const now = new Date().toISOString();
  const csapat = {
    ...CSAPAT_SCHEMA,
    ...data,
    id: `cs_${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    createdBy,
  };
  saveCsapatok([...loadCsapatok(), csapat]);
  return csapat;
}

export function updateCsapat(id, updates, updatedBy = "") {
  const list = loadCsapatok();
  const updated = list.map(c =>
    c.id === id
      ? { ...c, ...updates, id, updatedAt: new Date().toISOString(), updatedBy }
      : c
  );
  saveCsapatok(updated);
  return updated.find(c => c.id === id);
}

export function deleteCsapat(id) {
  saveCsapatok(loadCsapatok().filter(c => c.id !== id));
}

// ─── Csapat Tagok ─────────────────────────────────────────────

export function loadCsapatTagok() {
  try { return JSON.parse(localStorage.getItem(CSAPAT_TAGOK_KEY) || "[]"); }
  catch { return []; }
}

function saveCsapatTagok(list) {
  localStorage.setItem(CSAPAT_TAGOK_KEY, JSON.stringify(list));
  dispatch("csapat_tagok");
}

export function getCsapatTagok(csapatId) {
  return loadCsapatTagok().filter(t => t.csapatId === csapatId);
}

export function getAktivCsapatTagok(csapatId) {
  return getCsapatTagok(csapatId).filter(t => t.aktiv !== false);
}

export function getAllAktivCsapatTagok() {
  return loadCsapatTagok().filter(t => t.aktiv !== false);
}

export function createCsapatTag(csapatId, data) {
  const now = new Date().toISOString();
  const tag = {
    ...CSAPAT_TAG_SCHEMA,
    ...data,
    id: `ctag_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    csapatId,
    aktiv: data.aktiv !== undefined ? data.aktiv : true,
    createdAt: now,
    updatedAt: now,
  };
  saveCsapatTagok([...loadCsapatTagok(), tag]);
  return tag;
}

export function updateCsapatTag(id, updates) {
  saveCsapatTagok(
    loadCsapatTagok().map(t =>
      t.id === id ? { ...t, ...updates, id, updatedAt: new Date().toISOString() } : t
    )
  );
}

export function deleteCsapatTag(id) {
  saveCsapatTagok(loadCsapatTagok().filter(t => t.id !== id));
}

// ─── Csapat alvállalkozói bér számítás (backward compat) ─────

export function calcCsapatAlvallalkozoiBer(csapat, params = {}) {
  if (!csapat?.elszamolasAktiv) return { osszeg: 0, megjegyzes: "Nincs alvállalkozói elszámolás" };

  const { nettoBevitel = 0, munkanapok = 1, csapatLetszam = 1, darabszam = 1 } = params;
  const osszeg2 = Number(csapat.dijOsszeg) || 0;
  const egyseg  = Number(csapat.dijEgysegAr) || 0;

  switch (csapat.dijTipus) {
    case "fix":
      return { osszeg: osszeg2, megjegyzes: `Fix díj: ${osszeg2.toLocaleString("hu-HU")} Ft` };
    case "Ft/nap":
      return { osszeg: osszeg2 * munkanapok, megjegyzes: `${osszeg2} Ft/nap × ${munkanapok} nap` };
    case "Ft/nap/fő":
      return { osszeg: osszeg2 * munkanapok * csapatLetszam, megjegyzes: `${osszeg2} Ft/nap/fő × ${munkanapok} × ${csapatLetszam} fő` };
    case "%":
      return { osszeg: Math.round(nettoBevitel * osszeg2 / 100), megjegyzes: `${osszeg2}% × ${nettoBevitel.toLocaleString("hu-HU")} Ft` };
    case "darab":
      return { osszeg: egyseg * darabszam, megjegyzes: `${egyseg} Ft/db × ${darabszam} db` };
    case "kezi":
      return { osszeg: osszeg2, megjegyzes: "Kézi megadás" };
    default:
      return { osszeg: 0, megjegyzes: "Ismeretlen típus" };
  }
}

export function calcCsapatKmBer(csapat, tavKm = 0) {
  if (!csapat?.kmElszamolasAktiv || !csapat.kmDijFtKm) return { osszeg: 0, megjegyzes: "" };
  const kuszob = Number(csapat.kmKuszobKm) || 0;
  const ftKm   = Number(csapat.kmDijFtKm)  || 0;
  const elszam = Math.max(0, tavKm - kuszob);
  const osszeg = Math.round(elszam * 2 * ftKm);
  return { osszeg, megjegyzes: `${tavKm} km − ${kuszob} km küszöb = ${elszam} km × 2 × ${ftKm} Ft/km` };
}

// ─── Alvállalkozói elszámolási szabályok (új motor) ───────────

const AV_KEY = "av_szabalyok";

export function loadAvSzabalyok() {
  try { return JSON.parse(localStorage.getItem(AV_KEY) || "[]"); } catch { return []; }
}

function saveAvSzabalyok(list) {
  localStorage.setItem(AV_KEY, JSON.stringify(list));
  dispatch("av_szabalyok");
}

export function getAvSzabalyokByCsapat(csapatId) {
  return loadAvSzabalyok().filter(s => s.tulajdonosId === csapatId);
}

export function createAvSzabaly(csapatId, data) {
  const item = {
    ...data,
    id:           `avs_${Date.now()}`,
    tulajdonosId: csapatId,
    createdAt:    new Date().toISOString(),
  };
  saveAvSzabalyok([...loadAvSzabalyok(), item]);
  return item;
}

export function updateAvSzabaly(id, updates) {
  saveAvSzabalyok(loadAvSzabalyok().map(s => s.id === id ? { ...s, ...updates } : s));
}

export function deleteAvSzabaly(id) {
  saveAvSzabalyok(loadAvSzabalyok().filter(s => s.id !== id));
}
