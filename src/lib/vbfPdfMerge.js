/**
 * vbfPdfMerge.js
 *
 * VBF PDF generálás – feltöltött sablon + kitöltött mérési adatok (pdf-lib).
 *
 * Eredmény: egyetlen .pdf fájl, amely tartalmazza:
 *   • Az Admin által feltöltött VBF Word sablon HELYETT a feltöltött PDF sablont
 *     (ha van PDF VBF sablon: `vbf_pdf_sablon_b64`)
 *   • + egy utolsó „VBF Mérési adatok" oldal minden mért értékkel
 *
 * Megjegyzés: a VBF Word sablon (docxtemplater) a SZÖVEGMEZŐS feltöltési mód.
 * Ez a modul a PDF alapú sablonhoz való alternatíva.
 * Ha nincs PDF sablon feltöltve, csak az adatoldalt generálja.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const VBF_PDF_SABLON_KEY = "vbf_pdf_sablon_b64";

// ─── Sablon kezelés ──────────────────────────────────────────

export function hasVbfPdfSablon() {
  return !!localStorage.getItem(VBF_PDF_SABLON_KEY);
}

export function saveVbfPdfSablon(base64) {
  localStorage.setItem(VBF_PDF_SABLON_KEY, base64);
}

export function deleteVbfPdfSablon() {
  localStorage.removeItem(VBF_PDF_SABLON_KEY);
}

export function getVbfPdfSablonMeta() {
  const b64 = localStorage.getItem(VBF_PDF_SABLON_KEY);
  if (!b64) return null;
  return { kb: Math.round((b64.length * 3 / 4) / 1024) };
}

// ─── Segédek ─────────────────────────────────────────────────

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// ő/ű → ö/ü (pdf-lib standard fontok Latin-1 korlát)
function s(text) {
  return String(text || "")
    .replace(/ő/g, "ö").replace(/Ő/g, "Ö")
    .replace(/ű/g, "ü").replace(/Ű/g, "Ü");
}

// VBF mező csoportok (VbfJegyzokonyv flat-key sémával egyező)
const VBF_GROUPS = [
  { label:"AC feszultseg (V)",            items:[{key:"ac_l1",label:"L1"},{key:"ac_l2",label:"L2"},{key:"ac_l3",label:"L3"}] },
  { label:"Kismegszakito inverternel (A)", items:[{key:"ki_l1",label:"L1"},{key:"ki_l2",label:"L2"},{key:"ki_l3",label:"L3"}] },
  { label:"Kismegszakito merohely (A)",    items:[{key:"km_l1",label:"L1"},{key:"km_l2",label:"L2"},{key:"km_l3",label:"L3"}] },
  { label:"Panelszam (db)",               items:[{key:"ps_st1",label:"ST1"},{key:"ps_st2",label:"ST2"},{key:"ps_st3",label:"ST3"},{key:"ps_st4",label:"ST4"},{key:"ps_st5",label:"ST5"},{key:"ps_st6",label:"ST6"}] },
  { label:"DC feszultseg (V)",            items:[{key:"dc_st1",label:"ST1"},{key:"dc_st2",label:"ST2"},{key:"dc_st3",label:"ST3"},{key:"dc_st4",label:"ST4"},{key:"dc_st5",label:"ST5"},{key:"dc_st6",label:"ST6"}] },
  { label:"Hurokellenallas (MOhm)",       items:[{key:"hu_l1",label:"L1"},{key:"hu_l2",label:"L2"},{key:"hu_l3",label:"L3"}] },
];

const VBF_SINGLE = [
  {key:"smart_meter",       label:"Smart meter (DB)"},
  {key:"akku_db",           label:"AKKU (DB)"},
  {key:"dc_teljesitmeny",   label:"Betapalt DC teljesitmeny (Wp)"},
  {key:"panel_tipus",       label:"Panel tipusa"},
  {key:"panel_voc",         label:"Panel Voc (V)"},
  {key:"panel_vmp",         label:"Panel Vmp (V)"},
  {key:"panel_imp",         label:"Panel Imp (A)"},
  {key:"panel_isc",         label:"Panel Isc (A)"},
  {key:"panel_telj",        label:"Panel teljesitmeny (Wp)"},
  {key:"inv_nevleges",      label:"Inverter nevleges (kVA)"},
  {key:"epulet_alapfoldes", label:"Epulet alapfoldes (Ohm)"},
  {key:"tuz_megszakito",    label:"Tuzeseti megszakito (A)"},
];

// ─── Adatoldal ───────────────────────────────────────────────

async function appendVbfDataPage(pdfDoc, munkalap, projekt, vbf) {
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const W = 595, H = 842, ML = 40, MR = 40;
  const page = pdfDoc.addPage([W, H]);
  let y = H - 38;

  function text(str, x, yPos, size = 9, bold = false, color = rgb(0.1, 0.1, 0.1)) {
    try { page.drawText(s(str), { x, y: yPos, size, font: bold ? fontBold : font, color, maxWidth: W - ML - MR }); } catch {}
  }

  function hLine(yPos) {
    page.drawLine({ start: { x: ML, y: yPos }, end: { x: W - MR, y: yPos }, thickness: 0.7, color: rgb(0.75, 0.75, 0.75) });
  }

  // Fejléc
  text("VBF Villamos Biztonsagi Felulvizsgalati Jegyzokonyv – Mert adatok", ML, y, 12, true, rgb(0.12, 0.23, 0.36));
  y -= 14; text("Kitoltott adatok", ML, y, 9, false, rgb(0.5, 0.5, 0.5));
  y -= 10; hLine(y); y -= 13;

  // Ügyfél / munkaszám
  const ml = munkalap || {};
  const pr = projekt || {};
  const infoRows = [
    ["Munkaszam:",      ml.dokumentumszam || ml.munkalapSzam || ml.ediSorszam || ""],
    ["Ugyfel:",         ml.clientNev || pr.clientNev || ""],
    ["Telepitesi cim:", ml.telepitesiCim || ml.clientCim || pr.telepitesiCim || ""],
    ["Szerelok:",       ml.assigneeNev || ml.csapatNev || pr.csapatNev || ""],
    ["Datum:",          ml.date || new Date().toLocaleDateString("hu-HU")],
  ];
  for (const [label, val] of infoRows) {
    text(label, ML, y, 9, true); text(val, ML + 110, y, 9); y -= 13;
  }
  y -= 5; hLine(y); y -= 13;

  // Csoportos mezők
  for (const group of VBF_GROUPS) {
    if (y < 80) break;
    text(group.label + ":", ML, y, 9, true, rgb(0.12, 0.23, 0.36));
    y -= 13;

    let x = ML + 10;
    for (const item of group.items) {
      const val = vbf?.[item.key];
      const ok  = val !== "" && val !== null && val !== undefined;
      const cell = `${item.label}: ${ok ? val : "—"}`;
      text(cell, x, y, 9, false, ok ? rgb(0.1, 0.1, 0.1) : rgb(0.65, 0.65, 0.65));
      x += 75;
      if (x > W - MR - 60) { x = ML + 10; y -= 12; }
    }
    if (x > ML + 10) y -= 12;
    y -= 4;
  }

  hLine(y); y -= 13;

  // Egyedi mezők – 2 oszlopos rács
  text("Egyedi adatok:", ML, y, 9, true, rgb(0.12, 0.23, 0.36)); y -= 13;

  let col = 0;
  for (const { key, label } of VBF_SINGLE) {
    if (y < 80) break;
    const val = vbf?.[key];
    const ok  = val !== "" && val !== null && val !== undefined;
    const xPos = col === 0 ? ML + 10 : ML + 270;
    text(`${label}:`, xPos, y, 8, true);
    text(ok ? String(val) : "—", xPos + 130, y, 8, false, ok ? rgb(0.1,0.1,0.1) : rgb(0.65,0.65,0.65));
    col++;
    if (col === 2) { col = 0; y -= 13; }
  }
  if (col !== 0) y -= 13;

  // Lábléc
  text(`VBF adatlap · ${new Date().toLocaleString("hu-HU")} · E.D.I. Solutions Kft.`, ML, 22, 7, false, rgb(0.55,0.55,0.55));
}

// ─── Fő generáló függvény ─────────────────────────────────────

export async function generateVbfMergedPdf(munkalap, projekt, vbf) {
  let pdfDoc;

  const templateB64 = localStorage.getItem(VBF_PDF_SABLON_KEY);
  if (templateB64) {
    try {
      pdfDoc = await PDFDocument.load(b64ToBytes(templateB64), { ignoreEncryption: true });
    } catch {
      pdfDoc = await PDFDocument.create();
    }
  } else {
    pdfDoc = await PDFDocument.create();
  }

  await appendVbfDataPage(pdfDoc, munkalap, projekt, vbf);
  return pdfDoc.save();
}

// ─── Letöltés ────────────────────────────────────────────────

export async function downloadVbfPdf(munkalap, projekt, vbf) {
  try {
    const pdfBytes = await generateVbfMergedPdf(munkalap, projekt, vbf);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    const szam = (munkalap?.dokumentumszam || munkalap?.ediSorszam || munkalap?.id || "vbf")
      .replace(/[^a-zA-Z0-9_\-]/g, "_");
    a.download = `VBF_${szam}_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error("[vbfPdfMerge]", err);
    alert(`VBF PDF generálás sikertelen:\n${err?.message || err}`);
    return false;
  }
}
