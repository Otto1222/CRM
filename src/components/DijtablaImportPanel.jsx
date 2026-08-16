/**
 * DijtablaImportPanel.jsx
 * Fővállalkozói díjtábla Excel-importja (ld. dijtablaExcelImport.js) – a
 * Fővállalkozók oldalon, egy adott fővállalkozóhoz nyitva. Ugyanaz a
 * felöltés → oszlop-hozzárendelés → előnézet → megerősítés minta, mint a
 * TetelesExcelImportPanel-nél, kiegészítve kategória-előnézettel és
 * csere/hozzáadás import-móddal.
 */
import { useState, useRef } from "react";
import { FileSpreadsheet, Upload, X, AlertTriangle } from "lucide-react";
import { C, FONT } from "../lib/constants";
import {
  DIJTABLA_MEZOK,
  parseDijtablaExcelFile,
  guessDijtablaColumnMap,
  buildKatalogusTetelekFromRows,
} from "../lib/dijtablaExcelImport";
import { bulkUpsertKatalogus } from "../modules/fovallalkozok/dijtetelKatalogus.service.js";

const selectStyle = {
  width: "100%", padding: "7px 10px", border: `1.5px solid ${C.border}`, borderRadius: 8,
  fontSize: 13, fontFamily: FONT, outline: "none", background: "#fff", color: C.text,
};

