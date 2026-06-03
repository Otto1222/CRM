import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, Camera, Save, AlertTriangle, CheckCircle2,
  X, FileText, Play, Phone, MapPin, Lock, Trash2, Hash, Shield
} from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import AlairasModal from "../components/AlairasModal";
import LmraTelepltoView from "../components/LmraTelepltoView";
import FelmeresTelepito from "./FelmeresTelepito";
import FelmeresFotok from "./FelmeresFotok";
import { updateItem, loadLocal, saveLocal } from "../lib/localDb";
import { driveSave } from "../lib/driveApi";

// ─── Sorozatszámos tételek ────────────────────────────────────
const SERIAL_CATEGORIES = ["inverter","akkumulátor","akkumulator","okosmérő","okosmerő","okos mérő","optimalizáló","optimalizalo","napelem","panel"];

function requiresSerial(nev) {
  if (!nev) return false;
  const n = nev.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  return SERIAL_CATEGORIES.some(k => n.includes(k.normalize("NFD").replace(/[\u0300-\u036f]/g,"")));
}

// ─── Fotó kategóriák ──────────────────────────────────────────
const FOTO_KAT = [
  { id:"ac_box", nev:"AC box (fedéllel és fedél nélkül)", leiras:"3 fotó: Megkötött állapotban fedél nélkül, Fedéllel és nyitott ajtóval, Fedéllel csukott ajtóval." },
  { id:"akkumulator", nev:"Akkumulátor", leiras:"2 fotó: Elhelyezéséről, Bekötéséről" },
  { id:"akku_adattabla", nev:"Akkumulátor adattábla", leiras:"1 fotó: Olvasható adattábla+S/N" },
  { id:"csatl_pont", nev:"Csatlakozási/rákötési pont", leiras:"2 fotó: Megkötött állapotban fedél nélkül, fedéllel" },
  { id:"dc_box", nev:"DC box (fedéllel és fedél nélkül)", leiras:"3 fotó: Megkötött állapotban fedél nélkül, Fedéllel és nyitott ajtóval, Fedéllel csukott ajtóval." },
  { id:"eph_kotes", nev:"EPH kötés", leiras:"Min. 1 fotó: Tartószerkezeti rákötés" },
  { id:"egyeb_dok", nev:"Egyéb dokumentáció", leiras:"Nyilatkozatok, fővállalkozói dokumentumok" },
  { id:"elrendezes", nev:"Elrendezés+stringek", leiras:"1 fotó: rajzolt elrendezés, stringek, QR-kódos elrendezés" },
  { id:"figyelm_tabla", nev:"Figyelmeztető tábla", leiras:"1 Fotó: Napelemes rendszer figyelmeztető tábláról" },
  { id:"fusterzekelő", nev:"Füstérzékelő", leiras:"Egy fotó felhelyezett állapotban." },
  { id:"inverter", nev:"Inverter", leiras:"2 fotó: Szemből - bekötésekkel, védelmi berendezésekkel" },
  { id:"inv_adattabla", nev:"Inverter adattábla", leiras:"1 fotó: Olvasható adattábla" },
  { id:"inv_beallitas", nev:"Inverter beállítások", leiras:"Több fotó: Visszwatt, Smart mérő, akkumulátor, működési mód" },
  { id:"inv_mukodes", nev:"Inverter működéséről", leiras:"1 fotó: Rendszer élő termeléséről" },
  { id:"kabel_nyomvonal", nev:"Kábel nyomvonal (AC/DC)", leiras:"Kábelhossz függvényeként több fotó." },
  { id:"matricak", nev:"Matricák, feliratok", leiras:"min. 3 fotó: AC box, DC box, Csatlakozási pont" },
  { id:"meres_ellenorzes", nev:"Mérés ellenőrzése", leiras:"Fogyasztásmérés ellenőrzése." },
  { id:"merohelyrol", nev:"Mérőhelyről", leiras:"3 fotó: Teljesítményről, Mérőről, Teljes mérőhely" },
  { id:"napelemek", nev:"Napelemek", leiras:"Min. 2 fotó: 2 irányból. Minden panel számolható legyen!" },
  { id:"panel_sn", nev:"Napelem SN számok", leiras:"Összes napelem szériaszáma olvashatóan." },
  { id:"optimalizalo", nev:"Optimalizáló", leiras:"min. 1 fotó: Tigo/Huawei - tartószerkezetre rögzítve" },
  { id:"plant_letrehozas", nev:"Plant létrehozás", leiras:"1 fotó: Online állapotban a rendszer monitoringon." },
  { id:"palyazati_tabla", nev:"Pályázati tábla", leiras:"3 fotó: közelről, 1-2 méterről, utca másik feléről" },
  { id:"smart_mero", nev:"Smart mérő/mérés", leiras:"2 fotó: Mérés kialakítása, kommunikáció" },
  { id:"tartoszerkezet", nev:"Tartószerkezet", leiras:"Min. 2 fotó: 2 irányból." },
  { id:"teto_kivezetes", nev:"Tető kivezetés", leiras:"1 fotó: Kábelkivezetés a tetőre" },
  { id:"tuz_levalaszto", nev:"Tűzeseti leválasztó", leiras:"1 fotó: Megkötött tűzeseti leválasztó." },
  { id:"wifi_stick", nev:"Wifi Stick", leiras:"1 fotó: Olvasható adatokkal" },
  { id:"wifi_beallitas", nev:"Wifi beállítás", leiras:"1. fotó: Sikeres wifi beállításról" },
];

const FOTO_HIANY_OKOK_LIST = ["Nincs ilyen eszköz","Nem releváns a munkatípushoz","Nem látható"];

