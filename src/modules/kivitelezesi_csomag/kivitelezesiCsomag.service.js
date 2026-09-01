/**
 * kivitelezesiCsomag.service.js
 * Kivitelezési Csomag CRUD – Fázis 4B alap szolgáltatások.
 *
 * Védelem: egy projekthez egyidejűleg csak EGY Kivitelezési Csomag tartozhat
 * (ld. createKivitelezesiCsomagForProjekt – duplikáció-ellenőrzés projektId alapján).
 */
import { loadLocal, saveLocal } from "../../lib/localDb.js";
import {
  KIVITELEZESI_CSOMAG_SCHEMA,
  KIVITELEZESI_CSOMAG_FORRAS,
  generateKiviTetelekFromAjanlatPillanatkep,
  generateKiviTetelekFromExcelPillanatkep,
  createKeziTetelPillanatkep,
  createAnyagszamitoTetelPillanatkep,
  ellenorizStatuszValtas,
  isKivitelezesiCsomagSzerkesztesTiltott,
} from "./kivitelezesiCsomag.schema.js";
import { adjustAnyagKeszlet } from "../../lib/anyagtorzs.js";
import { addRaktarMozgas, RAKTAR_MOZGAS_TIPUSOK } from "../../lib/raktarMozgas.js";
import { PROJEKT_STATUSZOK } from "../../lib/workflowRules.js";

// ─── Fázis 6D – Visszahozott anyag jóváhagyási állapotai ────────────────────
// A telepítő csak BEJELENTI (JELENTVE), mennyit hoz vissza – a raktárkészletet
// csak PM/Raktár JOVAHAGYVA döntése módosítja, és csak akkor engedett, ha a
// munkalapot a telepítő csapat már lezárta (ld. approveVisszahozas).
export const VISSZAHOZAS_ALLAPOTOK = {
  NINCS:      "NINCS",
  JELENTVE:   "JELENTVE",
  JOVAHAGYVA: "JOVAHAGYVA",
  ELUTASITVA: "ELUTASITVA",
};

const MENNYISEGI_MEZOK = [
  "tervezettMennyiseg",
  "kiadandoMennyiseg",
  "kiadottMennyiseg",
  "felhasznaltMennyiseg",
  "visszahozottMennyiseg",
];

const KEY = "kivitelezesi_csomagok";

function dispatch() {
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: KEY } }));
}

// ─── CRUD ─────────────────────────────────────────────────────────────────

export function loadKivitelezesiCsomagok() {
  return loadLocal(KEY) || [];
}

export function saveKivitelezesiCsomagok(list) {
  saveLocal(KEY, list);
  dispatch();
}

export function getKivitelezesiCsomagByProjektId(projektId) {
  return loadKivitelezesiCsomagok().find(k => k.projektId === projektId) || null;
}

/**
 * Kivitelezési Csomag létrehozása egy projekthez.
 *
 *   - Saját ajánlatból induló projekt (ajanlatPillanatkep megadva):
 *     a tételek a pillanatkép fo_tetelek-jéből generálódnak (ld.
 *     generateKiviTetelekFromAjanlatPillanatkep) – forras = "ajanlatbol",
 *     letrehozasMod = "automatikus".
 *   - Saját munka, elfogadott tételes Excel alapján (excelPillanatkep
 *     megadva, P0-007): a tételek az importált Excel soraiból generálódnak
 *     (ld. generateKiviTetelekFromExcelPillanatkep) – forras = "tetelesExcelbol",
 *     letrehozasMod = "automatikus". Csak akkor számít, ha ajanlatPillanatkep
 *     nincs megadva.
 *   - Fővállalkozói / belső projekt (egyik pillanatkép sincs megadva):
 *     üres tétellistával jön létre, a PM tölti fel kézzel –
 *     forras = "kezi", letrehozasMod = "kezi".
 *
 * Duplikáció-védelem: ha a projekthez már tartozik csomag, a függvény
 * hibát dob és NEM hoz létre másodikat.
 */
export function createKivitelezesiCsomagForProjekt(projekt, ajanlatPillanatkep = null, user = "", excelPillanatkep = null) {
  if (!projekt?.id) {
    throw new Error("Kivitelezési Csomag létrehozásához projekt szükséges.");
  }
  if (getKivitelezesiCsomagByProjektId(projekt.id)) {
    throw new Error("Ehhez a projekthez már tartozik Kivitelezési Csomag – egy projekthez csak egy lehet.");
  }

  const now = new Date().toISOString();
  const automatikusAjanlat = !!ajanlatPillanatkep;
  const automatikusExcel   = !automatikusAjanlat && !!excelPillanatkep;
  const automatikus = automatikusAjanlat || automatikusExcel;
  const tetelek = automatikusAjanlat
    ? generateKiviTetelekFromAjanlatPillanatkep(ajanlatPillanatkep)
    : automatikusExcel
    ? generateKiviTetelekFromExcelPillanatkep(excelPillanatkep)
    : [];

  const csomag = {
    ...KIVITELEZESI_CSOMAG_SCHEMA,
    id:                 `kcs_${crypto.randomUUID()}`,
    projektId:          projekt.id,
    forras:             automatikusAjanlat ? KIVITELEZESI_CSOMAG_FORRAS.AJANLATBOL
                       : automatikusExcel   ? KIVITELEZESI_CSOMAG_FORRAS.EXCEL_IMPORT
                       : KIVITELEZESI_CSOMAG_FORRAS.KEZI,
    ajanlatId:          automatikusAjanlat ? (ajanlatPillanatkep.ajanlatId || projekt.ajanlatId || null) : null,
    status:             "Tervezet",
    tetelek,
    arPillanatkepDatum: automatikus ? now : "",
    letrehozasMod:      automatikus ? "automatikus" : "kezi",
    megjegyzesek:       [],
    createdAt:          now,
    updatedAt:          now,
    createdBy:          user,
    updatedBy:          user,
    version:            1,
    syncStatus:         "synced",
  };

  saveKivitelezesiCsomagok([...loadKivitelezesiCsomagok(), csomag]);
  return csomag;
}

