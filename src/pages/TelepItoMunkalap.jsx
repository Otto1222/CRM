import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, Camera, Save, AlertTriangle, CheckCircle2,
  X, FileText, Play, Phone, MapPin, Lock, Plus, Trash2, Hash
} from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import AlairasModal from "../components/AlairasModal";
import FelmeresTelepito from "./FelmeresTelepito";
import FelmeresFotok from "./FelmeresFotok";
import { updateItem, loadLocal, saveLocal } from "../lib/localDb";
import { driveSave } from "../lib/driveApi";

// ─── Sorozatszámot igénylő anyagok ────────────────────────
const SERIAL_KEYWORDS = [
  "inverter", "optimalizáló", "optimalizalo",
  "akkumulátor modul", "akkumulator modul",
  "akkumulátor vezérlő", "akkumulator vezerlő", "akkumulator vezerlő",
  "smart méter", "smart meter", "eastron", "sdm",
  "tűzeseti leválasztó", "tuzeseti levalaszto", "leválasztó", "levalaszto",
];

function requiresSerial(nev) {
  if (!nev) return false;
  const lower = nev.toLowerCase()
    .replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i")
    .replace(/ó/g,"o").replace(/ö/g,"o").replace(/ő/g,"o")
    .replace(/ú/g,"u").replace(/ü/g,"u").replace(/ű/g,"u");
  return SERIAL_KEYWORDS.some(k => {
    const kl = k.toLowerCase()
      .replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i")
      .replace(/ó/g,"o").replace(/ö/g,"o").replace(/ő/g,"o")
      .replace(/ú/g,"u").replace(/ü/g,"u").replace(/ű/g,"u");
    return lower.includes(kl);
  });
}

// ─── Fotó kategóriák ──────────────────────────────────────
const FOTO_KAT = [
  { id:"ac_box",          nev:"AC box (fedéllel és fedél nélkül)",  leiras:"3 fotó: Megkötött állapotban fedél nélkül, Fedéllel és nyitott ajtóval, Fedéllel csukott ajtóval." },
  { id:"akkumulator",     nev:"Akkumulátor",                        leiras:"2 fotó: Elhelyezéséről, Bekötéséről" },
  { id:"akku_adattabla",  nev:"Akkumulátor adattábla",              leiras:"1 fotó: Olvasható adattábla+S/N" },
  { id:"csatl_pont",      nev:"Csatlakozási/rákötési pont",         leiras:"2 fotó: Megkötött állapotban fedél nélkül, fedéllel" },
  { id:"dc_box",          nev:"DC box (fedéllel és fedél nélkül)",  leiras:"3 fotó: Megkötött állapotban fedél nélkül, Fedéllel és nyitott ajtóval, Fedéllel csukott ajtóval." },
  { id:"eph_kotes",       nev:"EPH kötés",                          leiras:"Min. 1 fotó: Tartószerkezeti rákötés" },
  { id:"egyeb_dok",       nev:"Egyéb dokumentáció",                 leiras:"Nyilatkozatok, fővállalkozói dokumentumok" },
  { id:"elrendezes",      nev:"Elrendezés+stringek",                leiras:"1 fotó: rajzolt elrendezés, stringek, QR-kódos elrendezés" },
  { id:"figyelm_tabla",   nev:"Figyelmeztető tábla",                leiras:"1 Fotó: Napelemes rendszer figyelmeztető tábláról" },
  { id:"fusterzekelő",    nev:"Füstérzékelő",                       leiras:"Egy fotó felhelyezett állapotban." },
  { id:"inverter",        nev:"Inverter",                           leiras:"2 fotó: Szemből - bekötésekkel, védelmi berendezésekkel" },
  { id:"inv_adattabla",   nev:"Inverter adattábla",                 leiras:"1 fotó: Olvasható adattábla" },
  { id:"inv_beallitas",   nev:"Inverter beállítások",               leiras:"Több fotó: Visszwatt, Smart mérő, akkumulátor, működési mód" },
  { id:"inv_mukodes",     nev:"Inverter működéséről",               leiras:"1 fotó: Rendszer élő termeléséről" },
  { id:"kabel_nyomvonal", nev:"Kábel nyomvonal (AC/DC)",            leiras:"Kábelhossz függvényeként több fotó." },
  { id:"matricak",        nev:"Matricák, feliratok",                 leiras:"min. 3 fotó: AC box, DC box, Csatlakozási pont" },
  { id:"meres_ellenorzes",nev:"Mérés ellenőrzése",                  leiras:"Fogyasztásmérés ellenőrzése. (CT sorrendek, fázis sorrendek)" },
  { id:"merohelyrol",     nev:"Mérőhelyről",                        leiras:"3 fotó: Teljesítményről, Mérőről, Teljes mérőhely" },
  { id:"napelemek",       nev:"Napelemek",                          leiras:"Min. 2 fotó: 2 irányból. Minden panel számolható legyen!" },
  { id:"panel_sn",        nev:"Napelem SN számok",                   leiras:"Összes napelem szériaszáma olvashatóan." },
  { id:"optimalizalo",    nev:"Optimalizáló",                        leiras:"min. 1 fotó: Tigo - minden optimalizálóról, Huawei - tartószerkezetre rögzítve!" },
  { id:"plant_letrehozas",nev:"Plant létrehozás",                   leiras:"1 fotó: Online állapotban a rendszer monitoringon." },
  { id:"palyazati_tabla", nev:"Pályázati tábla",                    leiras:"3 fotó: közelről, 1-2 méterről, utca másik feléről" },
  { id:"smart_mero",      nev:"Smart mérő/mérés",                   leiras:"2 fotó: Mérés kialakítása, kommunikáció" },
  { id:"tartoszerkezet",  nev:"Tartószerkezet",                     leiras:"Min. 2 fotó: 2 irányból. Teljes szerkezet ellenőrizhető legyen." },
  { id:"teto_kivezetes",  nev:"Tető kivezetés",                     leiras:"1 fotó: Kábelkivezetés a tetőre" },
  { id:"tuz_levalaszto",  nev:"Tűzeseti leválasztó",                leiras:"1 fotó: Megkötött tűzeseti leválasztó." },
  { id:"wifi_stick",      nev:"Wifi Stick",                         leiras:"1 fotó: Olvasható adatokkal" },
  { id:"wifi_beallitas",  nev:"Wifi beállítás",                     leiras:"1. fotó: Sikeres wifi beállításról" },
];

