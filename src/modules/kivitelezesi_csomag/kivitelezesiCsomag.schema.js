/**
 * kivitelezesiCsomag.schema.js
 * Kivitelezési Csomag – a projekt tényleges kivitelezési tételeinek
 * (anyagok, munkadíjak, mennyiségek, árak) pillanatképe.
 *
 * FÁZIS 1 – csak adatmodell és előfeltétel-ellenőrzés. Még NINCS hozzá
 * service / UI logika (generálás ajánlatból, sablon kezelés, PM gomb stb.) –
 * azok külön fázisokban, külön commitokban készülnek.
 *
 * D2 – létrehozási logika (a következő fázisokra):
 *   - Saját munka          → elfogadott ajánlatból generálódik (árak pillanatkép)
 *   - Fővállalkozói munka  → PM kézzel hozza létre (sablonból vagy kézi tételekkel)
 *   - Belső munka          → opcionális, csak ha a PM létrehozza
 *
 * Soha ne tárolj itt projekt-/ügyféladatot – csak projektId hivatkozást,
 * a munkalap.schema.js / penzugyi.schema.js mintájára.
 */

import {
  ANYAGELSZAMOLAS_NINCS_KIVALASZTVA,
  hasAnyagelszamolasiMod,
} from "../../lib/workflowRules.js";
import { getAnyag } from "../../lib/anyagtorzs.js";

export const KIVITELEZESI_CSOMAG_SCHEMA_VERSION = "1.0";

// ─── Létrehozási mód (honnan származik a csomag) ──────────────────────────

export const KIVITELEZESI_CSOMAG_FORRAS = {
  AJANLATBOL:     "ajanlatbol",       // saját munka – elfogadott ajánlatból generálva (automatikus)
  SABLONBOL:      "sablonbol",        // fővállalkozói / belső – PM hozza létre sablonból
  KEZI:           "kezi",             // fővállalkozói / belső – PM kézi tételrögzítéssel
  ANYAGSZAMITO:   "anyagszamito",     // Anyagszámítási Motor – PM jóváhagyása után kerül be (Fázis 5A)
};

// ─── Fázis 4D – státusz alapok (a csomag belső mennyiség-életútja) ────────
// A státuszok egy LINEÁRIS, előre haladó folyamatot írnak le – nincs
// kihagyás és nincs visszalépés (ld. ellenorizStatuszValtas). A sorrend
// maga a tömb sorrendje, a getKivitelezesiCsomagKovetkezoStatus ebből
// számolja ki, mi az egyetlen érvényes következő státusz.
export const KIVITELEZESI_CSOMAG_STATUSZOK = [
  { id: "Tervezet",          szin: "#64748B", bg: "#F8FAFC" },
  { id: "PM jóváhagyta",     szin: "#7C3AED", bg: "#F5F3FF" },
  { id: "Komissiózás alatt", szin: "#D97706", bg: "#FFFBEB" },
  { id: "Anyag kiadva",      szin: "#0EA5E9", bg: "#F0F9FF" },
  { id: "Kivitelezés alatt", szin: "#2563EB", bg: "#EFF6FF" },
  { id: "Lezárva",           szin: "#475569", bg: "#F1F5F9" },
  { id: "Elszámolva",        szin: "#16A34A", bg: "#F0FDF4" },
];

const KIVITELEZESI_CSOMAG_STATUSZ_SORREND = KIVITELEZESI_CSOMAG_STATUSZOK.map(s => s.id);

/**
 * A jelenlegi státusz alapján megmondja, mi az EGYETLEN érvényes következő
 * státusz a lineáris folyamatban. Az utolsó (Elszámolva) után nincs tovább.
 */
export function getKivitelezesiCsomagKovetkezoStatus(statusId) {
  const idx = KIVITELEZESI_CSOMAG_STATUSZ_SORREND.indexOf(statusId);
  if (idx < 0 || idx === KIVITELEZESI_CSOMAG_STATUSZ_SORREND.length - 1) return null;
  return KIVITELEZESI_CSOMAG_STATUSZ_SORREND[idx + 1];
}

/**
 * Lezárt vagy elszámolt csomagban a mennyiségek (és tételek) normál módon
 * NEM szerkeszthetők – admin override későbbi fejlesztés tárgya, most
 * elég a blokkolás (ld. Fázis 4D spec 3. pont).
 */