export function updateKivitelezesiCsomag(id, updates, user = "") {
  const list = loadKivitelezesiCsomagok();
  const idx  = list.findIndex(k => k.id === id);
  if (idx < 0) return null;

  const old = list[idx];
  const updated = {
    ...old,
    ...updates,
    updatedAt:  new Date().toISOString(),
    updatedBy:  user || old.updatedBy,
    version:    (old.version || 0) + 1,
    syncStatus: "synced",
  };
  list[idx] = updated;
  saveKivitelezesiCsomagok(list);
  return updated;
}

export function addTetelToKivitelezesiCsomag(csomagId, tetel, user = "") {
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) return null;
  return updateKivitelezesiCsomag(csomagId, { tetelek: [...(csomag.tetelek || []), tetel] }, user);
}

/**
 * Excel/CSV-ből beolvasott tételek (ld. tetelesExcelImport.js +
 * TetelesExcelImportPanel.jsx) tömeges hozzáadása egy MÁR LÉTEZŐ
 * Kivitelezési Csomaghoz – nem csak projekt-létrehozáskor (ld.
 * createKivitelezesiCsomagForProjekt), hanem bármikor utólag is.
 *
 * Fővállalkozói munkánál tipikusan kétszer is használt: egyszer a
 * fővállalkozó saját tételes listájával, egyszer a PM kiegészítő
 * (szerelési kellék, csavar, kábel stb.) listájával – mindkettő
 * ugyanabba a csomagba kerül, egymást nem írják felül.
 *
 * A generateKiviTetelekFromExcelPillanatkep() ugyanazt az alakot adja,
 * mint a projekt-létrehozáskori Excel-import (anyagtorzs_id: null –
 * szabad szöveges tétel, nincs anyagtörzs-kényszer), ezért ugyanaz a
 * kód szolgálja ki mindkét belépési pontot, nincs duplikálva.
 */
export function addExcelTetelekToKivitelezesiCsomag(csomagId, excelTetelek = [], user = "") {
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) throw new Error("A Kivitelezési Csomag nem található.");
  const ujTetelek = generateKiviTetelekFromExcelPillanatkep({ tetelek: excelTetelek });
  if (ujTetelek.length === 0) return csomag;
  return updateKivitelezesiCsomag(csomagId, { tetelek: [...(csomag.tetelek || []), ...ujTetelek] }, user);
}

/**
 * Kézi tétel hozzáadása a Kivitelezési Csomaghoz – kizárólag létező
 * anyagtörzs-rekordból (Fázis 4C). Szabad szöveges anyagfelvitel nincs:
 * a tétel mindig createKeziTetelPillanatkep(...) segítségével, az
 * anyagtörzs aktuális adatainak egyszeri lemásolásával jön létre.
 *
 * Duplikáció-védelem: ha az adott anyagtorzs_id már szerepel a csomag
 * valamelyik tételében, a függvény hibát dob és NEM vesz fel új sort –
 * ugyanúgy, ahogy createKivitelezesiCsomagForProjekt is teszi a
 * projekt-szintű duplikáció esetén (UI ezt elkapja és megjeleníti).
 */
export function addKeziTetelToKivitelezesiCsomag(csomagId, anyagtorzsId, mennyisegek = {}, user = "", anyagelszamolasiMod = null) {
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) {
    throw new Error("A Kivitelezési Csomag nem található.");
  }
  if ((csomag.tetelek || []).some(t => t.anyagtorzs_id === anyagtorzsId)) {
    throw new Error("Ez az anyag már szerepel a csomagban.");
  }
  const tetel = createKeziTetelPillanatkep(anyagtorzsId, mennyisegek, anyagelszamolasiMod);
  if (!tetel) {
    throw new Error("A kiválasztott anyag nem található az anyagtörzsben.");
  }
  return updateKivitelezesiCsomag(csomagId, { tetelek: [...(csomag.tetelek || []), tetel] }, user);
}

/**
 * Több anyag egyszerre történő felvitele a Kivitelezési Csomagba, egy
 * kosár-jellegű kiválasztásból (ld. AnyagKosarPicker) – ez a "projekt
 * létrehozása UTÁN, a tételes anyaglista összeállítása" lépés fővállalkozói /
 * belső (kézi) projekteknél: a PM itt adja meg, mi kell összesen a
 * projekthez, MIELŐTT bármelyik munkalapot kiosztaná egy csapatnak.
 *
 * Már szereplő anyagnál a mennyiség HOZZÁADÓDIK a meglévő tervezett/kiadandó
 * mennyiséghez (nem felülírja) – így több körben is bővíthető a lista.
 * Új anyagnál új tétel jön létre (createKeziTetelPillanatkep mintájára),
 * tervezett = kiadandó = a megadott mennyiség.
 */
