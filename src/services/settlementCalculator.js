/**
 * settlementCalculator.js
 * Központi elszámolási modul – egyetlen igazságforrás.
 *
 * Minden kalkuláció innen indul, ne közvetlenül az elszamolasiMotor-ból.
 * Kezeli: projekt szintű előkalkuláció + munkalap szintű tényleges elszámolás.
 *
 * Adatforrások:
 *   - FV szabályok:  localStorage["elszamolasi_szabalyok"]
 *   - AV szabályok:  localStorage["av_szabalyok"]
 *   - Elszámolás snapshot: munkalap.elszamolas (benne van a munkalapban)
 */

import {
  findEgyezoSzabalyok, calcSzabalyOsszeg,
  ELSZAMOLASI_MODOK, szabalyLeiras,
} from "../modules/fovallalkozok/elszamolasiMotor.js";
import { loadSzabalyok } from "../modules/fovallalkozok/fovallalkozo.service.js";
import { loadAvSzabalyok, calcCsapatAlvallalkozoiBer, getCsapat } from "../modules/csapatok/csapat.service.js";
import { loadFovallalkozok } from "../modules/fovallalkozok/fovallalkozo.service.js";
import { loadKarteritesek } from "../lib/karterites.js";
import { updateItem } from "../lib/localDb.js";

// ─── Típus: ElszamolasInput ───────────────────────────────────
/**
 * @typedef {Object} ElszamolasInput
 * @property {string} fovallalkoziId
 * @property {string} munkatipus
 * @property {string} [csapatId]
 * @property {number} [panelDb]        – napelem db (fő mennyiség a számításhoz)
 * @property {number} [inverterDb]
 * @property {number} [akkumulatorDb]
 * @property {number} [smartMeterDb]
 * @property {number} [tavKm]          – egyirányú km
 * @property {number} [anyagkoltság]   – kézi anyagköltség
 */

// ─── Segéd: input összeállítása ───────────────────────────────

export function buildInput(source) {
  return {
    darabszam:  Number(source.panelDb || source.darabszam || source.napelemDb) || 0,
    tavKm:      Number(source.tavKm)   || 0,
    inverterDb: Number(source.inverterDb) || 0,
    akkDb:      Number(source.akkumulatorDb || (source.akkumulator ? 1 : 0)) || 0,
    smartMeterDb: Number(source.smartMeterDb || (source.okosmerő ? 1 : 0)) || 0,
  };
}

// ─── Fővállalkozói bevétel tételek ───────────────────────────

function buildBeveteliTetelek(fovallalkoziId, munkatipus, input) {
  const fvSzabalyok = loadSzabalyok();
  const egyezoFv   = findEgyezoSzabalyok(fovallalkoziId, munkatipus, fvSzabalyok);

  return egyezoFv.map(sz => {
    const autoNetto = calcSzabalyOsszeg(sz, input);
    const modLabel  = ELSZAMOLASI_MODOK.find(m => m.id === sz.mod)?.label || sz.mod || "?";
    return {
      szabalyId:   sz.id,
      megnevezes:  `${sz.munkatipus || "Általános"} – ${modLabel}`,
      mod:         sz.mod,
      autoNetto,
      hasznalandoNetto: autoNetto,
      megjegyzes:  szabalyLeiras(sz),
      felulirva:   false,
      hiany:       autoNetto === 0 && sz.mod === "savos",
    };
  });
}

// ─── Alvállalkozói bér ────────────────────────────────────────

function calcAvBer(csapatId, munkatipus, input, nettoBevitel = 0) {
  if (!csapatId) return { osszeg: 0, megjegyzes: "" };

  const avSzabalyok = loadAvSzabalyok();
  const egyezoAv    = findEgyezoSzabalyok(csapatId, munkatipus, avSzabalyok);

  if (egyezoAv.length > 0) {
    const osszeg = egyezoAv.reduce((s, sz) => s + calcSzabalyOsszeg(sz, input), 0);
    return { osszeg, megjegyzes: egyezoAv.map(szabalyLeiras).join(" + ") };
  }

  // Backward compat: régi dijTipus/dijOsszeg rendszer
  const csapat = getCsapat(csapatId);
  if (csapat?.elszamolasAktiv) {
    return calcCsapatAlvallalkozoiBer(csapat, {
      nettoBevitel,
      munkanapok:    1,
      csapatLetszam: 1,
      darabszam:     input.darabszam || 1,
    });
  }

  return { osszeg: 0, megjegyzes: "" };
}