export function isKivitelezesiCsomagSzerkesztesTiltott(statusId) {
  return statusId === "Lezárva" || statusId === "Elszámolva";
}

// "Kitöltött" mennyiség = valós, véges szám (a 0 is érvényes, hiszen pl.
// egy tételből legitim módon nem adtak ki semmit – csak null/undefined/NaN
// számít hiányzónak).
function szamMezoKitoltott(ertek) {
  return typeof ertek === "number" && Number.isFinite(ertek);
}

/**
 * Megvizsgálja, hogy a csomag a jelenlegi státuszából átléptethető-e a
 * kért új státuszba (Fázis 4D spec 2. pont – státuszváltási szabályok).
 *
 * Visszaad: { ok: boolean, message: string }
 *   - ok=false esetén a message a felhasználónak megjelenítendő indoklás.
 *
 * A folyamat lineáris: kihagyás és visszalépés nem engedélyezett, az
 * "Lezárva → Elszámolva" lépést pedig a hívó oldalon (UI/szolgáltatás)
 * admin/PM jogosultsághoz kell kötni – ez a függvény csak az adat-alapú
 * feltételeket ellenőrzi.
 */
export function ellenorizStatuszValtas(csomag, ujStatus) {
  const jelenlegi = csomag?.status;
  const kovetkezo = getKivitelezesiCsomagKovetkezoStatus(jelenlegi);

  if (!kovetkezo) {
    return { ok: false, message: "Ez a csomag már elérte az utolsó státuszt – további váltás nem lehetséges." };
  }
  if (ujStatus !== kovetkezo) {
    return { ok: false, message: "A státusz csak a sorban következő lépésre léptethető – kihagyás vagy visszalépés nem engedélyezett." };
  }

  const tetelek = csomag?.tetelek || [];

  switch (jelenlegi) {
    case "Tervezet":
      if (tetelek.length === 0) {
        return { ok: false, message: "A jóváhagyáshoz legalább 1 tétel szükséges a csomagban." };
      }
      return { ok: true, message: "" };

    case "PM jóváhagyta":
      return { ok: true, message: "" };

    case "Komissiózás alatt":
      if (tetelek.some(t => !szamMezoKitoltott(t.kiadottMennyiseg))) {
        return { ok: false, message: "Az anyag kiadásához minden tételnél meg kell adni a kiadott mennyiséget." };
      }
      return { ok: true, message: "" };

    case "Anyag kiadva":
      return { ok: true, message: "" };

    case "Kivitelezés alatt":
      if (tetelek.some(t => !szamMezoKitoltott(t.felhasznaltMennyiseg) || !szamMezoKitoltott(t.visszahozottMennyiseg))) {
        return { ok: false, message: "A lezáráshoz minden tételnél rögzíteni kell a felhasznált és a visszahozott mennyiséget." };
      }
      return { ok: true, message: "" };

    case "Lezárva":
      // Pénzügyi logika nélkül, kizárólag admin/PM gomb – a jogosultság-
      // ellenőrzés a service / UI rétegben történik.
      return { ok: true, message: "" };

    default:
      return { ok: false, message: "Ismeretlen státusz – a váltás nem engedélyezett." };
  }
}

export const KIVITELEZESI_CSOMAG_SCHEMA = {
  id:                 "",
  projektId:          "",
  forras:             "",      // KIVITELEZESI_CSOMAG_FORRAS egyik értéke
  ajanlatId:          null,    // ha ajánlatból generálva – forrás-hivatkozás
  status:             "Tervezet",
  tetelek:            [],      // pillanatkép: [{ nev, mennyiseg, egyseg, egysegar, osszesen, ... }]
  arPillanatkepDatum: "",      // mikor rögzült az ár (ajánlatból generáláskor)
  letrehozasMod:      "",      // "automatikus" | "kezi"
  megjegyzesek:       [],
  createdAt:          "",
  updatedAt:          "",
  createdBy:          "",
  updatedBy:          "",
  version:            1,
  syncStatus:         "synced",
};

export function getKivitelezesiCsomagStatusConfig(statusId) {
  return KIVITELEZESI_CSOMAG_STATUSZOK.find(s => s.id === statusId) || { szin: "#64748B", bg: "#F8FAFC" };
}

