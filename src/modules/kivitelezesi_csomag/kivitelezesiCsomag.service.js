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
  createKeziTetelPillanatkep,
  ellenorizStatuszValtas,
  isKivitelezesiCsomagSzerkesztesTiltott,
} from "./kivitelezesiCsomag.schema.js";

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
 *   - Fővállalkozói / belső projekt (nincs ajanlatPillanatkep):
 *     üres tétellistával jön létre, a PM tölti fel kézzel –
 *     forras = "kezi", letrehozasMod = "kezi".
 *
 * Duplikáció-védelem: ha a projekthez már tartozik csomag, a függvény
 * hibát dob és NEM hoz létre másodikat.
 */
export function createKivitelezesiCsomagForProjekt(projekt, ajanlatPillanatkep = null, user = "") {
  if (!projekt?.id) {
    throw new Error("Kivitelezési Csomag létrehozásához projekt szükséges.");
  }
  if (getKivitelezesiCsomagByProjektId(projekt.id)) {
    throw new Error("Ehhez a projekthez már tartozik Kivitelezési Csomag – egy projekthez csak egy lehet.");
  }

  const now = new Date().toISOString();
  const automatikus = !!ajanlatPillanatkep;
  const tetelek = automatikus
    ? generateKiviTetelekFromAjanlatPillanatkep(ajanlatPillanatkep)
    : [];

  const csomag = {
    ...KIVITELEZESI_CSOMAG_SCHEMA,
    id:                 `kcs_${Date.now()}`,
    projektId:          projekt.id,
    forras:             automatikus ? KIVITELEZESI_CSOMAG_FORRAS.AJANLATBOL : KIVITELEZESI_CSOMAG_FORRAS.KEZI,
    ajanlatId:          automatikus ? (ajanlatPillanatkep.ajanlatId || projekt.ajanlatId || null) : null,
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
