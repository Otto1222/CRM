// ═══════════════════════════════════════════════════════════════════
// CRM Napelem – Google Apps Script webhook
//
// TELEPÍTÉS:
//   1. Nyisd meg: https://script.google.com
//   2. Új projekt → másold be ezt a kódot
//   3. Mentés → Üzembe helyezés → Új üzembe helyezés
//   4. Típus: Webalkalmazás
//      Végrehajtás: Saját fiókként
//      Hozzáférés: Mindenki
//   5. Az URL-t másold be a CRM .env fájlba: VITE_APPS_SCRIPT_URL=...
//
// FRISSÍTÉS (ha már van deployed URL):
//   Üzembe helyezés → Üzembe helyezések kezelése → Szerkesztés → Új verzió
// ═══════════════════════════════════════════════════════════════════

// ─── Konfiguráció ─────────────────────────────────────────────────
// Drive struktúra gyökér: 1-MuCrK__dMkoep19f8cJFBpgJQAkwu-5 (CRM)
var DB_FOLDER_ID    = "1jkRh98v5pm73Dyhmn3FioFkznBaxWwsW";  // 01_Adatbazis (JSON szinkron)
var MUNKA_FOLDER_ID = "1ccvd4iUnB-jEyrSGJBZs_fSOScL_aQPx";  // 04_Fotok (fotók, projekt mappák)

