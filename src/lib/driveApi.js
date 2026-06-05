/**
 * driveApi.js – Google Drive szinkronizálás
 *
 * POST: text/plain;charset=UTF-8 content-type = "simple request" (nincs CORS preflight)
 * Apps Script "Mindenki" hozzáféréssel visszaküldi az Access-Control-Allow-Origin: * fejlécet,
 * így a frontend képes olvasni a tényleges választ – nem kell no-cors mód.
 *
 * Drive struktúra (CRM gyökér: 1-MuCrK__dMkoep19f8cJFBpgJQAkwu-5)
 *   01_Adatbazis  → JSON adatfájlok (DB_FOLDER)
 *   04_Fotok      → fotók, projekt mappák (MUNKA_FOLDER)
 */

const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || "";

export const DRIVE_DB_FOLDER_ID    = "1jkRh98v5pm73Dyhmn3FioFkznBaxWwsW";
export const DRIVE_MUNKA_FOLDER_ID = "1ccvd4iUnB-jEyrSGJBZs_fSOScL_aQPx";

// ─── Alap POST hívás ──────────────────────────────────────────
// text/plain = simple request → nincs CORS preflight → Apps Script visszaadja CORS fejléceket
async function post(body) {
  if (!SCRIPT_URL) return { ok: false, offline: true };
  try {
    const res = await fetch(SCRIPT_URL, {
      method:  "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${errText}` };
    }

    let data;
    try {
      data = await res.json();
    } catch {
      return { ok: false, error: "A szerver nem JSON választ adott vissza" };
    }

    if (!data?.ok) return { ok: false, error: data?.error || "Apps Script hiba (ok: false)" };
    return data;
  } catch (e) {
    console.warn("[driveApi POST]", e.message);
    return { ok: false, error: e.message };
  }
}

// ─── GET – adatok betöltése ───────────────────────────────────
async function get(params) {
  if (!SCRIPT_URL) return { ok: false, offline: true };
  try {
    const url = new URL(SCRIPT_URL);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res  = await fetch(url.toString());
    const data = await res.json();
    return data;
  } catch (e) {
    console.warn("[driveApi GET]", e.message);
    return { ok: false, error: e.message };
  }
}

// ─── PUBLIC API ───────────────────────────────────────────────

export async function driveLoad(collection) {
  const res = await get({ action: "loadJson", fileName: `${collection}.json` });
  if (res?.ok && res.content) return res.content;
  return null;
}

/** Mentés Drive-ra – visszaadja az Apps Script tényleges válaszát */
export async function driveSave(collection, data) {
  return post({ action: "saveJson", fileName: `${collection}.json`, content: data });
}

/**
 * Mentés + visszaolvasási ellenőrzés
 * Csak manuális szinkronhoz (lassabb – dupla API hívás)
 * @returns {{ ok, verified, timestamp?, error? }}
 */
export async function driveSaveVerified(collection, data) {
  const writeRes = await driveSave(collection, data);
  if (!writeRes.ok) {
    return { ok: false, verified: false, error: writeRes.error };
  }

  try {
    const readBack = await driveLoad(collection);
    if (!readBack) {
      return { ok: false, verified: false, error: "Visszaolvasás: fájl nem található Drive-on" };
    }
    const match = JSON.stringify(readBack) === JSON.stringify(data);
    return {
      ok:        true,
      verified:  match,
      timestamp: writeRes.timestamp,
      error:     match ? null : "Visszaolvasás nem egyezik a mentett adattal",
    };
  } catch (e) {
    return { ok: true, verified: false, error: `Visszaolvasás hiba: ${e.message}` };
  }
}

export async function driveVbfSave(munkalapId, vbfData) {
  return post({ action: "saveJson", fileName: `vbf_${munkalapId}.json`, content: vbfData });
}

export async function driveCreateMunkalapFolder(munkalapId, projektkod = "") {
  return post({ action: "createMunkalapFolder", munkalapId, projektkod });
}

export async function driveCreateProjektFolder(projekt) {
  return post({
    action:     "createProjektFolder",
    projektkod: projekt.projektkod,
    clientNev:  projekt.clientNev || "",
    projektId:  projekt.id,
  });
}

export function getDriveProjektSearchUrl(projektkod) {
  return `https://drive.google.com/drive/search?q=${encodeURIComponent('"' + projektkod + '"')}`;
}

export function getDriveMunkaFolderUrl() {
  return `https://drive.google.com/drive/folders/${DRIVE_MUNKA_FOLDER_ID}`;
}

export async function driveUploadFoto(munkalapId, file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(",")[1];
      const res = await post({
        action:     "saveFoto",
        munkalapId,
        fotoNev:    file.name,
        fotoBase64: base64,
        mimeType:   file.type || "image/jpeg",
      });
      resolve(res);
    };
    reader.onerror = () => resolve({ ok: false, error: "FileReader hiba" });
    reader.readAsDataURL(file);
  });
}

/** Drive kapcsolat teszt – visszaadja a ping eredményt és válaszidőt */
export async function drivePing() {
  if (!SCRIPT_URL) return { ok: false, offline: true };
  const t0  = Date.now();
  const res = await get({ action: "ping" });
  if (res?.ok) return { ok: true, ts: res.ts, latencyMs: Date.now() - t0, driveFolder: res.driveFolder };
  return { ok: false, error: res?.driveError || res?.error || "Ismeretlen hiba" };
}

/**
 * Drive diagnosztika – melyik fiókként fut a script, elérhetők-e a mappák, van-e írási jog.
 * GET kéréssel hívódik – ha ez működik de testPost nem, "Execute as" beállítás a gond.
 */
export async function driveDiagnose() {
  if (!SCRIPT_URL) return { ok: false, offline: true, error: "VITE_APPS_SCRIPT_URL nincs beállítva" };
  return get({ action: "diagnose" });
}

/**
 * POST-specifikus írásteszt – ugyanaz mint diagnose, de POST kéréssel.
 * Ha GET (diagnose) zöld de ez piros → Apps Script "Execute as: User..." van beállítva.
 * Ha ez is zöld → saveJson-ban van a valódi gond.
 */
export async function driveTestPost() {
  if (!SCRIPT_URL) return { ok: false, offline: true };
  return post({ action: "testPost" });
}

/**
 * Google Calendar szinkron – egyedi esemény létrehozása / frissítése.
 * Apps Script handler: "syncCalendarEvent" case (ld. calendarSync.service.js komment).
 * Visszatér: { ok, eventId, action: "created"|"updated" }
 */
export async function driveSyncCalendarEvent(event, calendarId) {
  return post({ action: "syncCalendarEvent", calendarId, event });
}

/**
 * Google Calendar esemény törlése calendarEventId alapján.
 * Apps Script handler: "deleteCalendarEvent" case (ld. calendarSync.service.js komment).
 */
export async function driveDeleteCalendarEvent(eventId, calendarId) {
  return post({ action: "deleteCalendarEvent", calendarId, eventId });
}

export const driveAvailable = () => !!SCRIPT_URL;