// ─── Fázis 4B – tétel adatmodell és számítások ────────────────────────────
// Egy tétel a kivitelezés tényleges anyagmozgását követi: mennyi volt a
// terv, mennyit adtak ki a raktárból, mennyit használtak fel ténylegesen,
// és mennyi jött vissza. Az árak (egysegarPillanatkep / beszerzesiArPillanatkep)
// a generáláskor (ld. generateKiviTetelekFromAjanlatPillanatkep) az ELFOGADOTT
// AJÁNLAT PILLANATKÉPÉBŐL másolódnak át – soha nem az élő anyagtörzsből –,
// így egy utólagos árváltozás nem módosíthatja a kivitelezési csomagot sem.
export function makeUresKiviTetel() {
  return {
    id:                    `ktet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    anyagtorzs_id:         null,
    forras:                "",
    cikkszam:              "",
    nev:                   "",
    kategoria:             "",
    egyseg:                "db",
    // ── árak – pillanatkép, csak adatmodell-szinten, a UI nem hangsúlyozza ──
    egysegarPillanatkepEladasi:    0,
    egysegarPillanatkepBeszerzesi: null,
    // ── mennyiségek a kivitelezés folyamata szerint ──
    tervezettMennyiseg:    0,
    kiadandoMennyiseg:     0,
    kiadottMennyiseg:      0,
    felhasznaltMennyiseg:  0,
    visszahozottMennyiseg: 0,
    munkalapFelhasznalas:  [],
    telepitoLathatosag: "NONE",
  };
}

// eltérés = kiadott - felhasznált - visszahozott
// (pozitív: hiány / el nem számolt mennyiség; negatív: többlet visszahozat)
export function calcKiviTetelEltérés(tetel) {
  const ki   = Number(tetel?.kiadottMennyiseg)      || 0;
  const fel  = Number(tetel?.felhasznaltMennyiseg)  || 0;
  const visz = Number(tetel?.visszahozottMennyiseg) || 0;
  return ki - fel - visz;
}

/**
 * Saját ajánlatból induló projektnél a Kivitelezési Csomag tételei az
 * ELFOGADOTT AJÁNLAT PILLANATKÉPÉNEK fo_tetelek listájából generálódnak.
 *
 * Szűrés ("anyag jellegű tétel"): csak azok a fő tételek kerülnek be,
 * amelyeknél van anyagtorzs_id (azaz konkrét anyagtörzs-rekordra mutatnak –
 * ez a séma egyetlen megbízható, egyértelmű jelzője az "anyag jellegnek";
 * a kivitelezés/munkadíj jellegű tételeknek (kivi_beuzem) nincs anyagtorzs_id-juk,
 * ezért kimaradnak).
 *
 * Árpillanatkép: az eladási és (ha volt) beszerzési ár KIZÁRÓLAG az ajánlat
 * pillanatképéből (netto_egysegar / beszerzesiArPillanatkep) másolódik át –
 * az élő anyagtörzs ára nem kerül beolvasásra. A cikkszám és a kategória
 * (leíró, nem pénzügyi adat) a generálás pillanatában érvényes anyagtörzs-
 * rekordból töltődik fel egyszeri pillanatképként (getAnyag).
 */
export function generateKiviTetelekFromAjanlatPillanatkep(pillanatkep) {
  if (!pillanatkep) return [];
  const fo = pillanatkep.fo_tetelek || [];
  return fo
    .filter(t => t.aktiv && t.anyagtorzs_id != null)
    .map(t => {
      const anyag = getAnyag(t.anyagtorzs_id);
      const mennyiseg = Number(t.mennyiseg) || 0;
      return {
        id:                    `ktet_${t.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        anyagtorzs_id:         t.anyagtorzs_id,
        forras:                KIVITELEZESI_CSOMAG_FORRAS.AJANLATBOL,
        cikkszam:              anyag?.kulsoAzonosito || "",
        nev:                   t.label || t.tipus || anyag?.nev || "",
        kategoria:             anyag?.telepitoi_kategoria || anyag?.kategoria || "",
        egyseg:                t.egyseg || anyag?.egyseg || "db",
        egysegarPillanatkepEladasi:    Number(t.netto_egysegar) || 0,
        egysegarPillanatkepBeszerzesi: t.beszerzesiArPillanatkep ?? null,
        tervezettMennyiseg:    mennyiseg,
        kiadandoMennyiseg:     0,
        kiadottMennyiseg:      0,
        felhasznaltMennyiseg:  0,
        visszahozottMennyiseg: 0,
        munkalapFelhasznalas:  [],
        telepitoLathatosag: "NONE",
      };
    });
}