const VBF_TEMPLATE = {
  acFeszultseg: { L1:"", L2:"", L3:"" },
  kismegsInverter: { L1:"", L2:"", L3:"" },
  kismegsMero: { L1:"", L2:"", L3:"" },
  panelszam: { ST1:"", ST2:"", ST3:"", ST4:"", ST5:"", ST6:"" },
  dcFeszultseg: { ST1:"", ST2:"", ST3:"", ST4:"", ST5:"", ST6:"" },
  hurokellenallas: { L1:"", L2:"", L3:"" },
  smartMeter:"", akku:"", betapaltDC:"",
  panelTipus:"", panelVoc:"", panelVmp:"", panelImp:"", panelIsc:"", panelTelj:"",
  inverterNevleges:"", tuzMegszakito:"",
};

function getMunkalapAzonosito(m) {
  return (
    m?.dokumentumszam ||
    m?.munkalapSzam ||
    m?.munkalapszam ||
    m?.workorderNumber ||
    m?.ediSorszam ||
    m?.ugyszam ||
    m?.id ||
    "Munkalap"
  );
}

function VbfNumInput({ value, onCommit, unit, piros }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => { setLocal(value ?? ""); }, [value]);

  function handleBlur() {
    const v = local === "0" ? "" : local;
    onCommit(v);
  }

  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, flex:1 }}>
      <input
        inputMode="decimal"
        value={local}
        onChange={e => setLocal(e.target.value.replace(/[^0-9.,]/g,""))}
        onBlur={handleBlur}
        placeholder="—"
        style={{ flex:1, padding:"8px 10px", border:`1.5px solid ${piros&&!local?"#EF4444":C.border}`, borderRadius:8, fontSize:15, fontFamily:FONT, color:C.text, outline:"none", background:piros&&!local?"#FEF2F2":"#F8FAFC", minWidth:0 }}
      />
      {unit && <span style={{ fontSize:12, color:C.muted, whiteSpace:"nowrap", flexShrink:0, minWidth:32 }}>{unit}</span>}
    </div>
  );
}

function VbfTextInput({ value, onCommit, piros }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => { setLocal(value ?? ""); }, [value]);
  return (
    <input
      value={local}
      onChange={e=>setLocal(e.target.value)}
      onBlur={()=>onCommit(local)}
      placeholder="pl. Risen Energy 425W"
      style={{ width:"100%", padding:"8px 10px", border:`1.5px solid ${piros&&!local?"#EF4444":C.border}`, borderRadius:8, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", background:piros&&!local?"#FEF2F2":"#F8FAFC" }}
    />
  );
}

function MeroSor({ label, value, onCommit, unit, piros }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
      <span style={{ width:40, fontSize:13, color:C.textSub, flexShrink:0, fontWeight:600 }}>{label}</span>
      <VbfNumInput value={value} onCommit={onCommit} unit={unit} piros={piros}/>
    </div>
  );
}

function MeroSzakasz({ title, children }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
      {title && <p style={{ fontSize:13, fontWeight:700, color:C.textSub, marginBottom:12, borderBottom:`1px solid ${C.border}`, paddingBottom:8 }}>{title}</p>}
      {children}
    </div>
  );
}

