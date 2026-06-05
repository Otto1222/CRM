/**
 * penzugyi.service.js
 * Pénzügyi rekord CRUD + automatikus előkészítés.
 * Ne importálj ide workorder.service.js-t (circular import) –
 * a munkalapokat a hívó adja paraméterként.
 */
import { PENZUGYI_SCHEMA } from "./penzugyi.schema.js";
import { getBevetelTipus, calcProfit, defaultSzamlazasStatusz } from "../../lib/penzugyiRules.js";
import { calcProjektVegkalkulacio } from "../../services/financialCalculation.service.js";
import { driveSave } from "../../lib/driveApi.js";
import { loadProjektek } from "../projektek/projekt.service.js";

const KEY = "penzugyi";

function dispatch() {
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: KEY } }));
}

function notifySyncFailed() {
  window.dispatchEvent(new CustomEvent("crm-sync-warning", {
    detail: { message: "Pénzügyi rekord mentve helyileg, de nincs szinkronizálva." },
  }));
}

// ─── Betöltés ─────────────────────────────────────────────────

export function loadAllPenzugyi() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function getPenzugyi(projektId) {
  return loadAllPenzugyi().find(r => r.projektId === projektId) || null;
}

// ─── Mentés ───────────────────────────────────────────────────

export function saveAllPenzugyi(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch();
  driveSave(KEY, { [KEY]: list }).catch(() => notifySyncFailed());
}

// ─── Létrehozás / frissítés ───────────────────────────────────

export function upsertPenzugyi(data, user = "") {
  const all = loadAllPenzugyi();
  const idx = all.findIndex(r => r.projektId === data.projektId);
  const now = new Date().toISOString();

  const existing = idx >= 0 ? all[idx] : null;
  const record = {
    ...PENZUGYI_SCHEMA,
    ...(existing || {}),
    ...data,
    id:         existing?.id || `pnz_${Date.now()}`,
    createdAt:  existing?.createdAt || now,
    updatedAt:  now,
    createdBy:  existing?.createdBy || user,
    updatedBy:  user || existing?.updatedBy || "",
    version:    (existing?.version || 0) + 1,
    syncStatus: "synced",
  };

  // Profit újraszámítás ha változott bevétel vagy költség
  const koltseg = (
    (record.anyagKoltsegNetto || 0) +
    (record.sajatCsapatKoltsegNetto || 0) +
    (record.alvallalkozoKoltsegNetto || 0) +
    (record.kiszallasKoltsegNetto || 0) +
    (record.emeloKoltsegNetto || 0) +
    (record.egyebKoltsegNetto || 0)
  );
  record.osszesKoltsegNetto = koltseg;
  const { profitNetto, fedezetSzazalek } = calcProfit(record.bevetelNetto, koltseg);
  record.profitNetto      = profitNetto;
  record.fedezetSzazalek  = fedezetSzazalek;

  if (idx >= 0) {
    all[idx] = record;
  } else {
    all.push(record);
  }

  saveAllPenzugyi(all);
  return record;
}

export function deletePenzugyi(projektId) {
  saveAllPenzugyi(loadAllPenzugyi().filter(r => r.projektId !== projektId));
}

// ─── Automatikus előkészítés (trigger: minden munkalap lezárva) ──────
//
// Hívja a workorder.service.js, dinamikus importtal (nem importálja vissza).
// A munkalapokat paraméterként kapja – nincs circular import.

