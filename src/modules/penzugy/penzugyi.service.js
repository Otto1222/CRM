/**
 * penzugyi.service.js
 * Pénzügyi rekord CRUD + automatikus előkészítés.
 * Ne importálj ide workorder.service.js-t (circular import) –
 * a munkalapokat a hívó adja paraméterként.
 */
import { PENZUGYI_SCHEMA } from "./penzugyi.schema.js";
import { getBevetelTipus, calcProfit, defaultSzamlazasStatusz } from "../../lib/penzugyiRules.js";
import { calcEsmentProjektPenzugy } from "../../services/workOrderFinancial.service.js";
import { driveSave } from "../../lib/driveApi.js";
import { loadProjektek } from "../projektek/projekt.service.js";
import { loadKarteritesek } from "../../lib/karterites.js";
import { getCsapat } from "../csapatok/csapat.service.js";

const KEY = "penzugyi";

function dispatch() {
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: KEY } }));
}

function notifySyncFailed() {
  window.dispatchEvent(new CustomEvent("crm-sync-warning", {
    detail: { message: "Pénzügyi rekord mentve helyileg, de nincs szinkronizálva." },
  }));
}

// ─── Betöltés ─────────────────────────────────────────────────

export function loadAllPenzugyi() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function getPenzugyi(projektId) {
  return loadAllPenzugyi().find(r => r.projektId === projektId) || null;
}

// ─── Mentés ───────────────────────────────────────────────────

export function saveAllPenzugyi(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch();
  driveSave(KEY, { [KEY]: list }).catch(() => notifySyncFailed());
}

// ─── Létrehozás / frissítés ───────────────────────────────────

export function upsertPenzugyi(data, user = "") {
  const all = loadAllPenzugyi();
  const idx = all.findIndex(r => r.projektId === data.projektId);
  const now = new Date().toISOString();

  const existing = idx >= 0 ? all[idx] : null;
  const record = {
    ...PENZUGYI_SCHEMA,
    ...(existing || {}),
    ...data,
    id:         existing?.id || `pnz_${crypto.randomUUID()}`,
    createdAt:  existing?.createdAt || now,
    updatedAt:  now,
    createdBy:  existing?.createdBy || user,
    updatedBy:  user || existing?.updatedBy || "",
    version:    (existing?.version || 0) + 1,
    syncStatus: "synced",
  };

  // Profit újraszámítás ha változott bevétel vagy költség
  const koltseg = (
    (record.anyagKoltsegNetto || 0) +
    (record.sajatCsapatKoltsegNetto || 0) +
    (record.alvallalkozoKoltsegNetto || 0) +
    (record.kiszallasKoltsegNetto || 0) +
    (record.emeloKoltsegNetto || 0) +
    (record.egyebKoltsegNetto || 0)
  );
  record.osszesKoltsegNetto = koltseg;
  const { profitNetto, fedezetSzazalek } = calcProfit(record.bevetelNetto, koltseg);
  record.profitNetto      = profitNetto;
  record.fedezetSzazalek  = fedezetSzazalek;

  if (idx >= 0) {
    all[idx] = record;
  } else {
    all.push(record);
  }

  saveAllPenzugyi(all);
  return record;
}

export function deletePenzugyi(projektId) {
  saveAllPenzugyi(loadAllPenzugyi().filter(r => r.projektId !== projektId));
}

// ─── Automatikus előkészítés (trigger: minden munkalap lezárva) ──────
//
// Hívja a workorder.service.js, dinamikus importtal (nem importálja vissza).
// A munkalapokat paraméterként kapja – nincs circular import.

