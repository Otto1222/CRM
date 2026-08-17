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
export function addKeziTetelToKivitelezesiCsomag(csomagId, anyagtorzsId, mennyisegek = {}, user = "") {
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) {
    throw new Error("A Kivitelezési Csomag nem található.");
  }
  if ((csomag.tetelek || []).some(t => t.anyagtorzs_id === anyagtorzsId)) {
    throw new Error("Ez az anyag már szerepel a csomagban.");
  }
  const tetel = createKeziTetelPillanatkep(anyagtorzsId, mennyisegek);
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
export function addAnyagokBulkToKivitelezesiCsomag(csomagId, picks = [], user = "") {
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
      const uj = createKeziTetelPillanatkep(pick.anyagtorzsId, { tervezettMennyiseg: menny, kiadandoMennyiseg: menny });
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
export function setKivitelezesiCsomagStatus(csomagId, ujStatus, user = "") {
  const csomag = loadKivitelezesiCsomagok().find(k => k.id === csomagId);
  if (!csomag) {
    throw new Error("A Kivitelezési Csomag nem található.");
  }
  const ellenorzes = ellenorizStatuszValtas(csomag, ujStatus);
  if (!ellenorzes.ok) {
    throw new Error(ellenorzes.message);
  }
  return updateKivitelezesiCsomag(csomagId, { status: ujStatus }, user);
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
export function addAnyagszamitoTetelekToKivitelezesiCsomag(csomagId, anyaglista = [], user = "") {
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
    const tetel = createAnyagszamitoTetelPillanatkep(sor.anyagtorzs_id, sor.szamoltMennyiseg);
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

    if (idx >= 0) {
      ujFelhasznalas = meglevo.map((f, i) =>
        i === idx
          ? { ...f, menny: fAdat.menny, megjegyzes: fAdat.megjegyzes || "", sorozatszamok: ujSorozatszamok, rogzitveAt: now }
          : f
      );
    } else {
      ujFelhasznalas = [...meglevo, {
        munkalapId,
        menny:      fAdat.menny,
        megjegyzes: fAdat.megjegyzes || "",
        sorozatszamok: ujSorozatszamok,
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

    if (delta !== 0 && t.anyagtorzs_id) {
      raktarMozgasok.push({
        anyagtorzsId:   t.anyagtorzs_id,
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
        user
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