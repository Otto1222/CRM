/**
 * projekt.schema.js
 * Re-exportálja a workflowRules.js-ből a projekt-specifikus konstansokat,
 * és definiálja az adatmodellt.
 */

export {
  PROJEKT_STATUSZOK,
  PROJEKT_FORRAS,
  LEGACY_PROJEKT_STATUS_MAP as LEGACY_STATUS_MAP,
  LEGACY_FORRAS_MAP,
  getProjektStatusConfig as getStatusConfig,
  getProjektStatusConfig,
  getProjektTipus,
  migrateProjektStatus,
  migrateProjektForras,
  // D1 – Anyagelszámolási mód (nincs automatikus default!)
  ANYAGELSZAMOLAS_NINCS_KIVALASZTVA,
  ANYAGELSZAMOLASI_MODOK,
  getAnyagelszamolasiModConfig,
  hasAnyagelszamolasiMod,
  migrateAnyagelszamolasiMod,
  validateAnyagelszamolasiModStatusValtas,
} from "../../lib/workflowRules.js";

export const PROJEKT_SCHEMA_VERSION = "2.1";

export const PROJEKT_TIPUSOK = [
  "Napelem telepítés",
  "Napelem csere",
  "Akkumulátor telepítés",
  "Szerviz / karbantartás",
  "Felmérés",
  "Garanciális munka",
  "Egyéb",
];

export const PROJEKT_SCHEMA = {
  id:                  "",
  projektkod:          "",
  kulsoAzonosito:      "",
  nev:                 "",
  clientId:            null,
  megbizoCeg:          "",
  clientNev:           "",
  clientCim:           "",
  clientTel:           "",
  clientEmail:         "",
  kapcsolattarto:      "",
  telepitesiCim:       "",
  tipus:               "Napelem telepítés",
  status:              "Létrehozva",
  napelemDb:           0,
  inverterDb:          0,
  akkumulatorDb:       0,
  smartMeterDb:        0,
  akkumulator:         false,
  okosmerő:            false,
  autoTolto:           false,
  projektvezetoId:     "",
  projektvezetoNev:    "",
  csapatId:            "",
  csapatNev:           "",
  tervezettKezdes:     "",
  tervezettBefejezes:  "",
  valoKezdes:          "",
  valoBefejezes:       "",
  elvegzettMunkaora:   0,
  munkalapIds:         [],
  dokumentumIds:       [],
  elfogadottAjanlat:   0,
  megjegyzesek:        [],
  esemenynaplo:        [],
  forrás:              "",
  // D1: kötelező választás projekt létrehozáskor – NINCS automatikus default
  // (egy téves "SAJAT_ANYAG_PROFIT" alapérték fővállalkozói munkánál hibás
  // profitot számolna – pénzügyi katasztrófa). Migrált régi projektek is
  // ide kerülnek, adminReviewRequired = true jelzéssel.
  anyagelszamolasiMod: "NINCS_KIVALASZTVA",
  adminReviewRequired: false,
  projektTipus:        "",
  ajanlatId:           null,
  fovKapcsolattarto:   "",
  fovFizetesiHatarido: "",
  fovMegjegyzes:       "",
  driveProjektMappa:   "",
  createdAt:           "",
  updatedAt:           "",
  createdBy:           "",
  updatedBy:           "",
  version:             1,
  syncStatus:          "synced",
};
