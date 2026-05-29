/**
 * fovallalkozo.schema.js
 */

export const CSAPAT_BER_TIPUSOK = [
  { id: "fix",         label: "Fix összeg" },
  { id: "Ft/nap",      label: "Ft / munkanap" },
  { id: "Ft/nap/fő",   label: "Ft / munkanap / fő" },
  { id: "%",           label: "Bevétel %-a" },
];

export const UTIKOLTSÉG_TIPUSOK = [
  { id: "nincs",         label: "Nincs km elszámolás" },
  { id: "oda_vissza",    label: "Teljes oda-vissza km" },
  { id: "kuszob_folott", label: "Csak küszöb feletti km" },
  { id: "fix_kiszallas", label: "Fix kiszállási díj" },
  { id: "kezi",          label: "Kézi elszámolás" },
];

export const ANYAGKOLTSÉG_MODJAI = [
  { id: "tényleges",    label: "Tényleges (munkalap tételek)" },
  { id: "kalkulált%",   label: "Bevétel %-a" },
  { id: "fix",          label: "Fix összeg" },
  { id: "kézi",         label: "Kézi bevitel" },
];

export const KARTÉRÍTÉS_MODJAI = [
  { id: "tényleges", label: "Tényleges (rögzített kártérítések)" },
  { id: "limit%",    label: "Bevétel %-os limitje" },
  { id: "nincs",     label: "Nem kalkulálunk kártérítéssel" },
];

export const FOVALLALKOZO_SCHEMA = {
  id:                    "",
  nev:                   "",
  aktiv:                 true,
  alapUtikoltsegFtKm:    80,    // Ft/km alap
  alapSzamlazasiTipus:   "fix",
  megjegyzes:            "",
  createdAt:             "",
};

export const ELSZAMOLASI_SZABALY_SCHEMA = {
  id:                    "",
  fovallalkoziId:        "",
  munkatipus:            "",     // pl. "Napelem telepítés"
  aktiv:                 true,
  // Bevétel
  nettoBevitel:          0,      // Ft
  // Csapat bér
  csapatBerTipus:        "fix",
  csapatBerOsszeg:       0,
  // Útiköltség / Km-elszámolás
  utikoltsegTipus:       "oda_vissza",  // KM_TIPUSOK id-je
  utikoltsegFtKm:        0,             // 0 = fővállalkozó alapja
  kmKuszob:              0,             // küszöb km (kuszob_folott esetén)
  kmFixOsszeg:           0,             // fix kiszállási díj (fix_kiszallas esetén)
  // Tételes árak override (munkatípus tételdefiníció fölé írja)
  // { [tetelTipusId]: Ft } pl. { napelem_telepites: 15000 }
  tetelArak:             {},
  // Anyagköltség
  anyagkoltségModja:     "tényleges",
  anyagkoltségErtek:     0,      // % vagy fix összeg, ha nem tényleges
  // Kártérítés
  kartériétasModja:      "tényleges",
  kartériétasLimit:      0,      // % ha limit% mód
  megjegyzes:            "",
  createdAt:             "",
};

export const PROJEKT_PENZUGY_SCHEMA = {
  fovallalkoziId:        "",
  elszamolasiSzabalyId:  "",
  munkatipus:            "",
  csapatId:              "",
  tavKm:                 0,
  csapatLetszam:         1,
  munkanapok:            1,
  // Kézi felülírások (null = auto)
  felultBevitel:         null,
  keziCsapatBer:         null,
  keziUtikoltség:        null,
  keziAnyagkoltség:      null,
  keziKartérités:        null,
  emelőgepKoltseg:       0,
  egyebKoltseg:          0,
  // Állapot
  szabalyElteres:        false,
};
