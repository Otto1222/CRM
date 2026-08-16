/**
 * dijtabla.service.js – CRUD a fővállalkozói díjtételekhez (tételes díjtábla).
 *
 * Tárolás: localStorage["fovallalkozo_dijtetelek"] – lapos lista, minden
 * tétel `fovallalkozoId`-vel. Ugyanaz a minta, mint az elszamolasi_szabalyok.
 */

import { DIJTETEL_SCHEMA, GREEN_HOME_DIJTABLA } from "./dijtabla.schema.js";
import { createBackup } from "../../lib/backupService.js";

const KEY = "fovallalkozo_dijtetelek";

const dispatch = () =>
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: KEY } }));

// ─── Betöltés / mentés ────────────────────────────────────────
export function loadDijtetelek() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function saveDijtetelek(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    dispatch();
    return true;
  } catch (e) {
    console.error("[dijtabla save FAILED]", e);
    try {
      const quota = e && (e.name === "QuotaExceededError" || e.code === 22 || e.code === 1014);
      window.dispatchEvent(new CustomEvent("crm-storage-error", {
        detail: { key: KEY, type: quota ? "quota" : "error", message: e?.message },
      }));
    } catch {}
    return false;
  }
}

export function getDijtetelekByFovallalkozo(fovallalkozoId) {
  return loadDijtetelek().filter(t => t.fovallalkozoId === fovallalkozoId);
}

export function getAktivDijtetelek(fovallalkozoId) {
  return getDijtetelekByFovallalkozo(fovallalkozoId).filter(t => t.aktiv !== false);
}

// ─── CRUD ─────────────────────────────────────────────────────
let _seq = 0;
function newId() {
  _seq += 1;
  return `dt_${Date.now()}_${_seq}`;
}

export function createDijtetel(fovallalkozoId, data) {
  const item = {
    ...DIJTETEL_SCHEMA, ...data,
    id: newId(),
    fovallalkozoId,
    createdAt: new Date().toISOString(),
  };
  saveDijtetelek([...loadDijtetelek(), item]);
  return item;
}

export function updateDijtetel(id, updates) {
  const list = loadDijtetelek();
  const next = list.map(t => t.id === id ? { ...t, ...updates } : t);
  saveDijtetelek(next);
  return next.find(t => t.id === id);
}

export function deleteDijtetel(id) {
  saveDijtetelek(loadDijtetelek().filter(t => t.id !== id));
}

export function deleteDijtetelekByFovallalkozo(fovallalkozoId) {
  saveDijtetelek(loadDijtetelek().filter(t => t.fovallalkozoId !== fovallalkozoId));
}

/**
 * Tömeges beszúrás – importhoz (Excel/CSV, Fázis 2) és seedhez.
 * A meglévő tételeket nem törli; az új sorokat hozzáfűzi.
 */
export function bulkImportDijtetelek(fovallalkozoId, rows, forras = "import") {
  createBackup("Díjtábla import előtt");
  const stamp = new Date().toISOString();
  const list = loadDijtetelek();
  const ujak = (rows || []).map((r, i) => ({
    ...DIJTETEL_SCHEMA, ...r,
    id: `dt_${Date.now()}_${i}`,
    fovallalkozoId,
    forras,
    createdAt: stamp,
  }));
  saveDijtetelek([...list, ...ujak]);
  return ujak.length;
}

/**
 * Green Home díjtábla betöltése egy fővállalkozóhoz (seed gomb a UI-n).
 * Csak akkor tölt, ha ehhez a fővállalkozóhoz még nincs tétel – így nem
 * duplikál. A `force` felülírja ezt (előbb törli a fővállalkozó tételeit).
 */
export function seedGreenHomeDijtabla(fovallalkozoId, { force = false } = {}) {
  const meglevo = getDijtetelekByFovallalkozo(fovallalkozoId);
  if (meglevo.length > 0 && !force) return 0;
  if (force && meglevo.length > 0) {
    saveDijtetelek(loadDijtetelek().filter(t => t.fovallalkozoId !== fovallalkozoId));
  }
  return bulkImportDijtetelek(fovallalkozoId, GREEN_HOME_DIJTABLA, "seed");
}