export function addAnyagokBulkToKivitelezesiCsomag(csomagId, picks = [], user = "", anyagelszamolasiMod = null) {
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) {
    throw new Error("A Kivitelezési Csomag nem található.");
  }
  if (isKivitelezesiCsomagSzerkesztesTiltott(csomag.status)) {
    throw new Error("Lezárt vagy elszámolt csomagba nem illeszthető be új tétel.");
  }
  const validPicks = (picks || []).filter(p => p.anyagtorzsId && (Number(p.mennyiseg) || 0) > 0);
  if (validPicks.length === 0) return csomag;

  const tetelek = [...(csomag.tetelek || [])];
  for (const pick of validPicks) {
    const menny = Number(pick.mennyiseg) || 0;
    const idx = tetelek.findIndex(t => t.anyagtorzs_id === pick.anyagtorzsId);
    if (idx >= 0) {
      tetelek[idx] = {
        ...tetelek[idx],
        tervezettMennyiseg: (Number(tetelek[idx].tervezettMennyiseg) || 0) + menny,
        kiadandoMennyiseg:  (Number(tetelek[idx].kiadandoMennyiseg) || 0) + menny,
      };
    } else {
      const uj = createKeziTetelPillanatkep(pick.anyagtorzsId, { tervezettMennyiseg: menny, kiadandoMennyiseg: menny }, anyagelszamolasiMod);
      if (uj) tetelek.push(uj);
    }
  }
  return updateKivitelezesiCsomag(csomagId, { tetelek }, user);
}

/**
 * Kivitelezési Csomag státuszváltása (Fázis 4D – belső mennyiség-életút).
 *
 * A folyamat lineáris (Tervezet → PM jóváhagyta → Komissiózás alatt →
 * Anyag kiadva → Kivitelezés alatt → Lezárva → Elszámolva), kihagyás és
 * visszalépés nem engedélyezett. Az adat-alapú feltételeket (pl. "legalább
 * 1 tétel", "minden tételnél kiadottMennyiseg ki van töltve" stb.)
 * az ellenorizStatuszValtas ellenőrzi – itt csak végrehajtjuk a váltást,
 * vagy hibát dobunk a sérült feltétel üzenetével (UI elkapja és megjeleníti).
 *
 * Tétel SOHA nem törlődik – ez a függvény is csak a status mezőt módosítja.
 */
// Kivitelezési Csomag → Projekt státusz automata frissítés (3. lépés a
// státusz-egyszerűsítéshez – ld. workflowRules.js WORKORDER_TO_PROJECT_STATUS,
// ugyanaz a minta a Munkalap oldalon már működik). Csak ELŐRE léptet, soha
// nem ír felül egy már előrébb tartó projektet (pl. "Vissza kell menni"
// vagy "Készre jelentve" állapotot egy késve befutó csomag-esemény ne
// rántson vissza "Kivitelezés alatt"-ra).
const KIVITELEZESI_CSOMAG_TO_PROJEKT_STATUS = {
  "PM jóváhagyta":     "Kivitelezésre vár",
  "Anyag kiadva":      "Kivitelezés alatt",
  "Kivitelezés alatt": "Kivitelezés alatt",
};

function szinkronizaljProjektStatuszCsomagbol(projektId, ujCsomagStatus, user) {
  const ujProjektStatusz = KIVITELEZESI_CSOMAG_TO_PROJEKT_STATUS[ujCsomagStatus];
  if (!ujProjektStatusz || !projektId) return;
  // Dinamikus import = nincs circular dep (projekt.service.js statikusan
  // importálja ezt a fájlt, ld. assignAnyagokToMunkalap ugyanezen okból).
  import("../projektek/projekt.service.js").then(({ loadProjektek, updateProjekt }) => {
    try {
      const projekt = loadProjektek().find(p => p.id === projektId);
      if (!projekt) return;
      const sorrend = PROJEKT_STATUSZOK.map(s => s.id);
      const curIdx = sorrend.indexOf(projekt.status);
      const ujIdx  = sorrend.indexOf(ujProjektStatusz);
      if (curIdx !== -1 && ujIdx !== -1 && ujIdx <= curIdx) return; // ne lépjen vissza
      updateProjekt(projektId, { status: ujProjektStatusz }, user || "system");
    } catch (e) { console.warn("[setKivitelezesiCsomagStatus] projekt-státusz szinkron sikertelen:", e?.message || e); }
  }).catch(() => {});
}

export function setKivitelezesiCsomagStatus(csomagId, ujStatus, user = "") {
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) {
    throw new Error("A Kivitelezési Csomag nem található.");
  }
  const ellenorzes = ellenorizStatuszValtas(csomag, ujStatus);
  if (!ellenorzes.ok) {
    throw new Error(ellenorzes.message);
  }
  const eredmeny = updateKivitelezesiCsomag(csomagId, { status: ujStatus }, user);
  szinkronizaljProjektStatuszCsomagbol(csomag.projektId, ujStatus, user);
  return eredmeny;
}

