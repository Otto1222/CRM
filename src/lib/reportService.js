/**
 * reportService.js
 * Munkalap és Projekt riport generálás
 * Nyomtatható HTML → böngésző PDF
 * Fotók NINCSENEK benne, pénzügy IGEN
 */

import { calcMunkalapPenzugy, calcProjektPenzugy } from "./costEngine.js";
import { loadKarteritesek } from "./karterites.js";
import { ft } from "./helpers.js";

// ─── Adat betöltők ────────────────────────────────────────────

function loadVbf(munkalapId) {
  try { return JSON.parse(localStorage.getItem(`vbf_${munkalapId}`) || "null"); } catch { return null; }
}

function loadAnyagok(munkalapId) {
  try { return JSON.parse(localStorage.getItem(`felh_anyagok_${munkalapId}`) || "[]"); } catch { return []; }
}

function loadFelmeresAdat(munkalapId) {
  try { return JSON.parse(localStorage.getItem(`crm_ml_${munkalapId}_felm_adat`) || "null"); } catch { return null; }
}

function loadFelmeresNotes(munkalapId) {
  try { return JSON.parse(localStorage.getItem(`crm_ml_${munkalapId}_felm_notes`) || "{}"); } catch { return {}; }
}

// ─── HTML szekció építők ──────────────────────────────────────

function szekcio(cim, tartalom) {
  return `
    <div class="szekc">
      <h2>${cim}</h2>
      ${tartalom}
    </div>`;
}

function adatTabla(sorok) {
  const filtered = sorok.filter(([,v]) => v !== null && v !== undefined && v !== "" && v !== 0);
  if (!filtered.length) return '<p class="ures">Nincs adat</p>';
  return `<table class="adat-t">${filtered.map(([l,v]) =>
    `<tr><td class="l">${l}</td><td class="v">${v}</td></tr>`
  ).join("")}</table>`;
}

