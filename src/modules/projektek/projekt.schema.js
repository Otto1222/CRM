/**
 * projekt.schema.js
 * Projekt adatmodell és konstansok
 */

export const PROJEKT_SCHEMA_VERSION = "1.0";

export const PROJEKT_FORRAS = [
  { id: "saját_ügyfél",  label: "Saját ügyfél",           color: "#2563EB", bg: "#EFF6FF" },
  { id: "fővállalkozói", label: "Fővállalkozói megbízás",  color: "#7C3AED", bg: "#F5F3FF" },
  { id: "garanciális",   label: "Garanciális munka",        color: "#D97706", bg: "#FFFBEB" },
  { id: "javítási",      label: "Javítási munka",           color: "#059669", bg: "#ECFDF5" },
];

export function getProjektTipus(forras) {
  return forras === "fővállalkozói" ? "Fővállalkozói projekt" : "Saját projekt";
}

export const PROJEKT_STATUSZOK = [
  { id: "Felmérésre vár",            szin: "#0EA5E9", bg: "#F0F9FF" },
  { id: "Felmérve",                  szin: "#6366F1", bg: "#EEF2FF" },
  { id: "Ajánlat kiküldve",          szin: "#D97706", bg: "#FFFBEB" },
  { id: "Elbukott Projekt",          szin: "#DC2626", bg: "#FEF2F2" },
  { id: "Elfogadva",                 szin: "#059669", bg: "#ECFDF5" },
  { id: "Kivitelezésre vár",         szin: "#EA580C", bg: "#FFF7ED" },
  { id: "Kivitelezés alatt",         szin: "#2563EB", bg: "#EFF6FF" },
  { id: "Elkészült",                 szin: "#0891B2", bg: "#ECFEFF" },
  { id: "Ellenőrzésre vár",          szin: "#8B5CF6", bg: "#F5F3FF" },
  { id: "Hiánypótlás",               szin: "#B45309", bg: "#FFFBEB" },
  { id: "Ellenőrizve minden rendben",szin: "#0369A1", bg: "#F0F9FF" },
  { id: "Leszámlázva",               szin: "#15803D", bg: "#F0FDF4" },
  { id: "Kifizetve",                 szin: "#166534", bg: "#DCFCE7" },
  { id: "Lezárva",                   szin: "#475569", bg: "#F8FAFC" },
];

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
  version:             PROJEKT_SCHEMA_VERSION,
  id:                  "",
  projektkod:          "",          // auto: PRJ-2026-001
  kulsoAzonosito:      "",          // fővállalkozói szám
  nev:                 "",
  // Ügyfél és megbízó
  clientId:            null,
  megbizoCeg:          "",          // Megbízó cég neve (spec 1. pont)
  clientNev:           "",
  clientCim:           "",
  clientTel:           "",
  clientEmail:         "",
  kapcsolattarto:      "",
  telepitesiCim:       "",
  // Projekt adatok
  tipus:               "Napelem telepítés",
  status:              "Felmérésre vár",
  // Műszaki adatok
  napelemDb:           0,
  inverterDb:          0,
  akkumulatorDb:       0,    // db szám (régi: akkumulator boolean)
  smartMeterDb:        0,    // db szám (régi: okosmerő boolean)
  akkumulator:         false, // backward compat
  okosmerő:            false, // backward compat
  autoTolto:           false,
  // Csapat
  projektvezetoId:     "",
  projektvezetoNev:    "",
  csapatId:            "",
  csapatNev:           "",
  // Ütemezés
  tervezettKezdes:     "",
  tervezettBefejezes:  "",
  valoKezdes:          "",
  valoBefejezes:       "",
  elvegzettMunkaora:   0,
  // Kapcsolódó entitások (ID tömbök)
  munkalapIds:         [],
  dokumentumIds:       [],
  // Pénzügy (manuálisan rögzített)
  elfogadottAjanlat:   0,
  // Kommunikáció, napló
  megjegyzesek:        [],   // [{ id, datum, user, szoveg }]
  esemenynaplo:        [],   // [{ id, datum, user, esemeny, reszletek }]
  // Projekt forrása és típusa
  forrás:              "",   // saját_ügyfél | fővállalkozói | garanciális | javítási
  projektTipus:        "",   // Saját projekt | Fővállalkozói projekt (derived from forrás)
  ajanlatId:           null, // linked Árajánlat ID (saját ügyfél flow)
  // Fővállalkozói extra adatok
  fovKapcsolattarto:   "",
  fovFizetesiHatarido: "",
  fovMegjegyzes:       "",
  // Drive integráció
  driveProjektMappa:   "",   // "" | "kérve" | "kész"
  // Meta
  createdAt:           "",
  updatedAt:           "",
  createdBy:           "",
};

export function getStatusConfig(statusId) {
  return PROJEKT_STATUSZOK.find(s => s.id === statusId)
    || { szin: "#64748B", bg: "#F8FAFC" };
}
