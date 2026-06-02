import { useState, useEffect } from "react";
import { Plus, Receipt, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { C, FONT } from "../../../lib/constants.js";
import { loadSzamlak, createSzamla } from "../../szamlak/szamla.service.js";
import { ft } from "../../../lib/helpers.js";

function StatusBadge({ statusz }) {
  const cfg = {
    "Kiállítva":    { bg: "#FFFBEB", color: "#D97706" },
    "Fizetésre vár":{ bg: "#EFF6FF", color: "#2563EB" },
    "Fizetve":      { bg: "#ECFDF5", color: "#059669" },
    "Késedelmes":   { bg: "#FEF2F2", color: "#DC2626" },
    "Sztornó":      { bg: "#F8FAFC", color: "#94A3B8" },
  }[statusz] || { bg: "#F8FAFC", color: "#64748B" };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
      {statusz}
    </span>
  );
}

export default function TabSzamlazas({ projekt, currentUser }) {
  const [szamlak, setSzamlak] = useState([]);
  const [ujOpen, setUjOpen]   = useState(false);
  const [form, setForm]       = useState({ tipus: "kimeno", szamlaSzam: "", kiallitasDatum: new Date().toISOString().slice(0,10), fizetesiHatarido: "", nettoOsszeg: "", megjegyzes: "" });

  function load() {
    const all = loadSzamlak();
    setSzamlak(all.filter(s => s.projektId === projekt.id));
  }

  useEffect(() => {
    load();
    const handler = (e) => { if (!e.detail?.collection || e.detail.collection === "szamlak") load(); };
    window.addEventListener("crm-db-updated", handler);
    return () => window.removeEventListener("crm-db-updated", handler);
  }, [projekt.id]);

  function handleSave() {
    if (!form.szamlaSzam || !form.nettoOsszeg) {
      alert("Számlaszám és nettó összeg kötelező!");
      return;
    }
    createSzamla({
      ...form,
      nettoOsszeg: Number(form.nettoOsszeg),
      projektId:   projekt.id,
      projektKod:  projekt.projektkod,
      clientNev:   projekt.clientNev || "",
    }, currentUser?.name || "");
    setUjOpen(false);
    setForm({ tipus: "kimeno", szamlaSzam: "", kiallitasDatum: new Date().toISOString().slice(0,10), fizetesiHatarido: "", nettoOsszeg: "", megjegyzes: "" });
  }

  const osszesBrutto = szamlak.filter(s => s.tipus === "kimeno").reduce((s, x) => s + (x.bruttoOsszeg || 0), 0);
  const fizetve      = szamlak.filter(s => s.statusz === "Fizetve").reduce((s, x) => s + (x.bruttoOsszeg || 0), 0);
  const varakozik    = osszesBrutto - fizetve;

  const inp = { width: "100%", boxSizing: "border-box", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: FONT, outline: "none" };

  return (
    <div style={{ paddingTop: 16, fontFamily: FONT }}>
      {/* KPI sor */}
      {szamlak.length > 0 && (
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          {[
            { label: "Kimenő számlák", value: ft(osszesBrutto), color: C.success,  bg: "#ECFDF5" },
            { label: "Fizetve",        value: ft(fizetve),       color: "#0369A1",  bg: "#F0F9FF" },
            { label: "Várakozik",      value: ft(varakozik),     color: C.warning,  bg: "#FFFBEB" },
          ].map(k => (
            <div key={k.label} style={{ background: k.bg, borderRadius: 12, padding: "12px 16px", flex: 1, minWidth: 140, border: `1px solid ${k.color}30` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: k.color, textTransform: "uppercase", letterSpacing: .7, margin: "0 0 4px" }}>{k.label}</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: k.color, margin: 0 }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Fejléc + Új gomb */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: C.text, margin: 0 }}>Számlák ({szamlak.length} db)</p>
        <button onClick={() => setUjOpen(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: C.accent, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT }}>
          <Plus size={14} /> Új számla
        </button>
      </div>

      {/* Lista */}
      {szamlak.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>
          <Receipt size={36} style={{ opacity: .2, display: "block", margin: "0 auto 10px" }} />
          <p style={{ fontSize: 13 }}>Nincs számla ehhez a projekthez</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {szamlak.map(s => (
            <div key={s.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <Receipt size={16} color={s.tipus === "kimeno" ? C.success : C.warning} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 120 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: C.text, margin: 0 }}>{s.szamlaSzam || s.id}</p>
                <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0" }}>
                  {s.tipus === "kimeno" ? "Kimenő" : "Bejövő"} · {s.kiallitasDatum} · {s.clientNev || projekt.clientNev}
                </p>
              </div>
              <p style={{ fontWeight: 800, fontSize: 14, color: C.text, margin: 0, flexShrink: 0 }}>{ft(s.bruttoOsszeg || 0)}</p>
              <StatusBadge statusz={s.statusz} />
            </div>
          ))}
        </div>
      )}

      {/* Új számla modal */}
      {ujOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 460, padding: 24, fontFamily: FONT, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 18px", color: C.text }}>Új számla – {projekt.projektkod}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>Típus</label>
                <select value={form.tipus} onChange={e => setForm(p => ({...p, tipus: e.target.value}))} style={inp}>
                  <option value="kimeno">Kimenő (vevői)</option>
                  <option value="bejovo">Bejövő (szállítói)</option>
                </select>
              </div>
              {[
                { label: "Számlaszám *", key: "szamlaSzam", ph: "pl. 2026/001" },
                { label: "Kiállítás dátuma", key: "kiallitasDatum", type: "date" },
                { label: "Fizetési határidő", key: "fizetesiHatarido", type: "date" },
                { label: "Nettó összeg (Ft) *", key: "nettoOsszeg", type: "number", ph: "pl. 1200000" },
                { label: "Megjegyzés", key: "megjegyzes", ph: "Opcionális megjegyzés" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>{f.label}</label>
                  <input type={f.type || "text"} value={form[f.key]} placeholder={f.ph}
                    onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))} style={inp} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setUjOpen(false)} style={{ flex: 1, padding: "11px", border: `1.5px solid ${C.border}`, borderRadius: 9, background: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: FONT }}>Mégse</button>
              <button onClick={handleSave} style={{ flex: 2, padding: "11px", background: C.accent, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontFamily: FONT }}>Mentés</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
