/**
 * workFeeCalculation.service.js
 * Munkadíj számítás árlogika típusonként.
 */

/**
 * Tartomány keresés: darabszámhoz megkeresi az első egyező tartomány árát.
 * tartomanyok: [{tol, ig, ar}] – pl. [{tol:1,ig:5,ar:150000},{tol:6,ig:20,ar:250000}]
 */
export function findTartomanyAr(tartomanyok = [], darabszam) {
  const db = Number(darabszam) || 0;
  const egyezo = tartomanyok.find(t => db >= (t.tol || 0) && db <= (t.ig ?? Infinity));
  return egyezo?.ar ?? null;
}

/**
 * Egy bevételi tételdefinícióra kiszámolja a nettó bevételt.
 * @param {object} tetelDef  – MUNKATIPUS_BEVETELI_TETEL_SCHEMA
 * @param {object} params    – { darabszam, keziOsszeg }
 * @returns {{ netto: number, megjegyzes: string, hiany: boolean }}
 */
export function calcMunkaDij(tetelDef, params = {}) {
  if (!tetelDef) return { netto: 0, megjegyzes: "Nincs tételdefiníció", hiany: true };
  const { darabszam = 1, keziOsszeg = null } = params;
  const db = Number(darabszam) || 1;

  switch (tetelDef.arlogikaTipus) {
    case "darab_egysegar": {
      const egyseg = Number(tetelDef.egysegAr) || 0;
      if (!egyseg) return { netto: 0, megjegyzes: "Nincs egységár megadva", hiany: true };
      const osszeg = Math.round(db * egyseg);
      return { netto: osszeg, megjegyzes: `${db} db × ${egyseg} Ft = ${osszeg} Ft`, hiany: false };
    }

    case "tartomany_fix": {
      const ar = findTartomanyAr(tetelDef.tartomanyok, db);
      if (ar === null) return { netto: 0, megjegyzes: `Nincs egyező tartomány ${db} db-hoz`, hiany: true };
      return { netto: ar, megjegyzes: `${db} db → tartomány-ár: ${ar} Ft`, hiany: false };
    }

    case "fix_osszeg": {
      const fix = Number(tetelDef.fixOsszeg) || 0;
      if (!fix) return { netto: 0, megjegyzes: "Nincs fix összeg megadva", hiany: true };
      return { netto: fix, megjegyzes: `Fix díj: ${fix} Ft`, hiany: false };
    }

    case "kezi":
      return {
        netto: Number(keziOsszeg) || 0,
        megjegyzes: "Kézi megadás szükséges",
        hiany: keziOsszeg === null || keziOsszeg === undefined,
      };

    default:
      return { netto: 0, megjegyzes: "Ismeretlen árlogika", hiany: true };
  }
}
