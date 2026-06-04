import { useState, useRef, useEffect } from "react";
import { Camera, Save, ArrowLeft, CheckCircle2, X, Loader2, AlertTriangle, Phone, MapPin, BookOpen } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { updateItem, loadLocal, saveLocal } from "../lib/localDb";

// ─── 7 fotós kategória ────────────────────────────────────────
const FOTO_KAT = [
  { id:"csatl_pont",    nev:"Csatlakozási pont",           icon:"🔌", leiras:"Hova csatlakozik a rendszer? (tábló, alhálózat stb.)" },
  { id:"inverter_fal",  nev:"Inverter fal, elhelyezés",    icon:"⚡", leiras:"Tervezett inverter elhelyezési hely – fal típusa, mérete" },
  { id:"akku_fal",      nev:"Akkumulátor elhelyezése",     icon:"🔋", leiras:"Tervezett akku elhelyezési hely" },
  { id:"teto_tipus",    nev:"Tető típusa",                 icon:"🏠", leiras:"Tető anyaga, szöge, iránya, esetleges akadályok" },
  { id:"padlas",        nev:"Padlás",                      icon:"🏗️", leiras:"Padlástér állapota, járhatóság, kábelvezet lehetőség" },
  { id:"villamharitor", nev:"Villámhárító",                icon:"⛈️", leiras:"Van-e villámhárító? Ha igen, milyen típusú és állapotú?" },
  { id:"mero_kismeg",   nev:"Mérőóra és kismegszakító",   icon:"📊", leiras:"Mérőóra, kismegszakító típusa, kapacitás, elhelyezés" },
];

// ─── Szöveges mezők csoportosítva (a képeken látható sorrendben) ─
const SZOVEGES_CSOPORTOK = [
  {
    cim: "Csatlakozás",
    mezok: [
      { k:"csatlakozasiPont",   label:"Csatlakozási pont" },
      { k:"csatlPontAllapota",  label:"Csatl. pont állapota" },
      { k:"acKabelHossz",       label:"AC kábel terv. hossz (m)" },
      { k:"acVedelem",          label:"AC védelem típus" },
      { k:"kommKabelHossz",     label:"Komm. kábel tervezett hossza (m)" },
    ]
  },
  {
    cim: "Inverter / Akkumulátor",
    mezok: [
      { k:"inverterFal",        label:"Inverter fal, elhelyezés leírása" },
      { k:"akkuFal",            label:"Akkumulátor fal, elhelyezés leírása" },
      { k:"akkuKabelHossz",     label:"Akku kábel terv. hossz (m)" },
    ]
  },
  {
    cim: "Tető / Szerkezet",
    mezok: [
      { k:"tetoTipus",              label:"Tető típus" },
      { k:"tetoszerkezetTipus",     label:"Tetőszerkezet típus" },
      { k:"padlas",                 label:"Padlás" },
      { k:"villamharitor",          label:"Villámhárító" },
      { k:"tartoszerkezetTipus",    label:"Tartószerkezet típus" },
      { k:"potcserep",              label:"Pótcserép" },
    ]
  },
  {
    cim: "DC / Panel",
    mezok: [
      { k:"dcKabelHossz",           label:"DC kábel terv. hossz (m)" },
      { k:"dcKabelNyomvonal",       label:"DC kábel további szükséges nyomvonal" },
      { k:"dcVedelem",              label:"DC védelem típus" },
      { k:"tuzKapcsolo",            label:"Tűzeseti kapcsoló szükséges" },
      { k:"panelElrendezes",        label:"Panel elrendezés információk" },
    ]
  },
  {
    cim: "Egyéb",
    mezok: [
      { k:"felhordoEszkoz",         label:"Telepítéshez szükséges felhordó eszköz" },
      { k:"engedelyeztetes",        label:"Engedélyeztetés állapota" },
      { k:"visszwatt",              label:"Visszwatt védelem" },
      { k:"megkozelithetoseg",      label:"Ingatlan megközelíthetősége, megjegyzés" },
    ]
  },
];

