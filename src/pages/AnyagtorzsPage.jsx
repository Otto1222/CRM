/**
 * AnyagtorzsPage.jsx – Egységes Anyagtörzs admin felület
 * Beállítások → Anyagtörzs
 *
 * Ugyanaz a localStorage["anyagtorzs"] adatforrás amit az Árajánlat is használ.
 */
import { useState } from "react";
import { Plus, Pencil, Trash2, Save, Info } from "lucide-react";
import { C, FONT } from "../lib/constants";
import { ft } from "../lib/helpers";
import {
  loadAnyagtorzs, saveAnyagtorzs, createAnyag,
  updateAnyag, deleteAnyag,
  AJANLAT_KATEGORIAK, TELEPITOI_KATEGORIAK,
} from "../lib/anyagtorzs";

const EGYSEGEK = ["db", "m", "m²", "m³", "kg", "kész", "csomag", "tekercs", "pár"];

function AnyagSor({ anyag, onEdit, onDelete, onToggle }) {
  const tKat = TELEPITOI_KATEGORIAK.find(k => k.id === anyag.telepitoi_kategoria)?.label || anyag.telepitoi_kategoria || "—";
  const aKat = AJANLAT_KATEGORIAK.find(k => k.id === anyag.kategoria)?.label || anyag.kategoria || "—";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      background: anyag.aktiv ? "#fff" : C.bg, borderBottom: `1px solid ${C.border}`,
      opacity: anyag.aktiv ? 1 : .5 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 13, color: C.text, margin: 0 }}>{anyag.nev}</p>
        <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0" }}>
          {tKat} · {anyag.egyseg}
          {anyag.netto_egysegar > 0 && <span style={{ color: C.success, marginLeft: 6, fontWeight: 600 }}>{ft(anyag.netto_egysegar)}/{anyag.egyseg}</span>}
          <span style={{ color: C.muted, marginLeft: 6 }}>· Ajánlat: {aKat}</span>
        </p>
      </div>
      <button onClick={() => onToggle(anyag)}
        style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, border: "none",
          background: anyag.aktiv ? C.successLight : C.bg, color: anyag.aktiv ? C.success : C.muted, cursor: "pointer" }}>
        {anyag.aktiv ? "Aktív" : "Inaktív"}
      </button>
      <button onClick={() => onEdit(anyag)} style={{ padding: "5px 9px", background: C.accentLight, color: C.accent, border: "none", borderRadius: 7, cursor: "pointer" }}>
        <Pencil size={13} />
      </button>
      <button onClick={() => { if (window.confirm(`Törlöd: ${anyag.nev}?`)) onDelete(anyag.id); }}
        style={{ padding: "5px 9px", background: C.dangerLight, color: C.danger, border: "none", borderRadius: 7, cursor: "pointer" }}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function AnyagForm({ anyag, onSave, onClose }) {
  const isNew = !anyag?.id;
  const [form, setForm] = useState({
    nev:                  anyag?.nev || "",
    telepitoi_kategoria:  anyag?.telepitoi_kategoria || "kabel",
    kategoria:            anyag?.kategoria || "villanyszereles",
    egyseg:               anyag?.egyseg || "db",
    netto_egysegar:       anyag?.netto_egysegar || anyag?.egysegAr || 0,
    megjegyzes:           anyag?.megjegyzes || "",
  });
  const inp = { width: "100%", boxSizing: "border-box", padding: "9px 12px",
    border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: FONT, outline: "none" };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 440, padding: 22, fontFamily: FONT, maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 16px", color: C.text }}>{isNew ? "Új anyag / termék" : "Szerkesztés"}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Megnevezés *</label>
            <input value={form.nev} onChange={e => setForm(p => ({...p, nev: e.target.value}))} placeholder="pl. DC kábel 6 mm²" style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Egység</label>
              <select value={form.egyseg} onChange={e => setForm(p => ({...p, egyseg: e.target.value}))} style={inp}>
                {EGYSEGEK.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Nettó egységár (Ft)</label>
              <input type="number" min="0" value={form.netto_egysegar}
                onChange={e => setForm(p => ({...p, netto_egysegar: Number(e.target.value)}))}
                placeholder="0" style={inp} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Telepítő kategória (szűrő a helyszíni felületen)</label>
            <select value={form.telepitoi_kategoria} onChange={e => setForm(p => ({...p, telepitoi_kategoria: e.target.value}))} style={inp}>
              {TELEPITOI_KATEGORIAK.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Árajánlat kategória (melyik főtételhez tartozik)</label>
            <select value={form.kategoria} onChange={e => setForm(p => ({...p, kategoria: e.target.value}))} style={inp}>
              {AJANLAT_KATEGORIAK.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", border: `1.5px solid ${C.border}`, borderRadius: 9, background: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: FONT }}>Mégse</button>
          <button onClick={() => { if (!form.nev.trim()) return; onSave(form); }}
            style={{ flex: 2, padding: "10px", background: C.accent, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontFamily: FONT }}>
            {isNew ? "+ Hozzáadás" : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnyagtorzsPage() {
  const [anyagok, setAnyagok] = useState(loadAnyagtorzs);
  const [editAnyag, setEditAnyag] = useState(null);
  const [ujOpen, setUjOpen]       = useState(false);
  const [szuroKat, setSzuroKat]   = useState("mind");

  function reload() { setAnyagok(loadAnyagtorzs()); }

  function handleSave(form) {
    if (editAnyag?.id) updateAnyag(editAnyag.id, form);
    else               createAnyag(form);
    setEditAnyag(null); setUjOpen(false); reload();
  }

  const szurt = szuroKat === "mind" ? anyagok
    : anyagok.filter(a => a.telepitoi_kategoria === szuroKat);

  return (
    <div style={{ padding: "16px", fontFamily: FONT, maxWidth: 620 }}>
      {/* Info banner */}
      <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 8, fontSize: 12, color: "#0369A1" }}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Ez az <b>egyetlen</b> anyagtörzs az egész rendszerben. Ugyanebből dolgozik az <b>Árajánlat készítő</b>, a <b>Telepítő felület</b> és a <b>Projekt pénzügy</b>.</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 18, margin: 0, color: C.text }}>Anyagtörzs</h2>
          <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>{anyagok.filter(a => a.aktiv).length} aktív · {anyagok.length} összesen</p>
        </div>
        <button onClick={() => setUjOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: C.accent, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontFamily: FONT }}>
          <Plus size={14} /> Új anyag
        </button>
      </div>

      {/* Szűrő */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
        {[{ id: "mind", label: "Mind" }, ...TELEPITOI_KATEGORIAK].map(k => (
          <button key={k.id} onClick={() => setSzuroKat(k.id)}
            style={{ padding: "5px 11px", borderRadius: 20, border: `1.5px solid ${szuroKat === k.id ? C.accent : C.border}`,
              background: szuroKat === k.id ? C.accent : "#fff", color: szuroKat === k.id ? "#fff" : C.textSub,
              cursor: "pointer", fontSize: 12, fontFamily: FONT, fontWeight: szuroKat === k.id ? 700 : 400 }}>
            {k.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        {szurt.length === 0
          ? <p style={{ textAlign: "center", color: C.muted, padding: "28px 0", fontSize: 13 }}>Nincs anyag ebben a kategóriában</p>
          : szurt.map(a => (
            <AnyagSor key={a.id} anyag={a}
              onEdit={a => setEditAnyag(a)}
              onDelete={id => { deleteAnyag(id); reload(); }}
              onToggle={a => { updateAnyag(a.id, { aktiv: !a.aktiv }); reload(); }} />
          ))
        }
      </div>

      {(ujOpen || editAnyag) && (
        <AnyagForm anyag={editAnyag} onSave={handleSave}
          onClose={() => { setEditAnyag(null); setUjOpen(false); }} />
      )}
    </div>
  );
}