/**
 * Egy tétel mennyiségi mezőinek szerkesztése (Fázis 4D spec 3. pont):
 * tervezettMennyiseg, kiadandoMennyiseg, kiadottMennyiseg,
 * felhasznaltMennyiseg, visszahozottMennyiseg.
 *
 * Védelem: Lezárva / Elszámolva státuszban a módosítás TILOS – a függvény
 * hibát dob, admin override későbbi fejlesztés tárgya (ld.
 * isKivitelezesiCsomagSzerkesztesTiltott). Tétel nem törlődik, csak a
 * meglévő tétel mennyiségi mezői frissülnek a megadott (mezőnév → érték)
 * párok szerint – a leíró adatok (pillanatkép) változatlanok maradnak.
 *
 * Az eltérés (kiadott - felhasznált - visszahozott) nem tárolt mező –
 * mindig a calcKiviTetelEltérés számolja ki a tétel aktuális mennyiségeiből,
 * így minden mennyiségváltozás után automatikusan naprakész (Fázis 4D 4. pont).
 */
export function updateKiviTetelMennyisegek(csomagId, tetelId, mezok = {}, user = "") {
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) {
    throw new Error("A Kivitelezési Csomag nem található.");
  }
  if (isKivitelezesiCsomagSzerkesztesTiltott(csomag.status)) {
    throw new Error("Lezárt vagy elszámolt csomagban a mennyiségek nem módosíthatók.");
  }
  if (!(csomag.tetelek || []).some(t => t.id === tetelId)) {
    throw new Error("A tétel nem található a csomagban.");
  }
  const tetelek = csomag.tetelek.map(t => {
    if (t.id !== tetelId) return t;
    const uj = { ...t };
    for (const mezo of MENNYISEGI_MEZOK) {
      if (mezo in mezok) uj[mezo] = Number(mezok[mezo]) || 0;
    }
    return uj;
  });
  return updateKivitelezesiCsomag(csomagId, { tetelek }, user);
}

/**
 * A "Tényleges beszerzési ár" utólagos szerkesztése egy fővállalkozói
 * tételnél – "Fix áras visszaszámlázás" módban a feltöltött (fővállalkozói)
 * ár a pillanatkép-generáláskor csak ALAPÉRTÉKKÉNT kerül a beszerzési ár
 * mezőbe (a saját raktár egyező nevű tételéből, ha van), a PM ide írja be
 * a valós számla/blokk szerinti összeget, amint megvan. A visszatérítési
 * (eladási) ár NEM módosítható itt – az a fővállalkozó fix ára, azt a
 * pillanatkép rögzíti.
 */
export function updateKiviTetelBeszerzesiAr(csomagId, tetelId, ujAr, user = "") {
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) throw new Error("A Kivitelezési Csomag nem található.");
  if (isKivitelezesiCsomagSzerkesztesTiltott(csomag.status)) {
    throw new Error("Lezárt vagy elszámolt csomagban a beszerzési ár nem módosítható.");
  }
  if (!(csomag.tetelek || []).some(t => t.id === tetelId)) {
    throw new Error("A tétel nem található a csomagban.");
  }
  const tetelek = csomag.tetelek.map(t =>
    t.id === tetelId ? { ...t, egysegarPillanatkepBeszerzesi: Number(ujAr) || 0 } : t
  );
  return updateKivitelezesiCsomag(csomagId, { tetelek }, user);
}

/**
 * Az Anyagszámítási Motor előnézetében jóváhagyott sorok beillesztése a
 * Kivitelezési Csomagba (Fázis 5A spec 6–8. pont).
 *
 * A motor (ld. anyagSzamito.service.js – generateAnyagszamitas) önmagában
 * SOSEM ír a csomagba: csak egy előnézeti "anyaglista"-t számol. Ez a
 * függvény a PM jóváhagyása UTÁN, egyetlen lépésben illeszti be a sorokat –
 * NEM destruktív módon:
 *
 *   - a meglévő tételeket nem írja felül és nem módosítja
 *   - minden sorhoz pillanatképet készít (createAnyagszamitoTetelPillanatkep),
 *     forras = "anyagszamito"
 *   - DUPLIKÁCIÓVÉDELEM: ha egy anyagtorzs_id már szerepel a csomagban
 *     (akár a jóváhagyási kör elején, akár az időközben hozzáadott új
 *     sorok miatt), az adott sor NEM kerül be – a "duplikalt" listában
 *     jelzi vissza, hogy már szerepelt. Mennyiség-összevonás (a duplikált
 *     sor mennyiségének hozzáadása a meglévőhöz) későbbi fejlesztés tárgya.
 *
 * Visszaad: { csomag, hozzaadva, duplikalt }
 *   - csomag:    a frissített Kivitelezési Csomag (vagy a változatlan, ha
 *                egyetlen sor sem került be)
 *   - hozzaadva: az újonnan beillesztett tétel-pillanatképek
 *   - duplikalt: a kihagyott sorok (anyagtorzs_id már szerepelt a csomagban)
 */
