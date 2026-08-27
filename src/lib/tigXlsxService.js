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
import { karteritesOsszegProjekthez } from "./karterites.js";

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

// ─── Időszaki, összesített TIG (Green-Home-típus) ──────────────
//
// Ez a formátum gyökeresen más, mint a munkánkénti (Wagner-Solar): nem
// egy sablon projektenként, hanem egy folyamatosan bővülő táblázat, ahol
// minden sor egy elszámolt munka, a bevétel pedig 7 fix kategória-oszlopba
// van szétosztva (ld. Green-Home_TIG.xlsx "Részletek" füle). Minden
// generálás egy ÚJ, önálló fájlt ad (letöltés, nem Drive-mentés – ahogy a
// docx időszaki TIG is), a sablon fejléce alapján felépítve, a kiválasztott
// projektek friss adataival – a sablonban esetleg bennmaradt régi minta-
// sorokat NEM őrzi meg (törli), hogy ne keveredjen valós adattal.

const GH_MUNKALAP = "Részletek";
const GH_FEJLEC = {
  partner:        "Partner",
  cim:            "Telepítési cím",
  tipus:          "Típus",
  bizonylatszam:  "Bizonylatszám",
  teljesites:     "Teljesítés",
  elvegzettMunka: "Elvégzett munka",
  smartMeter:     "Smart meter (Ft)",
  akku:           "Akku (Ft)",
  panel:          "Panel (Ft)",
  kmDij:          "km díj (Ft)",
  kivitelezes:    "kivitelezési díj (Ft)",
  pluszKoltseg:   "plusz költség (Ft)",
  levonas:        "Levonás (Ft)",
  osszesen:       "Összesen (Ft)",
  megjegyzes:     "Megjegyzés",
};

// Melyik díjtétel-kód melyik oszlopba számít bele – a tétel MEGNEVEZÉSE
// alapján, jelentés szerint (ld. dijtetelKatalogus.service.js GH_DIJTABLA_
// SEED). Amit a szöveg egyértelműen "smart meter"/"mérés" (C-kategória) ír
// le → Smart meter; ami "akkumulátor" (B-kategória egy része) → Akku; a
// napelem-kivitelezés (A01-A03) → Panel; a per-km kiszállási tételek
// (L01-L02) → km díj; minden más kivitelezési munka (inverter, backup, EV
// töltő, bontás, support) → kivitelezési díj; az "M01 pótdíj" és bármilyen
// egyedi (nem katalógusból választott) tétel → plusz költség. A "Levonás"
// nem díjtételből jön, hanem az elfogadott kártérítésekből (ld. lent).
const GH_KATEGORIA_TERKEP = {
  A01: "panel", A02: "panel", A03: "panel",
  A04: "kivitelezes", A05: "kivitelezes", A06: "kivitelezes",
  B01: "kivitelezes",
  B02: "akku", B03: "akku", B04: "akku", B05: "akku",
  C01: "smartMeter", C02: "smartMeter", C03: "smartMeter", C04: "smartMeter",
  C05: "kivitelezes", C06: "kivitelezes",
  C07: "smartMeter", C08: "smartMeter",
  D01: "kivitelezes", D02: "kivitelezes", D03: "kivitelezes",
  D04: "kivitelezes", D05: "kivitelezes", D06: "kivitelezes", D07: "kivitelezes",
  E01: "kivitelezes", E02: "kivitelezes", E03: "kivitelezes",
  J01: "kivitelezes", J02: "kivitelezes", J03: "kivitelezes",
  K01: "kivitelezes", K02: "kivitelezes",
  L01: "kmDij", L02: "kmDij",
  M01: "pluszKoltseg",
};

function ghKategoria() {
  return GH_KATEGORIA_TERKEP;
}

