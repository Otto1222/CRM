import { driveLoad, driveSave } from "./driveApi";
import { loadLocal, saveLocal } from "./localDb";

export const SYNC_COLLECTIONS = [
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
];

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

// ─── Betöltés ─────────────────────────────────────────────────

export async function loadCollection(collection) {
  const localData = loadLocal(collection);

  try {
    const drivePayload = await driveLoad(collection);
    const driveData    = unwrap(collection, drivePayload);

    if (hasData(driveData)) {
      saveLocal(collection, driveData);
      return driveData;
    }
  } catch (e) {
    console.warn(`[dataSync] Drive betöltési hiba: ${collection}`, e);
  }

  if (localData !== null && localData !== undefined) return localData;

  const empty = emptyValue(collection);
  saveLocal(collection, empty);
  return empty;
}

// ─── Mentés ───────────────────────────────────────────────────

/**
 * Kollekció mentése lokálisan + Drive-ra.
 * @returns {{ localSaved: true, driveSaved: boolean, driveError: string|null, data }}
 */
export async function saveCollection(collection, data) {
  // KRITIKUS: üres adat soha ne írja felül a meglévő adatot
  if (Array.isArray(data) && data.length === 0) {
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
      detail: { collection, action: "save", fromDataSync: true },
    })
  );

  return { localSaved: true, driveSaved, driveError, data };
}

// ─── Szinkronizálás ───────────────────────────────────────────

export async function syncAllFromDrive() {
  const result = {};

  for (const collection of SYNC_COLLECTIONS) {
    result[collection] = await loadCollection(collection);
  }

  // Pillanatkepek visszaállítása Drive-ból (egyedi localStorage kulcsokra)
  try {
    const drivePayload  = await driveLoad("pillanatkepek");
    const pillanatkepek = unwrap("pillanatkepek", drivePayload);
    if (Array.isArray(pillanatkepek) && pillanatkepek.length > 0) {
      pillanatkepek.forEach(p => {
        if (p.projektId) saveLocal(`projekt_pillanatkep_${p.projektId}`, p);
      });
      result.pillanatkepek = pillanatkepek;
    }
  } catch {}

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

  return result;
}

/**
 * Összes kollekció mentése Drive-ra.
 * @returns {{ results: Object, allOk: boolean }}
 */
export async function syncAllToDrive() {
  const results = {};
  let   allOk   = true;

  for (const collection of SYNC_COLLECTIONS) {
    const data = loadLocal(collection) ?? emptyValue(collection);
    const res  = await saveCollection(collection, data);
    results[collection] = res;
    if (!res.driveSaved) allOk = false;
  }

  return { results, allOk };
}
