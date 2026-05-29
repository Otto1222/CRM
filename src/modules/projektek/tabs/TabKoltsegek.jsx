import { useState } from "react";
import { AlertTriangle, RefreshCw, Pencil, Check, X } from "lucide-react";
import { C, FONT } from "../../../lib/constants.js";
import { ft } from "../../../lib/helpers.js";
import { loadKarteritesek } from "../../../lib/karterites.js";
import { calcEsmentProjektPenzugy, loadTetelek, felulirTetel, visszaallitTetel } from "../../../services/workOrderFinancial.service.js";
import { loadFovallalkozok } from "../../fovallalkozok/fovallalkozo.service.js";
import { getMunkatipus } from "../../munkatipusok/munkatipus.service.js";

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${color}30`, borderRadius:12, padding:"14px 16px" }}>
      <p style={{ fontSize:10, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:.7, margin:"0 0 5px" }}>{label}</p>
      <p style={{ fontSize:20, fontWeight:800, color, margin:0 }}>{value}</p>
      {sub && <p style={{ fontSize:10, color:"#94A3B8", margin:"3px 0 0" }}>{sub}</p>}
    </div>
  );
}

function TetelSor({ tetel, projektId, onRefresh, currentUser }) {
  const [editMode, setEditMode] = useState(false);
  const [editVal, setEditVal]   = useState(tetel.hasznalandoNetto);

  function handleSave() {
    felulirTetel(projektId, tetel.tetelTipusId, editVal, currentUser?.name);
    setEditMode(false);
    onRefresh();
  }
  function handleVissza() {
    visszaallitTetel(projektId, tetel.tetelTipusId);
    setEditMode(false);
    onRefresh();
  }

  return (
    <tr style={{ borderBottom:"1px solid #F1F5F9" }}>
      <td style={{ padding:"9px 12px", fontSize:12, fontWeight:600, color:"#374151" }}>{tetel.megnevezes}</td>
      <td style={{ padding:"9px 12px" }}>
        {editMode ? (
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            <input type="number" value={editVal} onChange={e=>setEditVal(Number(e.target.value))}
              style={{ width:100, padding:"4px 8px", border:"1.5px solid #2563EB", borderRadius:6, fontSize:13, fontFamily:FONT }}/>
            <button onClick={handleSave} style={{ padding:"4px 8px", background:"#059669", color:"#fff", border:"none", borderRadius:6, cursor:"pointer" }}><Check size={13}/></button>
            <button onClick={()=>setEditMode(false)} style={{ padding:"4px 8px", background:"#F1F5F9", border:"none", borderRadius:6, cursor:"pointer" }}><X size={13}/></button>
          </div>
        ) : (
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:13, fontWeight: tetel.felulirva ? 700 : 400, color: tetel.felulirva ? "#D97706" : "#0F172A" }}>
              {ft(tetel.hasznalandoNetto)}
            </span>
            {tetel.felulirva && (
              <span style={{ fontSize:10, background:"#FFFBEB", color:"#D97706", padding:"1px 6px", borderRadius:20, fontWeight:700 }}>
                ⚠️ kézi
              </span>
            )}
            {tetel.hiany && (
              <span style={{ fontSize:10, background:"#FEF2F2", color:"#DC2626", padding:"1px 6px", borderRadius:20, fontWeight:700 }}>
                ⚠️ hiányos
              </span>
            )}
          </div>
        )}
      </td>
      <td style={{ padding:"9px 12px", fontSize:11, color:"#94A3B8" }}>
        {tetel.felulirva ? `Auto lenne: ${ft(tetel.autoNetto)}` : tetel.megjegyzes}
      </td>
      <td style={{ padding:"9px 12px" }}>
        <div style={{ display:"flex", gap:4 }}>
          {!editMode && (
            <button onClick={()=>{setEditVal(tetel.hasznalandoNetto);setEditMode(true);}} title="Felülír" style={{ padding:"3px 7px", background:"#EFF6FF", color:"#2563EB", border:"none", borderRadius:6, cursor:"pointer" }}>
              <Pencil size={11}/>
            </button>
          )}
          {tetel.felulirva && !editMode && (
            <button onClick={handleVissza} title="Auto visszaállítás" style={{ padding:"3px 7px", background:"#ECFDF5", color:"#059669", border:"none", borderRadius:6, cursor:"pointer" }}>
              <RefreshCw size={11}/>
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function TabKoltsegek({ projekt, munkalapok, currentUser }) {
  const [v, setV] = useState(0); // force refresh counter
  const refresh   = () => setV(n => n+1);

  const kalk = calcEsmentProjektPenzugy(projekt);
  const tetelek = loadTetelek(projekt.id);
  const fvNev   = kalk.fovallalkoNev;
  const mtipus  = getMunkatipus(projekt?.penzugy?.munkatipus);
  const penzugy = projekt?.penzugy || {};

  const nincsKonfig = !penzugy.fovallalkoziId;

  return (
    <div style={{ paddingTop:16 }}>
      {nincsKonfig && (
        <div style={{ background:"#FFFBEB", border:"1.5px solid #FCD34D", borderRadius:12, padding:"14px 16px", marginBottom:16, display:"flex", gap:10 }}>
          <AlertTriangle size={18} color="#D97706"/>
          <div>
            <p style={{ fontWeight:700, fontSize:13, color:"#92400E", margin:0 }}>Nincs fővállalkozó és munkatípus beállítva</p>
            <p style={{ fontSize:12, color:"#92400E", margin:"3px 0 0" }}>Szerkeszd a projektet és töltsd ki a pénzügyi konfigurációt.</p>
          </div>
        </div>
      )}

      {kalk.elteres && (
        <div style={{ background:"#FFFBEB", border:"1.5px solid #FCD34D", borderRadius:12, padding:"10px 16px", marginBottom:12, fontSize:12, color:"#92400E" }}>
          ⚠️ <strong>Kézi eltérés a szabálytól:</strong> {kalk.elteresek.join(", ")} · Az összeg eltér az elszámolási szabály alapján számolt értéktől.
        </div>
      )}

      {kalk.hianyosTetelek?.length > 0 && (
        <div style={{ background:"#FEF2F2", border:"1.5px solid #FECACA", borderRadius:12, padding:"10px 16px", marginBottom:12, fontSize:12, color:"#DC2626" }}>
          ⚠️ <strong>Hiányos tételek (kézi megadás szükséges):</strong> {kalk.hianyosTetelek.join(", ")}
        </div>
      )}

      {/* Konfig info sáv */}
      {fvNev && (
        <div style={{ background:"#F0FDF4", border:"1px solid #86EFAC", borderRadius:12, padding:"10px 16px", marginBottom:14, display:"flex", gap:16, flexWrap:"wrap" }}>
          <div><p style={{ fontSize:10, fontWeight:700, color:"#64748B", margin:"0 0 1px" }}>FŐVÁLLALKOZÓ</p><p style={{ fontWeight:700, fontSize:13, color:"#166534" }}>{fvNev}</p></div>
          {mtipus && <div><p style={{ fontSize:10, fontWeight:700, color:"#64748B", margin:"0 0 1px" }}>MUNKATÍPUS</p><p style={{ fontSize:12, color:"#166534" }}>{mtipus.nev}</p></div>}
          <div><p style={{ fontSize:10, fontWeight:700, color:"#64748B", margin:"0 0 1px" }}>KONFIG</p><p style={{ fontSize:12, color:"#166534" }}>{penzugy.darabszam||1} db · {penzugy.tavKm||0} km · {penzugy.csapatLetszam||1} fő · {penzugy.munkanapok||1} nap</p></div>
        </div>
      )}

      {/* Összesítő kártyák */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
        <StatCard label="Nettó bevétel"    value={ft(kalk.nettoBevitel)}    color="#059669" sub={kalk.bruttoBevitel>0?`Bruttó: ${ft(kalk.bruttoBevitel)}`:null}/>
        <StatCard label="Összes költség"   value={ft(kalk.osszesKolts)}     color="#DC2626"/>
        <StatCard label="Várható haszon"   value={ft(kalk.haszon)}          color={kalk.haszon>=0?"#059669":"#DC2626"}/>
        <StatCard label="Haszonkulcs"
          value={kalk.haszonPct!==null?`${kalk.haszonPct}%`:"—"}
          color={kalk.haszonPct!==null?(kalk.haszonPct>=0?"#059669":"#DC2626"):"#94A3B8"}/>
      </div>

      {/* Bevételi tételek */}
      {tetelek.length > 0 && (
        <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:12, overflow:"hidden", marginBottom:14 }}>
          <p style={{ padding:"9px 14px", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", background:"#F8FAFC", margin:0, borderBottom:"1px solid #E2E8F0" }}>Bevételi tételek (automatikus)</p>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr style={{ background:"#F8FAFC", borderBottom:"1px solid #E2E8F0" }}>
              {["Megnevezés","Összeg","Megjegyzés",""].map(h=>(
                <th key={h} style={{ padding:"7px 12px", textAlign:"left", fontSize:10, fontWeight:700, color:"#64748B" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {tetelek.map(t => (
                <TetelSor key={t.id} tetel={t} projektId={projekt.id} onRefresh={refresh} currentUser={currentUser}/>
              ))}
              <tr style={{ background:"#F0FDF4", borderTop:"2px solid #86EFAC" }}>
                <td style={{ padding:"9px 12px", fontWeight:800 }}>Összes bevétel</td>
                <td style={{ padding:"9px 12px", fontWeight:800, color:"#059669", fontSize:14 }}>{ft(kalk.nettoBevitel)}</td>
                <td/><td/>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Költségek */}
      <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:12, overflow:"hidden" }}>
        <p style={{ padding:"9px 14px", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", background:"#F8FAFC", margin:0, borderBottom:"1px solid #E2E8F0" }}>Költségtételek</p>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <tbody>
            {[
              ["Csapat bér",   kalk.csapatBer,        penzugy.keziCsapatBer],
              ["Útiköltség",   kalk.utikoltség,        penzugy.keziUtikoltség],
              ["Anyagköltség", kalk.anyagkoltség,      penzugy.keziAnyagkoltség],
              ["Emelőgép",     kalk.emelőgepKoltseg,   null],
              ["Kártérítés",   kalk.kartérités,        penzugy.keziKartérités],
              ["Egyéb",        kalk.egyebKoltseg,      null],
            ].filter(([,v])=>v>0).map(([l,v,kezi])=>(
              <tr key={l} style={{ borderBottom:"1px solid #F1F5F9" }}>
                <td style={{ padding:"8px 12px", fontSize:12, fontWeight:600, color:"#374151" }}>{l}</td>
                <td style={{ padding:"8px 12px", fontSize:13, color: kezi!==null&&kezi!==undefined?"#D97706":"#DC2626", fontWeight: kezi!==null&&kezi!==undefined?700:400 }}>
                  {ft(v)}
                  {kezi!==null&&kezi!==undefined&&<span style={{ marginLeft:6, fontSize:10, background:"#FFFBEB", color:"#D97706", padding:"1px 6px", borderRadius:20, fontWeight:700 }}>⚠️ kézi</span>}
                </td>
                <td/>
              </tr>
            ))}
            <tr style={{ background:"#FEF2F2", borderTop:"2px solid #FECACA" }}>
              <td style={{ padding:"9px 12px", fontWeight:800 }}>Összes költség</td>
              <td style={{ padding:"9px 12px", fontWeight:800, color:"#DC2626", fontSize:14 }}>{ft(kalk.osszesKolts)}</td>
              <td/>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