const NYILATKOZAT = `Az ügyféllel a felmérési lapon szereplő valamennyi műszaki és kivitelezési pont részletesen egyeztetésre került, beleértve az eszközök és napelemek elhelyezését, az AC és DC kábelnyomvonalak kialakítását, valamint a csatlakozási pont korszerűsítésének módját és annak megfelelő kivitelezését.

Felhívjuk a figyelmet, hogy az előzetes egyeztetés nélküli módosítások vagy eltérések a kivitelezés során többletköltséget és határidő módosulást vonhatnak maguk után.`;

// Magyar szó ellenőrző (legalább 3 betű, van magánhangzó)
const MAGYAR_MAGANHANGZOK = /[aáeéiíoóöőuúüűAÁEÉIÍOÓÖŐUÚÜŰ]/;
function ertelmesMagyarSzo(s) {
  if (!s || s.trim().length < 3) return false;
  return MAGYAR_MAGANHANGZOK.test(s);
}

// ─── Kép tömörítő ────────────────────────────────────────────
async function compressImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.width, h = img.height;
      const max = 1200;
      if (w > max) { h = Math.round(h*max/w); w = max; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => {
        const r = new FileReader();
        r.onload = e => resolve(e.target.result);
        r.readAsDataURL(b);
      }, "image/jpeg", 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// ─── Drive feltöltés ─────────────────────────────────────────
async function driveUpload(munkalapId, katNev, base64, ext) {
  const url = import.meta.env.VITE_APPS_SCRIPT_URL;
  if (!url) return false;
  try {
    const nev = `${katNev.replace(/[^a-zA-Z0-9]/g,"_")}_${Date.now()}.${ext}`;
    await fetch(url, {
      method:"POST", mode:"no-cors",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        action:"saveFoto", munkalapId,
        almappa:"Felmeres", fotoNev:nev,
        fotoBase64:base64.split(",")[1],
        mimeType:"image/jpeg",
      }),
    });
    return nev;
  } catch { return false; }
}

// Storage
const sk = (id,sfx) => `crm_ml_${id}_${sfx}`;
const load = (id,sfx,def) => { try { const r=localStorage.getItem(sk(id,sfx)); return r?JSON.parse(r):def; } catch { return def; } };
const save = (id,sfx,v) => { try { localStorage.setItem(sk(id,sfx),JSON.stringify(v)); return true; } catch { return false; } };

