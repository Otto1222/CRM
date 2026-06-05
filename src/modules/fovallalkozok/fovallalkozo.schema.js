/**
 * fovallalkozo.schema.js
 * Egyszerűsített sémák az elszámolási motorhoz.
 * A ELSZAMOLASI_MODOK és ELSZAMOLASI_MUNKATIPUSOK az elszamolasiMotor.js-ben vannak.
 */

export { ELSZAMOLASI_MODOK, ELSZAMOLASI_MUNKATIPUSOK } from "./elszamolasiMotor.js";

export const FOVALLALKOZO_SCHEMA = {
  id:         "",
  nev:        "",
  rovidites:  "",   // max 4 kar. – pl. "GH", "WS"
  aktiv:      true,
  megjegyzes: "",
  createdAt:  "",
};

/**
 * Elszámolási szabály – fővállalkozóhoz VAGY alvállalkozói csapathoz.
 *
 * tulajdonosId  = fővállalkozó id  (fovallalkozoi szabályoknál)
 *               = csapat id        (alvallalkozoi szabályoknál)
 *
 * Visszafelé kompatibilisan a régi fovallalkoziId mező is elfogadott.
 */
export const ELSZAMOLASI_SZABALY_SCHEMA = {
  id:            "",
  tulajdonosId:  "",      // fővállalkozó ID
  munkatipus:    "",      // "" = általános (minden munkatípusra)
  aktiv:         true,

  // Elszámolási mód – egy szabályhoz egy mód
  mod:           "fix",   // "fix" | "darab" | "savos" | "km" | "fix_kiszallas"

  // mod = "fix"
  fixOsszeg:     0,

  // mod = "darab"
  darabEgysegAr: 0,

  // mod = "savos"
  savok:         [],      // [{ tol: number, ig: number|"", osszeg: number }]

  // mod = "km"
  kmDijFtKm:     0,
  kmKuszobKm:    0,       // ez alatt nem jár km-díj

  // mod = "fix_kiszallas"
  kiszallasiDij: 0,

  megjegyzes:    "",
  createdAt:     "",
};

export const PROJEKT_PENZUGY_SCHEMA = {
  fovallalkoziId:      "",
  munkatipus:          "",
  csapatId:            "",
  darabszam:           1,
  tavKm:               0,
  csapatLetszam:       1,
  munkanapok:          1,
  // Kézi felülírások (null = auto-számítás)
  felultBevitel:       null,
  keziCsapatBer:       null,
  keziUtikoltség:      null,
  keziAnyagkoltság:    null,
  keziKartérités:      null,
  // Fix egyéb költségek
  emelőgepKoltseg:     0,
  daruKoltseg:         0,
  szallasKoltseg:      0,
  bereltEszkozKoltseg: 0,
  irodaAdminKoltseg:   0,
  egyebKoltseg:        0,
  szabalyElteres:      false,
};
