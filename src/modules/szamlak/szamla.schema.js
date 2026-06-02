/**
 * szamla.schema.js – Számla adatmodell
 */

export const SZAMLA_TIPUSOK = ["kimeno", "bejovo"];

export const SZAMLA_STATUSZOK_KIMENO = [
  { id: "Kiállítva",  szin: "#2563EB", bg: "#EFF6FF" },
  { id: "Küldve",     szin: "#D97706", bg: "#FFFBEB" },
  { id: "Fizetve",    szin: "#059669", bg: "#ECFDF5" },
  { id: "Késedelmes", szin: "#DC2626", bg: "#FEF2F2" },
  { id: "Sztornózva", szin: "#64748B", bg: "#F8FAFC" },
];

export const SZAMLA_STATUSZOK_BEJOVO = [
  { id: "Befogadva",      szin: "#2563EB", bg: "#EFF6FF" },
  { id: "Jóváhagyva",     szin: "#D97706", bg: "#FFFBEB" },
  { id: "Fizetve",        szin: "#059669", bg: "#ECFDF5" },
  { id: "Visszautasított",szin: "#DC2626", bg: "#FEF2F2" },
];

export const AFA_KULCSOK = [27, 5, 0];

export const SZAMLA_SCHEMA = {
  id:               "",
  tipus:            "kimeno",  // "kimeno" | "bejovo"

  // Számla azonosítók
  szamlaszam:       "",
  kiallitasDatuma:  "",
  teljesitesDatuma: "",
  fizetesiHatarido: "",

  // Kimenő – ügyfél
  ugyfelId:         "",
  ugyfelNev:        "",
  ugyfelCim:        "",
  ugyfelAdoszam:    "",

  // Bejövő – szállító (fővállalkozó)
  szallitoId:       "",
  szallitoNev:      "",
  szallitoAdoszam:  "",

  // Projekt kapcsolat
  projektId:        "",
  projektKod:       "",
  projektNev:       "",

  // Összegek
  nettoOsszeg:      0,
  afaKulcs:         27,
  afaOsszeg:        0,
  bruttoOsszeg:     0,
  fizetettOsszeg:   0,
  fizetettDatum:    "",

  // Tételek (opcionális részletezés a PDF-hez)
  tetelek: [],
  // tétel struktúra: [{ id, megnevezes, menny, egyseg, nettoEgysegAr, afaKulcs }]

  // Státusz
  status:     "Kiállítva",  // kimeno: Kiállítva/Küldve/Fizetve/Késedelmes/Sztornózva
                             // bejovo: Befogadva/Jóváhagyva/Fizetve/Visszautasított
  megjegyzes: "",

  // PEASE integráció
  peaseId:       "",   // PEASE rendszer belső azonosítója
  peaseSzinkron: "",   // "" | "szinkronizalt"

  // Meta
  createdAt: "",
  updatedAt: "",
  createdBy: "",
};

export function getStatusConfig(status, tipus = "kimeno") {
  const lista = tipus === "bejovo" ? SZAMLA_STATUSZOK_BEJOVO : SZAMLA_STATUSZOK_KIMENO;
  return lista.find(s => s.id === status) || { szin: "#64748B", bg: "#F8FAFC" };
}

export function isKesedelmes(szamla) {
  if (szamla.status === "Fizetve" || szamla.status === "Sztornózva") return false;
  if (!szamla.fizetesiHatarido) return false;
  return new Date(szamla.fizetesiHatarido) < new Date();
}