// ─── FV névkeresés ────────────────────────────────────────────

function getFvNev(fovallalkoziId) {
  return loadFovallalkozok().find(f => f.id === fovallalkoziId)?.nev || null;
}

// ─── PROJEKT SZINTŰ KALKULÁCIÓ ────────────────────────────────

/**
 * Projekt előkalkuláció – szabályok + projekt.penzugy adatai alapján.
 * Munkalapok nélkül is működik.
 *
 * @param {object} projekt
 * @param {object[]} [munkalapok]
 * @returns {object}
 */
export function calcProjektElszamolas(projekt, munkalapok = []) {
  const penzugy = projekt?.penzugy || {};
  const {
    fovallalkoziId, munkatipus,
    felultBevitel,
    keziCsapatBer, keziUtikoltség, keziAnyagkoltság, keziKartérités,
    emelőgepKoltseg = 0, daruKoltseg = 0, szallasKoltseg = 0,
    bereltEszkozKoltseg = 0, irodaAdminKoltseg = 0, egyebKoltseg = 0,
  } = penzugy;

  const csapatId = penzugy.csapatId || projekt.csapatId || "";

  // Input összeállítása a projekt adataiból
  const input = buildInput({
    panelDb:       penzugy.darabszam || projekt.napelemDb || 0,
    inverterDb:    projekt.inverterDb || 0,
    akkumulatorDb: projekt.akkumulatorDb || (projekt.akkumulator ? 1 : 0),
    smartMeterDb:  projekt.smartMeterDb  || (projekt.okosmerő  ? 1 : 0),
    tavKm:         penzugy.tavKm || 0,
  });

  // FV bevétel
  const beveteliTetelek = buildBeveteliTetelek(fovallalkoziId, munkatipus, input);
  const autoBevitel = beveteliTetelek.reduce((s, t) => s + t.autoNetto, 0);
  const nettoBevitel = felultBevitel !== null && felultBevitel !== undefined
    ? Number(felultBevitel) : autoBevitel;

  // AV bér
  const avBerResult    = calcAvBer(csapatId, munkatipus, input, nettoBevitel);
  const alvallalkozoiBer = avBerResult.osszeg;

  // Kézi csapat bér (FV oldal – ha be van állítva)
  const csapatBer = keziCsapatBer !== null && keziCsapatBer !== undefined
    ? Number(keziCsapatBer) : 0;

  // Útiköltség
  const utikoltség = keziUtikoltség !== null && keziUtikoltség !== undefined
    ? Number(keziUtikoltség) : 0;

  // Anyagköltség: kézi override, vagy munkalapokból összegzés
  let anyagkoltság = 0;
  if (keziAnyagkoltság !== null && keziAnyagkoltság !== undefined) {
    anyagkoltság = Number(keziAnyagkoltság);
  } else {
    anyagkoltság = munkalapok.reduce((s, m) => {
      const e = m.elszamolas;
      return s + (e?.anyagkoltság || 0);
    }, 0);
  }

  // Kártérítés
  const kt = loadKarteritesek();
  let kartérités = kt
    .filter(k => (k.projektId === projekt.id || (projekt.munkalapIds||[]).includes(k.munkalapId)) && k.elfogadott)
    .reduce((s, k) => s + (k.osszeg || 0), 0);
  if (keziKartérités !== null && keziKartérités !== undefined) kartérités = Number(keziKartérités);

  const fixKoltsegek = [emelőgepKoltseg, daruKoltseg, szallasKoltseg, bereltEszkozKoltseg, irodaAdminKoltseg, egyebKoltseg]
    .reduce((s, v) => s + (Number(v) || 0), 0);

  const osszesKolts = csapatBer + alvallalkozoiBer + utikoltség + anyagkoltság + fixKoltsegek + kartérités;
  const haszon      = nettoBevitel - osszesKolts;
  const haszonPct   = nettoBevitel > 0 ? Math.round((haszon / nettoBevitel) * 100) : null;

  // Eltérés jelzés
  const elteresek = [];
  if (felultBevitel !== null && felultBevitel !== undefined) elteresek.push("bevétel");
  if (keziCsapatBer !== null && keziCsapatBer !== undefined) elteresek.push("csapatBér");
  if (keziUtikoltség !== null && keziUtikoltség !== undefined) elteresek.push("útiköltség");
  if (keziAnyagkoltság !== null && keziAnyagkoltság !== undefined) elteresek.push("anyagköltség");
  if (keziKartérités !== null && keziKartérités !== undefined) elteresek.push("kártérítés");

  return {
    // Meta
    projektId: projekt.id,
    fovallalkoNev: getFvNev(fovallalkoziId),
    munkatipus,
    csapatId,
    // Inputs
    inputs: input,
    // Bevétel
    autoBevitel, nettoBevitel,
    bruttoBevitel: Math.round(nettoBevitel * 1.27),
    beveteliTetelek,
    // Költségek
    csapatBer, alvallalkozoiBer,
    alvallalkozoiBerMj: avBerResult.megjegyzes,
    utikoltség, anyagkoltság, kartérités,
    emelőgepKoltseg: Number(emelőgepKoltseg || 0),
    daruKoltseg:     Number(daruKoltseg     || 0),
    szallasKoltseg:  Number(szallasKoltseg  || 0),
    bereltEszkozKoltseg: Number(bereltEszkozKoltseg || 0),
    irodaAdminKoltseg:   Number(irodaAdminKoltseg   || 0),
    egyebKoltseg:    Number(egyebKoltseg    || 0),
    fixKoltsegek,
    osszesKolts,
    // Eredmény
    haszon, haszonPct,
    nyereseg: haszon >= 0,
    // Ellenőrzés
    elteresek, elteres: elteresek.length > 0,
    hianyosTetelek: beveteliTetelek.filter(t => t.hiany).map(t => t.megnevezes),
  };
}

