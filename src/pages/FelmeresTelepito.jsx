import { useState, useRef, useEffect } from "react";
import { Camera, Save, ArrowLeft, CheckCircle2, X, Loader2, RotateCcw, Phone, MapPin } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { updateItem, loadLocal } from "../lib/localDb";

// ─── 7 Fotós kategória ────────────────────────────────────────
const FOTO_KAT = [
  { id:"csatl_pont",    nev:"Csatlakozási pont",          icon:"🔌", leiras:"Hova csatlakozik a rendszer? Tablóra, alhálózatra stb." },
  { id:"inverter_fal",  nev:"Inverter fal, elhelyezés",   icon:"⚡", leiras:"Tervezett inverter helye – fal típusa, mérete, hozzáférés" },
  { id:"akku_fal",      nev:"Akkumulátor elhelyezése",    icon:"🔋", leiras:"Tervezett akku helye – fal, padló, méret, hozzáférés" },
  { id:"teto_tipus",    nev:"Tető típusa",                icon:"🏠", leiras:"Tető anyaga, szöge, iránya, esetleges akadályok" },
  { id:"padlas",        nev:"Padlás",                     icon:"🏗️", leiras:"Padlástér állapota, járhatóság, kábelvezet lehetőség" },
  { id:"villamharitor", nev:"Villámhárító",               icon:"⚡", leiras:"Van-e villámhárító? Milyen típusú és állapotú?" },
  { id:"mero_kismeg",   nev:"Mérőóra és kismegszakító",   icon:"📊", leiras:"Szolgáltatói mérőóra és kismegszakító típusa, elhelyezése, kapacitás" },
];

// ─── Szöveges felmérési mezők (csoportosítva) ─────────────────
const SZOVEGES_CSOPORTOK = [
  { cim:"Csatlakozás", mezok:[
    { k:"csatlakozasiPont",     label:"Csatlakozási pont" },
    { k:"csatlPontAllapota",    label:"Csatl. pont állapota" },
    { k:"acKabelHossz",         label:"AC kábel terv. hossz (m)" },
    { k:"acVedelem",            label:"AC védelem típus" },
    { k:"kommKabelHossz",       label:"Komm. kábel terv. hossza (m)" },
  ]},
  { cim:"Inverter / Akkumulátor", mezok:[
    { k:"inverterFal",          label:"Inverter fal, elhelyezés leírása" },
    { k:"akkuFal",              label:"Akkumulátor fal, elhelyezés leírása" },
    { k:"akkuKabelHossz",       label:"Akku kábel terv. hossz (m)" },
  ]},
  { cim:"Tető / Szerkezet", mezok:[
    { k:"tetoTipus",            label:"Tető típus" },
    { k:"tetoszerkezetTipus",   label:"Tetőszerkezet típus" },
    { k:"padlas",               label:"Padlás állapota" },
    { k:"villamharitor",        label:"Villámhárító" },
    { k:"tartoszerkezetTipus",  label:"Tartószerkezet típus" },
    { k:"potcserep",            label:"Pótcserép" },
  ]},
  { cim:"DC / Panel", mezok:[
    { k:"dcKabelHossz",         label:"DC kábel terv. hossz (m)" },
    { k:"dcKabelNyomvonal",     label:"DC kábel további szükséges nyomvonal" },
    { k:"dcVedelem",            label:"DC védelem típus" },
    { k:"tuzKapcsolo",          label:"Tűzeseti kapcsoló szükséges" },
    { k:"panelElrendezes",      label:"Panel elrendezés információk" },
  ]},
  { cim:"Egyéb", mezok:[
    { k:"felhordoEszkoz",       label:"Telepítéshez szükséges felhordó eszköz" },
    { k:"engedelyeztetes",      label:"Engedélyeztetés állapota" },
    { k:"visszwatt",            label:"Visszwatt védelem" },
    { k:"megkozelithetoseg",    label:"Ingatlan megközelíthetősége, megjegyzés" },
  ]},
];

