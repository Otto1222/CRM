/**
 * tigXlsxService.js
 * TIG (Teljesítési Igazolás) generálás Excel-sablonból – ugyanaz a szerep,
 * mint a tigDocxService.js-nek, csak fővállalkozók számára, akiknek a
 * valódi TIG-formátuma Excel (pl. Wagner-Solar "Kitöltőlap" + képletekkel
 * hivatkozó "NYOMTATHATÓ TIG" fül), nem Word.
 *
 * FONTOS: az Excel-sablonban NINCS docxtemplater-szerű {mező} csere.
 * Első nekifutásra ez fix CELLACÍMEKKEL (pl. "B10") volt megoldva – ez
 * kiderült, hogy törékeny: amint a felhasználó egy sort betesz/kivesz a
 * sablonban, minden alatta lévő adat rossz cellába kerül (pontosan ez
 * történt: egy beszúrt sor miatt az "Ügyfél neve" a szomszédos sorba
 * csúszott). Ehelyett most SZÖVEGES FELIRAT alapján keresi meg a cellát
 * (A oszlopban megkeresi pl. az "Ügyfél neve:" feliratot, és a MELLETTE
 * lévő cellába ír) – ez a sablon sorainak átrendezésekor is helyesen
 * működik, amíg a feliratok szövege nem változik.
 *   - fejléc-mezők (ügyfél/projekt/dátum/cím): FIX feliratszöveg, ld.
 *     FEJLEC_FELIRATOK lent – a Wagner-Solar minta alapján.
 *   - tétel-sorok: a katalógus-tétel MEGNEVEZÉSE alapján (ld.
 *     TETEL_NEV_TERKEPEK lent, fővállalkozónként, mert az árlista/
 *     tétel-szöveg fővállalkozónként eltér) – a mennyiség a felirat
 *     melletti cellába kerül, az egységár 2 oszloppal jobbra (a
 *     Wagner-Solar minta "Tétel / mennyiség / m.e. / egységár / összesen"
 *     oszlop-elrendezése).
 * A sablon egyéb képletei (pl. "NYOMTATHATÓ TIG" fül, összesítő sorok)
 * NEM kerülnek kiszámolásra itt – ExcelJS nem futtat képletmotort, de a
 * `fullCalcOnLoad` beállítás miatt Excelben/LibreOffice-ban megnyitva a
 * fájl automatikusan újraszámol, tehát a végeredmény helyesen jelenik meg.
 */
import ExcelJS from "exceljs";
import { getTigSablonMeta, getTigSablonBase64, tigProjektDatum } from "./tigDocxService.js";
import { getKatalogusTetelek } from "../modules/fovallalkozok/dijtetelKatalogus.service.js";
import { calcKmDijOsszeg } from "../modules/fovallalkozok/elszamolasiMotor.js";

export const TIG_XLSX_MUNKALAP = "Kitöltőlap";

// Fejléc-mezők felirat-szövege (A oszlop) – a Wagner-Solar minta alapján,
// mindenkire egyforma konvenció. A rendszer ezt keresi meg a sablonban, és
// a MELLETTE (jobbra) lévő cellába írja az adatot.
export const FEJLEC_FELIRATOK = {
  ugyfelNev:    "Ügyfél neve:",
  projektSzam:  "Projekt száma:",
  datum:        "Telepítés (befejezésének) napja:",
  iranyitoszam: "Telepítési irsz",
  varos:        "Telepítési város",
  cimMaradek:   "Telepítési címmaradék (utca, házszám..)",
};

// Tétel-sorok, fővállalkozónként: katalógus-tétel KÓDJA → a sablonban
// szereplő tétel-NÉV szövege (ez a fővállalkozó valódi Excel-sablonjának
// "Tétel" oszlopában szó szerint így szerepel). Ha az admin lecseréli a
// sablont egy máshogy megfogalmazott Excelre, ezt a táblát kell frissíteni
// (fejlesztői feladat, nem felhasználói beállítás).
const TETEL_NEV_TERKEPEK = {
  "wagner-solar": {
    N01: "Napelem építés/bontás", N02: "Napelem építés/bontás",
    N03: "Napelem építés/bontás", N04: "Napelem építés/bontás", // egy sor van rá, a helyes sávot a kosárban választja ki a felhasználó
    B06: "Inverter szerelés (AC és DC oldali bekötéssel, kulcsrakészen)",
    C09: "Okosmérő szerelés (bekötéssel)",
    B03: "Energiatároló szerelés (bekötéssel)",
    D01: "EPS/Backup doboz szerelés (bekötéssel)",
    E01: "Elektromos autótöltő szerelés (bekötéssel)",
    K03: "Egyéb munkák napidíja (villanyszerelő)",
    K04: "Egyéb munkák napidíja (ács/segéd)",
    J04: "Kivitelezéssel egybekötött napkollektor bontás",
    L03: "Kiszállási díj 50 km-es távolság felett",
    M02: "Állásidő",
  },
};

function tetelNevTerkep(fovallalkozoNev) {
  return TETEL_NEV_TERKEPEK[String(fovallalkozoNev || "").trim().toLowerCase()] || null;
}

function base64ToArrayBuffer(base64) {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  return bytes.buffer;
}

/** "6710 Szeged, Szérűskerti sor 7." → { irsz, varos, maradek } – legjobb
 * próbálkozás, nem kritikus ha nem illeszkedik (akkor a teljes cím a
 * "cimMaradek" cellába kerül). */
