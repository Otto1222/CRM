import { useState } from "react";
import { RotateCcw, Trash2, Download, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { getBackups, restoreBackup, deleteBackup, createBackup } from "../lib/backupService";

export default function BackupKezelo({ userRole }) {
  const [backups,  setBackups]  = useState(() => getBackups());
  const [folyamat, setFolyamat] = useState(null); // "mentes"|"visszaallitas"
  const [uzenet,   setUzenet]   = useState(null);

  const isAdmin = userRole === "Admin";

  function refresh() { setBackups(getBackups()); }

  async function handleMentes() {
    setFolyamat("mentes");
    const label = `Manuális mentés – ${new Date().toLocaleString("hu-HU")}`;
    const id = createBackup(label);
    setFolyamat(null);
    setUzenet({ ok:true, szoveg:`✅ Mentés kész: ${id}` });
    setTimeout(()=>setUzenet(null), 4000);
    refresh();
  }

  async function handleVissza(id, label) {
    if (!window.confirm(`Biztosan visszaállítod ezt a verziót?\n\n"${label}"\n\nA jelenlegi állapot FELÜLÍRÓDIK (de előtte automatikusan ment).`)) return;
    setFolyamat("visszaallitas");
    const ok = restoreBackup(id);
    setFolyamat(null);
    setUzenet(ok
      ? { ok:true,  szoveg:"✅ Visszaállítás sikeres! Az oldal frissül…" }
      : { ok:false, szoveg:"❌ Visszaállítás sikertelen!" }
    );
    if (ok) setTimeout(() => window.location.reload(), 1500);
    refresh();
  }

  function handleTorol(id) {
    if (!window.confirm("Biztosan törlöd ezt a mentést?")) return;
    deleteBackup(id);
    refresh();
  }

  function handleExport(backup) {
    const blob = new Blob(
  ["\uFEFF" + JSON.stringify(backup, null, 2)],
  { type: "application/json;charset=utf-8" }
);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `crm_backup_${backup.id}.json`;
    a.click();
  }

  return (
    <div style={{padding:"24px 28px",fontFamily:FONT,maxWidth:860}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h2 style={{fontFamily:FONT_HEADING,fontSize:22,fontWeight:800,color:C.text,margin:0}}>🛡️ Biztonsági mentések</h2>
          <p style={{fontSize:13,color:C.muted,margin:"4px 0 0"}}>Automatikus mentések minden nagyobb változtatás előtt készülnek</p>
        </div>
        <button onClick={handleMentes} disabled={!!folyamat} style={{display:"flex",alignItems:"center",gap:7,padding:"10px 18px",background:"#059669",color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:FONT}}>
          <Shield size={16}/> Mentés most
        </button>
      </div>

      {uzenet && (
        <div style={{marginBottom:16,padding:"10px 14px",borderRadius:10,background:uzenet.ok?"#F0FDF4":"#FEF2F2",border:`1.5px solid ${uzenet.ok?"#86EFAC":"#FECACA"}`,fontSize:13,fontWeight:700,color:uzenet.ok?"#166534":"#DC2626"}}>
          {uzenet.szoveg}
        </div>
      )}

      <div style={{background:"#FFFBEB",border:"1.5px solid #FCD34D",borderRadius:12,padding:"14px 16px",marginBottom:20,display:"flex",gap:10}}>
        <AlertTriangle size={18} color="#D97706" style={{flexShrink:0,marginTop:1}}/>
        <p style={{fontSize:12,color:"#92400E",margin:0,lineHeight:1.6}}>
          <strong>Visszaállítás előtt:</strong> A jelenlegi állapot automatikusan elmenti magát mint „Visszaállítás előtti állapot". 
          Max {10} mentés tárolódik – a legrégebbi törlődik automatikusan.
        </p>
      </div>

      {backups.length === 0 ? (
        <div style={{textAlign:"center",padding:"48px 0",color:C.muted}}>
          <Shield size={40} style={{opacity:.15,display:"block",margin:"0 auto 12px"}}/>
          <p>Még nincsenek biztonsági mentések</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {backups.map((b,i) => (
            <div key={b.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${i===0?"#86EFAC":C.border}`,padding:"14px 18px",display:"flex",alignItems:"center",gap:14}}>
              <div style={{width:40,height:40,borderRadius:"50%",background:i===0?"#F0FDF4":"#F8FAFC",border:`2px solid ${i===0?"#22C55E":C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {i===0 ? <CheckCircle2 size={20} color="#22C55E"/> : <Shield size={18} color={C.muted}/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontWeight:700,fontSize:14,color:C.text,margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {b.label} {i===0&&<span style={{fontSize:11,color:"#22C55E",fontWeight:600}}>· Legfrissebb</span>}
                </p>
                <p style={{fontSize:11,color:C.muted,margin:"2px 0 0"}}>
                  {new Date(b.createdAt).toLocaleString("hu-HU")} · v{b.version} · {Object.keys(b.data||{}).length} adat kulcs
                </p>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}}>
                <button onClick={()=>handleExport(b)} title="JSON letöltés" style={{padding:"6px 10px",background:"#F8FAFC",color:C.muted,border:`1px solid ${C.border}`,borderRadius:7,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:12}}>
                  <Download size={13}/>
                </button>
                {isAdmin && <>
                  <button onClick={()=>handleVissza(b.id,b.label)} disabled={!!folyamat} style={{padding:"6px 12px",background:"#EFF6FF",color:"#2563EB",border:"none",borderRadius:7,cursor:"pointer",fontWeight:600,fontSize:12,display:"flex",alignItems:"center",gap:4,fontFamily:FONT}}>
                    <RotateCcw size={13}/> Visszaállítás
                  </button>
                  <button onClick={()=>handleTorol(b.id)} style={{padding:"6px 10px",background:"#FEF2F2",color:"#DC2626",border:"none",borderRadius:7,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:12}}>
                    <Trash2 size={13}/>
                  </button>
                </>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
