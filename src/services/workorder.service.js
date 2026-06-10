import {
  validateWorkorderBeforeSave,
  getProjectStatusFromWorkorder,
  migrateMunkalapStatus,
} from "../lib/workflowRules.js";
import { driveSave } from "../lib/driveApi.js";
import { nextEdiSorszam } from "../lib/dokumentumszam.js";
import { syncMunkalapToCalendar, deleteMunkalapFromCalendar } from "./calendarSync.service.js";
import { updateProjekt } from "../modules/projektek/projekt.service.js";

const KEY = "munkalapok";

function dispatch(collection = "munkalapok") {
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection } }));
}

function notifySyncFailed() {
  window.dispatchEvent(new CustomEvent("crm-sync-warning", {
    detail: { message: "Mentve helyileg, de nincs szinkronizálva." },
  }));
}

export function loadWorkorders() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    // Backward compat: régi státuszok migrálása
    return raw.map(w => {
      const ms = migrateMunkalapStatus(w.status);
      return ms !== w.status ? { ...w, status: ms } : w;
    });
  } catch {
    return [];
  }
}

export function saveWorkorders(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch("munkalapok");
  driveSave("munkalapok", { munkalapok: list }).catch(() => notifySyncFailed());
}

export function getWorkorder(id) {
  return loadWorkorders().find(w => w.id === id) || null;
}

export function getWorkordersByProjectId(projectId) {
  return loadWorkorders().filter(w => w.projektId === projectId);
}

// Típus rövidítés a munkalapszámhoz
const TIPUS_ROVID = {
  "Kivitelezés":      "TELEP",
  "Garanciális":      "GAR",
  "Javítás":          "JAV",
  "Karbantartás":     "KARB",
  "Szerviz":          "SZERV",
  "Felmérés":         "FELM",
  "Egyéb":            "EGYEB",
  // backward compat régi típusok
  "Első kivitelezés": "TELEP",
  "Garanciális munka":"GAR",
  "Hibajavítás":      "HIBA",
  "Pótmunkavégzés":   "POT",
};

export function nextWorkorderNumber(projectKod, tipus = "") {
  const rovid = TIPUS_ROVID[tipus] || tipus.toUpperCase().slice(0, 5) || "ML";
  const prefix = `${projectKod}/${rovid}`;
  const all = loadWorkorders();
  const existing = new Set(all.map(w => w.munkalapSzam).filter(Boolean));
  let seq = all.filter(w => w.munkalapSzam?.startsWith(prefix + "/")).length + 1;
  let candidate = `${prefix}/${String(seq).padStart(3, "0")}`;
  while (existing.has(candidate)) {
    seq++;
    candidate = `${prefix}/${String(seq).padStart(3, "0")}`;
  }
  return candidate;
}

function normalizeWorkorder(data = {}) {
  const now = new Date().toISOString();
  const result = {
    id: data.id || `ml_${Date.now()}`,
    projektId:    data.projektId    || "",
    projektKod:   data.projektKod   || "",
    tipus:        data.tipus        || "Kivitelezés",
    munkalapTipus: data.munkalapTipus || data.tipus || "Kivitelezés",
    status:       migrateMunkalapStatus(data.status || "Létrehozva"),
    indoklas:     data.indoklas     || "",
    datum:        data.datum        || "",
    clientNev:    data.clientNev    || "",
    clientCim:    data.clientCim    || "",
    clientTel:    data.clientTel    || "",
    clientEmail:  data.clientEmail  || "",
    telepitesiCim: data.telepitesiCim || data.clientCim || "",
    assigneeId:   data.assigneeId   || data.csapatId    || "",
    assigneeNev:  data.assigneeNev  || data.csapatNev   || "",
    csapatId:     data.csapatId     || data.assigneeId  || "",
    csapatNev:    data.csapatNev    || data.assigneeNev || "",
    csapatKiosztasok: data.csapatKiosztasok || [],
    megjegyzes:   data.megjegyzes   || "",
    createdAt:    data.createdAt    || now,
    createdBy:    data.createdBy    || "",
    updatedBy:    data.updatedBy    || "",
    version:      data.version      || 1,
    ...data,
    // Audit mezők spreaden felülírva – mindig a futáskori érték
    updatedAt:    now,
    syncStatus:   "synced",
  };
  // munkalapSzam AFTER spread: üres string override esetén is helyes értéket ad
  if (!result.munkalapSzam) {
    result.munkalapSzam = nextWorkorderNumber(result.projektKod || "ML", result.tipus || "");
  }
  return result;
}

