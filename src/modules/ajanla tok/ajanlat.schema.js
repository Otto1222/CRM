export const AJANLAT_STATUSZOK = [
  { id: "Piszkozat",       szin: "#6B7280", bg: "#F9FAFB" },
  { id: "Kiküldve",        szin: "#D97706", bg: "#FFFBEB" },
  { id: "Módosítás alatt", szin: "#7C3AED", bg: "#F5F3FF" },
  { id: "Elfogadva",       szin: "#059669", bg: "#ECFDF5" },
  { id: "Elutasítva",      szin: "#E30613", bg: "#FEF2F2" },
  { id: "Lejárt",          szin: "#9CA3AF", bg: "#F3F4F6" },
];

// Ügyfélnek látható fő tételek – ez a 3-szintű rendszer Level 3 (customer view)
export const FO_TETELEK = [
  { id: "napelem_rendszer", label: "Napelem rendszer",               osszetett: false },
  { id: "tartoszerkezet",   label: "Tartószerkezet",                osszetett: false },
  { id: "inverter",         label: "Inverter",                      osszetett: false },
  { id: "energia_mero",     label: "Energia mérő",                  osszetett: false },
  { id: "akku_vezeto",      label: "Akkumulátor vezérlő egység",    osszetett: false },
  { id: "akku_egyseg",      label: "Akkumulátor egység",            osszetett: false },
  { id: "akku_kiegeszito",  label: "Akkumulátor kiegészítők",       osszetett: false },
  { id: "vedelmi_eszkozok", label: "Védelmi eszközök",              osszetett: true  },
  { id: "villanyszereles",  label: "Villanyszerelési anyagok",      osszetett: true  },
  { id: "ugyintézes",       label: "Ügyintézés és engedélyeztetés", osszetett: false },
  { id: "kivi_beuzem",      label: "Kivitelezés és beüzemelés",     osszetett: false, kivi: true },
];

export function makeFoTetelek() {
  return FO_TETELEK.map(f => ({ id: f.id, label: f.label, aktiv: false, netto_osszeg: 0 }));
}

export const DEFAULT_KIVI_KALKULATOR = {
  kezi:                     false,
  panel_db:                 0,
  telepitesi_dij_per_panel: 5000,
  kiszallasi_dij:           25000,
  emelőgep_dij:             0,
  tobblet_napok:            0,
  napi_dij:                 40000,
};

export const AJANLAT_SCHEMA = {
  id:            "",
  ajanlatkod:    "",
  clientId:      null,
  clientNev:     "",
  clientTel:     "",
  clientEmail:   "",
  clientCim:     "",
  nev:           "",
  status:        "Piszkozat",
  osszeg:        0,         // nettó összeg (auto-számolt, backward compat mezőként is megmarad)
  ervenyesseg:   "",
  megjegyzes:    "",
  projektId:     null,
  keszitette:    "",
  createdAt:     "",
  updatedAt:     "",
  // ─── 3-szintű kalkulátor ───────────────────────────────────
  afa_szazalek:     27,
  fo_tetelek:       [],   // makeFoTetelek() – ügyfélnek látható sorok
  reszlet_tetelek:  [],   // belső tételek: vedelmi_eszkozok + villanyszereles
  kivi_kalkulator:  {},   // DEFAULT_KIVI_KALKULATOR alapján
};

export function getAjanlatStatusConfig(statusId) {
  return AJANLAT_STATUSZOK.find(s => s.id === statusId)
    || { szin: "#64748B", bg: "#F8FAFC" };
}

// ─── Computed helpers ─────────────────────────────────────────

export function computeOsszetettOsszeg(reszlet_tetelek = [], fotetel_id) {
  return reszlet_tetelek
    .filter(t => t.fotetel === fotetel_id)
    .reduce((sum, t) => sum + (Number(t.netto_osszeg) || 0), 0);
}

export function computeKiviOsszeg(kalk) {
  if (!kalk || kalk.kezi) return null;
  return (
    (Number(kalk.panel_db) || 0) * (Number(kalk.telepitesi_dij_per_panel) || 0) +
    (Number(kalk.kiszallasi_dij) || 0) +
    (Number(kalk.emelőgep_dij) || 0) +
    (Number(kalk.tobblet_napok) || 0) * (Number(kalk.napi_dij) || 0)
  );
}

// Minden fő-tétel aktuális nettó értéke (összetett = auto-számolt)
export function computeFoTetelek(fo_tetelek = [], reszlet_tetelek = [], kivi_kalkulator = {}) {
  return fo_tetelek.map(t => {
    const def = FO_TETELEK.find(f => f.id === t.id);
    let netto = Number(t.netto_osszeg) || 0;
    if (def?.osszetett) netto = computeOsszetettOsszeg(reszlet_tetelek, t.id);
    if (t.id === "kivi_beuzem" && !kivi_kalkulator.kezi) {
      const kiviVal = computeKiviOsszeg(kivi_kalkulator);
      if (kiviVal !== null) netto = kiviVal;
    }
    return { ...t, netto_osszeg: netto };
  });
}

export function computeNettoOsszeg(fo_tetelek = [], reszlet_tetelek = [], kivi_kalkulator = {}) {
  const computed = computeFoTetelek(fo_tetelek, reszlet_tetelek, kivi_kalkulator);
  return computed.filter(t => t.aktiv).reduce((s, t) => s + t.netto_osszeg, 0);
}
