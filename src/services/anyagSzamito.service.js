/**
 * anyagSzamito.service.js
 * Anyagszámítási Motor – Fázis 5A + TS-2 tartószerkezet kalkulátor.
 *
 * Cél: a projekt műszaki bemeneti adataiból egy ELŐZETES anyaglistát számolni,
 * amelyet a PM jóváhagyás után a Kivitelezési Csomagba illeszthet.
 *
 * TS-2 bővítések:
 *   - Cseréptető és minisín Excel-alapú számítás (soronkénti panel-kiosztás)
 *   - megnevezes: anyag.pmMegnevezes || anyag.nev (PM-egyszerűsített név)
 *   - leszoritoMod: "univerzalis" | "kulon"
 *   - Backward compat: tetotipus="" → régi fallback logika, adatveszteség nélkül
 *
 * Tisztán számoló függvények (anyagtörzstől független, tesztelhető):
 *   calcCsereptetoSorok(sorok, dimenzik)
 *   calcMinisinSorok(sorok)
 */
import { getAnyag } from "../lib/anyagtorzs.js";

export const ANYAGSZAMITO_FORRAS = "anyagszamito";

// ─── Cseréptető alapértelmezett méretparaméterek (Excel default értékek) ───
export const CSERPETO_DEFAULTS = {
  panelMagassag:       1894,  // mm
  panelSzelesseg:      1134,  // mm
  sinHossz:            3500,  // mm
  szarufaTavolsag:      800,  // mm
  leszoritoSzelesseg:    20,  // mm
};

// ─── Villanyszerelési szabályok (tetőtípustól független, mindig futnak) ────
const VILLANY_SZABALYOK = [
  {
    id:           "inverter_ac_dc_segedanyag",
    anyagtorzsId: "a010",
    leiras:       "AC/DC segédanyag (inverter)",
    szamoltMennyiseg: (be) => (Number(be.inverterDarabszam) || 0) * 4,
    megjegyzes:   (be) => `inverter darabszám × 4 db  =  ${Number(be.inverterDarabszam) || 0} × 4`,
  },
  {
    id:           "smart_meter_segedanyag",
    anyagtorzsId: "a012",
    leiras:       "Smart meter segédanyag",
    szamoltMennyiseg: (be) => (Number(be.smartMeterDarabszam) || 0) * 1,
    megjegyzes:   (be) => `smart meter darabszám × 1 db  =  ${Number(be.smartMeterDarabszam) || 0} × 1`,
  },
  {
    id:           "akku_segedanyag",
    anyagtorzsId: "a005",
    leiras:       "Akku segédanyag",
    szamoltMennyiseg: (be) => (Number(be.akkuDarabszam) || 0) * 2,
    megjegyzes:   (be) => `akku darabszám × 2 m  =  ${Number(be.akkuDarabszam) || 0} × 2`,
  },
];

// ─── Tartószerkezet fallback szabályok (tetotipus="" esetén fut) ──────────
const TARTOSZERK_FALLBACK_SZABALYOK = [
  {
    id:           "kozepso_leszorito",
    anyagtorzsId: "a052",
    leiras:       "Köztes leszorító",
    szamoltMennyiseg: (be) => Math.max(0, (Number(be.napelemDarabszam) || 0) - 1) * 2,
    megjegyzes:   (be) => `(napelem darabszám − 1) × 2  =  (${Number(be.napelemDarabszam) || 0} − 1) × 2`,
  },
  {
    id:           "veg_leszorito",
    anyagtorzsId: "a053",
    leiras:       "Végleszorító",
    szamoltMennyiseg: (be) => (Number(be.napelemDarabszam) || 0) > 0 ? 4 : 0,
    megjegyzes:   () => "1 sortáblánként 4 db (fallback becslés)",
  },
  {
    id:           "tartosin",
    anyagtorzsId: "a050",
    leiras:       "Tartósín",
    szamoltMennyiseg: (be) => (Number(be.napelemDarabszam) || 0) * 1.05,
    megjegyzes:   (be) => `napelem darabszám × 1,05 m  =  ${Number(be.napelemDarabszam) || 0} × 1,05`,
  },
];

