/**
 * szamla.service.js – Számla CRUD és összesítők
 */
import { loadLocal, saveLocal } from "../../lib/localDb";
import { SZAMLA_SCHEMA, isKesedelmes } from "./szamla.schema";

const KEY = "szamlak";

// ─── CRUD ─────────────────────────────────────────────────────
export function loadSzamlak() {
  try { return loadLocal(KEY) || []; } catch { return []; }
}

function saveSzamlak(list) {
  saveLocal(KEY, list);
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: KEY } }));
}

export function createSzamla(data, createdBy = "") {
  const now = new Date().toISOString();
  const szamla = {
    ...SZAMLA_SCHEMA,
    ...data,
    id:        `sz_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAt: now,
    updatedAt: now,
    createdBy,
  };
  // ÁFA összeg auto-számítás ha hiányzik
  if (!szamla.afaOsszeg && szamla.nettoOsszeg) {
    szamla.afaOsszeg = Math.round(szamla.nettoOsszeg * szamla.afaKulcs / 100);
  }
  if (!szamla.bruttoOsszeg) {
    szamla.bruttoOsszeg = szamla.nettoOsszeg + szamla.afaOsszeg;
  }
  saveSzamlak([szamla, ...loadSzamlak()]);
  return szamla;
}

export function updateSzamla(id, updates) {
  const list = loadSzamlak();
  const idx  = list.findIndex(s => s.id === id);
  if (idx < 0) return null;
  const updated = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  list[idx] = updated;
  saveSzamlak(list);
  return updated;
}

export function deleteSzamla(id) {
  saveSzamlak(loadSzamlak().filter(s => s.id !== id));
}

// ─── Összesítők ───────────────────────────────────────────────
export function getSzamlaOsszesito(szamlak = null) {
  const list = szamlak ?? loadSzamlak();

  const kimeno = list.filter(s => s.tipus === "kimeno");
  const bejovo = list.filter(s => s.tipus === "bejovo");

  function ossz(arr, mez = "bruttoOsszeg") {
    return arr.reduce((s, x) => s + (Number(x[mez]) || 0), 0);
  }

  return {
    // Kimenő
    kimenoOssz:    ossz(kimeno),
    kimenoFizetve: ossz(kimeno.filter(s => s.status === "Fizetve")),
    kimenoNyitott: ossz(kimeno.filter(s => !["Fizetve","Sztornózva"].includes(s.status))),
    kimenoKeses:   kimeno.filter(s => isKesedelmes(s)).length,

    // Bejövő
    bejovOssz:     ossz(bejovo),
    bejovFizetve:  ossz(bejovo.filter(s => s.status === "Fizetve")),
    bejovNyitott:  ossz(bejovo.filter(s => !["Fizetve","Visszautasított"].includes(s.status))),
  };
}

// ─── Szűrők ───────────────────────────────────────────────────
export function szurSzamlak(szamlak, { tipus, status, from, to, q } = {}) {
  return szamlak.filter(s => {
    if (tipus  && s.tipus  !== tipus)  return false;
    if (status && s.status !== status) return false;
    if (from   && s.kiallitasDatuma < from) return false;
    if (to     && s.kiallitasDatuma > to)   return false;
    if (q) {
      const qL = q.toLowerCase();
      if (
        !s.szamlaszam?.toLowerCase().includes(qL) &&
        !s.ugyfelNev?.toLowerCase().includes(qL) &&
        !s.szallitoNev?.toLowerCase().includes(qL) &&
        !s.projektKod?.toLowerCase().includes(qL) &&
        !s.projektNev?.toLowerCase().includes(qL)
      ) return false;
    }
    return true;
  });
}
