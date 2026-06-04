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

// status mező normalizálása (backward compat: régi elfogadott mező → status)
export function getKarteritesStatus(k) {
  if (k.status) return k.status;
  if (k.elfogadott === true)  return "elfogadott";
  if (k.elfogadott === false) return "elutasitott";
  return "fuggoben";
}

export function addKarterites(item) {
  const list = loadKarteritesek();
  const status = item.status || "fuggoben";
  const uj = {
    id:                        `kt_${Date.now()}`,
    // Projekt / munkalap hivatkozás
    projektId:                 item.projektId || "",
    workOrderId:               item.workOrderId || item.munkalapId || "",
    // Backward compat
    munkalapId:                item.workOrderId || item.munkalapId || "",
    // Összeg és ok
    osszeg:                    Number(item.osszeg) || 0,
    ok:                        item.ok || "",
    datum:                     item.datum || new Date().toISOString().slice(0, 10),
    // Státusz
    status,
    elfogadott:                status === "elfogadott" ? true : status === "elutasitott" ? false : null,
    // Felelős
    responsibleType:           item.responsibleType || "egyeb",
    responsibleTeamId:         item.responsibleTeamId || "",
    responsibleWorkerId:       item.responsibleWorkerId || "",
    responsibleSubcontractorId: item.responsibleSubcontractorId || "",
    responsibleNameSnapshot:   item.responsibleNameSnapshot || "",
    // Megjegyzés
    note:                      item.note || item.megjegyzes || "",
    megjegyzes:                item.note || item.megjegyzes || "",
    // Metaadatok
    createdAt:                 new Date().toISOString(),
    createdBy:                 item.createdBy || "",
    rogzitoSzemely:            item.createdBy || item.rogzitoSzemely || "",
  };
  saveKarteritesek([...list, uj]);
  return uj;
}

export function updateKarterites(id, updates) {
  const list = loadKarteritesek();
  // status ↔ elfogadott szinkron
  if (updates.status !== undefined) {
    updates.elfogadott = updates.status === "elfogadott" ? true : updates.status === "elutasitott" ? false : null;
  } else if (updates.elfogadott !== undefined) {
    updates.status = updates.elfogadott === true ? "elfogadott" : updates.elfogadott === false ? "elutasitott" : "fuggoben";
  }
  const next = list.map(k => k.id === id ? { ...k, ...updates } : k);
  saveKarteritesek(next);
  return next;
}

export function deleteKarterites(id) {
  const list = loadKarteritesek();
  saveKarteritesek(list.filter(k => k.id !== id));
}

/** Elfogadott kártérítések összege egy projekthez (munkalap + projekt szintű) */
export function karteritesOsszegProjekthez(projektId, munkalapIds = []) {
  return loadKarteritesek()
    .filter(k => {
      const st = getKarteritesStatus(k);
      if (st !== "elfogadott") return false;
      return k.projektId === projektId || munkalapIds.includes(k.workOrderId) || munkalapIds.includes(k.munkalapId);
    })
    .reduce((s, k) => s + (k.osszeg || 0), 0);
}

/** Elfogadott kártérítések összege egy munkalaphoz */
export function karteritesOsszesMunkalaphoz(munkalapId) {
  return loadKarteritesek()
    .filter(k => (k.workOrderId === munkalapId || k.munkalapId === munkalapId) && getKarteritesStatus(k) === "elfogadott")
    .reduce((s, k) => s + (k.osszeg || 0), 0);
}

/** Kártérítések egy projekthez (minden státusz) */
export function getKarteritesekByProjekt(projektId, munkalapIds = []) {
  return loadKarteritesek().filter(k =>
    k.projektId === projektId ||
    munkalapIds.includes(k.workOrderId) ||
    munkalapIds.includes(k.munkalapId)
  );
}
