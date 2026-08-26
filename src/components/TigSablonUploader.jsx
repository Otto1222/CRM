/**
 * TigSablonUploader.jsx
 * Fővállalkozónkénti TIG (Teljesítési Igazolás) Word-sablon feltöltése +
 * a TIG-kiállítás módjának (munkánkénti / időszaki összesített) beállítása.
 * Ugyanaz a minta, mint a VBF sablon feltöltése (VbfAdminCard.jsx /
 * vbfDocxService.js), csak fővállalkozónként külön tárolva – ld.
 * tigDocxService.js.
 */
import { useRef, useState } from "react";
import { Upload, Trash2, FileText, Download } from "lucide-react";
import { C, FONT } from "../lib/constants";
import { TIG_MOD_OPCIOK } from "../modules/fovallalkozok/fovallalkozo.schema.js";
import {
  hasTigSablon, saveTigSablon, deleteTigSablon, getTigSablonMeta, readFileAsBase64,
} from "../lib/tigDocxService.js";

export default function TigSablonUploader({ fovallalkozo, onUpdate }) {
  const fileRef = useRef();
  const [busy, setBusy] = useState(false);
  const meta = getTigSablonMeta(fovallalkozo.id);
  const tigMod = fovallalkozo.tigMod || "munkankenti";
  const mintaUrl = tigMod === "idoszaki" ? "/sablonok/TIG_minta_idoszaki.docx" : "/sablonok/TIG_minta_munkankenti.docx";

  async function handleFile(file) {
    if (!file) return;
    if (!file.name.match(/\.(docx|xlsx)$/i)) { alert("Csak .docx vagy .xlsx fájl tölthető fel."); return; }
    setBusy(true);
    try {
      const b64 = await readFileAsBase64(file);
      saveTigSablon(fovallalkozo.id, b64, file.name);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 12, padding: "10px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.textSub }}>📋 TIG (Teljesítési Igazolás)</span>
        <div style={{ display: "flex", gap: 6 }}>
          {TIG_MOD_OPCIOK.map(o => {
            const active = tigMod === o.id;
            return (
              <button key={o.id} type="button" title={o.hint}
                onClick={() => onUpdate(fovallalkozo.id, { tigMod: o.id })}
                style={{ padding: "4px 10px", borderRadius: 7, border: `1.5px solid ${active ? C.accent : C.border}`, background: active ? C.accentLight : "#fff", color: active ? C.accent : C.muted, fontWeight: active ? 700 : 500, fontSize: 11, cursor: "pointer", fontFamily: FONT }}>
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {meta ? (
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.success, fontWeight: 600 }}>
            <FileText size={13} /> {meta.fileName || "Sablon feltöltve"} ({meta.kb} KB)
          </span>
        ) : (
          <span style={{ fontSize: 12, color: C.warning }}>Nincs TIG sablon feltöltve ehhez a fővállalkozóhoz</span>
        )}
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: busy ? C.border : C.accent, color: "#fff", border: "none", borderRadius: 7, cursor: busy ? "default" : "pointer", fontWeight: 600, fontSize: 11, fontFamily: FONT }}>
          <Upload size={11} /> {meta ? "Csere" : "Feltöltés"}
        </button>
        {meta && (
          <button type="button" onClick={() => { if (window.confirm("Törlöd a TIG sablont?")) deleteTigSablon(fovallalkozo.id); }}
            style={{ padding: "5px 8px", background: C.dangerLight, color: C.danger, border: "none", borderRadius: 7, cursor: "pointer" }}>
            <Trash2 size={11} />
          </button>
        )}
        {meta?.fileType !== "xlsx" && (
          <a href={mintaUrl} download style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.accent, textDecoration: "none", fontWeight: 600 }}>
            <Download size={11} /> Minta sablon letöltése
          </a>
        )}
        <input ref={fileRef} type="file" accept=".docx,.xlsx" style={{ display: "none" }}
          onChange={e => handleFile(e.target.files[0])} />
      </div>
      {meta?.fileType === "xlsx" ? (
        <>
          <p style={{ fontSize: 10, color: C.muted, marginTop: 6, marginBottom: 0 }}>
            Excel sablon: a rendszer a lenti cellacímekbe írja a fejléc-adatokat, a tétel-soroké
            pedig a díjtétel-katalógus egyes tételein állítható be ("TIG cella", Fővállalkozók oldal).
          </p>
          <TigXlsxCellaterkep fovallalkozo={fovallalkozo} onUpdate={onUpdate} />
        </>
      ) : (
        <p style={{ fontSize: 10, color: C.muted, marginTop: 6, marginBottom: 0 }}>
          A sablonban a {"{"}#tetelek{"}"}…{"{"}/tetelek{"}"} táblázat-sor tölti ki a tételeket – töltsd le a minta sablont kiindulásnak, és igazítsd a fővállalkozó valódi TIG formátumához.
        </p>
      )}
    </div>
  );
}

/** Egyszeri, fővállalkozónkénti beállítás: hova írja a rendszer a fejléc-
 * mezőket az Excel TIG-sablonban. A tétel-soroké külön, a díjtétel-
 * katalóguson (tigCellaCim), nem itt. */
function TigXlsxCellaterkep({ fovallalkozo, onUpdate }) {
  const cellak = fovallalkozo.tigXlsxCellak || {};
  const mezok = [
    { key: "munkalap",     label: "Munkalap (fül) neve" },
    { key: "ugyfelNev",    label: "Ügyfél neve" },
    { key: "projektSzam",  label: "Projekt száma" },
    { key: "datum",        label: "Dátum" },
    { key: "iranyitoszam", label: "Irányítószám" },
    { key: "varos",        label: "Város" },
    { key: "cimMaradek",   label: "Cím maradéka (utca, hsz.)" },
  ];
  function upd(key, val) {
    onUpdate(fovallalkozo.id, { tigXlsxCellak: { ...cellak, [key]: val } });
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginTop: 8 }}>
      {mezok.map(m => (
        <div key={m.key}>
          <label style={{ fontSize: 10, color: C.muted, display: "block", marginBottom: 2 }}>{m.label}</label>
          <input value={cellak[m.key] || ""} onChange={e => upd(m.key, e.target.value)}
            placeholder={m.key === "munkalap" ? "Kitöltőlap" : "pl. B10"}
            style={{ width: "100%", boxSizing: "border-box", padding: "5px 7px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11.5, fontFamily: FONT }} />
        </div>
      ))}
    </div>
  );
}
