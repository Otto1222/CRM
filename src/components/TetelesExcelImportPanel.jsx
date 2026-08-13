/**
 * TetelesExcelImportPanel.jsx
 * P0-007: "Saját munka – elfogadott tételes Excel" import UI.
 *
 * Használat: ProjektForm.jsx-ben, amikor form.sajatMunkaTipus === "tetelesExcel".
 * Kontrollált komponens – a szülő tartja a pillanatképet (value), a panel
 * csak a felöltés/oszlop-hozzárendelés/előnézet lépéseket vezényli le, majd
 * egyetlen kész, immutábilis pillanatképet ad vissza (onChange).
 */
import { useState, useRef } from "react";
import { FileSpreadsheet, Upload, Check, X, AlertTriangle, RefreshCw } from "lucide-react";
import { C, FONT } from "../lib/constants";
import {
  TETEL_MEZOK,
  parseTetelesExcelFile,
  guessColumnMap,
  buildTetelekFromRows,
  buildExcelPillanatkep,
} from "../lib/tetelesExcelImport";

const selectStyle = {
  width: "100%", padding: "7px 10px", border: `1.5px solid ${C.border}`, borderRadius: 8,
  fontSize: 13, fontFamily: FONT, outline: "none", background: "#fff", color: C.text,
};

