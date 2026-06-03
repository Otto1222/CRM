/**
 * workOrderFinancial.service.js
 * Projekt/munkalap pénzügyi összesítő.
 * Tételek → munkalap pénzügy → projekt összesítő.
 */

import { loadElszamolasiKontextus, generateBeveteliTetelek, sumBeveteliTetelek } from "./settlementRule.service.js";
import { loadKarteritesek } from "../lib/karterites.js";
import { calcKmElszamolas } from "./travelCalculation.service.js";
import { getCsapat, calcCsapatAlvallalkozoiBer, calcCsapatKmBer } from "../modules/csapatok/csapat.service.js";

const TETELEK_KEY = (id) => `munkalap_tetelek_${id}`;
const dispatch = (col) =>
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: col } }));

// ─── Tételek tárolása ─────────────────────────────────────────

export function saveTetelek(projektId, tetelek) {
  localStorage.setItem(TETELEK_KEY(projektId), JSON.stringify(tetelek));
  dispatch("munkalap_tetelek");
}

export function loadTetelek(projektId) {
  try { return JSON.parse(localStorage.getItem(TETELEK_KEY(projektId)) || "[]"); } catch { return []; }
}

// ─── Főkalkuláció ─────────────────────────────────────────────

/**
 * Projekt pénzügyi előkalkuláció – szabály alapján.
 * Bevételi tételeket generál és elmenti.
 */