export function createWorkorder(data, user = "") {
  const now = new Date().toISOString();

  // 1. Munkalapszám generálása (while-looppal védi az ütközést)
  const munkalapSzam = data.munkalapSzam ||
    nextWorkorderNumber(data.projektKod || "ML", data.tipus || "");

  // 2. EDI sorszám és dokumentumszám generálása, ha nincs megadva
  const ediSorszam = data.ediSorszam || nextEdiSorszam();
  const fovNr = (data.fovallalkoiAzonosito || "").trim();
  const dokumentumszam = data.dokumentumszam ||
    (fovNr ? `${munkalapSzam} / ${fovNr}` : munkalapSzam);

  // 3. Ütközésvédelem: race-condition guard a mentés előtt
  const snapshot = loadWorkorders();
  const meglevoSzamok      = new Set(snapshot.map(w => w.munkalapSzam).filter(Boolean));
  const meglevoEdiSzamok   = new Set(snapshot.map(w => w.ediSorszam).filter(Boolean));
  const meglevoDokSzamok   = new Set(snapshot.map(w => w.dokumentumszam).filter(Boolean));
  if (meglevoSzamok.has(munkalapSzam))
    throw new Error(`Ütközés: ${munkalapSzam} munkalapszám már létezik.`);
  if (meglevoEdiSzamok.has(ediSorszam))
    throw new Error(`Ütközés: ${ediSorszam} EDI sorszám már létezik.`);
  if (meglevoDokSzamok.has(dokumentumszam))
    throw new Error(`Ütközés: ${dokumentumszam} dokumentumszám már létezik.`);

  const workorder = normalizeWorkorder({
    ...data,
    munkalapSzam,
    ediSorszam,
    dokumentumszam,
    createdAt: now,
    createdBy: user,
    updatedBy: user,
    version:   1,
  });

  const validation = validateWorkorderBeforeSave(workorder);
  if (!validation.ok) throw new Error(validation.message);

  saveWorkorders([workorder, ...snapshot]);
  syncMunkalapToCalendar(workorder).catch(() => {});
  return workorder;
}

export function updateWorkorder(id, updates, user = "") {
  const current = getWorkorder(id);
  if (!current) return null;

  // Lezart/befejezett munkalapnal a datum mezo vedett visszadatumozas ellen
  const _isLezart = current.lezarva === true
    || !!current.befejezesIdopont
    || ["Lezárva", "Ellenőrzés alatt", "Számlázva", "Számlázásra kész"].includes(current.status);
  const safeUpdates = (_isLezart && "date" in updates && updates.date !== current.date)
    ? (({ date: _d, ...rest }) => rest)(updates)
    : updates;

  const updated = normalizeWorkorder({
    ...current,
    ...safeUpdates,
    id,
    createdAt: current.createdAt,
    createdBy: current.createdBy,
    updatedBy: user || current.updatedBy,
    version:   (current.version || 0) + 1,
  });

  const validation = validateWorkorderBeforeSave(updated);
  if (!validation.ok) throw new Error(validation.message);

  const next = loadWorkorders().map(w => w.id === id ? updated : w);
  saveWorkorders(next);

  // Munkalap státusz → Projekt státusz automata frissítés
  if (updates.status && updates.status !== current.status && updated.projektId) {
    const ujProjektStatusz = getProjectStatusFromWorkorder(updates.status);
    if (ujProjektStatusz) {
      updateProjekt(updated.projektId, { status: ujProjektStatusz }, user || "system");
    }

    // Ha minden munkalap kész (Lezárva / Számlázva / Számlázásra kész)
    // → automatikus pénzügyi előkészítés (dinamikus import = nincs circular dep)
    const KESZ_STATUSZOK = ["Lezárva", "Számlázva", "Számlázásra kész"];
    const triggersKesz = ujProjektStatusz === "Készre jelentve"
      || KESZ_STATUSZOK.includes(updates.status);
    if (triggersKesz) {
      const projektMunkalapok = loadWorkorders().filter(w => w.projektId === updated.projektId);
      const mindKeszen = projektMunkalapok.length > 0
        && projektMunkalapok.every(m => KESZ_STATUSZOK.includes(m.status));
      if (mindKeszen) {
        import("../modules/penzugy/penzugyi.service.js")
          .then(({ autoElszamolasElokeszites }) => {
            autoElszamolasElokeszites(updated.projektId, projektMunkalapok, user || "system");
          })
          .catch(() => {});
      }
    }
  }

  syncMunkalapToCalendar(updated).catch(() => {});
  return updated;
}

export function deleteWorkorder(id) {
  const toDelete = getWorkorder(id);
  saveWorkorders(loadWorkorders().filter(w => w.id !== id));
  if (toDelete) deleteMunkalapFromCalendar(toDelete).catch(() => {});
}
