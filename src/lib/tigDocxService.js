/**
 * tigDocxService.js
 * TIG (Teljesítési Igazolás) generálás – docxtemplater + pizzip, ugyanaz a
 * minta, mint a VBF Jegyzőkönyvnél (vbfDocxService.js), de FŐVÁLLALKOZÓNKÉNT
 * külön sablonnal, mert minden fővállalkozónak más a TIG táblázata, és van,
 * aki munkánként (projektenként), van, aki egy-egy időszakot összesítve kér
 * TIG-et (ld. fovallalkozo.schema.js tigMod mező).
 *
 * Két generálási mód, KÖZÖS táblázat-sor alakkal ({#tetelek}…{/tetelek}
 * loop a Word sablonban):
 *   - generateTigDocxEgyProjekt   – egy projekt tételei (munkánkénti TIG)
 *   - generateTigDocxIdoszaki     – több projekt tételei egy táblázatba
 *     fűzve, dátum/projekt/ügyfél oszloppal (időszaki összesített TIG)
 *
 * A tétel-sorok elsődlegesen a projekt díjtábla-tétel-kosarából jönnek
 * (penzugy.dijtablaTetelek – ld. DijtetelKosarPicker.jsx); ha a
 * fővállalkozóhoz nincs feltöltve díjtábla-katalógus (régi, szabály-alapú
 * elszámolás), a calcEsmentProjektPenzugy beveteliTetelek listájára esik
 * vissza, hogy TIG generálás akkor is működjön.
 */
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { calcEsmentProjektPenzugy } from "../services/workOrderFinancial.service.js";

export { readFileAsBase64 } from "./vbfDocxService.js";

const SABLONOK_LS_KEY = "tig_sablonok"; // { [tulajdonosId]: { base64, fileName, uploadedAt } }

// ─── Sablon kezelés – fővállalkozónkénti ──────────────────────

function loadSablonok() {
  try { return JSON.parse(localStorage.getItem(SABLONOK_LS_KEY) || "{}"); } catch { return {}; }
}

function saveSablonok(map) {
  localStorage.setItem(SABLONOK_LS_KEY, JSON.stringify(map));
  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: SABLONOK_LS_KEY } }));
}

export function hasTigSablon(tulajdonosId) {
  if (!tulajdonosId) return false;
  return !!loadSablonok()[tulajdonosId]?.base64;
}

export function saveTigSablon(tulajdonosId, base64, fileName) {
  const map = loadSablonok();
  map[tulajdonosId] = { base64, fileName: fileName || "", uploadedAt: new Date().toISOString() };
  saveSablonok(map);
}

export function deleteTigSablon(tulajdonosId) {
  const map = loadSablonok();
  delete map[tulajdonosId];
  saveSablonok(map);
}

export function getTigSablonMeta(tulajdonosId) {
  const s = loadSablonok()[tulajdonosId];
  if (!s?.base64) return null;
  return { fileName: s.fileName, uploadedAt: s.uploadedAt, kb: Math.round((s.base64.length * 3 / 4) / 1024) };
}

// ─── Projekt → TIG tétel-sorok ─────────────────────────────────

/** A projekt "elvégzés dátuma" – amivel az időszaki TIG szűr. */
export function tigProjektDatum(projekt) {
  return projekt?.valoBefejezes || projekt?.tervezettKezdes || projekt?.createdAt?.slice(0, 10) || "";
}

const ft0 = n => Math.round(Number(n) || 0);
const huFt = n => ft0(n).toLocaleString("hu-HU");

/**
 * Egy projekt tétel-sorai TIG táblázathoz. Elsődlegesen a díjtábla-kosárból
 * (pillanatkép, rögzített egységár), ha nincs kosár, a szabály-alapú
 * elszámolás beveteliTetelek listájából (fallback, hogy minden
 * fővállalkozóhoz működjön a TIG, nem csak a katalógusosokhoz).
 */
export function buildTigTetelSorok(projekt) {
  const kosar = projekt?.penzugy?.dijtablaTetelek || [];
  if (kosar.length > 0) {
    return kosar.map(t => ({
      kod:        t.kod || "",
      megnevezes: t.nev || "",
      mennyiseg:  ft0(t.mennyiseg),
      egyseg:     t.egyseg || "db",
      egysegar:   ft0(t.egysegar),
      osszesen:   ft0(t.osszesen),
    }));
  }
  try {
    const kalk = calcEsmentProjektPenzugy(projekt);
    return (kalk?.beveteliTetelek || []).map(t => ({
      kod:        "",
      megnevezes: t.megnevezes || "",
      mennyiseg:  1,
      egyseg:     "tétel",
      egysegar:   ft0(t.hasznalandoNetto ?? t.autoNetto),
      osszesen:   ft0(t.hasznalandoNetto ?? t.autoNetto),
    }));
  } catch {
    return [];
  }
}