export function calcEsmentProjektPenzugy(projekt) {
  const penzugy = projekt?.penzugy || {};
  const { fovallalkoziId, munkatipus, tavKm, csapatLetszam, munkanapok,
          felultBevitel, keziCsapatBer, keziUtikoltség, keziAnyagkoltség,
          keziKartérités,
          emelőgepKoltseg = 0, daruKoltseg = 0, szallasKoltseg = 0,
          bereltEszkozKoltseg = 0, irodaAdminKoltseg = 0, egyebKoltseg = 0 } = penzugy;

  const ctx = loadElszamolasiKontextus(fovallalkoziId, munkatipus);

  // Bevételi tételek generálása
  const beveteliTetelek = generateBeveteliTetelek(ctx, {
    darabszam:  penzugy.darabszam || 1,
    kmEgyirany: tavKm || 0,
    keziTetelek: penzugy.keziTetelek || {},
  });
  // saveTetelek NEM hívható renderelés közben – az event dispatch végtelen loop-ot okoz.
  // A TabKoltsegek useEffect-ben menti el a tételeket.

  const autoBevitel = sumBeveteliTetelek(beveteliTetelek);
  const nettoBevitel = (felultBevitel !== null && felultBevitel !== undefined)
    ? Number(felultBevitel)
    : autoBevitel;

  // Csapat bér (szabályból)
  let csapatBer = 0;
  if (ctx.szabaly) {
    const { csapatBerTipus, csapatBerOsszeg } = ctx.szabaly;
    const napok = Number(munkanapok) || 1;
    const fok   = Number(csapatLetszam) || 1;
    switch (csapatBerTipus) {
      case "fix":        csapatBer = csapatBerOsszeg; break;
      case "Ft/nap":     csapatBer = csapatBerOsszeg * napok; break;
      case "Ft/nap/fő":  csapatBer = csapatBerOsszeg * napok * fok; break;
      case "%":          csapatBer = Math.round(nettoBevitel * (csapatBerOsszeg / 100)); break;
    }
  }
  if (keziCsapatBer !== null && keziCsapatBer !== undefined) csapatBer = Number(keziCsapatBer);

  // Alvállalkozói bér (csapat saját elszámolása)
  let alvallalkozoiBer = 0;
  let alvallalkozoiBerMj = "";
  let alvallalkozoiKmBer = 0;
  const csapatId = penzugy.csapatId || projekt.csapatId;
  if (csapatId) {
    const csapat = getCsapat(csapatId);
    if (csapat?.elszamolasAktiv) {
      const berResult = calcCsapatAlvallalkozoiBer(csapat, {
        nettoBevitel,
        munkanapok:    Number(munkanapok) || 1,
        csapatLetszam: Number(csapatLetszam) || 1,
        darabszam:     Number(penzugy.darabszam) || 1,
      });
      alvallalkozoiBer = berResult.osszeg;
      alvallalkozoiBerMj = berResult.megjegyzes;
      if (csapat.kmElszamolasAktiv) {
        const kmResult = calcCsapatKmBer(csapat, Number(tavKm) || 0);
        alvallalkozoiKmBer = kmResult.osszeg;
      }
    }
  }

  // Útiköltség: bevételi tételekből (ha van km_elszamolas tétel a munkatípusban)
  // Ha nincs ilyen tétel, fallback: közvetlenül az elszámolási szabályból számítjuk
  const kmTetel = beveteliTetelek.find(t => t.tetelTipusId === "km_elszamolas");
  let utikoltség = kmTetel?.hasznalandoNetto || 0;

  if (!utikoltség && ctx.szabaly && (tavKm || 0) > 0) {
    const kmTipus = ctx.szabaly.utikoltsegTipus || "nincs";
    if (kmTipus !== "nincs") {
      const ftKm   = ctx.szabaly.utikoltsegFtKm || ctx.fv?.alapUtikoltsegFtKm || 80;
      const kuszob = ctx.szabaly.kmKuszob   || 0;
      const fix    = ctx.szabaly.kmFixOsszeg || 0;
      const fallback = calcKmElszamolas({
        kmTipus, kmEgyirany: tavKm || 0, ftKm, kuszobKm: kuszob, fixOsszeg: fix, keziOsszeg: null,
      });
      utikoltség = fallback.netto;
    }
  }

  if (keziUtikoltség !== null && keziUtikoltség !== undefined) utikoltség = Number(keziUtikoltség);

  // Anyagköltség
  let anyagkoltség = Number(keziAnyagkoltség) || 0;

  // Kártérítések
  const kt = loadKarteritesek();
  let kartérités = kt
    .filter(k => (k.projektId === projekt.id || (projekt.munkalapIds||[]).includes(k.munkalapId)) && k.elfogadott === true)
    .reduce((s, k) => s + (k.osszeg || 0), 0);
  if (keziKartérités !== null && keziKartérités !== undefined) kartérités = Number(keziKartérités);

  const fixKoltsegek = Number(emelőgepKoltseg || 0) + Number(daruKoltseg || 0) +
    Number(szallasKoltseg || 0) + Number(bereltEszkozKoltseg || 0) +
    Number(irodaAdminKoltseg || 0) + Number(egyebKoltseg || 0);
  const osszesKolts = csapatBer + alvallalkozoiBer + alvallalkozoiKmBer + utikoltség + anyagkoltség + fixKoltsegek + kartérités;
  const haszon = nettoBevitel - osszesKolts;
  const haszonPct = nettoBevitel > 0 ? Math.round((haszon / nettoBevitel) * 100) : null;

  // Eltérés detektálás
  const elteresek = [];
  if (felultBevitel !== null && felultBevitel !== undefined && Number(felultBevitel) !== autoBevitel) elteresek.push("bevétel");
  if (keziCsapatBer !== null && keziCsapatBer !== undefined) elteresek.push("csapatBér");
  if (keziUtikoltség !== null && keziUtikoltség !== undefined) elteresek.push("útiköltség");
  if (keziAnyagkoltség !== null && keziAnyagkoltség !== undefined) elteresek.push("anyagköltség");
  if (keziKartérités !== null && keziKartérités !== undefined) elteresek.push("kártérítés");

  return {
    // Bevétel
    autoBevitel, nettoBevitel,
    bruttoBevitel: Math.round(nettoBevitel * 1.27),
    // Tételek
    beveteliTetelek,
    // Költségek
    csapatBer, utikoltség, anyagkoltség,
    emelőgepKoltseg:     Number(emelőgepKoltseg     || 0),
    daruKoltseg:         Number(daruKoltseg         || 0),
    szallasKoltseg:      Number(szallasKoltseg      || 0),
    bereltEszkozKoltseg: Number(bereltEszkozKoltseg || 0),
    irodaAdminKoltseg:   Number(irodaAdminKoltseg   || 0),
    kartérités,
    egyebKoltseg:        Number(egyebKoltseg        || 0),
    // Alvállalkozói
    alvallalkozoiBer,
    alvallalkozoiBerMj,
    alvallalkozoiKmBer,
    osszesKolts,
    // Eredmény
    haszon, haszonPct,
    nyereseg: haszon >= 0,
    // Meta
    szabalyId: ctx.szabaly?.id || null,
    fovallalkoNev: ctx.fv?.nev || null,
    elteresek,
    elteres: elteresek.length > 0,
    hianyosTetelek: beveteliTetelek.filter(t => t.hiany).map(t => t.megnevezes),
  };
}

/**
 * Tétel kézi felülírása – naplózással.
 */
export function felulirTetel(projektId, tetelTipusId, ujErtek, user = "") {
  const tetelek = loadTetelek(projektId);
  const updated = tetelek.map(t => {
    if (t.tetelTipusId !== tetelTipusId) return t;
    const volt = t.hasznalandoNetto;
    return {
      ...t,
      felulirtNetto: Number(ujErtek),
      hasznalandoNetto: Number(ujErtek),
      felulirva: Number(ujErtek) !== t.autoNetto,
      felulirtNaplo: [
        ...(t.felulirtNaplo || []),
        { datum: new Date().toISOString(), user, voltErtek: volt, ujErtek: Number(ujErtek) },
      ],
    };
  });
  saveTetelek(projektId, updated);
  return updated;
}

/**
 * Felülírás visszaállítása automatikusra.
 */
export function visszaallitTetel(projektId, tetelTipusId) {
  const tetelek = loadTetelek(projektId);
  const updated = tetelek.map(t => {
    if (t.tetelTipusId !== tetelTipusId) return t;
    return { ...t, felulirtNetto: null, hasznalandoNetto: t.autoNetto, felulirva: false };
  });
  saveTetelek(projektId, updated);
  return updated;
}