// ─── Fázis 4C – pillanatkép-garancia (ellenőrzés és dokumentáció) ─────────
//
// KÉRDÉS: a tételek leíró adatai (cikkszám, megnevezés, kategória, egység,
// beszerzési ár, eladási ár) valódi PILLANATKÉPEK-e, vagyis egy később
// módosított anyagtörzs-rekord nem írja-e felül őket utólag?
//
// VÁLASZ – igen, garantáltan azok, az alábbi okok miatt:
//   1. A tétel létrehozásakor (generateKiviTetelekFromAjanlatPillanatkep ÉS
//      createKeziTetelPillanatkep) a getAnyag(...) hívás eredménye azonnal
//      egy ÚJ, sima JS-objektumba (a tételbe) másolódik – nem referencia,
//      hanem érték-másolat (string/number mezők).
//   2. A tétel ezután KIZÁRÓLAG a kivitelesi_csomagok kollekcióban, a saját
//      mezőin keresztül érhető el (ld. TabKivitelezesiCsomag.jsx – mindig
//      `t.cikkszam`, `t.nev`, `t.egysegarPillanatkepEladasi` stb. olvas,
//      SOHA nem hív getAnyag()-ot megjelenítéskor).
//   3. A "...Pillanatkep" mező-elnevezési konvenció (ld. ajánlat-pillanatkép,
//      Fázis 4A) explicit jelzi, hogy az ár-mezők befagyasztott értékek.
//   4. Az anyagtörzs updateAnyag()-ja a kivitelezesi_csomagok kollekciót
//      sosem írja vissza – a két kollekció teljesen független egymástól
//      a létrehozás utáni pillanattól kezdve.
//
// KÖVETKEZTETÉS: élő anyagtörzs-módosítás (név, kategória, ár, cikkszám
// átírása) a már létrehozott tételeket NEM változtatja meg – pontosan
// úgy, ahogy az elfogadott ajánlat pillanatképe sem változik utólag.
//
/**
 * Kézi tétel pillanatkép-objektum létrehozása egy kiválasztott anyagtörzs-
 * rekordból (Fázis 4C – kézi tételkezelés fővállalkozói / belső projektekhez).
 *
 * Szabad szöveges anyagfelvitel NINCS – a tétel kizárólag létező
 * anyagtörzs-rekordból generálható (anyagtorzsId kötelező).
 *
 * A pillanatkép minden leíró adatot és árat a hívás pillanatában érvényes
 * anyagtörzs-rekordból másol át (cikkszám, megnevezés, kategória, egység,
 * beszerzési ár = netto_egysegar, eladási ár = javasoltEladasiAr) – ezután
 * teljesen független az anyagtörzstől (ld. fenti pillanatkép-garancia).
 *
 * Mennyiségek: a hívó csak tervezett és kiadandó mennyiséget adhat meg –
 * a kiadott / felhasznált / visszahozott mezők 0-ról indulnak.
 */