// ─── VBF template ─────────────────────────────────────────
const VBF_TEMPLATE = {
  acFeszultseg:    { L1:"", L2:"", L3:"" },
  kismegsInverter: { L1:"", L2:"", L3:"" },
  kismegsMero:     { L1:"", L2:"", L3:"" },
  panelszam:       { ST1:"", ST2:"", ST3:"", ST4:"", ST5:"", ST6:"" },
  dcFeszultseg:    { ST1:"", ST2:"", ST3:"", ST4:"", ST5:"", ST6:"" },
  hurokellenallas: { L1:"", L2:"", L3:"" },
  smartMeter:"", akku:"", betapaltDC:"",
  panelTipus:"", panelVoc:"", panelVmp:"", panelImp:"", panelIsc:"", panelTelj:"",
  inverterNevleges:"", tuzMegszakito:"",
};

// ═══ VBF INPUT – billentyűzet NEM zárul be ════════════════
function VbfInput({ value, onCommit, unit, piros }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => { setLocal(value ?? ""); }, [value]);
  const empty = local === "";
  return (
    <div style={{ display:"flex", alignItems:"center", flex:1, gap:8 }}>
      <input inputMode="decimal" value={local} onChange={e=>setLocal(e.target.value)}
        onBlur={()=>onCommit(local)} placeholder="0"
        style={{ flex:1, padding:"10px 12px", border:`1.5px solid ${piros&&empty?"#EF4444":C.border}`, borderRadius:9, fontSize:16, fontFamily:FONT, color:C.text, outline:"none", background:piros&&empty?"#FEF2F2":"#F8FAFC" }}/>
      <span style={{ width:36, fontSize:12, color:C.muted, textAlign:"right", flexShrink:0 }}>{unit}</span>
    </div>
  );
}
function MeroSor({ label, value, onCommit, unit, piros }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
      <span style={{ width:36, fontSize:13, color:C.textSub, flexShrink:0 }}>{label}</span>
      <VbfInput value={value} onCommit={onCommit} unit={unit} piros={piros}/>
    </div>
  );
}
function EgyMero({ label, value, onCommit, unit, piros }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
      <span style={{ flex:1, fontSize:13, color:C.textSub }}>{label}</span>
      <div style={{ width:160, display:"flex" }}>
        <VbfInput value={value} onCommit={onCommit} unit={unit} piros={piros}/>
      </div>
    </div>
  );
}
function TextInput({ value, onCommit, piros, placeholder }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(()=>{ setLocal(value ?? ""); },[value]);
  return (
    <input value={local} onChange={e=>setLocal(e.target.value)} onBlur={()=>onCommit(local)}
      placeholder={placeholder||"0"}
      style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${piros&&!local?"#EF4444":C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", background:piros&&!local?"#FEF2F2":"#F8FAFC" }}/>
  );
}
function MeroSzakasz({ title, children }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
      {title&&<p style={{ fontSize:13, fontWeight:700, color:C.textSub, marginBottom:12, borderBottom:`1px solid ${C.border}`, paddingBottom:8 }}>{title}</p>}
      {children}
    </div>
  );
}

