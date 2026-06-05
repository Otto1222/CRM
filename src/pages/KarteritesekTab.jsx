import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Trash2, CheckCircle2, XCircle, AlertTriangle, ChevronDown, Search, Users, Wrench, HelpCircle } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import {
  loadKarteritesek, addKarterites, updateKarterites, deleteKarterites, getKarteritesStatus
} from "../lib/karterites";
import { loadWorkorders } from "../services/workorder.service";
import { getAktivCsapatok, getAktivCsapatTagok } from "../modules/csapatok/csapat.service";
import { ft } from "../lib/helpers";

// ─── Kereshető lenyíló ────────────────────────────────────────
function SearchSelect({ value, onChange, options, placeholder, renderOption, renderValue, disabled }) {
  const [open, setOpen]   = useState(false);
  const [q, setQ]         = useState("");
  const ref               = useRef(null);

  const filtered = useMemo(() =>
    q.trim() === ""
      ? options
      : options.filter(o => {
          const txt = renderOption ? renderOption(o, true) : String(o.label || o.nev || "");
          return txt.toLowerCase().includes(q.toLowerCase());
        }),
    [q, options]
  );

  useEffect(() => {
    function outside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", outside);
    return () => document.removeEventListener("mousedown", outside);
  }, []);

  const selected = options.find(o => o.id === value || o.value === value);
  const displayLabel = selected ? (renderValue ? renderValue(selected) : (selected.label || selected.nev || selected.id)) : "";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        onClick={() => { if (!disabled) { setOpen(o => !o); setQ(""); } }}
        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", border:`1.5px solid ${open ? C.accent : C.border}`, borderRadius:9, background: disabled ? "#F8FAFC" : "#fff", cursor: disabled ? "default" : "pointer", fontSize:14, fontFamily:FONT, color: value ? C.text : C.muted, minHeight:42 }}
      >
        <span style={{ flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {displayLabel || placeholder}
        </span>
        <ChevronDown size={14} color={C.muted} style={{ flexShrink:0, transform: open ? "rotate(180deg)" : "none", transition:"transform .15s" }} />
      </div>

      {open && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:9000, background:"#fff", borderRadius:10, border:`1.5px solid ${C.border}`, boxShadow:"0 8px 24px rgba(0,0,0,.12)", maxHeight:280, display:"flex", flexDirection:"column" }}>
          <div style={{ padding:"8px 10px", borderBottom:`1px solid ${C.border}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, background:"#F8FAFC", borderRadius:7, padding:"6px 10px" }}>
              <Search size={13} color={C.muted} />
              <input
                autoFocus
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Keresés…"
                style={{ border:"none", background:"transparent", outline:"none", fontSize:13, fontFamily:FONT, flex:1, color:C.text }}
              />
            </div>
          </div>
          <div style={{ overflowY:"auto", maxHeight:220 }}>
            {filtered.length === 0
              ? <div style={{ padding:"16px", textAlign:"center", color:C.muted, fontSize:13 }}>Nincs találat</div>
              : filtered.map(o => (
                  <div
                    key={o.id || o.value}
                    onClick={() => { onChange(o.id || o.value); setOpen(false); }}
                    style={{ padding:"10px 14px", cursor:"pointer", background: (o.id || o.value) === value ? "#EFF6FF" : "transparent", borderBottom:`1px solid #F1F5F9`, transition:"background .1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = (o.id || o.value) === value ? "#EFF6FF" : "#F8FAFC"}
                    onMouseLeave={e => e.currentTarget.style.background = (o.id || o.value) === value ? "#EFF6FF" : "transparent"}
                  >
                    {renderOption ? renderOption(o) : <span style={{ fontSize:14, fontFamily:FONT }}>{o.label || o.nev}</span>}
                  </div>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Státusz badge ────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    elfogadott:  { bg:"#F0FDF4", color:"#16A34A", label:"✅ Elfogadott" },
    elutasitott: { bg:"#FEF2F2", color:"#DC2626", label:"❌ Elutasított" },
    fuggoben:    { bg:"#FFFBEB", color:"#D97706", label:"⏳ Függőben" },
  }[status] || { bg:"#FFFBEB", color:"#D97706", label:"⏳ Függőben" };
  return (
    <span style={{ background:cfg.bg, color:cfg.color, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>
      {cfg.label}
    </span>
  );
}

// ─── Felelős badge ────────────────────────────────────────────
function FelelosBadge({ type, snapshot }) {
  const cfg = {
    sajat_csapat: { bg:"#EFF6FF", color:"#2563EB", icon:"👥" },
    alvallalkozo: { bg:"#FFF7ED", color:"#EA580C", icon:"🤝" },
    egyeb:        { bg:"#F8FAFC", color:"#64748B", icon:"❓" },
  }[type] || { bg:"#F8FAFC", color:"#64748B", icon:"❓" };
  return (
    <span style={{ background:cfg.bg, color:cfg.color, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700, display:"inline-flex", alignItems:"center", gap:4 }}>
      {cfg.icon} {snapshot || type}
    </span>
  );
}

const SZURO_OPCIO = [
  { id:"osszes",      label:"Összes" },
  { id:"fuggoben",    label:"Függőben" },
  { id:"elfogadott",  label:"Elfogadott" },
  { id:"elutasitott", label:"Elutasított" },
  { id:"sajat_csapat",label:"Saját csapat" },
  { id:"alvallalkozo",label:"Alvállalkozó" },
];

const FORM_INIT = {
  workOrderId: "", projektId: "", projektKod: "", projektNev: "", munkalapSzam: "",
  osszeg: "", ok: "", datum: new Date().toISOString().slice(0,10),
  responsibleType: "sajat_csapat",
  responsibleTeamId: "", responsibleWorkerId: "", responsibleSubcontractorId: "",
  egyebIndok: "", note: "",
};

export default function KarteritesekTab({ userRole, currentUser }) {
  const [lista, setLista]     = useState(() => loadKarteritesek());
  const [ujModal, setUjModal] = useState(false);
  const [form, setForm]       = useState(FORM_INIT);
  const [szuro, setSzuro]     = useState("osszes");
  const [errors, setErrors]   = useState({});

  const isAdmin = ["Admin", "Projektmenedzser"].includes(userRole);

  // Adatforrások
  const munkalapok = useMemo(() => loadWorkorders(), [ujModal]);
  const csapatok   = useMemo(() => getAktivCsapatok(), [ujModal]);
  const sajatCsapatok = useMemo(() => csapatok.filter(c => c.tipus === "sajat" || !c.tipus), [csapatok]);
  const avCsapatok    = useMemo(() => csapatok.filter(c => c.tipus === "alvallalkozo"), [csapatok]);
  const tagok = useMemo(() =>
    form.responsibleTeamId ? getAktivCsapatTagok(form.responsibleTeamId) : [],
    [form.responsibleTeamId]
  );

  useEffect(() => {
    function refresh() { setLista(loadKarteritesek()); }
    window.addEventListener("crm-db-updated", refresh);
    return () => window.removeEventListener("crm-db-updated", refresh);
  }, []);

  // Munkalap opciók a kereshető lenyílóhoz
  const munkalapOpciok = useMemo(() =>
    munkalapok.map(m => ({
      id: m.id,
      munkalapSzam: m.munkalapSzam || m.id,
      projektId: m.projektId || "",
      projektkod: m.projektkod || m.projektkod || "",
      clientNev: m.clientNev || m.ugyfelNev || "",
      cim: m.cim || m.helyszin || "",
      status: m.status || "",
      datum: m.datum || "",
    })),
    [munkalapok]
  );

  function setF(key, val) { setForm(p => ({ ...p, [key]: val })); }

  function handleMunkalapSelect(munkalapId) {
    const m = munkalapOpciok.find(o => o.id === munkalapId);
    if (m) {
      setForm(p => ({
        ...p,
        workOrderId: m.id,
        projektId: m.projektId,
        projektkod: m.projektkod,
        projektNev: m.clientNev,
        munkalapSzam: m.munkalapSzam,
      }));
    }
  }

  function handleTeamSelect(csapatId) {
    setForm(p => ({ ...p, responsibleTeamId: csapatId, responsibleWorkerId: "" }));
  }

  function buildSnapshot() {
    const { responsibleType, responsibleTeamId, responsibleWorkerId, responsibleSubcontractorId, egyebIndok } = form;
    if (responsibleType === "sajat_csapat") {
      const cs = sajatCsapatok.find(c => c.id === responsibleTeamId);
      const tag = tagok.find(t => t.id === responsibleWorkerId);
      if (tag) return `${cs?.nev || ""} – ${tag.nev}`;
      return cs?.nev || "";
    }
    if (responsibleType === "alvallalkozo") {
      const cs = avCsapatok.find(c => c.id === responsibleSubcontractorId);
      return cs?.nev || "";
    }
    return egyebIndok;
  }

  function validate() {
    const e = {};
    if (!form.workOrderId) e.workOrderId = "Munkalap kiválasztása kötelező";
    if (!form.osszeg || Number(form.osszeg) <= 0) e.osszeg = "Összeg megadása kötelező";
    if (!form.ok.trim()) e.ok = "Kártérítés oka kötelező";
    if (form.responsibleType === "sajat_csapat" && !form.responsibleTeamId) e.responsibleTeamId = "Csapat kiválasztása kötelező";
    if (form.responsibleType === "alvallalkozo" && !form.responsibleSubcontractorId) e.responsibleSubcontractorId = "Alvállalkozó kiválasztása kötelező";
    if (form.responsibleType === "egyeb" && !form.egyebIndok.trim()) e.egyebIndok = "Indoklás megadása kötelező";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleAdd() {
    if (!validate()) return;
    const snapshot = buildSnapshot();
    addKarterites({
      ...form,
      osszeg: Number(form.osszeg),
      responsibleNameSnapshot: snapshot,
      note: form.note,
      createdBy: currentUser?.name || currentUser?.email || "Admin",
    });
    setLista(loadKarteritesek());
    setForm(FORM_INIT);
    setErrors({});
    setUjModal(false);
  }

  function handleDontse(id, status) {
    updateKarterites(id, { status });
    setLista(loadKarteritesek());
  }

  function handleDelete(id) {
    if (!window.confirm("Biztosan törlöd ezt a kártérítési tételt?")) return;
    deleteKarterites(id);
    setLista(loadKarteritesek());
  }

  // Szűrt lista
  const szurtLista = useMemo(() => {
    return lista.filter(k => {
      const st = getKarteritesStatus(k);
      if (szuro === "osszes")       return true;
      if (szuro === "fuggoben")     return st === "fuggoben";
      if (szuro === "elfogadott")   return st === "elfogadott";
      if (szuro === "elutasitott")  return st === "elutasitott";
      if (szuro === "sajat_csapat") return k.responsibleType === "sajat_csapat";
      if (szuro === "alvallalkozo") return k.responsibleType === "alvallalkozo";
      return true;
    });
  }, [lista, szuro]);

  const elfogadottOsszeg = lista.filter(k => getKarteritesStatus(k) === "elfogadott").reduce((s,k) => s + (k.osszeg||0), 0);
  const fuggobenOsszeg   = lista.filter(k => getKarteritesStatus(k) === "fuggoben").reduce((s,k) => s + (k.osszeg||0), 0);

  return (
    <div style={{ padding:"24px 28px", fontFamily:FONT, maxWidth:960 }}>
      {/* Fejléc */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:FONT_HEADING, fontSize:22, fontWeight:800, color:C.text, margin:0 }}>Kártérítések</h2>
          <p style={{ fontSize:13, color:C.muted, margin:"4px 0 0" }}>Elfogadott kártérítések automatikusan csökkentik a projekt eredményét</p>
        </div>
        {isAdmin && (
          <button onClick={() => { setUjModal(true); setForm(FORM_INIT); setErrors({}); }} style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 18px", background:C.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:FONT }}>
            <Plus size={16} /> Új kártérítés
          </button>
        )}
      </div>

      {/* Összefoglaló */}
      <div style={{ display:"flex", gap:14, marginBottom:20 }}>
        {[
          { label:"Elfogadott összeg",  value: ft(elfogadottOsszeg), color:"#16A34A", bg:"#F0FDF4" },
          { label:"Függőben lévő",      value: ft(fuggobenOsszeg),   color:"#D97706", bg:"#FFFBEB" },
          { label:"Összes tétel",        value: `${lista.length} db`, color:C.accent,  bg:"#EFF6FF" },
        ].map(s => (
          <div key={s.label} style={{ flex:1, background:s.bg, borderRadius:12, padding:"14px 16px", border:`1px solid ${s.color}30` }}>
            <p style={{ fontSize:11, fontWeight:700, color:s.color, marginBottom:4, textTransform:"uppercase", letterSpacing:.7 }}>{s.label}</p>
            <p style={{ fontSize:20, fontWeight:800, color:s.color, margin:0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Szűrő */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:20 }}>
        {SZURO_OPCIO.map(o => (
          <button key={o.id} onClick={() => setSzuro(o.id)}
            style={{ padding:"6px 14px", borderRadius:20, border:`1.5px solid ${szuro===o.id ? C.accent : C.border}`, background: szuro===o.id ? C.accent : "#fff", color: szuro===o.id ? "#fff" : C.text, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:FONT, transition:"all .15s" }}>
            {o.label}
            <span style={{ marginLeft:5, opacity:.7 }}>
              {o.id === "osszes" ? lista.length
                : o.id === "sajat_csapat" || o.id === "alvallalkozo"
                  ? lista.filter(k => k.responsibleType === o.id).length
                  : lista.filter(k => getKarteritesStatus(k) === o.id).length}
            </span>
          </button>
        ))}
      </div>

      {/* Lista */}
      {szurtLista.length === 0 ? (
        <div style={{ textAlign:"center", padding:"48px 0", color:C.muted }}>
          <AlertTriangle size={40} style={{ opacity:.2, display:"block", margin:"0 auto 12px" }} />
          <p>Nincs kártérítés a szűrési feltételek alapján</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {szurtLista.map(k => {
            const st = getKarteritesStatus(k);
            const borderColor = st === "elfogadott" ? "#86EFAC" : st === "elutasitott" ? "#FECACA" : C.border;
            return (
              <div key={k.id} style={{ background:"#fff", borderRadius:12, border:`1.5px solid ${borderColor}`, padding:"16px 20px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", marginBottom:8 }}>
                      <StatusBadge status={st} />
                      <span style={{ fontSize:18, fontWeight:800, color: st === "elutasitott" ? "#DC2626" : C.text }}>{ft(k.osszeg)}</span>
                      {k.responsibleType && <FelelosBadge type={k.responsibleType} snapshot={k.responsibleNameSnapshot} />}
                    </div>
                    <p style={{ fontWeight:700, fontSize:14, color:C.text, margin:"0 0 6px" }}>{k.ok}</p>
                    <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
                      {(k.workOrderId || k.munkalapId) && (
                        <span style={{ fontSize:12, color:C.muted }}>📋 {k.munkalapSzam || k.workOrderId || k.munkalapId}</span>
                      )}
                      {k.projektkod && <span style={{ fontSize:12, color:C.muted }}>🏗️ {k.projektkod}</span>}
                      {k.projektNev && <span style={{ fontSize:12, color:C.muted }}>{k.projektNev}</span>}
                      <span style={{ fontSize:12, color:C.muted }}>📅 {k.datum}</span>
                      <span style={{ fontSize:12, color:C.muted }}>👤 {k.createdBy || k.rogzitoSzemely}</span>
                    </div>
                    {(k.note || k.megjegyzes) && (
                      <p style={{ fontSize:12, color:C.textSub, marginTop:6, background:"#F8FAFC", borderRadius:6, padding:"6px 8px" }}>
                        {k.note || k.megjegyzes}
                      </p>
                    )}
                  </div>

                  {isAdmin && (
                    <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                      {st !== "elfogadott" && (
                        <button onClick={() => handleDontse(k.id, "elfogadott")} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"#F0FDF4", color:"#16A34A", border:"1.5px solid #86EFAC", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:FONT }}>
                          <CheckCircle2 size={13} /> Elfogad
                        </button>
                      )}
                      {st !== "elutasitott" && (
                        <button onClick={() => handleDontse(k.id, "elutasitott")} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"#FEF2F2", color:"#DC2626", border:"1.5px solid #FECACA", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:FONT }}>
                          <XCircle size={13} /> Elutasít
                        </button>
                      )}
                      {st === "elfogadott" && (
                        <button onClick={() => handleDontse(k.id, "fuggoben")} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"#FFFBEB", color:"#D97706", border:"1.5px solid #FDE68A", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:FONT }}>
                          ↩ Visszavon
                        </button>
                      )}
                      <button onClick={() => handleDelete(k.id)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"#F8FAFC", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:12, fontFamily:FONT }}>
                        <Trash2 size={13} /> Töröl
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Új kártérítés modal ── */}
      {ujModal && (
        <div style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:540, maxHeight:"90vh", overflowY:"auto", padding:"28px 24px", fontFamily:FONT }}>
            <h3 style={{ fontFamily:FONT_HEADING, fontSize:18, fontWeight:800, margin:"0 0 20px", color:C.text }}>Új kártérítési tétel</h3>

            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              {/* Munkalap kiválasztás */}
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Munkalap / Projekt *</label>
                <SearchSelect
                  value={form.workOrderId}
                  onChange={handleMunkalapSelect}
                  options={munkalapOpciok}
                  placeholder="Keress munkalapszám, ügyfél vagy cím alapján…"
                  renderOption={(o) => (
                    <div>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <span style={{ fontWeight:700, fontSize:13, color:C.text }}>{o.munkalapSzam}</span>
                        {o.status && <span style={{ fontSize:11, background:"#F1F5F9", color:C.muted, borderRadius:10, padding:"1px 7px" }}>{o.status}</span>}
                      </div>
                      <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>
                        {[o.clientNev, o.cim, o.datum].filter(Boolean).join(" · ")}
                      </div>
                    </div>
                  )}
                  renderValue={(o) => `${o.munkalapSzam}${o.clientNev ? ` – ${o.clientNev}` : ""}`}
                />
                {errors.workOrderId && <p style={{ color:"#DC2626", fontSize:11, margin:"4px 0 0" }}>{errors.workOrderId}</p>}
              </div>

              {/* Összeg + Ok */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Összeg (Ft) *</label>
                  <input type="number" value={form.osszeg} placeholder="pl. 50000"
                    onChange={e => setF("osszeg", e.target.value)}
                    style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1.5px solid ${errors.osszeg ? "#DC2626" : C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none" }} />
                  {errors.osszeg && <p style={{ color:"#DC2626", fontSize:11, margin:"4px 0 0" }}>{errors.osszeg}</p>}
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Dátum</label>
                  <input type="date" value={form.datum} onChange={e => setF("datum", e.target.value)}
                    style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none" }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Kártérítés oka *</label>
                <input value={form.ok} placeholder="pl. sérült panel cseréje, ügyfél kárpótlás…"
                  onChange={e => setF("ok", e.target.value)}
                  style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1.5px solid ${errors.ok ? "#DC2626" : C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none" }} />
                {errors.ok && <p style={{ color:"#DC2626", fontSize:11, margin:"4px 0 0" }}>{errors.ok}</p>}
              </div>

              {/* Felelős típusa */}
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:8 }}>Felelős *</label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                  {[
                    { id:"sajat_csapat", icon:<Users size={15}/>, label:"Saját csapat" },
                    { id:"alvallalkozo", icon:<Wrench size={15}/>, label:"Alvállalkozó" },
                    { id:"egyeb",        icon:<HelpCircle size={15}/>, label:"Egyéb" },
                  ].map(t => (
                    <button key={t.id} type="button" onClick={() => setForm(p => ({ ...p, responsibleType:t.id, responsibleTeamId:"", responsibleWorkerId:"", responsibleSubcontractorId:"" }))}
                      style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, padding:"10px 8px", borderRadius:10, border:`2px solid ${form.responsibleType===t.id ? C.accent : C.border}`, background: form.responsibleType===t.id ? "#EFF6FF" : "#fff", cursor:"pointer", fontFamily:FONT, color: form.responsibleType===t.id ? C.accent : C.text, fontWeight:600, fontSize:12 }}>
                      {t.icon}
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Saját csapat */}
              {form.responsibleType === "sajat_csapat" && (
                <div style={{ background:"#EFF6FF", borderRadius:10, padding:"14px", display:"flex", flexDirection:"column", gap:10 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:"#2563EB", display:"block", marginBottom:4 }}>Csapat kiválasztása *</label>
                    <SearchSelect
                      value={form.responsibleTeamId}
                      onChange={handleTeamSelect}
                      options={sajatCsapatok}
                      placeholder="Válassz saját csapatot…"
                      renderOption={(o) => <span style={{ fontSize:14, fontFamily:FONT }}>{o.nev}</span>}
                      renderValue={(o) => o.nev}
                    />
                    {errors.responsibleTeamId && <p style={{ color:"#DC2626", fontSize:11, margin:"4px 0 0" }}>{errors.responsibleTeamId}</p>}
                  </div>
                  {tagok.length > 0 && (
                    <div>
                      <label style={{ fontSize:12, fontWeight:700, color:"#2563EB", display:"block", marginBottom:4 }}>Konkrét dolgozó (opcionális)</label>
                      <SearchSelect
                        value={form.responsibleWorkerId}
                        onChange={id => setF("responsibleWorkerId", id)}
                        options={[{ id:"", nev:"– Nincs megjelölve –" }, ...tagok]}
                        placeholder="Válassz dolgozót…"
                        renderOption={(o) => <span style={{ fontSize:14, fontFamily:FONT }}>{o.nev}{o.szerep ? ` (${o.szerep})` : ""}</span>}
                        renderValue={(o) => o.nev}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Alvállalkozó */}
              {form.responsibleType === "alvallalkozo" && (
                <div style={{ background:"#FFF7ED", borderRadius:10, padding:"14px" }}>
                  <label style={{ fontSize:12, fontWeight:700, color:"#EA580C", display:"block", marginBottom:4 }}>Alvállalkozó csapat kiválasztása *</label>
                  <SearchSelect
                    value={form.responsibleSubcontractorId}
                    onChange={id => setF("responsibleSubcontractorId", id)}
                    options={avCsapatok}
                    placeholder="Válassz alvállalkozót…"
                    renderOption={(o) => <span style={{ fontSize:14, fontFamily:FONT }}>{o.nev}</span>}
                    renderValue={(o) => o.nev}
                  />
                  {errors.responsibleSubcontractorId && <p style={{ color:"#DC2626", fontSize:11, margin:"4px 0 0" }}>{errors.responsibleSubcontractorId}</p>}
                </div>
              )}

              {/* Egyéb */}
              {form.responsibleType === "egyeb" && (
                <div style={{ background:"#F8FAFC", borderRadius:10, padding:"14px" }}>
                  <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Indoklás *</label>
                  <textarea value={form.egyebIndok} onChange={e => setF("egyebIndok", e.target.value)}
                    placeholder="Részletezd, ki/mi okozta a kárt…"
                    rows={3}
                    style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1.5px solid ${errors.egyebIndok ? "#DC2626" : C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", resize:"vertical" }} />
                  {errors.egyebIndok && <p style={{ color:"#DC2626", fontSize:11, margin:"4px 0 0" }}>{errors.egyebIndok}</p>}
                </div>
              )}

              {/* Megjegyzés */}
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Megjegyzés</label>
                <textarea value={form.note} onChange={e => setF("note", e.target.value)}
                  placeholder="Egyéb részletek…" rows={2}
                  style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", resize:"vertical" }} />
              </div>
            </div>

            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={() => setUjModal(false)} style={{ flex:1, padding:"11px", borderRadius:9, border:`1.5px solid ${C.border}`, background:"#fff", fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:FONT }}>Mégse</button>
              <button onClick={handleAdd} style={{ flex:2, padding:"11px", borderRadius:9, border:"none", background:C.accent, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:FONT }}>Hozzáadás</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
