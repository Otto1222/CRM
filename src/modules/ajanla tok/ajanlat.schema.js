export const AJANLAT_STATUSZOK = [
  { id: "Piszkozat",       szin: "#6B7280", bg: "#F9FAFB" },
  { id: "Kiküldve",        szin: "#D97706", bg: "#FFFBEB" },
  { id: "Módosítás alatt", szin: "#7C3AED", bg: "#F5F3FF" },
  { id: "Elfogadva",       szin: "#059669", bg: "#ECFDF5" },
  { id: "Elutasítva",      szin: "#DC2626", bg: "#FEF2F2" },
  { id: "Lejárt",          szin: "#9CA3AF", bg: "#F3F4F6" },
];

export const AJANLAT_SCHEMA = {
  id:            "",
  ajanlatkod:    "",    // auto: AJA-2026-001
  clientId:      null,
  clientNev:     "",
  clientTel:     "",
  clientEmail:   "",
  clientCim:     "",
  nev:           "",    // ajánlat megnevezése
  status:        "Piszkozat",
  osszeg:        null,  // Ft
  munkatipus:    "",
  ervenyesseg:   "",    // YYYY-MM-DD
  megjegyzes:    "",
  projektId:     null,  // linked project after acceptance
  keszitette:    "",
  createdAt:     "",
  updatedAt:     "",
};

export function getAjanlatStatusConfig(statusId) {
  return AJANLAT_STATUSZOK.find(s => s.id === statusId)
    || { szin: "#64748B", bg: "#F8FAFC" };
}
