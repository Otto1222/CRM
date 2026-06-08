/**
 * anyagSzamito.service.js
 * Anyagszámítási Motor – Fázis 5A alapverzió.
 *
 * Cél: a projekt műszaki bemeneti adataiból (napelem-darabszám, tetőtípus,
 * tartószerkezet-típus, inverter/akku/smart meter/optimalizáló darabszám)
 * egy ELŐZETES anyaglistát számolni, amelyet a PM jóváhagyás után a
 * Kivitelezési Csomagba illeszthet (ld. addAnyagszamitoTetelekToKivitelezesiCsomag
 * a kivitelezesiCsomag.service.js-ben).
 *
 * EZ AZ ELSŐ, SZŰK VERZIÓ – tudatosan nem tartalmaz:
 *   - PDF generálást
 *   - raktárintegrációt
 *   - telepítői anyagelszámolást
 *   - pénzügyi tényköltség-számítást
 *
 * A cél most NEM a tökéletes képlet, hanem a helyes architektúra:
 *   - külön service (nem UI-ba égetett logika)
 *   - anyagtörzs-alapú (csak létező anyagtörzs-rekordra generál sort)
 *   - előnézetes és jóváhagyásos (a motor önmagában NEM ír semmilyen
 *     kollekcióba – tisztán számoló függvény, a beillesztés a PM
 *     jóváhagyása után, külön lépésben történik)
 *   - nem destruktív (meglévő tételeket nem ír felül, duplikációt nem hoz létre)
 */
import { getAnyag } from "../lib/anyagtorzs.js";

export const ANYAGSZAMITO_FORRAS = "anyagszamito";

/**
 * Szabály-konfiguráció – EGY HELYEN kezelve, nem szétszórva a kódban.
 *
 * Minden szabály:
 *   { id, anyagtorzsId, leiras, szamoltMennyiseg(bemenet), megjegyzes(bemenet) }
 *
 *   - anyagtorzsId: melyik anyagtörzs-rekordra mutat a szabály. A motor
 *     KIZÁRÓLAG akkor generál sort, ha ez a rekord LÉTEZIK az anyagtörzsben
 *     (ld. generateAnyagszamitas / hianyzoAnyagok – hamis sor soha nem jön létre).
 *   - szamoltMennyiseg(bemenet): a bemeneti adatokból számolt mennyiség.
 *     Ha az eredmény 0 vagy kisebb, a szabály nem generál sort.
 *   - megjegyzes(bemenet): a felhasznált képlet rövid, ember-olvasható leírása
 *     – ez kerül a kimeneti sor "megjegyzes" mezőjébe (átláthatóság a PM felé).
 *
 * FONTOS: ezek a szorzók KEZDETI, illusztratív becslések – a végleges,
 * pontos anyagszámítási képletek finomítása egy KÉSŐBBI fázis feladata.
 * Az anyagtorzsId-k a központi anyagtörzs (DEFAULT_ANYAGOK, ld. anyagtorzs.js)
 * meglévő rekordjaira mutatnak.
 */
export const ANYAGSZAMITO_SZABALYOK = [
  {
    id:           "kozepso_leszorito",
    anyagtorzsId: "a052", // Közép bilincs
    leiras:       "Köztes leszorító",
    szamoltMennyiseg: (be) => Math.max(0, (Number(be.napelemDarabszam) || 0) - 1) * 2,
    megjegyzes:   (be) => `(napelem darabszám − 1) × 2  =  (${Number(be.napelemDarabszam) || 0} − 1) × 2`,
  },
  {
    id:           "veg_leszorito",
    anyagtorzsId: "a053", // Szél bilincs
    leiras:       "Végleszorító",
    szamoltMennyiseg: (be) => (Number(be.napelemDarabszam) || 0) > 0 ? 4 : 0,
    megjegyzes:   () => "1 sortáblánként 4 db (kezdeti, fix becslés)",
  },
  {
    id:           "tartosin",
    anyagtorzsId: "a050", // Alumínium sín 40×40
    leiras:       "Tartósín",
    szamoltMennyiseg: (be) => (Number(be.napelemDarabszam) || 0) * 1.05,
    megjegyzes:   (be) => `napelem darabszám × 1,05 m  =  ${Number(be.napelemDarabszam) || 0} × 1,05`,
  },
  {
    id:           "inverter_ac_dc_segedanyag",
    anyagtorzsId: "a010", // MC4 csatlakozó
    leiras:       "AC/DC segédanyag (inverter)",
    szamoltMennyiseg: (be) => (Number(be.inverterDarabszam) || 0) * 4,
    megjegyzes:   (be) => `inverter darabszám × 4 db  =  ${Number(be.inverterDarabszam) || 0} × 4`,
  },
  {
    id:           "smart_meter_segedanyag",
    anyagtorzsId: "a012", // Kötődoboz IP65
    leiras:       "Smart meter segédanyag",
    szamoltMennyiseg: (be) => (Number(be.smartMeterDarabszam) || 0) * 1,
    megjegyzes:   (be) => `smart meter darabszám × 1 db  =  ${Number(be.smartMeterDarabszam) || 0} × 1`,
  },
  {
    id:           "akku_segedanyag",
    anyagtorzsId: "a005", // Akkumulátor kábel 50mm²
    leiras:       "Akku segédanyag",
    szamoltMennyiseg: (be) => (Number(be.akkuDarabszam) || 0) * 2,
    megjegyzes:   (be) => `akku darabszám × 2 m  =  ${Number(be.akkuDarabszam) || 0} × 2`,
  },
];

