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
import { TIG_XLSX_FEJLEC_KONVENCIO } from "../lib/tigXlsxService.js";

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
        <div style={{ marginTop: 8, padding: "8px 10px", background: "#fff", border: `1px dashed ${C.border}`, borderRadius: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.textSub, margin: "0 0 4px" }}>
            Fix elrendezés – ezt a sablonnak követnie kell:
          </p>
          <p style={{ fontSize: 10.5, color: C.muted, margin: 0, lineHeight: 1.6 }}>
            A kitöltendő fül neve: <b>{TIG_XLSX_FEJLEC_KONVENCIO.munkalap}</b>. Ezen a fülön a rendszer
            automatikusan (a projekt adataiból, nincs kézi bevitel) ide írja:
            Ügyfél neve → <b>{TIG_XLSX_FEJLEC_KONVENCIO.ugyfelNev}</b>,
            Projekt száma → <b>{TIG_XLSX_FEJLEC_KONVENCIO.projektSzam}</b>,
            Dátum → <b>{TIG_XLSX_FEJLEC_KONVENCIO.datum}</b>,
            Irányítószám → <b>{TIG_XLSX_FEJLEC_KONVENCIO.iranyitoszam}</b>,
            Város → <b>{TIG_XLSX_FEJLEC_KONVENCIO.varos}</b>,
            Cím maradéka → <b>{TIG_XLSX_FEJLEC_KONVENCIO.cimMaradek}</b>.
            Ez minden fővállalkozónál ugyanaz – ha egy sablon máshogy van felépítve, ezekre a
            cellákra kell rendezni a fejlécét. A tétel-sorok (mennyiség/ár) helyét viszont a
            díjtétel-katalógus egyes tételein állítod be ("TIG cella", lentebb).
          </p>
        </div>
      ) : (
        <p style={{ fontSize: 10, color: C.muted, marginTop: 6, marginBottom: 0 }}>
          A sablonban a {"{"}#tetelek{"}"}…{"{"}/tetelek{"}"} táblázat-sor tölti ki a tételeket – töltsd le a minta sablont kiindulásnak, és igazítsd a fővállalkozó valódi TIG formátumához.
        </p>
      )}
    </div>
  );
}
