/**
 * driveApi.js – Google Drive szinkronizálás
 * 
 * Ha VITE_APPS_SCRIPT_URL be van állítva → Apps Script webhook
 * Fallback: localStorage csak (offline mód)
 *
 * Drive struktúra (CRM gyökér: 1-MuCrK__dMkoep19f8cJFBpgJQAkwu-5)
 *   01_Adatbazis  → JSON adatfájlok (DB_FOLDER)
 *   04_Fotok      → fotók, projekt mappák (MUNKA_FOLDER)
 */

const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || "";

// Drive mappa ID-k – új CRM struktúra
export const DRIVE_DB_FOLDER_ID    = "1jkRh98v5pm73Dyhmn3FioFkznBaxWwsW";  // 01_Adatbazis
export const DRIVE_MUNKA_FOLDER_ID = "1ccvd4iUnB-jEyrSGJBZs_fSOScL_aQPx";  // 04_Fotok

// ─── Alap POST hívás ──────────────────────────────────────────
async function post(body) {
  if (!SCRIPT_URL) return { ok: false, offline: true };
  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", // Apps Script CORS bypass
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    // no-cors → response opaque, feltételezzük hogy OK volt
    return { ok: true };
  } catch (e) {
    console.warn("[driveApi POST]", e.message);
    return { ok: false, error: e.message };
  }
}

// GET – adatok betöltése
async function get(params) {
  if (!SCRIPT_URL) return { ok: false, offline: true };
  try {
    const url = new URL(SCRIPT_URL);
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
    const res  = await fetch(url.toString());
    const data = await res.json();
    return data;
  } catch (e) {
    console.warn("[driveApi GET]", e.message);
    return { ok: false };
  }
}

// ─── PUBLIC API ───────────────────────────────────────────────

export async function driveLoad(collection) {
  const res = await get({ action: "loadJson", fileName: `${collection}.json` });
  if (res?.ok && res.content) return res.content;
  return null;
}

export async function driveSave(collection, data) {
  return post({ action: "saveJson", fileName: `${collection}.json`, content: data });
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

// Google Drive kereső URL a projekt mappájához (projektkod alapján)
export function getDriveProjektSearchUrl(projektkod) {
  return `https://drive.google.com/drive/search?q=${encodeURIComponent('"' + projektkod + '"')}`;
}

// A CRM_munka gyökérmappa direkt linkje
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
    reader.onerror = () => resolve({ ok: false });
    reader.readAsDataURL(file);
  });
}

export async function drivePing() {
  if (!SCRIPT_URL) return false;
  const res = await get({ action: "ping" });
  return res?.ok === true;
}

export const driveAvailable = () => !!SCRIPT_URL;
