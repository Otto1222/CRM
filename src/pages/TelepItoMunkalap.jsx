import { useState, useRef, useEffect, useCallback } from "react";
import {
  ArrowLeft, Camera, Save, AlertTriangle, CheckCircle2,
  X, FileText, Play, Phone, MapPin, Lock
} from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { updateItem, loadLocal, saveLocal } from "../lib/localDb";

// ─── Fotó kategóriák ───────────────────────────────────────
const FOTO_KAT = [
  { id:"ac_box",          nev:"AC box (fedéllel és fedél nélkül)",  leiras:"3 fotó: Megkötött állapotban fedél nélkül, Fedéllel és nyitott ajtóval, Fedéllel csukott ajtóval." },
  { id:"akkumulator",     nev:"Akkumulátor",                        leiras:"2 fotó: Elhelyezéséről, Bekötéséről" },
  { id:"akku_adattabla",  nev:"Akkumulátor adattábla",              leiras:"1 fotó: Olvasható adattábla+S/N" },
  { id:"csatl_pont",      nev:"Csatlakozási/rákötési pont",         leiras:"2 fotó: Megkötött állapotban fedél nélkül, fedéllel" },
  { id:"dc_box",          nev:"DC box (fedéllel és fedél nélkül)",  leiras:"3 fotó: Megkötött állapotban fedél nélkül, Fedéllel és nyitott ajtóval, Fedéllel csukott ajtóval." },
  { id:"eph_kotes",       nev:"EPH kötés",                          leiras:"Min. 1 fotó: Tartószerkezeti rákötés (több sor esetén több fotó!)" },
  { id:"egyeb_dok",       nev:"Egyéb dokumentáció",                 leiras:"Nyilatkozatok, fővállalkozói dokumentumok" },
  { id:"elrendezes",      nev:"Elrendezés+stringek",                leiras:"1 fotó: rajzolt elrendezés, rajzolt stringek, optimalizáló esetén QR-kódos elrendezéssel" },
  { id:"figyelm_tabla",   nev:"Figyelmeztető tábla",                leiras:"1 Fotó: Napelemes rendszer figyelmeztető tábláról" },
  { id:"fusterzekelő",    nev:"Füstérzékelő",                       leiras:"Egy fotó a füstérzékelőről felhelyezett állapotban." },
  { id:"inverter",        nev:"Inverter",                           leiras:"2 fotó: Szemből - látható bekötésekkel, szemből - védelmi berendezésekkel együtt" },
  { id:"inv_adattabla",   nev:"Inverter adattábla",                 leiras:"1 fotó: Olvasható adattábla" },
  { id:"inv_beallitas",   nev:"Inverter beállítások",               leiras:"Több fotó: Visszwatt, Smart mérő, akkumulátor, működési mód" },
  { id:"inv_mukodes",     nev:"Inverter működéséről",               leiras:"1 fotó: Rendszer élő termeléséről" },
  { id:"kabel_nyomvonal", nev:"Kábel nyomvonal (AC/DC)",            leiras:"Kábelhossz függvényeként több fotó is lehet." },
  { id:"matricak",        nev:"Matricák, feliratok",                 leiras:"min. 3 fotó: AC box, DC box, Csatlakozási pont címkézve" },
  { id:"meres_ellenorzes",nev:"Mérés ellenőrzése",                  leiras:"Az ingatlan fogyasztásmérésének ellenőrzése. (CT sorrendek, fázis sorrendek)" },
  { id:"merohelyrol",     nev:"Mérőhelyről",                        leiras:"3 fotó: Rendelkezésre álló teljesítményről, Mérőről, Teljes mérőhely" },
  { id:"napelemek",       nev:"Napelemek",                          leiras:"Min. 2 fotó: 2 irányból. Fő szempont, hogy minden panel számolható legyen!" },
  { id:"panel_sn",        nev:"Napelem SN számok",                   leiras:"Összes napelem szériaszáma olvashatóan fotózva." },
  { id:"optimalizalo",    nev:"Optimalizáló",                        leiras:"min. 1 fotó: Tigo - minden optimalizálóról panelra rögzítve, Huawei - tartószerkezetre rögzített állapotban!" },
  { id:"plant_letrehozas",nev:"Plant létrehozás",                   leiras:"1 fotó: Online állapotban látható a rendszer monitoringon keresztül." },
  { id:"palyazati_tabla", nev:"Pályázati tábla",                    leiras:"3 fotó: közvetlen közelről, 1-2 méterről, utca másik feléről" },
  { id:"smart_mero",      nev:"Smart mérő/mérés",                   leiras:"2 fotó: Mérés kialakítása, kommunikáció" },
  { id:"tartoszerkezet",  nev:"Tartószerkezet",                     leiras:"Min. 2 fotó: 2 irányból. Fő szempont, hogy a teljes szerkezet ellenőrizhető legyen." },
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

// ═══════════════════════════════════════════════════════════
// VBF INPUT – billentyűzet NEM tűnik el (uncontrolled + blur)
// ═══════════════════════════════════════════════════════════
function VbfInput({ value, onCommit, unit, piros }) {
  const [local, setLocal] = useState(value ?? "");
  // Szinkronizálás ha külső érték változik
  useEffect(() => { setLocal(value ?? ""); }, [value]);

  const empty = local === "" || local === null;
  return (
    <div style={{ display:"flex", alignItems:"center", flex:1, gap:8 }}>
      <input
        inputMode="decimal"
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => onCommit(local)}   // csak blur-kor menti → billentyűzet nem záródik be
        placeholder="0"
        style={{
          flex:1, padding:"10px 12px",
          border:`1.5px solid ${piros&&empty?"#EF4444":C.border}`,
          borderRadius:9, fontSize:16, fontFamily:FONT,
          color:C.text, outline:"none",
          background: piros&&empty?"#FEF2F2":"#F8FAFC",
        }}
      />
      <span style={{ width:44, fontSize:13, color:C.muted, textAlign:"right", flexShrink:0 }}>{unit}</span>
    </div>
  );
}