export function createKeziTetelPillanatkep(anyagtorzsId, mennyisegek = {}) {
  const anyag = getAnyag(anyagtorzsId);
  if (!anyag) return null;
  return {
    id:                    `ktet_${anyag.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    anyagtorzs_id:         anyag.id,
    forras:                KIVITELEZESI_CSOMAG_FORRAS.KEZI,
    cikkszam:              anyag.kulsoAzonosito || "",
    nev:                   anyag.nev || "",
    kategoria:             anyag.telepitoi_kategoria || anyag.kategoria || "",
    egyseg:                anyag.egyseg || "db",
    egysegarPillanatkepEladasi:    Number(anyag.javasoltEladasiAr) || 0,
    egysegarPillanatkepBeszerzesi: Number(anyag.netto_egysegar) || 0,
    tervezettMennyiseg:    Number(mennyisegek.tervezettMennyiseg) || 0,
    kiadandoMennyiseg:     Number(mennyisegek.kiadandoMennyiseg) || 0,
    kiadottMennyiseg:      0,
    felhasznaltMennyiseg:  0,
    visszahozottMennyiseg: 0,
    munkalapFelhasznalas:  [],
    telepitoLathatosag: "NONE",
  };
}

/**
 * Anyagszámítási Motor által javasolt tétel pillanatkép-objektuma
 * (Fázis 5A – PM jóváhagyása UTÁN, az előnézetből kerül be a csomagba).
 *
 * Ugyanazt a pillanatkép-garanciát követi, mint createKeziTetelPillanatkep:
 * a leíró adatok és árak a hívás pillanatában érvényes anyagtörzs-rekordból
 * másolódnak át, ezután teljesen függetlenek attól (ld. fenti pillanatkép-
 * garancia dokumentáció). A motor által számolt mennyiség a tervezett
 * mennyiségbe kerül – a kiadandó/kiadott/felhasznált/visszahozott mezőket
 * a PM tölti ki a csomag további életútja során (ld. Fázis 4D).
 *
 * Csak létező anyagtörzs-rekordra hívható (anyagtorzsId kötelező, a hívó
 * – generateAnyagszamitas – garantáltan csak ilyenekre ad vissza sort).
 */
export function createAnyagszamitoTetelPillanatkep(anyagtorzsId, szamoltMennyiseg) {
  const anyag = getAnyag(anyagtorzsId);
  if (!anyag) return null;
  return {
    id:                    `ktet_${anyag.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    anyagtorzs_id:         anyag.id,
    forras:                KIVITELEZESI_CSOMAG_FORRAS.ANYAGSZAMITO,
    cikkszam:              anyag.kulsoAzonosito || "",
    nev:                   anyag.nev || "",
    kategoria:             anyag.telepitoi_kategoria || anyag.kategoria || "",
    egyseg:                anyag.egyseg || "db",
    egysegarPillanatkepEladasi:    Number(anyag.javasoltEladasiAr) || 0,
    egysegarPillanatkepBeszerzesi: Number(anyag.netto_egysegar) || 0,
    tervezettMennyiseg:    Number(szamoltMennyiseg) || 0,
    kiadandoMennyiseg:     0,
    kiadottMennyiseg:      0,
    felhasznaltMennyiseg:  0,
    visszahozottMennyiseg: 0,
    munkalapFelhasznalas:  [],
    telepitoLathatosag: "NONE",
  };
}

/**
 * Előfeltétel-ellenőrzés a Kivitelezési Csomag létrehozása előtt
 * (a tényleges létrehozási logika és UI még nem készült el – Fázis 1
 * csak ezt a kaput definiálja, hogy a következő fázisok erre épülhessenek).
 *
 * Kötelező feltételek:
 *   - a projekt forrása ki van töltve
 *   - az anyagelszámolási mód ki van választva (≠ NINCS_KIVALASZTVA)
 *   - a szükséges projektadatok megvannak (projekt neve)
 */
export function canCreateKivitelezesiCsomag(projekt) {
  if (!projekt?.forrás) {
    return { ok: false, message: "A projekt forrásának megadása kötelező a Kivitelezési Csomag létrehozása előtt." };
  }
  if (!hasAnyagelszamolasiMod(projekt)) {
    return { ok: false, message: "Az anyagelszámolási mód kiválasztása kötelező a Kivitelezési Csomag létrehozása előtt." };
  }
  if (!projekt?.nev?.trim()) {
    return { ok: false, message: "Hiányzó projektadatok – a projekt neve kötelező." };
  }
  return { ok: true, message: "" };
}

/**
 * Megmondja, hogy az adott projekt forrása szerint a Kivitelezési Csomag
 * automatikusan (elfogadott ajánlatból) jöhet-e létre, vagy a PM-nek
 * kézzel kell létrehoznia.
 *
 *   sajat_ajanlat        → "automatikus"  (elfogadott ajánlatból)
 *   fovallalkozoi_munka  → "kezi"         (PM gombbal, sablonból vagy kézi tételekkel)
 *   belso_munka          → "opcionalis"   (csak ha a PM létrehozza)
 */
export function getKivitelezesiCsomagLetrehozasMod(projektForras) {
  if (projektForras === "sajat_ajanlat")       return "automatikus";
  if (projektForras === "fovallalkozoi_munka") return "kezi";
  if (projektForras === "belso_munka")         return "opcionalis";
  return null;
}

export { ANYAGELSZAMOLAS_NINCS_KIVALASZTVA };
