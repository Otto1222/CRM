// ── Szakaszok (fő csoportok egy ajánlatban) ──────────────────
export const AJANLAT_SZAKASZOK = [
  { id: "napelem",      label: "Napelem panelek",            szin: "#F59E0B", bg: "#FFFBEB", kategoriak: ["Napelem panel"] },
  { id: "inverter",     label: "Inverter",                   szin: "#3B82F6", bg: "#EFF6FF", kategoriak: ["Inverter"] },
  { id: "tartoszerk",   label: "Tartószerkezet",             szin: "#10B981", bg: "#ECFDF5", kategoriak: ["Tartószerkezet"] },
  { id: "energia_mero", label: "Energia mérő / Okos mérő",  szin: "#8B5CF6", bg: "#F5F3FF", kategoriak: ["Okos mérő"] },
  { id: "akk_vezerlo",  label: "Akkumulátor vezérlő",        szin: "#EC4899", bg: "#FDF2F8", kategoriak: ["Akkumulátor vezérlő"] },
  { id: "akkumulator",  label: "Akkumulátor egység",         szin: "#7C3AED", bg: "#F5F3FF", kategoriak: ["Akkumulátor"] },
  { id: "kabelezés",    label: "Kábelezés",                  szin: "#F97316", bg: "#FFF7ED", kategoriak: ["DC oldal", "AC oldal", "Kábel / Vezeték"] },
  { id: "vedelem",      label: "Védelmi berendezések",       szin: "#EF4444", bg: "#FEF2F2", kategoriak: ["Védelmi berendezések"] },
  { id: "ugyintezes",   label: "Ügyintézés / Engedélyezés", szin: "#0891B2", bg: "#ECFEFF", kategoriak: ["Engedélyezés"] },
  { id: "kivitelezes",  label: "Kivitelezés / Munkadíj",     szin: "#059669", bg: "#ECFDF5", kategoriak: ["Munkadíj", "Kiszállás / Fuvar"] },
  { id: "egyeb",        label: "Egyéb",                      szin: "#6B7280", bg: "#F9FAFB", kategoriak: ["Egyéb"] },
];

export function getSzakaszForKategoria(kategoria) {
  for (const sz of AJANLAT_SZAKASZOK) {
    if (sz.kategoriak.includes(kategoria)) return sz.id;
  }
  return "egyeb";
}

// ── Számítás egy tételsorhoz ──────────────────────────────────
export function calcTetel(t) {
  const netto = (Number(t.mennyiseg) || 0) * (Number(t.nettoEgysegar) || 0) * (1 - (Number(t.kedvezmenyPct) || 0) / 100);
  const afa   = netto * (Number(t.afaKulcs) ?? 27) / 100;
  return { nettoOsszesen: netto, afaOsszeg: afa, brutto: netto + afa };
}

// ── Ajánlat teljes összesítése ────────────────────────────────
export function calcAjanlatOsszesites(tetelek = [], anyagtorzsList = []) {
  let nettoOsszes = 0, osszesAfa = 0, becsultBeszerzesi = 0;
  const szakaszTotalok = {};

  for (const t of tetelek) {
    const { nettoOsszesen, afaOsszeg } = calcTetel(t);
    nettoOsszes     += nettoOsszesen;
    osszesAfa       += afaOsszeg;
    const szId = t.szakasz || getSzakaszForKategoria(t.kategoria || "");
    szakaszTotalok[szId] = (szakaszTotalok[szId] || 0) + nettoOsszesen;
    if (t.anyagtorzsId) {
      const at = anyagtorzsList.find(a => a.id === t.anyagtorzsId);
      if (at) becsultBeszerzesi += (Number(at.nettoBeszerzesiAr) || 0) * (Number(t.mennyiseg) || 0);
    }
  }

  const brutto     = nettoOsszes + osszesAfa;
  const haszon     = nettoOsszes - becsultBeszerzesi;
  const fedezetPct = nettoOsszes > 0 ? Math.round((haszon / nettoOsszes) * 100) : 0;

  // legacy fields for dashboard / backward compat
  const kivSz   = ["kivitelezes", "ugyintezes"];
  const nettoMunka = kivSz.reduce((s, id) => s + (szakaszTotalok[id] || 0), 0);
  const nettoAnyag = nettoOsszes - nettoMunka;

  return { nettoAnyag, nettoMunka, nettoEgyeb: 0, nettoOsszes, osszesAfa, brutto, haszon, fedezetPct, szakaszTotalok };
}

export const AJANLAT_STATUSZOK = [
  { id: "Piszkozat",       szin: "#6B7280", bg: "#F9FAFB" },
  { id: "Kiküldve",        szin: "#D97706", bg: "#FFFBEB" },
  { id: "Módosítás alatt", szin: "#7C3AED", bg: "#F5F3FF" },
  { id: "Elfogadva",       szin: "#059669", bg: "#ECFDF5" },
  { id: "Elutasítva",      szin: "#E30613", bg: "#FEF2F2" },
  { id: "Lejárt",          szin: "#9CA3AF", bg: "#F3F4F6" },
];