function MeroSor({ label, value, onCommit, unit, piros }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
      <span style={{ width:40, fontSize:14, color:C.textSub, flexShrink:0 }}>{label}</span>
      <VbfInput value={value} onCommit={onCommit} unit={unit} piros={piros}/>
    </div>
  );
}

function EgyMero({ label, value, onCommit, unit, piros }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
      <span style={{ flex:1, fontSize:14, color:C.textSub }}>{label}</span>
      <div style={{ width:180, display:"flex", alignItems:"center", gap:8 }}>
        <VbfInput value={value} onCommit={onCommit} unit={unit} piros={piros}/>
      </div>
    </div>
  );
}

function TextInput({ value, onCommit, piros, placeholder }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => { setLocal(value ?? ""); }, [value]);
  const empty = local === "";
  return (
    <input
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onCommit(local)}
      placeholder={placeholder || "0"}
      style={{
        width:"100%", padding:"10px 12px",
        border:`1.5px solid ${piros&&empty?"#EF4444":C.border}`,
        borderRadius:9, fontSize:14, fontFamily:FONT,
        color:C.text, outline:"none",
        background: piros&&empty?"#FEF2F2":"#F8FAFC",
      }}
    />
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

// ─── Fotó kártya ──────────────────────────────────────────
function FotoKartya({ kat, photos, onChange }) {
  const ref = useRef();
  function handleFiles(files) {
    const arr = Array.from(files).map((f,i) => {
      const ext = f.name.split(".").pop();
      const safe = kat.nev.replace(/[^a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g,"_").replace(/_+/g,"_");
      const newName = `${safe}_${photos.length+i+1}.${ext}`;
      return { originalName:f.name, name:newName, size:f.size, type:f.type, url:URL.createObjectURL(f) };
    });
    onChange([...photos, ...arr]);
  }
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
      <p style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{kat.nev}</p>
      <p style={{ fontSize:12, color:C.muted, marginBottom:10, lineHeight:1.5 }}>{kat.leiras}</p>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:13, color:photos.length>0?C.success:C.muted, fontWeight:600 }}>
          Munkalapon feltöltve: {photos.length} db
        </span>
        <button onClick={()=>ref.current?.click()} style={{ width:52, height:52, background:"#EFF6FF", border:`1.5px solid #93C5FD`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>
          <Camera size={24} color="#D97706"/>
        </button>
      </div>
      <input ref={ref} type="file" multiple accept="image/*,.pdf" style={{ display:"none" }} onChange={e=>handleFiles(e.target.files)}/>
      {photos.length>0&&(
        <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
          {photos.map((p,i)=>(
            <div key={i} style={{ position:"relative" }}>
              {p.url&&p.type?.startsWith("image") ? (
                <img src={p.url} alt={p.name} style={{ width:64, height:64, objectFit:"cover", borderRadius:8, border:`1px solid ${C.border}` }}/>
              ) : (
                <div style={{ width:64, height:64, background:C.bg, borderRadius:8, border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <FileText size={22} color={C.muted}/>
                </div>
              )}
              <button onClick={()=>onChange(photos.filter((_,j)=>j!==i))} style={{ position:"absolute", top:-4, right:-4, width:18, height:18, background:C.danger, border:"none", borderRadius:"50%", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <X size={10} color="#fff"/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FŐ KOMPONENS
// ═══════════════════════════════════════════════════════════
export default function TelepItoMunkalap({ m, data, onBack }) {
  const client    = data.ugyfelek?.find(u=>u.id===m.clientId);
  const clientNev = m.clientNev || client?.name || "";
  const clientCim = m.clientCim || client?.address || "";
  const clientTel = m.clientTel || client?.phone || "";

  // Befejezett munka → zárolt
  const lezart = m.status === "Befejezett";

  const [megkezdve, setMegkezdve] = useState(m.megkezdve || false);
  const [activeTab, setActiveTab] = useState(0);
  const [mentve,    setMentve]    = useState(false);
  const [figyelmeztet, setFigy]   = useState(false);

  // VBF – localStorage-ból
  const [vbf, setVbf] = useState(() => loadLocal(`vbf_${m.id}`) || VBF_TEMPLATE);

  // Fotók – localStorage-ból
  const [fotok, setFotok] = useState(() =>
    loadLocal(`fotok_${m.id}`) || Object.fromEntries(FOTO_KAT.map(k=>[k.id,[]]))
  );

  // VBF auto-mentés (csak blur után hívódik meg a commit, nem minden keystroke-ra)
  function saveVbf(newVbf) {
    saveLocal(`vbf_${m.id}`, newVbf);
  }

  function updVbf(section, field, val) {
    const newVbf = field
      ? { ...vbf, [section]:{ ...vbf[section], [field]:val } }
      : { ...vbf, [section]:val };
    setVbf(newVbf);
    saveVbf(newVbf);
  }

  // Fotók auto-mentés
  useEffect(() => {
    const toSave = Object.fromEntries(
      Object.entries(fotok).map(([k,v])=>[k, v.map(f=>({name:f.name,size:f.size,type:f.type,originalName:f.originalName}))])
    );
    saveLocal(`fotok_${m.id}`, toSave);
  }, [fotok, m.id]);

  function checkHianyos() {
    const flat = Object.values(vbf).flatMap(v => typeof v==="object"?Object.values(v):[v]);
    return flat.some(v => v===""||v===null||v===undefined);
  }

  // ── MEGKEZDÉS ────────────────────────────────────────────
  function handleMegkezdes() {
    const ts = new Date().toISOString();
    const updates = {
      megkezdve: true,
      megkezdesIdopont: ts,
      status: "Munkavégzés Folyamatban",
      statusSzin: "#2563EB",
    };
    updateItem("munkalapok", m.id, updates);
    setMegkezdve(true);
    setActiveTab(3);
  }

  // ── BEFEJEZÉS ────────────────────────────────────────────
  function handleBefejezes() {
    const ts = new Date().toISOString();
    const hianyos = checkHianyos();
    if (hianyos) { setFigy(true); return; }

    const updates = {
      status: "Befejezett",
      statusSzin: "#059669",
      befejezesIdopont: ts,
      lezarva: true,
    };
    updateItem("munkalapok", m.id, updates);
    setMentve(true);
    setTimeout(()=>onBack(), 1500);
  }

  // ── VBF mentés gomb ───────────────────────────────────────
  function handleVbfMentes() {
    const hianyos = checkHianyos();
    if (hianyos) { setFigy(true); return; }
    setFigy(false);
    saveVbf(vbf);
    setMentve(true);
    setTimeout(()=>setMentve(false), 2000);
  }

  const TABS_BEFORE = [
    { icon:"📄" },{ icon:"📦" },{ icon:"📋" },
  ];
  const TABS_AFTER = [
    { icon:"📄" },{ icon:"📦" },{ icon:"📋" },
    { icon:"⚙️" },{ icon:"📐" },{ icon:"📷" },{ icon:"✅" },
  ];
  const TABS = megkezdve ? TABS_AFTER : TABS_BEFORE;

  // ── LEZÁRT BANNER ────────────────────────────────────────
  if (lezart) {
    return (
      <div style={{ minHeight:"100vh", background:"#F1F5F9", fontFamily:FONT }}>
        <div style={{ background:"#2C4A6E", padding:"44px 16px 16px" }}>
          <button onClick={onBack} style={{ border:"none", background:"none", color:"#94A3B8", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:13, fontFamily:FONT, fontWeight:600 }}>
            <ArrowLeft size={18}/> Feladatok
          </button>
          <p style={{ fontWeight:800, fontSize:16, color:"#fff", marginTop:8 }}>{m.id}</p>
          <p style={{ fontWeight:700, fontSize:15, color:"#fff" }}>{clientNev}</p>
          <p style={{ fontSize:12, color:"#94A3B8" }}>{clientCim}</p>
        </div>
        <div style={{ padding:24, textAlign:"center" }}>
          <Lock size={48} color={C.muted} style={{ opacity:.3, display:"block", margin:"0 auto 16px" }}/>
          <p style={{ fontWeight:700, fontSize:18, color:C.text, marginBottom:8 }}>Munka lezárva</p>
          <p style={{ fontSize:14, color:C.muted, marginBottom:8 }}>
            Befejezve: {m.befejezesIdopont ? new Date(m.befejezesIdopont).toLocaleString("hu-HU") : "—"}
          </p>
          <p style={{ fontSize:13, color:C.muted }}>A munka módosításához lépj be Admin vagy Projektmenedzser fiókkal.</p>
        </div>
      </div>
    );
  }

  // ── FEJLÉC ────────────────────────────────────────────────
  const Header = () => (
    <div style={{ background:"#2C4A6E" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"44px 16px 8px" }}>
        <button onClick={onBack} style={{ border:"none", background:"none", color:"#94A3B8", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:13, fontFamily:FONT, fontWeight:600 }}>
          <ArrowLeft size={18}/> Feladatok
        </button>
        <span style={{ fontWeight:800, fontSize:14, color:"#fff", flex:1 }}>{m.id}</span>
        {m.cimke&&<span style={{ background:m.cimkeSzin||C.accent, color:"#fff", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>{m.cimke}</span>}
        {mentve&&<CheckCircle2 size={20} color="#22C55E"/>}
      </div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 16px 14px" }}>
        <div>
          <p style={{ fontWeight:700, fontSize:16, color:"#fff" }}>{clientNev}</p>
          <p style={{ fontSize:12, color:"#94A3B8" }}>{clientCim}</p>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          {clientTel&&<a href={`tel:${clientTel}`} style={{ color:"#4ADE80" }}><Phone size={22}/></a>}
          {clientCim&&<a href={`https://maps.google.com/?q=${encodeURIComponent(clientCim)}`} target="_blank" rel="noreferrer" style={{ color:"#60A5FA" }}><MapPin size={22}/></a>}
        </div>
      </div>
    </div>
  );

  const TabSav = () => (
    <div style={{ display:"flex", background:"#2C4A6E", overflowX:"auto" }}>
      {TABS.map((t,i)=>(
        <button key={i} onClick={()=>setActiveTab(i)} style={{ flex:1, padding:"12px 4px", border:"none", background:"transparent", color:activeTab===i?"#fff":"#94A3B8", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", borderBottom:activeTab===i?"3px solid #fff":"3px solid transparent", fontFamily:FONT, minWidth:44, fontSize:20 }}>
          {t.icon}
        </button>
      ))}
    </div>
  );

  // ── INFÓK TAB ─────────────────────────────────────────────
  const InfoTab = () => {
    const FR = ({label,value}) => value ? (
      <div>
        <p style={{ fontSize:12, color:"#64748B", paddingTop:8, marginBottom:3 }}>{label}</p>
        <div style={{ background:"#E8EDF5", borderRadius:6, padding:"9px 12px", fontSize:14, color:C.text }}>{value}</div>
      </div>
    ) : null;
    return (
      <div style={{ padding:"0 16px 16px", background:"#F1F5F9" }}>
        <FR label="Projekt megnevezés" value={m.projektMegnevezes}/>
        <FR label="Feladat" value={m.feladat}/>
        <FR label="Ügyszám" value={m.ugyszam}/>
        <FR label="Kapcsolattartó" value={clientNev}/>
        <FR label="Telefonszám" value={clientTel}/>
        <FR label="E-mail cím" value={m.clientEmail||client?.email}/>
        <FR label="Értékesítő" value={m.ertekesito}/>

        {/* Időbélyegek */}
        {m.megkezdesIdopont && (
          <div style={{ marginTop:12, padding:"10px 14px", background:"#EFF6FF", border:`1px solid #BFDBFE`, borderRadius:10, fontSize:13, color:C.accent }}>
            ▶️ Megkezdve: <b>{new Date(m.megkezdesIdopont).toLocaleString("hu-HU")}</b>
          </div>
        )}

        {!megkezdve ? (
          <div style={{ marginTop:20 }}>
            <button
              onClick={handleMegkezdes}
              style={{ width:"100%", padding:"15px", borderRadius:12, border:"none", background:"#22C55E", color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT }}
            >
              <Play size={20}/> Megkezdés →
            </button>
          </div>
        ) : (
          <div style={{ marginTop:12, padding:"10px 14px", background:"#ECFDF5", border:`1px solid #A7F3D0`, borderRadius:10, fontSize:13, color:C.success, fontWeight:600 }}>
            ✅ Munka folyamatban — töltsd ki a VBF és fotók tabokat!
          </div>
        )}
      </div>
    );
  };

  // ── ANYAGOK TAB ───────────────────────────────────────────
  const AnyagokTab = () => (
    <div style={{ background:"#F1F5F9" }}>
      {(m.anyagok||[]).length===0&&<div style={{ padding:"32px 16px", textAlign:"center", color:C.muted }}><p>Nincsenek anyagok</p></div>}
      {(m.anyagok||[]).map((a,i)=>(
        <div key={i} style={{ padding:"13px 16px", borderBottom:"1px solid #D1D9E6", display:"flex", justifyContent:"space-between" }}>
          <p style={{ fontWeight:600, fontSize:14, color:C.text, flex:1, paddingRight:16 }}>{a.nev}</p>
          <p style={{ fontWeight:700, fontSize:14, color:C.text, whiteSpace:"nowrap" }}>{a.menny} {a.egyseg}</p>
        </div>
      ))}
    </div>
  );

  // ── FELMÉRÉS TAB ──────────────────────────────────────────
  const FelmeresTab = () => {
    const f = m.felmeres||{};
    const mezok = [
      ["Csatlakozási pont",f.csatlakozasiPont],["Csatl. pont állapota",f.csatlPontAllapota],
      ["AC kábel hossz (m)",f.acKabelHossz],["AC védelem típus",f.acVedelem],
      ["Inverter fal",f.inverterFal],["Akkumulátor fal",f.akkuFal],
      ["Tető típus",f.tetoTipus],["Tetőszerkezet",f.tetoszerkezetTipus],
      ["Padlás",f.padlas],["Villámhárító",f.villamharitor],
      ["Tartószerkezet",f.tartoszerkezetTipus],["DC kábel hossz (m)",f.dcKabelHossz],
      ["DC védelem",f.dcVedelem],["Tűzeseti kapcsoló",f.tuzKapcsolo],
      ["Panel elrendezés",f.panelElrendezes],["Felhordó eszköz",f.felhordoEszkoz],
      ["Megközelíthetőség",f.megkozelithetoseg],
    ].filter(([,v])=>v!==undefined&&v!=="");
    return (
      <div style={{ background:"#F1F5F9" }}>
        {mezok.length===0&&<div style={{ padding:"32px 16px", textAlign:"center", color:C.muted }}><p>Nincs felmérés adat</p></div>}
        {mezok.map(([label,value])=>(
          <div key={label} style={{ padding:"0 16px" }}>
            <p style={{ fontSize:12, color:"#64748B", paddingTop:8, marginBottom:3 }}>{label}</p>
            <div style={{ background:"#E8EDF5", borderRadius:6, padding:"9px 12px", fontSize:14, color:C.text, borderBottom:"1px solid #D1D9E6" }}>{String(value)}</div>
          </div>
        ))}
      </div>
    );
  };

  // ── SZERELÉS TAB (4.) – üres egyelőre ────────────────────
  const SzerelesTab = () => (
    <div style={{ padding:"24px 16px", background:"#F1F5F9" }}>
      <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:20, textAlign:"center" }}>
        <p style={{ fontSize:14, color:C.muted }}>Ez a szekció hamarosan elérhető lesz.</p>
      </div>
    </div>
  );

  // ── VBF TAB (5.) ──────────────────────────────────────────
  const VbfTab = () => (
    <div style={{ padding:"16px", background:"#F1F5F9" }}>
      {figyelmeztet && (
        <div style={{ background:"#FEF2F2", border:`1px solid #FECACA`, borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:C.danger, display:"flex", alignItems:"center", gap:8 }}>
          <AlertTriangle size={16}/> Hiányos mezők! Írj "0"-t ahol nulla az érték.
        </div>
      )}

      <MeroSzakasz title="AC feszültség">
        {["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.acFeszultseg[l]} onCommit={v=>updVbf("acFeszultseg",l,v)} unit="V" piros={figyelmeztet}/>)}
      </MeroSzakasz>

      <MeroSzakasz title="Kismegszakító értéke inverternél">
        {["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.kismegsInverter[l]} onCommit={v=>updVbf("kismegsInverter",l,v)} unit="A" piros={figyelmeztet}/>)}
      </MeroSzakasz>

      <MeroSzakasz title="Kismegszakító értéke mérőhelynél">
        {["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.kismegsMero[l]} onCommit={v=>updVbf("kismegsMero",l,v)} unit="A" piros={figyelmeztet}/>)}
      </MeroSzakasz>

      <MeroSzakasz title="Panelszám">
        {["ST1","ST2","ST3","ST4","ST5","ST6"].map(s=><MeroSor key={s} label={s} value={vbf.panelszam[s]} onCommit={v=>updVbf("panelszam",s,v)} unit="db" piros={figyelmeztet}/>)}
      </MeroSzakasz>

      <MeroSzakasz title="DC feszültség">
        {["ST1","ST2","ST3","ST4","ST5","ST6"].map(s=><MeroSor key={s} label={s} value={vbf.dcFeszultseg[s]} onCommit={v=>updVbf("dcFeszultseg",s,v)} unit="V" piros={figyelmeztet}/>)}
      </MeroSzakasz>

      <MeroSzakasz title="Hurokellenállás">
        {["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.hurokellenallas[l]} onCommit={v=>updVbf("hurokellenallas",l,v)} unit="MOhm" piros={figyelmeztet}/>)}
      </MeroSzakasz>

      <MeroSzakasz title="">
        <EgyMero label="Smart meter" value={vbf.smartMeter} onCommit={v=>updVbf("smartMeter",null,v)} unit="DB" piros={figyelmeztet}/>
        <EgyMero label="AKKU" value={vbf.akku} onCommit={v=>updVbf("akku",null,v)} unit="DB" piros={figyelmeztet}/>
      </MeroSzakasz>

      <MeroSzakasz title="Betáplált DC teljesítmény">
        <EgyMero label="Betáplált DC" value={vbf.betapaltDC} onCommit={v=>updVbf("betapaltDC",null,v)} unit="Wp" piros={figyelmeztet}/>
      </MeroSzakasz>

      <MeroSzakasz title="Panel pontos adatok">
        <div style={{ marginBottom:12 }}>
          <p style={{ fontSize:13, color:C.muted, marginBottom:6 }}>Típusa</p>
          <TextInput value={vbf.panelTipus} onCommit={v=>updVbf("panelTipus",null,v)} piros={figyelmeztet} placeholder="Panel típusa"/>
        </div>
        <MeroSor label="Voc"   value={vbf.panelVoc}  onCommit={v=>updVbf("panelVoc",null,v)}  unit="V"  piros={figyelmeztet}/>
        <MeroSor label="Vmp"   value={vbf.panelVmp}  onCommit={v=>updVbf("panelVmp",null,v)}  unit="V"  piros={figyelmeztet}/>
        <MeroSor label="Imp"   value={vbf.panelImp}  onCommit={v=>updVbf("panelImp",null,v)}  unit="A"  piros={figyelmeztet}/>
        <MeroSor label="Isc"   value={vbf.panelIsc}  onCommit={v=>updVbf("panelIsc",null,v)}  unit="A"  piros={figyelmeztet}/>
        <MeroSor label="Telj." value={vbf.panelTelj} onCommit={v=>updVbf("panelTelj",null,v)} unit="Wp" piros={figyelmeztet}/>
      </MeroSzakasz>

      <MeroSzakasz title="Inverter pontos adatok">
        <EgyMero label="Névleges teljesítménye" value={vbf.inverterNevleges} onCommit={v=>updVbf("inverterNevleges",null,v)} unit="kVA" piros={figyelmeztet}/>
      </MeroSzakasz>

      <MeroSzakasz title="Tűzeseti adatok">
        <EgyMero label="Megszakító értéke" value={vbf.tuzMegszakito} onCommit={v=>updVbf("tuzMegszakito",null,v)} unit="A" piros={figyelmeztet}/>
      </MeroSzakasz>

      <button onClick={handleVbfMentes} style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", background:C.accent, color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT, marginTop:8, marginBottom:32 }}>
        <Save size={18}/>VBF mentése
      </button>
    </div>
  );

  // ── FOTÓK TAB (6.) ────────────────────────────────────────
  const FotokTab = () => (
    <div style={{ padding:"16px", background:"#F1F5F9" }}>
      <p style={{ fontSize:13, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
        Minden fotót a megadott kategóriába töltsd fel. A képek automatikusan a kategória nevét kapják.
      </p>
      {FOTO_KAT.map(kat=>(
        <FotoKartya key={kat.id} kat={kat} photos={fotok[kat.id]||[]} onChange={v=>setFotok(p=>({...p,[kat.id]:v}))}/>
      ))}
    </div>
  );

  // ── ELLENŐRZÉS TAB (7.) ───────────────────────────────────
  const EllenorzesTab = () => {
    const vbfOk = !checkHianyos();
    const osszesFoto = Object.values(fotok).reduce((s,a)=>s+(a.length||0),0);
    const mindenKatFoto = FOTO_KAT.every(k=>(fotok[k.id]||[]).length>0);
    return (
      <div style={{ padding:"16px", background:"#F1F5F9" }}>
        <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:16 }}>
          <p style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:12 }}>Munka ellenőrzése</p>
          {[
            { label:"VBF Jegyzőkönyv kitöltve", ok:vbfOk },
            { label:`Fotók feltöltve (${osszesFoto} db)`, ok:osszesFoto>0 },
            { label:"Minden fotó kategória feltöltve", ok:mindenKatFoto },
          ].map(item=>(
            <div key={item.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
              {item.ok?<CheckCircle2 size={20} color={C.success}/>:<AlertTriangle size={20} color={C.warning}/>}
              <span style={{ fontSize:14, color:item.ok?C.success:C.warning, fontWeight:item.ok?600:400 }}>{item.label}</span>
            </div>
          ))}
        </div>

        {figyelmeztet && (
          <div style={{ background:"#FEF2F2", border:`1px solid #FECACA`, borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:C.danger }}>
            ⚠️ A VBF Jegyzőkönyv hiányos! Töltsd ki az összes mezőt (0-t is kell írni ha nulla).
          </div>
        )}

        <button
          onClick={handleBefejezes}
          style={{ width:"100%", padding:"15px", borderRadius:12, border:"none", background:C.success, color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer", fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}
        >
          ✅ Munka befejezése
        </button>

        {mentve&&(
          <div style={{ marginTop:12, padding:"12px", background:"#ECFDF5", borderRadius:10, textAlign:"center", fontSize:14, color:C.success, fontWeight:600 }}>
            ✅ Munka lezárva! Visszatérés a feladatokhoz...
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9", fontFamily:FONT }}>
      <Header/>
      <TabSav/>
      {activeTab===0 && <InfoTab/>}
      {activeTab===1 && <AnyagokTab/>}
      {activeTab===2 && <FelmeresTab/>}
      {megkezdve && activeTab===3 && <SzerelesTab/>}
      {megkezdve && activeTab===4 && <VbfTab/>}
      {megkezdve && activeTab===5 && <FotokTab/>}
      {megkezdve && activeTab===6 && <EllenorzesTab/>}
    </div>
  );
}