export function autoElszamolasElokeszites(projektId, munkalapok, user = "system") {
  const existing = getPenzugyi(projektId);

  // Ha már jóváhagyva vagy ellenőrzés alatt → ne írja felül
  if (existing && ["Jóváhagyva", "Ellenőrzés alatt"].includes(existing.elszamolasStatusz)) {
    return existing;
  }

  const projektek = loadProjektek();
  const projekt = projektek.find(p => p.id === projektId);
  if (!projekt) return null;

  // Kalkuláció Motor A-val (workOrderFinancial.service.js)
  let kalk = {};
  try {
    kalk = calcEsmentProjektPenzugy(projekt) || {};
  } catch { /* folytatás alapértékekkel */ }

  const forrás = projekt.forrás;
  const bevetelTipus = getBevetelTipus(forrás);

  // Bevétel forrás szerint
  let bevetelNetto = 0;
  if (forrás === "sajat_ajanlat") {
    bevetelNetto = projekt.elfogadottAjanlat || kalk.nettoBevitel || 0;
  } else if (forrás === "fovallalkozoi_munka") {
    bevetelNetto = kalk.nettoBevitel || 0;
  }
  // belso_munka: bevetelNetto = 0

  const szamlazasStatusz = existing?.szamlazasStatusz || defaultSzamlazasStatusz(forrás);

  return upsertPenzugyi({
    projektId,
    projektForras:            forrás,
    bevetelTipus,
    bevetelNetto,
    anyagKoltsegNetto:        kalk.anyagkoltság || kalk.anyagkoltség || 0,
    sajatCsapatKoltsegNetto:  kalk.csapatBer    || 0,
    alvallalkozoKoltsegNetto: kalk.alvallalkozoiBer || 0,
    kiszallasKoltsegNetto:    kalk.utikoltség   || kalk.utikoltség  || 0,
    emeloKoltsegNetto:        kalk.emelőgepKoltseg || 0,
    egyebKoltsegNetto:        kalk.egyebKoltseg || 0,
    // Státusz: ha volt már rekord, csak ha "Nincs előkészítve" frissítjük
    elszamolasStatusz: existing?.elszamolasStatusz === "Nincs előkészítve" || !existing
      ? "Előkészítve"
      : existing.elszamolasStatusz,
    szamlazasStatusz,
    tigStatusz: existing?.tigStatusz || "Nem szükséges",
    elszamolasNotes: existing?.elszamolasNotes || "",
    tigNotes:        existing?.tigNotes || "",
  }, user);
}

// ─── Dashboard élő kalkuláció – közös segédek ─────────────────
//
// FONTOS: ezek SOHA nem a kézzel előkészített `penzugyi` rekordból
// (upsertPenzugyi / autoElszamolasElokeszites) számolnak – az csak akkor
// jön létre, ha valaki megnyitja a projekt Pénzügy fülét, vagy ha MINDEN
// munkalapja lezárva (ld. workorder.service.js). Egy frissen létrehozott,
// még folyamatban lévő projektnél ez sosem létezik, ezért a dashboard eddig
// mindig 0-t mutatott, függetlenül attól, hány valós projekt van. Ehelyett
// élőben, a projekt aktuális penzugy-adataiból számolunk – ugyanazzal a
// motorral (Motor A – workOrderFinancial.service.js calcEsmentProjektPenzugy),
// amit a lenti "Projekt szintű fővállalkozói elszámolás" tábla is használ,
// így egyik dashboard-blokk sem mond ellent a másiknak.

// Élő kalkuláció projektenként (hibatűrő – egy rossz konfigú projekt
// ne dobja el az egész dashboardot).
function eloKalk(p) {
  try { return calcEsmentProjektPenzugy(p) || {}; }
  catch { return {}; }
}

// Bevétel forrás szerinti feloldása – ugyanaz a szabály, mint
// autoElszamolasElokeszites-ben: saját munkánál az elfogadott
// ajánlat/tétel a mérvadó, nem a fővállalkozói díjtétel-motor
// (aminek saját munkánál nincs is mit számolnia).
function resolveBevetel(p, kalk) {
  if (p.forrás === "sajat_ajanlat" || p.forrás === "saját_ügyfél") {
    return p.elfogadottAjanlat || kalk.nettoBevitel || 0;
  }
  if (p.forrás === "fovallalkozoi_munka" || p.forrás === "fővállalkozói") {
    return kalk.nettoBevitel || 0;
  }
  return 0;
}

