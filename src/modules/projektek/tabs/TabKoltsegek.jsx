import { C, FONT } from "../../../lib/constants.js";
import { calcProjektPenzugy, calcMunkalapPenzugy } from "../../../lib/costEngine.js";
import { ft } from "../../../lib/helpers.js";
import { loadKarteritesek } from "../../../lib/karterites.js";

export default function TabKoltsegek({ projekt, munkalapok }) {
  const kt   = loadKarteritesek();
  const mls  = (munkalapok||[]).filter(m => m.projektId===projekt.id || projekt.munkalapIds?.includes(m.id));
  const osz  = calcProjektPenzugy(mls, null, kt);
  const pktKt= kt.filter(k => k.projektId===projekt.id || mls.some(m=>m.id===k.munkalapId));

  const statCard = (label, value, color) => (
    <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:12, padding:"16px", textAlign:"center" }}>
      <p style={{ fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:.7, margin:"0 0 6px" }}>{label}</p>
      <p style={{ fontSize:22, fontWeight:800, color, margin:0 }}>{value}</p>
    </div>
  );

  return (
    <div style={{ paddingTop:16 }}>
      {/* Összesítő kártyák */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
        {statCard("Elfogadott ajánlat", ft(projekt.elfogadottAjanlat||0), "#2563EB")}
        {statCard("Bevétel", ft(osz.bevetal), "#059669")}
        {statCard("Összes költség", ft(osz.osszesKolts), "#DC2626")}
        {statCard("Eredmény", ft(osz.eredmeny), osz.eredmeny>=0?"#059669":"#DC2626")}
      </div>

      {/* Munkalapok pénzügyi részletezés */}
      {mls.length > 0 && (
        <>
          <p style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:10 }}>Munkalapok részletezése</p>
          <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:12, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#F8FAFC", borderBottom:"2px solid #E2E8F0" }}>
                  {["Munkalap","Típus","Státusz","Bevétel","Költség","Eredmény","Haszon%"].map(h=>(
                    <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontSize:11, fontWeight:700, color:"#64748B" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mls.map(m => {
                  const p = calcMunkalapPenzugy(m, kt);
                  return (
                    <tr key={m.id} style={{ borderBottom:"1px solid #F1F5F9" }}>
                      <td style={{ padding:"9px 12px", fontWeight:600, color:"#2563EB" }}>{m.dokumentumszam||m.id}</td>
                      <td style={{ padding:"9px 12px", color:"#64748B" }}>{m.munkalapTipus||"—"}</td>
                      <td style={{ padding:"9px 12px" }}><span style={{ fontSize:11, background:"#F1F5F9", padding:"2px 8px", borderRadius:20, fontWeight:600 }}>{m.status}</span></td>
                      <td style={{ padding:"9px 12px" }}>{p.bevetal>0?ft(p.bevetal):"—"}</td>
                      <td style={{ padding:"9px 12px", color:"#DC2626" }}>{p.osszesKolts>0?ft(p.osszesKolts):"—"}</td>
                      <td style={{ padding:"9px 12px", fontWeight:700, color:p.bevetal>0?(p.nyereseg?"#059669":"#DC2626"):"#94A3B8" }}>{p.bevetal>0?ft(p.eredmeny):"—"}</td>
                      <td style={{ padding:"9px 12px" }}>{p.haszonPct!==null&&p.bevetal>0?<span style={{ background:p.nyereseg?"#DCFCE7":"#FEE2E2", color:p.nyereseg?"#166534":"#991B1B", padding:"2px 8px", borderRadius:20, fontWeight:700, fontSize:11 }}>{p.haszonPct}%</span>:"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Kártérítések */}
      {pktKt.length > 0 && (
        <div style={{ marginTop:16 }}>
          <p style={{ fontSize:13, fontWeight:700, color:"#0F172A", marginBottom:10 }}>Kártérítési tételek</p>
          {pktKt.map(k=>(
            <div key={k.id} style={{ background:"#fff", border:`1px solid ${k.elfogadott?"#86EFAC":k.elfogadott===false?"#FECACA":"#E2E8F0"}`, borderRadius:9, padding:"10px 14px", marginBottom:8, display:"flex", justifyContent:"space-between" }}>
              <div>
                <p style={{ fontWeight:600, fontSize:13, margin:0 }}>{k.ok}</p>
                <p style={{ fontSize:11, color:"#64748B", margin:"2px 0 0" }}>{k.datum} · {k.munkalapId}</p>
              </div>
              <div style={{ textAlign:"right" }}>
                <p style={{ fontWeight:700, fontSize:14, margin:0, color:"#DC2626" }}>{ft(k.osszeg)}</p>
                <span style={{ fontSize:10, background:k.elfogadott?"#DCFCE7":k.elfogadott===false?"#FEE2E2":"#FFFBEB", color:k.elfogadott?"#166534":k.elfogadott===false?"#991B1B":"#92400E", padding:"1px 6px", borderRadius:20, fontWeight:700 }}>
                  {k.elfogadott?"Elfogadott":k.elfogadott===false?"Elutasított":"Függőben"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
