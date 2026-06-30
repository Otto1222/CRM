/**
 * projekt.service.js
 * Projekt CRUD – minden projektművelet itt.
 */
import { PROJEKT_SCHEMA } from "./projekt.schema.js";
import { migrateProjektStatus, migrateProjektForrasFromRekord, migrateAnyagelszamolasiMod } from "../../lib/workflowRules.js";
import { createBackup } from "../../lib/backupService.js";
import { driveSave } from "../../lib/driveApi.js";
import { loadLocal, saveLocal } from "../../lib/localDb.js";
import { createKivitelezesiCsomagForProjekt } from "../kivitelezesi_csomag/kivitelezesiCsomag.service.js";

const KEY         = "projektek";
const COUNTER_KEY = "edi_projekt_sorszam_counter";

// ─── Dátum validáció ──────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Tervezett kezdés validáció – YYYY-MM-DD string összehasonlítás, timezone-mentes.
 * @returns {{ ok: boolean, error: string|null }}
 */
export function validateProjektDatum(data) {
  if (!data.tervezettKezdes) return { ok: true, error: null };
  if (data.tervezettKezdes < todayStr()) {
    return {
      ok:    false,
      error: "A projekt tervezett kezdése nem lehet korábbi, mint a mai nap.",
    };
  }
  return { ok: true, error: null };
}

// ─── Szinkron figyelmeztetés ──────────────────────────────────────────────

function notifySyncFailed() {
  window.dispatchEvent(new CustomEvent("crm-sync-warning", {
    detail: { message: "Mentve helyileg, de nincs szinkronizálva." },
  }));
}

// ─── Backward compat migráció ─────────────────────────────────────────────

function migrateProjekt(p) {
  const ms = migrateProjektStatus(p.status);
  // Okos forrás-migráció: garanciális/javítási esetén a rekord adatai döntenek
  const mf = migrateProjektForrasFromRekord(p);
  // D1: anyagelszámolási mód migráció – nincs automatikus default,
  // a régi rekordok NINCS_KIVALASZTVA + adminReviewRequired jelzést kapnak
  const am = migrateAnyagelszamolasiMod(p);
  // Fázis 4A: régi projekteknél a pillanatkép mező hiányzik – csak a mező
  // jelenlétét pótoljuk (null), a mögöttes tartalmat SOSEM állítjuk vissza
  // utólag (a pillanatkép kizárólag az ajánlatból induló létrehozáskor készül).
  const hasPillanatkep = Object.prototype.hasOwnProperty.call(p, "elfogadottAjanlatPillanatkep");
  const pillanatkep = hasPillanatkep ? p.elfogadottAjanlatPillanatkep : null;
  if (ms === p.status && mf === p.forrás
    && am.anyagelszamolasiMod === p.anyagelszamolasiMod
    && am.adminReviewRequired === !!p.adminReviewRequired
    && hasPillanatkep) return p;
  return { ...p, status: ms, forrás: mf, ...am, elfogadottAjanlatPillanatkep: pillanatkep };
}

// ─── CRUD ─────────────────────────────────────────────────────────────────

export function loadProjektek() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return raw.map(migrateProjekt);
  } catch {
    return [];
  }
}

export function saveProjektek(list) {
  // Megerősített helyi mentés: quota/sérülés esetén false + hibasáv (localDb.saveLocal)
  if (!saveLocal("projektek", list)) return false;
  dispatch("projektek");
  driveSave("projektek", { projektek: list })
    .then(res => { if (res && !res.ok && !res.offline) notifySyncFailed(); })
    .catch(() => notifySyncFailed());
  return true;
}

export function getProjekt(id) {
  return loadProjektek().find(p => p.id === id) || null;
}

// ─── Projektkód generálás ─────────────────────────────────────────────────

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

// ─── Létrehozás ───────────────────────────────────────────────────────────

export function createProjekt(data, createdBy = "") {
  const _dv = validateProjektDatum(data);
  if (!_dv.ok) throw new Error(_dv.error);

  createBackup("Projekt létrehozás előtt");
  const now = new Date().toISOString();
  const projekt = {
    ...PROJEKT_SCHEMA,
    ...data,
    id:             `prj_${crypto.randomUUID()}`,
    projektkod:     data.projektkod || nextProjektkod(),
    kulsoAzonosito: data.kulsoAzonosito || "",
    munkalapIds:    data.munkalapIds || [],
    createdAt:      now,
    updatedAt:      now,
    createdBy,
    updatedBy:      createdBy,
    version:        1,
    syncStatus:     "synced",
    esemenynaplo: [
      {
        id: `ev_${crypto.randomUUID()}`,
        datum: now,
        user: createdBy,
        esemeny: "Projekt létrehozva",
        reszletek: `Forrás: ${data.forrás || "—"} | Státusz: ${data.status || PROJEKT_SCHEMA.status}`,
      },
    ],
  };
  saveProjektek([...loadProjektek(), projekt]);

  // Saját ajánlat projekteknél automatikusan létrehozza a Kivitelezési Csomagot.
  // Hiba esetén console.warn, a projekt létrehozása nem vész el.
  if (data.forrás === "sajat_ajanlat") {
    try {
      createKivitelezesiCsomagForProjekt(
        projekt,
        data.elfogadottAjanlatPillanatkep || null,
        createdBy
      );
    } catch (e) {
      console.warn("[createProjekt] Kivitelezési Csomag auto-létrehozás sikertelen:", e?.message || e);
    }
  }

  return projekt;
}

// ─── Frissítés ────────────────────────────────────────────────────────────

