/**
 * driveApi.js – Google Drive szinkronizálás
 * Apps Script webhook-on keresztül (ingyenes, API kulcs nem kell)
 *
 * Beállítás:
 * 1. Google Drive → CRM/CRM_db/Apps_Script_telepito.gs tartalmát
 *    másold be egy új Google Apps Script projektbe
 * 2. Telepítsd webalkalmazásként (Futtatás → Webalkalmazásként telepítés)
 *    - Következőként futtatja: Én
 *    - Hozzáférés: Mindenki
 * 3. Másold be az URL-t az APPS_SCRIPT_URL változóba
 * 4. Vercel → Environment Variables → VITE_APPS_SCRIPT_URL = URL
 */

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || "";

const FOLDER_IDS = {
  db:    "1BDxc7MjKidp82A52dAeAArBWeNnqGVxJ",
  munka: "1gbns44t8w_h9eHjUODC41jjnwtTi2bpO",
};

// ─── Alap hívás ───────────────────────────────────────────────
async function callScript(body) {
  if (!APPS_SCRIPT_URL) return { ok: false, error: "VITE_APPS_SCRIPT_URL nincs beállítva" };
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (e) {
    console.warn("[driveApi]", e.message);
    return { ok: false, error: e.message };
  }
}

async function getScript(params) {
  if (!APPS_SCRIPT_URL) return { ok: false };
  try {
    const url = new URL(APPS_SCRIPT_URL);
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
    const res = await fetch(url.toString());
    return await res.json();
  } catch (e) {
    return { ok: false };
  }
}

// ─── Betöltés Drive-ból ───────────────────────────────────────
export async function driveLoad(collection) {
  const res = await getScript({ action: "loadJson", fileName: `${collection}.json` });
  if (res.ok && res.content) return res.content;
  return null;
}

// ─── Mentés Drive-ba ──────────────────────────────────────────
export async function driveSave(collection, data) {
  const res = await callScript({ action: "saveJson", fileName: `${collection}.json`, content: data });
  return res.ok === true;
}

// ─── VBF mentés ───────────────────────────────────────────────
export async function driveVbfSave(munkalapId, vbfData) {
  return callScript({
    action: "saveJson",
    fileName: `vbf_${munkalapId}.json`,
    content: vbfData,
    folderId: FOLDER_IDS.db,
  });
}

// ─── Munkalap mappa létrehozás ────────────────────────────────
export async function driveCreateMunkalapFolder(munkalapId) {
  return callScript({ action: "createMunkalapFolder", munkalapId });
}

// ─── Fotó feltöltés ──────────────────────────────────────────
export async function driveUploadFoto(munkalapId, file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(",")[1];
      const res = await callScript({
        action:   "saveFoto",
        munkalapId,
        fotoNev:  file.name,
        fotoBase64: base64,
        mimeType: file.type || "image/jpeg",
      });
      resolve(res);
    };
    reader.onerror = () => resolve({ ok: false });
    reader.readAsDataURL(file);
  });
}

// ─── Kapcsolat teszt ─────────────────────────────────────────
export async function drivePing() {
  const res = await callScript({ action: "ping" });
  return res.ok === true;
}
