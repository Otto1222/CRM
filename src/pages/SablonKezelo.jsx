import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Edit3, Save, X, Upload, Eye, FileText } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { SABLON_SCHEMA } from "../lib/schema";
import { createBackup } from "../lib/backupService";

const SABLON_TIPUSOK = [
  { id:"atadasatvetes", nev:"Munkaterület Átadás/Átvétel Jegyzőkönyv", icon:"📋" },
  { id:"felmeres",      nev:"Felmérési Napló",                          icon:"📐" },
  { id:"egyeb",         nev:"Egyéb dokumentum sablon",                  icon:"📄" },
];

const BETUTIPUSOK = ["Arial","Times New Roman","Georgia","Helvetica","Verdana","Tahoma","Courier New"];
const BETUMERETEK = [8,9,10,11,12,14,16,18,20,24,28,32,36,48,72];

function loadSablonok() {
  try { return JSON.parse(localStorage.getItem("sablonok")||"[]"); } catch { return []; }
}
function saveSablonok(list) {
  localStorage.setItem("sablonok", JSON.stringify(list));
  window.dispatchEvent(new CustomEvent("crm-db-updated",{detail:{collection:"sablonok"}}));
}

// ─── Rich Text Toolbar ────────────────────────────────────────
function RTToolbar({ onCommand, betutipus, setBetutipus, betuMeret, setBetuMeret }) {
  const btn = (cmd,label,title) => (
    <button key={cmd} onMouseDown={e=>{ e.preventDefault(); onCommand(cmd); }}
      title={title||label}
      style={{padding:"4px 8px",border:`1px solid ${C.border}`,borderRadius:5,background:C.bg,cursor:"pointer",fontSize:13,fontFamily:FONT,lineHeight:1}}>
      {label}
    </button>
  );
  return (
    <div style={{ display:"flex",flexWrap:"wrap",gap:4,padding:"8px",borderBottom:`1px solid ${C.border}`,background:C.bg }}>
      {/* Betűtípus */}
      <select value={betutipus} onChange={e=>{setBetutipus(e.target.value);onCommand("fontName",e.target.value);}}
        style={{padding:"4px 6px",border:`1px solid ${C.border}`,borderRadius:5,fontSize:12,fontFamily:FONT,cursor:"pointer"}}>
        {BETUTIPUSOK.map(f=><option key={f}>{f}</option>)}
      </select>
      {/* Betűméret */}
      <select value={betuMeret} onChange={e=>{setBetuMeret(e.target.value);onCommand("fontSize",BETUMERETEK.indexOf(Number(e.target.value))+1||3);}}
        style={{padding:"4px 6px",border:`1px solid ${C.border}`,borderRadius:5,fontSize:12,fontFamily:FONT,cursor:"pointer",width:60}}>
        {BETUMERETEK.map(s=><option key={s}>{s}</option>)}
      </select>
      <div style={{width:1,background:C.border,margin:"0 2px"}}/>
      {btn("bold",<b>B</b>,"Félkövér")}
      {btn("italic",<i>I</i>,"Dőlt")}
      {btn("underline",<u>U</u>,"Aláhúzott")}
      <div style={{width:1,background:C.border,margin:"0 2px"}}/>
      {btn("justifyLeft","⬅","Balra")}
      {btn("justifyCenter","↔","Középre")}
      {btn("justifyRight","➡","Jobbra")}
      {btn("justifyFull","☰","Sorkizárt")}
      <div style={{width:1,background:C.border,margin:"0 2px"}}/>
      {btn("insertUnorderedList","• Lista","Felsorolás")}
      {btn("insertOrderedList","1. Lista","Számozott lista")}
      <div style={{width:1,background:C.border,margin:"0 2px"}}/>
      {btn("insertHorizontalRule","—","Elválasztó")}
      <button onMouseDown={e=>{e.preventDefault();
        const tbl=`<table border="1" style="border-collapse:collapse;width:100%"><tr><td style="padding:4px">Cella 1</td><td style="padding:4px">Cella 2</td></tr><tr><td style="padding:4px">Cella 3</td><td style="padding:4px">Cella 4</td></tr></table>`;
        onCommand("insertHTML",tbl);}}
        title="Táblázat" style={{padding:"4px 8px",border:`1px solid ${C.border}`,borderRadius:5,background:C.bg,cursor:"pointer",fontSize:12}}>
        ⊞ Táblázat
      </button>
    </div>
  );
}

