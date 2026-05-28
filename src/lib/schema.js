/**
 * schema.js
 * Verziókezelt, bővíthető adatschema
 * Új mezők, státuszok, típusok hozzáadása NEM töri meg a meglévő adatokat
 */

export const SCHEMA_VERSION = "2.0";

/** Munkalap alap schema – bővíthető */
export const MUNKALAP_SCHEMA = {
  version:          "2.0",
  // Azonosítók
  id:               "",
  ediSorszam:       "",
  dokumentumszam:   "",
  projektId:        "",
  fovallalkoiAzonosito: "",
  // Alapadatok
  munkalapTipus:    "Első kivitelezés",
  status:           "Megkezdésre Vár",
  statusSzin:       "#38BDF8",
  cimke:            "",
  cimkeSzin:        "#2563EB",
  // Ügyfél
  clientId:         null,
  clientNev:        "",
  clientCim:        "",
  clientTel:        "",
  clientEmail:      "",
  // Csapat
  assigneeId:       "",
  assigneeNev:      "",
  csapatNev:        "",
  // Dátumok
  date:             "",
  megkezdesIdopont: null,
  befejezesIdopont: null,
  lezarvaDate:      null,
  // Leírás
  projektMegnevezes:"",
  feladat:          "",
  description:      "",
  ertekesito:       "",
  // Pénzügy
  ar:               0,
  munkaeroDij:      0,
  kiszallasiDij:    0,
  egyebKolts:       0,
  // Állapot flagek
  megkezdve:        false,
  lezarva:          false,
  felmeresKesz:     false,
  forrasKiosztas:   false,
  // Tartalom
  items:            [],     // számlázási tételek
  anyagok:          [],     // felhasznált anyagok
  felmeres:         {},     // felmérési adatok
  alairas:          null,   // ügyfél aláírás
  felmeresAlairas:  null,
  // Meta
  createdAt:        "",
  updatedAt:        "",
  helyszinSorszam:  null,
};

/** Kártérítés schema */
export const KARTERITES_SCHEMA = {
  id:               "",
  projektId:        "",
  munkalapId:       "",
  osszeg:           0,
  ok:               "",
  datum:            "",
  rogzitoSzemely:   "",
  megjegyzes:       "",
  elfogadott:       null,   // null=függőben, true=elfogadott, false=elutasított
  createdAt:        "",
};

/** Dokumentum sablon schema */
export const SABLON_SCHEMA = {
  id:               "",
  nev:              "",
  tipus:            "egyeb",  // "atadasatvetes" | "felmeres" | "egyeb"
  tartalom:         "",       // HTML richtext
  fejlec:           null,     // base64 kép
  labléc:           null,     // base64 kép
  betutipus:        "Arial",
  aktiv:            true,
  createdAt:        "",
  updatedAt:        "",
};

/** Beállítások schema – minden konfigurálható */
export const BEALLITASOK_SCHEMA = {
  version:          "2.0",
  // Státuszok listája (bővíthető)
  statuszok:        null,     // null = defaults-ból tölt
  // Munkalap típusok (bővíthető)
  munkalapTipusok:  null,
  // Exportálható mezők konfigurációja
  exportMezok:      null,
  // Workflow lépések
  workflow:         null,
  // Drive integráció
  driveEnabled:     false,
  driveRootFolder:  "Claude/CRM/Munkák",
  // Cég adatok (dokumentumokhoz)
  cegNev:           "",
  cegCim:           "",
  cegAdoszam:       "",
  cegTel:           "",
  cegEmail:         "",
  cegLogo:          null,
  // Egyéb
  autoBackup:       true,
};

/** Séma migráció – régi adatokat frissíti az új formátumra */
export function migrateMunkalap(m) {
  return { ...MUNKALAP_SCHEMA, ...m, version: SCHEMA_VERSION };
}

export function loadBeallitasok() {
  try {
    const r = localStorage.getItem("beallitasok");
    return r ? { ...BEALLITASOK_SCHEMA, ...JSON.parse(r) } : { ...BEALLITASOK_SCHEMA };
  } catch { return { ...BEALLITASOK_SCHEMA }; }
}

export function saveBeallitasok(data) {
  localStorage.setItem("beallitasok", JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "beallitasok" } }));
}
