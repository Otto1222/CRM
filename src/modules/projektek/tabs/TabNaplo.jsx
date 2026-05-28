import { useState } from "react";
import { Send } from "lucide-react";
import { C, FONT } from "../../../lib/constants.js";
import { addMegjegyzes } from "../projekt.service.js";

export default function TabNaplo({ projekt, currentUser }) {
  const [szoveg, setSzoveg] = useState("");
  const naplo = [...(projekt.esemenynaplo||[]), ...(projekt.megjegyzesek||[]).map(m=>({...m, esemeny:"Megjegyzés", reszletek:m.szoveg}))]
    .sort((a,b)=>new Date(b.datum)-new Date(a.datum));

  function handleSend() {
    if (!szoveg.trim()) return;
    addMegjegyzes(projekt.id, szoveg.trim(), currentUser?.name);
    setSzoveg("");
  }

  return (
    <div style={{ paddingTop:16 }}>
      {/* Új megjegyzés */}
      <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:12, padding:14, marginBottom:16, display:"flex", gap:10 }}>
        <textarea value={szoveg} onChange={e=>setSzoveg(e.target.value)} placeholder="Megjegyzés vagy feljegyzés hozzáadása…" rows={2}
          style={{ flex:1, border:"1.5px solid #E2E8F0", borderRadius:9, padding:"9px 12px", fontSize:13, fontFamily:FONT, resize:"none", outline:"none" }}/>
        <button onClick={handleSend} disabled={!szoveg.trim()} style={{ padding:"0 16px", background:szoveg.trim()?"#2563EB":"#CBD5E1", color:"#fff", border:"none", borderRadius:9, cursor:szoveg.trim()?"pointer":"not-allowed", display:"flex", alignItems:"center", gap:6, fontWeight:600, fontSize:13, fontFamily:FONT }}>
          <Send size={14}/> Küld
        </button>
      </div>

      {/* Napló lista */}
      {naplo.length === 0 ? (
        <p style={{ textAlign:"center", color:"#94A3B8", padding:"40px 0" }}>Nincs napló bejegyzés</p>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {naplo.map((e,i) => (
            <div key={e.id||i} style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, padding:"12px 16px", display:"flex", gap:14 }}>
              <div style={{ width:36, height:36, borderRadius:"50%", background:"#EFF6FF", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>
                {e.esemeny==="Státusz változás"?"🔄":e.esemeny==="Megjegyzés"?"💬":e.esemeny==="Projekt létrehozva"?"✅":"📌"}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:3 }}>
                  <span style={{ fontWeight:700, fontSize:13 }}>{e.esemeny}</span>
                  <span style={{ fontSize:11, color:"#94A3B8" }}>{e.user || "Rendszer"}</span>
                  <span style={{ fontSize:11, color:"#CBD5E1", marginLeft:"auto" }}>{new Date(e.datum).toLocaleString("hu-HU")}</span>
                </div>
                {e.reszletek && <p style={{ fontSize:13, color:"#475569", margin:0, lineHeight:1.5 }}>{e.reszletek}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