/**
 * Üres bemeneti objektum – a UI ezt használja kiindulásnak (Fázis 5A spec 2. pont).
 */
export function makeUresAnyagszamitoBemenet() {
  return {
    napelemDarabszam:      0,
    tetotipus:             "",
    tartoszerkezetTipus:   "",
    inverterDarabszam:     0,
    akkuDarabszam:         0,
    smartMeterDarabszam:   0,
    optimalizaloDarabszam: 0,
  };
}

/**
 * Anyaglista számítása a bemeneti adatokból (Fázis 5A spec 3–5. pont).
 *
 * TISZTÁN SZÁMOLÓ FÜGGVÉNY – nem ír semmilyen kollekcióba (sem
 * anyagtörzsbe, sem kivitelezési csomagba). Csak egy előnézeti listát
 * ad vissza, amit a hívó (UI) jóváhagyás után illeszthet be a csomagba.
 *
 * Anyagtörzs-kapcsolat: egy szabály csak akkor kerül az "anyaglista"-ba,
 * ha a hozzá tartozó anyagtorzsId LÉTEZIK az anyagtörzsben (getAnyag) –
 * különben a sor a "hianyzoAnyagok" listába kerül, és a függvény
 * "figyelmeztetes" szöveget is visszaad. Hamis / kitalált sor SOHA nem jön létre.
 *
 * Visszaadott alak:
 *   {
 *     anyaglista: [{
 *       anyagtorzs_id, megnevezes, kategoria, egyseg,
 *       szamoltMennyiseg, szamitasForrasa, megjegyzes
 *     }],
 *     hianyzoAnyagok: [{ anyagtorzsId, leiras, szamoltMennyiseg }],
 *     figyelmeztetes: string   // üres, ha nincs hiányzó anyag
 *   }
 */
export function generateAnyagszamitas(bemenet = {}) {
  const anyaglista = [];
  const hianyzoAnyagok = [];

  for (const szabaly of ANYAGSZAMITO_SZABALYOK) {
    const mennyiseg = szabaly.szamoltMennyiseg(bemenet);
    if (!(mennyiseg > 0)) continue;

    const anyag = getAnyag(szabaly.anyagtorzsId);
    if (!anyag) {
      hianyzoAnyagok.push({
        anyagtorzsId:     szabaly.anyagtorzsId,
        leiras:           szabaly.leiras,
        szamoltMennyiseg: Math.round(mennyiseg * 100) / 100,
      });
      continue;
    }

    anyaglista.push({
      anyagtorzs_id:    anyag.id,
      megnevezes:       anyag.nev || "",
      kategoria:        anyag.telepitoi_kategoria || anyag.kategoria || "",
      egyseg:           anyag.egyseg || "db",
      szamoltMennyiseg: Math.round(mennyiseg * 100) / 100,
      szamitasForrasa:  szabaly.id,
      megjegyzes:       szabaly.megjegyzes(bemenet),
    });
  }

  return {
    anyaglista,
    hianyzoAnyagok,
    figyelmeztetes: hianyzoAnyagok.length > 0
      ? `${hianyzoAnyagok.length} szükséges anyag nem található az anyagtörzsben – ezekhez nem generálódott sor (ld. lent a hiányzó anyagok listáját).`
      : "",
  };
}