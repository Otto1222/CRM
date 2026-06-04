/**
 * workOrderFinancial.service.js
 * Projekt pénzügyi kalkuláció – szabályalapú elszámolási motor.
 *
 * Motor: calcOsszesSzabaly → összegzi az összes egyező FV szabályt.
 * AV (csapat bér): AV szabályok preferáltak; fallback a régi dijTipus mezőkre.
 */

import { loadFovallalkozok, loadSzabalyok } from "../modules/fovallalkozok/fovallalkozo.service.js";
import { calcOsszesSzabaly, findEgyezoSzabalyok, calcSzabalyOsszeg, szabalyLeiras, ELSZAMOLASI_MODOK } from "../modules/fovallalkozok/elszamolasiMotor.js";
import { loadKarteritesek } from "../lib/karterites.js";
import { getCsapat, loadAvSzabalyok, calcCsapatAlvallalkozoiBer, getAvSzabalyokByCsapat } from "../modules/csapatok/csapat.service.js";

const TETELEK_KEY = id => `munkalap_tetelek_${id}`;
const dispatch    = col =>
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: col } }));

// ─── Tételek tárolása ─────────────────────────────────────────

export function saveTetelek(projektId, tetelek) {
  localStorage.setItem(TETELEK_KEY(projektId), JSON.stringify(tetelek));
  dispatch("munkalap_tetelek");
}

export function loadTetelek(projektId) {
  try { return JSON.parse(localStorage.getItem(TETELEK_KEY(projektId)) || "[]"); } catch { return []; }
}

// ─── Fő kalkuláció ────────────────────────────────────────────

/**
 * Projekt pénzügyi kalkuláció – szabályalapú motor.
 * FV szabályok → bevétel; AV szabályok → csapat bér.
 */
