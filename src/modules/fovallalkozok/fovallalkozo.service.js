/**
 * fovallalkozo.service.js – CRUD a fővállalkozókhoz és szabályokhoz
 */

import { FOVALLALKOZO_SCHEMA, ELSZAMOLASI_SZABALY_SCHEMA } from "./fovallalkozo.schema.js";
import { createBackup } from "../../lib/backupService.js";

const FV_KEY  = "fovallalkozok";
const SZ_KEY  = "elszamolasi_szabalyok";

const dispatch = (col) =>
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: col } }));

// ─── Fővállalkozók ────────────────────────────────────────────

const DEFAULT_FOVALLALKOZOK = [
  {
    id: "fv_demo1",
    nev: "JuniorVital Kft.",
    aktiv: true,
    alapUtikoltsegFtKm: 80,
    alapSzamlazasiTipus: "fix",
    megjegyzes: "Demo fővállalkozó – szerkeszd vagy töröld",
    createdAt: new Date().toISOString(),
  },
];

export function loadFovallalkozok() {
  try {
    const stored = localStorage.getItem(FV_KEY);
    if (stored) return JSON.parse(stored);
    localStorage.setItem(FV_KEY, JSON.stringify(DEFAULT_FOVALLALKOZOK));
    return DEFAULT_FOVALLALKOZOK;
  } catch { return []; }
}

export function saveFovallalkozok(list) {
  localStorage.setItem(FV_KEY, JSON.stringify(list));
  dispatch(FV_KEY);
}

export function getAktivFovallalkozok() {
  return loadFovallalkozok().filter(f => f.aktiv !== false);
}

export function createFovallalkozo(data) {
  createBackup("Fővállalkozó létrehozás előtt");
  const item = {
    ...FOVALLALKOZO_SCHEMA, ...data,
    id: `fv_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  saveFovallalkozok([...loadFovallalkozok(), item]);
  return item;
}

export function updateFovallalkozo(id, updates) {
  const list = loadFovallalkozok();
  const next = list.map(f => f.id === id ? { ...f, ...updates } : f);
  saveFovallalkozok(next);
  return next.find(f => f.id === id);
}

export function deleteFovallalkozo(id) {
  createBackup("Fővállalkozó törlés előtt");
  saveFovallalkozok(loadFovallalkozok().filter(f => f.id !== id));
}

// ─── Elszámolási szabályok ────────────────────────────────────

export function loadSzabalyok() {
  try { return JSON.parse(localStorage.getItem(SZ_KEY) || "[]"); } catch { return []; }
}

export function saveSzabalyok(list) {
  localStorage.setItem(SZ_KEY, JSON.stringify(list));
  dispatch(SZ_KEY);
}

export function createSzabaly(data) {
  createBackup("Elszámolási szabály létrehozás előtt");
  const item = {
    ...ELSZAMOLASI_SZABALY_SCHEMA, ...data,
    id: `sz_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  saveSzabalyok([...loadSzabalyok(), item]);
  return item;
}

export function updateSzabaly(id, updates) {
  const list = loadSzabalyok();
  const next = list.map(s => s.id === id ? { ...s, ...updates } : s);
  saveSzabalyok(next);
  return next.find(s => s.id === id);
}

export function deleteSzabaly(id) {
  createBackup("Szabály törlés előtt");
  saveSzabalyok(loadSzabalyok().filter(s => s.id !== id));
}

/**
 * Aktív szabály keresés fővállalkozó + munkatípus alapján.
 * Ha nincs pontos egyezés, az általános ("") munkatípusú szabályt adja.
 */
export function findSzabaly(fovallalkoziId, munkatipus) {
  if (!fovallalkoziId) return null;
  const szabalyok = loadSzabalyok().filter(s =>
    s.fovallalkoziId === fovallalkoziId && s.aktiv !== false
  );
  // Pontos egyezés
  const pontos = szabalyok.find(s => s.munkatipus === munkatipus);
  if (pontos) return pontos;
  // Általános (üres munkatípus = minden munkára)
  return szabalyok.find(s => !s.munkatipus) || null;
}

export function getSzabalyokByFovallalkozo(fovallalkoziId) {
  return loadSzabalyok().filter(s => s.fovallalkoziId === fovallalkoziId);
}