const NYILATKOZAT = `Az ügyféllel a felmérési lapon szereplő valamennyi műszaki és kivitelezési pont részletesen egyeztetésre került, beleértve az eszközök és napelemek elhelyezését, az AC és DC kábelnyomvonalak kialakítását, valamint a csatlakozási pont korszerűsítésének módját és annak megfelelő kivitelezését.

Felhívjuk a figyelmet, hogy az előzetes egyeztetés nélküli módosítások vagy eltérések a kivitelezés során többletköltséget és határidő módosulást vonhatnak maguk után.`;

// ─── Storage helpers ──────────────────────────────────────────
const fotoKey  = id => `crm_ml_${id}_felm_kat`;
const notesKey = id => `crm_ml_${id}_felm_notes`;
const adatKey  = id => `crm_ml_${id}_felm_adat`;
const alairKey = id => `crm_ml_${id}_felm_alairas`;

function load(key)       { try { const r=localStorage.getItem(key); return r?JSON.parse(r):null; } catch { return null; } }
function save(key,data)  { try { localStorage.setItem(key,JSON.stringify(data)); return true; } catch { return false; } }

// ─── Kép tömörítő ─────────────────────────────────────────────
async function compressImage(file, maxW=1200, q=0.82) {
  return new Promise(resolve => {
    const img=new Image(), url=URL.createObjectURL(file);
    img.onload = () => {
      let w=img.width, h=img.height;
      if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
      const c=document.createElement("canvas"); c.width=w; c.height=h;
      c.getContext("2d").drawImage(img,0,0,w,h);
      URL.revokeObjectURL(url);
      c.toBlob(blob=>{const r=new FileReader();r.onload=e=>resolve(e.target.result);r.readAsDataURL(blob);},"image/jpeg",q);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);resolve(null);};
    img.src=url;
  });
}

// ─── Drive feltöltés ──────────────────────────────────────────
async function driveUpload(munkalapId, katNev, b64, ext) {
  const url=import.meta.env.VITE_APPS_SCRIPT_URL; if(!url) return false;
  try {
    const safe=katNev.replace(/[^a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g,"_").replace(/_+/g,"_");
    const nev=`${safe}_${Date.now()}.${ext}`;
    await fetch(url,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({action:"saveFoto",munkalapId,almappa:"Felmeres",fotoNev:nev,fotoBase64:b64.split(",")[1],mimeType:"image/jpeg"})});
    return nev;
  } catch { return false; }
}