export function addAnyagszamitoTetelekToKivitelezesiCsomag(csomagId, anyaglista = [], user = "", anyagelszamolasiMod = null) {
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) {
    throw new Error("A Kivitelezési Csomag nem található.");
  }
  if (isKivitelezesiCsomagSzerkesztesTiltott(csomag.status)) {
    throw new Error("Lezárt vagy elszámolt csomagba nem illeszthető be új tétel.");
  }

  const meglevoIdk = new Set((csomag.tetelek || []).map(t => t.anyagtorzs_id));
  const ujTetelek  = [];
  const duplikalt  = [];

  for (const sor of anyaglista) {
    if (meglevoIdk.has(sor.anyagtorzs_id)) {
      duplikalt.push(sor);
      continue;
    }
    const tetel = createAnyagszamitoTetelPillanatkep(sor.anyagtorzs_id, sor.szamoltMennyiseg, anyagelszamolasiMod);
    if (!tetel) continue;
    ujTetelek.push(tetel);
    meglevoIdk.add(sor.anyagtorzs_id);
  }

  const updatedCsomag = ujTetelek.length > 0
    ? updateKivitelezesiCsomag(csomagId, { tetelek: [...(csomag.tetelek || []), ...ujTetelek] }, user)
    : csomag;

  return { csomag: updatedCsomag, hozzaadva: ujTetelek, duplikalt };
}

// ─── Fázis 6A-1 – Telepítő anyagfelhasználás (munkalap-szintű izolált upsert) ─

/**
 * Telepítő munkalap-szintű anyagfelhasználás rögzítése.
 *
 * Minden tételhez upserteli a munkalapFelhasznalas[] tömböt
 * (munkalapId azonosítja az adott munkalap rekordját),
 * majd újraszámolja a felhasznaltMennyiseg értékét az összes
 * munkalap-felhasználás összegeként.
 *
 * Több munkalapos projektvédelem: ha 2 munkalap különböző
 * mennyiséget rögzít ugyanarra a tételre, mindkettő megőrződik –
 * az összesített felhasznaltMennyiseg a kettő ÖSSZEGE, nem felülírás.
 *
 * @param {string} csomagId
 * @param {string} munkalapId
 * @param {Array<{tetelId, menny, megjegyzes}>} felhasznalasok
 * @param {string} [user]
 */
export function updateFelhasznaltMennyisegFromMunkalap(csomagId, munkalapId, felhasznalasok = [], user = "") {
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) return null;

  const now = new Date().toISOString();

  const tetelek = (csomag.tetelek || []).map(t => {
    const fAdat = felhasznalasok.find(f => f.tetelId === t.id);
    if (!fAdat) return t;

    const meglevo = t.munkalapFelhasznalas || [];
    const idx     = meglevo.findIndex(f => f.munkalapId === munkalapId);
    let ujFelhasznalas;

    // sorozatszamok: opcionális string[] – csak a sorozatszám köteles
    // tételeknél töltődik ki (ld. t.sorozatszamKoteles), a beépített
    // darabok gyári sorozatszámai, telepítő általi utólagos validáció.
    const ujSorozatszamok = Array.isArray(fAdat.sorozatszamok)
      ? fAdat.sorozatszamok.map(s => String(s || "").trim()).filter(Boolean)
      : (idx >= 0 ? (meglevo[idx].sorozatszamok || []) : []);

    // Fázis 6D – visszahozott anyag: a telepítő itt csak BEJELENTI, mennyit
    // hoz vissza – ez önmagában NEM változtat raktárkészletet, csak PM/Raktár
    // jóváhagyása után (ld. approveVisszahozas), és csak akkor, ha a
    // munkalapot a telepítő csapat már lezárta. Egy már elbírált (JOVAHAGYVA
    // / ELUTASITVA) bejelentés a telepítő oldaláról többé nem módosítható –
    // a régi rekord változatlan marad, hogy a jóváhagyás/elutasítás ne
    // íródjon felül utólag.
    const regiVisszahozas = idx >= 0 ? meglevo[idx] : null;
    const zart = regiVisszahozas?.visszahozasAllapot === VISSZAHOZAS_ALLAPOTOK.JOVAHAGYVA
      || regiVisszahozas?.visszahozasAllapot === VISSZAHOZAS_ALLAPOTOK.ELUTASITVA;
    const ujVisszahozottMenny = zart
      ? (Number(regiVisszahozas.visszahozottMenny) || 0)
      : (Number(fAdat.visszahozottMenny) || 0);
    const ujVisszahozasAllapot = zart
      ? regiVisszahozas.visszahozasAllapot
      : (ujVisszahozottMenny > 0 ? VISSZAHOZAS_ALLAPOTOK.JELENTVE : VISSZAHOZAS_ALLAPOTOK.NINCS);

    if (idx >= 0) {
      ujFelhasznalas = meglevo.map((f, i) =>
        i === idx
          ? {
              ...f,
              menny: fAdat.menny, megjegyzes: fAdat.megjegyzes || "", sorozatszamok: ujSorozatszamok,
              visszahozottMenny: ujVisszahozottMenny, visszahozasAllapot: ujVisszahozasAllapot,
              rogzitveAt: now,
            }
          : f
      );
    } else {
      ujFelhasznalas = [...meglevo, {
        munkalapId,
        menny:      fAdat.menny,
        megjegyzes: fAdat.megjegyzes || "",
        sorozatszamok: ujSorozatszamok,
        visszahozottMenny: ujVisszahozottMenny,
        visszahozasAllapot: ujVisszahozasAllapot,
        visszahozasJovahagyoNev: "",
        visszahozasJovahagyasDatum: "",
        rogzitveAt: now,
      }];
    }

    const osszes = ujFelhasznalas.reduce((s, f) => s + (Number(f.menny) || 0), 0);

    return {
      ...t,
      munkalapFelhasznalas: ujFelhasznalas,
      felhasznaltMennyiseg: osszes,
    };
  });

  return updateKivitelezesiCsomag(csomagId, { tetelek }, user);
}

