import { driveLoad, driveLoadStatus, driveSave } from "./driveApi";
import { loadLocal, saveLocal } from "./localDb";
import { startJob, updateJob, finishJob, failJob } from "./jobProgress";
import { applyTombstones } from "./tombstones.js";

// P0-005: "crm_tombstones" MINDIG az első – lásd lent a Tombstone szekciót.
// A merge csak akkor tudja helyesen kiszűrni egy már törölt rekordot, ha a
// friss törlés-napló előbb landol a localStorage-ban, mint a saját kollekció
// feldolgozása ugyanebben a szinkron-menetben.
export const SYNC_COLLECTIONS = [
  "crm_tombstones",
  "projektek",
  "munkalapok",
  "ugyfelek",
  "beallitasok",
  "munkatipusok",
  "fovallalkozok",
  "elszamolasi_szabalyok",
  "karteritesek",
  "sablonok",
  "csapatok",
  "csapat_tagok",
  "crm_napelem_users",
  "szamlak",
  "anyag_ar_verziok",
  "kivitelezesi_csomagok",
  "ajanlatok",
  "ceges_fix_koltsegek",
];

// ─── Tombstone (törlés-napló) ─────────────────────────────────
// P0-005: A mergeByIdUpdatedAt() szándékosan SOHA nem töröl – ha egy rekord
// csak lokálisan van meg, Drive-on nincs, azt "még nem szinkronizált új
// rekordnak" tekinti és visszahozza. Ez helyes egy offline-ban létrehozott
// rekordnál, de KATASZTRÓFA egy törölt rekordnál: egy másik eszköz elavult,
// törlés előtti cache-e "feltámasztja" azt minden szinkronnál.
//
// Megoldás: minden valódi törlésnél recordDeletion()-t kell hívni. Ez egy
// {collection, targetId, updatedAt} tombstone-t ment el, ami saját magát is
// szinkronizálja (ld. SYNC_COLLECTIONS). Betöltéskor (loadCollectionWithStatus)
// minden rekordot a tombstone-okhoz hasonlítunk: ha van rá törlés-bejegyzés,
// és az legalább olyan friss, mint a rekord updatedAt-je → kiszűrjük.
const TOMBSTONE_KEY = "crm_tombstones";

/**
 * Törlés bejelentése – hívd meg MINDEN olyan helyen, ahol egy rekordot
 * ténylegesen kiveszel egy tömbből (nem csak státuszt vált).
 * Enélkül a törlés csak erről az eszközről tűnik el, más eszközök
 * elavult cache-e a következő szinkronnál visszahozza.
 */
export function recordDeletion(collection, targetId) {
  if (!targetId) return;
  try {
    const list = loadLocal(TOMBSTONE_KEY) || [];
    const tombId = `${collection}:${targetId}`;
    const now = new Date().toISOString();
    const next = [...list.filter(t => t.id !== tombId), { id: tombId, collection, targetId, updatedAt: now }];
    saveLocal(TOMBSTONE_KEY, next);
    // A tombstone Drive-mentése eddig csendben nyelte a hibát – ha ez
    // elveszik (átmeneti hálózati hiba, Apps Script hideg indítás), a
    // törlés csak ezen az eszközön marad érvényes: egy másik eszköz (vagy
    // akár ugyanez, ha a lokális adatok törlődnek/ki-be lépés után frissen
    // húzza le a Drive-ot) nem tudja, hogy ezt a rekordot törölni kell, és
    // visszahozza. Ugyanazt a "crm-sync-warning" jelzést adjuk, mint minden
    // más Drive-mentési hibánál (ld. notifySyncFailed a többi service-ben).
    driveSave(TOMBSTONE_KEY, { [TOMBSTONE_KEY]: next })
      .then(res => { if (res && !res.ok && !res.offline) notifyTombstoneSyncFailed(collection); })
      .catch(() => notifyTombstoneSyncFailed(collection));
  } catch (e) {
    console.warn("[dataSync] recordDeletion sikertelen:", collection, targetId, e?.message || e);
    notifyTombstoneSyncFailed(collection);
  }
}

function notifyTombstoneSyncFailed(collection) {
  window.dispatchEvent(new CustomEvent("crm-sync-warning", {
    detail: { message: `A(z) "${collection}" törlése helyileg megtörtént, de nem sikerült szinkronizálni – másik eszközön még visszatérhet.` },
  }));
}

// ─── Drive szinkron napló (per-kollekció utolsó szinkron státusz) ─
const SYNC_LOG_KEY = "crm_drive_sync_log";

