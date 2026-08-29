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

function nyomtatKomissiosListat(projektCim, fovallalkoNev, tetelek) {
  const w = window.open("", "_blank");
  if (!w) return;
  const sorok = tetelek.map(t => `
    <tr>
      <td>${t.cikkszam || "—"}</td>
      <td>${t.nev || "—"}</td>
      <td>${t.kategoria || "—"}</td>
      <td style="text-align:right">${t.kiadandoMennyiseg ?? 0} ${t.egyseg || ""}</td>
      <td style="text-align:right">${t.kiadottMennyiseg ?? 0} ${t.egyseg || ""}</td>
    </tr>
  `).join("");
  w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Komissiós lista – ${projektCim}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:20mm;max-width:210mm;margin:0 auto;color:#111;}
      h1{font-size:18px;margin:0 0 4px;}
      p{font-size:12px;color:#555;margin:0 0 16px;}
      table{border-collapse:collapse;width:100%;font-size:12px;}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;}
      th{background:#f2f2f2;text-transform:uppercase;font-size:10px;letter-spacing:.4px;}
    </style></head><body>
    <h1>Komissiós lista – ${projektCim}</h1>
    <p>Fővállalkozó: ${fovallalkoNev || "—"} · Nyomtatva: ${new Date().toLocaleString("hu-HU")}</p>
    <table>
      <thead><tr><th>Cikkszám</th><th>Megnevezés</th><th>Kategória</th><th style="text-align:right">Kiadandó</th><th style="text-align:right">Kiadott</th></tr></thead>
      <tbody>${sorok}</tbody>
    </table>
    <script>window.onload = () => window.print();</script>
    </body></html>`);
  w.document.close();
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
        <button type="button" onClick={e => { e.stopPropagation(); nyomtatKomissiosListat(`${sor.projekt.projektkod} – ${sor.projekt.clientNev || sor.projekt.nev || ""}`, sor.fovallalkoNev, sor.csomag.tetelek || []); }}
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