// ─── Dashboard KPI számítás ───────────────────────────────────
export function calcDashboardPenzugyiKpik(projektek, munkalapok = []) {
  const penzugyik = loadAllPenzugyi();

  // Segédfüggvény: projekt + penzügyi rekord összekapcsolása
  function enrich(p) {
    return { ...p, _penzugyi: penzugyik.find(r => r.projektId === p.id) || null };
  }

  const enriched = projektek.map(enrich);
  const aktivProjektek = enriched.filter(p => p.status !== "Lezárt");

  return {
    // Készre jelentett, de elszámolás nincs előkészítve → piros figyelmeztetés
    keszreJelentettElszamolasNelkul: enriched.filter(p =>
      p.status === "Készre jelentve" &&
      (!p._penzugyi || p._penzugyi.elszamolasStatusz === "Nincs előkészítve")
    ).length,

    // Számlázható projektek (projekt státusz = Számlázható) – ez már eddig is
    // élőben, a projekt.status-ból jött, nem a penzugyi rekordból.
    szamlazhatoProjektek: enriched.filter(p => p.status === "Számlázható"),

    // Számlázva, de nem kifizetett – ez valódi számlázási esemény, csak a
    // penzugyi rekordban követhető (nincs rá projekt.status érték).
    szamlazvaKifizetesre: enriched.filter(p =>
      p._penzugyi?.szamlazasStatusz === "Számlázva"
    ),

    // FV várható bevétel – élő kalkuláció minden aktív fővállalkozói
    // projektre, nem csak a kézzel előkészítettekre.
    fovVarhatoBevetel: aktivProjektek
      .filter(p => p.forrás === "fovallalkozoi_munka" || p.forrás === "fővállalkozói")
      .reduce((s, p) => s + resolveBevetel(p, eloKalk(p)), 0),

    // Saját projektek várható profitja – élő bevétel (elfogadott ajánlat)
    // mínusz élő költség (Motor A), minden aktív saját munkára.
    sajatVarhatoProfit: aktivProjektek
      .filter(p => p.forrás === "sajat_ajanlat" || p.forrás === "saját_ügyfél")
      .reduce((s, p) => {
        const kalk = eloKalk(p);
        return s + (resolveBevetel(p, kalk) - (kalk.osszesKolts || 0));
      }, 0),

    // Belső munkák költsége – a hozzájuk tartozó munkalapok tényleges
    // anyag- és munkadíj-tételeiből összegezve (nincs bevétel, csak költség).
    belsoMunkaKoltseg: enriched
      .filter(p => p.forrás === "belso_munka")
      .reduce((s, p) => {
        const sajatMls = munkalapok.filter(m => m.projektId === p.id);
        const koltseg = sajatMls.reduce((x, m) => x +
          (m.items || []).reduce((y, i) => y + (i.net || i.ar || 0) * (i.qty || i.mennyiseg || 1), 0) +
          (m.munkaeroDij || 0) + (m.kiszallasiDij || 0) + (m.egyebKolts || 0), 0);
        return s + koltseg;
      }, 0),
  };
}

