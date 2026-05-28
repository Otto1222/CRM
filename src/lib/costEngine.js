/**
 * costEngine.js
 * Központi költségszámítási motor
 * Minden pénzügyi számítás IDE kerül – soha nem UI-ban
 *
 * Bővíthető: alvállalkozói elszámolás, bérszámítás,
 * kiszállási optimalizálás, profitabilitás elemzés
 */

import { loadKarteritesek } from "./karterites";

// ─── Alap számítások ─────────────────────────────────────────

/** Items (számlázási tételek) bruttó összege */
export function calcItemsBrutto(items = []) {
  return items.reduce((s, i) => {
    const net = i.net || i.ar || 0;
    const qty = i.qty || i.mennyiseg || 1;
    const vat = i.vat ?? 27;
    return s + net * qty * (1 + vat / 100);
  }, 0);
}

/** Items nettó összege */
export function calcItemsNetto(items = []) {
  return items.reduce((s, i) => {
    const net = i.net || i.ar || 0;
    const qty = i.qty || i.mennyiseg || 1;
    return s + net * qty;
  }, 0);
}

/** Egy munkalap bevétele */
export function calcBevetal(m) {
  if (m.ar && m.ar > 0) return m.ar;
  return calcItemsBrutto(m.items);
}

/** Egy munkalap összes költsége */
export function calcOsszesKolts(m, karteritesek = null) {
  const kt = karteritesek ?? loadKarteritesek();
  const anyagKolts   = calcItemsNetto(m.items);
  const munkaeroDij  = m.munkaeroDij  || 0;
  const kiszDij      = m.kiszallasiDij|| 0;
  const egyeb        = m.egyebKolts   || 0;
  const kartElf      = kt
    .filter(k => k.munkalapId === m.id && k.elfogadott === true)
    .reduce((s, k) => s + (k.osszeg || 0), 0);
  return anyagKolts + munkaeroDij + kiszDij + egyeb + kartElf;
}

/** Részletes pénzügyi kimutatás egy munkalaphoz */
export function calcMunkalapPenzugy(m, karteritesek = null) {
  const kt           = karteritesek ?? loadKarteritesek();
  const bevetal      = calcBevetal(m);
  const anyagKolts   = calcItemsNetto(m.items);
  const munkaeroDij  = m.munkaeroDij  || 0;
  const kiszDij      = m.kiszallasiDij|| 0;
  const egyeb        = m.egyebKolts   || 0;
  const kartElf      = kt.filter(k => k.munkalapId === m.id && k.elfogadott === true)
                          .reduce((s, k) => s + (k.osszeg || 0), 0);
  const kartFuggo    = kt.filter(k => k.munkalapId === m.id && k.elfogadott === null)
                          .reduce((s, k) => s + (k.osszeg || 0), 0);
  const kartElut     = kt.filter(k => k.munkalapId === m.id && k.elfogadott === false)
                          .reduce((s, k) => s + (k.osszeg || 0), 0);
  const osszesKolts  = anyagKolts + munkaeroDij + kiszDij + egyeb + kartElf;
  const eredmeny     = bevetal - osszesKolts;
  const haszonPct    = bevetal > 0 ? Math.round((eredmeny / bevetal) * 100) : null;
  const nyereseg     = eredmeny >= 0;
  return {
    bevetal, anyagKolts, munkaeroDij, kiszDij, egyeb,
    kartElf, kartFuggo, kartElut,
    osszesKolts, eredmeny, haszonPct, nyereseg,
  };
}

/** Projekt szintű összesítés (több munkalap) */
export function calcProjektPenzugy(munkalapok, projektId = null, karteritesek = null) {
  const kt   = karteritesek ?? loadKarteritesek();
  const list = projektId
    ? munkalapok.filter(m => m.projektId === projektId || m.id === projektId)
    : munkalapok;
  return list.reduce((acc, m) => {
    const p = calcMunkalapPenzugy(m, kt);
    return {
      bevetal:     acc.bevetal     + p.bevetal,
      osszesKolts: acc.osszesKolts + p.osszesKolts,
      eredmeny:    acc.eredmeny    + p.eredmeny,
      kartElf:     acc.kartElf     + p.kartElf,
      darab:       acc.darab       + 1,
    };
  }, { bevetal:0, osszesKolts:0, eredmeny:0, kartElf:0, darab:0 });
}

/** Csapat teljesítmény összesítés */
export function calcCsapatTeljesitmeny(munkalapok, csapatNev, karteritesek = null) {
  const kt   = karteritesek ?? loadKarteritesek();
  const sajat = munkalapok.filter(m =>
    m.assigneeNev === csapatNev || m.csapatNev === csapatNev
  );
  return {
    ...calcProjektPenzugy(sajat, null, kt),
    lezart:    sajat.filter(m => ["Lezárva","Számlázva"].includes(m.status)).length,
    aktiv:     sajat.filter(m => !["Lezárva","Számlázva","Meghiúsult"].includes(m.status)).length,
    csapatNev,
  };
}

// ─── Jövőbeni bővítési pontok ────────────────────────────────
// TODO: alvallalkozoElszamolas(munkalapId, tevekeny)
// TODO: berszamitas(csapatNev, idoszak)
// TODO: kiszallasiOptimalizalas(munkalapok, csapatok)
// TODO: profitabilitasElemzes(munkalapok, idoszak)