// ─── Sablon szerkesztő modal ─────────────────────────────────
function SablonSzerkeszto({ sablon, onSave, onClose }) {
  const [nev,       setNev]       = useState(sablon.nev||"");
  const [tipus,     setTipus]     = useState(sablon.tipus||"egyeb");
  const [betutipus, setBetutipus] = useState(sablon.betutipus||"Arial");
  const [betuMeret, setBetuMeret] = useState(12);
  const [fejlec,    setFejlec]    = useState(sablon.fejlec||null);
  const [labléc,    setLabléc]    = useState(sablon.labléc||null);
  const [aktivTab,  setAktivTab]  = useState("tartalom"); // "tartalom"|"fejlec"|"labléc"
  const editorRef = useRef();
  const fejlecRef = useRef();
  const lablecRef = useRef();

  useEffect(() => {
    if (editorRef.current && sablon.tartalom) {
      editorRef.current.innerHTML = sablon.tartalom;
    }
  }, []);

  function execCmd(cmd, val) {
    document.execCommand(cmd, false, val||null);
    editorRef.current?.focus();
  }

  async function handleKepFeltoltes(e, setKep) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setKep(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleSave() {
    const tartalom = editorRef.current?.innerHTML || "";
    onSave({
      ...sablon,
      nev, tipus, betutipus, fejlec, labléc, tartalom,
      updatedAt: new Date().toISOString(),
    });
  }

  const tabStyle = (t) => ({
    padding:"8px 16px",border:"none",cursor:"pointer",fontFamily:FONT,fontWeight:600,fontSize:13,
    background: aktivTab===t?C.text:C.bg,
    color:       aktivTab===t?"#fff":C.muted,
    borderRadius:"8px 8px 0 0",
  });

  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,.65)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:20,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:16,width:"100%",maxWidth:860,boxShadow:"0 24px 60px rgba(0,0,0,.3)",fontFamily:FONT}}>
        {/* Fejléc */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 24px",borderBottom:`1px solid ${C.border}`}}>
          <h2 style={{fontFamily:FONT_HEADING,fontSize:18,fontWeight:800,margin:0}}>
            {sablon.id ? "Sablon szerkesztése" : "Új sablon"}
          </h2>
          <button onClick={onClose} style={{border:"none",background:"none",cursor:"pointer",color:C.muted}}><X size={22}/></button>
        </div>

        <div style={{padding:"20px 24px"}}>
          {/* Meta mezők */}
          <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12,marginBottom:16}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>Sablon neve *</label>
              <input value={nev} onChange={e=>setNev(e.target.value)} placeholder="pl. Munkaterület Átadás/Átvétel"
                style={{width:"100%",boxSizing:"border-box",padding:"9px 12px",border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:14,fontFamily:FONT,outline:"none"}}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>Típus</label>
              <select value={tipus} onChange={e=>setTipus(e.target.value)}
                style={{width:"100%",padding:"9px 12px",border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:FONT,outline:"none"}}>
                {SABLON_TIPUSOK.map(t=><option key={t.id} value={t.id}>{t.nev}</option>)}
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:"flex",gap:4,marginBottom:0}}>
            {[["tartalom","📝 Tartalom"],["fejlec","🖼️ Fejléc"],["labléc","🖼️ Lábléc"]].map(([t,l])=>(
              <button key={t} onClick={()=>setAktivTab(t)} style={tabStyle(t)}>{l}</button>
            ))}
          </div>

          {/* Tartalom szerkesztő */}
          {aktivTab==="tartalom" && (
            <div style={{border:`1.5px solid ${C.border}`,borderRadius:"0 8px 8px 8px",overflow:"hidden"}}>
              <RTToolbar onCommand={execCmd} betutipus={betutipus} setBetutipus={setBetutipus} betuMeret={betuMeret} setBetuMeret={setBetuMeret}/>
              <div ref={editorRef} contentEditable suppressContentEditableWarning
                style={{
                  minHeight:280,padding:"16px",fontFamily:betutipus,fontSize:13,
                  outline:"none",lineHeight:1.7,color:C.text,overflowY:"auto",maxHeight:400,
                }}/>
            </div>
          )}

          {/* Fejléc kép */}
          {aktivTab==="fejlec" && (
            <div style={{border:`1.5px solid ${C.border}`,borderRadius:"0 8px 8px 8px",padding:20}}>
              <p style={{fontSize:13,color:C.muted,marginBottom:12}}>Töltj fel fejléc képet (JPG/PNG). Ez jelenik meg minden dokumentum tetején.</p>
              <input ref={fejlecRef} type="file" accept="image/jpeg,image/png" style={{display:"none"}}
                onChange={e=>handleKepFeltoltes(e,setFejlec)}/>
              <button onClick={()=>fejlecRef.current?.click()} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",background:C.accentLight,color:C.accent,border:"1.5px solid #BFDBFE",borderRadius:9,cursor:"pointer",fontWeight:600,fontFamily:FONT}}>
                <Upload size={16}/> Fejléc kép feltöltése
              </button>
              {fejlec && <img src={fejlec} alt="Fejléc" style={{display:"block",marginTop:12,maxHeight:120,border:`1px solid ${C.border}`,borderRadius:8}}/>}
              {fejlec && <button onClick={()=>setFejlec(null)} style={{marginTop:8,fontSize:12,color:C.danger,border:"none",background:"none",cursor:"pointer"}}>Törlés</button>}
            </div>
          )}

          {/* Lábléc kép */}
          {aktivTab==="labléc" && (
            <div style={{border:`1.5px solid ${C.border}`,borderRadius:"0 8px 8px 8px",padding:20}}>
              <p style={{fontSize:13,color:C.muted,marginBottom:12}}>Töltj fel lábléc képet (JPG/PNG). Ez jelenik meg minden dokumentum alján.</p>
              <input ref={lablecRef} type="file" accept="image/jpeg,image/png" style={{display:"none"}}
                onChange={e=>handleKepFeltoltes(e,setLabléc)}/>
              <button onClick={()=>lablecRef.current?.click()} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 16px",background:C.accentLight,color:C.accent,border:"1.5px solid #BFDBFE",borderRadius:9,cursor:"pointer",fontWeight:600,fontFamily:FONT}}>
                <Upload size={16}/> Lábléc kép feltöltése
              </button>
              {labléc && <img src={labléc} alt="Lábléc" style={{display:"block",marginTop:12,maxHeight:80,border:`1px solid ${C.border}`,borderRadius:8}}/>}
              {labléc && <button onClick={()=>setLabléc(null)} style={{marginTop:8,fontSize:12,color:C.danger,border:"none",background:"none",cursor:"pointer"}}>Törlés</button>}
            </div>
          )}
        </div>

        <div style={{padding:"14px 24px",borderTop:`1px solid ${C.border}`,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <button onClick={onClose} style={{padding:"9px 18px",borderRadius:9,border:`1.5px solid ${C.border}`,background:"#fff",fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:FONT}}>Mégse</button>
          <button onClick={handleSave} disabled={!nev.trim()} style={{display:"flex",alignItems:"center",gap:7,padding:"9px 22px",background:nev.trim()?C.success:C.border,color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:FONT}}>
            <Save size={15}/> Sablon mentése
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── FŐ KOMPONENS ────────────────────────────────────────────
export default function SablonKezelo({ userRole }) {
  const [sablonok,  setSablonok]  = useState(() => loadSablonok());
  const [szerkeszt, setSzerkeszt] = useState(null); // null | sablon obj
  const [preview,   setPreview]   = useState(null);

  const isAdmin = ["Admin","Projektmenedzser"].includes(userRole);

  function handleSave(sablon) {
    createBackup("Sablon mentés előtt");
    const list = sablon.id
      ? sablonok.map(s => s.id===sablon.id ? sablon : s)
      : [...sablonok, { ...sablon, id:`sbl_${Date.now()}`, createdAt:new Date().toISOString() }];
    saveSablonok(list);
    setSablonok(list);
    setSzerkeszt(null);
  }

  function handleDelete(id) {
    if (!window.confirm("Biztosan törlöd ezt a sablont?")) return;
    createBackup("Sablon törlés előtt");
    const list = sablonok.filter(s => s.id!==id);
    saveSablonok(list);
    setSablonok(list);
  }

  function handlePreview(sablon) {
    const w = window.open("","_blank");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${sablon.nev}</title>
    <style>body{font-family:${sablon.betutipus||"Arial"},sans-serif;padding:20mm;max-width:210mm;margin:0 auto;}
    table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:6px;}</style></head><body>
    ${sablon.fejlec?`<img src="${sablon.fejlec}" style="max-width:100%;max-height:80px;display:block;margin-bottom:8mm"/>`:``}
    ${sablon.tartalom||"<p style='color:#ccc'>Üres sablon</p>"}
    ${sablon.labléc?`<div style="margin-top:10mm;border-top:1px solid #ccc;padding-top:4mm"><img src="${sablon.labléc}" style="max-height:60px"/></div>`:""}
    </body></html>`);
    w.document.close();
  }

  return (
    <div style={{padding:"24px 28px",fontFamily:FONT,maxWidth:900}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
        <div>
          <h2 style={{fontFamily:FONT_HEADING,fontSize:22,fontWeight:800,color:C.text,margin:0}}>📄 Dokumentum sablonok</h2>
          <p style={{fontSize:13,color:C.muted,margin:"4px 0 0"}}>Word-szerű szerkesztővel hozz létre újrahasználható dokumentum sablonokat</p>
        </div>
        {isAdmin && (
          <button onClick={()=>setSzerkeszt({...SABLON_SCHEMA})} style={{display:"flex",alignItems:"center",gap:7,padding:"10px 18px",background:C.accent,color:"#fff",border:"none",borderRadius:10,cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:FONT}}>
            <Plus size={16}/> Új sablon
          </button>
        )}
      </div>

      {sablonok.length === 0 ? (
        <div style={{textAlign:"center",padding:"60px 0",color:C.muted}}>
          <FileText size={48} style={{opacity:.15,display:"block",margin:"0 auto 16px"}}/>
          <p style={{fontSize:15,fontWeight:600}}>Még nincsenek sablonok</p>
          <p style={{fontSize:13,marginTop:6}}>Hozd létre az első dokumentum sablont az „Új sablon" gombbal</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {sablonok.map(s => {
            const tipusInfo = SABLON_TIPUSOK.find(t=>t.id===s.tipus)||SABLON_TIPUSOK[2];
            return (
              <div key={s.id} style={{background:"#fff",borderRadius:12,border:`1px solid ${C.border}`,padding:"16px 20px",display:"flex",alignItems:"center",gap:16}}>
                <span style={{fontSize:28,flexShrink:0}}>{tipusInfo.icon}</span>
                <div style={{flex:1}}>
                  <p style={{fontWeight:700,fontSize:15,color:C.text,margin:0}}>{s.nev}</p>
                  <p style={{fontSize:12,color:C.muted,margin:"3px 0 0"}}>
                    {tipusInfo.nev} · {s.betutipus||"Arial"} · {s.updatedAt?new Date(s.updatedAt).toLocaleDateString("hu-HU"):"Nincs mentve"}
                    {s.fejlec&&" · 🖼️ Fejléc"}{s.labléc&&" · 🖼️ Lábléc"}
                  </p>
                </div>
                <div style={{display:"flex",gap:8,flexShrink:0}}>
                  <button onClick={()=>handlePreview(s)} title="Előnézet" style={{padding:"7px 12px",background:C.bg,color:C.textSub,border:"none",borderRadius:8,cursor:"pointer",fontFamily:FONT,fontSize:12,display:"flex",alignItems:"center",gap:5}}>
                    <Eye size={13}/> Előnézet
                  </button>
                  {isAdmin && <>
                    <button onClick={()=>setSzerkeszt(s)} title="Szerkesztés" style={{padding:"7px 12px",background:C.accentLight,color:C.accent,border:"none",borderRadius:8,cursor:"pointer",fontFamily:FONT,fontSize:12,display:"flex",alignItems:"center",gap:5}}>
                      <Edit3 size={13}/> Szerkesztés
                    </button>
                    <button onClick={()=>handleDelete(s.id)} title="Törlés" style={{padding:"7px 12px",background:C.dangerLight,color:C.danger,border:"none",borderRadius:8,cursor:"pointer",fontFamily:FONT,fontSize:12,display:"flex",alignItems:"center",gap:5}}>
                      <Trash2 size={13}/> Törlés
                    </button>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {szerkeszt && <SablonSzerkeszto sablon={szerkeszt} onSave={handleSave} onClose={()=>setSzerkeszt(null)}/>}
    </div>
  );
}
