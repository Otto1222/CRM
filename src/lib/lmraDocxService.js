/**
 * lmraDocxService.js
 * LMRA (Last Minute Risk Assessment) jegyzőkönyv Word (.docx) generálás –
 * docxtemplater + pizzip + docxtemplater-image-module-free (aláírás-képek
 * beillesztéséhez).
 *
 * Ugyanaz a minta, mint vbfDocxService.js / tigDocxService.js: Admin
 * feltölt egy Word sablont a {placeholder} címkékkel (Beállítások → LMRA
 * Sablon), a rendszer ezt tölti ki a kockázatértékelés adataival – a
 * végeredmény formázása/tagolása 1:1 a feltöltött sablonét követi.
 *
 * Ez váltja fel a korábbi lmraPdfMerge.js-t (koordináta-alapú PDF
 * kitöltés, pdf-lib) – az egységes, mindhárom kötelező dokumentumnál
 * (VBF/TIG/LMRA) azonos Word-sablonos módszer kedvéért.
 */
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import ImageModule from "docxtemplater-image-module-free";

const SABLON_LS_KEY = "lmra_docx_sablon_b64";

// ─── Sablon kezelés ──────────────────────────────────────────

export function hasLmraDocxSablon() {
  return !!localStorage.getItem(SABLON_LS_KEY);
}

export function saveLmraDocxSablon(base64) {
  localStorage.setItem(SABLON_LS_KEY, base64);
}

export function deleteLmraDocxSablon() {
  localStorage.removeItem(SABLON_LS_KEY);
}

export function getLmraDocxSablonMeta() {
  const b64 = localStorage.getItem(SABLON_LS_KEY);
  if (!b64) return null;
  return { kb: Math.round((b64.length * 3 / 4) / 1024) };
}

// ─── base64 segédek ──────────────────────────────────────────

function b64ToArrayBuffer(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function dataUriToArrayBuffer(dataUri) {
  if (!dataUri || typeof dataUri !== "string" || !dataUri.includes(",")) return null;
  return b64ToArrayBuffer(dataUri.split(",")[1]);
}

// ─── Adatmapping: LMRA rekord + munkalap → placeholder objektum ────

function buildData(rec, munkalap) {
  const fejlec = rec?.fejlec || {};

  const kockazatok = (rec?.kockazatok || [])
    .filter(k => k.kivalasztva)
    .map(k => ({
      szoveg:     k.szoveg || "",
      intezkedes: k.megelozoIntezkedes || "",
    }));

  // Csak a ténylegesen aláírt, aláírás-képpel rendelkező résztvevők –
  // a docxtemplater-image-module-free minden {%alairas} címkéhez valódi
  // képet vár, ne kelljen "üres kép" fallbackkal bajlódni.
  const resztvevok = (rec?.resztvevok || [])
    .filter(r => r.signed && r.signatureData)
    .map(r => ({
      nev:     r.nev || "",
      datum:   r.signedAt ? new Date(r.signedAt).toLocaleString("hu-HU") : "",
      alairas: r.signatureData,
    }));

  return {
    idopont:          fejlec.idopont || (rec?.createdAt ? new Date(rec.createdAt).toLocaleString("hu-HU") : ""),
    helyszin:         munkalap?.telepitesiCim || munkalap?.clientCim || "",
    munkavezeto:      fejlec.munkavezeto || "",
    elvegzett_munka:  fejlec.munka || munkalap?.dokumentumszam || "",
    lezarva:          rec?.lezarvaAt ? new Date(rec.lezarvaAt).toLocaleString("hu-HU") : "",
    kockazatok,
    kockazatok_szama: kockazatok.length,
    resztvevok,
    resztvevok_szama: resztvevok.length,
  };
}

// ─── Blob előállítás (letöltés NÉLKÜL) ─────────────────────────
//
// Ezt használja mind a kézi "LMRA letöltés" gomb (downloadLmraDocx, lásd
// lent), mind az automatikus, munkalap-státuszváltáskor induló generálás
// (ld. kotelezoDokumentumok.service.js) – KÖZÖS logika, nem duplikáljuk.

export function buildLmraDocxBlob(rec, munkalap) {
  const b64 = localStorage.getItem(SABLON_LS_KEY);
  if (!b64) return { ok: false, error: "Nincs LMRA Word sablon feltöltve (Beállítások → LMRA Sablon)." };

  try {
    const zip = new PizZip(new Uint8Array(b64ToArrayBuffer(b64)));
    const imageModule = new ImageModule({
      getImage: (tagValue) => dataUriToArrayBuffer(tagValue),
      getSize:  () => [160, 55],
    });
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: { start: "{", end: "}" },
      modules: [imageModule],
    });

    doc.render(buildData(rec, munkalap));

    const blob = doc.getZip().generate({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    const szam = (munkalap?.dokumentumszam || munkalap?.munkalapSzam || rec?.munkalapId || "ml")
      .toString().replace(/[^a-zA-Z0-9_\-]/g, "_");
    return { ok: true, blob, fajlnev: `LMRA_${szam}.docx` };
  } catch (err) {
    console.error("[lmraDocxService] buildLmraDocxBlob", err);
    const errors = err?.properties?.errors;
    const detail = errors?.length
      ? `A Word fájlban ismeretlen vagy rosszul írt mező: ${errors.map(e => e?.properties?.id || e?.message || "").filter(Boolean).join(", ")}`
      : (err?.message || String(err));
    return { ok: false, error: detail };
  }
}

// ─── Kézi letöltés gomb ─────────────────────────────────────────

export async function downloadLmraDocx(rec, munkalap, exportedBy) {
  const res = buildLmraDocxBlob(rec, munkalap);
  if (!res.ok) {
    alert(`LMRA generálás sikertelen:\n${res.error}`);
    return false;
  }

  const url = URL.createObjectURL(res.blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = res.fajlnev;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (exportedBy && rec?.munkalapId) {
    try {
      const { logLmraExport } = await import("./lmraData.service.js");
      logLmraExport(rec.munkalapId, exportedBy, res.fajlnev);
    } catch { /* naplózás sikertelen – ne blokkolja a letöltést */ }
  }
  return true;
}

// ─── Placeholder dokumentáció (Beállítások oldalhoz) ─────────

export const LMRA_PLACEHOLDER_DOCS = [
  {
    csoport: "Fejléc",
    mezok: [
      ["{idopont}",          "Időpont"],
      ["{helyszin}",         "Helyszín / telepítési cím"],
      ["{munkavezeto}",      "Munkavezető neve"],
      ["{elvegzett_munka}",  "Elvégzett munka leírása"],
      ["{lezarva}",          "Lezárás időpontja"],
    ],
  },
  {
    csoport: "Kockázatok – ismétlődő blokk",
    mezok: [
      ["{#kockazatok}{szoveg} – {intezkedes}{/kockazatok}", "Minden kiválasztott kockázat + megelőző intézkedés, soronként"],
      ["{kockazatok_szama}", "Kiválasztott kockázatok száma"],
    ],
  },
  {
    csoport: "Résztvevők / aláírások – ismétlődő blokk",
    mezok: [
      ["{#resztvevok}{nev} – {datum} {%alairas}{/resztvevok}", "Minden aláíró neve, dátuma és aláírás-képe (FIGYELEM: a kép címkéje % jellel kezdődik, ne { }-vel!)"],
      ["{resztvevok_szama}", "Aláírók száma"],
    ],
  },
];
