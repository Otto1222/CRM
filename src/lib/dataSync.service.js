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
];

function emptyValue(collection) {
  return collection === "beallitasok" ? {} : [];
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