export function updateProjekt(id, updates, user = "") {
  if (updates.tervezettKezdes !== undefined) {
    const _dv = validateProjektDatum(updates);
    if (!_dv.ok) throw new Error(_dv.error);
  }

  const list = loadProjektek();
  const idx  = list.findIndex(p => p.id === id);
  if (idx < 0) return null;

  const old = list[idx];
  const now = new Date().toISOString();
  const naplobej = [];

  if (updates.status && updates.status !== old.status) {
    naplobej.push({
      id: `ev_${crypto.randomUUID()}`,
      datum: now,
      user,
      esemeny: "Státusz változás",
      reszletek: `${old.status} → ${updates.status}`,
    });
  }

  if (updates.csapatNev && updates.csapatNev !== old.csapatNev) {
    naplobej.push({
      id: `ev_${crypto.randomUUID()}`,
      datum: now,
      user,
      esemeny: "Csapat módosítva",
      reszletek: `${old.csapatNev || "—"} → ${updates.csapatNev}`,
    });
  }

  const updated = {
    ...old,
    ...updates,
    updatedAt:    now,
    updatedBy:    user || old.updatedBy,
    version:      (old.version || 0) + 1,
    syncStatus:   "synced",
    esemenynaplo: [...(old.esemenynaplo || []), ...naplobej],
  };

  list[idx] = updated;
  saveProjektek(list);

  // Lezárásnál automatikus pénzügyi pillanatkép
  const lezaroStatuszok = ["Lezárt", "Számlázható"];
  if (updates.status && lezaroStatuszok.includes(updates.status) && !lezaroStatuszok.includes(old.status)) {
    try {
      import("../../lib/elszamolasPillanatkep.js").then(({ createPillanatkep }) => {
        const munkalapok = JSON.parse(localStorage.getItem("munkalapok") || "[]")
          .filter(m => m.projektId === id || (updated.munkalapIds || []).includes(m.id));
        createPillanatkep(updated, munkalapok);
      });
    } catch { /* non-critical */ }
  }

  return updated;
}

// ─── Törlés ───────────────────────────────────────────────────────────────

export function deleteProjekt(id) {
  createBackup("Projekt törlés előtt");
  saveProjektek(loadProjektek().filter(p => p.id !== id));

  // ─── Cascade takarítás (A8): ne maradjon árva referencia / rekord ───
  // Dinamikus import a körkörös függőség elkerülésére; try/catch, hogy a
  // takarítás soha ne törje el magát a törlést. Mindegyik a saját service
  // mentőjén megy át (local + Drive), így a következő szinkron sem hozza vissza.

  // 1. Gyerek munkalapok projektId/projektKod nullázása
  try {
    const mls = loadLocal("munkalapok") || [];
    if (mls.some(m => m.projektId === id)) {
      import("../../services/workorder.service.js").then(m => {
        const list = m.loadWorkorders()
          .map(w => w.projektId === id ? { ...w, projektId: "", projektKod: "" } : w);
        m.saveWorkorders(list);
      }).catch(() => {});
    }
  } catch { /* non-critical */ }

  // 2. Pénzügyi rekord törlése
  import("../penzugy/penzugyi.service.js")
    .then(m => m.deletePenzugyi(id)).catch(() => {});

  // 3. Kivitelezési csomag törlése
  import("../kivitelezesi_csomag/kivitelezesiCsomag.service.js").then(m => {
    if (m.loadKivitelezesiCsomagok && m.saveKivitelezesiCsomagok) {
      const next = m.loadKivitelezesiCsomagok().filter(k => k.projektId !== id);
      m.saveKivitelezesiCsomagok(next);
    }
  }).catch(() => {});
}

// ─── Munkalap kapcsolás ───────────────────────────────────────────────────

export function linkMunkalap(projektId, munkalapId) {
  const p = getProjekt(projektId);
  if (!p) return null;
  const currentIds = Array.isArray(p.munkalapIds) ? p.munkalapIds : [];
  if (!currentIds.includes(munkalapId)) {
    updateProjekt(projektId, { munkalapIds: [...currentIds, munkalapId] });
  }
  try {
    const mls  = JSON.parse(localStorage.getItem("munkalapok") || "[]");
    const next = mls.map(m => m.id === munkalapId ? { ...m, projektId, projektKod: p.projektkod } : m);
    localStorage.setItem("munkalapok", JSON.stringify(next));
    dispatch("munkalapok");
  } catch { /* ok */ }
  return getProjekt(projektId);
}

export function unlinkMunkalap(projektId, munkalapId) {
  const p = getProjekt(projektId);
  if (!p) return null;
  updateProjekt(projektId, {
    munkalapIds: (p.munkalapIds || []).filter(id => id !== munkalapId),
  });
  try {
    const mls  = JSON.parse(localStorage.getItem("munkalapok") || "[]");
    const next = mls.map(m => m.id === munkalapId ? { ...m, projektId: "", projektKod: "" } : m);
    localStorage.setItem("munkalapok", JSON.stringify(next));
    dispatch("munkalapok");
  } catch { /* ok */ }
  return getProjekt(projektId);
}

// ─── Megjegyzés ───────────────────────────────────────────────────────────

export function addMegjegyzes(projektId, szoveg, user = "") {
  const p = getProjekt(projektId);
  if (!p) return null;
  const bej = { id: `m_${crypto.randomUUID()}`, datum: new Date().toISOString(), user, szoveg };
  return updateProjekt(projektId, { megjegyzesek: [...(p.megjegyzesek || []), bej] }, user);
}

// ─── Helper ───────────────────────────────────────────────────────────────

function dispatch(collection) {
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection } }));
}