// ─── Dashboard – teljes pénzügyi összesítő (bevétel/kiadás/haszon + bontás) ──
//
// A Dashboard "Pénzügyi összesítő" blokkjához: összes bevétel, összes kiadás,
// haszon, és a kiadás kategóriánkénti bontása (saját csapat bér, alvállalkozói
// díj, szerelési anyag, üzemanyag/kiszállás, kártérítés, egyéb) – minden AKTÍV
// (nem "Lezárt") projektre, élőben számolva. A fővállalkozói/saját projektek
// Motor A-val (calcEsmentProjektPenzugy) számolnak, a belső munkáké a hozzájuk
// kötött munkalapok tényleges tételeiből (nincs FV-díjszabás, nincs bevétel).
export function calcDashboardPenzugyiOsszesito(projektek, munkalapok = []) {
  const aktivProjektek = projektek.filter(p => p.status !== "Lezárt");
  const fovSajat = aktivProjektek.filter(p =>
    ["fovallalkozoi_munka", "fővállalkozói", "sajat_ajanlat", "saját_ügyfél"].includes(p.forrás)
  );
  const belso = aktivProjektek.filter(p => p.forrás === "belso_munka");

  // "csapatBer" itt EGYETLEN, összevont sor: minden pénz, ami a kivitelező
  // csapatokhoz kerül – akár saját, akár alvállalkozó csapatról van szó,
  // akár a régi kézi mezőből (keziCsapatBer), akár az AV szabály-motorból
  // (alvallalkozoiBer) jön. Korábban ez két külön sorban ("Saját csapat
  // bér" / "Alvállalkozói díj") jelent meg, ami félrevezető volt: egy
  // saját csapat AV szabály szerinti bére is az "Alvállalkozói díj"
  // sorban landolt, mintha külsős cégnek fizetnénk ki.
  const bontas = {
    csapatBer: 0, anyagkoltseg: 0, szerelesiAnyag: 0, szerszam: 0, utikoltseg: 0, egyeb: 0,
  };
  let osszesBevetel = 0;

  fovSajat.forEach(p => {
    const kalk = eloKalk(p);
    osszesBevetel        += resolveBevetel(p, kalk);
    bontas.csapatBer      += (kalk.csapatBer || 0) + (kalk.alvallalkozoiBer || 0) + (kalk.alvallalkozoiKmBer || 0);
    bontas.anyagkoltseg   += kalk.anyagkoltság || 0;
    bontas.szerelesiAnyag += kalk.szerelesiAnyagKoltseg || 0;
    bontas.szerszam       += kalk.szerszamKoltseg || 0;
    bontas.utikoltseg     += kalk.utikoltség || 0;
    bontas.egyeb          += (kalk.emelőgepKoltseg || 0) + (kalk.daruKoltseg || 0)
                            + (kalk.szallasKoltseg || 0) + (kalk.bereltEszkozKoltseg || 0)
                            + (kalk.egyebKoltseg || 0);
  });

  belso.forEach(p => {
    const mls = munkalapok.filter(m => m.projektId === p.id);
    mls.forEach(m => {
      bontas.anyagkoltseg += (m.items || []).reduce((y, i) => y + (i.net || i.ar || 0) * (i.qty || i.mennyiseg || 1), 0);
      bontas.csapatBer    += m.munkaeroDij || 0;
      bontas.utikoltseg   += m.kiszallasiDij || 0;
      bontas.egyeb        += m.egyebKolts || 0;
    });
  });

  // Kártérítés: a globális elfogadott kártérítés-összeg (nem projektenként
  // Motor A-ból, mert az a saját/FV szétbontásnál duplikálná – a belső
  // munkára eső kártérítést viszont csak így kapjuk el).
  const karteritesOsszeg = loadKarteritesek()
    .filter(k => k.elfogadott === true)
    .reduce((s, k) => s + (k.osszeg || 0), 0);

  const osszesKiadas = bontas.csapatBer + bontas.anyagkoltseg + bontas.szerelesiAnyag
    + bontas.szerszam + bontas.utikoltseg + bontas.egyeb + karteritesOsszeg;
  const haszon    = osszesBevetel - osszesKiadas;
  const haszonPct = osszesBevetel > 0 ? Math.round((haszon / osszesBevetel) * 100) : null;

  return {
    osszesBevetel, osszesKiadas, haszon, haszonPct,
    koltsegBontas: { ...bontas, karterites: karteritesOsszeg },
  };
}

// ─── Dashboard – csapatonkénti bér-bontás ─────────────────────
//
// "Ki mennyit hoz be, ki mennyit visz el" – a fenti összesítő csak EGY
// közös "csapatBer" számot ad. Ez a függvény ugyanezt a pénzt csapatokra
// bontja szét, DINAMIKUSAN: nincs fix csapatlista, amelyik csapathoz van
// aktív munkalapja/projektje, az automatikusan bekerül a listába a saját
// összegével – új csapat felvételekor semmit nem kell itt karbantartani.
export function calcCsapatBerBontas(projektek, munkalapok = []) {
  const aktivProjektek = projektek.filter(p => p.status !== "Lezárt");
  const map = new Map();

  function add(csapatId, osszeg) {
    const ertek = Number(osszeg) || 0;
    if (!ertek) return;
    const key = csapatId || "_nincs";
    const csapat = csapatId ? getCsapat(csapatId) : null;
    const cur = map.get(key) || {
      csapatId: key,
      nev: csapat?.nev || "Nincs hozzárendelt csapat",
      tipus: csapat?.tipus || "",
      osszeg: 0,
    };
    cur.osszeg += ertek;
    map.set(key, cur);
  }

  aktivProjektek
    .filter(p => ["fovallalkozoi_munka", "fővállalkozói", "sajat_ajanlat", "saját_ügyfél"].includes(p.forrás))
    .forEach(p => {
      const kalk = eloKalk(p);
      const csapatId = p.penzugy?.csapatId || p.csapatId || "";
      add(csapatId, (kalk.csapatBer || 0) + (kalk.alvallalkozoiBer || 0) + (kalk.alvallalkozoiKmBer || 0));
    });

  aktivProjektek
    .filter(p => p.forrás === "belso_munka")
    .forEach(p => {
      munkalapok.filter(m => m.projektId === p.id).forEach(m => {
        add(m.csapatId || m.assigneeId || "", m.munkaeroDij || 0);
      });
    });

  return [...map.values()].sort((a, b) => b.osszeg - a.osszeg);
}