// ─── Fázis 6D – Visszahozott anyag jóváhagyása (PM / Raktár) ────────────────
//
// A telepítő bejelentése (updateFelhasznaltMennyisegFromMunkalap – JELENTVE)
// önmagában NEM módosít raktárkészletet. Csak ez a függvény, PM/Raktár
// jóváhagyása után, és csak akkor, ha a munkalapot a telepítő csapat már
// lezárta – ezt a hívó biztosítja a `munkalapLezarva` paraméterrel (a
// modul szándékosan nem függ a workorder.service.js-től, elkerülve a
// körkörös importot: projekt.service.js → workorder.service.js →
// projekt.service.js → kivitelezesiCsomag.service.js láncot).
//
// A tétel összesített visszahozottMennyiseg mezője KIZÁRÓLAG a JÓVÁHAGYOTT
// bejelentések összege – egy még el nem bírált vagy elutasított bejelentés
// nem jelenik meg a Kivitelezési Csomag táblázat "Visszahozott" oszlopában.
export function approveVisszahozas(csomagId, tetelId, munkalapId, jovahagyoNev, munkalapLezarva, csapatId = null) {
  if (!munkalapLezarva) {
    throw new Error("A visszahozott anyag csak akkor hagyható jóvá, ha a telepítő csapat már lezárta a munkalapot.");
  }
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) throw new Error("A Kivitelezési Csomag nem található.");
  const tetel = (csomag.tetelek || []).find(t => t.id === tetelId);
  if (!tetel) throw new Error("A tétel nem található a csomagban.");
  const entry = (tetel.munkalapFelhasznalas || []).find(f => f.munkalapId === munkalapId);
  if (!entry || entry.visszahozasAllapot !== VISSZAHOZAS_ALLAPOTOK.JELENTVE) {
    throw new Error("Ez a visszahozási bejelentés nem található, vagy már el lett bírálva.");
  }

  const now   = new Date().toISOString();
  const menny = Number(entry.visszahozottMenny) || 0;

  const tetelek = csomag.tetelek.map(t => {
    if (t.id !== tetelId) return t;
    const munkalapFelhasznalas = t.munkalapFelhasznalas.map(f =>
      f.munkalapId === munkalapId
        ? { ...f, visszahozasAllapot: VISSZAHOZAS_ALLAPOTOK.JOVAHAGYVA, visszahozasJovahagyoNev: jovahagyoNev, visszahozasJovahagyasDatum: now }
        : f
    );
    const jovahagyottOsszes = munkalapFelhasznalas
      .filter(f => f.visszahozasAllapot === VISSZAHOZAS_ALLAPOTOK.JOVAHAGYVA)
      .reduce((s, f) => s + (Number(f.visszahozottMenny) || 0), 0);
    return { ...t, munkalapFelhasznalas, visszahozottMennyiseg: jovahagyottOsszes };
  });

  const updated = updateKivitelezesiCsomag(csomagId, { tetelek }, jovahagyoNev);

  const keszletCelAnyagId = tetel.sajatAnyagtorzsId || tetel.anyagtorzs_id;
  if (keszletCelAnyagId && menny > 0) {
    adjustAnyagKeszlet(keszletCelAnyagId, menny);
    addRaktarMozgas({
      anyagtorzsId:   keszletCelAnyagId,
      anyagNev:       tetel.nev,
      egyseg:         tetel.egyseg,
      mennyiseg:      -menny, // negatív = készletnövekedés (visszahozás)
      tipus:          RAKTAR_MOZGAS_TIPUSOK.VISSZAHOZAS,
      projektId:      csomag.projektId,
      munkalapId,
      csapatId:       csapatId || null,
      felhasznaloNev: jovahagyoNev,
      datum:          now,
    });
  }

  return updated;
}

export function rejectVisszahozas(csomagId, tetelId, munkalapId, elutasitoNev, indoklas = "") {
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) throw new Error("A Kivitelezési Csomag nem található.");
  const tetel = (csomag.tetelek || []).find(t => t.id === tetelId);
  if (!tetel) throw new Error("A tétel nem található a csomagban.");
  const entry = (tetel.munkalapFelhasznalas || []).find(f => f.munkalapId === munkalapId);
  if (!entry || entry.visszahozasAllapot !== VISSZAHOZAS_ALLAPOTOK.JELENTVE) {
    throw new Error("Ez a visszahozási bejelentés nem található, vagy már el lett bírálva.");
  }
  const now = new Date().toISOString();
  const tetelek = csomag.tetelek.map(t => t.id !== tetelId ? t : {
    ...t,
    munkalapFelhasznalas: t.munkalapFelhasznalas.map(f =>
      f.munkalapId === munkalapId
        ? { ...f, visszahozasAllapot: VISSZAHOZAS_ALLAPOTOK.ELUTASITVA, visszahozasJovahagyoNev: elutasitoNev, visszahozasJovahagyasDatum: now, visszahozasIndoklas: indoklas }
        : f
    ),
  });
  return updateKivitelezesiCsomag(csomagId, { tetelek }, elutasitoNev);
}