// Backward-compat export – a belső kód a VILLANY_ és FALLBACK_ tömböket használja
export const ANYAGSZAMITO_SZABALYOK = [...VILLANY_SZABALYOK, ...TARTOSZERK_FALLBACK_SZABALYOK];

// ─── Cseréptető – tisztán számoló függvény (anyagtörzstől független) ───────
//
// Visszaad: { sorokEredmeny[], sinOsszesen, kampoOsszesen, sintoldoOsszesen,
//             koztesOsszesen, vegOsszesen, univOsszesen }
// A +1 / +4 összesítési pótlékok már benne vannak a végeredményben.
// univOsszesen nem kap +4-et (az Excel specifikáció szerint).
export function calcCsereptetoSorok(sorok = [], dimenzik = {}) {
  const mag   = Number(dimenzik.panelMagassag      ?? CSERPETO_DEFAULTS.panelMagassag);
  const szel  = Number(dimenzik.panelSzelesseg     ?? CSERPETO_DEFAULTS.panelSzelesseg);
  const sinH  = Number(dimenzik.sinHossz            ?? CSERPETO_DEFAULTS.sinHossz);
  const szarH = Number(dimenzik.szarufaTavolsag     ?? CSERPETO_DEFAULTS.szarufaTavolsag);
  const leszW = Number(dimenzik.leszoritoSzelesseg  ?? CSERPETO_DEFAULTS.leszoritoSzelesseg);

  let sinSum = 0, kampoSum = 0, sintoldoSum = 0, koztesSum = 0, vegSum = 0, univSum = 0;
  const sorokEredmeny = [];

  for (const sor of sorok) {
    const db = Number(sor.panelDb) || 0;
    if (db === 0) {
      sorokEredmeny.push({ db: 0, sinDb: 0, kampoDb: 0, sintoldoDb: 0, koztesDb: 0, vegDb: 0, univDb: 0 });
      continue;
    }
    const alap          = sor.elrendezes === "allitott" ? szel : mag;
    const nettoEgySinre = db * (alap + leszW);
    const nettoOsszesen = nettoEgySinre * 2;
    const sinDb         = Math.ceil(nettoOsszesen / sinH);
    const kampoDb       = Math.ceil(nettoEgySinre / szarH) * 2;
    const sintoldoDb    = Math.floor(nettoEgySinre / sinH) * 2;
    const koztesDb      = (db - 1) * 2;
    const vegDb         = 4;
    const univDb        = koztesDb + vegDb;

    sinSum      += sinDb;
    kampoSum    += kampoDb;
    sintoldoSum += sintoldoDb;
    koztesSum   += koztesDb;
    vegSum      += vegDb;
    univSum     += univDb;
    sorokEredmeny.push({ db, sinDb, kampoDb, sintoldoDb, koztesDb, vegDb, univDb });
  }

  return {
    sorokEredmeny,
    sinOsszesen:      sinSum + 1,
    kampoOsszesen:    kampoSum + 4,
    sintoldoOsszesen: sintoldoSum + 4,
    koztesOsszesen:   koztesSum + 4,
    vegOsszesen:      vegSum + 4,
    univOsszesen:     univSum,
  };
}

