/**
 * tigXlsxService.js
 * TIG (Teljesítési Igazolás) generálás Excel-sablonból – ugyanaz a szerep,
 * mint a tigDocxService.js-nek, csak fővállalkozók számára, akiknek a
 * valódi TIG-formátuma Excel (pl. Wagner-Solar "Kitöltőlap" + képletekkel
 * hivatkozó "NYOMTATHATÓ TIG" fül), nem Word.
 *
 * FONTOS: az Excel-sablonban NINCS docxtemplater-szerű {mező} csere – a
 * kitöltés fix CELLACÍMEK alapján történik:
 *   - fejléc-mezők (ügyfél/projekt/dátum/cím): FIX, mindenkire egyforma
 *     konvenció (ld. FEJLEC_CELLAK lent) – nincs fővállalkozónkénti
 *     beállítás, hogy ne kelljen admin-oldalon cellacímeket megérteni és
 *     kitölteni. Amikor egy fővállalkozóhoz Excel TIG-sablont készítünk,
 *     ezt a fix elrendezést kell követni (ld. TigSablonUploader.jsx
 *     súgószövege) – ez a projekt/ügyfél adatai szempontjából egységes
 *     minden jövőbeli sablonnál, gyors és nem tévedhető el.
 *   - tétel-sorok: a fővállalkozónként eltérő árlista miatt EZ marad
 *     tételenként beállítható (ld. dijtetelKatalogus.schema.js
 *     tigCellaCim) – ide írja a mennyiséget, az egységárat pedig 2
 *     oszloppal jobbra (a Wagner-Solar minta "mennyiség / m.e. /
 *     egységár / összesen" oszlop-elrendezése).
 * A sablon egyéb képletei (pl. "NYOMTATHATÓ TIG" fül, összesítő sorok)
 * NEM kerülnek kiszámolásra itt – ExcelJS nem futtat képletmotort, de a
 * `fullCalcOnLoad` beállítás miatt Excelben/LibreOffice-ban megnyitva a
 * fájl automatikusan újraszámol, tehát a végeredmény helyesen jelenik meg.
 */
import ExcelJS from "exceljs";
import { getTigSablonMeta, getTigSablonBase64, tigProjektDatum } from "./tigDocxService.js";
import { getKatalogusTetelek } from "../modules/fovallalkozok/dijtetelKatalogus.service.js";
import { calcKmDijOsszeg } from "../modules/fovallalkozok/elszamolasiMotor.js";

// Fix, mindenkire egyforma fejléc-elrendezés (ld. Wagner-Solar_TIG.xlsx
// "Kitöltőlap" füle) – jövőbeli Excel TIG-sablonoknak ezt kell követniük.
export const TIG_XLSX_FEJLEC_KONVENCIO = {
  munkalap:     "Kitöltőlap",
  ugyfelNev:    "B10",
  projektSzam:  "B11",
  datum:        "B12",
  iranyitoszam: "B13",
  varos:        "B14",
  cimMaradek:   "B15",
};

function base64ToArrayBuffer(base64) {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  return bytes.buffer;
}

/** "6710 Szeged, Szérűskerti sor 7." → { irsz, varos, maradek } – legjobb
 * próbálkozás, nem kritikus ha nem illeszkedik (akkor a teljes cím a
 * "cimMaradek" cellába kerül, ha az be van állítva). */
function bontsdCimet(cim) {
  const m = String(cim || "").match(/^(\d{4})\s+([^,]+),?\s*(.*)$/);
  if (m) return { irsz: m[1], varos: m[2].trim(), maradek: m[3].trim() };
  return { irsz: "", varos: "", maradek: cim || "" };
}

function irjCellaba(ws, cellCim, ertek) {
  if (!cellCim || ertek === undefined || ertek === null || ertek === "") return;
  try { ws.getCell(cellCim).value = ertek; } catch { /* rossz cellacím – kihagyjuk, nem dobjuk el az egészet */ }
}

/**
 * A projekt tétel-kosarát a katalógus tigCellaCim-jei alapján a sablonba
 * írja: mennyiség a megadott cellába, egységár 2 oszloppal jobbra.
 */
