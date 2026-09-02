/**
 * ProjektBulkImportPanel.jsx
 * Tömeges projekt-import Excel/CSV-ből – sok, egyforma jellegű, kis munka
 * (pl. 250 helyszínen egyenként elvégzendő mérés/felmérés egy fővállalkozói
 * megbízás alatt) egyszerre felviteléhez. NEM napelem-specifikus.
 *
 * A "közös" mezőket (fővállalkozó, projektvezető, csapat, munkatípus,
 * anyagelszámolási mód) egyszer adod meg az egész fájlhoz – a soronkénti,
 * Excelből jövő mezők csak a helyszínenként eltérő adatok (ügyfél/helyszín
 * neve, cím, kapcsolattartó, telefon, munkaszám, dátum, megjegyzés).
 *
 * Minden létrehozott projekt "Létrehozva" státuszban indul, admin-
 * ellenőrzési jelzővel az anyagelszámolási módon (ha nem választasz mást) –
 * ugyanaz a minta, mint a rendszer többi "utólag kell befejezni" migrációs
 * esete. A tényleges díjtétel/elszámolási szabály hozzárendelése (ha még
 * nincs kész az árazás) utólag, projektenként vagy a Munkatípusok +
 * Fővállalkozók beállításain keresztül egyszerre is elvégezhető.
 */
import { useState, useRef } from "react";
import { FileSpreadsheet, Upload, X, AlertTriangle, Users2 } from "lucide-react";
import { C, FONT } from "../lib/constants";
import {
  PROJEKT_IMPORT_MEZOK,
  parseProjektExcelFile,
  guessProjektColumnMap,
  buildProjektekFromRows,
} from "../lib/projektBulkImport.js";
import { createProjekt } from "../modules/projektek/projekt.service.js";
import { getAktivFovallalkozok, findSzabaly } from "../modules/fovallalkozok/fovallalkozo.service.js";
import { getAktivCsapatok } from "../modules/csapatok/csapat.service.js";
import { getAktivMunkatipusok } from "../modules/munkatipusok/munkatipus.service.js";
import { getUsers } from "../lib/crmUsers.js";
import {
  ANYAGELSZAMOLASI_MODOK,
  ANYAGELSZAMOLAS_NINCS_KIVALASZTVA,
  ANYAGELSZAMOLASI_MOD_FOVALLALKOZO_HOZOTT_ANYAG,
} from "../lib/workflowRules.js";

const selectStyle = {
  width: "100%", padding: "7px 10px", border: `1.5px solid ${C.border}`, borderRadius: 8,
  fontSize: 13, fontFamily: FONT, outline: "none", background: "#fff", color: C.text,
};
const labelStyle = { fontSize: 11, color: C.muted, display: "block", marginBottom: 3, fontWeight: 600 };

