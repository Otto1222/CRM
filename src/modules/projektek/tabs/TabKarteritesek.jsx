import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../../lib/constants";
import {
  loadKarteritesek, addKarterites, updateKarterites, deleteKarterites,
  getKarteritesStatus, getKarteritesekByProjekt
} from "../../../lib/karterites";
import { getAktivCsapatok, getAktivCsapatTagok } from "../../csapatok/csapat.service";
import { ft } from "../../../lib/helpers";

function StatusBadge({ status }) {
  const cfg = {
    elfogadott:  { bg:"#F0FDF4", color:"#16A34A", label:"✅ Elfogadott" },
    elutasitott: { bg:"#FEF2F2", color:"#DC2626", label:"❌ Elutasított" },
    fuggoben:    { bg:"#FFFBEB", color:"#D97706", label:"⏳ Függőben" },
  }[status] || { bg:"#FFFBEB", color:"#D97706", label:"⏳ Függőben" };
  return <span style={{ background:cfg.bg, color:cfg.color, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>{cfg.label}</span>;
}

function FelelosBadge({ type, snapshot }) {
  const cfg = {
    sajat_csapat: { bg:"#EFF6FF", color:"#2563EB", icon:"👥" },
    alvallalkozo: { bg:"#FFF7ED", color:"#EA580C", icon:"🤝" },
    egyeb:        { bg:"#F8FAFC", color:"#64748B", icon:"❓" },
  }[type] || { bg:"#F8FAFC", color:"#64748B", icon:"❓" };
  return (
    <span style={{ background:cfg.bg, color:cfg.color, padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>
      {cfg.icon} {snapshot || type}
    </span>
  );
}

const FORM_INIT = {
  workOrderId:"", munkalapSzam:"",
  osszeg:"", ok:"", datum: new Date().toISOString().slice(0,10),
  responsibleType:"sajat_csapat",
  responsibleTeamId:"", responsibleWorkerId:"", responsibleSubcontractorId:"", egyebIndok:"",
  note:"",
};

export default function TabKarteritesek({ projekt, munkalapok, currentUser }) {
  const [lista, setLista]     = useState([]);
  const [ujModal, setUjModal] = useState(false);
  const [form, setForm]       = useState(FORM_INIT);
  const [errors, setErrors]   = useState({});

  const munkalapIds = useMemo(() =>
    (munkalapok || []).filter(m => m.projektId === projekt?.id || (projekt?.munkalapIds||[]).includes(m.id)).map(m => m.id),
    [munkalapok, projekt]
  );

  const projektMunkalapok = useMemo(() =>
    (munkalapok || []).filter(m => munkalapIds.includes(m.id)),
    [munkalapok, munkalapIds]
  );

  const csapatok    = useMemo(() => getAktivCsapatok(), [ujModal]);
  const sajatCs     = useMemo(() => csapatok.filter(c => c.tipus === "sajat" || !c.tipus), [csapatok]);
  const avCs        = useMemo(() => csapatok.filter(c => c.tipus === "alvallalkozo"), [csapatok]);
  const tagok       = useMemo(() => form.responsibleTeamId ? getAktivCsapatTagok(form.responsibleTeamId) : [], [form.responsibleTeamId]);

  useEffect(() => {
    function load() {
      setLista(getKarteritesekByProjekt(projekt?.id, munkalapIds));
    }
    load();
    window.addEventListener("crm-db-updated", load);
    return () => window.removeEventListener("crm-db-updated", load);
  }, [projekt?.id, munkalapIds.join(",")]);

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })); }

  function buildSnapshot() {
    const { responsibleType, responsibleTeamId, responsibleWorkerId, responsibleSubcontractorId, egyebIndok } = form;
    if (responsibleType === "sajat_csapat") {
      const cs  = sajatCs.find(c => c.id === responsibleTeamId);
      const tag = tagok.find(t => t.id === responsibleWorkerId);
      return tag ? `${cs?.nev || ""} – ${tag.nev}` : (cs?.nev || "");
    }
    if (responsibleType === "alvallalkozo") return avCs.find(c => c.id === responsibleSubcontractorId)?.nev || "";
    return egyebIndok;
  }

  function validate() {
    const e = {};
    if (!form.workOrderId && !form.ok) e.workOrderId = "Munkalap vagy ok megadása szükséges";
    if (!form.osszeg || Number(form.osszeg) <= 0) e.osszeg = "Összeg megadása kötelező";
    if (!form.ok.trim()) e.ok = "Ok megadása kötelező";
    if (form.responsibleType === "sajat_csapat" && !form.responsibleTeamId) e.responsibleTeamId = "Csapat kiválasztása kötelező";
    if (form.responsibleType === "alvallalkozo" && !form.responsibleSubcontractorId) e.responsibleSubcontractorId = "Alvállalkozó kötelező";
    if (form.responsibleType === "egyeb" && !form.egyebIndok.trim()) e.egyebIndok = "Indoklás kötelező";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleAdd() {
    if (!validate()) return;
    const selectedMunkalap = projektMunkalapok.find(m => m.id === form.workOrderId);
    addKarterites({
      ...form,
      projektId: projekt.id,
      projektkod: projekt.projektkod || "",
      projektNev: projekt.clientNev || projekt.nev || "",
      munkalapSzam: selectedMunkalap?.munkalapSzam || form.workOrderId,
      osszeg: Number(form.osszeg),
      responsibleNameSnapshot: buildSnapshot(),
      createdBy: currentUser?.name || currentUser?.email || "Admin",
    });
    setForm(FORM_INIT);
    setErrors({});
    setUjModal(false);
  }

  function handleDontse(id, status) {
    updateKarterites(id, { status });
  }

  function handleDelete(id) {
    if (!window.confirm("Biztosan törlöd?")) return;
    deleteKarterites(id);
  }

  const elfOsszeg = lista.filter(k => getKarteritesStatus(k) === "elfogadott").reduce((s,k)=>s+(k.osszeg||0),0);
  const fugOsszeg = lista.filter(k => getKarteritesStatus(k) === "fuggoben").reduce((s,k)=>s+(k.osszeg||0),0);

  return (
    <div style={{ padding:"20px 0", fontFamily:FONT }}>
      {/* Összefoglaló */}
      {lista.length > 0 && (
        <div style={{ display:"flex", gap:12, marginBottom:20 }}>
          {[
            { label:"Elfogadott",  value: ft(elfOsszeg), color:"#16A34A", bg:"#F0FDF4" },
            { label:"Függőben",    value: ft(fugOsszeg), color:"#D97706", bg:"#FFFBEB" },
            { label:"Összes tétel",value: `${lista.length} db`, color:C.accent, bg:"#EFF6FF" },
          ].map(s => (
            <div key={s.label} style={{ flex:1, background:s.bg, borderRadius:10, padding:"12px 14px", border:`1px solid ${s.color}30` }}>
              <p style={{ fontSize:10, fontWeight:700, color:s.color, marginBottom:2, textTransform:"uppercase" }}>{s.label}</p>
              <p style={{ fontSize:18, fontWeight:800, color:s.color, margin:0 }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Fejléc + Új gomb */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <span style={{ fontSize:13, color:C.muted }}>{lista.length} kártérítési tétel ehhez a projekthez</span>
        <button onClick={() => { setUjModal(true); setForm({ ...FORM_INIT, workOrderId: projektMunkalapok[0]?.id || "" }); setErrors({}); }}
          style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:C.accent, color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:FONT }}>
          <Plus size={14} /> Új kártérítés
        </button>
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px 0", color:C.muted, background:"#F8FAFC", borderRadius:12 }}>
          <p style={{ fontSize:14 }}>Nincs kártérítés ehhez a projekthez</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {lista.map(k => {
            const st = getKarteritesStatus(k);
            return (
              <div key={k.id} style={{ background:"#fff", borderRadius:10, border:`1.5px solid ${st==="elfogadott"?"#86EFAC":st==="elutasitott"?"#FECACA":C.border}`, padding:"14px 16px" }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10 }}>
                  <div style={{ flex:1 }}>
                    <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:6 }}>
                      <StatusBadge status={st} />
                      <span style={{ fontWeight:800, fontSize:16, color:C.text }}>{ft(k.osszeg)}</span>
                      {k.responsibleType && <FelelosBadge type={k.responsibleType} snapshot={k.responsibleNameSnapshot} />}
                    </div>
                    <p style={{ fontWeight:600, fontSize:13, color:C.text, margin:"0 0 4px" }}>{k.ok}</p>
                    <div style={{ display:"flex", gap:12, flexWrap:"wrap", fontSize:12, color:C.muted }}>
                      {(k.munkalapSzam || k.workOrderId || k.munkalapId) && <span>📋 {k.munkalapSzam || k.workOrderId || k.munkalapId}</span>}
                      <span>📅 {k.datum}</span>
                      <span>👤 {k.createdBy || k.rogzitoSzemely}</span>
                    </div>
                    {(k.note || k.megjegyzes) && <p style={{ fontSize:12, color:C.textSub, marginTop:4, background:"#F8FAFC", borderRadius:6, padding:"5px 8px" }}>{k.note || k.megjegyzes}</p>}
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:5, flexShrink:0 }}>
                    {st !== "elfogadott"  && <button onClick={() => handleDontse(k.id,"elfogadott")}  style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px", background:"#F0FDF4", color:"#16A34A", border:"1.5px solid #86EFAC", borderRadius:7, cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:FONT }}><CheckCircle2 size={12}/> Elfogad</button>}
                    {st !== "elutasitott" && <button onClick={() => handleDontse(k.id,"elutasitott")} style={{ display:"flex", alignItems:"center", gap:4, padding:"5px 10px", background:"#FEF2F2", color:"#DC2626", border:"1.5px solid #FECACA", borderRadius:7, cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:FONT }}><XCircle size={12}/> Elutasít</button>}
                    {st === "elfogadott"  && <button onClick={() => handleDontse(k.id,"fuggoben")}    style={{ padding:"5px 10px", background:"#FFFBEB", color:"#D97706", border:"1.5px solid #FDE68A", borderRadius:7, cursor:"pointer", fontSize:11, fontWeight:700, fontFamily:FONT }}>↩ Vissza</button>}
                    <button onClick={() => handleDelete(k.id)} style={{ padding:"5px 10px", background:"#F8FAFC", color:C.muted, border:`1px solid ${C.border}`, borderRadius:7, cursor:"pointer", fontSize:11, fontFamily:FONT }}><Trash2 size={12}/></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {ujModal && (
        <div style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#fff", borderRadius:14, width:"100%", maxWidth:480, maxHeight:"88vh", overflowY:"auto", padding:"24px 20px", fontFamily:FONT }}>
            <h3 style={{ fontFamily:FONT_HEADING, fontSize:17, fontWeight:800, margin:"0 0 18px", color:C.text }}>Kártérítés – {projekt.projektkod}</h3>

            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {/* Munkalap */}
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Munkalap</label>
                <select value={form.workOrderId} onChange={e => setF("workOrderId", e.target.value)}
                  style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", background:"#fff" }}>
                  <option value="">– Projekt szintű –</option>
                  {projektMunkalapok.map(m => (
                    <option key={m.id} value={m.id}>{m.munkalapSzam || m.id} {m.clientNev ? `– ${m.clientNev}` : ""} ({m.status})</option>
                  ))}
                </select>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Összeg (Ft) *</label>
                  <input type="number" value={form.osszeg} placeholder="50000" onChange={e => setF("osszeg", e.target.value)}
                    style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1.5px solid ${errors.osszeg?"#DC2626":C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none" }} />
                  {errors.osszeg && <p style={{ color:"#DC2626", fontSize:11, margin:"3px 0 0" }}>{errors.osszeg}</p>}
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Dátum</label>
                  <input type="date" value={form.datum} onChange={e => setF("datum", e.target.value)}
                    style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none" }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Kártérítés oka *</label>
                <input value={form.ok} placeholder="pl. sérült panel cseréje" onChange={e => setF("ok", e.target.value)}
                  style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1.5px solid ${errors.ok?"#DC2626":C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none" }} />
                {errors.ok && <p style={{ color:"#DC2626", fontSize:11, margin:"3px 0 0" }}>{errors.ok}</p>}
              </div>

              {/* Felelős */}
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:6 }}>Felelős *</label>
                <div style={{ display:"flex", gap:8 }}>
                  {[
                    { id:"sajat_csapat", label:"👥 Saját csapat" },
                    { id:"alvallalkozo", label:"🤝 Alvállalkozó" },
                    { id:"egyeb",        label:"❓ Egyéb" },
                  ].map(t => (
                    <button key={t.id} type="button"
                      onClick={() => setForm(p => ({ ...p, responsibleType:t.id, responsibleTeamId:"", responsibleWorkerId:"", responsibleSubcontractorId:"" }))}
                      style={{ flex:1, padding:"8px 6px", borderRadius:8, border:`2px solid ${form.responsibleType===t.id?C.accent:C.border}`, background:form.responsibleType===t.id?"#EFF6FF":"#fff", cursor:"pointer", fontFamily:FONT, color:form.responsibleType===t.id?C.accent:C.text, fontWeight:600, fontSize:11 }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.responsibleType === "sajat_csapat" && (
                <div style={{ background:"#EFF6FF", borderRadius:9, padding:"12px", display:"flex", flexDirection:"column", gap:8 }}>
                  <div>
                    <label style={{ fontSize:12, fontWeight:700, color:"#2563EB", display:"block", marginBottom:4 }}>Csapat *</label>
                    <select value={form.responsibleTeamId} onChange={e => { setF("responsibleTeamId", e.target.value); setF("responsibleWorkerId",""); }}
                      style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${errors.responsibleTeamId?"#DC2626":"#BFDBFE"}`, borderRadius:8, fontSize:13, fontFamily:FONT, outline:"none", background:"#fff" }}>
                      <option value="">– Válassz csapatot –</option>
                      {sajatCs.map(c => <option key={c.id} value={c.id}>{c.nev}</option>)}
                    </select>
                    {errors.responsibleTeamId && <p style={{ color:"#DC2626", fontSize:11, margin:"3px 0 0" }}>{errors.responsibleTeamId}</p>}
                  </div>
                  {tagok.length > 0 && (
                    <div>
                      <label style={{ fontSize:12, fontWeight:700, color:"#2563EB", display:"block", marginBottom:4 }}>Konkrét dolgozó (opcionális)</label>
                      <select value={form.responsibleWorkerId} onChange={e => setF("responsibleWorkerId", e.target.value)}
                        style={{ width:"100%", padding:"9px 11px", border:"1.5px solid #BFDBFE", borderRadius:8, fontSize:13, fontFamily:FONT, outline:"none", background:"#fff" }}>
                        <option value="">– Nincs megjelölve –</option>
                        {tagok.map(t => <option key={t.id} value={t.id}>{t.nev}{t.szerep ? ` (${t.szerep})` : ""}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {form.responsibleType === "alvallalkozo" && (
                <div style={{ background:"#FFF7ED", borderRadius:9, padding:"12px" }}>
                  <label style={{ fontSize:12, fontWeight:700, color:"#EA580C", display:"block", marginBottom:4 }}>Alvállalkozó *</label>
                  <select value={form.responsibleSubcontractorId} onChange={e => setF("responsibleSubcontractorId", e.target.value)}
                    style={{ width:"100%", padding:"9px 11px", border:`1.5px solid ${errors.responsibleSubcontractorId?"#DC2626":"#FED7AA"}`, borderRadius:8, fontSize:13, fontFamily:FONT, outline:"none", background:"#fff" }}>
                    <option value="">– Válassz alvállalkozót –</option>
                    {avCs.map(c => <option key={c.id} value={c.id}>{c.nev}</option>)}
                  </select>
                  {errors.responsibleSubcontractorId && <p style={{ color:"#DC2626", fontSize:11, margin:"3px 0 0" }}>{errors.responsibleSubcontractorId}</p>}
                </div>
              )}

              {form.responsibleType === "egyeb" && (
                <div>
                  <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Indoklás *</label>
                  <textarea value={form.egyebIndok} onChange={e => setF("egyebIndok", e.target.value)} rows={2}
                    placeholder="Ki/mi okozta a kárt?"
                    style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1.5px solid ${errors.egyebIndok?"#DC2626":C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none", resize:"vertical" }} />
                  {errors.egyebIndok && <p style={{ color:"#DC2626", fontSize:11, margin:"3px 0 0" }}>{errors.egyebIndok}</p>}
                </div>
              )}

              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>Megjegyzés</label>
                <input value={form.note} onChange={e => setF("note", e.target.value)} placeholder="Egyéb részletek…"
                  style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none" }} />
              </div>
            </div>

            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={() => setUjModal(false)} style={{ flex:1, padding:"10px", borderRadius:9, border:`1.5px solid ${C.border}`, background:"#fff", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:FONT }}>Mégse</button>
              <button onClick={handleAdd} style={{ flex:2, padding:"10px", borderRadius:9, border:"none", background:C.accent, color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:FONT }}>Hozzáadás</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