export default function DijtablaImportPanel({ tulajdonosId, meglevoDb = 0, onClose, onImported }) {
  const [stage, setStage]         = useState("idle"); // idle | mapping
  const [fileName, setFileName]   = useState("");
  const [fejlec, setFejlec]       = useState([]);
  const [sorok, setSorok]         = useState([]);
  const [columnMap, setColumnMap] = useState({});
  const [mode, setMode]           = useState(meglevoDb > 0 ? "csere" : "csere");
  const [hiba, setHiba]           = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    setHiba("");
    try {
      const { fejlec: fj, sorok: sr } = await parseDijtablaExcelFile(file);
      setFileName(file.name);
      setFejlec(fj);
      setSorok(sr);
      setColumnMap(guessDijtablaColumnMap(fj));
      setStage("mapping");
    } catch (e) {
      setHiba(e.message || "Fájl olvasási hiba.");
    }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  const kotelezoMezokHianyzanak = DIJTABLA_MEZOK.filter(m => m.kotelezo && columnMap[m.key] === undefined);
  const { tetelek: elonezetTetelek, hibasSorok } = stage === "mapping"
    ? buildKatalogusTetelekFromRows(sorok, columnMap)
    : { tetelek: [], hibasSorok: [] };

  const kategoriak = [...new Set(elonezetTetelek.map(t => t.kategoria || "Egyéb"))];

  function handleMegerosites() {
    if (kotelezoMezokHianyzanak.length > 0) {
      setHiba("Kötelező mező hozzárendelése hiányzik: " + kotelezoMezokHianyzanak.map(m => m.label).join(", "));
      return;
    }
    if (elonezetTetelek.length === 0) {
      setHiba("Nincs érvényes tétel a fájlban – ellenőrizd az oszlop-hozzárendelést.");
      return;
    }
    const ujLista = bulkUpsertKatalogus(tulajdonosId, elonezetTetelek, mode, { fileName });
    onImported?.(ujLista);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2200, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 680, padding: 20, fontFamily: FONT, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: C.text }}>Díjtábla import / frissítés</h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: C.muted }}>
            <X size={18} />
          </button>
        </div>

        {stage === "idle" && (
          <>
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? C.accent : C.border}`, borderRadius: 12, padding: "28px 20px",
                textAlign: "center", cursor: "pointer", background: dragOver ? C.accentLight : "#FAFAFA", transition: "all .15s",
              }}
            >
              <FileSpreadsheet size={32} color={dragOver ? C.accent : C.muted} style={{ display: "block", margin: "0 auto 10px" }} />
              <p style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 4 }}>Díjtábla Excel feltöltése</p>
              <p style={{ fontSize: 12, color: C.muted }}>Húzd ide a fájlt, vagy kattints a kiválasztáshoz</p>
              <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>.xlsx · .xls · .csv – tetszőleges oszlopsorrend, a következő lépésben rendeled hozzá</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>
            {meglevoDb > 0 && (
              <p style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>
                Ehhez a fővállalkozóhoz jelenleg <b>{meglevoDb}</b> aktív díjtétel tartozik. Az importálás módját (csere / hozzáadás) a következő lépésben választhatod.
              </p>
            )}
            {hiba && (
              <p style={{ fontSize: 12, color: C.danger, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} /> {hiba}
              </p>
            )}
          </>
        )}

        {stage === "mapping" && (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: C.text, margin: 0 }}>📄 {fileName} – {sorok.length} sor</p>
              <button type="button" onClick={() => setStage("idle")}
                style={{ fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 7, background: "#fff", cursor: "pointer", padding: "4px 10px", color: C.muted, fontFamily: FONT }}>
                Másik fájl
              </button>
            </div>

            <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
              Oszlopok hozzárendelése
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, marginBottom: 14 }}>
              {DIJTABLA_MEZOK.map(mezo => (
                <div key={mezo.key}>
                  <label style={{ fontSize: 11, color: C.muted, display: "block", marginBottom: 3 }}>
                    {mezo.label}{mezo.kotelezo && <span style={{ color: C.danger }}> *</span>}
                  </label>
                  <select
                    value={columnMap[mezo.key] ?? ""}
                    onChange={e => setColumnMap(p => ({ ...p, [mezo.key]: e.target.value === "" ? undefined : Number(e.target.value) }))}
                    style={{ ...selectStyle, borderColor: mezo.kotelezo && columnMap[mezo.key] === undefined ? C.danger : C.border }}
                  >
                    <option value="">— nincs —</option>
                    {fejlec.map((h, i) => <option key={i} value={i}>{h || `(${i + 1}. oszlop)`}</option>)}
                  </select>
                </div>
              ))}
            </div>
            {columnMap.kategoria === undefined && (
              <p style={{ fontSize: 11, color: C.accent, marginTop: -8, marginBottom: 14 }}>
                ℹ Nincs kategória-oszlop hozzárendelve – a rendszer a szakaszcím-sorokból (pl. "A) ALAPTELEPÍTÉS…") automatikusan levezeti a kategóriát a következő tételekre.
              </p>
            )}

            <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
              Import módja
            </p>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[
                { id: "csere", label: "Teljes csere", hint: "A meglévő katalógus törlődik, csak az új tételek maradnak" },
                { id: "hozzaad", label: "Hozzáadás / frissítés", hint: "Kód szerint egyezőknél frissül az ár, az új kódok hozzáadódnak" },
              ].map(o => (
                <button key={o.id} type="button" onClick={() => setMode(o.id)} title={o.hint}
                  style={{ flex: 1, textAlign: "left", padding: "8px 12px", borderRadius: 9, border: `2px solid ${mode === o.id ? C.accent : C.border}`, background: mode === o.id ? C.accentLight : "#fff", cursor: "pointer", fontFamily: FONT }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: mode === o.id ? C.accent : C.text }}>{o.label}</div>
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{o.hint}</div>
                </button>
              ))}
            </div>

            <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
              Előnézet ({elonezetTetelek.length} érvényes tétel{hibasSorok.length > 0 ? `, ${hibasSorok.length} hibás sor` : ""}{kategoriak.length > 0 ? `, ${kategoriak.length} kategória` : ""})
            </p>

            {hibasSorok.length > 0 && (
              <div style={{ background: C.dangerLight, border: `1px solid ${C.dangerLight}`, borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 12, color: C.danger }}>
                <AlertTriangle size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
                {hibasSorok.length} sor kimarad (pl. hiányzó megnevezés/díj). Ellenőrizd az oszlop-hozzárendelést.
              </div>
            )}

            <div style={{ maxHeight: 240, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 14 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.bg, position: "sticky", top: 0 }}>
                    <th style={{ textAlign: "left", padding: "6px 10px" }}>Kód</th>
                    <th style={{ textAlign: "left", padding: "6px 10px" }}>Megnevezés</th>
                    <th style={{ textAlign: "left", padding: "6px 10px" }}>Kategória</th>
                    <th style={{ textAlign: "left", padding: "6px 10px" }}>Egység</th>
                    <th style={{ textAlign: "right", padding: "6px 10px" }}>Díj</th>
                    <th style={{ textAlign: "center", padding: "6px 10px" }}>Km-díj</th>
                  </tr>
                </thead>
                <tbody>
                  {elonezetTetelek.map((t, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.bg}` }}>
                      <td style={{ padding: "5px 10px", color: C.muted }}>{t.kod || "—"}</td>
                      <td style={{ padding: "5px 10px" }}>{t.megnevezes}</td>
                      <td style={{ padding: "5px 10px", color: C.muted, fontSize: 11 }}>{t.kategoria || "—"}</td>
                      <td style={{ padding: "5px 10px" }}>{t.egyseg}</td>
                      <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600 }}>{t.ar.toLocaleString("hu-HU")}</td>
                      <td style={{ padding: "5px 10px", textAlign: "center" }}>{t.kmDij ? "✓" : "—"}</td>
                    </tr>
                  ))}
                  {elonezetTetelek.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: "16px", textAlign: "center", color: C.muted }}>Nincs érvényes sor – rendeld hozzá a kötelező oszlopokat.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {hiba && (
              <p style={{ fontSize: 12, color: C.danger, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} /> {hiba}
              </p>
            )}

            <button
              type="button"
              onClick={handleMegerosites}
              disabled={kotelezoMezokHianyzanak.length > 0 || elonezetTetelek.length === 0}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "none",
                background: (kotelezoMezokHianyzanak.length > 0 || elonezetTetelek.length === 0) ? C.border : C.success,
                color: "#fff", fontWeight: 700, fontSize: 14,
                cursor: (kotelezoMezokHianyzanak.length > 0 || elonezetTetelek.length === 0) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT,
              }}
            >
              <Upload size={16} /> Megerősítés és importálás ({elonezetTetelek.length} tétel)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
