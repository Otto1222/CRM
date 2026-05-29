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
  { id: "nincs",  label: "Nincs útiköltség" },
  { id: "Ft/km",  label: "Ft / km (oda-vissza)" },
  { id: "fix",    label: "Fix összeg" },
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
  // Útiköltség
  utikoltsegTipus:       "Ft/km",
  utikoltsegFtKm:        0,      // 0 = fővállalkozó alapja
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
