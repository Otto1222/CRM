/**
 * csapat.schema.js – Alvállalkozói / saját csapat adatmodell
 */

export const CSAPAT_ELSZAMOLAS_TIPUSOK = [
  { id: "fix",         label: "Fix összeg / munka" },
  { id: "Ft/nap",      label: "Ft / munkanap" },
  { id: "Ft/nap/fő",   label: "Ft / munkanap / fő" },
  { id: "%",           label: "Bevétel %-a (jutalék)" },
  { id: "darab",       label: "Darabszám × egységár" },
  { id: "kezi",        label: "Kézi megadás" },
];

export const CSAPAT_TIPUSOK = [
  { id: "sajat",        label: "Saját csapat" },
  { id: "alvallalkozo", label: "Alvállalkozó csapat" },
];

export const CSAPAT_TAG_SZEREPEK = [
  "Vezető telepítő",
  "Telepítő",
  "Segéd",
  "Villanyszerelő",
  "Sofőr",
  "Egyéb",
];

export const CSAPAT_TAG_SCHEMA = {
  id:        "",
  csapatId:  "",
  nev:       "",
  szerep:    "Telepítő",
  napiBer:   0,   // Ft/nap (ha > 0, ez az alapja a számításnak)
  oradij:    0,   // Ft/óra (alternatív)
  aktiv:     true,
  createdAt: "",
  updatedAt: "",
};

export const CSAPAT_KIOSZTASI_TIPUSOK = [
  { id: "focsapat", label: "Főcsapat" },
  { id: "segito",   label: "Segítő csapat" },
];

export const CSAPAT_KIOSZTASI_SCHEMA = {
  id:         "",
  csapatId:   "",
  csapatNev:  "",
  csapatSzin: "",
  tipus:      "focsapat",   // "focsapat" | "segito"
  datumTol:   "",
  datumIg:    "",
  megjegyzes: "",
};

export const CSAPAT_SCHEMA = {
  id:               "",
  nev:              "",
  tipus:            "sajat",   // "sajat" | "alvallalkozo"
  telephely:        "",
  szin:             "#2563EB",
  tagok:            [],     // user ID-k (CRM felhasználók, backward compat)
  tagNevek:         [],     // user nevek (backward compat)
  kapacitas:        2,      // db munka/nap
  hetvegen:         false,
  munkatipusok:     [],
  // ── Napi kiosztás-tervező (ld. utemezesOptimalizalo.js) ────────
  // A telephely geokódolt koordinátája – gyorsítótárazva, hogy ne kelljen
  // minden tervezéskor újra lekérdezni. geoCimSzoveg jelzi, melyik cím-
  // szöveghez tartozik a lat/lon, hogy a telephely módosítása után a
  // rendszer észrevegye, hogy újra kell geokódolni.
  lat:              null,
  lon:              null,
  geoCimSzoveg:     "",
  // Munkatípusonként, ennél a konkrét csapatnál: hány db-ot bír egy nap
  // alatt – { [munkatipusId]: maxDb }. Ha egy típusra nincs itt érték,
  // az általános "kapacitas" mező az alapértelmezett.
  maxNapiMunka:     {},
  aktiv:            true,
  // ── Alvállalkozói elszámolás ──────────────────────────────
  elszamolasAktiv:  false,
  elszamolasInfo:   "",
  dijTipus:         "fix",
  dijOsszeg:        0,
  dijEgysegAr:      0,
  // Km elszámolás
  kmElszamolasAktiv: false,
  kmDijFtKm:        0,
  kmKuszobKm:       0,
  createdAt:        "",
  updatedAt:        "",
  createdBy:        "",
};