function FotoKartya({ kat, photos, onChange, hianyOk, onHianyOkChange }) {
  const ref = useRef();
  const nincsKep = photos.length === 0;

  function handleFiles(files) {
    const arr = Array.from(files).map((f,i) => {
      const ext = f.name.split(".").pop();
      const safe = kat.nev.replace(/[^a-zA-Z0-9]/g,"_").replace(/_+/g,"_");
      return { originalName:f.name, name:`${safe}_${photos.length+i+1}.${ext}`, size:f.size, type:f.type, url:URL.createObjectURL(f), fileObj:f };
    });
    onChange([...photos, ...arr]);
  }

  return (
    <div style={{
      background:"#fff",
      border:`1.5px solid ${nincsKep&&!hianyOk?"#FCA5A5":nincsKep&&hianyOk?"#86EFAC":C.border}`,
      borderRadius:12, padding:"14px 16px", marginBottom:12
    }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
        <div style={{ flex:1 }}>
          <p style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:2 }}>{kat.nev}</p>
          <p style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>{kat.leiras}</p>
        </div>
        <button onClick={()=>ref.current?.click()} style={{ width:48, height:48, flexShrink:0, background:"#EFF6FF", border:`1.5px solid #93C5FD`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          <Camera size={22} color="#D97706"/>
        </button>
      </div>

      <input ref={ref} type="file" multiple accept="image/*,.pdf" style={{ display:"none" }} onChange={e=>handleFiles(e.target.files)}/>

      {photos.length > 0 && (
        <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color:C.success, fontWeight:600, alignSelf:"center" }}>✓ {photos.length} db feltöltve</span>
          {photos.map((p,i)=>(
            <div key={i} style={{ position:"relative" }}>
              {p.url&&p.type?.startsWith("image")
                ? <img src={p.url} style={{ width:56,height:56,objectFit:"cover",borderRadius:8,border:`1px solid ${C.border}` }}/>
                : <div style={{ width:56,height:56,background:C.bg,borderRadius:8,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center" }}><FileText size={18} color={C.muted}/></div>}
              <button onClick={()=>onChange(photos.filter((_,j)=>j!==i))} style={{ position:"absolute",top:-4,right:-4,width:18,height:18,background:C.danger,border:"none",borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                <X size={10} color="#fff"/>
              </button>
            </div>
          ))}
        </div>
      )}

      {nincsKep && (
        <div style={{ marginTop:10 }}>
          <p style={{ fontSize:11, fontWeight:700, color: hianyOk?"#059669":"#DC2626", marginBottom:6, textTransform:"uppercase", letterSpacing:.6 }}>
            {hianyOk ? "✓ Indoklás megadva" : "⚠️ Kötelező magyarázat – nincs fotó"}
          </p>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {FOTO_HIANY_OKOK_LIST.map(ok => (
              <button
                key={ok}
                onClick={()=>onHianyOkChange(hianyOk===ok ? null : ok)}
                style={{
                  padding:"6px 12px",
                  borderRadius:20,
                  fontSize:12,
                  fontWeight:600,
                  cursor:"pointer",
                  fontFamily:FONT,
                  background: hianyOk===ok ? "#DCFCE7" : "#F8FAFC",
                  color: hianyOk===ok ? "#059669" : "#64748B",
                  border: `1.5px solid ${hianyOk===ok ? "#86EFAC" : "#E2E8F0"}`,
                }}
              >
                {ok}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FelhasznaltAnyagokTab({ munkalapId, meglevoAnyagok, onSave }) {
  function initAnyagok() {
    const saved = loadLocal(`felh_anyagok_${munkalapId}`);
    if (saved) return saved;
    return (meglevoAnyagok||[]).map(a => {
      const nev = a.nev||a.name||"";
      const db = parseInt(a.menny||a.qty||1) || 1;
      const needSerial = requiresSerial(nev);
      return {
        id: `a_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        nev,
        menny: db,
        egyseg: a.egyseg||a.unit||"db",
        needSerial,
        isManual: false,
        sorozatszamok: needSerial ? Array.from({length:db},()=>"") : null,
      };
    });
  }

  const [anyagok, setAnyagok] = useState(initAnyagok);
  const [ujNev, setUjNev] = useState("");
  const [ujMenny, setUjMenny] = useState(1);
  const [ujEgyseg, setUjEgyseg] = useState("db");
  const [mentve, setMentve] = useState(false);
  const [hiba, setHiba] = useState("");

  function add() {
    if (!ujNev.trim()) return;
    const db = parseInt(ujMenny)||1;
    const needSerial = requiresSerial(ujNev);
    setAnyagok(p=>[...p, {
      id:`a_${Date.now()}`,
      nev:ujNev.trim(),
      menny:db,
      egyseg:ujEgyseg,
      needSerial,
      isManual: true,
      sorozatszamok: needSerial ? Array.from({length:db},()=>"") : null,
    }]);
    setUjNev("");
    setUjMenny(1);
  }

  function updSerial(aid, idx, val) {
    setAnyagok(p=>p.map(a=>a.id!==aid?a:{...a,sorozatszamok:a.sorozatszamok.map((s,i)=>i===idx?val:s)}));
  }

  function save() {
    const hiany = anyagok.filter(a=>a.needSerial&&a.sorozatszamok?.some(s=>!s||s.trim()===""));
    if (hiany.length>0) {
      setHiba("Hiányzó sorozatszám: "+hiany.map(a=>a.nev).join(", "));
      return;
    }
    setHiba("");
    saveLocal(`felh_anyagok_${munkalapId}`, anyagok);
    updateItem("munkalapok", munkalapId, { felhasznaltAnyagok: anyagok });
    window.dispatchEvent(new CustomEvent("crm-db-updated",{detail:{collection:"munkalapok"}}));
    onSave(anyagok);
    setMentve(true);
    setTimeout(()=>setMentve(false),2000);
  }

  return (
    <div style={{ padding:"16px", background:"#F1F5F9" }}>
      <p style={{ fontSize:13, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
        Kék keretes tételeknél minden darabhoz külön sorozatszám szükséges.
      </p>

      {hiba&&<div style={{ background:"#FEF2F2",border:`1px solid #FECACA`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.danger }}>⚠️ {hiba}</div>}

      {anyagok.map(a=>(
        <div key={a.id} style={{ background:"#fff", border:`1.5px solid ${a.needSerial?"#2563EB30":C.border}`, borderRadius:12, padding:"12px 14px", marginBottom:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:a.needSerial?10:0 }}>
            {a.needSerial&&<Hash size={14} color={C.accent} style={{flexShrink:0}}/>}
            <span style={{ flex:1, fontSize:14, fontWeight:600, color:C.text }}>{a.nev}</span>
            <span style={{ fontSize:13, color:C.muted, whiteSpace:"nowrap" }}>{a.menny} {a.egyseg}</span>
            {a.isManual && (
              <button onClick={()=>setAnyagok(p=>p.filter(x=>x.id!==a.id))} style={{ border:"none",background:"none",cursor:"pointer",color:C.danger,flexShrink:0 }}>
                <Trash2 size={14}/>
              </button>
            )}
          </div>

          {a.needSerial && a.sorozatszamok?.map((sn,idx)=>(
            <div key={idx} style={{ marginBottom:6 }}>
              <label style={{ fontSize:11, color:C.accent, fontWeight:700, textTransform:"uppercase", letterSpacing:.8 }}>
                {idx+1}. db sorozatszáma (kötelező)
              </label>
              <input
                value={sn}
                onChange={e=>updSerial(a.id,idx,e.target.value)}
                placeholder="pl. SN-1234567890"
                style={{ width:"100%", marginTop:4, padding:"9px 12px", border:`1.5px solid ${!sn?C.accent:C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", background:!sn?"#EFF6FF":"#F8FAFC" }}
              />
            </div>
          ))}
        </div>
      ))}

      <div style={{ border:`1.5px dashed ${C.border}`,borderRadius:12,padding:14,background:"#fff",marginBottom:16 }}>
        <p style={{ fontSize:12,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:.8,marginBottom:10 }}>Új tétel</p>
        <input
          value={ujNev}
          onChange={e=>setUjNev(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&add()}
          placeholder="Anyag / eszköz neve…"
          style={{ width:"100%",padding:"10px 12px",border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:14,fontFamily:FONT,outline:"none",marginBottom:8 }}
        />
        {requiresSerial(ujNev)&&<p style={{ fontSize:12,color:C.accent,marginBottom:8,fontWeight:600 }}>⚠️ Sorozatszámot igényel ({ujMenny} db → {ujMenny} mező)</p>}
        <div style={{ display:"flex",gap:8 }}>
          <input type="number" value={ujMenny} onChange={e=>setUjMenny(parseInt(e.target.value)||1)}
            style={{ width:64,padding:"10px 8px",border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:14,fontFamily:FONT,outline:"none",textAlign:"center" }}/>
          <input value={ujEgyseg} onChange={e=>setUjEgyseg(e.target.value)} placeholder="db"
            style={{ width:64,padding:"10px 8px",border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:13,fontFamily:FONT,outline:"none" }}/>
          <button onClick={add} style={{ flex:1,padding:"10px",background:C.accent,color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:700,fontFamily:FONT }}>+ Hozzáad</button>
        </div>
      </div>

      <button onClick={save} style={{ width:"100%",padding:"14px",borderRadius:12,border:"none",background:C.success,color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:FONT }}>
        <Save size={18}/>{mentve?"Mentve ✓":"Anyagok mentése"}
      </button>
    </div>
  );
}

export default function TelepItoMunkalap({ m, data, onBack }) {
  const client = data.ugyfelek?.find(u=>u.id===m.clientId);
  const clientNev = m.clientNev||client?.name||"";
  const clientCim = m.clientCim||client?.address||"";
  const clientTel = m.clientTel||client?.phone||"";
  const munkalapAzonosito = getMunkalapAzonosito(m);

  const isLezartStatus = (ml) =>
    ml.lezarva ||
    ml.status==="Befejezett" ||
    ml.status==="Ellenőrzés alatt" ||
    ml.status==="Lezárva" ||
    ml.status==="Számlázva";

  const [lezart, setLezart] = useState(() => isLezartStatus(m));

  useEffect(() => {
    if (isLezartStatus(m)) setLezart(true);
  }, [m.lezarva, m.status]);

  const [megkezdve, setMegkezdve] = useState(m.megkezdve||false);
  const [activeTab, setActiveTab] = useState(0);
  const [figy, setFigy] = useState(false);
  const [showAlairas, setShowAlairas] = useState(false);
  const [showLmra, setShowLmra] = useState(false);
  const [progress, setProgress] = useState(null);
  const [progressMsg, setProgressMsg] = useState("");
  const [megjegyzes, setMegjegyzes] = useState(m.megjegyzes||"");

  const [vbf, setVbf] = useState(()=>loadLocal(`vbf_${m.id}`)||VBF_TEMPLATE);
  const [fotok,setFotok] = useState(()=>loadLocal(`fotok_${m.id}`)||Object.fromEntries(FOTO_KAT.map(k=>[k.id,[]])));
  const [fotoHianyOkok, setFotoHianyOkok] = useState(()=>{
    const saved = loadLocal(`foto_hiany_${m.id}`);
    return saved || {};
  });

  useEffect(()=>{
    const toSave = Object.fromEntries(Object.entries(fotok).map(([k,v])=>[k,v.map(f=>({name:f.name,size:f.size,type:f.type,originalName:f.originalName}))]));
    saveLocal(`fotok_${m.id}`,toSave);
    window.dispatchEvent(new CustomEvent("crm-db-updated",{detail:{collection:`fotok_${m.id}`}}));
  },[fotok,m.id]);

  useEffect(()=>{ saveLocal(`foto_hiany_${m.id}`,fotoHianyOkok); },[fotoHianyOkok,m.id]);

  function updVbf(section, field, val) {
    const nv = field ? {...vbf,[section]:{...vbf[section],[field]:val}} : {...vbf,[section]:val};
    setVbf(nv);
    saveLocal(`vbf_${m.id}`,nv);
    window.dispatchEvent(new CustomEvent("crm-db-updated",{detail:{collection:`vbf_${m.id}`}}));
  }

  function checkVbfHianyos() {
    return Object.values(vbf).flatMap(v=>typeof v==="object"?Object.values(v):[v]).some(v=>v===""||v===null||v===undefined);
  }

  function handleMegkezdes() {
    // LMRA szükséges-e? Mindig megnyitjuk az LMRA nézetet (ha már lezárva, azonnal megkezdés)
    setShowLmra(true);
  }

  function doMegkezdes() {
    const ts = new Date().toISOString();
    const ujStatus = ["Kivitelezésre vár","Megkezdésre Vár","Ütemezett","Kiosztásra vár","Létrehozva","Kiosztva csapatnak"].includes(m.status) ? "Folyamatban" : m.status;
    updateItem("munkalapok", m.id, { megkezdve: true, megkezdesIdopont: ts, status: ujStatus, statusSzin: "#2563EB" });
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "munkalapok" } }));
    setMegkezdve(true);
    setShowLmra(false);
    setActiveTab(3);
  }

  function handleLmraComplete(lmraAdat) {
    // LMRA lezárva – frissítjük a munkalapot
    updateItem("munkalapok", m.id, { lmraLezarva: true, lmraLezarvaAt: new Date().toISOString() });
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "munkalapok" } }));
  }

  function handleBefejezesKezdete() {
    if (checkVbfHianyos()) {
      setFigy(true);
      alert("⚠️ Lezárás sikertelen!\n\nA VBF Jegyzőkönyv nincs teljesen kitöltve.\nHagyd üresen a nem releváns mezőket – azok nem blokkolják a lezárást.");
      return;
    }

    setFigy(false);

    const osszesFoto = Object.values(fotok).reduce((s,a)=>s+(a.length||0),0);
    if (osszesFoto===0) {
      alert("⚠️ Lezárás sikertelen!\n\nNincs feltöltve egyetlen fotó sem.\nTölts fel legalább 1 fotót.");
      return;
    }

    if (!megjegyzes||megjegyzes.trim().length===0) {
      alert("⚠️ Lezárás sikertelen!\n\nA megjegyzés mező kötelező.\nÍrd le a munkavégzés összefoglalóját az Ellenőrzés fülön.");
      setActiveTab(megkezdve?6:2);
      return;
    }

    const hianyosKat = FOTO_KAT.filter(k=>(fotok[k.id]||[]).length===0);
    const missing = hianyosKat.filter(k=>!fotoHianyOkok[k.id]);
    if (missing.length>0) {
      alert("⚠️ Lezárás sikertelen!\n\nHiányzó indoklás a következő kategóriáknál:\n"+missing.map(k=>"• "+k.nev).join("\n")+"\n\nA Fotók fülön válassz magyarázatot minden fotó nélküli kategóriához!");
      setActiveTab(megkezdve?5:2);
      return;
    }

    setShowAlairas(true);
  }

  async function handleBefejezes(alairasData) {
    setShowAlairas(false);

    if (alairasData) {
      updateItem("munkalapok",m.id,{alairas:{dataUrl:alairasData.alairasDataUrl,datum:alairasData.alairasDatum,szoveg:alairasData.szoveg}});
    }

    const steps=[
      {msg:"Adatok ellenőrzése…", pct:10},
      {msg:"VBF mentése…", pct:25},
      {msg:"Megjegyzés mentése…", pct:35},
      {msg:"Anyagok mentése…", pct:45},
      {msg:"Fotók előkészítése…", pct:55},
      {msg:"Drive mappa létrehozása…", pct:65},
      {msg:"Fotók feltöltése…", pct:80},
      {msg:"Munkalap lezárása…", pct:92},
      {msg:"Kész!", pct:100},
    ];

    for (const step of steps) {
      setProgress(step.pct);
      setProgressMsg(step.msg);
      await new Promise(r=>setTimeout(r,400));
      if (step.pct===80) await uploadFotokToDrive();
    }

    const ts = new Date().toISOString();
    const updates = {
      status:"Ellenőrzés alatt",
      statusSzin:"#D97706",
      befejezesIdopont:ts,
      lezarva:true,
      megjegyzes:megjegyzes.trim(),
    };

    updateItem("munkalapok",m.id,updates);

    try {
      const osszesMl = loadLocal("munkalapok")||[];
      await driveSave("munkalapok",{munkalapok:osszesMl});
    } catch(e) {
      console.warn("[Drive sync]",e);
    }

    window.dispatchEvent(new CustomEvent("crm-db-updated",{detail:{collection:"munkalapok",action:"update",id:m.id}}));

    setLezart(true);
    await new Promise(r=>setTimeout(r,800));
    setProgress(null);
    await new Promise(r=>setTimeout(r,200));
    onBack(true);
  }

  async function uploadFotokToDrive() {
    const scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
    if (!scriptUrl) return;

    try {
      await fetch(scriptUrl,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"createMunkalapFolder",munkalapId:m.id})});
      const osszesFoto=Object.entries(fotok).flatMap(([,photos])=>photos.filter(p=>p.fileObj||p.file||(p.url?.startsWith("blob:"))));
      let n=0;

      for (const foto of osszesFoto) {
        try {
          let b64="";
          const src=foto.fileObj||foto.file;

          if(src){
            b64=await new Promise(res=>{
              const r=new FileReader();
              r.onload=e=>res(e.target.result.split(",")[1]);
              r.onerror=()=>res("");
              r.readAsDataURL(src);
            });
          } else if(foto.url?.startsWith("blob:")){
            try {
              const resp=await fetch(foto.url);
              const blob=await resp.blob();
              b64=await new Promise(res=>{
                const r=new FileReader();
                r.onload=e=>res(e.target.result.split(",")[1]);
                r.onerror=()=>res("");
                r.readAsDataURL(blob);
              });
            } catch {}
          }

          if(!b64) continue;

          await fetch(scriptUrl,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"saveFoto",munkalapId:m.id,fotoNev:foto.name,fotoBase64:b64,mimeType:foto.type||"image/jpeg"})});
          n++;
          setProgressMsg(`Fotók feltöltése… (${n}/${osszesFoto.length})`);
        } catch {}
      }

      await fetch(scriptUrl,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"saveJson",fileName:`vbf_${m.id}.json`,content:vbf})});
    } catch(e) {
      console.warn("[Drive upload]",e);
    }
  }

  async function handleVbfMentes() {
    saveLocal(`vbf_${m.id}`,vbf);
    updateItem("munkalapok",m.id,{vbf});
    window.dispatchEvent(new CustomEvent("crm-db-updated",{detail:{collection:"munkalapok"}}));
    setProgress(100);
    setProgressMsg("VBF mentve ✓");
    await new Promise(r=>setTimeout(r,1200));
    setProgress(null);
  }

  if (m.status==="Felmérés"&&!lezart) return <FelmeresTelepito m={m} data={data} onBack={onBack}/>;

  if (lezart) return (
    <div style={{ minHeight:"100vh",background:"#F1F5F9",fontFamily:FONT }}>
      <div style={{ background:"#2C4A6E",padding:"44px 16px 16px" }}>
        <button onClick={onBack} style={{ border:"none",background:"none",color:"#94A3B8",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13,fontFamily:FONT,fontWeight:600 }}>
          <ArrowLeft size={18}/> Feladatok
        </button>
        <p style={{ fontWeight:800,fontSize:16,color:"#fff",marginTop:8 }}>{munkalapAzonosito}</p>
        <p style={{ fontWeight:700,fontSize:15,color:"#fff" }}>{clientNev}</p>
        <p style={{ fontSize:12,color:"#94A3B8" }}>{clientCim}</p>
      </div>
      <div style={{ padding:24,textAlign:"center" }}>
        <Lock size={48} color={C.muted} style={{ opacity:.3,display:"block",margin:"0 auto 16px" }}/>
        <p style={{ fontWeight:700,fontSize:18,color:C.text,marginBottom:8 }}>
          {m.status==="Lezárva"||m.status==="Számlázva" ? `Munka ${m.status}` : "Munka lezárva – Ellenőrzés alatt"}
        </p>
        <p style={{ fontSize:14,color:C.muted,marginBottom:8 }}>Befejezve: {m.befejezesIdopont?new Date(m.befejezesIdopont).toLocaleString("hu-HU"):"—"}</p>
        {m.megjegyzes&&<div style={{ background:"#F8FAFC",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",margin:"0 auto",maxWidth:400,textAlign:"left" }}><p style={{ fontSize:12,color:C.muted,marginBottom:4 }}>Megjegyzés:</p><p style={{ fontSize:14,color:C.text }}>{m.megjegyzes}</p></div>}
        <p style={{ fontSize:13,color:C.muted,marginTop:16 }}>Módosítás csak Admin / Projektmenedzser fiókból lehetséges.</p>
      </div>
    </div>
  );

  if (progress!==null) return (
    <div style={{ minHeight:"100vh",background:"#F1F5F9",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,fontFamily:FONT }}>
      <div style={{ background:"#fff",borderRadius:20,padding:32,width:"100%",maxWidth:400,textAlign:"center",boxShadow:"0 8px 32px rgba(0,0,0,.1)" }}>
        <div style={{ width:72,height:72,borderRadius:"50%",background:progress===100?C.success:"#EFF6FF",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px" }}>
          {progress===100?<CheckCircle2 size={36} color="#fff"/>:<Save size={32} color={C.accent}/>}
        </div>
        <p style={{ fontSize:17,fontWeight:700,color:C.text,marginBottom:8 }}>{progressMsg}</p>
        <p style={{ fontSize:28,fontWeight:800,color:progress===100?C.success:C.accent,marginBottom:20 }}>{progress}%</p>
        <div style={{ background:C.bg,borderRadius:10,height:12,overflow:"hidden" }}>
          <div style={{ width:`${progress}%`,height:"100%",background:progress===100?C.success:C.accent,borderRadius:10,transition:"width 0.4s ease" }}/>
        </div>
        {progress===100&&<p style={{ fontSize:14,color:C.muted,marginTop:16 }}>Visszatérés a feladatokhoz…</p>}
      </div>
    </div>
  );

  const TABS_BEFORE=[{icon:"📄"},{icon:"📦"},{icon:"📋"}];
  const TABS_AFTER=[{icon:"📄"},{icon:"📦"},{icon:"📋"},{icon:"⚙️"},{icon:"📐"},{icon:"📷"},{icon:"✅"}];
  const TABS = megkezdve?TABS_AFTER:TABS_BEFORE;

  const Header=()=>(
    <div style={{ background:"#2C4A6E" }}>
      <div style={{ display:"flex",alignItems:"center",gap:10,padding:"44px 16px 8px" }}>
        <button onClick={onBack} style={{ border:"none",background:"none",color:"#94A3B8",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13,fontFamily:FONT,fontWeight:600 }}>
          <ArrowLeft size={18}/> Feladatok
        </button>
        <span style={{ fontWeight:800,fontSize:14,color:"#fff",flex:1 }}>{munkalapAzonosito}</span>
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

  const TabSav=()=>(
    <div style={{ display:"flex",background:"#2C4A6E",overflowX:"auto" }}>
      {TABS.map((t,i)=>(
        <button key={i} onClick={()=>setActiveTab(i)} style={{ flex:1,padding:"12px 4px",border:"none",background:"transparent",color:activeTab===i?"#fff":"#94A3B8",cursor:"pointer",borderBottom:activeTab===i?"3px solid #fff":"3px solid transparent",fontSize:20,minWidth:44 }}>
          {t.icon}
        </button>
      ))}
    </div>
  );

  const InfoTab=()=>{
    const FR=({label,value})=>value?(<div><p style={{ fontSize:12,color:"#64748B",paddingTop:8,marginBottom:3 }}>{label}</p><div style={{ background:"#E8EDF5",borderRadius:6,padding:"9px 12px",fontSize:14,color:C.text }}>{value}</div></div>):null;
    return (
      <div style={{ padding:"0 16px 16px",background:"#F1F5F9" }}>
        <FR label="Projekt megnevezés" value={m.projektMegnevezes}/>
        <FR label="Feladat" value={m.feladat}/>
        <FR label="Kapcsolattartó" value={clientNev}/>
        <FR label="Telefonszám" value={clientTel}/>
        <FR label="Értékesítő" value={m.ertekesito}/>
        {m.megkezdesIdopont&&<div style={{ marginTop:12,padding:"10px 14px",background:"#EFF6FF",border:`1px solid #BFDBFE`,borderRadius:10,fontSize:13,color:C.accent }}>▶️ Megkezdve: <b>{new Date(m.megkezdesIdopont).toLocaleString("hu-HU")}</b></div>}
        {!megkezdve ? (
          <div style={{ marginTop: 20 }}>
            <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#92400E" }}>
              <Shield size={16} color="#D97706" />
              <span><b>LMRA szükséges</b> – minden csapattag aláírja a kockázatbecslést a munkakezdés előtt</span>
            </div>
            <button onClick={handleMegkezdes} style={{ width:"100%",padding:"15px",borderRadius:12,border:"none",background:"#22C55E",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:FONT }}>
              <Shield size={18}/> LMRA + Megkezdés →
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginTop:12,padding:"10px 14px",background:"#ECFDF5",border:`1px solid #A7F3D0`,borderRadius:10,fontSize:13,color:C.success,fontWeight:600 }}>✅ Munka folyamatban</div>
            {(() => {
              const lmraRec = loadLocal(`lmra_rec_${m.id}`);
              if (lmraRec && ["alairva","exportalva"].includes(lmraRec.status)) {
                return (
                  <div style={{ marginTop:8,padding:"8px 12px",background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:9,fontSize:12,color:"#166534" }}>
                    🛡️ LMRA aláírva · {(lmraRec.resztvevok||[]).filter(r=>r.signed).map(r=>r.nev).join(", ")}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}
      </div>
    );
  };

  const AnyagokTab=()=>(
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

  const FelmeresTab=()=>{
    const f=m.felmeres||{};
    const mezok=[["Csatlakozási pont",f.csatlakozasiPont],["AC védelem",f.acVedelem],["Inverter fal",f.inverterFal],["Akkumulátor fal",f.akkuFal],["Tető típus",f.tetoTipus],["Tartószerkezet",f.tartoszerkezetTipus],["DC kábel hossz",f.dcKabelHossz],["DC védelem",f.dcVedelem],["Panel elrendezés",f.panelElrendezes],["Megközelíthetőség",f.megkozelithetoseg]].filter(([,v])=>v!==undefined&&v!=="");
    return (
      <div style={{ background:"#F1F5F9" }}>
        {mezok.length===0&&<div style={{ padding:"32px 16px",textAlign:"center",color:C.muted }}><p>Nincs felmérés adat</p></div>}
        {mezok.map(([label,value])=>(
          <div key={label} style={{ padding:"0 16px" }}>
            <p style={{ fontSize:12,color:"#64748B",paddingTop:8,marginBottom:3 }}>{label}</p>
            <div style={{ background:"#E8EDF5",borderRadius:6,padding:"9px 12px",fontSize:14,color:C.text }}>{String(value)}</div>
          </div>
        ))}
      </div>
    );
  };

  const VbfTab=()=>(
    <div style={{ padding:"16px",background:"#F1F5F9" }}>
      {figy&&<div style={{ background:"#FEF2F2",border:`1px solid #FECACA`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.danger,display:"flex",alignItems:"center",gap:8 }}>
        <AlertTriangle size={16}/>Hiányos VBF mezők – töltsd ki vagy hagyd üresen ha nem releváns
      </div>}
      <div style={{ background:"#EFF6FF",border:`1px solid #BFDBFE`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#1D4ED8" }}>
        💡 Üres mező = nem releváns. Ha nulla az érték, hagyd üresen.
      </div>
      <MeroSzakasz title="AC feszültség">{["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.acFeszultseg[l]} onCommit={v=>updVbf("acFeszultseg",l,v)} unit="V" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="Kismegszakító – Inverternél">{["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.kismegsInverter[l]} onCommit={v=>updVbf("kismegsInverter",l,v)} unit="A" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="Kismegszakító – Mérőhelynél">{["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.kismegsMero[l]} onCommit={v=>updVbf("kismegsMero",l,v)} unit="A" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="Panelszám">{["ST1","ST2","ST3","ST4","ST5","ST6"].map(s=><MeroSor key={s} label={s} value={vbf.panelszam[s]} onCommit={v=>updVbf("panelszam",s,v)} unit="db" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="DC feszültség">{["ST1","ST2","ST3","ST4","ST5","ST6"].map(s=><MeroSor key={s} label={s} value={vbf.dcFeszultseg[s]} onCommit={v=>updVbf("dcFeszultseg",s,v)} unit="V" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="Hurokellenállás">{["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.hurokellenallas[l]} onCommit={v=>updVbf("hurokellenallas",l,v)} unit="MΩ" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="Smart meter & AKKU">
        <MeroSor label="SM" value={vbf.smartMeter} onCommit={v=>updVbf("smartMeter",null,v)} unit="db" piros={figy}/>
        <MeroSor label="AKKU" value={vbf.akku} onCommit={v=>updVbf("akku",null,v)} unit="db" piros={figy}/>
      </MeroSzakasz>
      <MeroSzakasz title="Betáplált DC teljesítmény">
        <MeroSor label="DC" value={vbf.betapaltDC} onCommit={v=>updVbf("betapaltDC",null,v)} unit="Wp" piros={figy}/>
      </MeroSzakasz>
      <MeroSzakasz title="Panel pontos adatok">
        <div style={{ marginBottom:12 }}>
          <p style={{ fontSize:13,color:C.muted,marginBottom:6 }}>Napelem Típusa <span style={{ fontSize:11,color:"#2563EB" }}>(szöveg)</span></p>
          <VbfTextInput value={vbf.panelTipus} onCommit={v=>updVbf("panelTipus",null,v)} piros={figy}/>
        </div>
        <MeroSor label="Voc" value={vbf.panelVoc} onCommit={v=>updVbf("panelVoc",null,v)} unit="V" piros={figy}/>
        <MeroSor label="Vmp" value={vbf.panelVmp} onCommit={v=>updVbf("panelVmp",null,v)} unit="V" piros={figy}/>
        <MeroSor label="Imp" value={vbf.panelImp} onCommit={v=>updVbf("panelImp",null,v)} unit="A" piros={figy}/>
        <MeroSor label="Isc" value={vbf.panelIsc} onCommit={v=>updVbf("panelIsc",null,v)} unit="A" piros={figy}/>
        <MeroSor label="Telj." value={vbf.panelTelj} onCommit={v=>updVbf("panelTelj",null,v)} unit="Wp" piros={figy}/>
      </MeroSzakasz>
      <MeroSzakasz title="Inverter pontos adatok">
        <MeroSor label="kVA" value={vbf.inverterNevleges} onCommit={v=>updVbf("inverterNevleges",null,v)} unit="kVA" piros={figy}/>
      </MeroSzakasz>
      <MeroSzakasz title="Tűzeseti adatok">
        <MeroSor label="A" value={vbf.tuzMegszakito} onCommit={v=>updVbf("tuzMegszakito",null,v)} unit="A" piros={figy}/>
      </MeroSzakasz>
      <button onClick={handleVbfMentes} style={{ width:"100%",padding:"14px",borderRadius:12,border:"none",background:C.accent,color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:FONT,marginTop:8,marginBottom:32 }}>
        <Save size={18}/>VBF mentése
      </button>
    </div>
  );

  const FotokTab=()=>(
    <div style={{ padding:"16px",background:"#F1F5F9" }}>
      <p style={{ fontSize:13,color:C.muted,marginBottom:16,lineHeight:1.6 }}>
        Minden kategóriába töltsd fel a fotókat. Ha nincs fotó, kötelező magyarázatot választani!
      </p>
      {FOTO_KAT.map(kat=>(
        <FotoKartya
          key={kat.id}
          kat={kat}
          photos={fotok[kat.id]||[]}
          onChange={v=>setFotok(p=>({...p,[kat.id]:v}))}
          hianyOk={fotoHianyOkok[kat.id]||null}
          onHianyOkChange={v=>setFotoHianyOkok(p=>({...p,[kat.id]:v}))}
        />
      ))}
    </div>
  );

  const ell_vbfOk = !checkVbfHianyos();
  const ell_osszesFoto = Object.values(fotok).reduce((s,a)=>s+(a.length||0),0);
  const ell_hianyosKat = FOTO_KAT.filter(k=>(fotok[k.id]||[]).length===0);
  const ell_mindenKatOk = ell_hianyosKat.every(k=>fotoHianyOkok[k.id]);
  const ell_megjegyzesMegvan = megjegyzes.trim().length > 0;
  const lezarhatoE = ell_vbfOk && ell_osszesFoto>0 && ell_megjegyzesMegvan && (ell_mindenKatOk||ell_hianyosKat.length===0);

  return (
    <div style={{ minHeight:"100vh",background:"#F1F5F9",fontFamily:FONT }}>
      <Header/>
      <TabSav/>
      {activeTab===0&&<InfoTab/>}
      {activeTab===1&&<AnyagokTab/>}
      {activeTab===2&&<FelmeresTab/>}
      {megkezdve&&activeTab===3&&<FelhasznaltAnyagokTab munkalapId={m.id} meglevoAnyagok={m.anyagok||[]} onSave={()=>{}}/>}
      {megkezdve&&activeTab===4&&<VbfTab/>}
      {megkezdve&&activeTab===5&&<FotokTab/>}
      {megkezdve&&activeTab===6&&(
        <div style={{ padding:"16px",background:"#F1F5F9",paddingBottom:80 }}>
          <div style={{ background:"#fff",border:`1.5px solid ${!ell_megjegyzesMegvan?"#FCA5A5":C.border}`,borderRadius:12,padding:16,marginBottom:16 }}>
            <p style={{ fontSize:14,fontWeight:700,color:C.text,marginBottom:4 }}>
              📝 Megjegyzés / munkavégzés összefoglalója
              <span style={{ color:"#DC2626",marginLeft:6,fontSize:12 }}>*kötelező</span>
            </p>
            <p style={{ fontSize:12,color:C.muted,marginBottom:10 }}>Írd le a telepítés menetét, észrevételeket, problémákat.</p>
            <textarea
              value={megjegyzes}
              onChange={e=>setMegjegyzes(e.target.value)}
              onBlur={()=>{
                if (megjegyzes.trim().length>0) {
                  updateItem("munkalapok",m.id,{megjegyzes:megjegyzes.trim()});
                  window.dispatchEvent(new CustomEvent("crm-db-updated",{detail:{collection:"munkalapok"}}));
                }
              }}
              placeholder="Pl. A telepítés rendben megtörtént. Az inverter a garázs falán lett elhelyezve..."
              rows={5}
              style={{ width:"100%",padding:"10px 12px",border:`1.5px solid ${!ell_megjegyzesMegvan?"#EF4444":C.border}`,borderRadius:9,fontSize:14,fontFamily:FONT,color:C.text,outline:"none",background:"#F8FAFC",resize:"vertical",boxSizing:"border-box" }}
            />
            {ell_megjegyzesMegvan && <span style={{ fontSize:11,color:C.success }}>✓ Megjegyzés megadva</span>}
          </div>

          <div style={{ background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:16 }}>
            <p style={{ fontSize:15,fontWeight:700,color:C.text,marginBottom:12 }}>✅ Munka ellenőrzése</p>
            {[
              {label:"VBF Jegyzőkönyv",ok:ell_vbfOk,info:"A VBF fülön töltsd ki"},
              {label:`Fotók (${ell_osszesFoto} db)`,ok:ell_osszesFoto>0,info:"Min. 1 fotó szükséges"},
              {label:"Megjegyzés megadva",ok:ell_megjegyzesMegvan,info:"Legalább egy karakter"},
              {label:"Fotó nélküli kategóriák indokolva",ok:ell_mindenKatOk||ell_hianyosKat.length===0,info:`${ell_hianyosKat.filter(k=>!fotoHianyOkok[k.id]).length} kategória indoklás hiányzik`},
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

          <button
            onClick={handleBefejezesKezdete}
            disabled={!lezarhatoE}
            style={{
              width:"100%",
              padding:"15px",
              borderRadius:12,
              border:"none",
              background:lezarhatoE?"#22C55E":"#CBD5E1",
              color:"#fff",
              fontWeight:700,
              fontSize:16,
              cursor:lezarhatoE?"pointer":"not-allowed",
              fontFamily:FONT,
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              gap:8
            }}
          >
            {lezarhatoE?"✅ Munka befejezése és lezárása":"🔒 Hiányos dokumentáció"}
          </button>

          {!lezarhatoE&&<p style={{ fontSize:12,color:"#DC2626",textAlign:"center",marginTop:8,fontWeight:600 }}>Piros jelölésű feltételek teljesítése szükséges.</p>}
        </div>
      )}

      {showAlairas&&<AlairasModal m={m} userRole="Telepítő" onClose={()=>setShowAlairas(false)} onSave={handleBefejezes}/>}
      {showLmra&&<LmraTelepltoView munkalap={m} currentUser={currentUser} onClose={() => { setShowLmra(false); doMegkezdes(); }} onComplete={handleLmraComplete} />}
    </div>
  );
}