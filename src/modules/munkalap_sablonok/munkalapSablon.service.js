/**
 * munkalapSablon.service.js
 * Munkalap sablon CRUD + gyári sablonok inicializálása.
 * Gyári sablon: nem törölhető, csak másolható / inaktiválható.
 */
import { GYARI_SABLONOK, MUNKALAP_SABLON_SCHEMA, ujFotoKategoria, ujMezo } from "./munkalapSablon.schema.js";
import { driveSave } from "../../lib/driveApi.js";

const KEY = "munkalap_sablonok";

function dispatch() {
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: KEY } }));
}

// ─── Betöltés / mentés ───────────────────────────────────────

export function loadSablonok() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveSablonok(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch();
  driveSave(KEY, { [KEY]: list }).catch(() => {});
}

// ─── Gyári sablonok inicializálása ───────────────────────────

export function initSablonok() {
  const existing = loadSablonok();
  if (existing.length > 0) {
    // Gyári sablonok kiegészítése, ha nem léteznek
    const gyariIds = new Set(existing.map(s => s.id));
    const hianyzok = GYARI_SABLONOK.filter(g => !gyariIds.has(g.id));
    if (hianyzok.length > 0) {
      const now = new Date().toISOString();
      const ujLista = [
        ...existing,
        ...hianyzok.map(g => ({ ...g, createdAt: now, updatedAt: now, version: 1 })),
      ];
      saveSablonok(ujLista);
      return ujLista;
    }
    return existing;
  }
  // Első indítás: gyári sablonok betöltése
  const now = new Date().toISOString();
  const lista = GYARI_SABLONOK.map(g => ({
    ...g,
    createdAt: now,
    updatedAt: now,
    version: 1,
  }));
  saveSablonok(lista);
  return lista;
}

// ─── Olvasás ─────────────────────────────────────────────────

export function getSablon(id) {
  return loadSablonok().find(s => s.id === id) || null;
}

export function getAktivSablonok() {
  return loadSablonok().filter(s => s.aktiv !== false);
}

// ─── Létrehozás ──────────────────────────────────────────────

export function createSablon(data, user = "") {
  const now = new Date().toISOString();
  const sablon = {
    ...MUNKALAP_SABLON_SCHEMA,
    ...data,
    id:        `sbl_${Date.now()}`,
    gyari:     false,
    createdAt: now,
    updatedAt: now,
    createdBy: user,
    updatedBy: user,
    version:   1,
  };
  const list = [...loadSablonok(), sablon];
  saveSablonok(list);
  return sablon;
}

// ─── Frissítés ───────────────────────────────────────────────

export function updateSablon(id, updates, user = "") {
  const all = loadSablonok();
  const idx = all.findIndex(s => s.id === id);
  if (idx < 0) return null;
  const updated = {
    ...all[idx],
    ...updates,
    id,
    gyari:     all[idx].gyari,
    updatedAt: new Date().toISOString(),
    updatedBy: user,
    version:   (all[idx].version || 0) + 1,
  };
  all[idx] = updated;
  saveSablonok(all);
  return updated;
}

// ─── Inaktiválás / aktiválás ─────────────────────────────────

export function inaktivalSablon(id, user = "") {
  return updateSablon(id, { aktiv: false }, user);
}

export function aktivSablon(id, user = "") {
  return updateSablon(id, { aktiv: true }, user);
}

// ─── Másolás ─────────────────────────────────────────────────

export function masolSablon(id, user = "") {
  const eredeti = getSablon(id);
  if (!eredeti) return null;
  const now = new Date().toISOString();
  // Mezők és fotókategóriák új ID-kkel
  const ujMezok = (eredeti.mezok || []).map(mezo => ({
    ...mezo,
    id: `mezo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  }));
  const ujFotok = (eredeti.fotoKategoriak || []).map(fk => ({
    ...fk,
    id: `fkat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  }));
  const masolat = {
    ...eredeti,
    id:             `sbl_${Date.now()}`,
    nev:            `${eredeti.nev} (másolat)`,
    gyari:          false,
    aktiv:          true,
    mezok:          ujMezok,
    fotoKategoriak: ujFotok,
    createdAt:      now,
    updatedAt:      now,
    createdBy:      user,
    updatedBy:      user,
    version:        1,
  };
  const list = [...loadSablonok(), masolat];
  saveSablonok(list);
  return masolat;
}

// ─── Törlés (csak nem-gyári) ─────────────────────────────────

export function deleteSablon(id) {
  const sablon = getSablon(id);
  if (!sablon) return false;
  if (sablon.gyari) return false;
  saveSablonok(loadSablonok().filter(s => s.id !== id));
  return true;
}
