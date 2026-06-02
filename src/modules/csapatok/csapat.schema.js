/**
 * csapat.schema.js – Alvállalkozói csapat adatmodell
 * Spec 2. pont: minden csapatnak saját elszámolási szabálya lehet
 */

export const CSAPAT_ELSZAMOLAS_TIPUSOK = [
  { id: "fix",         label: "Fix összeg / munka" },
  { id: "Ft/nap",      label: "Ft / munkanap" },
  { id: "Ft/nap/fő",   label: "Ft / munkanap / fő" },
  { id: "%",           label: "Bevétel %-a (jutalék)" },
  { id: "darab",       label: "Darabszám × egységár" },
  { id: "kezi",        label: "Kézi megadás" },
];

export const CSAPAT_SCHEMA = {
  id:               "",
  nev:              "",
  telephely:        "",
  szin:             "#2563EB",
  tagok:            [],     // user ID-k
  tagNevek:         [],     // user nevek
  kapacitas:        2,      // db munka/nap
  hetvegen:         false,
  munkatipusok:     [],
  aktiv:            true,
  // ── Alvállalkozói elszámolás ──────────────────────────────
  elszamolasAktiv:  false,  // ha false → nem tároljuk az alvállalkozói bért
  elszamolasInfo:   "",     // megjegyzés (pl. "Szóbeli megállapodás")
  dijTipus:         "fix",  // CSAPAT_ELSZAMOLAS_TIPUSOK id
  dijOsszeg:        0,      // Ft vagy %
  dijEgysegAr:      0,      // darab típusnál Ft/db
  // Km elszámolás
  kmElszamolasAktiv: false,
  kmDijFtKm:        0,      // ha 0 → projekt szabály alapja
  kmKuszobKm:       0,
  createdAt:        "",
  updatedAt:        "",
  createdBy:        "",
};
