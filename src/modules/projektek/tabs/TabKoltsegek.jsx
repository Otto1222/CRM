import { C, FONT } from "../../../lib/constants.js";
import { ft } from "../../../lib/helpers.js";
import { loadKarteritesek } from "../../../lib/karterites.js";
import { loadFovallalkozok, loadSzabalyok } from "../../fovallalkozok/fovallalkozo.service.js";
import { CSAPAT_BER_TIPUSOK, UTIKOLTSÉG_TIPUSOK } from "../../fovallalkozok/fovallalkozo.schema.js";
import { calcProjektVegkalkulacio, calcProjektElőkalkulacio } from "../../../services/financialCalculation.service.js";

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${color}30`, borderRadius:12, padding:"14px 16px" }}>
      <p style={{ fontSize:10, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:.7, margin:"0 0 5px" }}>{label}</p>
      <p style={{ fontSize:20, fontWeight:800, color, margin:0 }}>{value}</p>
      {sub && <p style={{ fontSize:10, color:"#94A3B8", margin:"3px 0 0" }}>{sub}</p>}
    </div>
  );
}

function SorLabel({ label, auto, kezi, elteres, szin }) {
  return (
    <tr style={{ borderBottom:"1px solid #F1F5F9" }}>
      <td style={{ padding:"8px 12px", fontWeight:600, color:"#374151", fontSize:12, width:"40%" }}>{label}</td>
      <td style={{ padding:"8px 12px", fontSize:13, color: szin || (elteres?"#D97706":"#0F172A"), fontWeight: elteres?700:400 }}>
        {kezi !== null && kezi !== undefined ? ft(kezi) : ft(auto)}
        {elteres && <span style={{ marginLeft:6, fontSize:10, background:"#FFFBEB", color:"#D97706", padding:"1px 6px", borderRadius:20, fontWeight:700 }}>⚠️ kézi</span>}
      </td>
      {kezi !== null && kezi !== undefined && (
        <td style={{ padding:"8px 12px", fontSize:11, color:"#94A3B8" }}>Auto lenne: {ft(auto)}</td>
      )}
    </tr>
  );
}

export default function TabKoltsegek({ projekt, munkalapok }) {
  const kt      = loadKarteritesek();
  const fvk     = loadFovallalkozok();
  const szk     = loadSzabalyok();
  const penzugy = projekt?.penzugy || {};

  const mls  = (munkalapok||[]).filter(m => m.projektId===projekt.id || projekt.munkalapIds?.includes(m.id));
  const kalk = mls.length > 0
    ? calcProjektVegkalkulacio(projekt, mls)
    : calcProjektElőkalkulacio(projekt);

  const fv = fvk.find(f => f.id === penzugy.fovallalkoziId);
  const sz = szk.find(s => s.id === penzugy.elszamolasiSzabalyId) ||
             (penzugy.fovallalkoziId && penzugy.munkatipus
               ? szk.find(s => s.fovallalkoziId===penzugy.fovallalkoziId && s.aktiv)
               : null);

  const nincsKonfig = !penzugy.fovallalkoziId;

  return (
    <div style={{ paddingTop:16 }}>
      {/* Konfiguráció hiányzik */}
      {nincsKonfig && (
        <div style={{ background:"#FFFBEB", border:"1.5px solid #FCD34D", borderRadius:12, padding:"14px 16px", marginBottom:16, display:"flex", gap:10 }}>
          <span style={{ fontSize:20 }}>⚠️</span>
          <div>
            <p style={{ fontWeight:700, fontSize:13, color:"#92400E", margin:0 }}>Nincs fővállalkozó beállítva</p>
            <p style={{ fontSize:12, color:"#92400E", margin:"3px 0 0" }}>A kalkulációhoz szerkeszd a projektet és válassz fővállalkozót + elszámolási szabályt.</p>
          </div>
        </div>
      )}

      {/* Eltérés figyelmeztetés */}
      {kalk.elteres && (
        <div style={{ background:"#FFFBEB", border:"1.5px solid #FCD34D", borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", gap:10 }}>
          <span>⚠️</span>
          <p style={{ fontSize:12, color:"#92400E", margin:0 }}>
            <strong>Kézi eltérés az elszámolási szabálytól:</strong> {kalk.elteresek.join(", ")}
          </p>
        </div>
      )}

      {/* Szabály info */}
      {fv && (
        <div style={{ background:"#F0FDF4", border:"1px solid #86EFAC", borderRadius:12, padding:"12px 16px", marginBottom:16, display:"flex", gap:16, flexWrap:"wrap" }}>
          <div><p style={{ fontSize:10, fontWeight:700, color:"#64748B", margin:"0 0 2px" }}>FŐVÁLLALKOZÓ</p><p style={{ fontWeight:700, fontSize:13, color:"#166534" }}>{fv.nev}</p></div>
          {sz && <div><p style={{ fontSize:10, fontWeight:700, color:"#64748B", margin:"0 0 2px" }}>ELSZÁMOLÁSI SZABÁLY</p>
            <p style={{ fontSize:12, color:"#166534" }}>{sz.munkatipus || "Általános"} · {CSAPAT_BER_TIPUSOK.find(t=>t.id===sz.csapatBerTipus)?.label}</p></div>}
          <div><p style={{ fontSize:10, fontWeight:700, color:"#64748B", margin:"0 0 2px" }}>TÁVOLSÁG</p><p style={{ fontSize:13, color:"#166534" }}>{penzugy.tavKm||0} km · {penzugy.csapatLetszam||1} fő · {penzugy.munkanapok||1} nap</p></div>
          <div><p style={{ fontSize:10, fontWeight:700, color:"#64748B", margin:"0 0 2px" }}>FORRÁS</p>
            <p style={{ fontSize:12, color:"#166534" }}>{mls.length>0?"Végkalkuláció (tényleges)":"Előkalkuláció"}</p></div>
        </div>
      )}

      {/* Stat kártyák */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
        <StatCard label="Nettó bevétel"    value={ft(kalk.nettoBevitel)}  color="#059669"
          sub={projekt.elfogadottAjanlat>0?`Ajánlat: ${ft(projekt.elfogadottAjanlat)}`:null}/>
        <StatCard label="Összes költség"   value={ft(kalk.osszesKolts)}   color="#DC2626"/>
        <StatCard label="Várható haszon"   value={ft(kalk.varhatoHaszon)} color={kalk.varhatoHaszon>=0?"#059669":"#DC2626"}/>
        <StatCard label="Haszonkulcs"
          value={kalk.haszonkulcsPct!==null?`${kalk.haszonkulcsPct}%`:"—"}
          color={kalk.haszonkulcsPct!==null?(kalk.haszonkulcsPct>=0?"#059669":"#DC2626"):"#94A3B8"}/>
      </div>

      {/* Részletezés */}
      <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:12, overflow:"hidden", marginBottom:16 }}>
        <p style={{ padding:"10px 16px", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:.7, borderBottom:"1px solid #E2E8F0", margin:0, background:"#F8FAFC" }}>Tételek részletezése</p>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <tbody>
            <SorLabel label="Nettó bevétel"
              auto={sz?.nettoBevitel||0}
              kezi={penzugy.felultBevitel}
              elteres={penzugy.felultBevitel!==null&&penzugy.felultBevitel!==undefined}
              szin="#059669"/>
            <SorLabel label="Csapat bér"
              auto={kalk.csapatBer}
              kezi={penzugy.keziCsapatBer}
              elteres={penzugy.keziCsapatBer!==null&&penzugy.keziCsapatBer!==undefined}/>
            <SorLabel label="Útiköltség"
              auto={kalk.utikoltség}
              kezi={penzugy.keziUtikoltség}
              elteres={penzugy.keziUtikoltség!==null&&penzugy.keziUtikoltség!==undefined}/>
            <SorLabel label="Anyagköltség"
              auto={kalk.anyagkoltség}
              kezi={penzugy.keziAnyagkoltség}
              elteres={penzugy.keziAnyagkoltség!==null&&penzugy.keziAnyagkoltség!==undefined}/>
            {kalk.emelőgepKoltseg>0&&<SorLabel label="Emelőgép" auto={kalk.emelőgepKoltseg} kezi={null} elteres={false}/>}
            {kalk.kartérités>0&&<SorLabel label="Kártérítés"
              auto={kalk.kartérités}
              kezi={penzugy.keziKartérités}
              elteres={penzugy.keziKartérités!==null&&penzugy.keziKartérités!==undefined}
              szin="#DC2626"/>}
            {kalk.egyebKoltseg>0&&<SorLabel label="Egyéb költség" auto={kalk.egyebKoltseg} kezi={null} elteres={false}/>}
            <tr style={{ background:"#F8FAFC", borderTop:"2px solid #E2E8F0" }}>
              <td style={{ padding:"10px 12px", fontWeight:800, fontSize:13 }}>Összes költség</td>
              <td style={{ padding:"10px 12px", fontWeight:800, fontSize:14, color:"#DC2626" }}>{ft(kalk.osszesKolts)}</td>
              <td/>
            </tr>
            <tr style={{ background:"#F0FDF4" }}>
              <td style={{ padding:"10px 12px", fontWeight:800, fontSize:13 }}>Várható haszon</td>
              <td style={{ padding:"10px 12px", fontWeight:800, fontSize:14, color:kalk.varhatoHaszon>=0?"#059669":"#DC2626" }}>{ft(kalk.varhatoHaszon)}</td>
              <td style={{ padding:"10px 12px", fontSize:12, color:"#64748B" }}>{kalk.haszonkulcsPct!==null?`${kalk.haszonkulcsPct}%`:""}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Kártérítési tételek */}
      {kt.filter(k=>k.projektId===projekt.id||mls.some(m=>m.id===k.munkalapId)).length>0&&(
        <div>
          <p style={{ fontSize:12, fontWeight:700, color:"#374151", marginBottom:8 }}>Kártérítési tételek</p>
          {kt.filter(k=>k.projektId===projekt.id||mls.some(m=>m.id===k.munkalapId)).map(k=>(
            <div key={k.id} style={{ background:"#fff", border:`1px solid ${k.elfogadott?"#86EFAC":k.elfogadott===false?"#FECACA":"#E2E8F0"}`, borderRadius:9, padding:"9px 14px", marginBottom:6, display:"flex", justifyContent:"space-between" }}>
              <div><p style={{ fontWeight:600, fontSize:13, margin:0 }}>{k.ok}</p><p style={{ fontSize:11, color:"#64748B", margin:"2px 0 0" }}>{k.datum}</p></div>
              <div style={{ textAlign:"right" }}>
                <p style={{ fontWeight:700, color:"#DC2626", margin:0 }}>{ft(k.osszeg)}</p>
                <span style={{ fontSize:10, background:k.elfogadott?"#DCFCE7":k.elfogadott===false?"#FEE2E2":"#FFFBEB", color:k.elfogadott?"#166534":k.elfogadott===false?"#991B1B":"#92400E", padding:"1px 7px", borderRadius:20, fontWeight:700 }}>
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
