import { loadLocal, saveLocal, addItem, removeItem, updateItem } from "../../lib/localDb.js";

const KEY = "ajanlatok";
const COUNTER_KEY = "edi_ajanlat_sorszam_counter";

// ─── Dátum segéd ──────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Ajánlat alapértelmezett érvényesség: mai nap + 30 nap */
export function defaultErvenyesseg() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ─── Validáció ────────────────────────────────────────────────

/**
 * Érvényességi dátum validáció – YYYY-MM-DD string összehasonlítás, timezone-mentes.
 * @returns {{ ok: boolean, error: string|null }}
 */
export function validateAjanlatDatum(data) {
  if (!data.ervenyesseg) return { ok: true, error: null };
  if (data.ervenyesseg < todayStr()) {
    return {
      ok: false,
      error: "Az ajánlat érvényességi dátuma nem lehet korábbi, mint a mai nap.",
    };
  }
  return { ok: true, error: null };
}

// ─── Sorszám ──────────────────────────────────────────────────

function nextAjanlatkod() {
  const year = new Date().getFullYear();
  const raw   = loadLocal(COUNTER_KEY) || {};
  const count = (raw[year] || 0) + 1;
  saveLocal(COUNTER_KEY, { ...raw, [year]: count });
  return `AJA-${year}-${String(count).padStart(3, "0")}`;
}

// ─── CRUD ─────────────────────────────────────────────────────

export function loadAjanlatok() {
  return loadLocal(KEY) || [];
}

export function createAjanlat(data, user) {
  const v = validateAjanlatDatum(data);
  if (!v.ok) throw new Error(v.error);

  const item = {
    ...data,
    id:          crypto.randomUUID(),
    ajanlatkod:  data.ajanlatkod || nextAjanlatkod(),
    keszitette:  user?.name || "",
    createdAt:   new Date().toISOString().slice(0, 10),
    updatedAt:   new Date().toISOString().slice(0, 10),
  };
  addItem(KEY, item);
  return item;
}

export function updateAjanlat(id, updates) {
  if (updates.ervenyesseg !== undefined) {
    const v = validateAjanlatDatum(updates);
    if (!v.ok) throw new Error(v.error);
  }
  return updateItem(KEY, id, { ...updates, updatedAt: new Date().toISOString().slice(0, 10) });
}

export function deleteAjanlat(id) {
  return removeItem(KEY, id);
}