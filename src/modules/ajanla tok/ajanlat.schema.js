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
    // ── Ajánlat V2 – profitlogika (Fázis 3A) ──
    // Az "eladási ár" a meglévő netto_egysegar mezőben tárolódik – nincs
    // külön "eladasiAr" mező (sem "anyagtorzsId" az anyagtorzs_id mellett),
    // hogy ne legyen mező-átfedés (ld. Fázis 2B konszolidáció tanulsága).
    beszerzesiArPillanatkep: null,
    haszonPct:               null,
    haszonFt:                0,
    // ügyfél / belső szöveg
    ugyfel_leiras:    f.ugyfel_leiras_default || "",
    belso_megjegyzes: "",
  }));
}

// ─── Ajánlat V2 – profitlogika (Fázis 3A) ─────────────────────
// A céges alap anyaghaszon-kulcs – ez alatt figyelmeztetést kap a PM.
export const CEGES_ALAP_ANYAG_HASZON_PCT = 30;

// eladasiAr = beszerzesiArPillanatkep × (1 + haszonPct / 100)
// Az eladási ár a tétel netto_egysegar mezőjében tárolódik.
export function calcEladasiAr(beszerzesiAr, haszonPct) {
  const ar  = Number(beszerzesiAr) || 0;
  const pct = Number(haszonPct) || 0;
  return Math.round(ar * (1 + pct / 100));
}

// haszonFt = (eladasiAr - beszerzesiArPillanatkep) × mennyiseg
export function calcHaszonFt(eladasiAr, beszerzesiAr, mennyiseg) {
  const elado = Number(eladasiAr) || 0;
  const besz  = Number(beszerzesiAr) || 0;
  const db    = Number(mennyiseg) || 0;
  return (elado - besz) * db;
}

export function alacsonyAnyagHaszon(haszonPct) {
  return haszonPct != null && Number(haszonPct) < CEGES_ALAP_ANYAG_HASZON_PCT;
}

// ─── Fázis 3B – profitlogika kiterjesztés a reszlet_tetelek-re ────
// A reszlet_tetelek szabad belső bontó sorok (összetett fő tételek alatt) –
// nincs anyagtörzs-kapcsolatuk, ezért itt a beszerzési ár NEM pillanatkép,
// hanem a PM által opcionálisan, manuálisan rögzített összeg (mező neve:
// beszerzesiAr, "...Pillanatkep" utótag nélkül – ld. AJANLAT_MEZO_SZOTAR).
// A meglévő netto_egysegar marad az eladási ár; a haszonkulcs és a haszon Ft
// ebből és a beszerzési árból származik vissza (fordított irány a fo_tetelek
// képletéhez képest, mert itt az eladási ár a PM által közvetlenül megadott
// elsődleges adat, nem a haszonkulcsból számolt).
export function calcReszletHaszon(beszerzesiAr, eladasiAr, mennyiseg) {
  if (beszerzesiAr === null || beszerzesiAr === undefined || beszerzesiAr === "") {
    return { haszonPct: null, haszonFt: 0 };
  }
  const besz  = Number(beszerzesiAr) || 0;
  const elado = Number(eladasiAr) || 0;
  const db    = Number(mennyiseg) || 0;
  return {
    haszonPct: besz > 0 ? ((elado - besz) / besz) * 100 : null,
    haszonFt: (elado - besz) * db,
  };
}

// ─── Hivatalos mezőnév-szótár (Fázis 3A/3B döntés – nincs duplikáció) ──
// anyagtorzsId   →  anyagtorzs_id   (meglévő mező, nem hoztunk létre újat)
// eladasiAr      →  netto_egysegar  (meglévő mező – az "eladási ár" ebben tárolódik,
//                                    mind fo_tetelek, mind reszlet_tetelek esetén)
// A "...Pillanatkep" utótag csak ott szerepel, ahol az érték egy másik
// rekord (anyagtörzs) adatának másolata egy adott pillanatban
// (fo_tetelek.beszerzesiArPillanatkep). A reszlet_tetelek.beszerzesiAr
// ezzel szemben elsődleges, manuálisan bevitt adat – nincs mit "pillanatképezni".
export const AJANLAT_MEZO_SZOTAR = {
  anyagtorzsId: "anyagtorzs_id",
  eladasiAr:    "netto_egysegar",
};

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

    // ── Ajánlat V2 – profitlogika (Fázis 3A) ──
    // Csak az anyagtörzsből választott (beszerzési ár pillanatképpel rendelkező)
    // tételeknél van ismert költségbázis – a haszon mindig a friss netto_egysegar
    // (= eladási ár), a pillanatkép és a mennyiség alapján számolódik újra.
    const haszonFt = t.beszerzesiArPillanatkep != null
      ? calcHaszonFt(t.netto_egysegar, t.beszerzesiArPillanatkep, t.mennyiseg)
      : (t.haszonFt || 0);

    return { ...t, netto_osszeg: netto, haszonFt };
  });
}

export function computeNettoOsszeg(fo_tetelek = [], reszlet_tetelek = [], kivi_kalkulator = {}) {
  const computed = computeFoTetelek(fo_tetelek, reszlet_tetelek, kivi_kalkulator);
  return computed.filter(t => t.aktiv).reduce((s, t) => s + t.netto_osszeg, 0);
}

// ─── Fázis 4A – elfogadott ajánlat pillanatkép a projekt-örökléshez ──
// A pillanatkép egy teljesen független, mély másolt (JSON.parse/stringify)
// objektum-gráf: a projektben tárolt érték semmilyen referenciát nem oszt meg
// az élő ajánlat-rekorddal vagy az anyagtörzzsel. Ezért sem egy későbbi
// ajánlatmódosítás, sem egy anyagtörzs árváltozás nem tudja visszamenőleg
// módosítani – a projekt mindig a pillanatkép-készítés időpontjában érvényes
// adatokat látja. A pillanatkép a projekt létrehozásakor készül el EGYSZER,
// és utána soha nem számolódik újra.
export function createAjanlatPillanatkep(ajanlat) {
  if (!ajanlat) return null;
  const fo = computeFoTetelek(ajanlat.fo_tetelek, ajanlat.reszlet_tetelek, ajanlat.kivi_kalkulator);
  const netto = fo.filter(t => t.aktiv).reduce((s, t) => s + t.netto_osszeg, 0);
  const afa = netto * (Number(ajanlat.afa_szazalek) || 0) / 100;
  return JSON.parse(JSON.stringify({
    keszult:         new Date().toISOString(),
    ajanlatId:       ajanlat.id,
    ajanlatkod:      ajanlat.ajanlatkod,
    ajanlatDatuma:   ajanlat.createdAt,
    ajanlatStatusza: ajanlat.status,
    ugyfel: {
      clientId:    ajanlat.clientId,
      clientNev:   ajanlat.clientNev,
      clientCim:   ajanlat.clientCim,
      clientTel:   ajanlat.clientTel,
      clientEmail: ajanlat.clientEmail,
    },
    fo_tetelek:      fo,
    reszlet_tetelek: ajanlat.reszlet_tetelek || [],
    osszesito: {
      afa_szazalek: ajanlat.afa_szazalek,
      netto_osszeg: netto,
      afa,
      brutto_osszeg: netto + afa,
    },
  }));
}