function html_anyagok(anyagok) {
  if (!anyagok?.length) return '<p class="ures">Nincs felhasznált anyag rögzítve</p>';
  return `<table class="anyag-t">
    <thead><tr><th>#</th><th>Megnevezés</th><th>Mennyiség</th><th>Sorozatszám</th></tr></thead>
    <tbody>${anyagok.map((a,i) => `
      <tr>
        <td>${i+1}</td>
        <td>${a.nev || a.name || "—"}</td>
        <td>${a.mennyiseg || a.qty || 1} ${a.egyseg || a.unit || "db"}</td>
        <td class="${a.sorozatszam ? "" : "ures"}">${a.sorozatszam || "—"}</td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

function html_vbf(vbf) {
  if (!vbf) return '<p class="ures">VBF Jegyzőkönyv nem elérhető</p>';
  const sections = [
    ["AC feszültség", [
      ["L1", vbf.acFeszultseg?.L1, "V"],
      ["L2", vbf.acFeszultseg?.L2, "V"],
      ["L3", vbf.acFeszultseg?.L3, "V"],
    ]],
    ["Kismegszakító inverternél", [
      ["L1", vbf.kismegsInverter?.L1, "A"],
      ["L2", vbf.kismegsInverter?.L2, "A"],
      ["L3", vbf.kismegsInverter?.L3, "A"],
    ]],
    ["Kismegszakító mérőhelynél", [
      ["L1", vbf.kismegsMero?.L1, "A"],
      ["L2", vbf.kismegsMero?.L2, "A"],
      ["L3", vbf.kismegsMero?.L3, "A"],
    ]],
    ["Panelszám stringenként", [
      ["ST1", vbf.panelszam?.ST1, "db"],
      ["ST2", vbf.panelszam?.ST2, "db"],
      ["ST3", vbf.panelszam?.ST3, "db"],
      ["ST4", vbf.panelszam?.ST4, "db"],
      ["ST5", vbf.panelszam?.ST5, "db"],
      ["ST6", vbf.panelszam?.ST6, "db"],
    ]],
    ["DC feszültség stringenként", [
      ["ST1", vbf.dcFeszultseg?.ST1, "V"],
      ["ST2", vbf.dcFeszultseg?.ST2, "V"],
      ["ST3", vbf.dcFeszultseg?.ST3, "V"],
      ["ST4", vbf.dcFeszultseg?.ST4, "V"],
      ["ST5", vbf.dcFeszultseg?.ST5, "V"],
      ["ST6", vbf.dcFeszultseg?.ST6, "V"],
    ]],
    ["Hurok ellenállás", [
      ["L1", vbf.hurokellenallas?.L1, "mΩ"],
      ["L2", vbf.hurokellenallas?.L2, "mΩ"],
      ["L3", vbf.hurokellenallas?.L3, "mΩ"],
    ]],
  ];
  const egyeb = [
    ["Smart mérő", vbf.smartMeter],
    ["Akkumulátor", vbf.akku],
    ["Betápált DC", vbf.betapaltDC],
    ["Panel típus", vbf.panelTipus],
    ["Panel Voc", vbf.panelVoc, "V"],
    ["Panel Vmp", vbf.panelVmp, "V"],
    ["Panel Imp", vbf.panelImp, "A"],
    ["Panel Isc", vbf.panelIsc, "A"],
    ["Panel teljesítmény", vbf.panelTelj, "W"],
    ["Inverter névleges", vbf.inverterNevleges, "kW"],
    ["Tűzmegszakító", vbf.tuzMegszakito],
  ].filter(([,v]) => v);

  return sections.map(([cim, sorok]) => {
    const vanAdat = sorok.some(([,v]) => v);
    if (!vanAdat) return "";
    return `<div class="vbf-blokk">
      <p class="vbf-cim">${cim}</p>
      <table class="vbf-t"><thead><tr>
        ${sorok.map(([l]) => `<th>${l}</th>`).join("")}
      </tr></thead><tbody><tr>
        ${sorok.map(([,v,u]) => `<td>${v || "—"}${u && v ? ` <span class="unit">${u}</span>` : ""}</td>`).join("")}
      </tr></tbody></table>
    </div>`;
  }).join("") + (egyeb.length ? `<table class="adat-t">${egyeb.map(([l,v,u]) =>
    `<tr><td class="l">${l}</td><td class="v">${v}${u ? ` ${u}` : ""}</td></tr>`
  ).join("")}</table>` : "");
}

function html_felmeres(adatok, notes) {
  if (!adatok && !Object.keys(notes||{}).length) return '<p class="ures">Felmérési adatok nem elérhetők</p>';
  const SZOVEGES = [
    ["Csatlakozási pont",          adatok?.csatlakozasiPont],
    ["Csatl. pont állapota",       adatok?.csatlPontAllapota],
    ["AC kábel hossz",             adatok?.acKabelHossz, "m"],
    ["AC védelem típus",           adatok?.acVedelem],
    ["Komm. kábel hossz",          adatok?.kommKabelHossz, "m"],
    ["Inverter fal elhelyezés",    adatok?.inverterFal],
    ["Akkumulátor elhelyezés",     adatok?.akkuFal],
    ["Akku kábel hossz",           adatok?.akkuKabelHossz, "m"],
    ["Tető típus",                 adatok?.tetoTipus],
    ["Tetőszerkezet típus",        adatok?.tetoszerkezetTipus],
    ["Padlás",                     adatok?.padlas],
    ["Villámhárító",               adatok?.villamharitor],
    ["Tartószerkezet típus",       adatok?.tartoszerkezetTipus],
    ["Pótcserép",                  adatok?.potcserep],
    ["DC kábel hossz",             adatok?.dcKabelHossz, "m"],
    ["DC kábel nyomvonal",         adatok?.dcKabelNyomvonal],
    ["DC védelem típus",           adatok?.dcVedelem],
    ["Tűzeseti kapcsoló",          adatok?.tuzKapcsolo],
    ["Panel elrendezés",           adatok?.panelElrendezes],
    ["Felhordó eszköz",            adatok?.felhordoEszkoz],
    ["Engedélyeztetés állapota",   adatok?.engedelyeztetes],
    ["Visszwatt védelem",          adatok?.visszwatt],
    ["Megközelíthetőség",          adatok?.megkozelithetoseg],
    ["Felmérés dátuma",            adatok?.felmeresIdopont],
  ].filter(([,v]) => v);

  const FOTO_KAT_NEVEK = {
    csatl_pont:    "Csatlakozási pont",
    inverter_fal:  "Inverter fal, elhelyezés",
    akku_fal:      "Akkumulátor elhelyezése",
    teto_tipus:    "Tető típusa",
    padlas:        "Padlás",
    villamharitor: "Villámhárító",
    mero_kismeg:   "Mérőóra és kismegszakító",
  };
  const notesSorok = Object.entries(notes||{})
    .filter(([,v]) => v?.trim())
    .map(([k,v]) => [FOTO_KAT_NEVEK[k] || k, v]);

  return (szoveges => szoveges.length ? `<table class="adat-t">${szoveges.map(([l,v,u]) =>
    `<tr><td class="l">${l}</td><td class="v">${v}${u ? ` ${u}` : ""}</td></tr>`
  ).join("")}</table>` : "")(szoveges => szoveges)(
    [...SZOVEGES, ...notesSorok.map(([l,v]) => [l + " (megjegyzés)", v])]
  );
}

function html_penzugy(m, karteritesek) {
  const p = calcMunkalapPenzugy(m, karteritesek);
  const sorok = [
    ["Bevétel", ft(p.bevetal), p.bevetal > 0],
    ["Anyagköltség", ft(p.anyagKolts), p.anyagKolts > 0],
    ["Munkaerő díj", ft(p.munkaeroDij), p.munkaeroDij > 0],
    ["Kiszállási díj", ft(p.kiszDij), p.kiszDij > 0],
    ["Egyéb költség", ft(p.egyeb), p.egyeb > 0],
    ["Kártérítés (elfogadott)", ft(p.kartElf), p.kartElf > 0],
    ["Összes költség", `<strong>${ft(p.osszesKolts)}</strong>`, p.osszesKolts > 0],
    ["Eredmény", `<strong style="color:${p.nyereseg?"#166534":"#991B1B"}">${ft(p.eredmeny)}</strong>`, p.bevetal > 0],
    ["Haszon %", `<strong>${p.haszonPct !== null ? p.haszonPct + "%" : "—"}</strong>`, p.bevetal > 0],
  ].filter(([,, show]) => show);
  if (!sorok.length) return '<p class="ures">Pénzügyi adatok nem rögzítve</p>';
  return `<table class="adat-t">${sorok.map(([l,v]) =>
    `<tr><td class="l">${l}</td><td class="v">${v}</td></tr>`
  ).join("")}</table>`;
}

// ─── CSS ────────────────────────────────────────────────────

const CSS = `
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 10pt; color: #111; padding: 15mm 18mm; }
  h1 { font-size: 16pt; font-weight: bold; margin-bottom: 2mm; }
  h2 { font-size: 11pt; font-weight: bold; background: #1E3A5F; color: #fff; padding: 4mm 6mm; margin: 6mm 0 3mm; border-radius: 2pt; }
  .meta { font-size: 9pt; color: #555; margin-bottom: 5mm; }
  .szekc { break-inside: avoid; }
  .adat-t { width: 100%; border-collapse: collapse; margin-bottom: 3mm; }
  .adat-t td { padding: 2.5mm 3mm; border-bottom: 0.5pt solid #eee; vertical-align: top; }
  .adat-t td.l { width: 45%; font-weight: bold; color: #374151; }
  .adat-t td.v { color: #111; }
  .anyag-t { width: 100%; border-collapse: collapse; margin-bottom: 3mm; font-size: 9.5pt; }
  .anyag-t th { background: #374151; color: #fff; padding: 2.5mm 3mm; text-align: left; }
  .anyag-t td { padding: 2.5mm 3mm; border-bottom: 0.5pt solid #eee; }
  .anyag-t tr:nth-child(even) td { background: #F9FAFB; }
  .vbf-blokk { margin-bottom: 4mm; }
  .vbf-cim { font-size: 9.5pt; font-weight: bold; color: #374151; margin-bottom: 2mm; }
  .vbf-t { border-collapse: collapse; margin-bottom: 2mm; }
  .vbf-t th, .vbf-t td { border: 0.5pt solid #ccc; padding: 2mm 4mm; text-align: center; min-width: 18mm; font-size: 9.5pt; }
  .vbf-t th { background: #F3F4F6; font-weight: bold; }
  .unit { color: #888; font-size: 8pt; }
  .ures { font-size: 9pt; color: #aaa; font-style: italic; margin: 2mm 0; }
  .footer { margin-top: 10mm; border-top: 0.5pt solid #ddd; padding-top: 3mm; text-align: center; font-size: 8pt; color: #999; }
  .status-badge { display: inline-block; padding: 1mm 4mm; border-radius: 10pt; font-weight: bold; font-size: 9pt; }
  .top-info { display: flex; gap: 8mm; margin-bottom: 5mm; }
  .top-info div { flex: 1; }
  @media print { body { padding: 10mm; } h2 { break-before: auto; } }
`;

// ─── Egy munkalap riport HTML ─────────────────────────────────

function buildMunkalapHTML(m, karteritesek) {
  const vbf      = loadVbf(m.id);
  const anyagok  = loadAnyagok(m.id);
  const felm     = loadFelmeresAdat(m.id);
  const felmNotes= loadFelmeresNotes(m.id);
  const penzUgy  = html_penzugy(m, karteritesek);
  const hasFelmeres = felm || Object.keys(felmNotes).length;

  return `
    <div class="szekc">
      <h2>📋 ${m.dokumentumszam || m.ediSorszam || m.id} &nbsp;—&nbsp; ${m.munkalapTipus || "Munkalap"}</h2>
      ${adatTabla([
        ["Munkaszám", m.id],
        ["EDI / Dokumentumszám", m.dokumentumszam || m.ediSorszam],
        ["Típus", m.munkalapTipus],
        ["Státusz", m.status],
        ["Ügyfél neve", m.clientNev],
        ["Cím", m.clientCim],
        ["Telefon", m.clientTel],
        ["Csapat", m.assigneeNev],
        ["Tervezett dátum", m.date],
        ["Megkezdés", m.megkezdesIdopont ? new Date(m.megkezdesIdopont).toLocaleString("hu-HU") : null],
        ["Befejezés", m.befejezesIdopont ? new Date(m.befejezesIdopont).toLocaleString("hu-HU") : null],
        ["Feladat leírás", m.projektMegnevezes || m.description],
        ["Értékesítő", m.ertekesito],
      ])}
    </div>

    ${hasFelmeres ? szekcio("📐 Felmérési adatok", html_felmeres(felm, felmNotes)) : ""}

    ${szekcio("🔧 Felhasznált anyagok és sorozatszámok", html_anyagok(anyagok))}

    ${vbf ? szekcio("📊 VBF Jegyzőkönyv", html_vbf(vbf)) : ""}

    ${szekcio("💰 Pénzügyi adatok", penzUgy)}
  `;
}

// ─── Nyomtatható ablak megnyitása ─────────────────────────────

function openPrintWindow(title, bodyHTML) {
  const w = window.open("", "_blank");
  w.document.write(`<!DOCTYPE html><html lang="hu"><head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>${CSS}</style>
  </head><body>
    ${bodyHTML}
    <div class="footer">
      Generálva: ${new Date().toLocaleString("hu-HU")} &nbsp;|&nbsp; CRM Napelem rendszer &nbsp;|&nbsp; ${title}
    </div>
  </body></html>`);
  w.document.close();
  w.onload = () => w.print();
}

// ─── Publikus API ─────────────────────────────────────────────

/**
 * Egy munkalap teljes riportja
 */
export function printMunkalap(m) {
  const kt    = loadKarteritesek();
  const title = `${m.dokumentumszam || m.id} – ${m.clientNev || "Munkalap riport"}`;
  const body  = `
    <h1>☀️ Munkalap Riport</h1>
    <p class="meta">Projektkód: <strong>${m.projektId || "—"}</strong> &nbsp;|&nbsp; Dátum: <strong>${m.date || "—"}</strong> &nbsp;|&nbsp; Csapat: <strong>${m.assigneeNev || "—"}</strong></p>
    ${buildMunkalapHTML(m, kt)}
  `;
  openPrintWindow(title, body);
}

/**
 * Projekt összes munkalapjának riportja
 */
export function printProjektRiport(projekt, munkalapok) {
  const kt   = loadKarteritesek();
  const mls  = (munkalapok||[]).filter(m => m.projektId===projekt.id || projekt.munkalapIds?.includes(m.id));
  const osz  = calcProjektPenzugy(mls, null, kt);
  const title = `${projekt.projektkod} – ${projekt.nev}`;

  const osszesFoglalo = szekcio("📊 Projekt összefoglaló", `
    ${adatTabla([
      ["Projektkód",          projekt.projektkod],
      ["Külső azonosító",     projekt.kulsoAzonosito],
      ["Projekt neve",        projekt.nev],
      ["Ügyfél",              projekt.clientNev],
      ["Kapcsolattartó",      projekt.kapcsolattarto],
      ["Telefonszám",         projekt.clientTel],
      ["Cím",                 projekt.clientCim],
      ["Telepítési cím",      projekt.telepitesiCim],
      ["Típus",               projekt.tipus],
      ["Státusz",             projekt.status],
      ["Projektvezető",       projekt.projektvezetoNev],
      ["Csapat",              projekt.csapatNev],
      ["Tervezett kezdés",    projekt.tervezettKezdes],
      ["Tervezett befejezés", projekt.tervezettBefejezes],
      ["Valós kezdés",        projekt.valoKezdes],
      ["Valós befejezés",     projekt.valoBefejezes],
      ["Ledolgozott óra",     projekt.elvegzettMunkaora ? projekt.elvegzettMunkaora + " óra" : null],
    ])}
    <table class="adat-t" style="margin-top:4mm">
      <tr><td class="l">Elfogadott ajánlat</td><td class="v"><strong>${ft(projekt.elfogadottAjanlat||0)}</strong></td></tr>
      <tr><td class="l">Számlázott bevétel</td><td class="v"><strong style="color:#166534">${ft(osz.bevetal)}</strong></td></tr>
      <tr><td class="l">Összes költség</td><td class="v"><strong style="color:#991B1B">${ft(osz.osszesKolts)}</strong></td></tr>
      <tr><td class="l">Eredmény</td><td class="v"><strong style="color:${osz.eredmeny>=0?"#166534":"#991B1B"}">${ft(osz.eredmeny)}</strong></td></tr>
      <tr><td class="l">Munkalapok száma</td><td class="v">${mls.length} db</td></tr>
    </table>
  `);

  const munkalapBlokkok = mls.map(m => buildMunkalapHTML(m, kt)).join('<div style="page-break-before:always"></div>');

  openPrintWindow(title, `
    <h1>☀️ Projekt Riport</h1>
    <p class="meta">Nyomtatva: ${new Date().toLocaleString("hu-HU")}</p>
    ${osszesFoglalo}
    ${mls.length > 0 ? `<h2 style="margin-top:8mm">📋 Munkalapok részletezése (${mls.length} db)</h2>${munkalapBlokkok}` : ""}
  `);
}