// 11 ügyfélnek látható fő tétel – 7 termékes + 4 összesített
export const FO_TETELEK = [
  { id: "napelem_rendszer", label: "Napelem rendszer",               termek: true,  osszetett: false },
  { id: "tartoszerkezet",   label: "Tartószerkezet",                termek: true,  osszetett: false },
  { id: "inverter",         label: "Inverter",                      termek: true,  osszetett: false },
  { id: "energia_mero",     label: "Energia mérő",                  termek: true,  osszetett: false },
  { id: "akku_vezeto",      label: "Akkumulátor vezérlő egység",    termek: true,  osszetett: false },
  { id: "akku_egyseg",      label: "Akkumulátor egység",            termek: true,  osszetett: false },
  { id: "akku_kiegeszito",  label: "Akkumulátor kiegészítők",       termek: true,  osszetett: false },
  {
    id: "vedelmi_eszkozok", label: "Védelmi eszközök",             termek: false, osszetett: true,
    ugyfel_leiras_default: "DC 1000V túlfeszültség levezetés, AC túlfeszültség levezetés, leválasztó kapcsolók, kismegszakítók.",
  },
  {
    id: "villanyszereles",  label: "Villanyszerelési anyagok",      termek: false, osszetett: true,
    ugyfel_leiras_default: "AC/DC kábelek, kábelcsatorna, MÜ II cső, idomok, apróanyag.",
  },
  {
    id: "ugyintézes",       label: "Ügyintézés és engedélyeztetés", termek: false, osszetett: true,
    ugyfel_leiras_default: "Műszaki terv és csatlakozási dokumentáció elkészítése, áramszolgáltatói ügyintézés, engedélyeztetés, áramszolgáltatói jóváhagyás.",
  },
  {
    id: "kivi_beuzem",      label: "Kivitelezés és beüzemelés",     termek: false, osszetett: false, kivi: true,
    ugyfel_leiras_default: "Telepítés munkadíj, próbaüzem, 3 év kivitelezés garancia.",
  },
];

export function makeFoTetelek() {
  return FO_TETELEK.map(f => ({
    id:               f.id,
    label:            f.label,
    aktiv:            false,
    // termék mezők
    anyagtorzs_id:    null,
    tipus:            "",
    mennyiseg:        "",
    egyseg:           "db",
    netto_egysegar:   0,
    netto_osszeg:     0,
    // ügyfél / belső szöveg
    ugyfel_leiras:    f.ugyfel_leiras_default || "",
    belso_megjegyzes: "",
  }));
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
  osszeg:        0,
  ervenyesseg:   "",
  megjegyzes:    "",
  projektId:     null,
  keszitette:    "",
  createdAt:     "",
  updatedAt:     "",
  afa_szazalek:     27,
  fo_tetelek:       [],
  reszlet_tetelek:  [],
  kivi_kalkulator:  {},
};

export function getAjanlatStatusConfig(statusId) {
  return AJANLAT_STATUSZOK.find(s => s.id === statusId) || { szin: "#64748B", bg: "#F8FAFC" };
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

export function computeFoTetelek(fo_tetelek = [], reszlet_tetelek = [], kivi_kalkulator = {}) {
  return fo_tetelek.map(t => {
    const def = FO_TETELEK.find(f => f.id === t.id);
    let netto = Number(t.netto_osszeg) || 0;

    if (def?.osszetett) {
      // Ha vannak részlet-tételek, azok összege az irányadó; backward compat: ha nincs, a tárolt értéket tartjuk
      const rSum = computeOsszetettOsszeg(reszlet_tetelek, t.id);
      netto = rSum > 0 ? rSum : netto;
    } else if (def?.kivi) {
      if (!kivi_kalkulator.kezi) {
        const kiviVal = computeKiviOsszeg(kivi_kalkulator);
        if (kiviVal !== null) netto = kiviVal;
      }
    } else if (def?.termek) {
      // Termék: ha mennyiség és egységár is megadott, auto-számol
      const db = Number(t.mennyiseg) || 0;
      const ar = Number(t.netto_egysegar) || 0;
      if (db > 0 && ar > 0) netto = db * ar;
    }

    return { ...t, netto_osszeg: netto };
  });
}

export function computeNettoOsszeg(fo_tetelek = [], reszlet_tetelek = [], kivi_kalkulator = {}) {
  const computed = computeFoTetelek(fo_tetelek, reszlet_tetelek, kivi_kalkulator);
  return computed.filter(t => t.aktiv).reduce((s, t) => s + t.netto_osszeg, 0);
}