export function autoElszamolasElokeszites(projektId, munkalapok, user = "system") {
  const existing = getPenzugyi(projektId);

  // Ha már jóváhagyva vagy ellenőrzés alatt → ne írja felül
  if (existing && ["Jóváhagyva", "Ellenőrzés alatt"].includes(existing.elszamolasStatusz)) {
    return existing;
  }

  const projektek = loadProjektek();
  const projekt = projektek.find(p => p.id === projektId);
  if (!projekt) return null;

  // Meglévő kalkuláció a financialCalculation.service.js-ből
  let kalk = {};
  try {
    kalk = calcProjektVegkalkulacio(projekt, munkalapok) || {};
  } catch { /* folytatás alapértékekkel */ }

  const forrás = projekt.forrás;
  const bevetelTipus = getBevetelTipus(forrás);

  // Bevétel forrás szerint
  let bevetelNetto = 0;
  if (forrás === "sajat_ajanlat") {
    bevetelNetto = projekt.elfogadottAjanlat || kalk.nettoBevitel || 0;
  } else if (forrás === "fovallalkozoi_munka") {
    bevetelNetto = kalk.nettoBevitel || 0;
  }
  // belso_munka: bevetelNetto = 0

  const szamlazasStatusz = existing?.szamlazasStatusz || defaultSzamlazasStatusz(forrás);

  return upsertPenzugyi({
    projektId,
    projektForras:            forrás,
    bevetelTipus,
    bevetelNetto,
    anyagKoltsegNetto:        kalk.anyagkoltság || kalk.anyagkoltség || 0,
    sajatCsapatKoltsegNetto:  kalk.csapatBer    || 0,
    alvallalkozoKoltsegNetto: kalk.alvallalkozoiBer || 0,
    kiszallasKoltsegNetto:    kalk.utikoltség   || kalk.utikoltség  || 0,
    emeloKoltsegNetto:        kalk.emelőgepKoltseg || 0,
    egyebKoltsegNetto:        kalk.egyebKoltseg || 0,
    // Státusz: ha volt már rekord, csak ha "Nincs előkészítve" frissítjük
    elszamolasStatusz: existing?.elszamolasStatusz === "Nincs előkészítve" || !existing
      ? "Előkészítve"
      : existing.elszamolasStatusz,
    szamlazasStatusz,
    tigStatusz: existing?.tigStatusz || "Nem szükséges",
    elszamolasNotes: existing?.elszamolasNotes || "",
    tigNotes:        existing?.tigNotes || "",
  }, user);
}

// ─── Dashboard KPI számítás ───────────────────────────────────

export function calcDashboardPenzugyiKpik(projektek) {
  const penzugyik = loadAllPenzugyi();

  // Segédfüggvény: projekt + penzügyi rekord összekapcsolása
  function enrich(p) {
    return { ...p, _penzugyi: penzugyik.find(r => r.projektId === p.id) || null };
  }

  const enriched = projektek.map(enrich);

  return {
    // Készre jelentett, de elszámolás nincs előkészítve → piros figyelmeztetés
    keszreJelentettElszamolasNelkul: enriched.filter(p =>
      p.status === "Készre jelentve" &&
      (!p._penzugyi || p._penzugyi.elszamolasStatusz === "Nincs előkészítve")
    ).length,

    // Számlázható projektek (projekt státusz = Számlázható)
    szamlazhatoProjektek: enriched.filter(p => p.status === "Számlázható"),

    // Számlázva, de nem kifizetett
    szamlazvaKifizetesre: enriched.filter(p =>
      p._penzugyi?.szamlazasStatusz === "Számlázva"
    ),

    // FV várható bevétel (fovallalkozoi_munka, nem lezárt)
    fovVarhatoBevetel: enriched
      .filter(p => p.forrás === "fovallalkozoi_munka" && p.status !== "Lezárt")
      .reduce((s, p) => s + (p._penzugyi?.bevetelNetto || 0), 0),

    // Saját projektek várható profitja (sajat_ajanlat, nem lezárt)
    sajatVarhatoProfit: enriched
      .filter(p => p.forrás === "sajat_ajanlat" && p.status !== "Lezárt")
      .reduce((s, p) => s + (p._penzugyi?.profitNetto || 0), 0),

    // Belső munkák költsége (belso_munka)
    belsoMunkaKoltseg: enriched
      .filter(p => p.forrás === "belso_munka")
      .reduce((s, p) => s + (p._penzugyi?.osszesKoltsegNetto || 0), 0),
  };
}