/** A fejléc-sorban (1. sor) megkeresi az oszlop-feliratokat, és
 * { kulcs: oszlopIndex } térképet ad vissza. Nem talált feliratnál a
 * kulcs hiányzik a térképből (a hívó akkor kihagyja azt a mezőt). */
function epitsdFelOszlopTerkepet(ws) {
  const terkep = {};
  const maxCol = ws.columnCount || 30;
  Object.entries(GH_FEJLEC).forEach(([kulcs, felirat]) => {
    const cel = normSzoveg(felirat);
    for (let c = 1; c <= maxCol; c++) {
      if (normSzoveg(ws.getCell(1, c).value) === cel) { terkep[kulcs] = c; break; }
    }
  });
  return terkep;
}

/**
 * Egy projekt kategorizált bevétel-bontása a Green-Home oszlopokhoz.
 */
function ghProjektBontas(projekt) {
  const penzugy = projekt?.penzugy || {};
  const kosar = penzugy.dijtablaTetelek || [];
  const tulajdonosId = penzugy.fovallalkoziId;
  const katalogus = tulajdonosId ? getKatalogusTetelek(tulajdonosId) : [];
  const katalogusById = new Map(katalogus.map(t => [t.id, t]));
  const kategoriaTerkep = ghKategoria();

  const bontas = { smartMeter: 0, akku: 0, panel: 0, kmDij: 0, kivitelezes: 0, pluszKoltseg: 0 };

  kosar.forEach(t => {
    const kt = katalogusById.get(t.katalogusTetelId);
    const kulcs = kt?.kod ? (kategoriaTerkep[kt.kod] || "kivitelezes") : "pluszKoltseg"; // katalógusban nem található = egyedi tétel
    bontas[kulcs] += Number(t.osszesen) || 0;
  });

  const kellKm = kosar.some(t => t.kmDij) && Number(penzugy.dijtablaKmDijFtKm) > 0;
  if (kellKm) {
    const kuszob = Number(penzugy.dijtablaKmKuszobKm) || 0;
    const ftKm   = Number(penzugy.dijtablaKmDijFtKm) || 0;
    const { osszeg } = calcKmDijOsszeg(penzugy.tavKm, kuszob, ftKm);
    bontas.kmDij += osszeg;
  }

  const levonas = karteritesOsszegProjekthez(projekt.id, projekt.munkalapIds || []);
  const osszesen = bontas.smartMeter + bontas.akku + bontas.panel + bontas.kmDij
    + bontas.kivitelezes + bontas.pluszKoltseg - levonas;

  return { ...bontas, levonas, osszesen };
}

/**
 * Időszaki, összesített TIG Excel – a projektek listájából friss táblázatot
 * épít a sablon fejléce alapján (a sablonban esetleg bennmaradt régi
 * sorokat törli). Csak "green-home"-hoz van kategória-térkép; más "idoszaki"
 * módú fővállalkozónál (amíg nincs beállítva) hibaüzenetet ad.
 */
