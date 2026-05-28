import { C, FONT } from "../../lib/constants.js";
import { getStatusConfig } from "./projekt.schema.js";
import { calcProjektPenzugy } from "../../lib/costEngine.js";
import { ft } from "../../lib/helpers.js";

export default function ProjektTable({ projektek, munkalapok, onSelect, userRole }) {
  const showPenz = ["Admin","Projektmenedzser","Iroda/Könyvelés"].includes(userRole);

  return (
    <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden" }}>
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ background:"#F8FAFC", borderBottom:"2px solid #E2E8F0" }}>
              {["Projektkód","Projekt neve","Ügyfél","Státusz","Típus","Csapat",
                ...(showPenz?["Ajánlat","Eredmény","Haszon%"]:[]),"Terv. befejezés"].map(h=>(
                <th key={h} style={{ padding:"10px 12px", textAlign:"left", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:.7, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projektek.length === 0 && (
              <tr><td colSpan={20} style={{ padding:"48px", textAlign:"center", color:"#94A3B8" }}>Nincsenek projektek</td></tr>
            )}
            {projektek.map((p,i) => {
              const stCfg = getStatusConfig(p.status);
              const mls   = (munkalapok||[]).filter(m=>m.projektId===p.id||p.munkalapIds?.includes(m.id));
              const penz  = showPenz ? calcProjektPenzugy(mls) : null;
              return (
                <tr key={p.id} onClick={()=>onSelect(p)}
                  style={{ borderBottom:"1px solid #F1F5F9", background: i%2===0?"#fff":"#FAFAFA", cursor:"pointer" }}
                  onMouseEnter={e=>e.currentTarget.style.background="#EFF6FF"}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#FAFAFA"}>
                  <td style={{ padding:"11px 12px", fontWeight:700, color:"#2563EB" }}>{p.projektkod}</td>
                  <td style={{ padding:"11px 12px", fontWeight:600, color:"#0F172A", maxWidth:200 }}>
                    <div style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.nev}</div>
                    {p.kulsoAzonosito && <div style={{ fontSize:11, color:"#94A3B8" }}>{p.kulsoAzonosito}</div>}
                  </td>
                  <td style={{ padding:"11px 12px", color:"#475569" }}>{p.clientNev||"—"}</td>
                  <td style={{ padding:"11px 12px" }}>
                    <span style={{ background:stCfg.bg, color:stCfg.szin, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{p.status}</span>
                  </td>
                  <td style={{ padding:"11px 12px", color:"#64748B", fontSize:12 }}>{p.tipus||"—"}</td>
                  <td style={{ padding:"11px 12px", color:"#64748B" }}>{p.csapatNev||"—"}</td>
                  {showPenz && <>
                    <td style={{ padding:"11px 12px", color:"#059669" }}>{p.elfogadottAjanlat>0?ft(p.elfogadottAjanlat):"—"}</td>
                    <td style={{ padding:"11px 12px", fontWeight:700, color:penz?.eredmeny>=0?"#059669":"#DC2626" }}>{penz?.bevetal>0?ft(penz.eredmeny):"—"}</td>
                    <td style={{ padding:"11px 12px" }}>{penz?.haszonPct!==null&&penz?.bevetal>0?<span style={{ background:penz.nyereseg?"#DCFCE7":"#FEE2E2",color:penz.nyereseg?"#166534":"#991B1B",padding:"2px 7px",borderRadius:20,fontWeight:700,fontSize:11 }}>{penz.haszonPct}%</span>:"—"}</td>
                  </>}
                  <td style={{ padding:"11px 12px", color:"#64748B", fontSize:12 }}>{p.tervezettBefejezes||"—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
