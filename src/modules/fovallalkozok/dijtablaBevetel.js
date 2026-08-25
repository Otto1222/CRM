/**
 * dijtablaBevetel.js
 * Tétel-kosár alapú fővállalkozói bevétel – SHARED logika.
 *
 * FONTOS: két, egymástól független elszámoló motor él a kódbázisban
 * (workOrderFinancial.service.js = "Motor A", ez éles mindenhol a
 * dashboardon/riportokon/projektlistán; settlementCalculator.js = csak a
 * ProjektForm létrehozás-előnézete). Mindkettő ugyanígy kell kezelje a
 * díjtábla-tétel-kosarat (ld. DijtetelKosarPicker.jsx / dijtetelKatalogus.*),
 * ezért ez a függvény KÖZÖS – nem szabad ismét lemásolni egyik motorba sem,
 * mert pont ez a fajta duplikáció okozta, hogy a kosár-alapú bevétel eleinte
 * csak a form-előnézetben jelent meg helyesen, a valódi dashboardon/riportokon
 * nem (ld. git history – P0-012 javítás).
 */
import { calcSavosOsszeg, calcKmDijOsszeg } from "./elszamolasiMotor.js";

/**
 * @param {object} penzugy  – projekt.penzugy (tartalmazza a dijtablaTetelek
 *                             kosarat és a dijtablaKmDijFtKm pillanatképet)
 * @returns {object[]} beveteliTetelek – ugyanaz az alak, mint a régi
 *   szabály-motor beveteliTetelek listája, hogy a hívó oldal ne kelljen
 *   tudjon a különbségről.
 */
export function buildBeveteliTetelekKosarbol(penzugy) {
  const tetelek = penzugy?.dijtablaTetelek || [];
  const sorok = tetelek.map(t => {
    if (t.tipus === "savos") {
      const osszeg = calcSavosOsszeg(t.savok, t.mennyiseg);
      const sav = (t.savok || []).find(s => {
        const tol = Number(s.tol) || 0;
        const ig  = (s.ig !== "" && s.ig !== null && s.ig !== undefined) ? Number(s.ig) : Infinity;
        return (Number(t.mennyiseg) || 0) >= tol && (Number(t.mennyiseg) || 0) <= ig;
      });
      return {
        szabalyId:  t.katalogusTetelId,
        megnevezes: `${t.kod ? t.kod + " – " : ""}${t.nev} (${t.mennyiseg} ${t.egyseg})`,
        mod:        "dijtabla_savos",
        autoNetto:  osszeg,
        megjegyzes: sav
          ? `Sáv: ${sav.tol}–${sav.ig || "∞"} ${t.egyseg} · ${(Number(sav.osszeg)||0).toLocaleString("hu-HU")} Ft${sav.perDb ? "/db" : " (fix)"}`
          : "Nincs egyező sáv erre a mennyiségre",
        felulirva:  false,
        hiany:      !sav,
      };
    }
    return {
      szabalyId:   t.katalogusTetelId,
      megnevezes:  `${t.kod ? t.kod + " – " : ""}${t.nev} (${t.mennyiseg} ${t.egyseg})`,
      mod:         "dijtabla",
      autoNetto:   Math.round((Number(t.mennyiseg) || 0) * (Number(t.egysegar) || 0)),
      megjegyzes:  `${(Number(t.egysegar) || 0).toLocaleString("hu-HU")} Ft / ${t.egyseg}`,
      felulirva:   false,
      hiany:       false,
    };
  });

  const kellKm = tetelek.some(t => t.kmDij) && Number(penzugy?.dijtablaKmDijFtKm) > 0;
  if (kellKm) {
    // P0: km-küszöb támogatás – ha a fővállalkozó díjtétele (pl. "50 km
    // feletti többlet-kiszállás") csak a küszöb FELETTI részre számol
    // díjat, ahogy a klasszikus szabály-motor "km" módja is teszi
    // (ld. elszamolasiMotor.js). Küszöb nélkül (0/nincs megadva) a
    // viselkedés változatlan – a teljes táv számolódik, mint eddig.
    const kuszob = Number(penzugy?.dijtablaKmKuszobKm) || 0;
    const ftKm   = Number(penzugy?.dijtablaKmDijFtKm) || 0;
    const { odaVisszaTeljes, fizetendoKm, osszeg } = calcKmDijOsszeg(penzugy?.tavKm, kuszob, ftKm);
    sorok.push({
      szabalyId:  "dijtabla_km",
      megnevezes: kuszob > 0
        ? `Kiszállási díj (${kuszob} km felett, teljes oda-vissza ${odaVisszaTeljes} km – ebből fizetendő ${fizetendoKm} km)`
        : `Kiszállási díj (oda-vissza ${odaVisszaTeljes} km)`,
      mod:        "km",
      autoNetto:  osszeg,
      megjegyzes: `${ftKm.toLocaleString("hu-HU")} Ft/km${kuszob > 0 ? ` (${kuszob} km küszöb felett, a teljes oda-vissza távból)` : ""}`,
      felulirva:  false,
      hiany:      false,
    });
  }

  return sorok;
}

/** Igaz, ha a projekten van legalább 1 tétel a díjtábla-kosárban. */
export function vanDijtablaKosar(penzugy) {
  return Array.isArray(penzugy?.dijtablaTetelek) && penzugy.dijtablaTetelek.length > 0;
}