export async function buildTigXlsxIdoszaki(projektek, fovallalkozo, datumTol, datumIg) {
  const meta = getTigSablonMeta(fovallalkozo?.id);
  if (!meta || meta.fileType !== "xlsx") {
    return { ok: false, error: "Nincs Excel TIG sablon feltöltve ehhez a fővállalkozóhoz." };
  }
  const base64 = getTigSablonBase64(fovallalkozo.id);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(base64ToArrayBuffer(base64));
  wb.calcProperties.fullCalcOnLoad = true;

  const ws = wb.getWorksheet(GH_MUNKALAP) || wb.worksheets[0];
  if (!ws) return { ok: false, error: "A sablonban nem található kitöltendő munkalap." };
  tavolitsdElATablazatokat(ws);

  const oszlop = epitsdFelOszlopTerkepet(ws);
  if (!oszlop.osszesen) {
    return { ok: false, error: "A sablon fejlécében nem található a várt oszlop-feliratok mindegyike – ellenőrizd, hogy az 1. sor tartalmazza-e pl. az \"Összesen (Ft)\" feliratot." };
  }

  // Meglévő adatsorok törlése (a fejléc után) – ne keveredjen a sablonban
  // esetleg bennmaradt régi minta-adattal. FONTOS: `ws.addRow` mindig a
  // JELENLEGI sor-számláló UTÁN fűz be, tehát ha csak törölnénk (vagy
  // spliceRows-szal próbálnánk törölni – ami ebben a könyvtárverzióban
  // nem csökkenti a rowCount-ot), az új adatok a régi (üres) sorok ALÁ
  // kerülnének, üres sorokat hagyva közöttük. Ezért közvetlenül a 2.
  // sortól kezdve, sorszám szerint írjuk felül a cellákat.
  const maxCol = ws.columnCount || Math.max(...Object.values(oszlop));
  const eredetiSorszam = ws.rowCount;
  for (let r = 2; r <= eredetiSorszam; r++) {
    for (let c = 1; c <= maxCol; c++) ws.getCell(r, c).value = null;
  }

  let sorSzam = 2;
  let osszSum = 0;
  projektek.forEach(projekt => {
    const b = ghProjektBontas(projekt);
    osszSum += b.osszesen;
    const rowNum = sorSzam++;
    const irj = (kulcs, ertek) => {
      if (!oszlop[kulcs] || ertek === "" || ertek === undefined || ertek === null) return;
      ws.getCell(rowNum, oszlop[kulcs]).value = ertek;
    };
    irj("partner",        projekt.clientNev || "");
    irj("cim",            projekt.telepitesiCim || projekt.clientCim || "");
    irj("tipus",          "TIG");
    irj("bizonylatszam",  projekt.projektkod || "");
    const d = new Date(tigProjektDatum(projekt));
    irj("teljesites",     isNaN(d) ? "" : d);
    irj("elvegzettMunka", projekt.tipus || "Telepítés");
    irj("smartMeter",     Math.round(b.smartMeter) || "");
    irj("akku",           Math.round(b.akku) || "");
    irj("panel",          Math.round(b.panel) || "");
    irj("kmDij",          Math.round(b.kmDij) || "");
    irj("kivitelezes",    Math.round(b.kivitelezes) || "");
    irj("pluszKoltseg",   Math.round(b.pluszKoltseg) || "");
    irj("levonas",        Math.round(b.levonas) || "");
    irj("osszesen",       Math.round(b.osszesen));
    irj("megjegyzes",     `${projekt.projektkod || ""} munkalapjainak elszámolása`);
  });

  // Záró összesítő sor – csak az "Összesen" oszlopban (ld. Green-Home minta).
  ws.getCell(sorSzam, oszlop.osszesen).value = Math.round(osszSum);

  try {
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const fajlnev = `TIG_idoszaki_${fovallalkozo?.nev || "fovallalkozo"}_${datumTol || ""}_${datumIg || ""}.xlsx`.replace(/\s+/g, "_");
    return { ok: true, blob, fajlnev };
  } catch (err) {
    console.error("[tigXlsxService] buildTigXlsxIdoszaki", err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/** Kézi letöltés gomb (TigPage.jsx) – ld. tigDocxService.js
 * generateTigDocxIdoszaki, ugyanaz a viselkedés Excel sablonnal. */
export async function generateTigXlsxIdoszaki(projektek, fovallalkozo, datumTol, datumIg) {
  const res = await buildTigXlsxIdoszaki(projektek, fovallalkozo, datumTol, datumIg);
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

/**
 * Kiveszi a munkalapból az Excel "Táblázat" (structured Table) objektumo-
 * kat, ha vannak. Ok: a Green-Home_TIG.xlsx sablon "Részletek" fülén egy
 * ilyen Táblázat volt beszúrva (Beszúrás → Táblázat) – az ExcelJS csomag
 * (4.4.0) a beolvasás/mentés körben MEGRONGÁLJA ennek belső leírását
 * (totalsRowShown és headerRowCount ellentmondásba kerül a tényleges
 * cellatartalommal), ami miatt Excel megnyitáskor "tartalma hibás,
 * helyreállítsuk?" hibát dobott. Nekünk nincs szükségünk a Táblázat
 * funkcióra (szűrés/formázás) a generált fájlban, ezért egyszerűen
 * eltávolítjuk – ez megszünteti a hibát, sima cellatartalom marad.
 */
function tavolitsdElATablazatokat(ws) {
  Object.keys(ws.tables || {}).forEach(nev => {
    try { ws.removeTable(nev); } catch { /* nincs ilyen tábla / már eltávolítva */ }
  });
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
  tavolitsdElATablazatokat(ws);

  // Ha az "Ügyfél neve:" felirat sem található, ez nem munkánkénti
  // (Wagner-Solar-típusú) sablon – enélkül a fájl néma csendben üresen
  // generálódna (semmi sem illeszkedne), ami sokkal zavaróbb, mint egy
  // egyértelmű hibaüzenet. Ez tipikusan azt jelenti, hogy a fővállalkozó
  // valójában "Időszaki összesített" TIG-módú (ld. Fővállalkozók oldal),
  // és a TIG oldalról kellene generálni, nem a projekt Pénzügy füléről.
  if (!keresFeliratCella(ws, FEJLEC_FELIRATOK.ugyfelNev)) {
    return {
      ok: false,
      error: `A(z) "${fovallalkozo?.nev || ""}" sablonja nem munkánkénti (Wagner-Solar-típusú) szerkezetű – nem található benne az "${FEJLEC_FELIRATOK.ugyfelNev}" felirat. Ha ez a fővállalkozó időszaki, összesített TIG-et használ, a Fővállalkozók oldalon állítsd a TIG módot "Időszaki összesített"-re, és a TIG menüpontról generáld.`,
    };
  }

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
 * formátumtól függetlenül tudja hívni).
 *
 * Nem kell előre eldönteni/beállítani, hogy a fővállalkozó "munkánkénti"
 * vagy "időszaki" sablont használ – a rendszer megnézi a feltöltött Excel
 * TÉNYLEGES szerkezetét: ha megtalálja a munkánkénti (Wagner-Solar-
 * stílusú) "Ügyfél neve:" feliratot, azt a motort futtatja; ha nem (mert
 * a sablon egy Green-Home-stílusú, oszlopos gyűjtő-táblázat), automatikusan
 * átvált az időszaki motorra, és EGYETLEN projektből (a hívott projektből)
 * épít egy egysoros táblázatot. A fővállalkozó "TIG mód" beállítása így
 * csak azt dönti el, hogy a TIG oldal többprojektes választójában
 * megjelenjen-e – a generálás mindkét sablon-fajtával helyesen működik,
 * bármelyik felületről indítod. */
export async function buildTigXlsxBlob(projekt, fovallalkozo) {
  const res = await epitsdFelAWorkbookot(projekt, fovallalkozo);
  if (res.ok) {
    try {
      const buffer = await res.wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      return { ok: true, blob, fajlnev: `TIG_${projekt?.projektkod || projekt?.id || "projekt"}.xlsx` };
    } catch (err) {
      console.error("[tigXlsxService] buildTigXlsxBlob", err);
      return { ok: false, error: err?.message || String(err) };
    }
  }
  // Nem munkánkénti szerkezetű sablon – próbáljuk időszaki (gyűjtő-
  // táblázatos) motorral, csak ezzel az egy projekttel.
  const idoszakiRes = await buildTigXlsxIdoszaki([projekt], fovallalkozo);
  if (idoszakiRes.ok) return idoszakiRes;
  return res; // egyik motorral sem sikerült – az eredeti (munkánkénti) hibaüzenet informatívabb
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