// ─── Egy fotó kategória kártya ────────────────────────────────
function KatKartya({ kat, photos, note, onPhotos, onNote, munkalapId, hibak }) {
  const ref = useRef();
  const [loading, setLoading] = useState(false);
  const [nagy, setNagy] = useState(null);

  const vanFoto = photos.length > 0;
  const noteOk  = ertelmesMagyarSzo(note);
  const ok       = vanFoto || noteOk;
  const hiba     = hibak && !ok;

  async function handleFiles(files) {
    setLoading(true);
    const ujak = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const b64 = await compressImage(file);
      if (!b64) continue;
      const foto = { id:`fk_${Date.now()}_${Math.random().toString(36).slice(2)}`, nev:file.name, base64:b64, driveNev:null, feltoltve:new Date().toISOString() };
      ujak.push(foto);
      driveUpload(munkalapId, kat.nev, b64, file.name.split(".").pop()||"jpg").then(nev => {
        if (nev) onPhotos(prev => prev.map(p => p.id===foto.id ? {...p, driveNev:nev} : p), true);
      });
    }
    onPhotos(prev => [...prev, ...ujak]);
    setLoading(false);
  }

  return (
    <div style={{
      background:"#fff", borderRadius:14, marginBottom:14,
      border:`2px solid ${hiba?"#EF4444":ok?"#86EFAC":C.border}`,
      overflow:"hidden",
    }}>
      {/* Fejléc */}
      <div style={{
        padding:"12px 16px", background:hiba?"#FEF2F2":ok?"#F0FDF4":"#F8FAFC",
        borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12,
      }}>
        <span style={{fontSize:22}}>{kat.icon}</span>
        <div style={{flex:1}}>
          <p style={{fontWeight:700,fontSize:14,color:C.text,margin:0}}>{kat.nev}</p>
          <p style={{fontSize:11,color:C.muted,margin:"2px 0 0"}}>{kat.leiras}</p>
        </div>
        {ok
          ? <CheckCircle2 size={22} color="#22C55E"/>
          : hiba
            ? <AlertTriangle size={22} color="#EF4444"/>
            : <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${C.border}`}}/>
        }
      </div>

      <div style={{padding:"12px 16px"}}>
        {/* Fotók */}
        {photos.length > 0 && (
          <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:10}}>
            {photos.map((f,i) => (
              <div key={f.id} style={{position:"relative",width:78,height:78}}>
                <img src={f.base64} alt={f.nev} onClick={()=>setNagy(f)}
                  style={{width:78,height:78,objectFit:"cover",borderRadius:9,border:`1.5px solid ${f.driveNev?"#86EFAC":C.border}`,cursor:"pointer"}}/>
                <div style={{position:"absolute",top:2,left:2,background:"rgba(0,0,0,0.6)",borderRadius:4,padding:"1px 5px",fontSize:10,color:"#fff",fontWeight:700}}>{i+1}</div>
                {f.driveNev && <div style={{position:"absolute",bottom:3,left:3,background:"rgba(5,150,105,.85)",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center"}}><CheckCircle2 size={10} color="#fff"/></div>}
                <button onClick={()=>onPhotos(prev=>prev.filter(p=>p.id!==f.id))} style={{position:"absolute",top:2,right:2,width:20,height:20,background:"rgba(220,38,38,.9)",border:"none",borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <X size={11} color="#fff"/>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Megjegyzés */}
        <textarea value={note} onChange={e=>onNote(e.target.value)}
          placeholder={vanFoto ? "Opcionális megjegyzés…" : "⚠️ Fotó nélkül kötelező: írj legalább 3 értelmes magyar szót (pl. Nincs hozzáférés)"}
          rows={2}
          style={{
            width:"100%",boxSizing:"border-box",padding:"9px 12px",
            border:`1.5px solid ${!vanFoto&&hiba&&!noteOk?"#EF4444":C.border}`,
            borderRadius:9,fontSize:13,fontFamily:FONT,resize:"none",outline:"none",
            background: !vanFoto && !noteOk ? "#FEF2F2" : "#F8FAFC",
            marginBottom:10,
          }}
        />

        {/* Hibaüzenet */}
        {hiba && !ok && (
          <p style={{fontSize:11,color:"#EF4444",fontWeight:600,marginBottom:8}}>
            Kötelező: tölts fel képet VAGY írj legalább 3 értelmes magyar szót!
          </p>
        )}

        {/* Fotó gomb */}
        <button onClick={()=>ref.current?.click()} disabled={loading}
          style={{
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            width:"100%",padding:"10px",borderRadius:10,
            border:`2px dashed ${vanFoto?"#86EFAC":hiba?"#EF4444":C.border}`,
            background:vanFoto?"#F0FDF4":hiba?"#FEF2F2":"#F8FAFC",
            color:vanFoto?"#16A34A":hiba?"#EF4444":C.textSub,
            cursor:"pointer",fontFamily:FONT,fontWeight:600,fontSize:13,
          }}>
          {loading ? <Loader2 size={16} style={{animation:"spin 1s linear infinite"}}/> : <Camera size={16}/>}
          {loading ? "Tömörítés…" : photos.length===0 ? "📷 Fotó feltöltése (kötelező)" : "📷 További fotók hozzáadása"}
        </button>
        <input ref={ref} type="file" multiple accept="image/*" capture="environment"
          style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
      </div>

      {/* Nagyítás */}
      {nagy && (
        <div onClick={()=>setNagy(null)} style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.93)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <img src={nagy.base64} alt="" style={{maxWidth:"100%",maxHeight:"90vh",borderRadius:12,objectFit:"contain"}} onClick={e=>e.stopPropagation()}/>
          <button onClick={()=>setNagy(null)} style={{position:"absolute",top:20,right:20,background:"rgba(255,255,255,.15)",border:"none",borderRadius:"50%",width:44,height:44,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <X size={22} color="#fff"/>
          </button>
          <p style={{position:"absolute",bottom:24,left:0,right:0,textAlign:"center",color:"rgba(255,255,255,.5)",fontSize:12}}>
            {nagy.driveNev?"✅ Drive-ra mentve":"⏳ Drive mentés folyamatban…"}
          </p>
        </div>
      )}
    </div>
  );
}

// ═══ FŐ KOMPONENS ════════════════════════════════════════════
export default function FelmeresTelepito({ m, data, onBack }) {
  const clientNev = m.clientNev || data?.ugyfelek?.find(u=>u.id===m.clientId)?.name || "";
  const clientCim = m.clientCim || data?.ugyfelek?.find(u=>u.id===m.clientId)?.address || "";
  const clientTel = m.clientTel || data?.ugyfelek?.find(u=>u.id===m.clientId)?.phone || "";

  // Projekt megnevezés - telepítő is látja
  const projektMegjegyzes = m.projektMegnevezes || m.description || m.feladat || "";

  // Fotók state { [katId]: [fotók] }
  const [katFotok,  setKatFotok]  = useState(() => {
    const saved = load(m.id,"felm_kat",{});
    return Object.fromEntries(FOTO_KAT.map(k=>[k.id, saved[k.id]||[]]));
  });
  // Fotó megjegyzések { [katId]: "szöveg" }
  const [fotoNotes, setFotoNotes] = useState(() => load(m.id,"felm_notes",{}));
  // Szöveges felmérési adatok
  const [adatok,    setAdatok]    = useState(() => load(m.id,"felm_adat",{}));
  // Nyilatkozat + aláírás
  const [nyilatkozat, setNyilatkozat] = useState(() => adatok.nyilatkozat||false);
  const [alairas,   setAlairas]   = useState(() => load(m.id,"felm_alairas",null));
  const alairasRef = useRef(null);
  const [rajzol,    setRajzol]    = useState(false);

  const [saving,    setSaving]    = useState(false);
  const [mentve,    setMentve]    = useState(false);
  const [hibaKijelzes, setHibaKijelzes] = useState(false); // validáció futott-e

  // Auto-mentés
  useEffect(() => { save(m.id,"felm_kat",katFotok); }, [katFotok]);
  useEffect(() => { save(m.id,"felm_notes",fotoNotes); }, [fotoNotes]);
  useEffect(() => { save(m.id,"felm_adat",{...adatok, nyilatkozat}); }, [adatok, nyilatkozat]);

  function setKatPhotos(katId, updater, silent=false) {
    setKatFotok(prev => {
      const next = {...prev, [katId]: typeof updater==="function"?updater(prev[katId]||[]):updater};
      if (!silent) save(m.id,"felm_kat",next);
      return next;
    });
  }
  function setNote(katId, val) {
    setFotoNotes(prev => { const n={...prev,[katId]:val}; save(m.id,"felm_notes",n); return n; });
  }
  function updAdat(k,v) {
    setAdatok(prev => { const n={...prev,[k]:v}; save(m.id,"felm_adat",n); return n; });
  }

  // Validáció: minden kategória OK?
  function validateKategoriak() {
    return FOTO_KAT.every(k => {
      const vanFoto  = (katFotok[k.id]||[]).length > 0;
      const noteOk   = ertelmesMagyarSzo(fotoNotes[k.id]);
      return vanFoto || noteOk;
    });
  }

  // Aláírás canvas
  useEffect(() => {
    const canvas = alairasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1E3A5F";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    let drawing = false;
    const getPos = e => {
      const r = canvas.getBoundingClientRect();
      const src = e.touches?.[0] || e;
      return [src.clientX-r.left, src.clientY-r.top];
    };
    const start = e => { drawing=true; ctx.beginPath(); const [x,y]=getPos(e); ctx.moveTo(x,y); e.preventDefault(); };
    const draw  = e => { if(!drawing) return; const [x,y]=getPos(e); ctx.lineTo(x,y); ctx.stroke(); e.preventDefault(); };
    const end   = () => {
      drawing=false;
      const img=canvas.toDataURL("image/png");
      setAlairas(img);
      save(m.id,"felm_alairas",img);
    };
    canvas.addEventListener("mousedown",start); canvas.addEventListener("mousemove",draw); canvas.addEventListener("mouseup",end);
    canvas.addEventListener("touchstart",start,{passive:false}); canvas.addEventListener("touchmove",draw,{passive:false}); canvas.addEventListener("touchend",end);
    return ()=>{
      canvas.removeEventListener("mousedown",start); canvas.removeEventListener("mousemove",draw); canvas.removeEventListener("mouseup",end);
      canvas.removeEventListener("touchstart",start); canvas.removeEventListener("touchmove",draw); canvas.removeEventListener("touchend",end);
    };
  },[alairasRef.current]);

  function clearAlairas() {
    const canvas = alairasRef.current;
    if (canvas) canvas.getContext("2d").clearRect(0,0,canvas.width,canvas.height);
    setAlairas(null);
    save(m.id,"felm_alairas",null);
  }

  async function handleMentes() {
    setHibaKijelzes(true);
    if (!validateKategoriak()) {
      const hianyos = FOTO_KAT.filter(k=>{
        const vF=(katFotok[k.id]||[]).length>0;
        const nO=ertelmesMagyarSzo(fotoNotes[k.id]);
        return !vF && !nO;
      });
      alert("⚠️ Lezárás sikertelen!\n\nA következő kategóriáknál hiányzik fotó ÉS megjegyzés:\n" +
        hianyos.map(k=>"• "+k.nev).join("\n") +
        "\n\nTölts fel képet VAGY írj legalább 3 értelmes szót!");
      return;
    }

    setSaving(true);
    const ma = new Date().toISOString().slice(0,10);
    const felmeresAdat = {
      ...adatok, nyilatkozat,
      felmeresIdopont: ma,
      felmeresKesz: true,
    };
    FOTO_KAT.forEach(k=>{
      felmeresAdat[k.id+"_kepDb"] = (katFotok[k.id]||[]).length;
      felmeresAdat[k.id+"_note"]  = fotoNotes[k.id]||"";
    });

    updateItem("munkalapok", m.id, {
      felmeres:        { ...(m.felmeres||{}), ...felmeresAdat },
      felmeresKesz:    true,
      felmeresAlairas: alairas,
      status:          "Befejezett Felmérés",
      lezarva:         true,
      lezarvaDate:     ma,
    });
    window.dispatchEvent(new CustomEvent("crm-db-updated",{detail:{collection:"munkalapok"}}));

    await new Promise(r=>setTimeout(r,500));
    setSaving(false);
    setMentve(true);
    await new Promise(r=>setTimeout(r,1200));
    onBack(true);
  }

  // Statisztika
  const osszKep   = FOTO_KAT.reduce((s,k)=>s+(katFotok[k.id]?.length||0),0);
  const driveKep  = FOTO_KAT.reduce((s,k)=>s+(katFotok[k.id]?.filter(f=>f.driveNev)?.length||0),0);
  const katOkDb   = FOTO_KAT.filter(k=>(katFotok[k.id]||[]).length>0||ertelmesMagyarSzo(fotoNotes[k.id])).length;

  return (
    <div style={{minHeight:"100vh",background:"#F1F5F9",fontFamily:FONT}}>
      {/* Fejléc */}
      <div style={{background:"#1E3A5F"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"44px 16px 8px"}}>
          <button onClick={()=>onBack()} style={{border:"none",background:"none",color:"#94A3B8",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13,fontFamily:FONT,fontWeight:600}}>
            <ArrowLeft size={18}/> Vissza
          </button>
          <span style={{fontWeight:800,fontSize:14,color:"#fff",flex:1}}>{m.id}</span>
          <button onClick={()=>window.open("/installer-guide.html","_blank")} title="Telepítői útmutató" style={{border:"none",background:"rgba(255,255,255,0.12)",color:"#fff",cursor:"pointer",borderRadius:8,padding:"5px 8px",display:"flex",alignItems:"center",gap:5,fontSize:12,fontWeight:600,fontFamily:FONT}}>
            <BookOpen size={15}/> Útmutató
          </button>
          <span style={{background:"#0EA5E9",color:"#fff",borderRadius:8,padding:"3px 10px",fontSize:11,fontWeight:700}}>📸 Felmérés</span>
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px 14px"}}>
          <div>
            <p style={{fontWeight:700,fontSize:16,color:"#fff",margin:0}}>{clientNev}</p>
            <p style={{fontSize:12,color:"#94A3B8",margin:"2px 0 0"}}>{clientCim}</p>
          </div>
          <div style={{display:"flex",gap:14}}>
            {clientTel && <a href={`tel:${clientTel}`} style={{color:"#4ADE80"}}><Phone size={22}/></a>}
            {clientCim && <a href={`https://maps.google.com/?q=${encodeURIComponent(clientCim)}`} target="_blank" rel="noreferrer" style={{color:"#60A5FA"}}><MapPin size={22}/></a>}
          </div>
        </div>
      </div>

      {/* Projekt megjegyzés (ha van) */}
      {projektMegjegyzes && (
        <div style={{margin:"12px 16px 0",padding:"12px 14px",background:"#EFF6FF",borderRadius:12,border:"1.5px solid #BFDBFE"}}>
          <p style={{fontSize:11,fontWeight:700,color:"#1D4ED8",marginBottom:4,textTransform:"uppercase",letterSpacing:.7}}>📋 Projekt megjegyzés</p>
          <p style={{fontSize:13,color:"#1E40AF",lineHeight:1.6,margin:0}}>{projektMegjegyzes}</p>
        </div>
      )}

      {/* Progress sáv */}
      <div style={{background:"#fff",padding:"12px 16px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:16,alignItems:"center",marginTop:12}}>
        <div style={{textAlign:"center"}}>
          <p style={{fontSize:20,fontWeight:800,color:C.accent,margin:0}}>{osszKep}</p>
          <p style={{fontSize:10,color:C.muted,margin:0}}>fotó</p>
        </div>
        <div style={{textAlign:"center"}}>
          <p style={{fontSize:20,fontWeight:800,color:"#22C55E",margin:0}}>{katOkDb}/7</p>
          <p style={{fontSize:10,color:C.muted,margin:0}}>kész kat.</p>
        </div>
        <div style={{flex:1}}>
          <div style={{background:C.bg,borderRadius:6,height:8,overflow:"hidden"}}>
            <div style={{width:`${Math.round(katOkDb/7*100)}%`,height:"100%",background:katOkDb===7?"#22C55E":C.accent,borderRadius:6,transition:"width .3s"}}/>
          </div>
          <p style={{fontSize:10,color:C.muted,margin:"3px 0 0"}}>{Math.round(katOkDb/7*100)}% kész · {driveKep} Drive-on</p>
        </div>
      </div>

      <div style={{padding:"16px 16px 160px"}}>
        <p style={{fontSize:12,color:C.muted,marginBottom:14,lineHeight:1.6}}>
          📌 Minden kategóriánál <strong>kötelező</strong> fotó feltöltése.<br/>
          Ha nincs lehetőség képet feltölteni, írj <strong>legalább 3 értelmes magyar szót</strong> a megjegyzés mezőbe.
        </p>

        {/* 7 fotós kategória */}
        {FOTO_KAT.map(kat => (
          <KatKartya
            key={kat.id} kat={kat}
            photos={katFotok[kat.id]||[]}
            note={fotoNotes[kat.id]||""}
            onPhotos={(upd,silent)=>setKatPhotos(kat.id,upd,silent)}
            onNote={v=>setNote(kat.id,v)}
            munkalapId={m.id}
            hibak={hibaKijelzes}
          />
        ))}

        {/* Szöveges mezők */}
        {SZOVEGES_CSOPORTOK.map(csoport => (
          <div key={csoport.cim} style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,marginBottom:14,overflow:"hidden"}}>
            <div style={{padding:"10px 16px",background:"#F8FAFC",borderBottom:`1px solid ${C.border}`}}>
              <p style={{fontWeight:700,fontSize:13,color:C.text,margin:0}}>📋 {csoport.cim}</p>
            </div>
            <div style={{padding:"12px 16px"}}>
              {csoport.mezok.map(mezo => (
                <div key={mezo.k} style={{marginBottom:12}}>
                  <label style={{fontSize:11,fontWeight:700,color:C.muted,display:"block",marginBottom:4}}>{mezo.label}</label>
                  <input
                    value={adatok[mezo.k]||""}
                    onChange={e=>updAdat(mezo.k,e.target.value)}
                    placeholder={mezo.label}
                    style={{width:"100%",boxSizing:"border-box",padding:"9px 12px",border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:FONT,outline:"none",background:"#FAFAFA"}}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Nyilatkozat */}
        <div style={{background:"#fff",borderRadius:14,border:`2px solid ${nyilatkozat?"#22C55E":C.border}`,marginBottom:14,padding:"16px"}}>
          <p style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:12}}>📝 Nyilatkozat</p>
          <p style={{fontSize:12,color:"#475569",lineHeight:1.7,marginBottom:14}}>{NYILATKOZAT}</p>
          <label style={{display:"flex",alignItems:"flex-start",gap:12,cursor:"pointer"}}>
            <div onClick={()=>setNyilatkozat(v=>!v)} style={{
              width:24,height:24,borderRadius:6,border:`2px solid ${nyilatkozat?"#22C55E":"#CBD5E1"}`,
              background:nyilatkozat?"#22C55E":"#fff",flexShrink:0,marginTop:1,
              display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",
            }}>
              {nyilatkozat && <span style={{color:"#fff",fontSize:16,fontWeight:900}}>✓</span>}
            </div>
            <span style={{fontSize:13,color:nyilatkozat?"#166534":"#64748B",fontWeight:nyilatkozat?700:400,lineHeight:1.5}}>
              Elolvastam és elfogadom a fenti nyilatkozatot
            </span>
          </label>
        </div>

        {/* Aláírás */}
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,marginBottom:14,padding:"16px"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <p style={{fontWeight:700,fontSize:14,color:C.text,margin:0}}>✍️ Ügyfél aláírása</p>
            {alairas && <button onClick={clearAlairas} style={{fontSize:12,color:"#DC2626",border:"none",background:"none",cursor:"pointer",fontWeight:600}}>Törlés</button>}
          </div>
          <div style={{position:"relative",border:`1.5px solid ${C.border}`,borderRadius:10,overflow:"hidden",background:"#FAFAFA"}}>
            <canvas ref={alairasRef} width={320} height={140}
              style={{display:"block",width:"100%",height:140,touchAction:"none",cursor:"crosshair"}}/>
            {!alairas && (
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
                <p style={{fontSize:13,color:"#CBD5E1",fontStyle:"italic"}}>✍️ Ügyfél aláírásának helye</p>
              </div>
            )}
          </div>
          <p style={{fontSize:11,color:C.muted,marginTop:6}}>Koppints a területre az aláíráshoz</p>
        </div>
      </div>

      {/* Mentés gomb – fix alul */}
      <div style={{
        position:"fixed",bottom:0,left:0,right:0,zIndex:100,
        background:"#fff",borderTop:`1px solid ${C.border}`,
        padding:"12px 16px 24px",
      }}>
        {hibaKijelzes && !validateKategoriak() && (
          <p style={{fontSize:12,color:"#EF4444",fontWeight:700,textAlign:"center",marginBottom:8}}>
            ⚠️ {FOTO_KAT.filter(k=>!((katFotok[k.id]||[]).length>0||ertelmesMagyarSzo(fotoNotes[k.id]))).length} kategória hiányos!
          </p>
        )}
        <button onClick={handleMentes} disabled={saving}
          style={{
            width:"100%",padding:"15px",borderRadius:12,border:"none",
            background: mentve?"#22C55E":saving?"#94A3B8":katOkDb===7?"#2563EB":"#0EA5E9",
            color:"#fff",fontWeight:700,fontSize:16,cursor:saving?"not-allowed":"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:FONT,
          }}>
          {saving
            ? <><Loader2 size={20} style={{animation:"spin 1s linear infinite"}}/>Mentés…</>
            : mentve
              ? <><CheckCircle2 size={20}/>Felmérés elmentve ✓</>
              : <><Save size={20}/>Felmérés mentése ({katOkDb}/7 kész)</>}
        </button>
      </div>
    </div>
  );
}
