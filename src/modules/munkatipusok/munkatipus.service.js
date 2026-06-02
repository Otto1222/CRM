/**
 * munkatipus.service.js – CRUD munkatípusokhoz
 */
import { MUNKATIPUS_SCHEMA, DEFAULT_MUNKATIPUSOK } from "./munkatipus.schema.js";
import { createBackup } from "../../lib/backupService.js";

const KEY = "munkatipusok";
const dispatch = (col) =>
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: col } }));

export function loadMunkatipusok() {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Drive szinkron [] -t írhat be, ha a Drive-on még nincs adat → ilyenkor töltjük az alapokat
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    localStorage.setItem(KEY, JSON.stringify(DEFAULT_MUNKATIPUSOK));
    return DEFAULT_MUNKATIPUSOK;
  } catch { return DEFAULT_MUNKATIPUSOK; }
}

export function saveMunkatipusok(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch(KEY);
}

export function getAktivMunkatipusok() {
  return loadMunkatipusok().filter(m => m.aktiv !== false);
}

export function getMunkatipus(id) {
  return loadMunkatipusok().find(m => m.id === id) || null;
}

export function createMunkatipus(data) {
  createBackup("Munkatípus létrehozás előtt");
  const item = {
    ...MUNKATIPUS_SCHEMA, ...data,
    id: `mt_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  saveMunkatipusok([...loadMunkatipusok(), item]);
  return item;
}

export function updateMunkatipus(id, updates) {
  const list = loadMunkatipusok();
  const next = list.map(m => m.id === id ? { ...m, ...updates } : m);
  saveMunkatipusok(next);
  return next.find(m => m.id === id);
}

export function deleteMunkatipus(id) {
  createBackup("Munkatípus törlés előtt");
  saveMunkatipusok(loadMunkatipusok().filter(m => m.id !== id));
}
