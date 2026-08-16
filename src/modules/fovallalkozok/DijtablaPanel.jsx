/**
 * DijtablaPanel.jsx
 * Tételes díjtábla szerkesztő egy fővállalkozóhoz.
 * A Fővállalkozók oldal kinyitott kártyájában jelenik meg, az elszámolási
 * szabályok alatt. (Rendszerterv – 1. fázis.)
 */

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, X, DownloadCloud, Truck } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../lib/constants.js";
import { ft } from "../../lib/helpers.js";
import { DIJTETEL_EGYSEGEK, egysegLabel, groupByCsoport } from "./dijtabla.schema.js";
import {
  getDijtetelekByFovallalkozo, createDijtetel, updateDijtetel,
  deleteDijtetel, seedGreenHomeDijtabla,
} from "./dijtabla.service.js";

const inp = {
  width: "100%", boxSizing: "border-box", padding: "8px 11px",
  border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13,
  fontFamily: "inherit", outline: "none",
};

const FL = ({ label, children, half }) => (
  <div style={{ gridColumn: half ? "span 1" : "span 2" }}>
    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: .6 }}>
      {label}
    </label>
    {children}
  </div>
);

// ─── Tétel szerkesztő modal ───────────────────────────────────
function DijtetelForm({ tetel, onSave, onClose }) {
  const isNew = !tetel?.id;
  const [f, setF] = useState({
    kod:            tetel?.kod            || "",
    csoport:        tetel?.csoport        || "",
    megnevezes:     tetel?.megnevezes     || "",
    egyseg:         tetel?.egyseg         || "db",
    nettoDij:       tetel?.nettoDij       || 0,
    kmDijas:        tetel?.kmDijas        ?? false,
    minMennyiseg:   tetel?.minMennyiseg   || 0,
    egyediArFelett: tetel?.egyediArFelett ?? "",
    megjegyzes:     tetel?.megjegyzes     || "",
    aktiv:          tetel?.aktiv          ?? true,
  });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));

  function save() {
    onSave({
      ...f,
      nettoDij:       Number(f.nettoDij) || 0,
      minMennyiseg:   Number(f.minMennyiseg) || 0,
      egyediArFelett: f.egyediArFelett === "" ? null : Number(f.egyediArFelett),
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 560, padding: 24, fontFamily: FONT, maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontFamily: FONT_HEADING, fontSize: 16, fontWeight: 800, margin: 0 }}>
            {isNew ? "Új díjtétel" : "Díjtétel szerkesztése"}
          </h3>
          <button onClick={onClose} style={{ padding: "4px 8px", border: "none", background: "none", cursor: "pointer", color: C.muted }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 14px" }}>
          <FL label="Kód" half>
            <input value={f.kod} onChange={e => u("kod", e.target.value)} placeholder="pl. A01" style={inp} />
          </FL>
          <FL label="Egység" half>
            <select value={f.egyseg} onChange={e => u("egyseg", e.target.value)} style={inp}>
              {DIJTETEL_EGYSEGEK.map(e => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </FL>
          <FL label="Csoport">
            <input value={f.csoport} onChange={e => u("csoport", e.target.value)} placeholder="pl. A) Alaptelepítés / kivitelezés" style={inp} />
          </FL>
          <FL label="Megnevezés">
            <input value={f.megnevezes} onChange={e => u("megnevezes", e.target.value)} placeholder="pl. Napelem kivitelezés – teljes anyagvásárlással" style={inp} />
          </FL>
          <FL label="Nettó díj (Ft / egység)" half>
            <input type="number" min={0} value={f.nettoDij} onChange={e => u("nettoDij", e.target.value)} style={inp} />
          </FL>
          <FL label="Min. mennyiség (0 = nincs)" half>
            <input type="number" min={0} value={f.minMennyiseg} onChange={e => u("minMennyiseg", e.target.value)} placeholder="0" style={inp} />
          </FL>
          <FL label="Egyedi ár e felett (üres = nincs)" half>
            <input type="number" min={0} value={f.egyediArFelett} onChange={e => u("egyediArFelett", e.target.value)} placeholder="pl. 30" style={inp} />
          </FL>
          <FL label="Kiszállási (km) díj" half>
            <label style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={f.kmDijas} onChange={e => u("kmDijas", e.target.checked)} style={{ width: 16, height: 16, accentColor: C.accent }} />
              <span style={{ fontSize: 13, color: f.kmDijas ? C.warning : C.muted, fontWeight: 600 }}>
                {f.kmDijas ? "Km-díjas (+ kiszállás)" : "Nincs km-díj"}
              </span>
            </label>
          </FL>
          <FL label="Megjegyzés">
            <input value={f.megjegyzes} onChange={e => u("megjegyzes", e.target.value)} placeholder="feltételek, kikötések…" style={inp} />
          </FL>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: FONT }}>
            Mégse
          </button>
          <button onClick={save} disabled={!f.megnevezes.trim()}
            style={{ padding: "8px 20px", background: f.megnevezes.trim() ? C.accent : C.border, color: "#fff", border: "none", borderRadius: 8, cursor: f.megnevezes.trim() ? "pointer" : "default", fontWeight: 700, fontFamily: FONT }}>
            {isNew ? "Létrehozás" : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Egy tétel sor ────────────────────────────────────────────
function TetelSor({ t, onEdit, onDelete }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
      borderBottom: `1px solid ${C.bg}`, opacity: t.aktiv === false ? 0.5 : 1,
    }}>
      <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: C.accent, minWidth: 38 }}>{t.kod || "—"}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{t.megnevezes}</div>
        {(t.megjegyzes || t.minMennyiseg > 0 || t.egyediArFelett) && (
          <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
            {t.minMennyiseg > 0 && `min. ${t.minMennyiseg} ${egysegLabel(t.egyseg)} · `}
            {t.egyediArFelett && `${t.egyediArFelett} felett egyedi ár · `}
            {t.megjegyzes}
          </div>
        )}
      </div>
      {t.kmDijas && (
        <span title="Km-díjas (kiszállási díj hozzáadható)" style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 700, background: "#FEF3E2", color: C.warning, padding: "2px 7px", borderRadius: 20 }}>
          <Truck size={10} /> km
        </span>
      )}
      <span style={{ fontSize: 11, color: C.muted, minWidth: 46, textAlign: "right" }}>/ {egysegLabel(t.egyseg)}</span>
      <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: C.text, minWidth: 84, textAlign: "right" }}>{ft(t.nettoDij)}</span>
      <button onClick={onEdit} style={{ padding: "4px 7px", background: C.accentLight, color: C.accent, border: "none", borderRadius: 6, cursor: "pointer" }}>
        <Pencil size={11} />
      </button>
      <button onClick={onDelete} style={{ padding: "4px 6px", background: C.dangerLight, color: C.danger, border: "none", borderRadius: 6, cursor: "pointer" }}>
        <Trash2 size={11} />
      </button>
    </div>
  );
}