export function calcEsmentProjektPenzugy(projekt) {
  if (!projekt) return null;
  const penzugy = projekt?.penzugy || {};
  const {
    fovallalkoziId, munkatipus,
    darabszam = 1, tavKm = 0,
    csapatLetszam = 1, munkanapok = 1,
    felultBevitel, keziCsapatBer, keziUtikoltség, keziAnyagkoltság,
    keziKartérités,
    emelőgepKoltseg = 0, daruKoltseg = 0, szallasKoltseg = 0,
    bereltEszkozKoltseg = 0, irodaAdminKoltseg = 0, egyebKoltseg = 0,
  } = penzugy;

  const input = { darabszam: Number(darabszam) || 1, tavKm: Number(tavKm) || 0 };

  // ── Fővállalkozói bevétel ──────────────────────────────────
  const fvSzabalyok    = loadSzabalyok();
  const egyezoFvSzab   = findEgyezoSzabalyok(fovallalkoziId, munkatipus, fvSzabalyok);
  const autoBevitel    = egyezoFvSzab.reduce((s, sz) => s + calcSzabalyOsszeg(sz, input), 0);

  const nettoBevitel   = (felultBevitel !== null && felultBevitel !== undefined)
    ? Number(felultBevitel)
    : autoBevitel;

  // Bevételi tételek generálása szabályokból (táblázatban szerkeszthető)
  const beveteliTetelek = egyezoFvSzab.map(sz => {
    const autoNetto      = calcSzabalyOsszeg(sz, input);
    const modLabel       = ELSZAMOLASI_MODOK.find(m => m.id === sz.mod)?.label || sz.mod;
    const megnevezes     = `${sz.munkatipus || "Általános"} – ${modLabel}`;
    const savedTetelek   = loadTetelek(projekt.id);
    const saved          = savedTetelek.find(t => t.tetelTipusId === sz.id);
    const felulirtNetto  = saved?.felulirva ? saved.felulirtNetto : null;
    return {
      id:               `t_${sz.id}`,
      tetelTipusId:     sz.id,
      megnevezes,
      autoNetto,
      felulirtNetto,
      hasznalandoNetto: felulirtNetto !== null ? felulirtNetto : autoNetto,
      megjegyzes:       szabalyLeiras(sz),
      felulirva:        felulirtNetto !== null && felulirtNetto !== autoNetto,
      hiany:            autoNetto === 0 && sz.mod === "savos",
    };
  });

  // Ha nincs egyező FV szabály de van régi típusú szabály a rendszerben (backward compat)
  if (beveteliTetelek.length === 0 && fovallalkoziId) {
    // Régi `nettoBevitel`-t tartalmazó szabály fallback
    const fvk = loadFovallalkozok();
    const legacySzab = fvSzabalyok.find(s => {
      const ownId = s.tulajdonosId || s.fovallalkoziId;
      return ownId === fovallalkoziId && s.aktiv !== false &&
        (s.munkatipus === munkatipus || !s.munkatipus) && s.nettoBevitel > 0 && !s.mod;
    });
    if (legacySzab) {
      beveteliTetelek.push({
        id: `t_${legacySzab.id}`, tetelTipusId: legacySzab.id,
        megnevezes: legacySzab.munkatipus || "Általános",
        autoNetto: legacySzab.nettoBevitel || 0,
        felulirtNetto: null,
        hasznalandoNetto: legacySzab.nettoBevitel || 0,
        megjegyzes: "Régi formátumú szabály",
        felulirva: false, hiany: false,
      });
    }
  }

  // ── Alvállalkozói bér ────────────────────────────────────
  const csapatId = penzugy.csapatId || projekt.csapatId;
  let alvallalkozoiBer = 0;
  let alvallalkozoiBerMj = "";
  let alvallalkozoiKmBer = 0;

  if (csapatId) {
    const csapat = getCsapat(csapatId);
    const avSzabalyok = loadAvSzabalyok();
    const csapatAvSzab = (avSzabalyok || []).filter(s => s.tulajdonosId === csapatId && s.aktiv !== false);

    if (csapatAvSzab.length > 0) {
      // Új motor: AV szabályok alapján
      alvallalkozoiBer = calcOsszesSzabaly(csapatId, munkatipus, avSzabalyok, input);
      const egyezoAv = findEgyezoSzabalyok(csapatId, munkatipus, avSzabalyok);
      alvallalkozoiBerMj = egyezoAv.map(szabalyLeiras).join(" + ");
    } else if (csapat?.elszamolasAktiv) {
      // Fallback: régi dijTipus/dijOsszeg rendszer
      const berResult = calcCsapatAlvallalkozoiBer(csapat, {
        nettoBevitel,
        munkanapok:    Number(munkanapok)    || 1,
        csapatLetszam: Number(csapatLetszam) || 1,
        darabszam:     Number(darabszam)     || 1,
      });
      alvallalkozoiBer = berResult.osszeg;
      alvallalkozoiBerMj = berResult.megjegyzes;
    }
  }

  // ── Kártérítések ─────────────────────────────────────────
  const kt = loadKarteritesek();
  let kartérités = kt
    .filter(k => (k.projektId === projekt.id || (projekt.munkalapIds || []).includes(k.munkalapId)) && k.elfogadott === true)
    .reduce((s, k) => s + (k.osszeg || 0), 0);
  if (keziKartérités !== null && keziKartérités !== undefined) kartérités = Number(keziKartérités);

  // ── Anyagköltség & Útiköltség ────────────────────────────
  let anyagkoltság = Number(penzugy.keziAnyagkoltság) || 0;
  let utikoltség   = (keziUtikoltség !== null && keziUtikoltség !== undefined) ? Number(keziUtikoltség) : 0;

  // ── Csapat bér (FV oldalon) ──────────────────────────────
  // Ha nincs AV szabály és a FV szabályban volt csapatBerTipus (backward compat), olvassuk ki
  let csapatBer = 0;
  if (keziCsapatBer !== null && keziCsapatBer !== undefined) {
    csapatBer = Number(keziCsapatBer);
  } else {
    // Régi rendszerben a FV szabály tartalmazta a csapat bért is
    const legacySzab = fvSzabalyok.find(s => {
      const ownId = s.tulajdonosId || s.fovallalkoziId;
      return ownId === fovallalkoziId && s.aktiv !== false &&
        (s.munkatipus === munkatipus || !s.munkatipus) && s.csapatBerTipus;
    });
    if (legacySzab) {
      const napok = Number(munkanapok)    || 1;
      const fok   = Number(csapatLetszam) || 1;
      switch (legacySzab.csapatBerTipus) {
        case "fix":       csapatBer = legacySzab.csapatBerOsszeg; break;
        case "Ft/nap":    csapatBer = legacySzab.csapatBerOsszeg * napok; break;
        case "Ft/nap/fő": csapatBer = legacySzab.csapatBerOsszeg * napok * fok; break;
        case "%":         csapatBer = Math.round(nettoBevitel * (legacySzab.csapatBerOsszeg / 100)); break;
      }
    }
  }

  // ── Összesítés ────────────────────────────────────────────
  const fixKoltsegek = Number(emelőgepKoltseg  || 0) + Number(daruKoltseg         || 0)
                     + Number(szallasKoltseg    || 0) + Number(bereltEszkozKoltseg || 0)
                     + Number(irodaAdminKoltseg || 0) + Number(egyebKoltseg        || 0);

  const osszesKolts = csapatBer + alvallalkozoiBer + alvallalkozoiKmBer
    + utikoltség + anyagkoltság + fixKoltsegek + kartérités;
  const haszon    = nettoBevitel - osszesKolts;
  const haszonPct = nettoBevitel > 0 ? Math.round((haszon / nettoBevitel) * 100) : null;

  // ── Eltérés detektálás ────────────────────────────────────
  const elteresek = [];
  if (felultBevitel !== null && felultBevitel !== undefined && Number(felultBevitel) !== autoBevitel) elteresek.push("bevétel");
  if (keziCsapatBer !== null && keziCsapatBer !== undefined) elteresek.push("csapatBér");
  if (keziUtikoltség !== null && keziUtikoltség !== undefined) elteresek.push("útiköltség");
  if (penzugy.keziAnyagkoltság !== null && penzugy.keziAnyagkoltság !== undefined) elteresek.push("anyagköltség");
  if (keziKartérités !== null && keziKartérités !== undefined) elteresek.push("kártérítés");

  const fvk = loadFovallalkozok();
  const fovallalkoNev = fvk.find(f => f.id === fovallalkoziId)?.nev || null;

  return {
    // Bevétel
    autoBevitel, nettoBevitel,
    bruttoBevitel: Math.round(nettoBevitel * 1.27),
    // Tételek
    beveteliTetelek,
    // Költségek
    csapatBer, utikoltség, anyagkoltság,
    emelőgepKoltseg:     Number(emelőgepKoltseg     || 0),
    daruKoltseg:         Number(daruKoltseg         || 0),
    szallasKoltseg:      Number(szallasKoltseg      || 0),
    bereltEszkozKoltseg: Number(bereltEszkozKoltseg || 0),
    irodaAdminKoltseg:   Number(irodaAdminKoltseg   || 0),
    kartérités,
    egyebKoltseg:        Number(egyebKoltseg        || 0),
    // Alvállalkozói
    alvallalkozoiBer, alvallalkozoiBerMj, alvallalkozoiKmBer,
    osszesKolts,
    // Eredmény
    haszon, haszonPct,
    nyereseg: haszon >= 0,
    // Meta
    fovallalkoNev,
    elteresek, elteres: elteresek.length > 0,
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
      felulirtNetto:    Number(ujErtek),
      hasznalandoNetto: Number(ujErtek),
      felulirva:        Number(ujErtek) !== t.autoNetto,
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
