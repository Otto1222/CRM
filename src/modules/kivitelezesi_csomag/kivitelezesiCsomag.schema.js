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
};

export const KIVITELEZESI_CSOMAG_STATUSZOK = [
  { id: "Tervezet", szin: "#64748B", bg: "#F8FAFC" },
  { id: "Aktív",    szin: "#2563EB", bg: "#EFF6FF" },
  { id: "Lezárt",   szin: "#475569", bg: "#F1F5F9" },
];

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
      };
    });
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
