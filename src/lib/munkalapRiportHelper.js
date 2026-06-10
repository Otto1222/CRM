/**
 * munkalapRiportHelper.js
 * Egységes riport adat egy munkalaphoz – Motor A elsődleges, Motor D átmeneti fallback.
 *
 * Döntési logika:
 *   Motor A (calcMunkalapElszamolas) → ha legalább egy FV bevételi tétel egyezik.
 *   Motor D (calcMunkalapPenzugy)    → minden más esetben (saját munka, belső munka,
 *                                      nincs egyező FV szabály). Látható warninggal jelölve.
 *
 * A Motor D fallback ÁTMENETI – amíg az összes munkalap FV-hez van rendelve és
 * Motor A teljes lefedettséget ad, a fallback eltávolítható.
 */

import { calcMunkalapElszamolas } from "../services/workOrderFinancial.service.js";
import { calcMunkalapPenzugy } from "./costEngine.js";

const MOTOR_D_WARNING =
  "A riport adat régi számítási motorból származik. " +
  "Rendelj fővállalkozót és munkatípust a munkalaphoz a Motor A alapú számításhoz.";

/**
 * Eldönti, hogy Motor A értelmesen számolt-e:
 * legalább egy bevételi tétel egyezni kellett (azaz volt FV + munkatípus + szabály).
 */
function motorAErvényes(motorAResult) {
  return Array.isArray(motorAResult.beveteliTetelek) &&
    motorAResult.beveteliTetelek.length > 0;
}

/**
 * Egységes kimeneti struktúra Motor A eredményből.
 */
function fromMotorA(a) {
  return {
    bevetal:     a.bevitel,
    eredmeny:    a.haszon,
    osszesKolts: a.osszesKolts,
    haszonPct:   a.haszonPct,
    nyereseg:    a.haszon >= 0,
    motor:       "A",
    warning:     null,
    _motorA:     a,
  };
}

/**
 * Egységes kimeneti struktúra Motor D eredményből.
 */
function fromMotorD(d) {
  return {
    bevetal:     d.bevetal,
    eredmeny:    d.eredmeny,
    osszesKolts: d.osszesKolts,
    haszonPct:   d.haszonPct,
    nyereseg:    d.nyereseg,
    motor:       "D",
    warning:     MOTOR_D_WARNING,
    _motorD:     d,
  };
}

/**
 * Kiszámítja egy munkalap riport adatait.
 * Motor A elsődleges; Motor D csak akkor fut, ha Motor A nem tud érvényes
 * bevételi tételt produkálni (pl. nincs FV, nincs munkatípus, nincs egyező szabály).
 *
 * @param {object} munkalap
 * @param {object} [projekt]  – szükséges Motor A fallback mezőkhez (FV, munkatípus, méretek)
 * @returns {{ bevetal, eredmeny, haszonPct, nyereseg, motor: "A"|"D", warning: string|null, _motorA?, _motorD? }}
 */
export function calcMunkalapRiportAdat(munkalap, projekt) {
  try {
    const motorAResult = calcMunkalapElszamolas(munkalap, projekt);
    if (motorAErvényes(motorAResult)) {
      return fromMotorA(motorAResult);
    }
  } catch {
    // Motor A crashelt – nem blokkolunk, fallback Motor D-re
  }

  try {
    const motorDResult = calcMunkalapPenzugy(munkalap);
    return fromMotorD(motorDResult);
  } catch {
    return {
      bevetal:   0,
      eredmeny:  0,
      haszonPct: null,
      nyereseg:  false,
      motor:     "D",
      warning:   "Pénzügyi adat nem elérhető.",
    };
  }
}