/**
 * dijtetelKatalogus.service.js – CRUD a fővállalkozói díjtétel-katalógushoz.
 * Ld. dijtetelKatalogus.schema.js a modell hátteréért.
 */
import { DIJTETEL_KATALOGUS_TETEL_SCHEMA } from "./dijtetelKatalogus.schema.js";
import { createBackup } from "../../lib/backupService.js";

const KEY = "dijtetel_katalogus";

const dispatch = () =>
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: KEY } }));

export function loadKatalogus() {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function saveKatalogus(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  dispatch();
}

export function getKatalogusTetelek(tulajdonosId) {
  return loadKatalogus().filter(t => t.tulajdonosId === tulajdonosId);
}

export function getAktivKatalogusTetelek(tulajdonosId) {
  return getKatalogusTetelek(tulajdonosId).filter(t => t.aktiv !== false);
}

/** Kategóriák szerint csoportosítva, a táblázatbeli sorrend megtartásával. */
export function groupKatalogusByKategoria(tetelek) {
  const groups = [];
  const idx = {};
  (tetelek || []).forEach(t => {
    const key = t.kategoria?.trim() || "Egyéb";
    if (!(key in idx)) {
      idx[key] = groups.length;
      groups.push({ kategoria: key, tetelek: [] });
    }
    groups[idx[key]].tetelek.push(t);
  });
  return groups;
}

export function createKatalogusTetel(data) {
  const item = {
    ...DIJTETEL_KATALOGUS_TETEL_SCHEMA, ...data,
    id: `dkt_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveKatalogus([...loadKatalogus(), item]);
  return item;
}

export function updateKatalogusTetel(id, updates) {
  const list = loadKatalogus();
  const next = list.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
  saveKatalogus(next);
  return next.find(t => t.id === id);
}

export function deleteKatalogusTetel(id) {
  saveKatalogus(loadKatalogus().filter(t => t.id !== id));
}

/**
 * Excel-importból (vagy seedből) érkező tételek tömeges betöltése egy
 * fővállalkozóhoz.
 *   mode = "csere"   → a fővállalkozó MEGLÉVŐ katalógusa teljesen lecserélődik
 *   mode = "hozzaad"  → a meglévő tételek megmaradnak, az újak hozzáadódnak
 *                        (kód szerinti egyezésnél frissül az ár/megnevezés)
 */
export function bulkUpsertKatalogus(tulajdonosId, tetelek, mode = "csere", meta = {}) {
  createBackup("Díjtétel-katalógus import előtt");
  const all = loadKatalogus();
  const masok = all.filter(t => t.tulajdonosId !== tulajdonosId);
  const sajat = all.filter(t => t.tulajdonosId === tulajdonosId);

  const now = new Date().toISOString();
  const beerkezo = tetelek.map(t => ({
    ...DIJTETEL_KATALOGUS_TETEL_SCHEMA,
    ...t,
    id: `dkt_${crypto.randomUUID()}`,
    tulajdonosId,
    forras: "excelImport",
    importFileName: meta.fileName || "",
    createdAt: now,
    updatedAt: now,
  }));

  let ujSajat;
  if (mode === "hozzaad") {
    const beerkezoKodok = new Set(beerkezo.filter(t => t.kod).map(t => t.kod));
    const megtartott = sajat.filter(t => !t.kod || !beerkezoKodok.has(t.kod));
    ujSajat = [...megtartott, ...beerkezo];
  } else {
    ujSajat = beerkezo;
  }

  saveKatalogus([...masok, ...ujSajat]);
  return ujSajat;
}

// ─── Green Home Technologies – kiinduló díjtábla (2026. július) ──────────
// Egyszeri, idempotens seed: az admin a felöltött "GH_alvallalkozoi_dijtabla"
// alapján kéri a szinkront. Ha a fővállalkozó már létezik, vagy ha valaki
// szándékosan törölte a seedet, nem íródik felül – ld. seedGreenHomeDijtabla().
import { loadFovallalkozok, createFovallalkozo } from "./fovallalkozo.service.js";

const GH_SEED_FLAG = "gh_dijtabla_seed_v1";

export const GH_DIJTABLA_SEED = [
  { kod: "A01", kategoria: "A) ALAPTELEPÍTÉS / KIVITELEZÉS", megnevezes: "Napelem kivitelezés – teljes anyagvásárlással", egyseg: "panel", ar: 17500, kmDij: true, megjegyzes: "Minimum 10 panel (alatta is a 10 paneles ár érvényes); 30 panel felett egyedi ár" },
  { kod: "A02", kategoria: "A) ALAPTELEPÍTÉS / KIVITELEZÉS", megnevezes: "Napelem kivitelezés – részleges anyagvásárlással", egyseg: "panel", ar: 17500, kmDij: true, megjegyzes: "Minimum 10 panel (alatta is a 10 paneles ár érvényes); 30 panel felett egyedi ár" },
  { kod: "A03", kategoria: "A) ALAPTELEPÍTÉS / KIVITELEZÉS", megnevezes: "Panelbővítés teljes anyagvásárlással (extra panel utólag)", egyseg: "panel", ar: 20000, kmDij: true, megjegyzes: "Minimum 6 panel (alatta is a 6 paneles ár érvényes); 30 panel felett egyedi ár" },
  { kod: "A04", kategoria: "A) ALAPTELEPÍTÉS / KIVITELEZÉS", megnevezes: "Rendszer rákötés / beüzemelés külön kiszállással", egyseg: "db", ar: 50000, kmDij: true, megjegyzes: "" },
  { kod: "A05", kategoria: "A) ALAPTELEPÍTÉS / KIVITELEZÉS", megnevezes: "Teljes rendszer felülvizsgálat 20 kW-ig", egyseg: "db", ar: 50000, kmDij: true, megjegyzes: "" },
  { kod: "A06", kategoria: "A) ALAPTELEPÍTÉS / KIVITELEZÉS", megnevezes: "Teljes rendszer felülvizsgálat 20–50 kW", egyseg: "db", ar: 95000, kmDij: true, megjegyzes: "" },

  { kod: "B01", kategoria: "B) INVERTER ÉS AKKUMULÁTOR", megnevezes: "Inverter csere (önállóan)", egyseg: "db", ar: 50000, kmDij: true, megjegyzes: "" },
  { kod: "B02", kategoria: "B) INVERTER ÉS AKKUMULÁTOR", megnevezes: "Inverter csere + akkumulátor beépítés + mérés", egyseg: "db", ar: 100000, kmDij: true, megjegyzes: "Mérő, LoRa vagy WiFi mérőeszköz nélkül" },
  { kod: "B03", kategoria: "B) INVERTER ÉS AKKUMULÁTOR", megnevezes: "Akkumulátor beépítés kivitelezéssel", egyseg: "db", ar: 20000, kmDij: false, megjegyzes: "Mérés nélkül" },
  { kod: "B04", kategoria: "B) INVERTER ÉS AKKUMULÁTOR", megnevezes: "Akkumulátor beépítés, bővítés vagy csere külön kiszállással", egyseg: "db", ar: 50000, kmDij: true, megjegyzes: "Mérés nélkül" },
  { kod: "B05", kategoria: "B) INVERTER ÉS AKKUMULÁTOR", megnevezes: "Akkumulátor paraméter-konfigurálás", egyseg: "db", ar: 30000, kmDij: true, megjegyzes: "" },

  { kod: "C01", kategoria: "C) MÉRÉS ÉS CSATLAKOZÁS", megnevezes: "Smart meter beépítés kivitelezéssel", egyseg: "db", ar: 20000, kmDij: false, megjegyzes: "A smart meter eszközt a Green Home biztosítja; a díj a beépítés munkadíja" },
  { kod: "C02", kategoria: "C) MÉRÉS ÉS CSATLAKOZÁS", megnevezes: "Smart meter beépítés külön kiszállással", egyseg: "db", ar: 50000, kmDij: true, megjegyzes: "A smart meter eszközt a Green Home biztosítja; a díj a beépítés munkadíja" },
  { kod: "C03", kategoria: "C) MÉRÉS ÉS CSATLAKOZÁS", megnevezes: "Vezeték nélküli mérés kialakítása", egyseg: "db", ar: 20000, kmDij: false, megjegyzes: "Az eszközöket (smart meter, vezeték nélküli mérő) a Green Home biztosítja; a díj a kialakítás munkadíja" },
  { kod: "C04", kategoria: "C) MÉRÉS ÉS CSATLAKOZÁS", megnevezes: "Vezeték nélküli mérés kialakítása külön kiszállással", egyseg: "db", ar: 50000, kmDij: true, megjegyzes: "Az eszközöket (smart meter, vezeték nélküli mérő) a Green Home biztosítja; a díj a kialakítás munkadíja" },
  { kod: "C05", kategoria: "C) MÉRÉS ÉS CSATLAKOZÁS", megnevezes: "Csatlakozási pont kialakítása (főelosztó átalakítás)", egyseg: "db", ar: 20000, kmDij: false, megjegyzes: "" },
  { kod: "C06", kategoria: "C) MÉRÉS ÉS CSATLAKOZÁS", megnevezes: "Csatlakozási pont kialakítása külön kiszállással", egyseg: "db", ar: 50000, kmDij: true, megjegyzes: "" },
  { kod: "C07", kategoria: "C) MÉRÉS ÉS CSATLAKOZÁS", megnevezes: "Mérési pont kialakítása (fogadódobozban)", egyseg: "db", ar: 20000, kmDij: false, megjegyzes: "" },
  { kod: "C08", kategoria: "C) MÉRÉS ÉS CSATLAKOZÁS", megnevezes: "Mérési pont kialakítása külön kiszállással", egyseg: "db", ar: 50000, kmDij: true, megjegyzes: "" },

  { kod: "D01", kategoria: "D) BACKUP RENDSZEREK", megnevezes: "Kis backup box (Deye / Anker / SigenSTOR)", egyseg: "db", ar: 20000, kmDij: false, megjegyzes: "" },
  { kod: "D02", kategoria: "D) BACKUP RENDSZEREK", megnevezes: "Kis backup box külön kiszállással", egyseg: "db", ar: 50000, kmDij: true, megjegyzes: "" },
  { kod: "D03", kategoria: "D) BACKUP RENDSZEREK", megnevezes: "Full backup kiépítés – Deye", egyseg: "db", ar: 100000, kmDij: true, megjegyzes: "Külön kiszállással; ha telepítés mellett, napon belül elkészül, a teljes díj jár, a km-díj nélkül" },
  { kod: "D04", kategoria: "D) BACKUP RENDSZEREK", megnevezes: "Full backup kiépítés – Huawei", egyseg: "db", ar: 100000, kmDij: true, megjegyzes: "Külön kiszállással; a külső eszközt nem tartalmazza" },
  { kod: "D05", kategoria: "D) BACKUP RENDSZEREK", megnevezes: "Full backup kiépítés – SolarEdge", egyseg: "db", ar: 100000, kmDij: true, megjegyzes: "Külön kiszállással; a külső eszközt nem tartalmazza" },
  { kod: "D06", kategoria: "D) BACKUP RENDSZEREK", megnevezes: "Full backup kiépítés – Sigen 1 fázis", egyseg: "db", ar: 100000, kmDij: true, megjegyzes: "Külön kiszállással; a külső eszközt nem tartalmazza" },
  { kod: "D07", kategoria: "D) BACKUP RENDSZEREK", megnevezes: "Full backup kiépítés – Sigen 3 fázis", egyseg: "db", ar: 100000, kmDij: true, megjegyzes: "Külön kiszállással; a külső eszközt nem tartalmazza" },

  { kod: "E01", kategoria: "E) EV TÖLTŐ", megnevezes: "EV töltő kiépítése (AC oldali bekötés, töltő nélkül)", egyseg: "db", ar: 20000, kmDij: false, megjegyzes: "A töltőt nem tartalmazza az ár; AC kábelt 5 méterig tartalmaz" },
  { kod: "E02", kategoria: "E) EV TÖLTŐ", megnevezes: "EV töltő kiépítése külön kiszállással", egyseg: "db", ar: 50000, kmDij: true, megjegyzes: "A töltőt nem tartalmazza az ár; AC kábelt 5 méterig tartalmaz" },
  { kod: "E03", kategoria: "E) EV TÖLTŐ", megnevezes: "EV töltő nyomvonal felár (5 m felett)", egyseg: "m", ar: 1000, kmDij: false, megjegyzes: "Méterenként, 5 m felett" },

  { kod: "J01", kategoria: "J) BONTÁS / LESZERELÉS", megnevezes: "Optimalizáló leszedés", egyseg: "panel", ar: 8000, kmDij: false, megjegyzes: "" },
  { kod: "J02", kategoria: "J) BONTÁS / LESZERELÉS", megnevezes: "Panel és tartó leszerelés", egyseg: "panel", ar: 17500, kmDij: false, megjegyzes: "" },
  { kod: "J03", kategoria: "J) BONTÁS / LESZERELÉS", megnevezes: "Inverter le- és visszaszerelése (épületszigeteléshez)", egyseg: "db", ar: 100000, kmDij: true, megjegyzes: "Két külön kiszállás (leszerelés, majd a szigetelés után visszaszerelés) – 2× kiszállási díj + munkadíj" },

  { kod: "K01", kategoria: "K) SUPPORT ÉS SZERVIZ", megnevezes: "Support munkadíj", egyseg: "óra", ar: 15500, kmDij: false, megjegyzes: "Óradíj" },
  { kod: "K02", kategoria: "K) SUPPORT ÉS SZERVIZ", megnevezes: "Support alap kiszállási díj", egyseg: "db", ar: 35500, kmDij: true, megjegyzes: "Minden kiszállás alapdíja; tartalmazza az első órát, utána minden megkezdett óra óradíjjal számolódik" },

  { kod: "L01", kategoria: "L) KISZÁLLÁSI DÍJAK", megnevezes: "Kiszállási díj – kivitelezési munkák", egyseg: "km", ar: 210, kmDij: false, megjegyzes: "" },
  { kod: "L02", kategoria: "L) KISZÁLLÁSI DÍJAK", megnevezes: "Kiszállási díj – support munkák", egyseg: "km", ar: 210, kmDij: false, megjegyzes: "" },

  { kod: "M01", kategoria: "M) EGYÉB", megnevezes: "Meghiúsult kivitelezés (ügyfél hibájából) – pótdíj", egyseg: "alkalom", ar: 150000, kmDij: true, megjegyzes: "Ha a kivitelezés az ügyfél hibájából hiúsul meg a helyszínen" },
];

/**
 * Idempotens seed: ha még nem futott le ezen a gépen/böngészőben, létrehozza
 * a "Green Home Technologies" fővállalkozót (ha még nincs ilyen nevű) és
 * betölti hozzá a fenti kiinduló díjtáblát. Csak EGYSZER fut le – utána a
 * felhasználó a Fővállalkozók oldalról bármikor frissítheti Excel-importtal
 * (ld. DijtablaImportPanel.jsx), a seed nem írja felül újra.
 */
export function seedGreenHomeDijtabla() {
  try {
    if (localStorage.getItem(GH_SEED_FLAG)) return null;
    localStorage.setItem(GH_SEED_FLAG, new Date().toISOString());

    const fvk = loadFovallalkozok();
    let gh = fvk.find(f => f.nev?.trim().toLowerCase() === "green home technologies");
    if (!gh) {
      gh = createFovallalkozo({
        nev: "Green Home Technologies",
        rovidites: "GH",
        aktiv: true,
        megjegyzes: "Alvállalkozói keretszerződés 2. sz. melléklete (tervezet) – 2026. július. A díjtétel-katalógus a Fővállalkozók oldalon frissíthető.",
      });
    }

    if (getKatalogusTetelek(gh.id).length === 0) {
      bulkUpsertKatalogus(gh.id, GH_DIJTABLA_SEED, "csere", { fileName: "GH_alvallalkozoi_dijtabla_20260730.xlsx" });
    }
    return gh;
  } catch (e) {
    console.warn("[dijtetelKatalogus] seedGreenHomeDijtabla hiba:", e);
    return null;
  }
}
