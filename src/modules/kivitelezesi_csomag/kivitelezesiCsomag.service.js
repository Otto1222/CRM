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
} from "./kivitelezesiCsomag.schema.js";

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
