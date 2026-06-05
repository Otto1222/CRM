/**
 * penzugyi.schema.js
 * Pénzügyi rekord adatmodell – projektId alapján kapcsolódik.
 * Soha ne tárolj itt projekt adatokat (nev, clientNev stb.) – csak projektId hivatkozás.
 */

export const PENZUGYI_SCHEMA = {
  id:                       "",
  projektId:                "",
  projektForras:            "",      // sajat_ajanlat | fovallalkozoi_munka | belso_munka
  bevetelTipus:             "nincs", // ajanlat | fovallalkozoi | nincs

  // Bevétel (nettó)
  bevetelNetto:             0,

  // Költségek (nettó) – forrástól függően töltendő
  anyagKoltsegNetto:        0,
  sajatCsapatKoltsegNetto:  0,
  alvallalkozoKoltsegNetto: 0,
  kiszallasKoltsegNetto:    0,
  emeloKoltsegNetto:        0,
  egyebKoltsegNetto:        0,
  osszesKoltsegNetto:       0,

  // Kalkulált eredmény
  profitNetto:              0,
  fedezetSzazalek:          null,

  // Státuszgépek
  elszamolasStatusz: "Nincs előkészítve",  // Nincs előkészítve | Előkészítve | Ellenőrzés alatt | Jóváhagyva | Javítani kell
  szamlazasStatusz:  "Nem számlázható",    // Nem számlázható | Számlázható | Számlázva | Kifizetve
  tigStatusz:        "Nem szükséges",      // Nem szükséges | Szükséges | Elkészítés alatt | Kiküldve | Elfogadva | Hiánypótlás

  // Megjegyzések
  elszamolasNotes: "",
  tigNotes:        "",

  // Audit
  createdAt:  "",
  updatedAt:  "",
  createdBy:  "",
  updatedBy:  "",
  version:    1,
  syncStatus: "synced",
};
