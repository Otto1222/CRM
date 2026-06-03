/**
 * backupService.js
 * Biztonsági mentés rendszer
 * Teljes CRM localStorage snapshot, parse-olt JSON adatokkal.
 */

import { driveSave } from "./driveApi.js";

const BACKUP_KEY = "crm_backups";
const MAX_BACKUPS = 10;

const MAIN_KEYS = [
  "projektek",
  "crm_projektek",
  "munkalapok",
  "crm_munkalapok",
  "ugyfelek",
  "crm_ugyfelek",
  "beallitasok",
  "crm_beallitasok",
  "karteritesek",
  "crm_karteritesek",
  "sablonok",
  "edi_sorszam_counter",
  "crm_schema_version",
];

const PREFIX_GROUPS = {
  vbf: ["vbf_", "crm_vbf_"],
  fotok: ["fotok_", "crm_fotok_"],
  felhasznaltAnyagok: ["felh_anyagok_", "crm_felh_anyagok_"],
  karteritesek: ["karterites_", "crm_karterites_"],
};

function safeParse(value) {
  if (value === null || value === undefined) return value;

  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  if (
    trimmed.startsWith("{") ||
    trimmed.startsWith("[") ||
    trimmed === "true" ||
    trimmed === "false" ||
    trimmed === "null" ||
    /^-?\d+(\.\d+)?$/.test(trimmed)
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
}

function toStorageValue(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function getFirstAvailable(keys, fallback) {
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value !== null && value !== undefined) {
      return safeParse(value);
    }
  }
  return fallback;
}

function collectLocalStorageSnapshot() {
  const data = {
    projektek: getFirstAvailable(["projektek", "crm_projektek"], []),
    munkalapok: getFirstAvailable(["munkalapok", "crm_munkalapok"], []),
    ugyfelek: getFirstAvailable(["ugyfelek", "crm_ugyfelek"], []),
    beallitasok: getFirstAvailable(["beallitasok", "crm_beallitasok"], {}),
    sablonok: getFirstAvailable(["sablonok"], []),
    ediSorszamCounter: getFirstAvailable(["edi_sorszam_counter"], null),
    vbf: {},
    fotok: {},
    felhasznaltAnyagok: {},
    karteritesek: {},
    otherLocalStorage: {},
  };

  const knownKeys = new Set([...MAIN_KEYS, BACKUP_KEY]);

  Object.keys(localStorage).forEach((key) => {
    if (key === BACKUP_KEY) return;

    const raw = localStorage.getItem(key);
    const parsed = safeParse(raw);

    let grouped = false;

    Object.entries(PREFIX_GROUPS).forEach(([groupName, prefixes]) => {
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        data[groupName][key] = parsed;
        knownKeys.add(key);
        grouped = true;
      }
    });

    if (grouped) return;

    if (!knownKeys.has(key)) {
      data.otherLocalStorage[key] = parsed;
    }
  });

  return data;
}

/** Teljes alkalmazás állapot snapshot */
export function createBackup(label = "", { saveToDrive = false } = {}) {
  try {
    const snapshot = {
      id: `bk_${Date.now()}`,
      label: label || `Mentés ${new Date().toLocaleString("hu-HU")}`,
      createdAt: new Date().toISOString(),
      version: getSchemaVersion(),
      source: "browser-localStorage",
      data: collectLocalStorageSnapshot(),
    };

    const backups = getBackups();
    backups.unshift(snapshot);

    if (backups.length > MAX_BACKUPS) {
      backups.splice(MAX_BACKUPS);
    }

    localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));

    // Drive mentés csak manuális híváskor (auto-backup nem küldi – quota kímélés)
    if (saveToDrive) {
      driveSave("crm_backups", { crm_backups: backups }).catch(() => {});
    }

    console.info(`[Backup] ✅ Mentés készült: ${snapshot.id} (${label})`);
    return snapshot.id;
  } catch (e) {
    console.warn("[Backup] ❌ Mentés sikertelen:", e);
    return null;
  }
}

export function getBackups() {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]");
  } catch {
    return [];
  }
}

/** Visszaállítás egy snapshot-ból */
export function restoreBackup(backupId) {
  const backups = getBackups();
  const snap = backups.find((b) => b.id === backupId);

  if (!snap) return false;

  try {
    createBackup("Visszaállítás előtti állapot");

    const data = snap.data || {};

    const restoreMap = {
      projektek: "projektek",
      munkalapok: "munkalapok",
      ugyfelek: "ugyfelek",
      beallitasok: "beallitasok",
      sablonok: "sablonok",
      ediSorszamCounter: "edi_sorszam_counter",
    };

    Object.entries(restoreMap).forEach(([backupKey, storageKey]) => {
      if (data[backupKey] !== undefined && data[backupKey] !== null) {
        localStorage.setItem(storageKey, toStorageValue(data[backupKey]));
      }
    });

    ["vbf", "fotok", "felhasznaltAnyagok", "karteritesek", "otherLocalStorage"].forEach((group) => {
      Object.entries(data[group] || {}).forEach(([key, value]) => {
        localStorage.setItem(key, toStorageValue(value));
      });
    });

    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "all" } }));

    console.info(`[Backup] ✅ Visszaállítva: ${backupId}`);
    return true;
  } catch (e) {
    console.warn("[Backup] ❌ Visszaállítás sikertelen:", e);
    return false;
  }
}

export function deleteBackup(backupId) {
  const backups = getBackups().filter((b) => b.id !== backupId);
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
}

/** Séma verzió */
export function getSchemaVersion() {
  return localStorage.getItem("crm_schema_version") || "1.0";
}

export function setSchemaVersion(v) {
  localStorage.setItem("crm_schema_version", v);
}