export default function ProjektBulkImportPanel({ currentUser, onClose, onImported }) {
  const [stage, setStage]         = useState("idle"); // idle | mapping
  const [fileName, setFileName]   = useState("");
  const [fejlec, setFejlec]       = useState([]);
  const [sorok, setSorok]         = useState([]);
  const [columnMap, setColumnMap] = useState({});
  const [hiba, setHiba]           = useState("");
  const [dragOver, setDragOver]   = useState(false);
  const [futEsFolyamatban, setFutEsFolyamatban] = useState(false);
  const [eredmeny, setEredmeny]   = useState(null); // { letrehozva, hibas }
  const fileRef = useRef();

  const fovallalkozok = getAktivFovallalkozok();
  const csapatok       = getAktivCsapatok();
  const munkatipusok   = getAktivMunkatipusok();
  const pmList         = getUsers().filter(u => ["Admin", "Projektmenedzser"].includes(u.role));

  const [kozos, setKozos] = useState({
    fovallalkoziId: "",
    projektvezetoId: "",
    csapatId: "",
    munkatipusId: "",
    anyagelszamolasiMod: ANYAGELSZAMOLASI_MOD_FOVALLALKOZO_HOZOTT_ANYAG,
  });

  async function handleFile(file) {
    if (!file) return;
    setHiba("");
    try {
      const { fejlec: fj, sorok: sr } = await parseProjektExcelFile(file);
      setFileName(file.name);
      setFejlec(fj);
      setSorok(sr);
      setColumnMap(guessProjektColumnMap(fj));
      setStage("mapping");
    } catch (e) {
      setHiba(e.message || "Fájl olvasási hiba.");
    }
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  const kotelezoMezokHianyzanak = PROJEKT_IMPORT_MEZOK.filter(m => m.kotelezo && columnMap[m.key] === undefined);
  const { tetelek: elonezetTetelek, hibasSorok } = stage === "mapping"
    ? buildProjektekFromRows(sorok, columnMap)
    : { tetelek: [], hibasSorok: [] };

  const kozosHianyos = !kozos.fovallalkoziId || !kozos.projektvezetoId || !kozos.csapatId;

  async function handleImport() {
    if (kotelezoMezokHianyzanak.length > 0) {
      setHiba("Kötelező mező hozzárendelése hiányzik: " + kotelezoMezokHianyzanak.map(m => m.label).join(", "));
      return;
    }
    if (kozosHianyos) {
      setHiba("A fővállalkozó, a projektvezető és a kivitelező csapat megadása kötelező (közös mezők).");
      return;
    }
    if (elonezetTetelek.length === 0) {
      setHiba("Nincs érvényes sor az importáláshoz – ellenőrizd az oszlop-hozzárendelést.");
      return;
    }
    setHiba("");
    setFutEsFolyamatban(true);

    const fv = fovallalkozok.find(f => f.id === kozos.fovallalkoziId);
    const szabaly = findSzabaly(kozos.fovallalkoziId, kozos.munkatipusId);
    const csapat = csapatok.find(c => c.id === kozos.csapatId);
    const pm = pmList.find(u => u.id === kozos.projektvezetoId);

    let letrehozva = 0;
    const hibas = [];
    for (const t of elonezetTetelek) {
      try {
        createProjekt({
          clientNev:      t.clientNev,
          kulsoAzonosito: t.kulsoAzonosito,
          telepitesiCim:  t.telepitesiCim,
          clientCim:      t.telepitesiCim,
          kapcsolattarto: t.kapcsolattarto,
          clientTel:      t.clientTel,
          clientEmail:    t.clientEmail,
          tervezettKezdes: t.tervezettKezdes,
          fovMegjegyzes:  t.fovMegjegyzes,
          forrás:         "fovallalkozoi_munka",
          tipus:          kozos.munkatipusId || "Egyéb",
          csapatId:       kozos.csapatId,
          csapatNev:      csapat?.nev || "",
          projektvezetoId: kozos.projektvezetoId,
          projektvezetoNev: pm?.name || "",
          anyagelszamolasiMod: kozos.anyagelszamolasiMod || ANYAGELSZAMOLAS_NINCS_KIVALASZTVA,
          adminReviewRequired: !kozos.anyagelszamolasiMod,
          penzugy: {
            fovallalkoziId: kozos.fovallalkoziId,
            munkatipus:     kozos.munkatipusId,
            elszamolasiSzabalyId: szabaly?.id || "",
          },
        }, currentUser?.name || "");
        letrehozva++;
      } catch (e) {
        hibas.push({ nev: t.clientNev, ok: e.message || "Ismeretlen hiba" });
      }
    }
    setFutEsFolyamatban(false);
    setEredmeny({ letrehozva, hibas, fovallalkoNev: fv?.nev || "" });
    if (letrehozva > 0) onImported?.();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2200, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 760, padding: 20, fontFamily: FONT, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: C.text, display: "flex", alignItems: "center", gap: 7 }}>
              <Users2 size={18} color={C.accent} /> Tömeges projekt-import
            </h3>
            <p style={{ fontSize: 12, color: C.muted, margin: "3px 0 0" }}>Sok, egyforma jellegű munka (pl. sok helyszínes felmérés/mérés) egyszerre felvitele</p>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: C.muted }}>
            <X size={18} />
          </button>
        </div>

        {eredmeny ? (
          <div>
            <div style={{ background: C.successLight, border: `1px solid ${C.success}40`, borderRadius: 10, padding: "14px 16px", marginBottom: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.success, margin: 0 }}>✅ {eredmeny.letrehozva} projekt sikeresen létrehozva</p>
              <p style={{ fontSize: 12, color: C.textSub, margin: "4px 0 0" }}>Fővállalkozó: {eredmeny.fovallalkoNev} · Státusz: Létrehozva – innen a Projektek listáról nyithatók meg egyenként.</p>
            </div>
            {eredmeny.hibas.length > 0 && (
              <div style={{ background: C.dangerLight, border: `1px solid ${C.danger}40`, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: C.danger, margin: "0 0 6px" }}>{eredmeny.hibas.length} sor nem sikerült:</p>
                {eredmeny.hibas.map((h, i) => <p key={i} style={{ fontSize: 12, color: C.dangerHover, margin: "2px 0" }}>{h.nev}: {h.ok}</p>)}
              </div>
            )}
            <button onClick={onClose} style={{ width: "100%", padding: "11px", borderRadius: 10, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: FONT }}>
              Bezárás
            </button>
          </div>
        ) : stage === "idle" ? (
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
              <p style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 4 }}>Helyszín-lista Excel feltöltése</p>
              <p style={{ fontSize: 12, color: C.muted }}>Húzd ide a fájlt, vagy kattints a kiválasztáshoz</p>
              <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>.xlsx · .xls · .csv – tetszőleges oszlopsorrend, a következő lépésben rendeled hozzá. Egy sor = egy létrehozandó projekt.</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }}
                onChange={e => handleFile(e.target.files[0])} />
            </div>
            {hiba && (
              <p style={{ fontSize: 12, color: C.danger, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} /> {hiba}
              </p>
            )}
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: C.text, margin: 0 }}>📄 {fileName} – {sorok.length} sor</p>
              <button type="button" onClick={() => { setStage("idle"); setEredmeny(null); }}
                style={{ fontSize: 11, border: `1px solid ${C.border}`, borderRadius: 7, background: "#fff", cursor: "pointer", padding: "4px 10px", color: C.muted, fontFamily: FONT }}>
                Másik fájl
              </button>
            </div>

            <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
              Közös mezők – az EGÉSZ fájlhoz, egyszer
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14, background: C.bg, borderRadius: 10, padding: 12 }}>
              <div>
                <label style={labelStyle}>Fővállalkozó *</label>
                <select value={kozos.fovallalkoziId} onChange={e => setKozos(p => ({ ...p, fovallalkoziId: e.target.value }))} style={selectStyle}>
                  <option value="">— Válassz —</option>
                  {fovallalkozok.map(f => <option key={f.id} value={f.id}>{f.nev}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Munkatípus</label>
                <select value={kozos.munkatipusId} onChange={e => setKozos(p => ({ ...p, munkatipusId: e.target.value }))} style={selectStyle}>
                  <option value="">— Nincs (Egyéb) —</option>
                  {munkatipusok.map(m => <option key={m.id} value={m.id}>{m.nev}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Projektvezető *</label>
                <select value={kozos.projektvezetoId} onChange={e => setKozos(p => ({ ...p, projektvezetoId: e.target.value }))} style={selectStyle}>
                  <option value="">— Válassz —</option>
                  {pmList.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Kivitelező csapat *</label>
                <select value={kozos.csapatId} onChange={e => setKozos(p => ({ ...p, csapatId: e.target.value }))} style={selectStyle}>
                  <option value="">— Válassz —</option>
                  {csapatok.map(c => <option key={c.id} value={c.id}>{c.nev}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Anyagelszámolási mód</label>
                <select value={kozos.anyagelszamolasiMod} onChange={e => setKozos(p => ({ ...p, anyagelszamolasiMod: e.target.value }))} style={selectStyle}>
                  {ANYAGELSZAMOLASI_MODOK.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                <p style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Ha anyagmozgás nélküli munka (pl. mérés/felmérés), a "Fővállalkozói hozott anyag" a legpontosabb – 0 Ft anyaghaszon, munkadíj-haszon van.</p>
              </div>
            </div>

            <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 }}>
              Oszlopok hozzárendelése – helyszínenként eltérő adatok
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, marginBottom: 14 }}>
              {PROJEKT_IMPORT_MEZOK.map(mezo => (
                <div key={mezo.key}>
                  <label style={{ ...labelStyle, marginBottom: 3 }}>
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
              Előnézet ({elonezetTetelek.length} érvényes projekt{hibasSorok.length > 0 ? `, ${hibasSorok.length} hibás sor` : ""})
            </p>

            {hibasSorok.length > 0 && (
              <div style={{ background: C.dangerLight, border: `1px solid ${C.dangerLight}`, borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 12, color: C.danger }}>
                <AlertTriangle size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />
                {hibasSorok.length} sor kimarad (hiányzó ügyfél/helyszín név). Ellenőrizd az oszlop-hozzárendelést.
              </div>
            )}

            <div style={{ maxHeight: 200, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 8, marginBottom: 14 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.bg, position: "sticky", top: 0 }}>
                    <th style={{ textAlign: "left", padding: "6px 10px" }}>Ügyfél / helyszín</th>
                    <th style={{ textAlign: "left", padding: "6px 10px" }}>Munkaszám</th>
                    <th style={{ textAlign: "left", padding: "6px 10px" }}>Cím</th>
                    <th style={{ textAlign: "left", padding: "6px 10px" }}>Dátum</th>
                  </tr>
                </thead>
                <tbody>
                  {elonezetTetelek.map((t, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.bg}` }}>
                      <td style={{ padding: "5px 10px" }}>{t.clientNev}</td>
                      <td style={{ padding: "5px 10px", color: C.muted }}>{t.kulsoAzonosito || "—"}</td>
                      <td style={{ padding: "5px 10px", color: C.muted, fontSize: 11 }}>{t.telepitesiCim || "—"}</td>
                      <td style={{ padding: "5px 10px", color: C.muted, fontSize: 11 }}>{t.tervezettKezdes || "—"}</td>
                    </tr>
                  ))}
                  {elonezetTetelek.length === 0 && (
                    <tr><td colSpan={4} style={{ padding: "16px", textAlign: "center", color: C.muted }}>Nincs érvényes sor – rendeld hozzá a kötelező oszlopokat.</td></tr>
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
              onClick={handleImport}
              disabled={futEsFolyamatban || kotelezoMezokHianyzanak.length > 0 || elonezetTetelek.length === 0}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "none",
                background: (futEsFolyamatban || kotelezoMezokHianyzanak.length > 0 || elonezetTetelek.length === 0) ? C.border : C.success,
                color: "#fff", fontWeight: 700, fontSize: 14,
                cursor: (futEsFolyamatban || kotelezoMezokHianyzanak.length > 0 || elonezetTetelek.length === 0) ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT,
              }}
            >
              <Upload size={16} /> {futEsFolyamatban ? "Importálás folyamatban…" : `${elonezetTetelek.length} projekt létrehozása`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
