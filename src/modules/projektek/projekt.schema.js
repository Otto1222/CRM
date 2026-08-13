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

// penzugy beágyazott objektum alapértékei (projekt.penzugy-on belül)
export const PENZUGY_DEFAULTS = {
  fovallalkoziId:       "",
  munkatipus:           "",
  elszamolasiSzabalyId: "",
  tavKm:                0,
  tavKmForras:          "",  // "auto" | "kezi" | "" – honnan jött az érték
  tavKmNaplo:           "",  // kézi felülírás indoklása (kötelező ha tavKmForras==="kezi")
  csapatLetszam:        1,
  munkanapok:           1,
  darabszam:            1,
  felultBevitel:        null,
  keziCsapatBer:        null,
  keziUtikoltség:       null,
  keziAnyagkoltség:     null,
  keziKartérités:       null,
};

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
  // Fázis 4A: az "elfogadottAjanlatId" szerepét a már meglévő ajanlatId tölti be
  // (ld. AJANLAT_MEZO_SZOTAR-mintájú döntés – nincs duplikált mező).
  ajanlatId:           null,
  // Fázis 4A – immutábilis pillanatkép az elfogadott ajánlatról: a projekt
  // létrehozásakor készül EGYSZER (deep clone), utána soha nem frissül –
  // sem ajánlatmódosítás, sem anyagtörzs-árváltozás nem írhatja felül.
  // null = a projekt nem elfogadott ajánlatból jött létre (pl. fővállalkozói/belső).
  elfogadottAjanlatPillanatkep: null,
  // P0-007: "Saját munka" (forrás==="sajat_ajanlat") két alfajtát fed le –
  // ez a mező dönti el, melyik a mérvadó forrás. Csak forrás==="sajat_ajanlat"
  // esetén értelmezett; üres string = régi projekt / még nem választott.
  //   "ajanlat"      – a régi, már működő folyamat: elfogadottAjanlatPillanatkep a mérvadó.
  //   "tetelesExcel" – új folyamat: egy már elfogadott, külső tételes Excel a mérvadó
  //                    (nincs in-app ajánlat), ld. elfogadottExcelPillanatkep.
  sajatMunkaTipus:     "",
  // Immutábilis pillanatkép a felöltött, elfogadott tételes Excelről – a
  // projekt létrehozásakor/Excel-importkor rögzül EGYSZER, utána nem frissül.
  // Az elfogadottAjanlatPillanatkep excel-alapú megfelelője: ugyanúgy ebből
  // generálódik a Kivitelezési Csomag tétellistája (ld. kivitelezesiCsomag.schema.js
  // generateKiviTetelekFromExcelPillanatkep). null = nincs Excel-import.
  elfogadottExcelPillanatkep: null,
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
