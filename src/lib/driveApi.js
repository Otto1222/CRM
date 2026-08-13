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

// ─── Átmeneti Google-oldali hibák újrapróbálása ────────────────
// Néha (jellemzően nagyobb fájloknál, vagy ha több eszköz szinkronizál egy
// időben) a Google infrastruktúra a scriptünket el sem érve egy HTML
// hibaoldalt küld JSON helyett ("Unexpected token '<' ... is not valid
// JSON") – ez NEM a script hibája (a doGet/doPost mindig try/catch-csel
// garantáltan JSON-t ad vissza), hanem tipikusan átmeneti túlterhelés.
// 1-2 gyors újrapróbálkozással ez a felhasználó számára észrevétlen marad,
// ahelyett hogy hamis "szinkron hiba" jelzést kapna.
const RETRY_DELAYS_MS = [500, 1500];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchWithRetry(doFetch) {
  const attempts = RETRY_DELAYS_MS.length + 1;
  let lastErr = "Ismeretlen hiba";
  for (let i = 0; i < attempts; i++) {
    const isLast = i === attempts - 1;
    try {
      const res = await doFetch();

      if (!res.ok) {
        // 5xx = szerveroldali/átmeneti – érdemes újrapróbálni. 4xx-nél nincs értelme.
        if (res.status >= 500 && !isLast) {
          lastErr = `HTTP ${res.status}`;
          await sleep(RETRY_DELAYS_MS[i]);
          continue;
        }
        const errText = await res.text().catch(() => "");
        return { ok: false, error: `HTTP ${res.status}: ${errText}` };
      }

      try {
        return await res.json();
      } catch {
        // Nem JSON válasz (pl. Google HTML hibaoldal) – tipikusan átmeneti.
        if (!isLast) {
          lastErr = "A szerver nem JSON választ adott vissza";
          await sleep(RETRY_DELAYS_MS[i]);
          continue;
        }
        return { ok: false, error: "A szerver nem JSON választ adott vissza" };
      }
    } catch (e) {
      lastErr = e.message;
      if (!isLast) { await sleep(RETRY_DELAYS_MS[i]); continue; }
      return { ok: false, error: e.message };
    }
  }
  return { ok: false, error: lastErr };
}

// ─── Alap POST hívás ──────────────────────────────────────────
// text/plain = simple request → nincs CORS preflight → Apps Script visszaadja CORS fejléceket
async function post(body) {
  if (!SCRIPT_URL) return { ok: false, offline: true };
  const data = await fetchWithRetry(() => fetch(SCRIPT_URL, {
    method:  "POST",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body:    JSON.stringify(body),
  }));
  if (data?.offline) return data;
  if (!data?.ok) {
    if (data?.error) console.warn("[driveApi POST]", data.error);
    return { ok: false, error: data?.error || "Apps Script hiba (ok: false)" };
  }
  return data;
}

// ─── GET – adatok betöltése ───────────────────────────────────
async function get(params) {
  if (!SCRIPT_URL) return { ok: false, offline: true };
  const url = new URL(SCRIPT_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const data = await fetchWithRetry(() => fetch(url.toString()));
  if (!data?.ok && !data?.offline && data?.error) console.warn("[driveApi GET]", data.error);
  return data;
}

// ─── PUBLIC API ───────────────────────────────────────────────

export async function driveLoad(collection) {
  const res = await get({ action: "loadJson", fileName: `${collection}.json` });
  if (res?.ok && res.content) return res.content;
  return null;
}

/**
 * Mint driveLoad, de megkülönbözteti a hibát az üres/offline esettől.
 * @returns {{ ok:boolean, offline?:boolean, content:any, error?:string }}
 */
export async function driveLoadStatus(collection) {
  const res = await get({ action: "loadJson", fileName: `${collection}.json` });
  if (res?.offline) return { ok: false, offline: true, content: null };
  if (res?.ok)      return { ok: true, content: res.content ?? null };
  // "Fájl nem található" NEM hiba – azt jelenti, hogy ez a kollekció még
  // sosem lett elmentve Drive-ra (pl. vadonatúj kollekció, mint crm_tombstones,
  // az első törlés-esemény előtt). Ha ezt hibaként kezelnénk, minden szinkron
  // vörös hibasávot mutatna, holott semmi nincs elromolva.
  if (res?.error && /fájl nem található|not found/i.test(res.error)) {
    return { ok: true, content: null };
  }
  return { ok: false, content: null, error: res?.error || "Drive betöltési hiba" };
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
