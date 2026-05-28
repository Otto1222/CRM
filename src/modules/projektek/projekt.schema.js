/**
 * projekt.schema.js
 * Projekt adatmodell és konstansok
 */

export const PROJEKT_SCHEMA_VERSION = "1.0";

export const PROJEKT_STATUSZOK = [
  { id: "Felmérésre vár",        szin: "#0EA5E9", bg: "#F0F9FF" },
  { id: "Felmérve",              szin: "#6366F1", bg: "#EEF2FF" },
  { id: "Ajánlat készítés alatt",szin: "#8B5CF6", bg: "#F5F3FF" },
  { id: "Ajánlat kiküldve",      szin: "#D97706", bg: "#FFFBEB" },
  { id: "Elfogadva",             szin: "#059669", bg: "#ECFDF5" },
  { id: "Elutasított",           szin: "#DC2626", bg: "#FEF2F2" },
  { id: "Kivitelezésre vár",     szin: "#EA580C", bg: "#FFF7ED" },
  { id: "Kivitelezés alatt",     szin: "#2563EB", bg: "#EFF6FF" },
  { id: "Készre jelentve",       szin: "#0891B2", bg: "#ECFEFF" },
  { id: "Számlázásra vár",       szin: "#B45309", bg: "#FFFBEB" },
  { id: "Leszámlázva",           szin: "#15803D", bg: "#F0FDF4" },
  { id: "Fizetve",               szin: "#166534", bg: "#DCFCE7" },
  { id: "Lezárt",                szin: "#475569", bg: "#F8FAFC" },
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
  // Ügyfél
  clientId:            null,
  clientNev:           "",
  clientCim:           "",
  clientTel:           "",
  clientEmail:         "",
  kapcsolattarto:      "",
  telepitesiCim:       "",
  // Projekt adatok
  tipus:               "Napelem telepítés",
  status:              "Felmérésre vár",
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
  // Meta
  createdAt:           "",
  updatedAt:           "",
  createdBy:           "",
};

export function getStatusConfig(statusId) {
  return PROJEKT_STATUSZOK.find(s => s.id === statusId)
    || { szin: "#64748B", bg: "#F8FAFC" };
}