// ─── Fotó kártya ──────────────────────────────────────────
function FotoKartya({ kat, photos, onChange }) {
  const ref = useRef();
  function handleFiles(files) {
    const arr = Array.from(files).map((f,i) => {
      const ext = f.name.split(".").pop();
      const safe = kat.nev.replace(/[^a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g,"_").replace(/_+/g,"_");
      return { originalName:f.name, name:`${safe}_${photos.length+i+1}.${ext}`, size:f.size, type:f.type, url:URL.createObjectURL(f), fileObj:f };
    });
    onChange([...photos, ...arr]);
  }
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
      <p style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{kat.nev}</p>
      <p style={{ fontSize:12, color:C.muted, marginBottom:10, lineHeight:1.5 }}>{kat.leiras}</p>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:13, color:photos.length>0?C.success:C.muted, fontWeight:600 }}>Munkalapon feltöltve: {photos.length} db</span>
        <button onClick={()=>ref.current?.click()} style={{ width:52, height:52, background:"#EFF6FF", border:`1.5px solid #93C5FD`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          <Camera size={24} color="#D97706"/>
        </button>
      </div>
      <input ref={ref} type="file" multiple accept="image/*,.pdf" style={{ display:"none" }} onChange={e=>handleFiles(e.target.files)}/>
      {photos.length>0&&(
        <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
          {photos.map((p,i)=>(
            <div key={i} style={{ position:"relative" }}>
              {p.url&&p.type?.startsWith("image")?<img src={p.url} style={{ width:64,height:64,objectFit:"cover",borderRadius:8,border:`1px solid ${C.border}` }}/>
                :<div style={{ width:64,height:64,background:C.bg,borderRadius:8,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center" }}><FileText size={22} color={C.muted}/></div>}
              <button onClick={()=>onChange(photos.filter((_,j)=>j!==i))} style={{ position:"absolute",top:-4,right:-4,width:18,height:18,background:C.danger,border:"none",borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                <X size={10} color="#fff"/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══ FELHASZNÁLT ANYAGOK TAB ══════════════════════════════
function FelhasznaltAnyagokTab({ munkalapId, meglevoAnyagok, onSave }) {
  const [anyagok, setAnyagok] = useState(() => {
    const saved = loadLocal(`felh_anyagok_${munkalapId}`);
    if (saved) return saved;
    // Előre töltjük a munkalap anyagaival
    return (meglevoAnyagok||[]).map(a => ({
      id: `a_${Date.now()}_${Math.random()}`,
      nev: a.nev||a.name||"",
      menny: a.menny||a.qty||1,
      egyseg: a.egyseg||a.unit||"db",
      sorozatszam: requiresSerial(a.nev||a.name) ? "" : null,
      kotelezőSerial: requiresSerial(a.nev||a.name),
    }));
  });

  const [ujNev,    setUjNev]    = useState("");
  const [ujMenny,  setUjMenny]  = useState(1);
  const [ujEgyseg, setUjEgyseg] = useState("db");
  const [mentve,   setMentve]   = useState(false);
  const [hiba,     setHiba]     = useState("");

  function add() {
    if (!ujNev.trim()) return;
    const newItem = {
      id: `a_${Date.now()}`,
      nev: ujNev.trim(),
      menny: ujMenny,
      egyseg: ujEgyseg,
      sorozatszam: requiresSerial(ujNev) ? "" : null,
      kotelezőSerial: requiresSerial(ujNev),
    };
    setAnyagok(p=>[...p, newItem]);
    setUjNev(""); setUjMenny(1);
  }

  function updSerial(id, val) {
    setAnyagok(p=>p.map(a=>a.id===id?{...a,sorozatszam:val}:a));
  }

  function save() {
    // Ellenőrzés: kötelező sorozatszámok
    const hiany = anyagok.filter(a=>a.kotelezőSerial && (!a.sorozatszam||a.sorozatszam.trim()===""));
    if (hiany.length>0) {
      setHiba(`Hiányzó sorozatszám: ${hiany.map(a=>a.nev).join(", ")}`);
      return;
    }
    setHiba("");
    saveLocal(`felh_anyagok_${munkalapId}`, anyagok);
    updateItem("munkalapok", munkalapId, { felhasznaltAnyagok: anyagok });
    onSave(anyagok);
    setMentve(true);
    setTimeout(()=>setMentve(false), 2000);
  }

  return (
    <div style={{ padding:"16px", background:"#F1F5F9" }}>
      <p style={{ fontSize:13, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
        Felhasznált anyagok listája. A sorozatszámos tételeknél (<b>kék keret</b>) kötelező megadni a sorozatszámot.
      </p>

      {hiba&&<div style={{ background:"#FEF2F2", border:`1px solid #FECACA`, borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:C.danger }}>⚠️ {hiba}</div>}

      {/* Anyag lista */}
      {anyagok.map((a,i)=>(
        <div key={a.id} style={{ background:"#fff", border:`1.5px solid ${a.kotelezőSerial?"#2563EB30":C.border}`, borderRadius:12, padding:"12px 14px", marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: a.kotelezőSerial?10:0 }}>
            {a.kotelezőSerial&&<Hash size={14} color={C.accent} style={{ flexShrink:0 }}/>}
            <span style={{ flex:1, fontSize:14, fontWeight:600, color:C.text }}>{a.nev}</span>
            <span style={{ fontSize:13, color:C.muted, whiteSpace:"nowrap" }}>{a.menny} {a.egyseg}</span>
            <button onClick={()=>setAnyagok(p=>p.filter(x=>x.id!==a.id))} style={{ border:"none", background:"none", cursor:"pointer", color:C.danger, flexShrink:0 }}>
              <Trash2 size={14}/>
            </button>
          </div>
          {a.kotelezőSerial&&(
            <div>
              <label style={{ fontSize:11, color:C.accent, fontWeight:700, textTransform:"uppercase", letterSpacing:.8 }}>Sorozatszám (kötelező)</label>
              <input
                value={a.sorozatszam||""}
                onChange={e=>updSerial(a.id,e.target.value)}
                placeholder="pl. SN-1234567890"
                style={{ width:"100%", marginTop:6, padding:"9px 12px", border:`1.5px solid ${!a.sorozatszam?C.accent:C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", background:!a.sorozatszam?"#EFF6FF":"#F8FAFC" }}
              />
            </div>
          )}
        </div>
      ))}

      {/* Új anyag */}
      <div style={{ border:`1.5px dashed ${C.border}`, borderRadius:12, padding:14, background:"#fff", marginBottom:16 }}>
        <p style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, marginBottom:10 }}>Új tétel hozzáadása</p>
        <input value={ujNev} onChange={e=>setUjNev(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()}
          placeholder="Anyag / eszköz neve…"
          style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", marginBottom:8 }}/>
        {requiresSerial(ujNev)&&<p style={{ fontSize:12, color:C.accent, marginBottom:8, fontWeight:600 }}>⚠️ Ez a tétel sorozatszámot igényel!</p>}
        <div style={{ display:"flex", gap:8 }}>
          <input type="number" value={ujMenny} onChange={e=>setUjMenny(parseInt(e.target.value)||1)}
            style={{ width:64, padding:"10px 8px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", textAlign:"center" }}/>
          <input value={ujEgyseg} onChange={e=>setUjEgyseg(e.target.value)} placeholder="db, m, kWh…"
            style={{ width:80, padding:"10px 8px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none" }}/>
          <button onClick={add} style={{ flex:1, padding:"10px", background:C.accent, color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:700, fontFamily:FONT, fontSize:15 }}>+ Hozzáad</button>
        </div>
      </div>

      <button onClick={save} style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", background:C.success, color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT }}>
        <Save size={18}/>{mentve?"Mentve ✓":"Anyagok mentése"}
      </button>
    </div>
  );
}

// ═══ FŐ KOMPONENS ════════════════════════════════════════
export default function TelepItoMunkalap({ m, data, onBack }) {
  const client    = data.ugyfelek?.find(u=>u.id===m.clientId);
  const clientNev = m.clientNev||client?.name||"";
  const clientCim = m.clientCim||client?.address||"";
  const clientTel = m.clientTel||client?.phone||"";
  // Lezárt állapot: lokális state hogy azonnal frissüljön
  const [lezart, setLezart] = useState(m.lezarva || m.status === "Befejezett");

  const [megkezdve,  setMegkezdve]  = useState(m.megkezdve||false);
  const [activeTab,  setActiveTab]  = useState(0);
  const [figy,       setFigy]       = useState(false);
  const [showAlairas, setShowAlairas] = useState(false);
  const [progress,   setProgress]   = useState(null); // null = nincs folyamat
  const [progressMsg,setProgressMsg]= useState("");

  const [vbf,  setVbf]  = useState(()=>loadLocal(`vbf_${m.id}`)||VBF_TEMPLATE);
  const [fotok,setFotok] = useState(()=>loadLocal(`fotok_${m.id}`)||Object.fromEntries(FOTO_KAT.map(k=>[k.id,[]])));

  // Fotók metaadatainak auto-mentése
  useEffect(()=>{
    const toSave = Object.fromEntries(Object.entries(fotok).map(([k,v])=>[k,v.map(f=>({name:f.name,size:f.size,type:f.type,originalName:f.originalName}))]));
    saveLocal(`fotok_${m.id}`, toSave);
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection:`fotok_${m.id}` } }));
  },[fotok,m.id]);

  function updVbf(section,field,val) {
    const nv = field?{...vbf,[section]:{...vbf[section],[field]:val}}:{...vbf,[section]:val};
    setVbf(nv);
    saveLocal(`vbf_${m.id}`,nv);
  }

  function checkHianyos() {
    return Object.values(vbf).flatMap(v=>typeof v==="object"?Object.values(v):[v]).some(v=>v===""||v===null||v===undefined);
  }

  // ── MEGKEZDÉS ── (spec 5: megnyitáskor auto Folyamatban) ─
  function handleMegkezdes() {
    const ts = new Date().toISOString();
    // Auto státusz: Kivitelezésre vár / Megkezdésre Vár → Folyamatban
    const ujStatus = ["Kivitelezésre vár","Megkezdésre Vár","Ütemezett","Kiosztásra vár"].includes(m.status)
      ? "Folyamatban" : m.status;
    updateItem("munkalapok",m.id,{ megkezdve:true, megkezdesIdopont:ts, status:ujStatus, statusSzin:"#2563EB" });
    setMegkezdve(true);
    setActiveTab(3);
  }

  // ── BEFEJEZÉS progress + Drive feltöltés ───────────────
  function handleBefejezesKezdete() {
    // === SZIGORÚ VALIDÁCIÓ (spec 14. pont) ===

    // 1. VBF kötelező
    if (checkHianyos()) {
      setFigy(true);
      alert("⚠️ Lezárás sikertelen! A VBF Jegyzőkönyv nincs kitöltve. Írj '0'-t minden nem releváns mezőbe.");
      return;
    }
    setFigy(false);

    // 2. Fotó kötelező (min. 1 db)
    const osszesFoto = Object.values(fotok).reduce((s,a) => s+(a.length||0), 0);
    if (osszesFoto === 0) {
      alert("⚠️ Lezárás sikertelen! Nincs feltöltve egyetlen fotó sem. Tölts fel legalább 1 fotót.");
      return;
    }

    // 3. Minden hiányos kategóriához kötelező ok (Nincs ilyen eszköz / Nem látható / Nem releváns)
    const hianyosKat = FOTO_KAT.filter(k => (fotok[k.id]||[]).length === 0);
    const mindOk = hianyosKat.every(k => fotoHianyOkok[k.id]);
    if (!mindOk) {
      const missing = hianyosKat.filter(k => !fotoHianyOkok[k.id]);
      alert(
        "⚠️ Lezárás sikertelen! A következő kategóriáknál nincs ok megadva: " +
        missing.map(k => k.nev).join(", ") +
        ". Kérjük az Ellenőrzés fülön adj meg okot minden fotó nélküli kategóriához!"
      );
      return;
    }

    // Minden rendben → aláírás modal
    setShowAlairas(true);
  }

  async function handleBefejezes(alairasData) {
    setShowAlairas(false);
    // Aláírás mentése a munkalaphoz
    if (alairasData) {
      updateItem("munkalapok", m.id, {
        alairas: {
          dataUrl: alairasData.alairasDataUrl,
          datum:   alairasData.alairasDatum,
          szoveg:  alairasData.szoveg,
        }
      });
    }

    const steps = [
      { msg:"Adatok ellenőrzése…",      pct:10 },
      { msg:"VBF mentése…",             pct:25 },
      { msg:"Anyagok mentése…",         pct:40 },
      { msg:"Fotók előkészítése…",      pct:55 },
      { msg:"Drive mappa létrehozása…", pct:65 },
      { msg:"Fotók feltöltése Drive-ba…",pct:80 },
      { msg:"Munkalap lezárása…",       pct:92 },
      { msg:"Kész!",                    pct:100 },
    ];

    for (const step of steps) {
      setProgress(step.pct);
      setProgressMsg(step.msg);
      await new Promise(r=>setTimeout(r,400));

      // Drive feltöltés lépésnél
      if (step.pct===80) {
        await uploadFotokToDrive();
      }
    }

    const ts = new Date().toISOString();
    const updates = { status:"Ellenőrzés alatt", statusSzin:"#D97706", befejezesIdopont:ts, lezarva:true };
    
    // 1. localStorage frissítés
    updateItem("munkalapok", m.id, updates);
    
    // 2. Drive szinkron - az összes munkalap mentése
    try {
      const osszesMl = loadLocal("munkalapok") || [];
      await driveSave("munkalapok", { munkalapok: osszesMl });
    } catch(e) { console.warn("[Drive sync]", e); }

    // 3. Helyi állapot frissítés
    setLezart(true);
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection:"munkalapok" } }));
    
    await new Promise(r=>setTimeout(r,800));
    setProgress(null);
    
    // 4. Visszatérés - kis delay hogy a state frissülhessen
    await new Promise(r=>setTimeout(r,200));
    onBack(true);
  }

  // Drive feltöltés: Apps Script webhook-on keresztül
  async function uploadFotokToDrive() {
    const scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
    if (!scriptUrl) { console.warn("[Drive] Nincs VITE_APPS_SCRIPT_URL"); return; }
    
    try {
      // 1. Mappa létrehozás
      setProgressMsg("Drive mappa létrehozása…");
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createMunkalapFolder", munkalapId: m.id }),
      });
      
      // 2. Fotók feltöltése egyenként
      const osszesFoto = Object.entries(fotok).flatMap(([katId, photos]) =>
        photos.filter(p => p.fileObj || p.file || (p.url && p.url.startsWith("blob:"))).map(p => ({ ...p, katId }))
      );
      
      if (osszesFoto.length === 0) return;
      
      let feltoltve = 0;
      for (const foto of osszesFoto) {
        try {
          // Fájl base64 konverzió
          let base64 = "";
          // fileObj = tényleges File objektum (legmegbízhatóbb)
          const fileSource = foto.fileObj || foto.file;
          if (fileSource) {
            base64 = await new Promise(res => {
              const r = new FileReader();
              r.onload = e => res(e.target.result.split(",")[1]);
              r.onerror = () => res("");
              r.readAsDataURL(fileSource);
            });
          } else if (foto.url && foto.url.startsWith("blob:")) {
            try {
              const resp = await fetch(foto.url);
              const blob = await resp.blob();
              base64 = await new Promise(res => {
                const r = new FileReader();
                r.onload = e => res(e.target.result.split(",")[1]);
                r.onerror = () => res("");
                r.readAsDataURL(blob);
              });
            } catch(e) { console.warn("blob fetch failed:", e); }
          }
          
          if (!base64) continue;
          
          await fetch(scriptUrl, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "saveFoto",
              munkalapId: m.id,
              fotoNev: foto.name,
              fotoBase64: base64,
              mimeType: foto.type || "image/jpeg",
            }),
          });
          
          feltoltve++;
          setProgressMsg(`Fotók feltöltése Drive-ba… (${feltoltve}/${osszesFoto.length})`);
        } catch(e) { console.warn("[foto upload]", foto.name, e); }
      }
      
      // 3. VBF JSON mentés
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "saveJson",
          fileName: `vbf_${m.id}.json`,
          content: vbf,
        }),
      });
      
    } catch(e) {
      console.warn("[Drive upload]", e);
    }
  }

  async function handleVbfMentes() {
    if (checkHianyos()) { setFigy(true); return; }
    setFigy(false);
    saveLocal(`vbf_${m.id}`,vbf);
    updateItem("munkalapok",m.id,{ vbf });
    setProgress(100); setProgressMsg("VBF mentve ✓");
    await new Promise(r=>setTimeout(r,1200));
    setProgress(null);
  }

  // FELMÉRÉS STÁTUSZ → egyszerűsített felmérési nézet
  if (m.status === "Felmérés" && !lezart) {
    return <FelmeresTelepito m={m} data={data} onBack={onBack} />;
  }

  // LEZÁRT
  if (lezart) {
    return (
      <div style={{ minHeight:"100vh", background:"#F1F5F9", fontFamily:FONT }}>
        <div style={{ background:"#2C4A6E", padding:"44px 16px 16px" }}>
          <button onClick={onBack} style={{ border:"none",background:"none",color:"#94A3B8",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13,fontFamily:FONT,fontWeight:600 }}>
            <ArrowLeft size={18}/> Feladatok
          </button>
          <p style={{ fontWeight:800,fontSize:16,color:"#fff",marginTop:8 }}>{m.id}</p>
          <p style={{ fontWeight:700,fontSize:15,color:"#fff" }}>{clientNev}</p>
          <p style={{ fontSize:12,color:"#94A3B8" }}>{clientCim}</p>
        </div>
        <div style={{ padding:24,textAlign:"center" }}>
          <Lock size={48} color={C.muted} style={{ opacity:.3,display:"block",margin:"0 auto 16px" }}/>
          <p style={{ fontWeight:700,fontSize:18,color:C.text,marginBottom:8 }}>Munka lezárva</p>
          <p style={{ fontSize:14,color:C.muted,marginBottom:8 }}>Befejezve: {m.befejezesIdopont?new Date(m.befejezesIdopont).toLocaleString("hu-HU"):"—"}</p>
          <p style={{ fontSize:13,color:C.muted }}>Módosítás csak Admin / Projektmenedzser fiókból lehetséges.</p>
        </div>
      </div>
    );
  }

  // PROGRESS OVERLAY
  if (progress!==null) {
    return (
      <div style={{ minHeight:"100vh",background:"#F1F5F9",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,fontFamily:FONT }}>
        <div style={{ background:"#fff",borderRadius:20,padding:32,width:"100%",maxWidth:400,textAlign:"center",boxShadow:"0 8px 32px rgba(0,0,0,.1)" }}>
          <div style={{ width:72,height:72,borderRadius:"50%",background:progress===100?C.success:C.accentLight,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px" }}>
            {progress===100?<CheckCircle2 size={36} color="#fff"/>:<Save size={32} color={C.accent}/>}
          </div>
          <p style={{ fontSize:17,fontWeight:700,color:C.text,marginBottom:8 }}>{progressMsg}</p>
          <p style={{ fontSize:28,fontWeight:800,color:progress===100?C.success:C.accent,fontFamily:FONT_HEADING,marginBottom:20 }}>{progress}%</p>
          <div style={{ background:C.bg,borderRadius:10,height:12,overflow:"hidden" }}>
            <div style={{ width:`${progress}%`,height:"100%",background:progress===100?C.success:C.accent,borderRadius:10,transition:"width 0.4s ease" }}/>
          </div>
          {progress===100&&<p style={{ fontSize:14,color:C.muted,marginTop:16 }}>Visszatérés a feladatokhoz…</p>}
        </div>
      </div>
    );
  }

  const TABS_BEFORE = [{ icon:"📄" },{ icon:"📦" },{ icon:"📋" },{ icon:"📸" }];
  const TABS_AFTER  = [{ icon:"📄" },{ icon:"📦" },{ icon:"📋" },{ icon:"📸" },{ icon:"⚙️" },{ icon:"📐" },{ icon:"📷" },{ icon:"✅" }];
  const TABS = megkezdve?TABS_AFTER:TABS_BEFORE;

  const Header = ()=>(
    <div style={{ background:"#2C4A6E" }}>
      <div style={{ display:"flex",alignItems:"center",gap:10,padding:"44px 16px 8px" }}>
        <button onClick={onBack} style={{ border:"none",background:"none",color:"#94A3B8",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13,fontFamily:FONT,fontWeight:600 }}>
          <ArrowLeft size={18}/> Feladatok
        </button>
        <span style={{ fontWeight:800,fontSize:14,color:"#fff",flex:1 }}>{m.id}</span>
        {m.cimke&&<span style={{ background:m.cimkeSzin||C.accent,color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700 }}>{m.cimke}</span>}
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px 14px" }}>
        <div>
          <p style={{ fontWeight:700,fontSize:16,color:"#fff" }}>{clientNev}</p>
          <p style={{ fontSize:12,color:"#94A3B8" }}>{clientCim}</p>
        </div>
        <div style={{ display:"flex",gap:12 }}>
          {clientTel&&<a href={`tel:${clientTel}`} style={{ color:"#4ADE80" }}><Phone size={22}/></a>}
          {clientCim&&<a href={`https://maps.google.com/?q=${encodeURIComponent(clientCim)}`} target="_blank" rel="noreferrer" style={{ color:"#60A5FA" }}><MapPin size={22}/></a>}
        </div>
      </div>
    </div>
  );

  const TabSav = ()=>(
    <div style={{ display:"flex",background:"#2C4A6E",overflowX:"auto" }}>
      {TABS.map((t,i)=>(
        <button key={i} onClick={()=>setActiveTab(i)} style={{ flex:1,padding:"12px 4px",border:"none",background:"transparent",color:activeTab===i?"#fff":"#94A3B8",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",borderBottom:activeTab===i?"3px solid #fff":"3px solid transparent",fontSize:20,minWidth:44 }}>
          {t.icon}
        </button>
      ))}
    </div>
  );

  const InfoTab = ()=>{
    const FR=({label,value})=>value?(<div><p style={{ fontSize:12,color:"#64748B",paddingTop:8,marginBottom:3 }}>{label}</p><div style={{ background:"#E8EDF5",borderRadius:6,padding:"9px 12px",fontSize:14,color:C.text }}>{value}</div></div>):null;
    return (
      <div style={{ padding:"0 16px 16px",background:"#F1F5F9" }}>
        <FR label="Projekt megnevezés" value={m.projektMegnevezes}/>
        <FR label="Feladat" value={m.feladat}/>
        <FR label="Kapcsolattartó" value={clientNev}/>
        <FR label="Telefonszám" value={clientTel}/>
        <FR label="Értékesítő" value={m.ertekesito}/>
        {m.megkezdesIdopont&&<div style={{ marginTop:12,padding:"10px 14px",background:"#EFF6FF",border:`1px solid #BFDBFE`,borderRadius:10,fontSize:13,color:C.accent }}>▶️ Megkezdve: <b>{new Date(m.megkezdesIdopont).toLocaleString("hu-HU")}</b></div>}
        {!megkezdve?(
          <div style={{ marginTop:20 }}>
            <button onClick={handleMegkezdes} style={{ width:"100%",padding:"15px",borderRadius:12,border:"none",background:"#22C55E",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:FONT }}>
              <Play size={20}/> Megkezdés →
            </button>
          </div>
        ):(
          <div style={{ marginTop:12,padding:"10px 14px",background:"#ECFDF5",border:`1px solid #A7F3D0`,borderRadius:10,fontSize:13,color:C.success,fontWeight:600 }}>✅ Munka folyamatban</div>
        )}
      </div>
    );
  };

  const AnyagokTab = ()=>(
    <div style={{ background:"#F1F5F9" }}>
      {(m.anyagok||[]).length===0&&<div style={{ padding:"32px 16px",textAlign:"center",color:C.muted }}><p>Nincsenek anyagok</p></div>}
      {(m.anyagok||[]).map((a,i)=>(
        <div key={i} style={{ padding:"13px 16px",borderBottom:"1px solid #D1D9E6",display:"flex",justifyContent:"space-between" }}>
          <p style={{ fontWeight:600,fontSize:14,color:C.text,flex:1,paddingRight:16 }}>{a.nev}</p>
          <p style={{ fontWeight:700,fontSize:14,color:C.text,whiteSpace:"nowrap" }}>{a.menny} {a.egyseg}</p>
        </div>
      ))}
    </div>
  );

  const FelmeresTab = ()=>{
    const f=m.felmeres||{};
    const mezok=[["Csatlakozási pont",f.csatlakozasiPont],["Csatl. pont állapota",f.csatlPontAllapota],["AC kábel hossz (m)",f.acKabelHossz],["AC védelem",f.acVedelem],["Inverter fal",f.inverterFal],["Akkumulátor fal",f.akkuFal],["Tető típus",f.tetoTipus],["Tetőszerkezet",f.tetoszerkezetTipus],["Padlás",f.padlas],["Villámhárító",f.villamharitor],["Tartószerkezet",f.tartoszerkezetTipus],["DC kábel hossz",f.dcKabelHossz],["DC védelem",f.dcVedelem],["Tűzeseti kapcsoló",f.tuzKapcsolo],["Panel elrendezés",f.panelElrendezes],["Felhordó eszköz",f.felhordoEszkoz],["Megközelíthetőség",f.megkozelithetoseg]].filter(([,v])=>v!==undefined&&v!=="");
    return (
      <div style={{ background:"#F1F5F9" }}>
        {mezok.length===0&&<div style={{ padding:"32px 16px",textAlign:"center",color:C.muted }}><p>Nincs felmérés adat</p></div>}
        {mezok.map(([label,value])=>(
          <div key={label} style={{ padding:"0 16px" }}>
            <p style={{ fontSize:12,color:"#64748B",paddingTop:8,marginBottom:3 }}>{label}</p>
            <div style={{ background:"#E8EDF5",borderRadius:6,padding:"9px 12px",fontSize:14,color:C.text,borderBottom:"1px solid #D1D9E6" }}>{String(value)}</div>
          </div>
        ))}
      </div>
    );
  };

  const VbfTab = ()=>(
    <div style={{ padding:"16px",background:"#F1F5F9" }}>
      {figy&&<div style={{ background:"#FEF2F2",border:`1px solid #FECACA`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.danger,display:"flex",alignItems:"center",gap:8 }}><AlertTriangle size={16}/>Hiányos mezők! Írj "0"-t ahol nulla az érték.</div>}
      <MeroSzakasz title="AC feszültség">{["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.acFeszultseg[l]} onCommit={v=>updVbf("acFeszultseg",l,v)} unit="V" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="Kismegszakító értéke inverternél">{["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.kismegsInverter[l]} onCommit={v=>updVbf("kismegsInverter",l,v)} unit="A" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="Kismegszakító értéke mérőhelynél">{["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.kismegsMero[l]} onCommit={v=>updVbf("kismegsMero",l,v)} unit="A" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="Panelszám">{["ST1","ST2","ST3","ST4","ST5","ST6"].map(s=><MeroSor key={s} label={s} value={vbf.panelszam[s]} onCommit={v=>updVbf("panelszam",s,v)} unit="db" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="DC feszültség">{["ST1","ST2","ST3","ST4","ST5","ST6"].map(s=><MeroSor key={s} label={s} value={vbf.dcFeszultseg[s]} onCommit={v=>updVbf("dcFeszultseg",s,v)} unit="V" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="Hurokellenállás">{["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.hurokellenallas[l]} onCommit={v=>updVbf("hurokellenallas",l,v)} unit="MOhm" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title=""><EgyMero label="Smart meter" value={vbf.smartMeter} onCommit={v=>updVbf("smartMeter",null,v)} unit="DB" piros={figy}/><EgyMero label="AKKU" value={vbf.akku} onCommit={v=>updVbf("akku",null,v)} unit="DB" piros={figy}/></MeroSzakasz>
      <MeroSzakasz title="Betáplált DC teljesítmény"><EgyMero label="Betáplált DC" value={vbf.betapaltDC} onCommit={v=>updVbf("betapaltDC",null,v)} unit="Wp" piros={figy}/></MeroSzakasz>
      <MeroSzakasz title="Panel pontos adatok">
        <div style={{ marginBottom:12 }}><p style={{ fontSize:13,color:C.muted,marginBottom:6 }}>Típusa</p><TextInput value={vbf.panelTipus} onCommit={v=>updVbf("panelTipus",null,v)} piros={figy} placeholder="Panel típusa"/></div>
        <MeroSor label="Voc" value={vbf.panelVoc} onCommit={v=>updVbf("panelVoc",null,v)} unit="V" piros={figy}/>
        <MeroSor label="Vmp" value={vbf.panelVmp} onCommit={v=>updVbf("panelVmp",null,v)} unit="V" piros={figy}/>
        <MeroSor label="Imp" value={vbf.panelImp} onCommit={v=>updVbf("panelImp",null,v)} unit="A" piros={figy}/>
        <MeroSor label="Isc" value={vbf.panelIsc} onCommit={v=>updVbf("panelIsc",null,v)} unit="A" piros={figy}/>
        <MeroSor label="Telj." value={vbf.panelTelj} onCommit={v=>updVbf("panelTelj",null,v)} unit="Wp" piros={figy}/>
      </MeroSzakasz>
      <MeroSzakasz title="Inverter pontos adatok"><EgyMero label="Névleges teljesítménye" value={vbf.inverterNevleges} onCommit={v=>updVbf("inverterNevleges",null,v)} unit="kVA" piros={figy}/></MeroSzakasz>
      <MeroSzakasz title="Tűzeseti adatok"><EgyMero label="Megszakító értéke" value={vbf.tuzMegszakito} onCommit={v=>updVbf("tuzMegszakito",null,v)} unit="A" piros={figy}/></MeroSzakasz>
      <button onClick={handleVbfMentes} style={{ width:"100%",padding:"14px",borderRadius:12,border:"none",background:C.accent,color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:FONT,marginTop:8,marginBottom:32 }}>
        <Save size={18}/>VBF mentése
      </button>
    </div>
  );

  const FotokTab = ()=>(
    <div style={{ padding:"16px",background:"#F1F5F9" }}>
      <p style={{ fontSize:13,color:C.muted,marginBottom:16,lineHeight:1.6 }}>Minden fotót a megadott kategóriába töltsd fel.</p>
      {FOTO_KAT.map(kat=><FotoKartya key={kat.id} kat={kat} photos={fotok[kat.id]||[]} onChange={v=>setFotok(p=>({...p,[kat.id]:v}))}/>)}
    </div>
  );

  const FOTO_HIANY_OKOK = ["Nincs ilyen eszköz","Nem látható","Nem releváns a munkatípushoz"];
  const [fotoHianyOkok, setFotoHianyOkok] = useState({});

  const EllenorzesTab = ()=>{
    const vbfOk=!checkHianyos();
    const osszesFoto=Object.values(fotok).reduce((s,a)=>s+(a.length||0),0);
    const hianyosKat=FOTO_KAT.filter(k=>(fotok[k.id]||[]).length===0);
    const mindenKatOk=hianyosKat.every(k=>fotoHianyOkok[k.id]);
    const lezarhatoE = vbfOk && (osszesFoto > 0 || mindenKatOk);

    return (
      <div style={{ padding:"16px",background:"#F1F5F9",paddingBottom:80 }}>
        {/* Ellenőrzési lista */}
        <div style={{ background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:16 }}>
          <p style={{ fontSize:15,fontWeight:700,color:C.text,marginBottom:12 }}>✅ Munka ellenőrzése</p>
          {[
            {label:"VBF Jegyzőkönyv kitöltve",ok:vbfOk,info:"Írj '0'-t minden nem releváns mezőbe"},
            {label:`Fotók feltöltve (${osszesFoto} db)`,ok:osszesFoto>0,info:"Minimum 1 fotó szükséges"},
            {label:`Hiányos kategóriák indoklása (${hianyosKat.length} db)`,ok:mindenKatOk||hianyosKat.length===0,info:"Minden fotó nélküli kategóriához válassz okot"},
          ].map(item=>(
            <div key={item.label} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}` }}>
              {item.ok?<CheckCircle2 size={20} color={C.success} style={{flexShrink:0,marginTop:2}}/>:<AlertTriangle size={20} color="#D97706" style={{flexShrink:0,marginTop:2}}/>}
              <div>
                <p style={{ fontSize:14,color:item.ok?C.success:"#D97706",fontWeight:item.ok?600:500,margin:0 }}>{item.label}</p>
                {!item.ok&&<p style={{ fontSize:11,color:"#94A3B8",margin:"2px 0 0" }}>{item.info}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Hiányos fotó kategóriák - indoklás (spec 6. pont) */}
        {hianyosKat.length > 0 && (
          <div style={{ background:"#fff",border:"1.5px solid #FED7AA",borderRadius:12,padding:16,marginBottom:16 }}>
            <p style={{ fontSize:14,fontWeight:700,color:"#C2410C",marginBottom:12 }}>
              ⚠️ Hiányos fotó kategóriák – válassz okot
            </p>
            <p style={{ fontSize:12,color:"#94A3B8",marginBottom:12 }}>
              A munkalap nem zárható le, amíg minden hiányos kategóriához nincs ok megadva.
            </p>
            {hianyosKat.map(k=>(
              <div key={k.id} style={{ marginBottom:10 }}>
                <p style={{ fontSize:13,fontWeight:700,color:"#0F172A",marginBottom:5 }}>{k.icon} {k.nev}</p>
                <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                  {FOTO_HIANY_OKOK.map(ok=>(
                    <button key={ok} onClick={()=>setFotoHianyOkok(p=>({...p,[k.id]:ok}))}
                      style={{ padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:FONT,
                        background:fotoHianyOkok[k.id]===ok?"#FFF7ED":"#F8FAFC",
                        color:fotoHianyOkok[k.id]===ok?"#C2410C":"#64748B",
                        border:`1.5px solid ${fotoHianyOkok[k.id]===ok?"#FB923C":"#E2E8F0"}`,
                      }}>
                      {ok}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* VBF figyelmeztetés */}
        {figy&&<div style={{ background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#DC2626" }}>
          ⚠️ A VBF Jegyzőkönyv hiányos! Írj "0"-t minden üres mezőbe.
        </div>}

        {/* Befejezés gomb */}
        <button onClick={handleBefejezesKezdete} disabled={!lezarhatoE}
          style={{ width:"100%",padding:"15px",borderRadius:12,border:"none",
            background:lezarhatoE?C.success:"#CBD5E1",color:"#fff",fontWeight:700,fontSize:16,
            cursor:lezarhatoE?"pointer":"not-allowed",fontFamily:FONT,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
          {lezarhatoE ? "✅ Munka befejezése" : "🔒 Hiányos dokumentáció – lezárás nem lehetséges"}
        </button>
        {!lezarhatoE && (
          <p style={{ fontSize:12,color:"#DC2626",textAlign:"center",marginTop:8,fontWeight:600 }}>
            A munkalap nem zárható le, mert hiányzik a kötelező dokumentáció.
          </p>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh",background:"#F1F5F9",fontFamily:FONT }}>
      <Header/>
      <TabSav/>
      {activeTab===0&&<InfoTab/>}
      {activeTab===1&&<AnyagokTab/>}
      {activeTab===2&&<FelmeresTab/>}
      {activeTab===3&&!megkezdve&&(
        <FelmeresFotok munkalapId={m.id} status={m.status} userRole="Telepítő" />
      )}
      {megkezdve&&activeTab===3&&(
        <FelmeresFotok munkalapId={m.id} status={m.status} userRole="Telepítő" />
      )}
      {megkezdve&&activeTab===4&&<FelhasznaltAnyagokTab munkalapId={m.id} meglevoAnyagok={m.anyagok||[]} onSave={()=>{}}/>}
      {megkezdve&&activeTab===5&&<VbfTab/>}
      {megkezdve&&activeTab===6&&<FotokTab/>}
      {megkezdve&&activeTab===7&&<EllenorzesTab/>}
      {showAlairas && (
        <AlairasModal
          m={m}
          userRole="Telepítő"
          onClose={() => setShowAlairas(false)}
          onSave={(alairasData) => handleBefejezes(alairasData)}
        />
      )}
    </div>
  );
}