function bontsdCimet(cim) {
  const m = String(cim || "").match(/^(\d{4})\s+([^,]+),?\s*(.*)$/);
  if (m) return { irsz: m[1], varos: m[2].trim(), maradek: m[3].trim() };
  return { irsz: "", varos: "", maradek: cim || "" };
}

const normSzoveg = s => String(s ?? "").trim().toLowerCase();

/** Megkeresi az A oszlopban a megadott feliratot (pontos, whitespace-
 * toleráns egyezés), és visszaadja azt a cellát – a hívó a mellette lévő
 * (jobbra) cellába ír. Nem talál esetén null (nem dobunk hibát, csak
 * kihagyjuk azt a mezőt/tételt). */
function keresFeliratCella(ws, felirat, maxRow = 150) {
  const cel = normSzoveg(felirat);
  if (!cel) return null;
  for (let r = 1; r <= maxRow; r++) {
    const cell = ws.getCell(r, 1); // A oszlop
    if (normSzoveg(cell.value) === cel) return cell;
  }
  return null;
}

function irjFeliratMelle(ws, felirat, ertek) {
  if (ertek === undefined || ertek === null || ertek === "") return;
  const labelCell = keresFeliratCella(ws, felirat);
  if (!labelCell) return;
  ws.getCell(labelCell.row, labelCell.col + 1).value = ertek;
}

function irjTetelSort(ws, felirat, mennyiseg, egysegar) {
  const labelCell = keresFeliratCella(ws, felirat);
  if (!labelCell) return;
  ws.getCell(labelCell.row, labelCell.col + 1).value = Math.round(Number(mennyiseg) || 0); // mennyiség: közvetlenül a felirat mellett
  ws.getCell(labelCell.row, labelCell.col + 3).value = Math.round(Number(egysegar) || 0);  // egységár: 2 oszloppal arrébb (mennyiség/m.e./egységár)
}

/**
 * A projekt tétel-kosarát a fővállalkozóra vonatkozó tétel-név-térkép
 * alapján a sablonba írja. Ha ehhez a fővállalkozóhoz nincs ismert térkép,
 * nem ír be semmit (a fejléc-mezők akkor is kitöltődnek).
 */
function irdBeATeteleket(ws, projekt, fovallalkozo) {
  const penzugy = projekt?.penzugy || {};
  const kosar = penzugy.dijtablaTetelek || [];
  if (kosar.length === 0) return;

  const terkep = tetelNevTerkep(fovallalkozo?.nev);
  if (!terkep) return;

  const tulajdonosId = penzugy.fovallalkoziId;
  const katalogus = tulajdonosId ? getKatalogusTetelek(tulajdonosId) : [];
  const katalogusById = new Map(katalogus.map(t => [t.id, t]));

  kosar.forEach(t => {
    const kt = katalogusById.get(t.katalogusTetelId);
    const nev = kt?.kod && terkep[kt.kod];
    if (!nev) return;
    irjTetelSort(ws, nev, t.mennyiseg, t.egysegar);
  });

  // Küszöbös kiszállási díj – nem kosár-sor, hanem a kmMeta pillanatkép
  // alapján számolt, önálló tétel (ld. dijtablaBevetel.js / tigDocxService.js
  // buildTigTetelSorok – ugyanez a logika, hogy a két formátum ne térjen el).
  const kellKm = kosar.some(t => t.kmDij) && Number(penzugy.dijtablaKmDijFtKm) > 0;
  if (kellKm && penzugy.dijtablaKmTetelId) {
    const kmKt = katalogusById.get(penzugy.dijtablaKmTetelId);
    const nev = kmKt?.kod && terkep[kmKt.kod];
    if (nev) {
      const kuszob = Number(penzugy.dijtablaKmKuszobKm) || 0;
      const ftKm   = Number(penzugy.dijtablaKmDijFtKm) || 0;
      const { fizetendoKm } = calcKmDijOsszeg(penzugy.tavKm, kuszob, ftKm);
      irjTetelSort(ws, nev, fizetendoKm, ftKm);
    }
  }
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

  const ws = wb.getWorksheet(TIG_XLSX_MUNKALAP) || wb.worksheets[0];
  if (!ws) return { ok: false, error: "A sablonban nem található kitöltendő munkalap." };

  const cim = bontsdCimet(projekt?.telepitesiCim || projekt?.clientCim || "");
  irjFeliratMelle(ws, FEJLEC_FELIRATOK.ugyfelNev,   projekt?.clientNev || "");
  irjFeliratMelle(ws, FEJLEC_FELIRATOK.projektSzam, [projekt?.projektkod, projekt?.kulsoAzonosito].filter(Boolean).join(", "));
  const datumStr = tigProjektDatum(projekt);
  if (datumStr) {
    const d = new Date(datumStr);
    irjFeliratMelle(ws, FEJLEC_FELIRATOK.datum, isNaN(d) ? datumStr : d);
  }
  irjFeliratMelle(ws, FEJLEC_FELIRATOK.iranyitoszam, cim.irsz);
  irjFeliratMelle(ws, FEJLEC_FELIRATOK.varos,        cim.varos);
  irjFeliratMelle(ws, FEJLEC_FELIRATOK.cimMaradek,   cim.maradek);

  irdBeATeteleket(ws, projekt, fovallalkozo);

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
