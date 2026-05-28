/**
 * projekt.service.js
 * Projekt CRUD – minden adatmúvelet itt, UI-ban nem
 */

import { PROJEKT_SCHEMA } from "./projekt.schema.js";
import { createBackup } from "../../lib/backupService.js";

const KEY = "projektek";
const COUNTER_KEY = "projekt_sorszam_counter";

// ─── Alap CRUD ────────────────────────────────────────────────

export function loadProjektek() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function saveProjektek(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch("projektek");
}

export function getProjekt(id) {
  return loadProjektek().find(p => p.id === id) || null;
}

// ─── Projektkód generálás ─────────────────────────────────────

export function nextProjektkod() {
  const n = (parseInt(localStorage.getItem(COUNTER_KEY) || "0") + 1);
  localStorage.setItem(COUNTER_KEY, String(n));
  return `PRJ-${new Date().getFullYear()}-${String(n).padStart(3, "0")}`;
}

// ─── Létrehozás ───────────────────────────────────────────────

export function createProjekt(data, createdBy = "") {
  createBackup("Projekt létrehozás előtt");
  const now = new Date().toISOString();
  const projekt = {
    ...PROJEKT_SCHEMA,
    ...data,
    id:          `prj_${Date.now()}`,
    projektkod:  data.projektkod || nextProjektkod(),
    createdAt:   now,
    updatedAt:   now,
    createdBy,
    esemenynaplo: [{
      id:        `ev_${Date.now()}`,
      datum:     now,
      user:      createdBy,
      esemeny:   "Projekt létrehozva",
      reszletek: `Státusz: ${data.status || PROJEKT_SCHEMA.status}`,
    }],
  };
  saveProjektek([...loadProjektek(), projekt]);
  return projekt;
}

// ─── Frissítés ────────────────────────────────────────────────

export function updateProjekt(id, updates, user = "") {
  const list = loadProjektek();
  const idx  = list.findIndex(p => p.id === id);
  if (idx < 0) return null;

  const old  = list[idx];
  const now  = new Date().toISOString();

  // Eseménynapló bejegyzés
  const naplobej = [];
  if (updates.status && updates.status !== old.status) {
    naplobej.push({
      id:        `ev_${Date.now()}`,
      datum:     now,
      user,
      esemeny:   "Státusz változás",
      reszletek: `${old.status} → ${updates.status}`,
    });
  }
  if (updates.csapatNev && updates.csapatNev !== old.csapatNev) {
    naplobej.push({
      id:        `ev_${Date.now() + 1}`,
      datum:     now,
      user,
      esemeny:   "Csapat módosítva",
      reszletek: `${old.csapatNev || "—"} → ${updates.csapatNev}`,
    });
  }

  const updated = {
    ...old,
    ...updates,
    updatedAt:   now,
    esemenynaplo: [...(old.esemenynaplo || []), ...naplobej],
  };
  list[idx] = updated;
  saveProjektek(list);
  return updated;
}

// ─── Törlés ───────────────────────────────────────────────────

export function deleteProjekt(id) {
  createBackup("Projekt törlés előtt");
  saveProjektek(loadProjektek().filter(p => p.id !== id));
}

// ─── Munkalap ↔ Projekt linkelés ─────────────────────────────

export function linkMunkalap(projektId, munkalapId) {
  const p = getProjekt(projektId);
  if (!p) return;
  if (p.munkalapIds.includes(munkalapId)) return;
  updateProjekt(projektId, { munkalapIds: [...p.munkalapIds, munkalapId] });
  // Munkalap oldalon is frissítjük a projektId-t
  try {
    const mls = JSON.parse(localStorage.getItem("munkalapok") || "[]");
    const next = mls.map(m => m.id === munkalapId ? { ...m, projektId } : m);
    localStorage.setItem("munkalapok", JSON.stringify(next));
    dispatch("munkalapok");
  } catch {}
}

export function unlinkMunkalap(projektId, munkalapId) {
  const p = getProjekt(projektId);
  if (!p) return;
  updateProjekt(projektId, { munkalapIds: p.munkalapIds.filter(id => id !== munkalapId) });
}

// ─── Megjegyzés hozzáadás ─────────────────────────────────────

export function addMegjegyzes(projektId, szoveg, user = "") {
  const p = getProjekt(projektId);
  if (!p) return;
  const bej = { id: `m_${Date.now()}`, datum: new Date().toISOString(), user, szoveg };
  updateProjekt(projektId, { megjegyzesek: [...(p.megjegyzesek || []), bej] }, user);
  return bej;
}

// ─── Helper ───────────────────────────────────────────────────

function dispatch(collection) {
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection } }));
}
