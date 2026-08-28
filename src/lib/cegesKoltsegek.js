/**
 * cegesKoltsegek.js
 * Céges szintű, PROJEKTHEZ NEM köthető fix költségek (pl. iroda bér, bérleti
 * díj, könyvelő) – szándékosan NEM oszlik szét projektenként (nincs
 * önkényes elosztási képlet, ami vitatható lenne), hanem a Dashboard
 * pénzügyi összesítőjén egy külön, a teljes cégre vonatkozó sorként
 * jelenik meg, és a végleges céges eredményből (nem az egyes projektek
 * hasznából) vonódik le.
 */
import { loadLocal, saveLocal } from "./localDb";
import { recordDeletion } from "./dataSync.service.js";

const KEY = "ceges_fix_koltsegek";

export function loadCegesFixKoltsegek() {
  try { return loadLocal(KEY) || []; } catch { return []; }
}

function saveCegesFixKoltsegek(list) {
  saveLocal(KEY, list);
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: KEY } }));
}

export function addCegesFixKoltseg(nev, haviOsszeg) {
  const item = {
    id:         `cfk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    nev:        nev || "",
    haviOsszeg: Number(haviOsszeg) || 0,
    aktiv:      true,
    createdAt:  new Date().toISOString(),
  };
  saveCegesFixKoltsegek([...loadCegesFixKoltsegek(), item]);
  return item;
}

export function updateCegesFixKoltseg(id, updates) {
  const list = loadCegesFixKoltsegek().map(i => i.id === id ? { ...i, ...updates } : i);
  saveCegesFixKoltsegek(list);
  return list;
}

export function deleteCegesFixKoltseg(id) {
  saveCegesFixKoltsegek(loadCegesFixKoltsegek().filter(i => i.id !== id));
  recordDeletion(KEY, id);
}

/** Az aktív céges fix költségek havi összege – ez vonódik le a Dashboardon. */
export function calcCegesFixKoltsegHavi() {
  return loadCegesFixKoltsegek()
    .filter(i => i.aktiv !== false)
    .reduce((s, i) => s + (Number(i.haviOsszeg) || 0), 0);
}