export default function TetelesExcelImportPanel({ value, onChange, disabled }) {
  const [stage, setStage]       = useState("idle"); // idle | mapping | preview
  const [fileName, setFileName] = useState("");
  const [fejlec, setFejlec]     = useState([]);
  const [sorok, setSorok]       = useState([]);
  const [columnMap, setColumnMap] = useState({});
  const [hiba, setHiba]         = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    setHiba("");
    try {
      const { fejlec: fj, sorok: sr } = await parseTetelesExcelFile(file);
      setFileName(file.name);
      setFejlec(fj);
      setSorok(sr);
      setColumnMap(guessColumnMap(fj));
      setStage("mapping");
    } catch (e) {
      setHiba(e.message || "Fájl olvasási hiba.");
    }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  const kotelezoMezokHianyzanak = TETEL_MEZOK.filter(m => m.kotelezo && columnMap[m.key] === undefined);
  const { tetelek: elonezetTetelek, hibasSorok } = stage === "preview" || stage === "mapping"
    ? buildTetelekFromRows(sorok, columnMap)
    : { tetelek: [], hibasSorok: [] };

  function handleMegerosites() {
    if (kotelezoMezokHianyzanak.length > 0) {
      setHiba("Kötelező mező hozzárendelése hiányzik: " + kotelezoMezokHianyzanak.map(m => m.label).join(", "));
      return;
    }
    if (elonezetTetelek.length === 0) {
      setHiba("Nincs érvényes tétel a fájlban – ellenőrizd az oszlop-hozzárendelést.");
      return;
    }
    const pillanatkep = buildExcelPillanatkep(fileName, elonezetTetelek);
    onChange(pillanatkep);
    setStage("idle");
  }

  function handleUjraimportalas() {
    onChange(null);
    setStage("idle");
    setFejlec([]); setSorok([]); setColumnMap({}); setFileName(""); setHiba("");
  }

  // ─── Már van megerősített importálás – összegző kártya ──────
  if (value && stage === "idle") {
    return (
      <div style={{ background: "#fff", border: `1.5px solid ${C.success}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <Check size={18} color={C.success} />
          <p style={{ fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>Tételes Excel importálva</p>
        </div>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Fájl: <b>{value.fileName || "—"}</b></p>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>Tételek száma: <b>{value.tetelek?.length || 0}</b></p>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
          Összesen (nettó): <b>{(value.osszesito?.netto_osszeg || 0).toLocaleString("hu-HU")} Ft</b>
        </p>
        {!disabled && (
          <button type="button" onClick={handleUjraimportalas}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", border: `1.5px solid ${C.border}`, borderRadius: 8, background: "#fff", color: C.textSub, cursor: "pointer", fontSize: 13, fontFamily: FONT }}>
            <RefreshCw size={14} /> Másik fájl importálása
          </button>
        )}
      </div>
    );
  }

  // ─── Feltöltés ────────────────────────────────────────────────
  if (stage === "idle") {
    return (
      <div>
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
          <p style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 4 }}>Elfogadott tételes Excel feltöltése</p>
          <p style={{ fontSize: 12, color: C.muted }}>Húzd ide a fájlt, vagy kattints a kiválasztáshoz</p>
          <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>.xlsx · .xls · .csv</p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
            onChange={e => handleFile(e.target.files[0])} />
        </div>
        {hiba && (
          <p style={{ fontSize: 12, color: C.danger, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} /> {hiba}
          </p>
        )}
      </div>
    );
  }

  // ─── Oszlop-hozzárendelés + előnézet ───────────────────────────
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>📄 {fileName} – {sorok.length} sor</p>
        <button type="button" onClick={() => setStage("idle")}
          style={{ border: "none", background: "none", cursor: "pointer", color: C.muted, display: "flex", alignItems: "center" }}>
          <X size={16} />
        </button>
      </div>

      <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
        Oszlopok hozzárendelése
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 14 }}>
        {TETEL_MEZOK.map(mezo => (
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

      <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
        Előnézet ({elonezetTetelek.length} érvényes tétel{hibasSorok.length > 0 ? `, ${hibasSorok.length} hibás sor` : ""})
      </p>

      {hibasSorok.length > 0 && (
        <div style={{ background: C.dangerLight, border: `1px solid ${C.dangerLight}`, borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 12, color: C.danger }}>
          <AlertTriangle size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
          {hibasSorok.length} sor kimarad az importból hiba miatt (pl. hiányzó megnevezés/mennyiség). Ellenőrizd az oszlop-hozzárendelést, vagy javítsd a fájlban és töltsd fel újra.
        </div>
      )}

      <div style={{ maxHeight: 260, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 14 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.bg, position: "sticky", top: 0 }}>
              <th style={{ textAlign: "left", padding: "6px 10px" }}>Megnevezés</th>
              <th style={{ textAlign: "right", padding: "6px 10px" }}>Mennyiség</th>
              <th style={{ textAlign: "left", padding: "6px 10px" }}>Egység</th>
              <th style={{ textAlign: "right", padding: "6px 10px" }}>Egységár</th>
              <th style={{ textAlign: "right", padding: "6px 10px" }}>Összesen</th>
            </tr>
          </thead>
          <tbody>
            {elonezetTetelek.map((t, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${C.bg}` }}>
                <td style={{ padding: "5px 10px" }}>{t.nev}</td>
                <td style={{ padding: "5px 10px", textAlign: "right" }}>{t.mennyiseg}</td>
                <td style={{ padding: "5px 10px" }}>{t.egyseg}</td>
                <td style={{ padding: "5px 10px", textAlign: "right" }}>{t.egysegar ? t.egysegar.toLocaleString("hu-HU") : "—"}</td>
                <td style={{ padding: "5px 10px", textAlign: "right", fontWeight: 600 }}>{t.osszesen.toLocaleString("hu-HU")}</td>
              </tr>
            ))}
            {elonezetTetelek.length === 0 && (
              <tr><td colSpan={5} style={{ padding: "16px", textAlign: "center", color: C.muted }}>Nincs érvényes sor – rendeld hozzá a kötelező oszlopokat.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {elonezetTetelek.length > 0 && (
        <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>
          Összesen (nettó): {elonezetTetelek.reduce((s, t) => s + t.osszesen, 0).toLocaleString("hu-HU")} Ft
        </p>
      )}

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
          color: "#fff", fontWeight: 700, fontSize: 14, cursor: (kotelezoMezokHianyzanak.length > 0 || elonezetTetelek.length === 0) ? "not-allowed" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT,
        }}
      >
        <Upload size={16} /> Megerősítés és importálás ({elonezetTetelek.length} tétel)
      </button>
    </div>
  );
}