// ─── Minisín – tisztán számoló függvény (anyagtörzstől független) ──────────
//
// Visszaad: { sorokEredmeny[], miniSinOsszesen, koztesOsszesen,
//             vegOsszesen, univOsszesen, csavarOsszesen }
// Totálok: minden mező sum (nincs pótlék), az Excel spec szerint.
export function calcMinisinSorok(sorok = []) {
  let miniSinSum = 0, koztesSum = 0, vegSum = 0, univSum = 0, csavarSum = 0;
  const sorokEredmeny = [];

  for (const sor of sorok) {
    const db = Number(sor.panelDb) || 0;
    if (db === 0) {
      sorokEredmeny.push({ db: 0, miniSinDb: 0, koztesDb: 0, vegDb: 0, univDb: 0, csavarDb: 0 });
      continue;
    }
    const miniSinDb = db * 2 + 2;
    const koztesDb  = db * 2 - 2;
    const vegDb     = miniSinDb - koztesDb;
    const univDb    = koztesDb + vegDb;
    const csavarDb  = miniSinDb * 4;

    miniSinSum += miniSinDb;
    koztesSum  += koztesDb;
    vegSum     += vegDb;
    univSum    += univDb;
    csavarSum  += csavarDb;
    sorokEredmeny.push({ db, miniSinDb, koztesDb, vegDb, univDb, csavarDb });
  }

  return {
    sorokEredmeny,
    miniSinOsszesen: miniSinSum,
    koztesOsszesen:  koztesSum,
    vegOsszesen:     vegSum,
    univOsszesen:    univSum,
    csavarOsszesen:  csavarSum,
  };
}

// ─── Üres bemeneti objektum ──────────────────────────────────────────────────
export function makeUresAnyagszamitoBemenet() {
  return {
    // Villanyszerelési (változatlan)
    napelemDarabszam:      0,
    inverterDarabszam:     0,
    akkuDarabszam:         0,
    smartMeterDarabszam:   0,
    optimalizaloDarabszam: 0,
    // Tartószerkezet típusválasztó
    tetotipus:             "",    // "cserepteto" | "lemezteto_minisin" | ""
    leszoritoMod:          "univerzalis",
    // Cseréptető méretparaméterek (alapértelmezés az Excel default értékei)
    panelMagassag:         CSERPETO_DEFAULTS.panelMagassag,
    panelSzelesseg:        CSERPETO_DEFAULTS.panelSzelesseg,
    sinHossz:              CSERPETO_DEFAULTS.sinHossz,
    szarufaTavolsag:       CSERPETO_DEFAULTS.szarufaTavolsag,
    leszoritoSzelesseg:    CSERPETO_DEFAULTS.leszoritoSzelesseg,
    // Soronkénti panel-kiosztás
    sorok:                 [],   // [{ elrendezes: "allitott"|"fektetett", panelDb: number }]
  };
}

