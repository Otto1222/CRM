/**
 * projekt.service.js
 * Projekt CRUD – minden projektművelet itt.
 */
import { PROJEKT_SCHEMA } from "./projekt.schema.js";
import { createBackup } from "../../lib/backupService.js";
import { driveSave } from "../../lib/driveApi.js";
const KEY = "projektek";
const COUNTER_KEY = "edi_projekt_sorszam_counter";
// ─── Alap CRUD ────────────────────────────────────────────────
export function loadProjektek() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
export function saveProjektek(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch("projektek");
  driveSave("projektek", { projektek: list }).catch(() => {});
}
export function getProjekt(id) {
  return loadProjektek().find(p => p.id === id) || null;
}
// ─── E.D.I. projektkód generálás ──────────────────────────────
export function nextProjektkod() {
  const n = parseInt(localStorage.getItem(COUNTER_KEY) || "0", 10) + 1;
  localStorage.setItem(COUNTER_KEY, String(n));
  driveSave("edi_projekt_sorszam_counter", { edi_projekt_sorszam_counter: n }).catch(() => {});
  return `E.D.I.${String(n).padStart(3, "0")}`;
}
export function formatProjektAzonosito(projektkod, kulsoAzonosito = "") {
  return kulsoAzonosito?.trim()
    ? `${projektkod} / ${kulsoAzonosito.trim()}`
    : projektkod;
}
// ─── Létrehozás ───────────────────────────────────────────────
export function createProjekt(data, createdBy = "") {
  createBackup("Projekt létrehozás előtt");
  const now = new Date().toISOString();
  const projekt = {
    ...PROJEKT_SCHEMA,
    ...data,
    id: `prj_${Date.now()}`,
    projektkod: data.projektkod || nextProjektkod(),
    kulsoAzonosito: data.kulsoAzonosito || "",
    munkalapIds: data.munkalapIds || [],
    createdAt: now,
    updatedAt: now,
    createdBy,
    esemenynaplo: [
      {
        id: `ev_${Date.now()}`,
        datum: now,
        user: createdBy,
        esemeny: "Projekt létrehozva",
        reszletek: `Státusz: ${data.status || PROJEKT_SCHEMA.status}`,
      },
    ],
  };
  saveProjektek([...loadProjektek(), projekt]);
  return projekt;
}
// ─── Frissítés ────────────────────────────────────────────────
export function updateProjekt(id, updates, user = "") {
  const list = loadProjektek();
  const idx = list.findIndex(p => p.id === id);
  if (idx < 0) return null;
  const old = list[idx];
  const now = new Date().toISOString();
  const naplobej = [];
  if (updates.status && updates.status !== old.status) {
    naplobej.push({
      id: `ev_${Date.now()}`,
      datum: now,
      user,
      esemeny: "Státusz változás",
      reszletek: `${old.status} → ${updates.status}`,
    });
  }
  if (updates.csapatNev && updates.csapatNev !== old.csapatNev) {
    naplobej.push({
      id: `ev_${Date.now() + 1}`,
      datum: now,
      user,
      esemeny: "Csapat módosítva",
      reszletek: `${old.csapatNev || "—"} → ${updates.csapatNev}`,
    });
  }
  const updated = {
    ...old,
    ...updates,
    updatedAt: now,
    esemenynaplo: [...(old.esemenynaplo || []), ...naplobej],
  };
  list[idx] = updated;
  saveProjektek(list);

  // Spec 12. pont: lezárásnál automatikus pillanatkép
  const lezaroStatuszok = ["Lezárva", "Leszámlázva", "Kifizetve"];
  if (updates.status && lezaroStatuszok.includes(updates.status) && !lezaroStatuszok.includes(old.status)) {
    try {
      import("../../lib/elszamolasPillanatkep.js").then(({ createPillanatkep }) => {
        const munkalapok = JSON.parse(localStorage.getItem("munkalapok") || "[]")
          .filter(m => m.projektId === id || (updated.munkalapIds || []).includes(m.id));
        createPillanatkep(updated, munkalapok);
      });
    } catch {}
  }

  return updated;
}
// ─── Törlés ───────────────────────────────────────────────────
export function deleteProjekt(id) {
  createBackup("Projekt törlés előtt");
  saveProjektek(loadProjektek().filter(p => p.id !== id));
}
// ─── Átmeneti kompatibilitás: munkalap hozzárendelés ───────────
// Hosszú távon a munkalap.projektId lesz az elsődleges kapcsolat.
// A projekt.munkalapIds csak átmeneti kompatibilitás miatt marad.
export function linkMunkalap(projektId, munkalapId) {
  const p = getProjekt(projektId);
  if (!p) return null;
  const currentIds = Array.isArray(p.munkalapIds) ? p.munkalapIds : [];
  if (!currentIds.includes(munkalapId)) {
    updateProjekt(projektId, {
      munkalapIds: [...currentIds, munkalapId],
    });
  }
  try {
    const mls = JSON.parse(localStorage.getItem("munkalapok") || "[]");
    const next = mls.map(m =>
      m.id === munkalapId
        ? {
            ...m,
            projektId,
            projektKod: p.projektkod,
          }
        : m
    );
    localStorage.setItem("munkalapok", JSON.stringify(next));
    dispatch("munkalapok");
  } catch {}
  return getProjekt(projektId);
}
export function unlinkMunkalap(projektId, munkalapId) {
  const p = getProjekt(projektId);
  if (!p) return null;
  const currentIds = Array.isArray(p.munkalapIds) ? p.munkalapIds : [];
  updateProjekt(projektId, {
    munkalapIds: currentIds.filter(id => id !== munkalapId),
  });
  try {
    const mls = JSON.parse(localStorage.getItem("munkalapok") || "[]");
    const next = mls.map(m =>
      m.id === munkalapId
        ? {
            ...m,
            projektId: "",
            projektKod: "",
          }
        : m
    );
    localStorage.setItem("munkalapok", JSON.stringify(next));
    dispatch("munkalapok");
  } catch {}
  return getProjekt(projektId);
}
// ─── Megjegyzés hozzáadás ─────────────────────────────────────
export function addMegjegyzes(projektId, szoveg, user = "") {
  const p = getProjekt(projektId);
  if (!p) return null;
  const bej = {
    id: `m_${Date.now()}`,
    datum: new Date().toISOString(),
    user,
    szoveg,
  };
  return updateProjekt(
    projektId,
    {
      megjegyzesek: [...(p.megjegyzesek || []), bej],
    },
    user
  );
}
// ─── Helper ───────────────────────────────────────────────────
function dispatch(collection) {
  window.dispatchEvent(
    new CustomEvent("crm-db-updated", {
      detail: { collection },
    })
  );
}