export function updateSyncLog(collection, ok, error = null) {
  try {
    const log = JSON.parse(localStorage.getItem(SYNC_LOG_KEY) || "{}");
    const now = new Date().toISOString();
    log[collection] = {
      lastAttempt: now,
      ok,
      error:       ok ? null : (error || "Ismeretlen hiba"),
      lastSuccess: ok ? now : (log[collection]?.lastSuccess || null),
    };
    localStorage.setItem(SYNC_LOG_KEY, JSON.stringify(log));
  } catch {}
}

export function getSyncLog() {
  try {
    return JSON.parse(localStorage.getItem(SYNC_LOG_KEY) || "{}");
  } catch {
    return {};
  }
}

// ─── Belső segédek ────────────────────────────────────────────

function emptyValue(collection) {
  if (collection === "beallitasok") return {};
  if (collection === "edi_sorszam_counter" || collection === "edi_projekt_sorszam_counter") return 0;
  return [];
}

function unwrap(collection, payload) {
  if (!payload) return null;
  if (payload[collection] !== undefined) return payload[collection];
  if (payload.content?.[collection] !== undefined) return payload.content[collection];
  if (payload.content !== undefined) return payload.content;
  return payload;
}

function hasData(value) {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

/**
 * ID-alapú merge: Drive + lokális adatok egyesítése, soha nem töröl lokális rekordot.
 * Csak tömbös kollekciókon fut (rekordok id mezővel).
 *
 * Szabályok:
 *   - Drive-ban van, lokálisan nincs → Drive rekord marad
 *   - Lokálisan van, Drive-ban nincs → lokális rekord megmarad (soha nem töröl)
 *   - Mindkettőben van → updatedAt alapján a frissebb nyer; ha egyik sem rendelkezik
 *     updatedAt mezővel → lokális marad
 */
function mergeByIdUpdatedAt(driveArr, localArr) {
  const merged = new Map();

  driveArr.forEach(r => { if (r?.id) merged.set(r.id, r); });

  localArr.forEach(r => {
    if (!r?.id) return;
    if (!merged.has(r.id)) {
      merged.set(r.id, r);
      return;
    }
    const drive = merged.get(r.id);
    const driveTs = drive.updatedAt  ? new Date(drive.updatedAt).getTime()  : 0;
    const localTs = r.updatedAt      ? new Date(r.updatedAt).getTime()      : 0;
    if (localTs > driveTs) merged.set(r.id, r);
  });

  const result = Array.from(merged.values());

  if (result.length > driveArr.length) {
    const added = result.length - driveArr.length;
    console.warn(`[dataSync] merge: ${added} lokális rekord nincs Drive-on (${added} hozzáadva)`);
    try {
      window.dispatchEvent(new CustomEvent("crm-sync-warning", {
        detail: { collection: "unknown", localOnly: added }
      }));
    } catch {}
  }

  return result;
}

// ─── Betöltés ─────────────────────────────────────────────────

export async function loadCollection(collection) {
  return (await loadCollectionWithStatus(collection)).data;
}

/**
 * Mint loadCollection, de visszaadja a Drive-betöltés tényleges állapotát is,
 * hogy a szinkron-job NE mutasson hamis "ok"-ot Drive-hiba esetén.
 * @returns {{ data:any, status:"drive"|"merged"|"empty"|"offline"|"error", error?:string }}
 */
export async function loadCollectionWithStatus(collection) {
  const localData = loadLocal(collection);

  let r;
  try {
    r = await driveLoadStatus(collection);
  } catch (e) {
    r = { ok: false, content: null, error: e.message };
  }

  // Drive nincs konfigurálva → nem hiba, helyi adat marad
  if (r.offline) {
    return { data: applyTombstones(collection, localData) ?? emptyOrSave(collection), status: "offline" };
  }

  // Valódi Drive-hiba → lokálisra esünk vissza, DE jelezzük
  if (!r.ok) {
    console.warn(`[dataSync] Drive betöltési hiba: ${collection}`, r.error);
    return { data: applyTombstones(collection, localData) ?? emptyOrSave(collection), status: "error", error: r.error };
  }

  const driveData = unwrap(collection, r.content);
  if (hasData(driveData)) {
    if (Array.isArray(driveData) && Array.isArray(localData) && localData.length > 0) {
      const merged = applyTombstones(collection, mergeByIdUpdatedAt(driveData, localData));
      saveLocal(collection, merged);
      return { data: merged, status: "merged" };
    }
    const cleaned = applyTombstones(collection, driveData);
    saveLocal(collection, cleaned);
    return { data: cleaned, status: "drive" };
  }

  // Drive elérhető, de nincs/üres adat. Két nagyon eltérő eset rejlik emögött:
  //  a) driveData === null → a fájl még nem létezik / kétértelmű válasz →
  //     ne kockáztassunk, maradjon a lokális adat változatlanul.
  //  b) driveData EXPLICIT üres tömb ([]) → a fájl LÉTEZIK a Drive-on, és
  //     ténylegesen nincs benne egyetlen rekord sem. Ha a lokális gépen mégis
  //     vannak rekordok, azok szinte biztosan "szellem" adatok egy korábbi,
  //     Drive-kapcsolat nélküli időszakból (pl. egy telefonon rekedt teszt-
  //     munkalap, amit sosem sikerült Drive-ra menteni). Ha ezt sosem
  //     tisztítjuk, egy ilyen eszköz örökre más adatot mutat, mint a többi.
  //     Csak a néhány percnél régebbi rekordokat töröljük lokálisan is –
  //     a nagyon friss rekordokat megtartjuk, hátha épp folyamatban van
  //     (vagy meghiúsult) a Drive-ra mentésük, pl. mert az eszköz most
  //     pillanatnyilag offline.
  if (Array.isArray(driveData) && Array.isArray(localData) && localData.length > 0) {
    const RECENT_MS = 5 * 60 * 1000;
    const now = Date.now();
    const kept = localData.filter(rec => {
      const ts = rec?.updatedAt ? new Date(rec.updatedAt).getTime() : 0;
      return now - ts < RECENT_MS;
    });
    if (kept.length !== localData.length) {
      console.warn(`[dataSync] ${collection}: Drive explicit üres – ${localData.length - kept.length} régi, sosem szinkronizált lokális rekord eltávolítva`);
      saveLocal(collection, kept);
    }
    return { data: applyTombstones(collection, kept), status: "empty" };
  }

  return { data: applyTombstones(collection, localData) ?? emptyOrSave(collection), status: "empty" };
}

function emptyOrSave(collection) {
  const empty = emptyValue(collection);
  saveLocal(collection, empty);
  return empty;
}

// ─── Mentés ───────────────────────────────────────────────────

/**
 * Kollekció mentése lokálisan + Drive-ra.
 * @param {object} [opts]
 * @param {boolean} [opts.force]  - ha true, az üres-tömb védelem kikerülhető (csak admin törlésből hívható)
 * @param {string}  [opts.action] - crm-db-updated esemény action mezője (alapértelmezett: "save")
 * @returns {{ localSaved: boolean, driveSaved: boolean, driveError: string|null, data }}
 */
export async function saveCollection(collection, data, opts = {}) {
  // KRITIKUS: üres adat soha ne írja felül a meglévő adatot — kivéve opts.force = true esetén
  if (!opts.force && Array.isArray(data) && data.length === 0) {
    const existing = loadLocal(collection);
    if (Array.isArray(existing) && existing.length > 0) {
      console.warn(`[dataSync] MEGAKADÁLYOZVA: üres [] felülírna ${existing.length} rekordot (${collection})`);
      return { localSaved: false, driveSaved: false, driveError: "Üres adat – mentés megakadályozva", data };
    }
  }
  saveLocal(collection, data);

  let driveSaved  = false;
  let driveError  = null;

  try {
    const res = await driveSave(collection, { [collection]: data });

    if (res.offline) {
      // Drive nem konfigurált – nem hiba
    } else if (res.ok) {
      driveSaved = true;
      updateSyncLog(collection, true);
    } else {
      driveError = res.error || "Ismeretlen Drive hiba";
      updateSyncLog(collection, false, driveError);
      console.warn(`[dataSync] Drive mentési hiba (${collection}):`, driveError);
    }
  } catch (e) {
    driveError = e.message;
    updateSyncLog(collection, false, e.message);
    console.warn(`[dataSync] Drive mentési kivétel (${collection}):`, e);
  }

  window.dispatchEvent(
    new CustomEvent("crm-db-updated", {
      detail: { collection, action: opts.action || "save", fromDataSync: true },
    })
  );

  return { localSaved: true, driveSaved, driveError, data };
}

/**
 * Szándékos admin törlés: üres értéket ment lokálisan ÉS Drive-ra.
 * Pontosan ugyanazon a kóduton megy át mint saveCollection – nincs külön fetch logika.
 * Csak explicit admin "Teljes tesztadat törlés" akcióból hívható!
 * @returns {{ localSaved: boolean, driveSaved: boolean, driveError: string|null, data }}
 */
export async function clearCollection(collection) {
  const emptyVal = emptyValue(collection);
  return saveCollection(collection, emptyVal, { force: true, action: "clear" });
}

// ─── Szinkronizálás ───────────────────────────────────────────

export async function syncAllFromDrive() {
  const jobId = startJob("Drive szinkronizálás", {
    steps: [...SYNC_COLLECTIONS, "pillanatkepek"],
  });

  const result = {};
  const hibasKollekciok = [];

  for (let i = 0; i < SYNC_COLLECTIONS.length; i++) {
    const collection = SYNC_COLLECTIONS[i];
    updateJob(jobId, { currentStep: i, stepLabel: collection });
    const r = await loadCollectionWithStatus(collection);
    result[collection] = r.data;
    const stepStatus = r.status === "error" ? "error" : "ok";
    if (r.status === "error") hibasKollekciok.push(collection);
    updateJob(jobId, {
      currentStep: i + 1,
      stepResult:  { label: collection, status: stepStatus, error: r.error },
    });
  }

  // Pillanatkepek visszaállítása Drive-ból (egyedi localStorage kulcsokra)
  updateJob(jobId, { stepLabel: "pillanatkepek" });
  try {
    const drivePayload  = await driveLoad("pillanatkepek");
    const pillanatkepek = unwrap("pillanatkepek", drivePayload);
    if (Array.isArray(pillanatkepek) && pillanatkepek.length > 0) {
      pillanatkepek.forEach(p => {
        if (p.projektId) saveLocal(`projekt_pillanatkep_${p.projektId}`, p);
      });
      result.pillanatkepek = pillanatkepek;
    }
    updateJob(jobId, { stepResult: { label: "pillanatkepek", status: "ok" } });
  } catch {
    updateJob(jobId, { stepResult: { label: "pillanatkepek", status: "error", error: "Betöltési hiba" } });
  }

  // Counter öngyógyítás: ha localStorage törlődött, a valós adatokból állítja helyre
  const projektek = result.projektek || [];
  if (projektek.length > 0) {
    const maxProjN   = projektek.reduce((m, p) => {
      const match = p.projektkod?.match(/E\.D\.I\.(\d+)/);
      return match ? Math.max(m, parseInt(match[1], 10)) : m;
    }, 0);
    const localProjN = parseInt(localStorage.getItem("edi_projekt_sorszam_counter") || "0", 10);
    if (maxProjN > localProjN) localStorage.setItem("edi_projekt_sorszam_counter", String(maxProjN));
  }

  const munkalapok = result.munkalapok || [];
  if (munkalapok.length > 0) {
    const maxEdiN = munkalapok.reduce((m, ml) => {
      const s     = ml.ediSorszam || ml.dokumentumszam || "";
      const match = s.match(/E\.D\.I\.\s*(\d+)/);
      return match ? Math.max(m, parseInt(match[1], 10)) : m;
    }, 0);
    if (maxEdiN > 0) {
      const localEdiN = parseInt(localStorage.getItem("edi_sorszam_counter") || "0", 10);
      if (maxEdiN > localEdiN) saveLocal("edi_sorszam_counter", maxEdiN);
    }
  }

  if (hibasKollekciok.length > 0) {
    // Valódi Drive-hiba történt → a job HIBÁS állapotban marad (nem tűnik el),
    // és a felhasználó látja, mely kollekciók nem töltődtek be Drive-ról.
    failJob(jobId, {
      error: `Drive-betöltési hiba (${hibasKollekciok.length} kollekció helyi adatból): ${hibasKollekciok.join(", ")}`,
    });
    window.dispatchEvent(new CustomEvent("crm-sync-warning", {
      detail: { message: `Néhány kollekció nem töltődött be a Drive-ról (${hibasKollekciok.length}). Helyi adat van használatban – ne ments, amíg a kapcsolat helyre nem áll.` },
    }));
  } else {
    finishJob(jobId, { summary: `${SYNC_COLLECTIONS.length + 1} kollekció betöltve` });
  }

  return result;
}

/**
 * Összes kollekció mentése Drive-ra.
 * @returns {{ results: Object, allOk: boolean }}
 */
export async function syncAllToDrive() {
  const jobId = startJob("Drive: minden mentése", {
    steps: [...SYNC_COLLECTIONS],
  });

  const results = {};
  let   allOk   = true;
  let   okCount = 0;
  let   errCount = 0;

  for (let i = 0; i < SYNC_COLLECTIONS.length; i++) {
    const collection = SYNC_COLLECTIONS[i];
    updateJob(jobId, { currentStep: i, stepLabel: collection });

    const data = loadLocal(collection) ?? emptyValue(collection);
    const res  = await saveCollection(collection, data);
    results[collection] = res;

    const stepOk = res.driveSaved || (!res.driveError);
    if (!stepOk) { allOk = false; errCount++; }
    else okCount++;

    updateJob(jobId, {
      currentStep: i + 1,
      stepResult:  {
        label:  collection,
        status: stepOk ? "ok" : "error",
        error:  res.driveError || null,
      },
    });
  }

  finishJob(jobId, {
    summary: errCount > 0
      ? `${okCount} mentve, ${errCount} hibás`
      : `${okCount} kollekció mentve`,
  });

  return { results, allOk };
}