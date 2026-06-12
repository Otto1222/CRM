/**
 * elszamolasiMotor.js
 * Univerzális szabályalapú elszámolási motor.
 * Fővállalkozók (bevétel) és alvállalkozói csapatok (bér) egyforma rendszerrel.
 *
 * Az 5 elszámolási mód inputja:
 *   fix           → nincs input, mindig fixOsszeg Ft
 *   darab         → input.darabszam
 *   savos         → input.darabszam → tartományos sáv lookup
 *   km            → input.tavKm (egyirányú km, oda-vissza x2)
 *   fix_kiszallas → nincs input, mindig kiszallasiDij Ft
 */

export const ELSZAMOLASI_MUNKATIPUSOK = [
  "Napelem telepítés",
  "Napelem rendszer bővítés",
  "Inverter csere",
  "Inverter csere + akkumulátor",
  "Inverter csere + akkumulátor + smart meter",
  "Akkumulátor telepítés",
  "Smart meter telepítés",
  "EV töltő telepítés",
  "Csatlakozási pont korszerűsítés",
  "Felmérés",
  "Egyéb bevétel",
];

export const ELSZAMOLASI_MODOK = [
  { id: "fix",           label: "Fix összeg",         hint: "Mindig ugyanannyi Ft, függetlenül a mennyiségtől" },
  { id: "darab",         label: "Darabszám × Ft",      hint: "Egységár × darabszám (panel, inverter...)" },
  { id: "savos",         label: "Sávos díjazás",        hint: "Darabszám alapján sávonkénti fix összeg" },
  { id: "km",            label: "Km alapú",             hint: "Km-díj × (oda-vissza km − küszöb)" },
  { id: "fix_kiszallas", label: "Fix kiszállási díj",   hint: "Állandó kiszállási díj, km-tól függetlenül" },
];

/**
 * Egy szabály alapján kiszámolja az összeget.
 * @param {object} szabaly  – rule objektum
 * @param {object} input    – { darabszam?: number, tavKm?: number }
 * @returns {number}
 */
export function calcSzabalyOsszeg(szabaly, input = {}) {
  if (!szabaly || szabaly.aktiv === false) return 0;
  // alapMennyiseg: ha meg van adva, abból veszi a mennyiséget; ha nincs → darabszam (backward compat)
  const darabszam = szabaly.alapMennyiseg
    ? (Number(input[szabaly.alapMennyiseg]) || 0)
    : (Number(input.darabszam)              || 0);
  const tavKm     = Number(input.tavKm)     || 0;

  // Backward compatibility: régi szabályok ahol nincs mod, de van nettoBevitel
  const mod = szabaly.mod || (szabaly.nettoBevitel ? "_legacy" : "fix");

  switch (mod) {
    case "fix":
      return Number(szabaly.fixOsszeg) || 0;

    case "darab":
      return Math.round(darabszam * (Number(szabaly.darabEgysegAr) || 0));

    case "savos": {
      const savok = Array.isArray(szabaly.savok) ? szabaly.savok : [];
      const sav   = savok.find(s => {
        const tol = Number(s.tol) || 0;
        const ig  = (s.ig !== "" && s.ig !== null && s.ig !== undefined) ? Number(s.ig) : Infinity;
        return darabszam >= tol && darabszam <= ig;
      });
      return sav ? (Number(sav.osszeg) || 0) : 0;
    }

    case "km": {
      const ftKm   = Number(szabaly.kmDijFtKm)  || 0;
      const kuszob = Number(szabaly.kmKuszobKm) || 0;
      const effKm  = Math.max(0, tavKm - kuszob);
      return Math.round(effKm * 2 * ftKm);
    }

    case "fix_kiszallas":
      return Number(szabaly.kiszallasiDij) || 0;

    case "_legacy":
    default:
      return Number(szabaly.nettoBevitel) || 0;
  }
}

/**
 * Megkeresi az összes egyező aktív szabályt (tulajdonos + munkatípus).
 * Ha van pontos munkatípus egyezés → csak pontosak.
 * Ha nincs → általános ("" munkatípusú) szabályok.
 */
export function findEgyezoSzabalyok(tulajdonosId, munkatipus, szabalyok) {
  if (!tulajdonosId) return [];
  const sajat = (szabalyok || []).filter(s => {
    const ownerId = s.tulajdonosId || s.fovallalkoziId; // backward compat
    return ownerId === tulajdonosId && s.aktiv !== false;
  });
  const pontosak  = sajat.filter(s => s.munkatipus === munkatipus);
  const altalanos = sajat.filter(s => !s.munkatipus);
  return pontosak.length > 0 ? pontosak : altalanos;
}

/**
 * Összes egyező szabály összege (több szabály is lehet egy munkára, pl. darab + km).
 */
export function calcOsszesSzabaly(tulajdonosId, munkatipus, szabalyok, input = {}) {
  return findEgyezoSzabalyok(tulajdonosId, munkatipus, szabalyok)
    .reduce((sum, sz) => sum + calcSzabalyOsszeg(sz, input), 0);
}

/**
 * Emberi olvasatú leírás egy szabályhoz (préview, tooltip).
 */
export function szabalyLeiras(szabaly) {
  if (!szabaly) return "—";
  const fmt = n => Number(n || 0).toLocaleString("hu-HU");
  switch (szabaly.mod) {
    case "fix":           return `Fix: ${fmt(szabaly.fixOsszeg)} Ft`;
    case "darab":         return `${fmt(szabaly.darabEgysegAr)} Ft/db`;
    case "savos": {
      const s = szabaly.savok || [];
      if (!s.length) return "Sávos (nincs sáv)";
      return `Sávos: ${s.length} sáv  (${fmt(s[0]?.osszeg)}–${fmt(s[s.length-1]?.osszeg)} Ft)`;
    }
    case "km":
      return `${fmt(szabaly.kmDijFtKm)} Ft/km${Number(szabaly.kmKuszobKm) > 0 ? ` (>${szabaly.kmKuszobKm} km küszöb)` : ""}`;
    case "fix_kiszallas":
      return `Fix kiszállás: ${fmt(szabaly.kiszallasiDij)} Ft`;
    default:
      return Number(szabaly.nettoBevitel) > 0 ? `${fmt(szabaly.nettoBevitel)} Ft` : "—";
  }
}

/**
 * Teszt-összeg: adott inputra mit ad egy szabály (pl. UI préview-hoz).
 */
export function previewSzabaly(szabaly, darabszam, tavKm) {
  return calcSzabalyOsszeg(szabaly, { darabszam, tavKm });
}
