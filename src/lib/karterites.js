// ─── Kártérítés kezelő ────────────────────────────────────────
import { loadLocal, saveLocal } from "./localDb";

const KEY = "karteritesek";

export function loadKarteritesek() {
  return loadLocal(KEY) || [];
}

export function saveKarteritesek(data) {
  saveLocal(KEY, data);
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: KEY } }));
}

export function addKarterites(item) {
  const list = loadKarteritesek();
  const uj = {
    id:           `kt_${Date.now()}`,
    projektId:    item.projektId || "",
    munkalapId:   item.munkalapId || "",
    osszeg:       Number(item.osszeg) || 0,
    ok:           item.ok || "",
    datum:        item.datum || new Date().toISOString().slice(0, 10),
    rogzitoSzemely: item.rogzitoSzemely || "",
    megjegyzes:   item.megjegyzes || "",
    elfogadott:   item.elfogadott ?? null,  // null=függőben, true=elfogadott, false=elutasított
    createdAt:    new Date().toISOString(),
    ...item,
  };
  saveKarteritesek([...list, uj]);
  return uj;
}

export function updateKarterites(id, updates) {
  const list = loadKarteritesek();
  const next = list.map(k => k.id === id ? { ...k, ...updates } : k);
  saveKarteritesek(next);
  return next;
}

export function deleteKarterites(id) {
  const list = loadKarteritesek();
  saveKarteritesek(list.filter(k => k.id !== id));
}

/** Elfogadott kártérítések összege egy munkalaphoz */
export function karteritesOsszesMunkalaphoz(munkalapId) {
  return loadKarteritesek()
    .filter(k => k.munkalapId === munkalapId && k.elfogadott === true)
    .reduce((s, k) => s + (k.osszeg || 0), 0);
}
