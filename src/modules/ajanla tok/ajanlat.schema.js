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
  { id: "Elutasítva",      szin: "#DC2626", bg: "#FEF2F2" },
  { id: "Lejárt",          szin: "#9CA3AF", bg: "#F3F4F6" },
];

export const AJANLAT_SCHEMA = {
  id:                 "",
  ajanlatkod:         "",
  nev:                "",
  clientId:           null,
  clientNev:          "",
  clientCim:          "",
  kapcsolattarto:     "",
  clientTel:          "",
  clientEmail:        "",
  datum:              "",
  ervenyesseg:        "",
  fizetesifelteletek: "30 napos átutalás a számla kézhezvételétől",
  megjegyzes:         "",
  tetelek:            [],
  sablonId:           null,
  status:             "Piszkozat",
  osszeg:             null,
  projektId:          null,
  keszitette:         "",
  createdAt:          "",
  updatedAt:          "",
};

export function getAjanlatStatusConfig(statusId) {
  return AJANLAT_STATUSZOK.find(s => s.id === statusId) || { szin: "#64748B", bg: "#F8FAFC" };
}