/**
 * Az összes, még JELENTVE (el nem bírált) visszahozási bejelentés, az
 * összes Kivitelezési Csomagból összegyűjtve. A `munkalap.lezarva` feltételt
 * NEM ez a függvény ellenőrzi (ld. fenti megjegyzés a körkörös import
 * elkerüléséről) – a hívó (RaktarkeszletPage) a workorder.service.js
 * getWorkorder()-jével dönti el, melyik bejelentés jóváhagyható már, és
 * melyik vár még a munkalap lezárására.
 */
export function getFuggoVisszahozasok() {
  const eredmeny = [];
  for (const csomag of loadKivitelezesiCsomagok()) {
    for (const t of (csomag.tetelek || [])) {
      for (const f of (t.munkalapFelhasznalas || [])) {
        if (f.visszahozasAllapot !== VISSZAHOZAS_ALLAPOTOK.JELENTVE) continue;
        if (!((Number(f.visszahozottMenny) || 0) > 0)) continue;
        eredmeny.push({
          csomagId:          csomag.id,
          tetelId:           t.id,
          projektId:         csomag.projektId,
          anyagtorzsId:      t.anyagtorzs_id,
          anyagNev:          t.nev,
          egyseg:            t.egyseg,
          munkalapId:        f.munkalapId,
          visszahozottMenny: Number(f.visszahozottMenny) || 0,
          jelentveAt:        f.rogzitveAt,
        });
      }
    }
  }
  return eredmeny;
}

// ─── Fázis 6A-2 – Telepítő kiadott mennyiség láthatóság tételenként ──────────

const TELEPITO_LATHATOSAG_ERTEKEK = ["NONE", "KIADOTT_MENNYISEG"];

export function updateKiviTetelLathatosag(csomagId, tetelId, telepitoLathatosag, user = "") {
  if (!TELEPITO_LATHATOSAG_ERTEKEK.includes(telepitoLathatosag)) {
    throw new Error("Érvénytelen telepitoLathatosag érték: " + telepitoLathatosag);
  }
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) throw new Error("A Kivitelezési Csomag nem található.");
  if (isKivitelezesiCsomagSzerkesztesTiltott(csomag.status)) {
    throw new Error("Lezárt vagy elszámolt csomagban a tételek nem módosíthatók.");
  }
  if (!(csomag.tetelek || []).some(t => t.id === tetelId)) {
    throw new Error("A tétel nem található a csomagban.");
  }
  const tetelek = (csomag.tetelek || []).map(t =>
    t.id === tetelId ? { ...t, telepitoLathatosag } : t
  );
  return updateKivitelezesiCsomag(csomagId, { tetelek }, user);
}

/**
 * Egy tétel "sorozatszám köteles" jelölése (PM/Admin állítja be a
 * Kivitelezési Csomagban) – ha igaz, a telepítő az anyagfelhasználás
 * rögzítésekor (KivCsomagFelhasznalasTab) sorozatszámonként köteles
 * megadni a beépített darabokat (pl. inverter, akkumulátor).
 */
export function updateKiviTetelSorozatszamKoteles(csomagId, tetelId, sorozatszamKoteles, user = "") {
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) throw new Error("A Kivitelezési Csomag nem található.");
  if (isKivitelezesiCsomagSzerkesztesTiltott(csomag.status)) {
    throw new Error("Lezárt vagy elszámolt csomagban a tételek nem módosíthatók.");
  }
  if (!(csomag.tetelek || []).some(t => t.id === tetelId)) {
    throw new Error("A tétel nem található a csomagban.");
  }
  const tetelek = (csomag.tetelek || []).map(t =>
    t.id === tetelId ? { ...t, sorozatszamKoteles: !!sorozatszamKoteles } : t
  );
  return updateKivitelezesiCsomag(csomagId, { tetelek }, user);
}

// ─── Fázis 6B – Anyag kiadás munkakiosztáskor ("mit vigyen a csapat") ───────

/**
 * Munkalap-szintű kiadott mennyiség rögzítése (a Fázis 6A-1
 * updateFelhasznaltMennyisegFromMunkalap tükörpárja, de a kiadás oldalán).
 *
 * Ugyanúgy per-munkalap izolált upsert: a munkalapKiadas[] tömbben
 * munkalapId azonosítja az adott munkalap sorát, a tétel összesített
 * kiadottMennyiseg mezője pedig az összes munkalap-kiadás ÖSSZEGE –
 * több munkalapos projektnél egyik munkalap kiadása sem írja felül
 * a másikét.
 */