function irdBeATeteleket(ws, projekt) {
  const penzugy = projekt?.penzugy || {};
  const kosar = penzugy.dijtablaTetelek || [];
  if (kosar.length === 0) return;

  const tulajdonosId = penzugy.fovallalkoziId;
  const katalogus = tulajdonosId ? getKatalogusTetelek(tulajdonosId) : [];
  const katalogusById = new Map(katalogus.map(t => [t.id, t]));

  kosar.forEach(t => {
    const kt = katalogusById.get(t.katalogusTetelId);
    if (!kt?.tigCellaCim) return;
    irjMennyisegEsAr(ws, kt.tigCellaCim, t.mennyiseg, t.egysegar);
  });

  // Küszöbös kiszállási díj – nem kosár-sor, hanem a kmMeta pillanatkép
  // alapján számolt, önálló tétel (ld. dijtablaBevetel.js / tigDocxService.js
  // buildTigTetelSorok – ugyanez a logika, hogy a két formátum ne térjen el).
  const kellKm = kosar.some(t => t.kmDij) && Number(penzugy.dijtablaKmDijFtKm) > 0;
  if (kellKm && penzugy.dijtablaKmTetelId) {
    const kmKt = katalogusById.get(penzugy.dijtablaKmTetelId);
    if (kmKt?.tigCellaCim) {
      const kuszob = Number(penzugy.dijtablaKmKuszobKm) || 0;
      const ftKm   = Number(penzugy.dijtablaKmDijFtKm) || 0;
      const { fizetendoKm } = calcKmDijOsszeg(penzugy.tavKm, kuszob, ftKm);
      irjMennyisegEsAr(ws, kmKt.tigCellaCim, fizetendoKm, ftKm);
    }
  }
}

function irjMennyisegEsAr(ws, mennyisegCellCim, mennyiseg, egysegar) {
  try {
    const mCell = ws.getCell(mennyisegCellCim);
    mCell.value = Math.round(Number(mennyiseg) || 0);
    const arCell = ws.getCell(mCell.row, mCell.col + 2);
    arCell.value = Math.round(Number(egysegar) || 0);
  } catch { /* rossz cellacím a katalógustételen – kihagyjuk */ }
}

async function epitsdFelAWorkbookot(projekt, fovallalkozo) {
  const meta = getTigSablonMeta(fovallalkozo?.id);
  if (!meta || meta.fileType !== "xlsx") {
    return { ok: false, error: "Nincs Excel TIG sablon feltöltve ehhez a fővállalkozóhoz (Fővállalkozók oldal → TIG sablon)." };
  }
  const base64 = getTigSablonBase64(fovallalkozo.id);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(base64ToArrayBuffer(base64));
  wb.calcProperties.fullCalcOnLoad = true;

  const cellak = TIG_XLSX_FEJLEC_KONVENCIO;
  const ws = wb.getWorksheet(cellak.munkalap) || wb.worksheets[0];
  if (!ws) return { ok: false, error: "A sablonban nem található kitöltendő munkalap." };

  const cim = bontsdCimet(projekt?.telepitesiCim || projekt?.clientCim || "");
  irjCellaba(ws, cellak.ugyfelNev,   projekt?.clientNev || "");
  irjCellaba(ws, cellak.projektSzam, [projekt?.projektkod, projekt?.kulsoAzonosito].filter(Boolean).join(", "));
  const datumStr = tigProjektDatum(projekt);
  if (datumStr) {
    const d = new Date(datumStr);
    irjCellaba(ws, cellak.datum, isNaN(d) ? datumStr : d);
  }
  irjCellaba(ws, cellak.iranyitoszam, cim.irsz);
  irjCellaba(ws, cellak.varos,        cim.varos);
  irjCellaba(ws, cellak.cimMaradek,   cim.maradek);

  irdBeATeteleket(ws, projekt);

  return { ok: true, wb };
}

/** Blob előállítás letöltés/Drive-mentés nélkül (ld. tigDocxService.js
 * buildTigDocxBlob – ugyanaz a minta, hogy kotelezoDokumentumok.service.js
 * formátumtól függetlenül tudja hívni). */
export async function buildTigXlsxBlob(projekt, fovallalkozo) {
  const res = await epitsdFelAWorkbookot(projekt, fovallalkozo);
  if (!res.ok) return res;
  try {
    const buffer = await res.wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    return { ok: true, blob, fajlnev: `TIG_${projekt?.projektkod || projekt?.id || "projekt"}.xlsx` };
  } catch (err) {
    console.error("[tigXlsxService] buildTigXlsxBlob", err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/** Kézi letöltés gomb (TabPenzugy.jsx) – ld. tigDocxService.js
 * generateTigDocxEgyProjekt, ugyanaz a viselkedés Excel sablonnal. */
export async function generateTigXlsxEgyProjekt(projekt, fovallalkozo) {
  const res = await buildTigXlsxBlob(projekt, fovallalkozo);
  if (!res.ok) {
    alert(res.error || "TIG generálás sikertelen.");
    return false;
  }
  const url = URL.createObjectURL(res.blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = res.fajlnev;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
