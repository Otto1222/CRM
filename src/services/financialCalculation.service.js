/**
 * financialCalculation.service.js
 * Projekt pénzügyi előkalkuláció és végkalkuláció.
 * Minden számítás itt – soha nem UI-ban.
 */

import { loadFovallalkozok, loadSzabalyok, findSzabaly } from "../modules/fovallalkozok/fovallalkozo.service.js";
import { loadKarteritesek } from "../lib/karterites.js";

// ─── Egy kalkuláció eredmény struktúrája ─────────────────────

export function emptyKalkulacio() {
  return {
    nettoBevitel:     0,
    csapatBer:        0,
    utikoltség:       0,
    anyagkoltség:     0,
    emelőgepKoltseg:  0,
    kartérités:       0,
    egyebKoltseg:     0,
    osszesKolts:      0,
    varhatoHaszon:    0,
    haszonkulcsPct:   null,
    // Meta
    szabalyId:        null,
    forras:           "manual",   // "auto" | "manual" | "partial"
    elteres:          false,
    elteresek:        [],         // ["bevétel","csapatBér",…]
  };
}

// ─── Csapat bér számítás ─────────────────────────────────────

export function calcCsapatBer(szabaly, penzugy, bevitel) {
  if (!szabaly) return 0;
  const { csapatBerTipus, csapatBerOsszeg } = szabaly;
  const { munkanapok = 1, csapatLetszam = 1 } = penzugy || {};
  switch (csapatBerTipus) {
    case "fix":       return csapatBerOsszeg;
    case "Ft/nap":    return csapatBerOsszeg * munkanapok;
    case "Ft/nap/fő": return csapatBerOsszeg * munkanapok * csapatLetszam;
    case "%":         return Math.round(bevitel * (csapatBerOsszeg / 100));
    default:          return 0;
  }
}

// ─── Útiköltség számítás ─────────────────────────────────────

export function calcUtikoltség(szabaly, fovallalkozo, penzugy) {
  if (!szabaly) return 0;
  const { utikoltsegTipus, utikoltsegFtKm } = szabaly;
  const { tavKm = 0 } = penzugy || {};
  const ftKm = utikoltsegFtKm > 0 ? utikoltsegFtKm : (fovallalkozo?.alapUtikoltsegFtKm || 80);
  switch (utikoltsegTipus) {
    case "Ft/km": return Math.round(tavKm * ftKm * 2); // oda + vissza
    case "fix":   return utikoltsegFtKm;
    default:      return 0;
  }
}

// ─── Anyagköltség számítás ───────────────────────────────────

export function calcAnyagkoltség(szabaly, penzugy, munkalapAnyagKolts, bevitel) {
  if (penzugy?.keziAnyagkoltség !== null && penzugy?.keziAnyagkoltség !== undefined) {
    return Number(penzugy.keziAnyagkoltség) || 0;
  }
  if (!szabaly) return munkalapAnyagKolts || 0;
  switch (szabaly.anyagkoltségModja) {
    case "tényleges":  return munkalapAnyagKolts || 0;
    case "kalkulált%": return Math.round(bevitel * (szabaly.anyagkoltségErtek / 100));
    case "fix":        return szabaly.anyagkoltségErtek || 0;
    default:           return penzugy?.keziAnyagkoltség || 0;
  }
}

// ─── Kártérítés számítás ─────────────────────────────────────

export function calcKartérités(szabaly, penzugy, projektId, munkalapIds, bevitel) {
  if (penzugy?.keziKartérités !== null && penzugy?.keziKartérités !== undefined) {
    return Number(penzugy.keziKartérités) || 0;
  }
  const kt = loadKarteritesek();
  const tenyeleges = kt
    .filter(k => (k.projektId === projektId || (munkalapIds||[]).includes(k.munkalapId)) && k.elfogadott === true)
    .reduce((s, k) => s + (k.osszeg || 0), 0);
  if (!szabaly) return tenyeleges;
  switch (szabaly.kartériétasModja) {
    case "tényleges": return tenyeleges;
    case "limit%":    return Math.min(tenyeleges, Math.round(bevitel * (szabaly.kartériétasLimit / 100)));
    default:          return 0;
  }
}

// ─── Fő kalkuláció ───────────────────────────────────────────

/**
 * calcProjektElőkalkulacio
 * Csak a projekt penzugy objektumból számol (szabály alapján).
 * Munkalapok nélkül is működik (előkalkuláció).
 */