// ─── Fő panel ─────────────────────────────────────────────────
export default function DijtablaPanel({ fovallalkozoId, fovallalkozoNev }) {
  const [tetelek, setTetelek] = useState(() => getDijtetelekByFovallalkozo(fovallalkozoId));
  const [uj, setUj]           = useState(false);
  const [szerk, setSzerk]     = useState(null);

  useEffect(() => {
    const fn = e => {
      if (e.detail?.collection === "fovallalkozo_dijtetelek") {
        setTetelek(getDijtetelekByFovallalkozo(fovallalkozoId));
      }
    };
    window.addEventListener("crm-db-updated", fn);
    return () => window.removeEventListener("crm-db-updated", fn);
  }, [fovallalkozoId]);

  function refresh() { setTetelek(getDijtetelekByFovallalkozo(fovallalkozoId)); }

  function handleSave(data) {
    if (szerk?.id) updateDijtetel(szerk.id, data);
    else createDijtetel(fovallalkozoId, data);
    refresh();
    setUj(false);
    setSzerk(null);
  }

  function handleSeed() {
    if (!window.confirm("Betöltöd a Green Home díjtáblát (37 tétel) ehhez a fővállalkozóhoz?")) return;
    const n = seedGreenHomeDijtabla(fovallalkozoId);
    if (n === 0) window.alert("Már van díjtétel ehhez a fővállalkozóhoz – előbb töröld, ha újra akarod tölteni.");
    refresh();
  }

  const groups = groupByCsoport(tetelek);

  return (
    <div style={{ borderTop: "1px solid #F1F5F9", padding: "14px 18px", background: "#FCFDFD" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textSub }}>Tételes díjtábla</span>
          <span style={{ fontSize: 12, color: C.muted, marginLeft: 6 }}>
            ({tetelek.length} tétel — egy sor = egy munkanem + nettó díj)
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tetelek.length === 0 && (
            <button onClick={handleSeed}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: C.successLight, color: C.success, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: FONT }}>
              <DownloadCloud size={13} /> Green Home díjtábla betöltése
            </button>
          )}
          <button onClick={() => { setSzerk(null); setUj(true); }}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: C.accent, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: FONT }}>
            <Plus size={12} /> Új díjtétel
          </button>
        </div>
      </div>

      {tetelek.length === 0 ? (
        <div style={{ textAlign: "center", padding: "22px 0", color: C.muted }}>
          <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Még nincs díjtétel</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>
            Töltsd be a Green Home táblát, vagy vegyél fel tételt kézzel. (Excel/CSV import: 2. fázis.)
          </p>
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", background: "#fff" }}>
          {groups.map(g => (
            <div key={g.csoport}>
              <div style={{ background: C.accentLight, color: C.accent, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, padding: "6px 12px" }}>
                {g.csoport}
              </div>
              {g.items.map(t => (
                <TetelSor key={t.id} t={t}
                  onEdit={() => { setUj(false); setSzerk(t); }}
                  onDelete={() => { if (window.confirm(`Törlöd? „${t.megnevezes}"`)) { deleteDijtetel(t.id); refresh(); } }}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 9, fontSize: 12, color: C.warning }}>
        <strong>Így kapcsolódik a projekthez:</strong> a tételes elszámolásnál (3–4. fázis) ezekből a sorokból
        választasz mennyiséggel, a km-díjas tételekhez a kiszállási díj automatikusan hozzáadódik.
        Amíg nincs díjtábla, a fenti klasszikus elszámolási szabályok érvényesek.
      </div>

      {(uj || szerk) && (
        <DijtetelForm
          tetel={szerk}
          onSave={handleSave}
          onClose={() => { setUj(false); setSzerk(null); }}
        />
      )}
    </div>
  );
}