// ─── MUNKALAP SZINTŰ KALKULÁCIÓ ──────────────────────────────

/**
 * Egyedi munkalap elszámolása – tényleges adatok alapján.
 * Lezáráskor hívjuk, az eredményt a munkalapra mentjük.
 *
 * @param {object} munkalap   – munkalap objektum (tényleges adatokkal)
 * @param {object} [projekt]  – szülő projekt (FV adatokhoz)
 * @returns {object}
 */
export function calcMunkalapElszamolas(munkalap, projekt) {
  // FV adatok: munkalapból, vagy projekttől örökölve
  const fovallalkoziId = munkalap.fovallalkoziId || projekt?.penzugy?.fovallalkoziId || "";
  const munkatipus     = munkalap.munkatipus     || projekt?.penzugy?.munkatipus || munkalap.tipus || "";
  const csapatId       = munkalap.csapatId       || munkalap.assigneeId || "";

  // Tényleges mennyiségek (prioritás: munkalap.elszamolasAdatok, majd munkalap direkten, majd projekt)
  const ea = munkalap.elszamolasAdatok || {};
  const input = buildInput({
    panelDb:       ea.panelDb       || munkalap.panelDb       || projekt?.napelemDb    || 0,
    inverterDb:    ea.inverterDb    || munkalap.inverterDb    || projekt?.inverterDb   || 0,
    akkumulatorDb: ea.akkumulatorDb || munkalap.akkumulatorDb || projekt?.akkumulatorDb|| 0,
    smartMeterDb:  ea.smartMeterDb  || munkalap.smartMeterDb  || projekt?.smartMeterDb || 0,
    tavKm:         ea.tavKm         || munkalap.tavKm         || projekt?.penzugy?.tavKm || 0,
  });

  const anyagkoltság = Number(ea.anyagkoltság || munkalap.anyagkoltság || 0);

  // FV bevétel
  const beveteliTetelek = buildBeveteliTetelek(fovallalkoziId, munkatipus, input);
  const bevitel = beveteliTetelek.reduce((s, t) => s + t.autoNetto, 0);

  // AV bér
  const avBerResult     = calcAvBer(csapatId, munkatipus, input, bevitel);
  const alvallalkozoiBer = avBerResult.osszeg;

  const osszesKolts = alvallalkozoiBer + anyagkoltság;
  const haszon      = bevitel - osszesKolts;
  const haszonPct   = bevitel > 0 ? Math.round((haszon / bevitel) * 100) : null;

  // Szabály pillanatkép (audithoz)
  const fvSzabalyok = loadSzabalyok();
  const avSzabalyok = loadAvSzabalyok();

  return {
    munkalapId:    munkalap.id,
    projektId:     munkalap.projektId || "",
    kiszamoltAt:   new Date().toISOString(),
    fovallalkoNev: getFvNev(fovallalkoziId),
    fovallalkoziId, munkatipus, csapatId,
    // Inputok
    inputs:        { ...input, anyagkoltság },
    // Bevétel
    bevitel, beveteliTetelek,
    // Költségek
    alvallalkozoiBer,
    alvallalkozoiBerMj: avBerResult.megjegyzes,
    anyagkoltság,
    osszesKolts,
    // Eredmény
    haszon, haszonPct,
    // Audit: szabály pillanatképek
    fvSzabalySnapshots: findEgyezoSzabalyok(fovallalkoziId, munkatipus, fvSzabalyok)
      .map(sz => ({ id: sz.id, mod: sz.mod, munkatipus: sz.munkatipus, leiras: szabalyLeiras(sz) })),
    avSzabalySnapshots: findEgyezoSzabalyok(csapatId, munkatipus, avSzabalyok)
      .map(sz => ({ id: sz.id, mod: sz.mod, leiras: szabalyLeiras(sz) })),
  };
}

