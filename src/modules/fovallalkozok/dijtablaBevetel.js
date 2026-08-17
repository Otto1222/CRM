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

/**
 * @param {object} penzugy  – projekt.penzugy (tartalmazza a dijtablaTetelek
 *                             kosarat és a dijtablaKmDijFtKm pillanatképet)
 * @returns {object[]} beveteliTetelek – ugyanaz az alak, mint a régi
 *   szabály-motor beveteliTetelek listája, hogy a hívó oldal ne kelljen
 *   tudjon a különbségről.
 */
export function buildBeveteliTetelekKosarbol(penzugy) {
  const tetelek = penzugy?.dijtablaTetelek || [];
  const sorok = tetelek.map(t => ({
    szabalyId:   t.katalogusTetelId,
    megnevezes:  `${t.kod ? t.kod + " – " : ""}${t.nev} (${t.mennyiseg} ${t.egyseg})`,
    mod:         "dijtabla",
    autoNetto:   Math.round((Number(t.mennyiseg) || 0) * (Number(t.egysegar) || 0)),
    megjegyzes:  `${(Number(t.egysegar) || 0).toLocaleString("hu-HU")} Ft / ${t.egyseg}`,
    felulirva:   false,
    hiany:       false,
  }));

  const kellKm = tetelek.some(t => t.kmDij) && Number(penzugy?.dijtablaKmDijFtKm) > 0;
  if (kellKm) {
    const odaVissza = (Number(penzugy?.tavKm) || 0) * 2;
    sorok.push({
      szabalyId:  "dijtabla_km",
      megnevezes: `Kiszállási díj (oda-vissza ${odaVissza} km)`,
      mod:        "km",
      autoNetto:  Math.round(odaVissza * (Number(penzugy?.dijtablaKmDijFtKm) || 0)),
      megjegyzes: `${penzugy?.dijtablaKmDijFtKm?.toLocaleString?.("hu-HU") || 0} Ft/km`,
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
