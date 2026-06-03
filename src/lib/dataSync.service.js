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
  "crm_napelem_users",
  "szamlak",
];

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

export async function loadCollection(collection) {
  const localData = loadLocal(collection);

  try {
    const drivePayload = await driveLoad(collection);
    const driveData = unwrap(collection, drivePayload);

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

export async function saveCollection(collection, data) {
  saveLocal(collection, data);

  try {
    await driveSave(collection, { [collection]: data });
  } catch (e) {
    console.warn(`[dataSync] Drive mentési hiba: ${collection}`, e);
  }

  window.dispatchEvent(
    new CustomEvent("crm-db-updated", {
      detail: { collection, action: "save", fromDataSync: true },
    })
  );

  return data;
}

export async function syncAllFromDrive() {
  const result = {};

  for (const collection of SYNC_COLLECTIONS) {
    result[collection] = await loadCollection(collection);
  }

  // Pillanatkepek visszaállítása Drive-ból (egyedi localStorage kulcsokra)
  try {
    const drivePayload = await driveLoad("pillanatkepek");
    const pillanatkepek = unwrap("pillanatkepek", drivePayload);
    if (Array.isArray(pillanatkepek) && pillanatkepek.length > 0) {
      pillanatkepek.forEach(p => {
        if (p.projektId) saveLocal(`projekt_pillanatkep_${p.projektId}`, p);
      });
      result.pillanatkepek = pillanatkepek;
    }
  } catch {}

  // Counter öngyógyítás: ha localStorage törlődött, a valós adatokból állítja helyre
  // Ezzel megelőzhető a duplikált projektkód / EDI sorszám
  const projektek = result.projektek || [];
  if (projektek.length > 0) {
    const maxProjN = projektek.reduce((m, p) => {
      const match = p.projektkod?.match(/E\.D\.I\.(\d+)/);
      return match ? Math.max(m, parseInt(match[1], 10)) : m;
    }, 0);
    const localProjN = parseInt(localStorage.getItem("edi_projekt_sorszam_counter") || "0", 10);
    if (maxProjN > localProjN) localStorage.setItem("edi_projekt_sorszam_counter", String(maxProjN));
  }

  const munkalapok = result.munkalapok || [];
  if (munkalapok.length > 0) {
    const maxEdiN = munkalapok.reduce((m, ml) => {
      const s = ml.ediSorszam || ml.dokumentumszam || "";
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

export async function syncAllToDrive() {
  const result = {};

  for (const collection of SYNC_COLLECTIONS) {
    const data = loadLocal(collection) ?? emptyValue(collection);
    result[collection] = await saveCollection(collection, data);
  }

  return result;
}