// ─── Docxtemplater futtatás ─────────────────────────────────────
//
// renderToBlob: KÖZÖS mag – ezt használja a kézi letöltés
// (renderAndDownload) ÉS az automatikus, munkalap-státuszváltáskor
// induló generálás (ld. kotelezoDokumentumok.service.js), ami a blobot
// nem letölti, hanem a projekt Drive-mappájába menti.

function renderToBlob(base64, data) {
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

  const zip = new PizZip(bytes);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
  });
  doc.render(data);

  return doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function renderAndDownload(base64, data, fajlnev) {
  const blob = renderToBlob(base64, data);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fajlnev;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Blob előállítás letöltés nélkül – ugyanaz az adat-összeállítás, mint
 * generateTigDocxEgyProjekt-nél, csak nem tölti le, hanem visszaadja a
 * blobot + fájlnevet, hogy a hívó (automatikus generálás) elmenthesse
 * a Drive-ra.
 */
export function buildTigDocxBlob(projekt, fovallalkozo) {
  const meta = getTigSablonMeta(fovallalkozo?.id);
  if (!meta) return { ok: false, error: "Nincs TIG sablon feltöltve ehhez a fővállalkozóhoz (Fővállalkozók oldal → TIG sablon)." };

  const tetelek = buildTigTetelSorok(projekt);
  const osszesen = tetelek.reduce((s, t) => s + t.osszesen, 0);
  const data = {
    fovallalkozo_nev: fovallalkozo?.nev || "",
    ugyfel_nev:       projekt?.clientNev || "",
    ugyfel_cim:       projekt?.clientCim || "",
    telepitesi_cim:   projekt?.telepitesiCim || projekt?.clientCim || "",
    projekt_kod:      projekt?.projektkod || "",
    kulso_azonosito:  projekt?.kulsoAzonosito || "",
    datum:            tigProjektDatum(projekt) || new Date().toLocaleDateString("hu-HU"),
    tetelek:          tetelek.map(t => ({ ...t, egysegar: huFt(t.egysegar), osszesen: huFt(t.osszesen) })),
    osszesen:         huFt(osszesen),
  };

  try {
    const map = loadSablonok();
    const blob = renderToBlob(map[fovallalkozo.id].base64, data);
    return { ok: true, blob, fajlnev: `TIG_${projekt?.projektkod || projekt?.id || "projekt"}.docx` };
  } catch (err) {
    console.error("[tigDocxService] buildTigDocxBlob", err);
    const errors = err?.properties?.errors;
    const detail = errors?.length
      ? `A Word fájlban ismeretlen vagy rosszul írt mező: ${errors.map(e => e?.properties?.id || e?.message || "").filter(Boolean).join(", ")}`
      : (err?.message || String(err));
    return { ok: false, error: detail };
  }
}

function handleDocxHiba(err, cimke) {
  console.error(`[tigDocxService] ${cimke}`, err);
  const errors = err?.properties?.errors;
  if (errors?.length) {
    const lista = errors.map(e => e?.properties?.id || e?.message || "").filter(Boolean).join(", ");
    alert(`TIG sablon hiba!\n\nA Word fájlban ismeretlen vagy rosszul írt mező:\n${lista}\n\nEllenőrizd a sablonban lévő {mezőneveket}.`);
  } else {
    alert(`TIG generálás sikertelen:\n${err?.message || err}`);
  }
}

// ─── Munkánkénti TIG (egy projekt) ─────────────────────────────

export function generateTigDocxEgyProjekt(projekt, fovallalkozo) {
  const meta = getTigSablonMeta(fovallalkozo?.id);
  if (!meta) {
    alert("Nincs TIG sablon feltöltve ehhez a fővállalkozóhoz!\n\nLépés: Fővállalkozók oldal → TIG sablon feltöltése.");
    return false;
  }
  const tetelek = buildTigTetelSorok(projekt);
  const osszesen = tetelek.reduce((s, t) => s + t.osszesen, 0);

  const data = {
    fovallalkozo_nev: fovallalkozo?.nev || "",
    ugyfel_nev:       projekt?.clientNev || "",
    ugyfel_cim:       projekt?.clientCim || "",
    telepitesi_cim:   projekt?.telepitesiCim || projekt?.clientCim || "",
    projekt_kod:      projekt?.projektkod || "",
    kulso_azonosito:  projekt?.kulsoAzonosito || "",
    datum:            tigProjektDatum(projekt) || new Date().toLocaleDateString("hu-HU"),
    tetelek:          tetelek.map(t => ({ ...t, egysegar: huFt(t.egysegar), osszesen: huFt(t.osszesen) })),
    osszesen:         huFt(osszesen),
  };

  try {
    const map = loadSablonok();
    renderAndDownload(map[fovallalkozo.id].base64, data,
      `TIG_${projekt?.projektkod || projekt?.id || "projekt"}.docx`);
    return true;
  } catch (err) {
    handleDocxHiba(err, "generateTigDocxEgyProjekt");
    return false;
  }
}

// ─── Időszaki összesített TIG (több projekt) ───────────────────

/**
 * @param {object[]} projektek  – a kiválasztott időszakba eső, kipipált projektek
 * @param {object}   fovallalkozo
 * @param {string}   datumTol   – "YYYY-MM-DD"
 * @param {string}   datumIg    – "YYYY-MM-DD"
 */
export function generateTigDocxIdoszaki(projektek, fovallalkozo, datumTol, datumIg) {
  const meta = getTigSablonMeta(fovallalkozo?.id);
  if (!meta) {
    alert("Nincs TIG sablon feltöltve ehhez a fővállalkozóhoz!\n\nLépés: Fővállalkozók oldal → TIG sablon feltöltése.");
    return false;
  }

  const tetelek = [];
  for (const projekt of projektek) {
    const sorok = buildTigTetelSorok(projekt);
    sorok.forEach(t => tetelek.push({
      ...t,
      datum:      tigProjektDatum(projekt),
      projekt:    projekt.projektkod || "",
      ugyfel_nev: projekt.clientNev || "",
    }));
  }
  const osszesen = tetelek.reduce((s, t) => s + t.osszesen, 0);

  const data = {
    fovallalkozo_nev: fovallalkozo?.nev || "",
    datum_tol:        datumTol ? new Date(datumTol).toLocaleDateString("hu-HU") : "",
    datum_ig:         datumIg  ? new Date(datumIg).toLocaleDateString("hu-HU")  : "",
    projektek_szama:  projektek.length,
    tetelek:          tetelek.map(t => ({ ...t, egysegar: huFt(t.egysegar), osszesen: huFt(t.osszesen) })),
    osszesen:         huFt(osszesen),
  };

  try {
    const map = loadSablonok();
    const cimke = `${(datumTol || "").replaceAll("-", "")}_${(datumIg || "").replaceAll("-", "")}`;
    renderAndDownload(map[fovallalkozo.id].base64, data,
      `TIG_idoszaki_${fovallalkozo?.rovidites || fovallalkozo?.nev || "FV"}_${cimke}.docx`);
    return true;
  } catch (err) {
    handleDocxHiba(err, "generateTigDocxIdoszaki");
    return false;
  }
}

// ─── Placeholder dokumentáció (admin felületnek) ───────────────

export const TIG_PLACEHOLDER_DOCS_EGY_PROJEKT = [
  ["{fovallalkozo_nev}", "Fővállalkozó neve"],
  ["{ugyfel_nev}",       "Ügyfél neve"],
  ["{ugyfel_cim}",       "Ügyfél lakcíme"],
  ["{telepitesi_cim}",   "Telepítési cím"],
  ["{projekt_kod}",      "Projektkód"],
  ["{kulso_azonosito}",  "Külső / fővállalkozói azonosító"],
  ["{datum}",            "Munkavégzés dátuma"],
  ["{osszesen}",         "Végösszeg (nettó Ft)"],
  ["{#tetelek}…{/tetelek}", "Táblázat-ismétlés – táblázat során belül nyitva/zárva"],
  ["  {kod}",            "  – Tétel kódja (a táblázat-loopon belül)"],
  ["  {megnevezes}",     "  – Tétel megnevezése"],
  ["  {mennyiseg}",      "  – Mennyiség"],
  ["  {egyseg}",         "  – Egység"],
  ["  {egysegar}",       "  – Egységár (nettó Ft)"],
  ["  {osszesen}",       "  – Sor összesen (nettó Ft)"],
];

export const TIG_PLACEHOLDER_DOCS_IDOSZAKI = [
  ["{fovallalkozo_nev}", "Fővállalkozó neve"],
  ["{datum_tol}",        "Időszak kezdete"],
  ["{datum_ig}",         "Időszak vége"],
  ["{projektek_szama}",  "Az időszakba eső projektek száma"],
  ["{osszesen}",         "Végösszeg (nettó Ft, az összes projekt együtt)"],
  ["{#tetelek}…{/tetelek}", "Táblázat-ismétlés – minden projekt minden tétele, egy közös táblázatban"],
  ["  {datum}",          "  – A tétel projektjének dátuma"],
  ["  {projekt}",        "  – Projektkód"],
  ["  {ugyfel_nev}",     "  – Ügyfél neve"],
  ["  {kod}",            "  – Tétel kódja"],
  ["  {megnevezes}",     "  – Tétel megnevezése"],
  ["  {mennyiseg}",      "  – Mennyiség"],
  ["  {egyseg}",         "  – Egység"],
  ["  {egysegar}",       "  – Egységár (nettó Ft)"],
  ["  {osszesen}",       "  – Sor összesen (nettó Ft)"],
];
