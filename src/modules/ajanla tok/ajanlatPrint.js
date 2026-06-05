import { computeFoTetelek } from "./ajanlat.schema.js";

function ft(n) {
  return new Intl.NumberFormat("hu-HU").format(Math.round(n || 0)) + " Ft";
}

export function printAjanlat(ajanlat) {
  const { fo_tetelek = [], reszlet_tetelek = [], kivi_kalkulator = {}, afa_szazalek = 27 } = ajanlat;

  const computed = computeFoTetelek(fo_tetelek, reszlet_tetelek, kivi_kalkulator);
  const aktiv    = computed.filter(t => t.aktiv && t.netto_osszeg > 0);
  const netto    = aktiv.reduce((s, t) => s + t.netto_osszeg, 0);
  const afa      = netto * (Number(afa_szazalek) || 0) / 100;
  const brutto   = netto + afa;

  const sorok = aktiv.map((t, i) => `
    <tr>
      <td class="idx">${i + 1}.</td>
      <td class="nev">${t.label}</td>
      <td class="ar">${ft(t.netto_osszeg)}</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8"/>
<title>Árajánlat – ${ajanlat.ajanlatkod || ""}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Raleway:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'EB Garamond', 'Garamond', 'Times New Roman', Georgia, serif;
    font-size: 11.5pt;
    color: #1D1D1B;
    background: #fff;
  }
  .page { max-width: 780px; margin: 0 auto; padding: 40px 48px 36px; }

  /* ─── Fejléc ─── */
  .header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 18px; border-bottom: 3px solid #075E56; margin-bottom: 28px; }
  .edi-logo .name { font-family: 'Raleway', serif; font-size: 30pt; font-weight: 800; color: #075E56; letter-spacing: 4px; line-height: 1; }
  .edi-logo .tagline { font-family: 'Raleway', serif; font-size: 7.5pt; color: #18ACA0; letter-spacing: 2.5px; text-transform: uppercase; margin-top: 3px; }
  .header-right { text-align: right; font-size: 9pt; color: #3C3C3B; line-height: 1.7; }
  .header-right strong { color: #075E56; }

  /* ─── Dokumentum cím ─── */
  .doc-title { font-family: 'Raleway', serif; font-size: 20pt; font-weight: 700; color: #075E56; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 22px; }

  /* ─── Meta blokk ─── */
  .doc-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; margin-bottom: 28px; }
  .meta-group { }
  .meta-label { font-size: 8pt; color: #7BA8A3; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
  .meta-value { font-size: 12pt; font-weight: 600; color: #1D1D1B; }
  .meta-sub   { font-size: 10pt; color: #3C3C3B; line-height: 1.6; }
  .meta-right { text-align: right; }
  .meta-code  { font-size: 13pt; font-weight: 700; color: #18ACA0; }

  /* ─── Tétel táblázat ─── */
  table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
  thead tr { background: #075E56; }
  thead th { padding: 9px 12px; color: #fff; font-size: 9pt; font-weight: 600; letter-spacing: 0.5px; }
  thead th.idx { width: 36px; text-align: center; }
  thead th.nev { text-align: left; }
  thead th.ar  { text-align: right; width: 160px; }
  tbody tr { border-bottom: 1px solid #D0E8E6; }
  tbody tr:nth-child(even) { background: #F2F8F7; }
  tbody td { padding: 9px 12px; vertical-align: top; }
  tbody td.idx { text-align: center; color: #7BA8A3; font-size: 10pt; }
  tbody td.nev { font-size: 11.5pt; }
  tbody td.ar  { text-align: right; font-weight: 600; white-space: nowrap; }

  /* ─── Összesítő ─── */
  .summary { margin-top: 0; border-top: none; }
  .summary tr td { padding: 7px 12px; }
  .summary tr td:first-child { text-align: right; font-size: 10.5pt; color: #3C3C3B; padding-right: 16px; }
  .summary tr td:last-child  { text-align: right; width: 160px; white-space: nowrap; }
  .row-netto td { border-top: 2px solid #D0E8E6; font-size: 11pt; font-weight: 600; padding-top: 12px !important; }
  .row-afa td   { color: #3C3C3B; font-size: 10pt; }
  .row-brutto td { border-top: 3px solid #075E56; font-size: 14pt; font-weight: 700; color: #075E56; padding-top: 10px !important; padding-bottom: 10px !important; }

  /* ─── Érvényesség + Megjegyzés ─── */
  .validity { margin-top: 24px; background: #E3F5F4; border: 1px solid #18ACA0; border-radius: 4px; padding: 10px 16px; font-size: 10pt; color: #075E56; text-align: center; }
  .note-box { margin-top: 18px; border-left: 4px solid #18ACA0; border: 1px solid #D0E8E6; border-left: 4px solid #18ACA0; padding: 12px 16px; border-radius: 2px; font-size: 10pt; color: #3C3C3B; line-height: 1.6; }
  .note-box strong { color: #075E56; }

  /* ─── Lábléc ─── */
  .footer { margin-top: 40px; border-top: 2px solid #D0E8E6; padding-top: 14px; display: flex; justify-content: space-between; font-size: 8.5pt; color: #7BA8A3; }

  /* ─── Aláírás ─── */
  .sign-row { display: flex; justify-content: flex-end; margin-top: 48px; gap: 64px; }
  .sign-box { text-align: center; min-width: 160px; }
  .sign-line { border-top: 1px solid #1D1D1B; padding-top: 6px; font-size: 9pt; color: #3C3C3B; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 20px 24px; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- ── Fejléc ── -->
  <div class="header">
    <div class="edi-logo">
      <div class="name">E.D.I.</div>
      <div class="tagline">Solutions Kft. &bull; Electronic &bull; Development &bull; Innovations</div>
    </div>
    <div class="header-right">
      <strong>E.D.I. Solutions Kft.</strong><br/>
      6724 Szeged, Kossuth Lajos sgt. 72/b<br/>
      +36 20 237 7661 &bull; titkarsag@edisolutions.hu<br/>
      Adószám: 26740122-2-06 &bull; Cégjsz: 06-09-025279
    </div>
  </div>

  <!-- ── Cím ── -->
  <div class="doc-title">Árajánlat</div>

  <!-- ── Meta ── -->
  <div class="doc-meta">
    <div class="meta-group">
      <div class="meta-label">Megrendelő</div>
      <div class="meta-value">${escHtml(ajanlat.clientNev || "—")}</div>
      ${ajanlat.clientCim   ? `<div class="meta-sub">${escHtml(ajanlat.clientCim)}</div>` : ""}
      ${ajanlat.clientTel   ? `<div class="meta-sub">${escHtml(ajanlat.clientTel)}</div>` : ""}
      ${ajanlat.clientEmail ? `<div class="meta-sub">${escHtml(ajanlat.clientEmail)}</div>` : ""}
    </div>
    <div class="meta-group meta-right">
      <div class="meta-label">Ajánlat száma</div>
      <div class="meta-code">${escHtml(ajanlat.ajanlatkod || "—")}</div>
      <div style="margin-top:10px">
        <div class="meta-label">Kelt</div>
        <div class="meta-value">${escHtml(ajanlat.createdAt || new Date().toISOString().slice(0,10))}</div>
      </div>
      ${ajanlat.keszitette ? `<div style="margin-top:6px"><div class="meta-label">Készítette</div><div class="meta-sub">${escHtml(ajanlat.keszitette)}</div></div>` : ""}
    </div>
  </div>

  <!-- ── Tárgy ── -->
  ${ajanlat.nev ? `<p style="font-size:11pt;color:#3C3C3B;margin-bottom:20px;font-style:italic;">Tárgy: ${escHtml(ajanlat.nev)}</p>` : ""}

  <!-- ── Tétel táblázat ── -->
  <table>
    <thead>
      <tr>
        <th class="idx">#</th>
        <th class="nev">Megnevezés</th>
        <th class="ar">Nettó összeg</th>
      </tr>
    </thead>
    <tbody>${sorok}</tbody>
  </table>

  <!-- ── Összesítő ── -->
  <table class="summary">
    <tr class="row-netto">
      <td>Összesen nettó:</td>
      <td>${ft(netto)}</td>
    </tr>
    <tr class="row-afa">
      <td>ÁFA (${afa_szazalek}%):</td>
      <td>${ft(afa)}</td>
    </tr>
    <tr class="row-brutto">
      <td>Összesen bruttó:</td>
      <td>${ft(brutto)}</td>
    </tr>
  </table>

  <!-- ── Érvényesség ── -->
  ${ajanlat.ervenyesseg ? `<div class="validity">Az ajánlat érvényes <strong>${escHtml(ajanlat.ervenyesseg)}</strong>-ig</div>` : ""}

  <!-- ── Megjegyzés ── -->
  ${ajanlat.megjegyzes ? `<div class="note-box"><strong>Megjegyzés:</strong><br/>${escHtml(ajanlat.megjegyzes).replace(/\n/g,"<br/>")}</div>` : ""}

  <!-- ── Aláírás ── -->
  <div class="sign-row">
    <div class="sign-box">
      <div class="sign-line">Megrendelő aláírása</div>
    </div>
    <div class="sign-box">
      <div class="sign-line">E.D.I. Solutions Kft.</div>
    </div>
  </div>

  <!-- ── Lábléc ── -->
  <div class="footer">
    <div>E.D.I. Solutions Kft. &bull; 6724 Szeged, Kossuth Lajos sgt. 72/b &bull; Adószám: 26740122-2-06</div>
    <div>www.edikamera.hu</div>
  </div>

</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=900,height=750,scrollbars=yes");
  if (!win) { alert("Engedélyezd az ablak nyitást a böngészőben!"); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
