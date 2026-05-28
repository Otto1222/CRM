/**
 * backupService.js
 * Automatikus biztonsági mentés rendszer
 * Minden nagyobb művelet előtt snapshot készül
 */

const BACKUP_KEY   = "crm_backups";
const MAX_BACKUPS  = 10;

/** Teljes alkalmazás állapot snapshot */
export function createBackup(label = "") {
  try {
    const collections = ["munkalapok","ugyfelek","beallitasok","karteritesek","sablonok","edi_sorszam_counter"];
    const snapshot = {
      id:          `bk_${Date.now()}`,
      label:       label || `Mentés ${new Date().toLocaleString("hu-HU")}`,
      createdAt:   new Date().toISOString(),
      version:     getSchemaVersion(),
      data:        {},
    };
    collections.forEach(k => {
      const v = localStorage.getItem(k);
      if (v) snapshot.data[k] = v; // raw string, nem parse-olva
    });
    // Fotó kulcsok mentése
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith("crm_ml_") || k.startsWith("vbf_") || k.startsWith("fotok_")) {
        snapshot.data[k] = localStorage.getItem(k);
      }
    });
    const backups = getBackups();
    backups.unshift(snapshot);
    if (backups.length > MAX_BACKUPS) backups.splice(MAX_BACKUPS);
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
    console.info(`[Backup] ✅ Mentés készült: ${snapshot.id} (${label})`);
    return snapshot.id;
  } catch (e) {
    console.warn("[Backup] ❌ Mentés sikertelen:", e);
    return null;
  }
}

export function getBackups() {
  try { return JSON.parse(localStorage.getItem(BACKUP_KEY) || "[]"); } catch { return []; }
}

/** Visszaállítás egy snapshot-ból */
export function restoreBackup(backupId) {
  const backups = getBackups();
  const snap = backups.find(b => b.id === backupId);
  if (!snap) return false;
  try {
    // Jelenlegi állapot mentése mint "visszaállítás előtti"
    createBackup("Visszaállítás előtti állapot");
    // Restore
    Object.entries(snap.data).forEach(([k, v]) => {
      if (v !== null && v !== undefined) localStorage.setItem(k, v);
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
  const backups = getBackups().filter(b => b.id !== backupId);
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
}

/** Séma verzió */
export function getSchemaVersion() {
  return localStorage.getItem("crm_schema_version") || "1.0";
}
export function setSchemaVersion(v) {
  localStorage.setItem("crm_schema_version", v);
}