// ─── Főfüggvény ──────────────────────────────────────────────────────────────
export function generateAnyagszamitas(bemenet = {}) {
  const anyaglista     = [];
  const hianyzoAnyagok = [];

  function buildTetel(anyagtorzsId, mennyiseg, szamitasForrasa, megjegyzes, egysegOverride = null) {
    if (!(mennyiseg > 0)) return;
    const anyag = getAnyag(anyagtorzsId);
    if (!anyag) {
      hianyzoAnyagok.push({
        anyagtorzsId,
        leiras:           szamitasForrasa,
        szamoltMennyiseg: Math.round(mennyiseg * 100) / 100,
      });
      return;
    }
    anyaglista.push({
      anyagtorzs_id:    anyag.id,
      megnevezes:       anyag.pmMegnevezes || anyag.nev || "",
      kategoria:        anyag.telepitoi_kategoria || anyag.kategoria || "",
      egyseg:           egysegOverride || anyag.egyseg || "db",
      szamoltMennyiseg: Math.round(mennyiseg * 100) / 100,
      szamitasForrasa,
      megjegyzes,
    });
  }

  // 1. Villanyszerelési tételek – tetőtípustól független, mindig futnak
  for (const sz of VILLANY_SZABALYOK) {
    buildTetel(sz.anyagtorzsId, sz.szamoltMennyiseg(bemenet), sz.id, sz.megjegyzes(bemenet));
  }

  const tetotipus    = bemenet.tetotipus || "";
  const leszoritoMod = bemenet.leszoritoMod || "univerzalis";
  const sorok        = Array.isArray(bemenet.sorok) ? bemenet.sorok : [];
  const vanSorok     = sorok.some(s => (Number(s.panelDb) || 0) > 0);

  // 2. Tartószerkezeti tételek – tetőtípus alapján
  if (tetotipus === "cserepteto" && vanSorok) {
    // ── Cseréptető – Excel logika ──────────────────────────────────────────
    const t = calcCsereptetoSorok(sorok, {
      panelMagassag:     bemenet.panelMagassag,
      panelSzelesseg:    bemenet.panelSzelesseg,
      sinHossz:          bemenet.sinHossz,
      szarufaTavolsag:   bemenet.szarufaTavolsag,
      leszoritoSzelesseg: bemenet.leszoritoSzelesseg,
    });
    const sorDb = sorok.length;
    // a050 cseréptető-módban darabban (nem méterben) számolunk
    buildTetel("a050", t.sinOsszesen,      "cserep_sin",     `cseréptető ${sorDb} sor: ${t.sinOsszesen} db sín`, "db");
    buildTetel("a051", t.kampoOsszesen,    "cserep_kampo",   `cseréptető ${sorDb} sor: ${t.kampoOsszesen} db kampó`);
    buildTetel("a054", t.sintoldoOsszesen, "cserep_sintoldo",`cseréptető ${sorDb} sor: ${t.sintoldoOsszesen} db síntoldó`);
    if (leszoritoMod === "kulon") {
      buildTetel("a052", t.koztesOsszesen, "cserep_koztes", `cseréptető ${sorDb} sor: ${t.koztesOsszesen} db köztes leszorító`);
      buildTetel("a053", t.vegOsszesen,    "cserep_veg",    `cseréptető ${sorDb} sor: ${t.vegOsszesen} db végleszorító`);
    } else {
      buildTetel("a057", t.univOsszesen,   "cserep_univ",   `cseréptető ${sorDb} sor: ${t.univOsszesen} db univerzális leszorító`);
    }

  } else if (tetotipus === "lemezteto_minisin" && vanSorok) {
    // ── Minisín – Excel logika ─────────────────────────────────────────────
    const t = calcMinisinSorok(sorok);
    const sorDb = sorok.length;
    buildTetel("a055", t.miniSinOsszesen, "minisin_sin",    `minisín ${sorDb} sor: ${t.miniSinOsszesen} db mini sín`);
    buildTetel("a056", t.csavarOsszesen,  "minisin_csavar", `minisín ${sorDb} sor: ${t.csavarOsszesen} db mini sín csavar`);
    if (leszoritoMod === "kulon") {
      buildTetel("a052", t.koztesOsszesen, "minisin_koztes", `minisín ${sorDb} sor: ${t.koztesOsszesen} db köztes leszorító`);
      buildTetel("a053", t.vegOsszesen,    "minisin_veg",    `minisín ${sorDb} sor: ${t.vegOsszesen} db végleszorító`);
    } else {
      buildTetel("a057", t.univOsszesen,   "minisin_univ",   `minisín ${sorDb} sor: ${t.univOsszesen} db univerzális leszorító`);
    }

  } else {
    // ── Fallback – régi logika (tetotipus="" vagy nincs sorok) ────────────
    for (const sz of TARTOSZERK_FALLBACK_SZABALYOK) {
      buildTetel(sz.anyagtorzsId, sz.szamoltMennyiseg(bemenet), sz.id, sz.megjegyzes(bemenet));
    }
  }

  return {
    anyaglista,
    hianyzoAnyagok,
    figyelmeztetes: hianyzoAnyagok.length > 0
      ? `${hianyzoAnyagok.length} szükséges anyag nem található az anyagtörzsben – ezekhez nem generálódott sor (ld. lent a hiányzó anyagok listáját).`
      : "",
  };
}