export function updateKiadottMennyisegFromMunkalap(csomagId, munkalapId, kiadasok = [], user = "") {
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) return null;

  const now = new Date().toISOString();
  // Fázis 6C – raktárkészlet: csak a DELTA (új - régi kiadott mennyiség
  // EHHEZ a munkalaphoz) csökkenti/növeli a készletet, így egy már kiadott
  // munkalap kiadásának utólagos módosítása (pl. korrekció) nem duplikálja
  // a készletmozgást – mindig csak a változás könyvelődik.
  const raktarMozgasok = [];

  const tetelek = (csomag.tetelek || []).map(t => {
    const kAdat = kiadasok.find(k => k.tetelId === t.id);
    if (!kAdat) return t;

    const meglevo   = t.munkalapKiadas || [];
    const idx       = meglevo.findIndex(k => k.munkalapId === munkalapId);
    const regiMenny = idx >= 0 ? (Number(meglevo[idx].menny) || 0) : 0;
    const ujMenny   = Number(kAdat.menny) || 0;
    const delta     = ujMenny - regiMenny;
    let ujKiadas;

    if (idx >= 0) {
      ujKiadas = meglevo.map((k, i) =>
        i === idx
          ? { ...k, menny: ujMenny, csapatId: kAdat.csapatId || k.csapatId || "", rogzitveAt: now }
          : k
      );
    } else {
      ujKiadas = [...meglevo, {
        munkalapId,
        menny:      ujMenny,
        csapatId:   kAdat.csapatId || "",
        rogzitveAt: now,
      }];
    }

    // A raktárkészlet-levonás a SAJÁT raktár egyező nevű tételét célozza,
    // ha van (fizikailag egy raktár van – ld. anyagtorzs.js
    // getSajatAnyagNevAlapjan) – enélkül a fővállalkozói (Wagner-Solar/
    // EU-Solar) katalógustétel saját, nem létező "készletét" csökkentenénk.
    const keszletCelAnyagId = t.sajatAnyagtorzsId || t.anyagtorzs_id;
    if (delta !== 0 && keszletCelAnyagId) {
      raktarMozgasok.push({
        anyagtorzsId:   keszletCelAnyagId,
        anyagNev:       t.nev,
        egyseg:         t.egyseg,
        mennyiseg:      delta, // pozitív: kiadás nő → készlet csökken; negatív: kiadás csökken → készlet nő
        tipus:          delta > 0 ? RAKTAR_MOZGAS_TIPUSOK.KIADAS : RAKTAR_MOZGAS_TIPUSOK.KIADAS_KOREKCIO,
        projektId:      csomag.projektId,
        munkalapId,
        csapatId:       kAdat.csapatId || "",
        felhasznaloNev: user,
        datum:          now,
      });
    }

    const osszes = ujKiadas.reduce((s, k) => s + (Number(k.menny) || 0), 0);

    return {
      ...t,
      munkalapKiadas:    ujKiadas,
      kiadottMennyiseg:  osszes,
      // Nincs külön "komissiózás" lépés – a munkakiosztáskori kiadás egyben
      // a kiadandó célt is kitölti, ha még nem volt magasabb érték megadva.
      kiadandoMennyiseg: Math.max(Number(t.kiadandoMennyiseg) || 0, osszes),
    };
  });

  const updated = updateKivitelezesiCsomag(csomagId, { tetelek }, user);

  // A raktárkészlet módosítása és a mozgásnapló bejegyzés csak a fenti
  // csomag-mentés UTÁN történik – ha a mentés hibázna, a készlet és a napló
  // ne térjen el a Kivitelezési Csomag tényleges állapotától.
  for (const mozgas of raktarMozgasok) {
    adjustAnyagKeszlet(mozgas.anyagtorzsId, -mozgas.mennyiseg);
    addRaktarMozgas(mozgas);
  }

  return updated;
}

/**
 * Munkakiosztáskor kiválasztott anyagok ("mit vigyen a csapat") beillesztése
 * a projekt Kivitelezési Csomagjába, egy lépésben:
 *
 *   1. ha a projekthez még nincs Kivitelezési Csomag, létrehoz egy üres,
 *      kézi ("kezi") csomagot – ugyanúgy, ahogy fővállalkozói munkánál a
 *      projekt létrehozásakor is történik (ld. projekt.service.js P0-015);
 *   2. minden kiválasztott anyaghoz: ha még nincs ilyen anyagtorzs_id-jű
 *      tétel a csomagban, létrehozza (createKeziTetelPillanatkep), egyébként
 *      a meglévő tételt használja;
 *   3. a munkalaphoz rendelt mennyiséget updateKiadottMennyisegFromMunkalap-
 *      pal, per-munkalap izolált upsert-tel rögzíti.
 *
 * @param {object} projekt
 * @param {string} munkalapId
 * @param {Array<{anyagtorzsId, mennyiseg}>} tetelekPick
 * @param {string} [csapatId]
 * @param {string} [user]
 */
export function assignAnyagokToMunkalap(projekt, munkalapId, tetelekPick = [], csapatId = "", user = "") {
  const validPick = (tetelekPick || []).filter(p => p.anyagtorzsId && (Number(p.mennyiseg) || 0) > 0);
  if (validPick.length === 0) return null;

  let csomag = getKivitelezesiCsomagByProjektId(projekt.id);
  if (!csomag) {
    csomag = createKivitelezesiCsomagForProjekt(projekt, null, user, null);
  }

  for (const pick of validPick) {
    const letezik = (csomag.tetelek || []).some(t => t.anyagtorzs_id === pick.anyagtorzsId);
    if (!letezik) {
      csomag = addKeziTetelToKivitelezesiCsomag(
        csomag.id,
        pick.anyagtorzsId,
        { tervezettMennyiseg: pick.mennyiseg, kiadandoMennyiseg: pick.mennyiseg },
        user,
        projekt?.anyagelszamolasiMod
      );
    }
  }

  const kiadasok = validPick.map(pick => {
    const tetel = (csomag.tetelek || []).find(t => t.anyagtorzs_id === pick.anyagtorzsId);
    return tetel ? { tetelId: tetel.id, menny: Number(pick.mennyiseg) || 0, csapatId } : null;
  }).filter(Boolean);

  csomag = updateKiadottMennyisegFromMunkalap(csomag.id, munkalapId, kiadasok, user);
  return csomag;
}