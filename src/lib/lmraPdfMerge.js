/**
 * lmraPdfMerge.js
 *
 * LMRA PDF generálás – feltöltött sablon + kitöltött adatok (pdf-lib).
 *
 * Eredmény: egyetlen .pdf fájl, amely tartalmazza:
 *   • Az Admin által feltöltött LMRA sablont (minden oldala, változatlanul)
 *   • + egy utolsó „Kitöltött adatok" oldalt a fejléccel, kockázatokkal
 *     és minden résztvevő aláírásával
 *
 * Ha nincs feltöltött sablon, csak az adatoldalt generálja le.
 */

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getPdfSablon, hasPdfSablon } from "./lmraService";
import { logLmraExport } from "./lmraData.service";

// ─── Segédek ─────────────────────────────────────────────────

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// pdf-lib standard fontjai Latin-1 készletet támogatnak – ő/ű helyett ö/ü
function s(text) {
  return String(text || "")
    .replace(/ő/g, "ö").replace(/Ő/g, "Ö")
    .replace(/ű/g, "ü").replace(/Ű/g, "Ü");
}

// ─── Adatoldal hozzáfűzése ────────────────────────────────────

async function appendDataPage(pdfDoc, rec, munkalap) {
  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const W = 595, H = 842;
  const ML = 40, MR = 40;
  const usable = W - ML - MR;

  const page = pdfDoc.addPage([W, H]);
  let y = H - 38;

  function text(str, x, yPos, size = 9, bold = false, color = rgb(0.1, 0.1, 0.1)) {
    try {
      page.drawText(s(str), {
        x, y: yPos, size, font: bold ? fontBold : font, color, maxWidth: usable,
      });
    } catch {}
  }

  function line(yPos, opacity = 0.25) {
    page.drawLine({
      start: { x: ML, y: yPos },
      end:   { x: W - MR, y: yPos },
      thickness: 0.8,
      color: rgb(0.6, 0.6, 0.6),
      opacity,
    });
  }

  // ── Fejléc ──
  text("LMRA – Munkavegzest megelozo kockazatertekeles", ML, y, 13, true, rgb(0.12, 0.23, 0.36));
  y -= 16;
  text("Kitoltott adatok", ML, y, 9, false, rgb(0.45, 0.45, 0.45));
  y -= 12;
  line(y); y -= 14;

  // ── Fejléc adatok ──
  const fejlec = rec?.fejlec || {};
  const rows = [
    ["Idopont:",      fejlec.idopont || (rec?.createdAt ? new Date(rec.createdAt).toLocaleString("hu-HU") : "")],
    ["Helyszin:",     munkalap?.telepitesiCim || munkalap?.clientCim || ""],
    ["Munkavezeto:",  fejlec.munkavezeto || ""],
    ["Elvegzett munka:", s(fejlec.munka || munkalap?.dokumentumszam || "")],
    ["Lezarva:",      rec?.lezarvaAt ? new Date(rec.lezarvaAt).toLocaleString("hu-HU") : ""],
  ];
  for (const [label, val] of rows) {
    text(label, ML, y, 9, true);
    text(val, ML + 110, y, 9);
    y -= 14;
  }
  y -= 6;
  line(y, 0.15); y -= 14;

  // ── Kockázatok ──
  const kivalasztott = (rec?.kockazatok || []).filter(k => k.kivalasztva);
  text(`Kivalasztott kockazatok (${kivalasztott.length} db):`, ML, y, 10, true, rgb(0.6, 0.1, 0.1));
  y -= 14;

  if (kivalasztott.length === 0) {
    text("Nincsenek kivalasztott kockazatok.", ML + 8, y, 9, false, rgb(0.5, 0.5, 0.5));
    y -= 14;
  } else {
    for (const k of kivalasztott) {
      if (y < 160) break;
      text(`• ${k.szoveg}`, ML + 8, y, 8);
      y -= 12;
      if (k.megelozoIntezkedes) {
        text(`  Intezkedes: ${k.megelozoIntezkedes}`, ML + 16, y, 8, false, rgb(0.55, 0.1, 0.1));
        y -= 12;
      }
    }
  }
  y -= 6;
  line(y, 0.15); y -= 14;

  // ── Aláírások ──
  const resztvevok = (rec?.resztvevok || []).filter(r => r.signed);
  text(`Resztvevok alairtasai (${resztvevok.length} fo):`, ML, y, 10, true, rgb(0.04, 0.47, 0.35));
  y -= 16;

  for (const r of resztvevok) {
    if (y < 80) break;

    // Névsor + dátum
    text(r.nev, ML, y, 10, true);
    if (r.signedAt) {
      text(new Date(r.signedAt).toLocaleString("hu-HU"), ML + 200, y, 8, false, rgb(0.5, 0.5, 0.5));
    }
    y -= 4;

    // Aláírás kép
    if (r.signatureData?.startsWith("data:image/png;base64,")) {
      try {
        const pngBytes = b64ToBytes(r.signatureData.split(",")[1]);
        const img      = await pdfDoc.embedPng(pngBytes);

        const imgW = 160, imgH = 50;
        if (y - imgH > 60) {
          page.drawImage(img, { x: ML, y: y - imgH, width: imgW, height: imgH });
        }
        y -= imgH + 6;
      } catch {
        y -= 30;
      }
    } else {
      // Aláírás vonal ha nincs kép
      line(y - 20, 0.3);
      y -= 28;
    }

    // Elválasztó vonal résztvevők között
    page.drawLine({
      start: { x: ML, y: y }, end: { x: ML + 300, y: y },
      thickness: 0.4, color: rgb(0.85, 0.85, 0.85),
    });
    y -= 10;
  }

  // ── Lábléc ──
  text(
    `Digitalis LMRA rekord · ${new Date().toLocaleString("hu-HU")} · E.D.I. Solutions Kft.`,
    ML, 22, 7, false, rgb(0.55, 0.55, 0.55)
  );
}

// ─── Fő generáló függvény ─────────────────────────────────────

export async function generateLmraMergedPdf(rec, munkalap) {
  let pdfDoc;

  if (hasPdfSablon()) {
    // Sablon betöltése + adatoldal hozzáfűzése
    try {
      const templateB64 = getPdfSablon();
      const templateBytes = b64ToBytes(templateB64);
      pdfDoc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
    } catch {
      // Titkosított vagy hibás PDF → üres dokumentum
      pdfDoc = await PDFDocument.create();
    }
  } else {
    pdfDoc = await PDFDocument.create();
  }

  await appendDataPage(pdfDoc, rec, munkalap);

  return pdfDoc.save();
}

// ─── Letöltés ────────────────────────────────────────────────

export async function downloadLmraPdf(rec, munkalap, exportedBy) {
  try {
    const pdfBytes = await generateLmraMergedPdf(rec, munkalap);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    const szam = (munkalap?.dokumentumszam || munkalap?.munkalapSzam || rec?.munkalapId || "lmra")
      .replace(/[^a-zA-Z0-9_\-]/g, "_");
    a.download = `LMRA_${szam}_${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (exportedBy && rec?.munkalapId) {
      logLmraExport(rec.munkalapId, exportedBy, a.download);
    }
    return true;
  } catch (err) {
    console.error("[lmraPdfMerge]", err);
    alert(`LMRA PDF generálás sikertelen:\n${err?.message || err}`);
    return false;
  }
}
