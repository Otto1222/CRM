export const AJANLAT_TETELTIPUSOK = [
  { id: "anyag",    label: "Anyag / Eszköz" },
  { id: "munkadij", label: "Munkadíj"       },
  { id: "egyeb",    label: "Egyéb"          },
];

// Számítás egy tételsorhoz
export function calcTetel(t) {
  const netto  = (Number(t.mennyiseg) || 0) * (Number(t.nettoEgysegar) || 0) * (1 - (Number(t.kedvezmenyPct) || 0) / 100);
  const afa    = netto * (Number(t.afaKulcs) || 27) / 100;
  return { nettoOsszesen: netto, afaOsszeg: afa, brutto: netto + afa };
}

// Ajánlat teljes összesítése
export function calcAjanlatOsszesites(tetelek = [], anyagtorzsList = []) {
  let nettoAnyag = 0, nettoMunka = 0, nettoEgyeb = 0, osszesAfa = 0, becsultBeszerzesi = 0;
  for (const t of tetelek) {
    const { nettoOsszesen, afaOsszeg } = calcTetel(t);
    if (t.tipus === "anyag")       nettoAnyag += nettoOsszesen;
    else if (t.tipus === "munkadij") nettoMunka += nettoOsszesen;
    else                             nettoEgyeb += nettoOsszesen;
    osszesAfa += afaOsszeg;
    if (t.anyagtorzsId) {
      const at = anyagtorzsList.find(a => a.id === t.anyagtorzsId);
      if (at) becsultBeszerzesi += (Number(at.nettoBeszerzesiAr) || 0) * (Number(t.mennyiseg) || 0);
    }
  }
  const nettoOsszes = nettoAnyag + nettoMunka + nettoEgyeb;
  const brutto      = nettoOsszes + osszesAfa;
  const haszon      = nettoOsszes - becsultBeszerzesi;
  const fedezetPct  = nettoOsszes > 0 ? Math.round((haszon / nettoOsszes) * 100) : 0;
  return { nettoAnyag, nettoMunka, nettoEgyeb, nettoOsszes, osszesAfa, brutto, haszon, fedezetPct };
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
  ajanlatkod:         "",    // auto: AJA-2026-001
  // Fejléc
  nev:                "",    // ajánlat megnevezése
  clientId:           null,
  clientNev:          "",
  clientCim:          "",
  kapcsolattarto:     "",
  clientTel:          "",
  clientEmail:        "",
  datum:              "",    // YYYY-MM-DD
  ervenyesseg:        "",    // YYYY-MM-DD
  fizetesifelteletek: "30 napos átutalás a számla kézhezvételétől",
  megjegyzes:         "",
  // Tételsorok
  tetelek:            [],    // [{id, sorrend, tipus, kategoria, anyagtorzsId, megnevezes, mennyiseg, egyseg, nettoEgysegar, kedvezmenyPct, afaKulcs}]
  // Sablon hivatkozás
  sablonId:           null,
  // Státusz
  status:             "Piszkozat",
  // Gyors összeg (backward compat + display)
  osszeg:             null,  // bruttó végösszeg (auto-frissítve)
  // Kapcsolódó projekt
  projektId:          null,
  // Meta
  keszitette:         "",
  createdAt:          "",
  updatedAt:          "",
};

export function getAjanlatStatusConfig(statusId) {
  return AJANLAT_STATUSZOK.find(s => s.id === statusId)
    || { szin: "#64748B", bg: "#F8FAFC" };
}
