/**
 * DijtablaImportModal.jsx
 * Excel/CSV díjtábla import oszlop-megfeleltetéssel (Rendszerterv – 2. fázis).
 *
 * Lépések egy képernyőn:
 *   1. Fájl kiválasztás → parse (munkalapok)
 *   2. Munkalap + fejléc sor + oszlop-megfeleltetés (auto, felülírható)
 *   3. Élő előnézet → Import
 */

import { useState, useMemo } from "react";
import { X, UploadCloud, FileSpreadsheet, Check, AlertTriangle } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../lib/constants.js";
import { ft } from "../../lib/helpers.js";
import { egysegLabel } from "./dijtabla.schema.js";
import {
  parseFile, detectHeaderRow, autoMapColumns, buildTetelek, IMPORT_MEZOK,
} from "./dijtablaImport.js";
import {
  bulkImportDijtetelek, deleteDijtetelekByFovallalkozo,
} from "./dijtabla.service.js";

const inp = {
  boxSizing: "border-box", padding: "7px 10px",
  border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13,
  fontFamily: "inherit", outline: "none", background: "#fff",
};

const colLetter = i => (i < 0 ? "—" : String.fromCharCode(65 + (i % 26)));

export default function DijtablaImportModal({ fovallalkozoId, fovallalkozoNev, onClose, onImported }) {
  const [sheets, setSheets]       = useState(null);   // [{name, aoa}]
  const [sheetIdx, setSheetIdx]   = useState(0);
  const [headerIdx, setHeaderIdx] = useState(0);      // 0-alapú sorindex
  const [mapping, setMapping]     = useState({});
  const [clearFirst, setClear]    = useState(false);
  const [fileName, setFileName]   = useState("");
  const [hiba, setHiba]           = useState("");
  const [busy, setBusy]           = useState(false);

  const aoa = sheets?.[sheetIdx]?.aoa || [];

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setHiba(""); setBusy(true); setFileName(file.name);
    try {
      const parsed = await parseFile(file);
      const valid = parsed.filter(s => s.aoa.length > 0);
      if (valid.length === 0) { setHiba("A fájl üres vagy nem olvasható."); setBusy(false); return; }
      setSheets(valid);
      applySheet(valid, 0);
    } catch (err) {
      console.error("[dijtabla import parse]", err);
      setHiba("A fájl feldolgozása sikertelen. Ellenőrizd, hogy .xlsx / .xls / .csv formátum-e.");
    }
    setBusy(false);
  }

  function applySheet(sheetList, idx) {
    setSheetIdx(idx);
    const a = sheetList[idx].aoa;
    const detected = detectHeaderRow(a);
    const hIdx = detected >= 0 ? detected : 0;
    setHeaderIdx(hIdx);
    setMapping(autoMapColumns(a[hIdx] || []));
  }

  function changeHeaderIdx(v) {
    const idx = Math.max(0, Math.min((aoa.length || 1) - 1, Number(v) - 1));
    setHeaderIdx(idx);
    setMapping(autoMapColumns(aoa[idx] || []));
  }

  const headerCells = aoa[headerIdx] || [];
  const colCount = Math.max(0, ...aoa.slice(0, 30).map(r => r.length));
  const colOptions = Array.from({ length: colCount }, (_, i) => i);

  // A megfeleltetés megfordítása: field → colIdx. A <select>-ekben
  // oszloponként állítjuk, de mezőnként tároljuk.
  function setFieldCol(field, colIdx) {
    setMapping(prev => {
      const next = { ...prev };
      // ha ezt az oszlopot már más mező használta, oldjuk fel
      Object.keys(next).forEach(f => { if (next[f] === colIdx && f !== field) next[f] = -1; });
      next[field] = colIdx;
      return next;
    });
  }

  const preview = useMemo(() => {
    if (!aoa.length) return { rows: [], skipped: 0, groups: [] };
    try { return buildTetelek(aoa, headerIdx, mapping); }
    catch { return { rows: [], skipped: 0, groups: [] }; }
  }, [aoa, headerIdx, mapping]);

  const megnevezesOk = (mapping.megnevezes ?? -1) >= 0;
  const dijOk = (mapping.nettoDij ?? -1) >= 0;
  const canImport = megnevezesOk && dijOk && preview.rows.length > 0;

  function doImport() {
    if (!canImport) return;
    setBusy(true);
    try {
      if (clearFirst) deleteDijtetelekByFovallalkozo(fovallalkozoId);
      const n = bulkImportDijtetelek(fovallalkozoId, preview.rows, "import");
      onImported?.(n);
      onClose?.();
    } catch (err) {
      console.error("[dijtabla import]", err);
      setHiba("Az import mentése sikertelen (lehet, hogy megtelt a tárhely).");
      setBusy(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2200, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 760, fontFamily: FONT, boxShadow: "0 24px 60px rgba(0,0,0,.25)" }}>

        {/* Fejléc */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #E2E8F0" }}>
          <div>
            <h3 style={{ fontFamily: FONT_HEADING, fontSize: 17, fontWeight: 800, margin: 0 }}>Díjtábla import – Excel / CSV</h3>
            <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>{fovallalkozoNev}</p>
          </div>
          <button onClick={onClose} style={{ padding: "4px 8px", border: "none", background: "none", cursor: "pointer", color: C.muted }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {hiba && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.dangerLight, border: "1.5px solid #FECACA", borderRadius: 9, padding: "9px 12px", marginBottom: 14, fontSize: 13, color: C.danger, fontWeight: 600 }}>
              <AlertTriangle size={15} /> {hiba}
            </div>
          )}

          {/* 1. Fájl feltöltés */}
          {!sheets ? (
            <label style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "36px 20px", border: "2px dashed #CBD5E1", borderRadius: 14, background: C.bg, cursor: "pointer", textAlign: "center" }}>
              <UploadCloud size={34} color={C.accent} />
              <div style={{ fontWeight: 700, fontSize: 15 }}>{busy ? "Feldolgozás…" : "Húzd ide vagy kattints – Excel / CSV"}</div>
              <div style={{ fontSize: 12, color: C.muted }}>.xlsx · .xls · .csv — a fejlécet és az oszlopokat automatikusan felismerjük</div>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
            </label>
          ) : (
            <>
              {/* Fájl + munkalap + fejléc sor */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.accentLight, borderRadius: 10, marginBottom: 16, flexWrap: "wrap" }}>
                <FileSpreadsheet size={18} color={C.accent} />
                <span style={{ fontWeight: 700, fontSize: 13, color: C.accent }}>{fileName}</span>
                {sheets.length > 1 && (
                  <label style={{ fontSize: 12, color: C.textSub, display: "flex", alignItems: "center", gap: 5, marginLeft: "auto" }}>
                    Munkalap:
                    <select value={sheetIdx} onChange={e => applySheet(sheets, Number(e.target.value))} style={{ ...inp, padding: "4px 8px" }}>
                      {sheets.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
                    </select>
                  </label>
                )}
                <label style={{ fontSize: 12, color: C.textSub, display: "flex", alignItems: "center", gap: 5, marginLeft: sheets.length > 1 ? 0 : "auto" }}>
                  Fejléc sor:
                  <input type="number" min={1} value={headerIdx + 1} onChange={e => changeHeaderIdx(e.target.value)} style={{ ...inp, width: 60, padding: "4px 8px" }} />
                </label>
              </div>

              {/* Oszlop-megfeleltetés */}
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .6, margin: "0 0 8px" }}>
                Oszlop-megfeleltetés
              </p>
              <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10, marginBottom: 16 }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 520, fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>CRM mező</th>
                      <th style={thStyle}>Forrás oszlop</th>
                      <th style={thStyle}>Felismert fejléc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {IMPORT_MEZOK.map(m => {
                      const col = mapping[m.id] ?? -1;
                      const missing = m.required && col < 0;
                      return (
                        <tr key={m.id}>
                          <td style={tdStyle}>
                            <span style={{ fontWeight: 700 }}>{m.label}</span>
                            {m.required && <span style={{ color: C.danger, marginLeft: 3 }}>*</span>}
                          </td>
                          <td style={tdStyle}>
                            <select value={col} onChange={e => setFieldCol(m.id, Number(e.target.value))}
                              style={{ ...inp, padding: "5px 8px", borderColor: missing ? C.danger : "#E2E8F0", minWidth: 150 }}>
                              <option value={-1}>— nincs —</option>
                              {colOptions.map(i => (
                                <option key={i} value={i}>{colLetter(i)} · {String(headerCells[i] ?? "").slice(0, 24) || `(${i + 1}. oszlop)`}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ ...tdStyle, color: C.muted, fontSize: 12 }}>
                            {col >= 0 ? (String(headerCells[col] ?? "") || "—") : (missing ? <span style={{ color: C.danger }}>kötelező!</span> : "—")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Előnézet */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .6, margin: 0 }}>
                  Előnézet
                </p>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.success, background: C.successLight, padding: "2px 10px", borderRadius: 20 }}>
                  {preview.rows.length} tétel
                </span>
                {preview.groups.length > 0 && <span style={{ fontSize: 12, color: C.muted }}>{preview.groups.length} csoport</span>}
                {preview.skipped > 0 && <span style={{ fontSize: 12, color: C.warning }}>{preview.skipped} kihagyott (nincs díj)</span>}
              </div>

              <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10, maxHeight: 220, overflowY: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 560, fontSize: 12.5 }}>
                  <thead style={{ position: "sticky", top: 0 }}>
                    <tr>
                      <th style={thStyle}>Kód</th>
                      <th style={thStyle}>Megnevezés</th>
                      <th style={thStyle}>Egység</th>
                      <th style={{ ...thStyle, textAlign: "right" }}>Nettó díj</th>
                      <th style={thStyle}>Km</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 60).map((r, i) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontFamily: "monospace", color: C.accent, fontWeight: 700 }}>{r.kod || "—"}</td>
                        <td style={tdStyle}>{r.megnevezes}</td>
                        <td style={tdStyle}>{egysegLabel(r.egyseg)}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>{ft(r.nettoDij)}</td>
                        <td style={tdStyle}>{r.kmDijas ? <span style={{ fontSize: 10, fontWeight: 700, background: "#FEF3E2", color: C.warning, padding: "1px 7px", borderRadius: 20 }}>km</span> : "–"}</td>
                      </tr>
                    ))}
                    {preview.rows.length === 0 && (
                      <tr><td colSpan={5} style={{ ...tdStyle, textAlign: "center", color: C.muted, padding: "18px" }}>
                        Nincs beolvasható tétel – ellenőrizd a fejléc sort és a „Megnevezés" / „Nettó díj" megfeleltetést.
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {preview.rows.length > 60 && (
                <p style={{ fontSize: 11, color: C.muted, margin: "6px 0 0" }}>…és további {preview.rows.length - 60} tétel (mind importálódik).</p>
              )}

              <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13, color: C.textSub, cursor: "pointer" }}>
                <input type="checkbox" checked={clearFirst} onChange={e => setClear(e.target.checked)} style={{ width: 16, height: 16, accentColor: C.danger }} />
                A fővállalkozó meglévő díjtételeinek törlése import előtt (teljes csere)
              </label>
            </>
          )}
        </div>

        {/* Lábléc */}
        {sheets && (
          <div style={{ padding: "14px 24px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <button onClick={() => { setSheets(null); setFileName(""); setHiba(""); }}
              style={{ padding: "8px 14px", border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: FONT, fontSize: 13 }}>
              ← Másik fájl
            </button>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={onClose} style={{ padding: "8px 16px", border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: FONT }}>Mégse</button>
              <button onClick={doImport} disabled={!canImport || busy}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 20px", background: canImport && !busy ? C.accent : C.border, color: "#fff", border: "none", borderRadius: 8, cursor: canImport && !busy ? "pointer" : "default", fontWeight: 700, fontFamily: FONT }}>
                <Check size={15} /> {busy ? "Import…" : `${preview.rows.length} tétel importálása`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = { textAlign: "left", padding: "8px 11px", fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .5, background: C.bg, borderBottom: `1.5px solid ${C.border}`, whiteSpace: "nowrap" };
const tdStyle = { padding: "7px 11px", borderBottom: `1px solid ${C.bg}`, color: C.text, verticalAlign: "middle" };
