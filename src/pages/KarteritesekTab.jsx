import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle2, XCircle, Clock, AlertTriangle } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import {
  loadKarteritesek, addKarterites, updateKarterites, deleteKarterites
} from "../lib/karterites";
import { ft } from "../lib/helpers";

const USERS_DATA = [
  { id:"u1", name:"E.D.I. Solutions" },
  { id:"u2", name:"Kutasi László" },
  { id:"u3", name:"Csapat2" },
  { id:"u4", name:"Projektmenedzser" },
  { id:"u5", name:"Iroda/Könyvelés" },
];

function StatusBadge({ elfogadott }) {
  if (elfogadott === true)  return <span style={{ background:"#F0FDF4", color:"#16A34A", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>✅ Elfogadott</span>;
  if (elfogadott === false) return <span style={{ background:"#FEF2F2", color:"#DC2626", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>❌ Elutasított</span>;
  return <span style={{ background:"#FFFBEB", color:"#D97706", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700 }}>⏳ Függőben</span>;
}

export default function KarteritesekTab({ userRole, currentUser, munkalapok }) {
  const [lista, setLista]     = useState(() => loadKarteritesek());
  const [ujModal, setUjModal] = useState(false);
  const [form, setForm]       = useState({ projektId:"", munkalapId:"", osszeg:"", ok:"", datum: new Date().toISOString().slice(0,10), megjegyzes:"" });

  const isAdmin = ["Admin", "Projektmenedzser"].includes(userRole);

  useEffect(() => {
    function refresh() { setLista(loadKarteritesek()); }
    window.addEventListener("crm-db-updated", refresh);
    return () => window.removeEventListener("crm-db-updated", refresh);
  }, []);

  function handleAdd() {
    if (!form.osszeg || !form.ok || !form.munkalapId) return;
    addKarterites({ ...form, osszeg: Number(form.osszeg), rogzitoSzemely: currentUser?.name || "Admin" });
    setLista(loadKarteritesek());
    setForm({ projektId:"", munkalapId:"", osszeg:"", ok:"", datum: new Date().toISOString().slice(0,10), megjegyzes:"" });
    setUjModal(false);
  }

  function handleDontse(id, elfogadott) {
    updateKarterites(id, { elfogadott });
    setLista(loadKarteritesek());
  }

  function handleDelete(id) {
    if (!window.confirm("Biztosan törlöd ezt a kártérítési tételt?")) return;
    deleteKarterites(id);
    setLista(loadKarteritesek());
  }

  const elfogadottOsszeg = lista.filter(k => k.elfogadott === true).reduce((s,k) => s + k.osszeg, 0);
  const fuggobenOsszeg   = lista.filter(k => k.elfogadott === null).reduce((s,k) => s + k.osszeg, 0);

  return (
    <div style={{ padding:"24px 28px", fontFamily: FONT, maxWidth: 900 }}>
      {/* Fejléc */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
        <div>
          <h2 style={{ fontFamily: FONT_HEADING, fontSize:22, fontWeight:800, color:C.text, margin:0 }}>⚠️ Kártérítések</h2>
          <p style={{ fontSize:13, color:C.muted, margin:"4px 0 0" }}>Elfogadott kártérítések automatikusan kerülnek a projekt költségeibe</p>
        </div>
        {isAdmin && (
          <button onClick={() => setUjModal(true)} style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 18px", background:C.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:FONT }}>
            <Plus size={16} /> Új kártérítés
          </button>
        )}
      </div>

      {/* Összefoglaló */}
      <div style={{ display:"flex", gap:14, marginBottom:24 }}>
        {[
          { label:"Elfogadott összeg", value: ft(elfogadottOsszeg), color:"#16A34A", bg:"#F0FDF4" },
          { label:"Függőben lévő", value: ft(fuggobenOsszeg), color:"#D97706", bg:"#FFFBEB" },
          { label:"Összes tétel", value: `${lista.length} db`, color:C.accent, bg:"#EFF6FF" },
        ].map(s => (
          <div key={s.label} style={{ flex:1, background:s.bg, borderRadius:12, padding:"14px 16px", border:`1px solid ${s.color}30` }}>
            <p style={{ fontSize:11, fontWeight:700, color:s.color, marginBottom:4, textTransform:"uppercase", letterSpacing:.7 }}>{s.label}</p>
            <p style={{ fontSize:20, fontWeight:800, color:s.color, margin:0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Lista */}
      {lista.length === 0 ? (
        <div style={{ textAlign:"center", padding:"48px 0", color:C.muted }}>
          <AlertTriangle size={40} style={{ opacity:.2, display:"block", margin:"0 auto 12px" }} />
          <p>Még nincsenek kártérítési tételek</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {lista.map(k => (
            <div key={k.id} style={{ background:"#fff", borderRadius:12, border:`1.5px solid ${k.elfogadott===true?"#86EFAC":k.elfogadott===false?"#FECACA":C.border}`, padding:"16px 20px" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:8 }}>
                    <StatusBadge elfogadott={k.elfogadott} />
                    <span style={{ fontSize:18, fontWeight:800, color: k.elfogadott===false?"#DC2626":"#0F172A" }}>{ft(k.osszeg)}</span>
                  </div>
                  <p style={{ fontWeight:700, fontSize:14, color:C.text, margin:"0 0 4px" }}>{k.ok}</p>
                  <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                    <span style={{ fontSize:12, color:C.muted }}>📋 {k.munkalapId}</span>
                    <span style={{ fontSize:12, color:C.muted }}>📅 {k.datum}</span>
                    <span style={{ fontSize:12, color:C.muted }}>👤 {k.rogzitoSzemely}</span>
                  </div>
                  {k.megjegyzes && <p style={{ fontSize:12, color:C.textSub, marginTop:6, background:"#F8FAFC", borderRadius:6, padding:"6px 8px" }}>{k.megjegyzes}</p>}
                </div>

                {/* Akciók */}
                {isAdmin && (
                  <div style={{ display:"flex", flexDirection:"column", gap:6, flexShrink:0 }}>
                    {k.elfogadott !== true && (
                      <button onClick={() => handleDontse(k.id, true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"#F0FDF4", color:"#16A34A", border:"1.5px solid #86EFAC", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:FONT }}>
                        <CheckCircle2 size={13} /> Elfogad
                      </button>
                    )}
                    {k.elfogadott !== false && (
                      <button onClick={() => handleDontse(k.id, false)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"#FEF2F2", color:"#DC2626", border:"1.5px solid #FECACA", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:700, fontFamily:FONT }}>
                        <XCircle size={13} /> Elutasít
                      </button>
                    )}
                    <button onClick={() => handleDelete(k.id)} style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"#F8FAFC", color:C.muted, border:`1px solid ${C.border}`, borderRadius:8, cursor:"pointer", fontSize:12, fontFamily:FONT }}>
                      <Trash2 size={13} /> Töröl
                    </button>
                  </div>
                )}
              </div>
              {/* Nem elfogadott külön tétel jelzés */}
              {k.elfogadott === false && (
                <div style={{ marginTop:8, padding:"6px 10px", background:"#FEF2F2", borderRadius:6, fontSize:11, color:"#DC2626", fontWeight:600 }}>
                  ⚠️ Nem elfogadott – nem kerül be a projekt költségeibe (külön tételként jelenik meg)
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Új kártérítés modal */}
      {ujModal && (
        <div style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:480, padding:"28px 24px", fontFamily:FONT }}>
            <h3 style={{ fontFamily:FONT_HEADING, fontSize:18, fontWeight:800, margin:"0 0 20px", color:C.text }}>Új kártérítési tétel</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { label:"Munkalap azonosító *", key:"munkalapId", ph:"pl. T003700" },
                { label:"Összeg (Ft) *", key:"osszeg", ph:"pl. 50000", type:"number" },
                { label:"Kártérítés oka *", key:"ok", ph:"pl. sérült panel cseréje" },
                { label:"Dátum", key:"datum", type:"date" },
                { label:"Megjegyzés", key:"megjegyzes", ph:"Részletek…" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:4 }}>{f.label}</label>
                  <input
                    type={f.type||"text"} value={form[f.key]} placeholder={f.ph}
                    onChange={e => setForm(p => ({...p, [f.key]: e.target.value}))}
                    style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none" }}
                  />
                </div>
              ))}
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