export function calcProjektElőkalkulacio(projekt) {
  const penzugy  = projekt?.penzugy || {};
  const result   = emptyKalkulacio();

  if (!penzugy.fovallalkoziId) return result;

  const fovallalkozok = loadFovallalkozok();
  const fv  = fovallalkozok.find(f => f.id === penzugy.fovallalkoziId);
  const sz  = penzugy.elszamolasiSzabalyId
    ? loadSzabalyok().find(s => s.id === penzugy.elszamolasiSzabalyId)
    : findSzabaly(penzugy.fovallalkoziId, penzugy.munkatipus);

  result.szabalyId = sz?.id || null;
  result.forras    = sz ? "auto" : "manual";

  // Bevétel
  result.nettoBevitel = penzugy.felultBevitel !== null && penzugy.felultBevitel !== undefined
    ? Number(penzugy.felultBevitel)
    : (sz?.nettoBevitel || 0);

  // Csapat bér
  result.csapatBer = penzugy.keziCsapatBer !== null && penzugy.keziCsapatBer !== undefined
    ? Number(penzugy.keziCsapatBer)
    : calcCsapatBer(sz, penzugy, result.nettoBevitel);

  // Útiköltség
  result.utikoltség = penzugy.keziUtikoltség !== null && penzugy.keziUtikoltség !== undefined
    ? Number(penzugy.keziUtikoltség)
    : calcUtikoltség(sz, fv, penzugy);

  // Anyagköltség (csak kézi ilyenkor, tényleges a végkalkulációban)
  result.anyagkoltség = Number(penzugy.keziAnyagkoltség) || 0;

  // Egyéb
  result.emelőgepKoltseg = Number(penzugy.emelőgepKoltseg) || 0;
  result.egyebKoltseg    = Number(penzugy.egyebKoltseg)    || 0;
  result.kartérités      = Number(penzugy.keziKartérités)  || 0;

  // Összesítés
  result.osszesKolts  = result.csapatBer + result.utikoltség + result.anyagkoltség
    + result.emelőgepKoltseg + result.kartérités + result.egyebKoltseg;
  result.varhatoHaszon = result.nettoBevitel - result.osszesKolts;
  result.haszonkulcsPct = result.nettoBevitel > 0
    ? Math.round((result.varhatoHaszon / result.nettoBevitel) * 100)
    : null;

  // Eltérés detektálás
  const elteresek = [];
  if (sz) {
    if (penzugy.felultBevitel !== null && penzugy.felultBevitel !== undefined
      && Number(penzugy.felultBevitel) !== sz.nettoBevitel) elteresek.push("bevétel");
    if (penzugy.keziCsapatBer !== null && penzugy.keziCsapatBer !== undefined) elteresek.push("csapatBér");
    if (penzugy.keziUtikoltség !== null && penzugy.keziUtikoltség !== undefined) elteresek.push("útiköltség");
    if (penzugy.keziAnyagkoltség !== null && penzugy.keziAnyagkoltség !== undefined) elteresek.push("anyagköltség");
    if (penzugy.keziKartérités  !== null && penzugy.keziKartérités  !== undefined) elteresek.push("kártérítés");
  }
  result.elteres    = elteresek.length > 0;
  result.elteresek  = elteresek;

  return result;
}

/**
 * calcProjektVegkalkulacio
 * Munkalapok tényleges adataival számol (lezárt projektnél).
 */
export function calcProjektVegkalkulacio(projekt, munkalapok) {
  const penzugy  = projekt?.penzugy || {};
  const result   = calcProjektElőkalkulacio(projekt);  // alap

  if (!munkalapok?.length) return result;

  const fovallalkozok = loadFovallalkozok();
  const fv  = fovallalkozok.find(f => f.id === penzugy.fovallalkoziId);
  const sz  = result.szabalyId
    ? loadSzabalyok().find(s => s.id === result.szabalyId)
    : null;

  // Anyagköltség – tényleges munkalap tételek
  const munkalapAnyag = (munkalapok||[]).reduce((s, m) => {
    return s + (m.items||[]).reduce((x, i) => x + (i.net||i.ar||0)*(i.qty||i.mennyiseg||1), 0);
  }, 0);
  result.anyagkoltség = calcAnyagkoltség(sz, penzugy, munkalapAnyag, result.nettoBevitel);

  // Kártérítés – tényleges elfogadott kártérítések
  result.kartérités = calcKartérités(
    sz, penzugy, projekt.id,
    projekt.munkalapIds || munkalapok.map(m => m.id),
    result.nettoBevitel
  );

  // Újraszámolás tényleges értékekkel
  result.osszesKolts  = result.csapatBer + result.utikoltség + result.anyagkoltség
    + result.emelőgepKoltseg + result.kartérités + result.egyebKoltseg;
  result.varhatoHaszon = result.nettoBevitel - result.osszesKolts;
  result.haszonkulcsPct = result.nettoBevitel > 0
    ? Math.round((result.varhatoHaszon / result.nettoBevitel) * 100)
    : null;

  return result;
}

/**
 * autoFillPenzugy – projekt létrehozáskor tölti be a szabály alapértékeit
 */
export function autoFillPenzugy(fovallalkoziId, munkatipus, meglevo = {}) {
  const sz = findSzabaly(fovallalkoziId, munkatipus);
  return {
    ...meglevo,
    fovallalkoziId,
    munkatipus,
    elszamolasiSzabalyId: sz?.id || "",
    // Null = nem felülírva, auto-számítás
    felultBevitel:   null,
    keziCsapatBer:   null,
    keziUtikoltség:  null,
    keziAnyagkoltség: null,
    keziKartérités:  null,
  };
}