// ─── ELSZÁMOLÁS MENTÉSE MUNKALAPRA ───────────────────────────

/**
 * Munkalap elszámolás mentése (lezáráskor).
 * Beleírja a munkalap.elszamolas mezőbe.
 */
export function saveMunkalapElszamolas(munkalapId, elszamolas) {
  try {
    updateItem("munkalapok", munkalapId, { elszamolas });
  } catch (e) {
    console.warn("[settlementCalculator] saveMunkalapElszamolas hiba:", e);
  }
}

// ─── PROJEKT ÖSSZESÍTŐ (projekt + összes munkalap bontással) ──

/**
 * Projekt szintű összesítő – projekt kalkuláció + munkalap bontás.
 */
export function calcProjektOsszesites(projekt, munkalapok = []) {
  const projektKalk = calcProjektElszamolas(projekt, munkalapok);

  const mlAdatok = munkalapok.map(m => {
    const mentett = m.elszamolas;
    if (mentett) return { ...mentett, _mentett: true };
    return { ...calcMunkalapElszamolas(m, projekt), _mentett: false };
  });

  const mlBevitelOssz = mlAdatok.reduce((s, e) => s + (e.bevitel || 0), 0);
  const mlAvBerOssz   = mlAdatok.reduce((s, e) => s + (e.alvallalkozoiBer || 0), 0);
  const mlAnyagOssz   = mlAdatok.reduce((s, e) => s + (e.anyagkoltság || 0), 0);

  return {
    projekt: projektKalk,
    munkalapok: mlAdatok,
    osszesites: {
      projektSzintuBevitel: projektKalk.nettoBevitel,
      munkalapSzintuBevitel: mlBevitelOssz,
      alvallalkozoiBer: mlAvBerOssz,
      anyagkoltság: mlAnyagOssz,
      fixKoltsegek: projektKalk.fixKoltsegek,
      kartérités: projektKalk.kartérités,
      osszesKolts: projektKalk.osszesKolts,
      haszon: projektKalk.haszon,
      haszonPct: projektKalk.haszonPct,
    },
  };
}

// ─── BACKWARD COMPAT export (workOrderFinancial átnevezve) ────

/**
 * Backward-compatible wrapper: az összes korábbi hívó megkapja az elvárt struktúrát.
 */
export function calcEsmentProjektPenzugy(projekt) {
  const result = calcProjektElszamolas(projekt);
  return {
    ...result,
    // Régi mezők amiket TabKoltsegek.jsx vár
    haszon: result.haszon,
    nyereseg: result.nyereseg,
    // Explicit alias
    osszesKolts: result.osszesKolts,
  };
}