// ─── HTTP entry point-ok ──────────────────────────────────────────
function doGet(e) {
  var params = e.parameter;
  try {
    var result = dispatch(params);
    return jsonResponse(result);
  } catch (err) {
    Logger.log("doGet hiba: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch(x) { body = {}; }
  try {
    var result = dispatch(body);
    return jsonResponse(result);
  } catch (err) {
    Logger.log("doPost hiba: " + err.message);
    return jsonResponse({ ok: false, error: err.message });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Fő dispatcher ────────────────────────────────────────────────
function dispatch(p) {
  var action = p.action;
  if (!action) return { ok: false, error: "Hiányzó action" };

  if (action === "ping")                 return ping();
  if (action === "diagnose")             return diagnose();
  if (action === "saveJson")             return saveJson(p);
  if (action === "loadJson")             return loadJson(p);
  if (action === "saveFoto")             return saveFoto(p);
  if (action === "createMunkalapFolder") return createMunkalapFolder(p);
  if (action === "createProjektFolder")  return createProjektFolder(p);

  return { ok: false, error: "Ismeretlen action: " + action };
}

// ─── ping – most már teszteli a Drive mappa elérhetőségét is ──────
function ping() {
  var folderOk = false;
  var folderError = null;
  try {
    var f = DriveApp.getFolderById(DB_FOLDER_ID);
    f.getName(); // ha ez nem dob kivételt, elérhető
    folderOk = true;
  } catch(e) {
    folderError = e.message;
  }
  return {
    ok:          folderOk,
    ts:          new Date().toISOString(),
    driveFolder: folderOk ? "OK" : "HIBA",
    driveError:  folderError,
  };
}

// ─── diagnose – részletes Drive jogosultság ellenőrzés ────────────
function diagnose() {
  var result = {
    ok:        true,
    ts:        new Date().toISOString(),
    activeUser: "",
    dbFolder:  { id: DB_FOLDER_ID,    ok: false, name: null, error: null },
    munkaFolder: { id: MUNKA_FOLDER_ID, ok: false, name: null, error: null },
  };

  // Melyik fiókként fut a script
  try {
    result.activeUser = Session.getEffectiveUser().getEmail();
  } catch(e) {
    result.activeUser = "ismeretlen (" + e.message + ")";
  }

  // DB_FOLDER (01_Adatbazis) ellenőrzés
  try {
    var dbF = DriveApp.getFolderById(DB_FOLDER_ID);
    result.dbFolder.ok   = true;
    result.dbFolder.name = dbF.getName();
    // Próba fájl írás-olvasás
    try {
      var testFile = dbF.createFile("_diagnose_test_.tmp", "ok", MimeType.PLAIN_TEXT);
      testFile.setTrashed(true);
      result.dbFolder.writeTest = true;
    } catch(we) {
      result.dbFolder.writeTest = false;
      result.dbFolder.writeError = we.message;
    }
  } catch(e) {
    result.dbFolder.ok    = false;
    result.dbFolder.error = e.message;
    result.ok             = false;
  }

  // MUNKA_FOLDER (04_Fotok) ellenőrzés
  try {
    var mF = DriveApp.getFolderById(MUNKA_FOLDER_ID);
    result.munkaFolder.ok   = true;
    result.munkaFolder.name = mF.getName();
  } catch(e) {
    result.munkaFolder.ok    = false;
    result.munkaFolder.error = e.message;
    result.ok                = false;
  }

  return result;
}

// ─── JSON mentés (CRM_db mappába) ─────────────────────────────────
// params: { fileName, content }
function saveJson(p) {
  if (!p.fileName) return { ok: false, error: "fileName hiányzik" };
  var folder = DriveApp.getFolderById(DB_FOLDER_ID);
  var json   = JSON.stringify(p.content, null, 2);
  var files  = folder.getFilesByName(p.fileName);
  if (files.hasNext()) {
    files.next().setContent(json);
  } else {
    folder.createFile(p.fileName, json, MimeType.PLAIN_TEXT);
  }
  return {
    ok:        true,
    action:    "saveJson",
    fileName:  p.fileName,
    timestamp: new Date().toISOString(),
  };
}

// ─── JSON betöltés ────────────────────────────────────────────────
// params: { fileName }
function loadJson(p) {
  if (!p.fileName) return { ok: false, error: "fileName hiányzik" };
  var folder = DriveApp.getFolderById(DB_FOLDER_ID);
  var files  = folder.getFilesByName(p.fileName);
  if (!files.hasNext()) return { ok: false, error: "Fájl nem található: " + p.fileName };
  try {
    var content = JSON.parse(files.next().getBlob().getDataAsString());
    return { ok: true, action: "loadJson", fileName: p.fileName, content: content };
  } catch(e) {
    return { ok: false, action: "loadJson", fileName: p.fileName, error: "JSON parse hiba: " + e.message };
  }
}

// ─── Fotó feltöltés ───────────────────────────────────────────────
// params: { munkalapId, fotoNev, fotoBase64, mimeType, projektkod? }
function saveFoto(p) {
  if (!p.munkalapId || !p.fotoBase64) return { ok: false, error: "Hiányzó paraméter" };

  var targetFolder = getMunkalapFolder(p.munkalapId, p.projektkod || "");

  var blob = Utilities.newBlob(
    Utilities.base64Decode(p.fotoBase64),
    p.mimeType || "image/jpeg",
    p.fotoNev  || ("foto_" + Date.now() + ".jpg")
  );
  var file = targetFolder.createFile(blob);
  return {
    ok:        true,
    action:    "saveFoto",
    fotoNev:   p.fotoNev,
    folderId:  targetFolder.getId(),
    timestamp: new Date().toISOString(),
  };
}

// ─── Munkalap mappa létrehozás ────────────────────────────────────
// params: { munkalapId, projektkod? }
// Ha projektkod van → CRM_munka/Projektek/{projektkod}*/02_Kivitelezés/{munkalapId}
// Ha nincs          → CRM_munka/Munkalapok/{munkalapId}
function createMunkalapFolder(p) {
  if (!p.munkalapId) return { ok: false, error: "munkalapId hiányzik" };
  var folder = getMunkalapFolder(p.munkalapId, p.projektkod || "");
  return {
    ok:        true,
    action:    "createMunkalapFolder",
    folderId:  folder.getId(),
    timestamp: new Date().toISOString(),
  };
}

// Belső segédfüggvény: megkeresi vagy létrehozza a munkalap mappát
function getMunkalapFolder(munkalapId, projektkod) {
  if (projektkod) {
    try {
      var projektek  = getOrCreateFolder(MUNKA_FOLDER_ID, "Projektek");
      var projektFolder = findProjektFolder(projektek, projektkod);
      if (projektFolder) {
        var kivFolder = getOrCreateFolder(projektFolder.getId(), "02_Kivitelezés");
        return getOrCreateFolder(kivFolder.getId(), munkalapId);
      }
    } catch(e) {
      Logger.log("getMunkalapFolder projekt keresés hiba: " + e.message);
    }
  }
  // Fallback: CRM_munka/Munkalapok/
  var munkalapok = getOrCreateFolder(MUNKA_FOLDER_ID, "Munkalapok");
  return getOrCreateFolder(munkalapok.getId(), munkalapId);
}

// ─── Projekt mappa létrehozás ─────────────────────────────────────
// params: { projektkod, clientNev?, projektId? }
// Létrehozza: CRM_munka/Projektek/{projektkod} – {clientNev}/
//   + 4 almappa: 01_Felmérés, 02_Kivitelezés, 03_Dokumentumok, 04_Számlák
function createProjektFolder(p) {
  if (!p.projektkod) return { ok: false, error: "projektkod hiányzik" };

  var projektek  = getOrCreateFolder(MUNKA_FOLDER_ID, "Projektek");
  var mappaName  = p.clientNev
    ? p.projektkod + " – " + p.clientNev   // em dash
    : p.projektkod;

  // Ha már létezik, nem hozzuk létre újra
  var meglevo = findProjektFolder(projektek, p.projektkod);
  if (meglevo) {
    Logger.log("Projekt mappa már létezik: " + meglevo.getName());
    return { ok: true, existed: true };
  }

  var projektFolder = projektek.createFolder(mappaName);
  projektFolder.createFolder("01_Felmérés");
  projektFolder.createFolder("02_Kivitelezés");
  projektFolder.createFolder("03_Dokumentumok");
  projektFolder.createFolder("04_Számlák");

  // Meta fájl a gyors azonosításhoz
  var meta = {
    projektId:  p.projektId  || "",
    projektkod: p.projektkod,
    clientNev:  p.clientNev  || "",
    letrehozva: new Date().toISOString(),
  };
  projektFolder.createFile(
    "_projekt_meta.json",
    JSON.stringify(meta, null, 2),
    MimeType.PLAIN_TEXT
  );

  Logger.log("Projekt mappa létrehozva: " + mappaName + " id=" + projektFolder.getId());
  return { ok: true, folderId: projektFolder.getId() };
}

// ─── Segédfüggvények ──────────────────────────────────────────────

// Megkeresi vagy létrehozza az almappát a megadott szülőben
function getOrCreateFolder(parentId, name) {
  var parent   = DriveApp.getFolderById(parentId);
  var existing = parent.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return parent.createFolder(name);
}

// Megkeresi a projekt mappát projektkod alapján (a név kezdőszövege alapján)
// pl. "E.D.I.001 – Kovács Béla" → projektkod = "E.D.I.001"
function findProjektFolder(projektekFolder, projektkod) {
  var subs = projektekFolder.getFolders();
  while (subs.hasNext()) {
    var f = subs.next();
    if (f.getName().indexOf(projektkod) === 0) return f;
  }
  return null;
}
