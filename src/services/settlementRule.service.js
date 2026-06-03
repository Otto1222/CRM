/**
 * settlementRule.service.js
 * Szabálymotor: fővállalkozó + munkatípus → aktív szabály + tételek.
 * A szabály adat, nem programkód.
 */

import { loadFovallalkozok, loadSzabalyok } from "../modules/fovallalkozok/fovallalkozo.service.js";
import { getMunkatipus } from "../modules/munkatipusok/munkatipus.service.js";
import { calcKmElszamolas } from "./travelCalculation.service.js";
import { calcMunkaDij } from "./workFeeCalculation.service.js";
import { BEVETELI_TETEL_TIPUSOK, KOLTSEG_TETEL_TIPUSOK } from "../modules/munkatipusok/munkatipus.schema.js";

// ─── Szabálykiértékelés ───────────────────────────────────────

/**
 * Megkeresi az aktív elszámolási szabályt.
 * Prioritás: pontos munkatípus > általános (üres munkatípus)
 */
export function findAktivSzabaly(fovallalkoziId, munkatipusId) {
  if (!fovallalkoziId) return null;
  const szabalyok = loadSzabalyok().filter(
    s => s.fovallalkoziId === fovallalkoziId && s.aktiv !== false
  );
  return szabalyok.find(s => s.munkatipus === munkatipusId)
    || szabalyok.find(s => !s.munkatipus)
    || null;
}

/**
 * Betölti az elszámolási kontextust (fővállalkozó + szabály + munkatípus definíciók).
 */
export function loadElszamolasiKontextus(fovallalkoziId, munkatipusId) {
  const fv       = loadFovallalkozok().find(f => f.id === fovallalkoziId) || null;
  const szabaly  = findAktivSzabaly(fovallalkoziId, munkatipusId);
  const mtipus   = getMunkatipus(munkatipusId);
  return { fv, szabaly, mtipus };
}

// ─── Tételek generálása ───────────────────────────────────────

/**
 * Egy munkalap/projekt összes automatikus bevételi tételét generálja.
 * 
 * @param {object} kontextus   – { fv, szabaly, mtipus }
 * @param {object} inputok     – { darabszam, kmEgyirany, keziTetelek:{[tetelTipusId]:osszeg} }
 * @returns {Array} tetelek    – [{ id, tetelTipusId, megnevezes, autoNetto, felulirtNetto, megjegyzes, hiany }]
 */
export function generateBeveteliTetelek(kontextus, inputok = {}) {
  const { fv, szabaly, mtipus } = kontextus;
  const { darabszam = 1, kmEgyirany = 0, keziTetelek = {} } = inputok;

  if (!mtipus) return [];

  const tetelek = [];

  // Munkatípus bevételi tételdefiníciói
  for (const tetelDef of (mtipus.beveteliTetelek || [])) {
    const tipusInfo = BEVETELI_TETEL_TIPUSOK.find(t => t.id === tetelDef.tetelTipusId);
    const megnevezes = tipusInfo?.label || tetelDef.tetelTipusId;

    let autoNetto = 0;
    let megjegyzes = "";
    let hiany = false;

    if (tetelDef.tetelTipusId === "km_elszamolas") {
      // Km-elszámolás: szabályból veszi a típust és díjat
      const kmTipus  = szabaly?.utikoltsegTipus || "nincs";
      const ftKm     = szabaly?.utikoltsegFtKm  || fv?.alapUtikoltsegFtKm || 80;
      const kuszob   = szabaly?.kmKuszob         || 0;
      const fix      = szabaly?.kmFixOsszeg      || 0;
      const result   = calcKmElszamolas({
        kmTipus, kmEgyirany, ftKm, kuszobKm: kuszob,
        fixOsszeg: fix, keziOsszeg: keziTetelek[tetelDef.tetelTipusId] ?? null,
      });
      autoNetto  = result.netto;
      megjegyzes = result.megjegyzes;
    } else {
      // Munkadíj: a szabályból veszi az adott tétel árát (ha van override), különben a munkatípusból
      const szabalyTetelAr = szabaly?.tetelArak?.[tetelDef.tetelTipusId];
      // Szabály felülír: az árlogika típusa MARAD (darab_egysegar → még mindig db×ár),
      // csak az ár értéke változik fővállalkozónként.
      const effDef = szabalyTetelAr !== undefined
        ? { ...tetelDef, fixOsszeg: szabalyTetelAr, egysegAr: szabalyTetelAr }
        : tetelDef;
      const result = calcMunkaDij(effDef, {
        darabszam,
        keziOsszeg: keziTetelek[tetelDef.tetelTipusId] ?? null,
      });
      autoNetto  = result.netto;
      megjegyzes = result.megjegyzes;
      hiany      = result.hiany;
    }

    const felulirtNetto = keziTetelek[tetelDef.tetelTipusId] !== undefined
      ? Number(keziTetelek[tetelDef.tetelTipusId])
      : null;

    tetelek.push({
      id:            `t_${tetelDef.id || tetelDef.tetelTipusId}_${Date.now()}`,
      tetelTipusId:  tetelDef.tetelTipusId,
      megnevezes,
      autoNetto,
      felulirtNetto,
      hasznalandoNetto: felulirtNetto !== null ? felulirtNetto : autoNetto,
      megjegyzes,
      hiany,
      felulirva:     felulirtNetto !== null && felulirtNetto !== autoNetto,
    });
  }

  return tetelek;
}

/**
 * Összesített nettó bevétel a tételekből.
 */
export function sumBeveteliTetelek(tetelek = []) {
  return tetelek.reduce((s, t) => s + (t.hasznalandoNetto || 0), 0);
}

/**
 * Ellenőrzi van-e hiányos tétel (kézi megadás szükséges).
 */
export function hasHianyosTetelek(tetelek = []) {
  return tetelek.some(t => t.hiany);
}
