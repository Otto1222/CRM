/**
 * RaktarosPage.jsx
 * A "Raktáros" szerepkör kizárólagos felülete – nincs ügyfél-, ajánlat-,
 * pénzügyi vagy ár-adat sehol ezen az oldalon (ld. roles.js ROLE_PAGES,
 * "Raktáros": ["raktaros"]).
 *
 * Két rész:
 *   1. Raktárkészlet – a meglévő RaktarkeszletPage.jsx VÁLTOZATLANUL
 *      (bevételezés/korrekció, mozgásnapló, visszahozott anyag jóváhagyása –
 *      ez már eddig is kizárólag mennyiséget és nem árat mutatott).
 *   2. Kivitelezési csomagok – ÚJ: a projektek Kivitelezési Csomagjainak
 *      összesített, projekten-átívelő listája, hogy a raktárosnak ne
 *      kelljen projektenként bejárnia a Projektek oldalt. Itt tudja
 *      rögzíteni, mennyit adott ki fizikailag (kiadott mennyiség), és
 *      itt tudja kinyomtatni a komissiós listát – SOHA nincs ár/haszon
 *      oszlop, csak megnevezés, kategória, egység és a mennyiségek.
 */
import { useMemo, useState } from "react";
import { Warehouse, Package, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants.js";
import { loadProjektek, formatProjektAzonosito } from "../modules/projektek/projekt.service.js";
import { loadFovallalkozok } from "../modules/fovallalkozok/fovallalkozo.service.js";
import {
  loadKivitelezesiCsomagok,
  updateKiviTetelMennyisegek,
} from "../modules/kivitelezesi_csomag/kivitelezesiCsomag.service.js";
import { getKivitelezesiCsomagStatusConfig, calcKiviTetelEltérés, isKivitelezesiCsomagSzerkesztesTiltott } from "../modules/kivitelezesi_csomag/kivitelezesiCsomag.schema.js";
import RaktarkeszletPage from "./RaktarkeszletPage.jsx";

const th = { textAlign: "left", padding: "7px 10px", fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4, borderBottom: `1.5px solid ${C.border}` };
const td = { padding: "8px 10px", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.bg}` };
const mennyisegInputStyle = { width: 64, padding: "4px 6px", textAlign: "right", border: `1.5px solid ${C.border}`, borderRadius: 6, fontSize: 12.5, fontFamily: FONT };

// Ezek a státuszok jelentik a raktáros tényleges teendőjét – a "Tervezet"
// státuszú csomagot a PM még összeállítja, "Elszámolva" után már csak
// történeti adat, ezekhez a raktárosnak nincs dolga (de a "Mind" kapcsolóval
// bármikor előhívhatók, ha vissza akar nézni valamit).
const AKTIV_STATUSZOK = ["PM jóváhagyta", "Komissiózás alatt", "Anyag kiadva", "Kivitelezés alatt"];

function escHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(d) {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("hu-HU"); } catch { return d; }
}

/**
 * Nyomtatható, offline kitölthető komissiós lista – a valós
 * Kivitelezesi_csomag_lista.xlsx papíralapú munkafolyamata alapján:
 * a raktáros kiadás előtt kinyomtatja, a helyszíni csapat internet
 * nélkül, kézzel vezeti a "Beépített" oszlopot, majd a raktáros a
 * visszahozott anyagot ez alapján rögzíti a rendszerben. A fejléc/lábléc
 * és a betűtípus/szín-választás az arculati kézikönyvet követi (ld.
 * ajanlatPrint.js – ugyanaz a mintázat, hogy minden nyomtatott
 * dokumentum egységes legyen).
 */
function nyomtatKomissiosListat(projekt, fovallalkoNev, tetelek) {
  const csoportok = {};
  (tetelek || []).forEach(t => {
    const kat = t.kategoria || "Egyéb";
    (csoportok[kat] = csoportok[kat] || []).push(t);
  });

  const szekciok = Object.entries(csoportok).map(([kat, katTetelek]) => {
    const sorok = katTetelek.map((t, i) => `
      <tr>
        <td class="col-idx">${i + 1}.</td>
        <td class="col-nev">${escHtml(t.nev || "—")}${t.cikkszam ? `<div class="sub">${escHtml(t.cikkszam)}</div>` : ""}</td>
        <td class="col-num">${t.kiadandoMennyiseg ?? t.tervezettMennyiseg ?? 0} ${escHtml(t.egyseg || "")}</td>
        <td class="col-fill"></td>
        <td class="col-fill"></td>
        <td class="col-fill"></td>
        <td class="col-hiany"></td>
      </tr>`).join("");
    return `
    <div class="section">
      <div class="section-title"><span class="tag">${escHtml(kat)}</span><span class="cnt">${katTetelek.length} tétel</span></div>
      <table>
        <thead><tr>
          <th class="col-idx">#</th><th class="col-nev">Megnevezés</th><th class="col-num">Menny.</th>
          <th class="col-fill">Kiadott</th><th class="col-fill">Beépített</th><th class="col-fill">Vissza­hozott</th><th class="col-hiany">Hiány</th>
        </tr></thead>
        <tbody>${sorok || `<tr><td colspan="7" class="empty">Ez a csoport üres.</td></tr>`}</tbody>
      </table>
    </div>`;
  }).join("") || `<p class="empty">Ez a csomag még üres – nincs mit kiadni.</p>`;

  const ugyfelCim = projekt.telepitesiCim || projekt.clientCim || "—";
  const ugyfelLakcimSor = projekt.clientCim && projekt.clientCim !== projekt.telepitesiCim
    ? `<div class="meta-sub">Ügyfél lakcíme: ${escHtml(projekt.clientCim)}</div>` : "";
  const tervDatumSor = [fmtDate(projekt.tervezettKezdes), fmtDate(projekt.tervezettBefejezes)].filter(Boolean).join(" → ");

  const html = `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8"/>
<title>Komissiós lista – ${escHtml(formatProjektAzonosito(projekt.projektkod, projekt.kulsoAzonosito))}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&family=Montserrat:wght@400;500;600;700&family=Raleway:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Montserrat', Arial, sans-serif; font-size: 10.5pt; color: #1D1D1B; background: #fff; }
  .page { max-width: 800px; margin: 0 auto; padding: 32px 40px 30px; }

  .header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 14px; border-bottom: 3px solid #075E56; margin-bottom: 18px; }
  .edi-logo .name    { font-family: 'Raleway', serif; font-size: 24pt; font-weight: 800; color: #075E56; letter-spacing: 3px; line-height: 1; }
  .edi-logo .tagline { font-family: 'Raleway', serif; font-size: 6.5pt; color: #18ACA0; letter-spacing: 2px; text-transform: uppercase; margin-top: 3px; }
  .header-right { text-align: right; font-size: 8pt; color: #3C3C3B; line-height: 1.65; }
  .header-right strong { color: #075E56; }

  .doc-title-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
  .doc-title { font-family: 'EB Garamond', serif; font-weight: 700; font-size: 16pt; color: #075E56; }
  .doc-sub { font-family: 'EB Garamond', serif; font-style: italic; font-size: 11pt; color: #7BA8A3; }

  .notebox { background: #FDEBEC; border: 1px solid #F3C3C6; border-left: 4px solid #E30613; border-radius: 2px; padding: 8px 12px; margin-bottom: 14px; }
  .notebox .lbl { font-size: 8pt; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: #861001; margin-bottom: 2px; }
  .notebox .txt { font-size: 10.5pt; color: #3C3C3B; line-height: 1.5; }

  .metagrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 14px; }
  .metacard { border: 1px solid #D0E8E6; border-radius: 2px; }
  .metacard .hd { font-size: 8pt; font-weight: 700; letter-spacing: .5px; text-transform: uppercase; color: #fff; background: #075E56; padding: 3px 9px; }
  .metarow { display: flex; border-bottom: 1px solid #EDF6F5; font-size: 10pt; }
  .metarow:last-child { border-bottom: none; }
  .metarow .k { width: 40%; flex: none; font-size: 8pt; color: #7BA8A3; padding: 4px 8px; border-right: 1px solid #EDF6F5; }
  .metarow .v { flex: 1; font-weight: 600; padding: 4px 8px; }
  .meta-sub { font-size: 8.5pt; color: #7BA8A3; padding: 2px 8px 4px; font-style: italic; }

  .timerow { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; margin-bottom: 16px; }
  .timebox { border: 1px dashed #B9B6AC; border-radius: 2px; padding: 5px 8px; }
  .timebox .lbl { font-size: 7.5pt; letter-spacing: .4px; text-transform: uppercase; color: #7BA8A3; }
  .timebox .line { margin-top: 9px; border-bottom: 1px solid #1D1D1B; height: 1px; }

  .section { margin-bottom: 16px; page-break-inside: avoid; }
  .section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
  .section-title .tag { font-size: 8.5pt; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; background: #18ACA0; color: #04201D; padding: 3px 9px; border-radius: 2px; }
  .section-title .cnt { margin-left: auto; font-size: 9pt; color: #7BA8A3; font-weight: 600; }

  table { width: 100%; border-collapse: collapse; }
  thead th { text-align: left; font-size: 7.5pt; letter-spacing: .3px; text-transform: uppercase; color: #7BA8A3; border-bottom: 1.5px solid #1D1D1B; padding: 4px 6px; font-weight: 700; }
  th.col-fill { color: #075E56; } th.col-hiany { color: #E30613; }
  th.col-num, td.col-num { text-align: right; }
  tbody td { padding: 6px; border-bottom: 1px solid #EDF6F5; font-size: 9.5pt; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #F7FBFA; }
  td.col-nev .sub { color: #7BA8A3; font-size: 8pt; }
  td.col-fill { background: #EAF6F5; }
  td.col-hiany { background: #FDEBEC; }
  .empty { text-align: center; color: #7BA8A3; padding: 10px; font-style: italic; font-size: 10pt; }

  .specbox { border: 1px solid #D0E8E6; border-radius: 2px; padding: 8px 12px; margin: 12px 0; font-size: 9.5pt; }
  .specbox .full { font-family: 'EB Garamond', serif; font-style: italic; color: #7BA8A3; }

  .oath { font-family: 'EB Garamond', serif; font-style: italic; font-size: 10.5pt; line-height: 1.5; background: #FAFAF7; border-left: 3px solid #18ACA0; padding: 8px 12px; margin: 18px 0 14px; }
  .siggrid { display: grid; grid-template-columns: repeat(3,1fr); gap: 18px; margin-bottom: 14px; }
  .sig-box { text-align: left; }
  .sig-line { border-top: 1px solid #1D1D1B; margin-top: 26px; padding-top: 5px; font-size: 8pt; color: #3C3C3B; }
  .sig-label { font-size: 7.5pt; letter-spacing: .4px; text-transform: uppercase; color: #7BA8A3; }

  .footer { margin-top: 10px; border-top: 2px solid #D0E8E6; padding-top: 10px; display: flex; justify-content: space-between; font-size: 8pt; color: #7BA8A3; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 14px 18px; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div class="edi-logo">
      <div class="name">E.D.I.</div>
      <div class="tagline">Solutions Kft. &bull; Electronic &bull; Development &bull; Innovations</div>
    </div>
    <div class="header-right">
      <strong>E.D.I. Solutions Kft.</strong><br/>
      6724 Szeged, Kossuth Lajos sgt. 72/b<br/>
      +36 20 237 7661 &bull; titkarsag@edisolutions.hu
    </div>
  </div>

  <div class="doc-title-row">
    <span class="doc-title">Komissiós lista</span>
    <span class="doc-sub">${escHtml(formatProjektAzonosito(projekt.projektkod, projekt.kulsoAzonosito))} · Nyomtatva: ${new Date().toLocaleString("hu-HU")}</span>
  </div>

  ${projekt.fovMegjegyzes ? `
  <div class="notebox">
    <div class="lbl">Fontos tudnivaló a helyszíni csapatnak</div>
    <div class="txt">${escHtml(projekt.fovMegjegyzes).replace(/\n/g, "<br/>")}</div>
  </div>` : ""}

  <div class="metagrid">
    <div class="metacard">
      <div class="hd">Ügyfél</div>
      <div class="metarow"><div class="k">Név / telefon</div><div class="v">${escHtml(projekt.clientNev || "—")}${projekt.clientTel ? ` · ${escHtml(projekt.clientTel)}` : ""}</div></div>
      ${projekt.kapcsolattarto ? `<div class="metarow"><div class="k">Kapcsolattartó</div><div class="v">${escHtml(projekt.kapcsolattarto)}</div></div>` : ""}
      <div class="metarow"><div class="k">Cím</div><div class="v">${escHtml(ugyfelCim)}</div></div>
      ${ugyfelLakcimSor}
    </div>
    <div class="metacard">
      <div class="hd">Kivitelezés</div>
      <div class="metarow"><div class="k">Fővállalkozó</div><div class="v">${escHtml(fovallalkoNev || "Saját munka")}</div></div>
      ${projekt.csapatNev ? `<div class="metarow"><div class="k">Csapat</div><div class="v">${escHtml(projekt.csapatNev)}</div></div>` : ""}
      ${projekt.projektvezetoNev ? `<div class="metarow"><div class="k">Projektvezető</div><div class="v">${escHtml(projekt.projektvezetoNev)}</div></div>` : ""}
      ${tervDatumSor ? `<div class="metarow"><div class="k">Tervezett időszak</div><div class="v">${escHtml(tervDatumSor)}</div></div>` : ""}
    </div>
  </div>

  <div class="timerow">
    <div class="timebox"><div class="lbl">Raktárba érkezés ideje</div><div class="line"></div></div>
    <div class="timebox"><div class="lbl">Anyagok átadásának ideje</div><div class="line"></div></div>
    <div class="timebox"><div class="lbl">Raktártól távozás ideje</div><div class="line"></div></div>
  </div>

  ${szekciok}

  <div class="oath">„A »Kiadott« oszlopban szereplő anyagokat hiánytalanul és sérülésmentesen átvettem. A fenti anyagokat a »Beépített« oszlopban feltüntetett mennyiségben építettem be.”</div>

  <div class="siggrid">
    <div class="sig-box"><div class="sig-line">Raktáros — kiadás (név, dátum)</div></div>
    <div class="sig-box"><div class="sig-line">Kivitelező — átvétel / beépítés (név, dátum)</div></div>
    <div class="sig-box"><div class="sig-line">Raktáros — visszavétel (név, dátum)</div></div>
  </div>

  <div class="footer">
    <div>E.D.I. Solutions Kft. &bull; Adószám: 26740122-2-06 &bull; Cégjsz: 06-09-025279</div>
    <div>www.edikamera.hu</div>
  </div>

</div>
</body>
</html>`;

  const win = window.open("", "_blank", "width=920,height=780,scrollbars=yes");
  if (!win) { alert("Engedélyezd az ablak nyitást a böngészőben!"); return; }
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 700);
}

function CsomagSor({ sor, onKiadottValtoztat }) {
  const [nyitva, setNyitva] = useState(false);
  const stCfg = getKivitelezesiCsomagStatusConfig(sor.csomag.status);
  const tetelDb = (sor.csomag.tetelek || []).length;
  const szerkesztheto = !isKivitelezesiCsomagSzerkesztesTiltott(sor.csomag.status);

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer" }} onClick={() => setNyitva(o => !o)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 800, fontSize: 13.5, color: C.accent, fontFamily: FONT_HEADING }}>{formatProjektAzonosito(sor.projekt.projektkod, sor.projekt.kulsoAzonosito)}</span>
            <span style={{ fontSize: 12.5, color: C.text }}>{sor.projekt.clientNev || sor.projekt.nev || "—"}</span>
            <span style={{ fontSize: 11, background: C.accentLight, color: C.accent, padding: "2px 9px", borderRadius: 20, fontWeight: 700 }}>{sor.fovallalkoNev || "Saját munka"}</span>
          </div>
          <p style={{ fontSize: 11.5, color: C.muted, margin: "3px 0 0" }}>{sor.projekt.telepitesiCim || sor.projekt.clientCim || "—"}</p>
        </div>
        <span style={{ background: stCfg.bg, color: stCfg.szin, border: `1.5px solid ${stCfg.szin}40`, borderRadius: 20, padding: "3px 12px", fontSize: 11.5, fontWeight: 700, fontFamily: FONT, whiteSpace: "nowrap" }}>
          {sor.csomag.status}
        </span>
        <span style={{ fontSize: 11.5, color: C.muted, whiteSpace: "nowrap" }}>{tetelDb} tétel</span>
        <button type="button" onClick={e => { e.stopPropagation(); nyomtatKomissiosListat(sor.projekt, sor.fovallalkoNev, sor.csomag.tetelek || []); }}
          title="Komissiós lista nyomtatása"
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 11px", background: C.bg, color: C.textSub, border: `1px solid ${C.border}`, borderRadius: 7, cursor: "pointer", fontSize: 11.5, fontWeight: 700, fontFamily: FONT }}>
          <Printer size={13} /> Nyomtatás
        </button>
        {nyitva ? <ChevronUp size={16} color={C.muted} /> : <ChevronDown size={16} color={C.muted} />}
      </div>

      {nyitva && (
        <div style={{ borderTop: `1px solid ${C.bg}`, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Cikkszám</th>
                <th style={th}>Megnevezés</th>
                <th style={th}>Kategória</th>
                <th style={{ ...th, textAlign: "right" }}>Tervezett</th>
                <th style={{ ...th, textAlign: "right" }}>Kiadandó</th>
                <th style={{ ...th, textAlign: "right" }}>Kiadott</th>
                <th style={{ ...th, textAlign: "right" }}>Felhasznált</th>
                <th style={{ ...th, textAlign: "right" }}>Visszahozott</th>
                <th style={{ ...th, textAlign: "center" }}>Eltérés</th>
              </tr>
            </thead>
            <tbody>
              {(sor.csomag.tetelek || []).map(t => {
                const elteres = calcKiviTetelEltérés(t);
                return (
                  <tr key={t.id}>
                    <td style={td}>{t.cikkszam || "—"}</td>
                    <td style={td}>{t.nev || "—"}</td>
                    <td style={td}>{t.kategoria || "—"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{t.tervezettMennyiseg} {t.egyseg}</td>
                    <td style={{ ...td, textAlign: "right" }}>{t.kiadandoMennyiseg} {t.egyseg}</td>
                    <td style={{ ...td, textAlign: "right" }}>
                      {szerkesztheto ? (
                        <input type="number" min="0" step="any" value={t.kiadottMennyiseg}
                          onChange={e => onKiadottValtoztat(sor.csomag.id, t.id, e.target.value)}
                          style={mennyisegInputStyle} />
                      ) : (
                        `${t.kiadottMennyiseg} ${t.egyseg}`
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "right" }}>{t.felhasznaltMennyiseg} {t.egyseg}</td>
                    <td style={{ ...td, textAlign: "right" }}>{t.visszahozottMennyiseg} {t.egyseg}</td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {elteres === 0 ? (
                        <span style={{ background: C.successLight, color: C.success, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>✓</span>
                      ) : (
                        <span style={{ background: C.dangerLight, color: C.dangerHover, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{elteres > 0 ? `+${elteres}` : elteres}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(sor.csomag.tetelek || []).length === 0 && (
                <tr><td colSpan={9} style={{ ...td, textAlign: "center", color: C.muted }}>Ez a csomag még üres.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function RaktarosPage({ currentUser }) {
  const [tab, setTab] = useState("kiv_csomagok");
  const [mindMutat, setMindMutat] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const sorok = useMemo(() => {
    const projektek = loadProjektek();
    const fovallalkozok = loadFovallalkozok();
    const csomagok = loadKivitelezesiCsomagok();
    return csomagok
      .map(csomag => {
        const projekt = projektek.find(p => p.id === csomag.projektId);
        if (!projekt) return null;
        const fovallalkoNev = projekt.penzugy?.fovallalkoziId
          ? fovallalkozok.find(f => f.id === projekt.penzugy.fovallalkoziId)?.nev
          : null;
        return { csomag, projekt, fovallalkoNev };
      })
      .filter(Boolean)
      .filter(sor => mindMutat || AKTIV_STATUSZOK.includes(sor.csomag.status))
      .sort((a, b) => (b.csomag.updatedAt || "").localeCompare(a.csomag.updatedAt || ""));
  }, [mindMutat, refreshKey]);

  function handleKiadottValtoztat(csomagId, tetelId, ertek) {
    try {
      updateKiviTetelMennyisegek(csomagId, tetelId, { kiadottMennyiseg: ertek }, currentUser?.name || "");
      setRefreshKey(k => k + 1);
    } catch { /* csendben nyeljük – a mező visszaugrik a következő renderen */ }
  }

  return (
    <div style={{ padding: "24px 28px", fontFamily: FONT, maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Warehouse size={22} color={C.accent} />
        <h1 style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Raktáros felület</h1>
      </div>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
        Bevételezés, kiadás, visszahozott anyag jóváhagyása és a projektek Kivitelezési Csomagjainak komissiózása – egy helyen.
      </p>

      <div style={{ display: "flex", gap: 4, marginBottom: 18, background: C.bg, padding: 4, borderRadius: 12, width: "fit-content" }}>
        <button onClick={() => setTab("kiv_csomagok")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 9, border: "none", background: tab === "kiv_csomagok" ? "#fff" : "transparent", color: tab === "kiv_csomagok" ? C.text : C.muted, fontWeight: tab === "kiv_csomagok" ? 700 : 500, fontSize: 14, cursor: "pointer", fontFamily: FONT }}>
          <Package size={15} /> Kivitelezési csomagok
        </button>
        <button onClick={() => setTab("raktarkeszlet")} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 18px", borderRadius: 9, border: "none", background: tab === "raktarkeszlet" ? "#fff" : "transparent", color: tab === "raktarkeszlet" ? C.text : C.muted, fontWeight: tab === "raktarkeszlet" ? 700 : 500, fontSize: 14, cursor: "pointer", fontFamily: FONT }}>
          <Warehouse size={15} /> Raktárkészlet
        </button>
      </div>

      {tab === "kiv_csomagok" && (
        <>
          <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.textSub, marginBottom: 12, cursor: "pointer", width: "fit-content" }}>
            <input type="checkbox" checked={mindMutat} onChange={e => setMindMutat(e.target.checked)} style={{ width: 15, height: 15, accentColor: C.accent }} />
            Lezárt / elszámolt csomagok is (előzmény)
          </label>
          {sorok.length === 0 ? (
            <div style={{ background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 12, padding: 28, textAlign: "center", color: C.muted, fontSize: 13 }}>
              Nincs jelenleg komissiózásra váró Kivitelezési Csomag.
            </div>
          ) : (
            sorok.map(sor => <CsomagSor key={sor.csomag.id} sor={sor} onKiadottValtoztat={handleKiadottValtoztat} />)
          )}
        </>
      )}

      {tab === "raktarkeszlet" && <RaktarkeszletPage currentUser={currentUser} />}
    </div>
  );
}
