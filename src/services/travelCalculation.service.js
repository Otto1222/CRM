/**
 * travelCalculation.service.js
 * Km-elszámolás minden típusra. Adatból, nem kódból.
 */

import { KM_TIPUSOK } from "../modules/munkatipusok/munkatipus.schema.js";

/**
 * @param {object} params
 *   kmTipus       – KM_TIPUSOK id
 *   kmEgyirany    – km oda (egyirányú)
 *   ftKm          – Ft/km díj
 *   kuszobKm      – küszöb (kuszob_folott típusnál)
 *   fixOsszeg     – fix kiszállási díj
 *   keziOsszeg    – kézi megadás esetén
 * @returns {{ netto: number, megjegyzes: string }}
 */
export function calcKmElszamolas({ kmTipus, kmEgyirany = 0, ftKm = 0, kuszobKm = 0, fixOsszeg = 0, keziOsszeg = null }) {
  const km = Number(kmEgyirany) || 0;
  const rate = Number(ftKm) || 0;

  switch (kmTipus) {
    case "nincs":
      return { netto: 0, megjegyzes: "Nincs km elszámolás" };

    case "oda_vissza": {
      const osszeg = Math.round(km * 2 * rate);
      return { netto: osszeg, megjegyzes: `${km} km × 2 × ${rate} Ft/km = ${osszeg} Ft` };
    }

    case "kuszob_folott": {
      const kuszob = Number(kuszobKm) || 0;
      const elszam = Math.max(0, km - kuszob);
      const osszeg = Math.round(elszam * 2 * rate);
      return {
        netto: osszeg,
        megjegyzes: `${km} km − ${kuszob} km küszöb = ${elszam} km × 2 × ${rate} Ft/km = ${osszeg} Ft`,
      };
    }

    case "fix_kiszallas":
      return { netto: Number(fixOsszeg) || 0, megjegyzes: `Fix kiszállási díj: ${fixOsszeg} Ft` };

    case "kezi":
      return { netto: Number(keziOsszeg) || 0, megjegyzes: "Kézi megadás" };

    default:
      return { netto: 0, megjegyzes: "Ismeretlen km típus" };
  }
}

/**
 * Szöveges összefoglaló a km-típushoz (UI-ban jelzésnek)
 */
export function kmTipusLabel(kmTipus) {
  return KM_TIPUSOK.find(t => t.id === kmTipus)?.label || "—";
}