// ─── Fotós kategória kártya ───────────────────────────────────
function FotoKartya({kat, photos, note, onPhotos, onNote, munkalapId}) {
  const ref=useRef();
  const [loading,setLoading]=useState(false);
  const [nagy,setNagy]=useState(null);
  const ok=photos.length>0;

  async function handleFiles(files) {
    setLoading(true);
    const ujak=[];
    for(const f of Array.from(files)) {
      if(!f.type.startsWith("image/")) continue;
      const b64=await compressImage(f); if(!b64) continue;
      const ext=f.name.split(".").pop()||"jpg";
      const foto={id:`fk_${Date.now()}_${Math.random().toString(36).slice(2)}`,nev:f.name,base64:b64,driveNev:null,ts:new Date().toISOString()};
      ujak.push(foto);
      driveUpload(munkalapId,kat.nev,b64,ext).then(n=>{
        if(n) onPhotos(p=>p.map(x=>x.id===foto.id?{...x,driveNev:n}:x),true);
      });
    }
    onPhotos(p=>[...p,...ujak]);
    setLoading(false);
  }

  return (
    <div style={{background:"#fff",borderRadius:14,border:`1.5px solid ${ok?"#86EFAC":C.border}`,overflow:"hidden",marginBottom:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:ok?"#F0FDF4":"#F8FAFC",borderBottom:`1px solid ${C.border}`}}>
        <span style={{fontSize:22}}>{kat.icon}</span>
        <div style={{flex:1}}>
          <p style={{fontWeight:700,fontSize:14,color:C.text,margin:0}}>{kat.nev}</p>
          <p style={{fontSize:11,color:C.muted,margin:"1px 0 0"}}>{kat.leiras}</p>
        </div>
        {ok&&<div style={{background:"#22C55E",color:"#fff",borderRadius:"50%",width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800}}>{photos.length}</div>}
      </div>
      <div style={{padding:"12px 14px"}}>
        <textarea value={note} onChange={e=>onNote(e.target.value)} placeholder={`Megjegyzés – ${kat.nev}`} rows={2}
          style={{width:"100%",boxSizing:"border-box",padding:"8px 11px",border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:14,fontFamily:FONT,color:C.text,outline:"none",resize:"none",background:"#F8FAFC",lineHeight:1.5,marginBottom:10}}/>
        {photos.length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
            {photos.map((p,i)=>(
              <div key={p.id} style={{position:"relative",width:76,height:76}}>
                <img src={p.base64} alt="" onClick={()=>setNagy(p)}
                  style={{width:76,height:76,objectFit:"cover",borderRadius:9,border:`1.5px solid ${p.driveNev?"#86EFAC":C.border}`,cursor:"pointer"}}/>
                {p.driveNev&&<div style={{position:"absolute",bottom:2,left:2,background:"rgba(5,150,105,.85)",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center"}}><CheckCircle2 size={10} color="#fff"/></div>}
                <div style={{position:"absolute",top:2,left:2,background:"rgba(0,0,0,.6)",borderRadius:4,padding:"1px 5px",fontSize:10,color:"#fff",fontWeight:700}}>{i+1}</div>
                <button onClick={()=>onPhotos(p2=>p2.filter(x=>x.id!==p.id))} style={{position:"absolute",top:2,right:2,width:20,height:20,background:"rgba(220,38,38,.9)",border:"none",borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={11} color="#fff"/></button>
              </div>
            ))}
          </div>
        )}
        <button onClick={()=>ref.current?.click()} disabled={loading}
          style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,width:"100%",padding:"10px",borderRadius:10,border:`2px dashed ${ok?"#86EFAC":C.border}`,background:ok?"#F0FDF4":"#F8FAFC",color:ok?"#16A34A":C.textSub,cursor:"pointer",fontFamily:FONT,fontWeight:600,fontSize:13}}>
          {loading?<Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/>:<Camera size={16}/>}
          {loading?"Tömörítés…":photos.length===0?"📷 Fotó hozzáadása":"📷 További fotók"}
        </button>
        <input ref={ref} type="file" multiple accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
      </div>
      {nagy&&(
        <div onClick={()=>setNagy(null)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.94)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <img src={nagy.base64} alt="" style={{maxWidth:"100%",maxHeight:"90vh",borderRadius:12,objectFit:"contain"}} onClick={e=>e.stopPropagation()}/>
          <button onClick={()=>setNagy(null)} style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:44,height:44,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><X size={22} color="#fff"/></button>
        </div>
      )}
    </div>
  );
}

// ─── Aláírás canvas ───────────────────────────────────────────
function AlairasCanvas({onSave, meglevo}) {
  const ref=useRef();
  const [drawing,setDrawing]=useState(false);
  const [hasSign,setHasSign]=useState(!!meglevo);

  useEffect(()=>{
    if(!ref.current) return;
    const c=ref.current, ratio=window.devicePixelRatio||1;
    c.width=c.offsetWidth*ratio; c.height=c.offsetHeight*ratio;
    const ctx=c.getContext("2d"); ctx.scale(ratio,ratio);
    ctx.strokeStyle="#1e293b"; ctx.lineWidth=2.5; ctx.lineCap="round"; ctx.lineJoin="round";
    if(meglevo){const img=new Image(); img.onload=()=>ctx.drawImage(img,0,0,c.offsetWidth,c.offsetHeight); img.src=meglevo;}
  },[]);

  function pos(e,c){const r=c.getBoundingClientRect(),s=e.touches?e.touches[0]:e;return{x:s.clientX-r.left,y:s.clientY-r.top};}
  function start(e){e.preventDefault();setDrawing(true);const p=pos(e,ref.current),ctx=ref.current.getContext("2d");ctx.beginPath();ctx.moveTo(p.x,p.y);}
  function draw(e){e.preventDefault();if(!drawing)return;const ctx=ref.current.getContext("2d"),p=pos(e,ref.current);ctx.lineTo(p.x,p.y);ctx.stroke();setHasSign(true);}
  function stop(e){e.preventDefault();setDrawing(false);if(hasSign) onSave(ref.current.toDataURL("image/png"));}
  function clear(){const c=ref.current;c.getContext("2d").clearRect(0,0,c.width,c.height);setHasSign(false);onSave(null);}

  return (
    <div>
      <div style={{position:"relative",border:`2px solid ${hasSign?"#22C55E":"#CBD5E1"}`,borderRadius:12,overflow:"hidden",background:"#fff",height:160,marginBottom:10}}>
        <canvas ref={ref} style={{width:"100%",height:"100%",display:"block",touchAction:"none",cursor:"crosshair"}}
          onMouseDown={start} onMouseMove={draw} onMouseUp={stop} onMouseLeave={stop}
          onTouchStart={start} onTouchMove={draw} onTouchEnd={stop}/>
        {!hasSign&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}><p style={{fontSize:14,color:"#CBD5E1",fontStyle:"italic"}}>✍️ Ügyfél aláírásának helye</p></div>}
      </div>
      <button onClick={clear} style={{display:"flex",alignItems:"center",gap:6,padding:"8px 14px",border:`1px solid ${C.border}`,borderRadius:8,background:"#fff",color:C.textSub,cursor:"pointer",fontSize:13,fontFamily:FONT}}>
        <RotateCcw size={14}/>Törlés
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FŐ KOMPONENS
// ═══════════════════════════════════════════════════════════════
export default function FelmeresTelepito({m, data, onBack}) {
  const clientNev = m.clientNev||data.ugyfelek?.find(u=>u.id===m.clientId)?.name||"";
  const clientCim = m.clientCim||data.ugyfelek?.find(u=>u.id===m.clientId)?.address||"";
  const clientTel = m.clientTel||data.ugyfelek?.find(u=>u.id===m.clientId)?.phone||"";

  const [katFotok,setKatFotok]=useState(()=>{const s=load(fotoKey(m.id))||{};return Object.fromEntries(FOTO_KAT.map(k=>[k.id,s[k.id]||[]]))});
  const [fotoNotes,setFotoNotes]=useState(()=>load(notesKey(m.id))||{});
  const [adatok,setAdatok]=useState(()=>load(adatKey(m.id))||{});
  const [nyilatkozat,setNyilatkozat]=useState(()=>(load(adatKey(m.id))||{}).nyilatkozat||false);
  const [alairas,setAlairas]=useState(()=>load(alairKey(m.id)));
  const [saving,setSaving]=useState(false);
  const [mentve,setMentve]=useState(false);

  // Auto mentés
  useEffect(()=>{save(fotoKey(m.id),katFotok);},[katFotok]);
  useEffect(()=>{save(notesKey(m.id),fotoNotes);},[fotoNotes]);
  useEffect(()=>{save(adatKey(m.id),{...adatok,nyilatkozat});},[adatok,nyilatkozat]);
  useEffect(()=>{if(alairas)save(alairKey(m.id),alairas);},[alairas]);

  function setKatP(katId,upd,silent=false){setKatFotok(p=>{const n={...p,[katId]:typeof upd==="function"?upd(p[katId]||[]):upd};if(!silent)save(fotoKey(m.id),n);return n;});}
  function setFotoNote(katId,v){setFotoNotes(p=>{const n={...p,[katId]:v};save(notesKey(m.id),n);return n;});}
  function setAdat(k,v){setAdatok(p=>{const n={...p,[k]:v};save(adatKey(m.id),n);return n;});}

  async function handleMentes() {
    setSaving(true);
    const felmeresAdat={...adatok,nyilatkozat,felmeresIdopont:new Date().toISOString().slice(0,10),felmeresKesz:true};
    FOTO_KAT.forEach(k=>{felmeresAdat[k.id+"_kepDb"]=(katFotok[k.id]||[]).length;felmeresAdat[k.id+"_note"]=fotoNotes[k.id]||"";});
    updateItem("munkalapok",m.id,{felmeres:{...(m.felmeres||{}),...felmeresAdat},felmeresKesz:true,felmeresAlairas:alairas});
    window.dispatchEvent(new CustomEvent("crm-db-updated",{detail:{collection:"munkalapok"}}));
    await new Promise(r=>setTimeout(r,500));
    setSaving(false); setMentve(true); setTimeout(()=>setMentve(false),3000);
  }

  const osszesKep=FOTO_KAT.reduce((s,k)=>s+(katFotok[k.id]?.length||0),0);
  const driveKep=FOTO_KAT.reduce((s,k)=>s+(katFotok[k.id]?.filter(f=>f.driveNev)?.length||0),0);

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:FONT}}>
      {/* Fejléc */}
      <div style={{background:"#1E3A5F"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"44px 16px 8px"}}>
          <button onClick={onBack} style={{border:"none",background:"none",color:"#94A3B8",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13,fontFamily:FONT,fontWeight:600}}>
            <ArrowLeft size={18}/> Vissza
          </button>
          <span style={{fontWeight:800,fontSize:14,color:"#fff",flex:1}}>{m.id}</span>
          <span style={{background:"#0EA5E9",color:"#fff",borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:700}}>📸 Felmérés</span>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px 14px"}}>
          <div>
            <p style={{fontWeight:700,fontSize:16,color:"#fff",margin:0}}>{clientNev}</p>
            <p style={{fontSize:12,color:"#94A3B8",margin:"2px 0 0"}}>{clientCim}</p>
          </div>
          <div style={{display:"flex",gap:12}}>
            {clientTel&&<a href={`tel:${clientTel}`} style={{color:"#4ADE80"}}><Phone size={22}/></a>}
            {clientCim&&<a href={`https://maps.google.com/?q=${encodeURIComponent(clientCim)}`} target="_blank" rel="noreferrer" style={{color:"#60A5FA"}}><MapPin size={22}/></a>}
          </div>
        </div>
      </div>

      {/* Stat sáv */}
      <div style={{background:"#fff",borderBottom:`1px solid ${C.border}`,padding:"10px 16px",display:"flex",gap:16,alignItems:"center"}}>
        <div style={{textAlign:"center"}}><p style={{fontSize:18,fontWeight:800,color:C.accent,margin:0}}>{osszesKep}</p><p style={{fontSize:10,color:C.muted,margin:0}}>fotó</p></div>
        <div style={{textAlign:"center"}}><p style={{fontSize:18,fontWeight:800,color:C.success,margin:0}}>{driveKep}</p><p style={{fontSize:10,color:C.muted,margin:0}}>Drive-on</p></div>
        <div style={{flex:1,marginLeft:8}}>
          <div style={{background:C.bg,borderRadius:6,height:7,overflow:"hidden"}}>
            <div style={{width:`${Math.min(100,(osszesKep/FOTO_KAT.length)*100)}%`,height:"100%",background:C.accent,borderRadius:6,transition:"width .3s"}}/>
          </div>
          <p style={{fontSize:10,color:C.muted,margin:"3px 0 0"}}>{osszesKep} fotó / {FOTO_KAT.length} kat.</p>
        </div>
      </div>

      <div style={{padding:"16px 16px 140px"}}>

        {/* ═══ 1. FOTÓS KATEGÓRIÁK ═══ */}
        <div style={{background:"#EFF6FF",borderRadius:10,padding:"10px 14px",marginBottom:14,display:"flex",gap:8,alignItems:"flex-start"}}>
          <span style={{fontSize:18}}>📸</span>
          <p style={{fontSize:12,color:"#1E40AF",lineHeight:1.5,margin:0,fontWeight:600}}>Fotós kategóriák – minden kategóriánál tölts fel képeket és írj megjegyzést. A fotók a Drive-ra is mentődnek: <strong>{m.id}/Felmérés/</strong></p>
        </div>

        {FOTO_KAT.map(kat=>(
          <FotoKartya key={kat.id} kat={kat} photos={katFotok[kat.id]||[]} note={fotoNotes[kat.id]||""}
            onPhotos={(upd,s)=>setKatP(kat.id,upd,s)} onNote={v=>setFotoNote(kat.id,v)} munkalapId={m.id}/>
        ))}

        {/* ═══ 2. SZÖVEGES FELMÉRÉSI ADATOK ═══ */}
        <div style={{background:"#F0FDF4",borderRadius:10,padding:"10px 14px",margin:"20px 0 14px",display:"flex",gap:8,alignItems:"flex-start"}}>
          <span style={{fontSize:18}}>📋</span>
          <p style={{fontSize:12,color:"#166534",lineHeight:1.5,margin:0,fontWeight:600}}>Szöveges felmérési adatok – töltsd ki az összes releváns mezőt</p>
        </div>

        {SZOVEGES_CSOPORTOK.map(csoport=>(
          <div key={csoport.cim} style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",marginBottom:12}}>
            <div style={{background:"#F8FAFC",padding:"10px 14px",borderBottom:`1px solid ${C.border}`}}>
              <p style={{fontWeight:700,fontSize:13,color:C.text,margin:0}}>{csoport.cim}</p>
            </div>
            <div style={{padding:"12px 14px"}}>
              {csoport.mezok.map(mező=>(
                <div key={mező.k} style={{marginBottom:12}}>
                  <label style={{display:"block",fontSize:12,color:C.muted,marginBottom:5,fontWeight:600}}>{mező.label}</label>
                  <input value={adatok[mező.k]||""} onChange={e=>setAdat(mező.k,e.target.value)}
                    placeholder={mező.label}
                    style={{width:"100%",boxSizing:"border-box",padding:"9px 12px",border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:14,fontFamily:FONT,color:C.text,outline:"none",background:"#F8FAFC"}}/>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ═══ 3. NYILATKOZAT CHECKBOX ═══ */}
        <div style={{background:"#fff",borderRadius:14,border:`2px solid ${nyilatkozat?"#22C55E":C.border}`,padding:"16px 14px",marginTop:20,marginBottom:16}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
            <button onClick={()=>setNyilatkozat(p=>!p)} style={{
              flexShrink:0,width:26,height:26,borderRadius:7,border:`2.5px solid ${nyilatkozat?"#22C55E":C.border}`,
              background:nyilatkozat?"#22C55E":"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
              marginTop:2,
            }}>
              {nyilatkozat&&<CheckCircle2 size={16} color="#fff"/>}
            </button>
            <p style={{fontSize:13,color:C.text,lineHeight:1.7,margin:0}}>{NYILATKOZAT}</p>
          </div>
        </div>

        {/* ═══ 4. ÜGYFÉL ALÁÍRÁSA ═══ */}
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,padding:"14px",marginBottom:16}}>
          <p style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>✍️ Ügyfél aláírása</p>
          <p style={{fontSize:12,color:C.muted,marginBottom:12}}>Az ügyfél aláírásával megerősíti a fenti nyilatkozatot</p>
          <AlairasCanvas onSave={setAlairas} meglevo={alairas}/>
          {alairas&&<p style={{fontSize:11,color:C.success,marginTop:6}}>✅ Aláírás rögzítve</p>}
        </div>

      </div>

      {/* Fix mentés gomb */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,background:"#fff",borderTop:`1px solid ${C.border}`,padding:"12px 16px 24px"}}>
        <button onClick={handleMentes} disabled={saving} style={{
          width:"100%",padding:"15px",borderRadius:12,border:"none",
          background:mentve?C.success:C.accent,color:"#fff",fontWeight:700,fontSize:16,
          cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:FONT,
        }}>
          {saving?<><Loader2 size={20} style={{animation:"spin 1s linear infinite"}}/>Mentés…</>
           :mentve?<><CheckCircle2 size={20}/>Felmérés elmentve ✓</>
           :<><Save size={20}/>Felmérés mentése</>}
        </button>
      </div>
    </div>
  );
}
