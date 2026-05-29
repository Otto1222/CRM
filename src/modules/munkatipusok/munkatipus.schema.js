/**
 * munkatipus.schema.js
 * Munkatípusok – admin szerkeszthető, nem hardcode.
 * Árlogika típusok és alapértelmezett munkatípusok.
 */

// Árszámítás módja egy munkadíj tételnél
export const ARLOGIKA_TIPUSOK = [
  { id: "darab_egysegar",    label: "Darabszám × egységár" },
  { id: "tartomany_fix",     label: "Darabszám-tartomány → fix ár" },
  { id: "fix_osszeg",        label: "Fix összeg (darabszámtól független)" },
  { id: "kezi",              label: "Kézi megadás" },
];

// Km-elszámolás típusok
export const KM_TIPUSOK = [
  { id: "nincs",          label: "Nincs km elszámolás" },
  { id: "oda_vissza",     label: "Teljes oda-vissza km" },
  { id: "kuszob_folott",  label: "Csak küszöb feletti km" },
  { id: "fix_kiszallas",  label: "Fix kiszállási díj" },
  { id: "kezi",           label: "Kézi megadás" },
];

// Bevételi tétel típusok (a munkalapon jelennek meg)
export const BEVETELI_TETEL_TIPUSOK = [
  { id: "napelem_telepites",   label: "Napelem telepítési díj" },
  { id: "rendszerbovites",     label: "Rendszerbővítési díj" },
  { id: "inverter_csere",      label: "Inverter csere díj" },
  { id: "akku_telepites",      label: "Akkumulátor telepítési díj" },
  { id: "akku_csere",          label: "Akkumulátor csere díj" },
  { id: "okosmerot_telepites", label: "Okosmérő telepítési díj" },
  { id: "autotolto_telepites", label: "Autótöltő telepítési díj" },
  { id: "villanyszerelo",      label: "Villanyszerelői díj" },
  { id: "km_elszamolas",       label: "Kilométer elszámolás" },
  { id: "egyeb_bevetel",       label: "Egyéb bevétel" },
];

// Költségtétel típusok
export const KOLTSEG_TETEL_TIPUSOK = [
  { id: "csapat_ber",      label: "Csapat bére" },
  { id: "utikoltség",      label: "Útiköltség" },
  { id: "anyagkoltség",    label: "Anyagköltség" },
  { id: "alvallalkozo",    label: "Alvállalkozó" },
  { id: "emelőgep",        label: "Emelőgép" },
  { id: "karterités",      label: "Kártérítés" },
  { id: "egyeb_koltseg",   label: "Egyéb költség" },
];

// Munkatípus adatmodell
export const MUNKATIPUS_SCHEMA = {
  id:           "",
  nev:          "",          // pl. "Napelemes rendszer telepítés"
  leiras:       "",
  aktiv:        true,
  // Milyen bevételi tételeket generál automatikusan
  beveteliTetelek: [],       // [{tetelTipusId, arlogikaTipus, ...}]
  createdAt:    "",
};

// Egy bevételi tételdefiníció a munkatípuson belül
export const MUNKATIPUS_BEVETELI_TETEL_SCHEMA = {
  id:              "",
  tetelTipusId:    "",        // BEVETELI_TETEL_TIPUSOK id-je
  arlogikaTipus:   "fix_osszeg",
  // darab_egysegar esetén
  egysegAr:        0,
  // tartomany_fix esetén
  tartomanyok:     [],        // [{tol, ig, ar}] pl. [{tol:1,ig:5,ar:150000}]
  // fix esetén
  fixOsszeg:       0,
  megjegyzes:      "",
};

// Alapértelmezett munkatípusok (betöltés ha localStorage üres)
export const DEFAULT_MUNKATIPUSOK = [
  {
    id: "mt_napelem_telepites",
    nev: "Napelemes rendszer telepítés",
    leiras: "Új napelemes rendszer kiépítése",
    aktiv: true,
    beveteliTetelek: [
      { id: "bt1", tetelTipusId: "napelem_telepites", arlogikaTipus: "darab_egysegar", egysegAr: 0, tartomanyok: [], fixOsszeg: 0, megjegyzes: "" },
      { id: "bt2", tetelTipusId: "km_elszamolas",     arlogikaTipus: "kezi",           egysegAr: 0, tartomanyok: [], fixOsszeg: 0, megjegyzes: "" },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "mt_rendszerbovites",
    nev: "Rendszerbővítés",
    leiras: "Meglévő napelemes rendszer bővítése",
    aktiv: true,
    beveteliTetelek: [
      { id: "bt3", tetelTipusId: "rendszerbovites", arlogikaTipus: "darab_egysegar", egysegAr: 0, tartomanyok: [], fixOsszeg: 0, megjegyzes: "" },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "mt_inverter_akku_csere",
    nev: "Inverter + akkumulátor csere",
    leiras: "Inverter és/vagy akkumulátor csere",
    aktiv: true,
    beveteliTetelek: [
      { id: "bt4", tetelTipusId: "inverter_csere", arlogikaTipus: "fix_osszeg", egysegAr: 0, tartomanyok: [], fixOsszeg: 0, megjegyzes: "" },
      { id: "bt5", tetelTipusId: "akku_csere",     arlogikaTipus: "fix_osszeg", egysegAr: 0, tartomanyok: [], fixOsszeg: 0, megjegyzes: "" },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "mt_akku_telepites",
    nev: "Csak akkumulátor telepítés",
    leiras: "Önálló akkumulátor telepítés",
    aktiv: true,
    beveteliTetelek: [
      { id: "bt6", tetelTipusId: "akku_telepites", arlogikaTipus: "fix_osszeg", egysegAr: 0, tartomanyok: [], fixOsszeg: 0, megjegyzes: "" },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: "mt_akku_okos",
    nev: "Akkumulátor + okosmérő kiépítés",
    leiras: "Akkumulátor és okosmérő együttes telepítése",
    aktiv: true,
    beveteliTetelek: [
      { id: "bt7", tetelTipusId: "akku_telepites",      arlogikaTipus: "fix_osszeg", egysegAr: 0, tartomanyok: [], fixOsszeg: 0, megjegyzes: "" },
      { id: "bt8", tetelTipusId: "okosmerot_telepites", arlogikaTipus: "fix_osszeg", egysegAr: 0, tartomanyok: [], fixOsszeg: 0, megjegyzes: "" },
    ],
    createdAt: new Date().toISOString(),
  },
];
