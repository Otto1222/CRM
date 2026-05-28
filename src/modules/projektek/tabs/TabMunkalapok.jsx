import { useState } from "react";
import { Plus, ExternalLink } from "lucide-react";
import { C, FONT } from "../../../lib/constants.js";
import { linkMunkalap, unlinkMunkalap } from "../projekt.service.js";

export default function TabMunkalapok({ projekt, munkalapok, onNavigate }) {
  const linked = (munkalapok||[]).filter(m =>
    m.projektId === projekt.id || projekt.munkalapIds?.includes(m.id)
  );
  const unlinked = (munkalapok||[]).filter(m =>
    !m.projektId && !projekt.munkalapIds?.includes(m.id)
  );
  const [showLink, setShowLink] = useState(false);

  return (
    <div style={{ paddingTop:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <p style={{ fontWeight:700, fontSize:15, color:"#0F172A" }}>Kapcsolódó munkalapok ({linked.length} db)</p>
        <button onClick={()=>setShowLink(s=>!s)} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"#2563EB", color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:600, fontSize:13, fontFamily:FONT }}>
          <Plus size={14}/> Munkalap hozzárendelése
        </button>
      </div>

      {/* Meglévő hozzárendeletlen munkalapok */}
      {showLink && unlinked.length > 0 && (
        <div style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:12, padding:14, marginBottom:14 }}>
          <p style={{ fontSize:12, fontWeight:700, color:"#64748B", marginBottom:10 }}>Szabad munkalapok (kattints a hozzárendeléshez):</p>
          {unlinked.slice(0,20).map(m => (
            <div key={m.id} onClick={()=>{ linkMunkalap(projekt.id, m.id); setShowLink(false); }}
              style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", borderRadius:8, background:"#fff", border:"1px solid #E2E8F0", marginBottom:6, cursor:"pointer" }}>
              <span style={{ fontWeight:600, fontSize:13 }}>{m.id}</span>
              <span style={{ fontSize:12, color:"#64748B" }}>{m.clientNev || "—"} · {m.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Kapcsolódó munkalapok táblája */}
      {linked.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px 0", color:"#94A3B8" }}>
          <p>Még nincs hozzárendelt munkalap</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {linked.map(m => (
            <div key={m.id} style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontWeight:700, color:"#2563EB", fontSize:13 }}>{m.dokumentumszam || m.ediSorszam || m.id}</span>
                  <span style={{ fontSize:11, background:"#F1F5F9", color:"#64748B", padding:"2px 8px", borderRadius:20, fontWeight:600 }}>{m.status}</span>
                  {m.munkalapTipus && <span style={{ fontSize:11, color:"#94A3B8" }}>{m.munkalapTipus}</span>}
                </div>
                <p style={{ fontSize:12, color:"#64748B", margin:"4px 0 0" }}>{m.clientNev || "—"} · {m.assigneeNev || "—"} · {m.date || "—"}</p>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {onNavigate && (
                  <button onClick={()=>onNavigate(m)} title="Megnyitás" style={{ padding:"6px 10px", background:"#EFF6FF", color:"#2563EB", border:"none", borderRadius:7, cursor:"pointer", display:"flex", alignItems:"center", gap:4, fontSize:12 }}>
                    <ExternalLink size={13}/> Megnyit
                  </button>
                )}
                <button onClick={()=>unlinkMunkalap(projekt.id, m.id)} style={{ padding:"6px 10px", background:"#FEF2F2", color:"#DC2626", border:"none", borderRadius:7, cursor:"pointer", fontSize:12 }}>
                  Leválaszt
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
