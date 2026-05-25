import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft, Camera, Gauge, ClipboardList, FileText,
  Save, AlertTriangle, CheckCircle2, Upload, X, Loader2,
  Phone, MapPin, Play
} from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { updateItem, loadLocal } from "../lib/localDb";

// ─── Mérési adatok struktúrája ─────────────────────────────
const VBF_TEMPLATE = {
  acFeszultseg:      { L1:"", L2:"", L3:"" },
  kismegsInverter:   { L1:"", L2:"", L3:"" },
  kismegsMero:       { L1:"", L2:"", L3:"" },
  panelszam:         { ST1:"", ST2:"", ST3:"", ST4:"", ST5:"", ST6:"" },
  dcFeszultseg:      { ST1:"", ST2:"", ST3:"", ST4:"", ST5:"", ST6:"" },
  hurokellenallas:   { L1:"", L2:"", L3:"" },
  smartMeter:        "",
  akku:              "",
  betapaltDC:        "",
  panelTipus:        "",
  panelVoc:          "",
  panelVmp:          "",
  panelImp:          "",
  panelIsc:          "",
  panelTelj:         "",
  inverterNevleges:  "",
  tuzMegszakito:     "",
};

// ─── Fotó kategóriák ───────────────────────────────────────
const FOTO_KAT = [
  { id:"ac_box",          nev:"AC box (fedéllel és fedél nélkül)",  leiras:"3 fotó: Megkötött állapotban fedél nélkül, Fedéllel és nyitott ajtóval, Fedéllel csukott ajtóval." },
  { id:"akkumulator",     nev:"Akkumulátor",                        leiras:"2 fotó: Elhelyezéséről, Bekötéséről" },
  { id:"akku_adattabla",  nev:"Akkumulátor adattábla",              leiras:"1 fotó: Olvasható adattábla+S/N" },
  { id:"csatl_pont",      nev:"Csatlakozási/rákötési pont",         leiras:"2 fotó: Megkötött állapotban fedél nélkül, fedéllel" },
  { id:"dc_box",          nev:"DC box (fedéllel és fedél nélkül)",  leiras:"3 fotó: Megkötött állapotban fedél nélkül, Fedéllel és nyitott ajtóval, Fedéllel csukott ajtóval." },
  { id:"eph_kotes",       nev:"EPH kötés",                          leiras:"Min. 1 fotó: Tartószerkezeti rákötés (több sor esetén több fotó!)" },
  { id:"egyeb_dok",       nev:"Egyéb dokumentáció",                 leiras:"Nyilatkozatok, fővállalkozói dokumentumok" },
  { id:"elrendezes",      nev:"Elrendezés+stringek",                leiras:"1 fotó: rajzolt elrendezés, rajzolt stringek, optimalizáló esetén QR-kódos címke elrendezéssel" },
  { id:"figyelm_tabla",   nev:"Figyelmeztető tábla",                leiras:"1 Fotó: Napelemes rendszer figyelmeztető tábláról" },
  { id:"fusterzekelő",    nev:"Füstérzékelő",                       leiras:"Egy fotó a füstérzékelőről felhelyezett állapotban." },
  { id:"inverter",        nev:"Inverter",                           leiras:"2 fotó: Szemből - látható bekötésekkel (pl. string mennyiség, eph), szemből - védelmi berendezésekkel együtt" },
  { id:"inv_adattabla",   nev:"Inverter adattábla",                 leiras:"1 fotó: Olvasható adattábla" },
  { id:"inv_beallitas",   nev:"Inverter beállítások",               leiras:"Több fotó is lehet: Visszwatt, Smart mérő, akkumulátor, működési mód" },
  { id:"inv_mukodes",     nev:"Inverter működéséről",               leiras:"1 fotó: Rendszer élő termeléséről (telefonnal local csatlakozással, vagy kijelzőről)" },
  { id:"kabel_nyomvonal", nev:"Kábel nyomvonal (AC/DC)",            leiras:"Kábelhossz függvényeként több fotó is lehet." },
  { id:"matricak",        nev:"Matricák, feliratok",                 leiras:"min. 3 fotó: AC box címkézve, DC box címkézve, Csatlakozási pont címkézve" },
  { id:"meres_ellenorzes",nev:"Mérés ellenőrzése",                  leiras:"Az ingatlan fogyasztásmérésének ellenőrzése. (CT sorrendek, fázis sorrendek) - Fotókkal dokumentálva." },
  { id:"merohelyrol",     nev:"Mérőhelyről",                        leiras:"3 fotó: Rendelkezésre álló teljesítményről (közeli), Mérőről (olvasható azonosítóval), Teljes mérőhely" },
  { id:"napelemek",       nev:"Napelemek",                          leiras:"Min. 2 fotó: 2 irányból készített fotók, Több különálló mező esetén több fotó! Fő szempont, hogy minden panel számolható legyen!" },
  { id:"panel_sn",        nev:"Napelem SN számok",                   leiras:"Összes napelem szériaszáma olvashatóan fotózva." },
  { id:"optimalizalo",    nev:"Optimalizáló",                        leiras:"min. 1 fotó: Tigo Optimalizáló esetén minden optimalizálóról panelra rögzítve, Huawei esetén pedig tartószerkezetre rögzített állapotban!" },
  { id:"plant_letrehozas",nev:"Plant létrehozás",                   leiras:"1 fotó: Online állapotban látható a rendszer monitoringon keresztül." },
  { id:"palyazati_tabla", nev:"Pályázati tábla",                    leiras:"3 fotó: közvetlen közelről (rögzítések jól látható módon), 1-2 méterről, utca másik feléről (takarásmentes, jól látható)" },
  { id:"smart_mero",      nev:"Smart mérő/mérés",                   leiras:"2 fotó: Mérés kialakítása (megfelelő irányokban), kommunikáció" },
  { id:"tartoszerkezet",  nev:"Tartószerkezet",                     leiras:"Min. 2 fotó: 2 irányból készített fotók, Több különálló mező esetén több fotó! Fő szempont, hogy a teljes szerkezet ellenőrizhető legyen." },
  { id:"teto_kivezetes",  nev:"Tető kivezetés",                     leiras:"1 fotó: Kábelkivezetés a tetőre (pl. szellőzőcserépen keresztül)" },
  { id:"tuz_levalaszto",  nev:"Tűzeseti leválasztó",                leiras:"1 fotó: Megkötött tűzeseti leválasztó." },
  { id:"wifi_stick",      nev:"Wifi Stick",                         leiras:"1 fotó: Olvasható adatokkal" },
  { id:"wifi_beallitas",  nev:"Wifi beállítás",                     leiras:"1. fotó: Sikeres wifi beállításról" },
];

// ─── Mező egységek ─────────────────────────────────────────
const UNIT = { V:"V", A:"A", MOhm:"MOhm", db:"db", DB:"DB", Wp:"Wp", kVA:"kVA" };

// ─── Segéd: mérési sor ─────────────────────────────────────
function MeroSor({ label, value, onChange, unit, piros }) {
  const ures = value === "" || value === null || value === undefined;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
      <span style={{ width:44, fontSize:14, color:C.textSub, flexShrink:0 }}>{label}</span>
      <input
        type="number"
        value={value||""}
        onChange={e => onChange(e.target.value)}
        placeholder="0"
        style={{
          flex:1, padding:"10px 12px",
          border:`1.5px solid ${piros&&ures?"#EF4444":C.border}`,
          borderRadius:9, fontSize:14, fontFamily:FONT,
          color:C.text, outline:"none", background: piros&&ures?"#FEF2F2":"#F8FAFC",
        }}
      />
      <span style={{ width:40, fontSize:13, color:C.muted, textAlign:"right", flexShrink:0 }}>{unit}</span>
    </div>
  );
}

function MeroSzakasz({ title, children }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
      <p style={{ fontSize:13, fontWeight:700, color:C.textSub, marginBottom:12, borderBottom:`1px solid ${C.border}`, paddingBottom:8 }}>{title}</p>
      {children}
    </div>
  );
}

// ─── Egyetlen mező ─────────────────────────────────────────
function EgyMero({ label, value, onChange, unit, piros }) {
  const ures = value === "" || value === null || value === undefined;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
      <span style={{ flex:1, fontSize:14, color:C.textSub }}>{label}</span>
      <input
        type="number"
        value={value||""}
        onChange={e=>onChange(e.target.value)}
        placeholder="0"
        style={{
          width:120, padding:"10px 12px",
          border:`1.5px solid ${piros&&ures?"#EF4444":C.border}`,
          borderRadius:9, fontSize:14, fontFamily:FONT,
          color:C.text, outline:"none", background: piros&&ures?"#FEF2F2":"#F8FAFC",
        }}
      />
      <span style={{ width:36, fontSize:13, color:C.muted, textAlign:"right", flexShrink:0 }}>{unit}</span>
    </div>
  );
}

// ─── Fotó feltöltő kártya ──────────────────────────────────
function FotoKartya({ kat, photos, onChange }) {
  const ref = useRef();
  function handleFiles(files) {
    const arr = Array.from(files).map((f,i) => {
      // Átnevezés: kategória neve + sorszám
      const ext = f.name.split(".").pop();
      const newName = `${kat.nev.replace(/[^a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ ]/g,"_")}_${(photos.length+i+1)}.${ext}`;
      return { originalName:f.name, name:newName, size:f.size, type:f.type, url:URL.createObjectURL(f) };
    });
    onChange([...photos, ...arr]);
  }
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
      <p style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:4 }}>{kat.nev}</p>
      <p style={{ fontSize:12, color:C.muted, marginBottom:12, lineHeight:1.5 }}>{kat.leiras}</p>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:13, color:photos.length>0?C.success:C.muted, fontWeight:600 }}>
          Munkalapon feltöltve: {photos.length} db
        </span>
        <button
          onClick={()=>ref.current?.click()}
          style={{ width:52, height:52, background:"#EFF6FF", border:`1.5px solid ${C.accent}30`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}
        >
          <Camera size={24} color="#D97706" />
        </button>
      </div>
      <input ref={ref} type="file" multiple accept="image/*,.pdf" style={{ display:"none" }} onChange={e=>handleFiles(e.target.files)} />
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
  const client = data.ugyfelek?.find(u=>u.id===m.clientId);
  const clientNev = m.clientNev || client?.name || "";
  const clientCim = m.clientCim || client?.address || "";

  // ── Állapot ──────────────────────────────────────────────
  const [megkezdve, setMegkezdve] = useState(m.megkezdve || false);
  const [activeTab, setActiveTab]  = useState(0);
  const [mentve,    setMentve]     = useState(false);
  const [figyelmeztet, setFigy]    = useState(false);

  // VBF adatok
  const [vbf, setVbf] = useState(() => {
    const saved = loadLocal(`vbf_${m.id}`);
    return saved || VBF_TEMPLATE;
  });

  // Fotók
  const [fotok, setFotok] = useState(() => {
    const saved = loadLocal(`fotok_${m.id}`);
    return saved || Object.fromEntries(FOTO_KAT.map(k=>[k.id,[]]));
  });

  // Auto-mentés VBF változáskor
  useEffect(() => {
    localStorage.setItem(`crm_vbf_${m.id}`, JSON.stringify(vbf));
  }, [vbf, m.id]);

  // Auto-mentés fotók változáskor
  useEffect(() => {
    // Fotókat URL nélkül mentjük (URL nem serializálható)
    const toSave = Object.fromEntries(
      Object.entries(fotok).map(([k,v])=>[k, v.map(f=>({name:f.name,size:f.size,type:f.type,originalName:f.originalName}))])
    );
    localStorage.setItem(`crm_fotok_${m.id}`, JSON.stringify(toSave));
  }, [fotok, m.id]);

  function updVbf(section, field, val) {
    if (field) {
      setVbf(p=>({...p,[section]:{...p[section],[field]:val}}));
    } else {
      setVbf(p=>({...p,[section]:val}));
    }
  }

  function checkHianyos() {
    // Ellenőriz: minden mező kitöltött-e (0 is elfogadható, "" nem)
    const flat = Object.values(vbf).flatMap(v =>
      typeof v === "object" ? Object.values(v) : [v]
    );
    return flat.some(v => v === "" || v === null || v === undefined);
  }

  async function mentes() {
    const hianyos = checkHianyos();
    if (hianyos) { setFigy(true); return; }
    setFigy(false);

    // Munkalap frissítése
    const updates = { vbf, megkezdve:true, status:"Folyamatban", statusSzin:"#2563EB" };
    updateItem("munkalapok", m.id, updates);

    setMentve(true);
    setTimeout(()=>setMentve(false), 2500);
  }

  // ── Tab definíciók ────────────────────────────────────────
  const TABS_BEFORE = [
    { icon:"📄", label:"Infók" },
    { icon:"📦", label:"Anyagok" },
    { icon:"📋", label:"Felmérés" },
  ];

  const TABS_AFTER = [
    { icon:"📄", label:"Infók" },
    { icon:"📦", label:"Anyagok" },
    { icon:"📋", label:"Felmérés" },
    { icon:"⚙️", label:"Szerelés" },
    { icon:"📐", label:"VBF" },       // mérőműszer
    { icon:"📷", label:"Fotók" },    // fényképező
    { icon:"✅", label:"Ellenőrzés" },
  ];

  const TABS = megkezdve ? TABS_AFTER : TABS_BEFORE;

  // ── Fejléc ────────────────────────────────────────────────
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
          {client?.phone&&<a href={`tel:${client.phone||m.clientTel}`} style={{ color:"#4ADE80" }}><Phone size={22}/></a>}
          {clientCim&&<a href={`https://maps.google.com/?q=${encodeURIComponent(clientCim)}`} target="_blank" rel="noreferrer" style={{ color:"#60A5FA" }}><MapPin size={22}/></a>}
        </div>
      </div>
    </div>
  );

  // ── Tab sáv ───────────────────────────────────────────────
  const TabSav = () => (
    <div style={{ display:"flex", background:"#2C4A6E", overflowX:"auto" }}>
      {TABS.map((t,i)=>(
        <button key={i} onClick={()=>setActiveTab(i)} style={{ flex:1, padding:"11px 4px", border:"none", background:"transparent", color:activeTab===i?"#fff":"#94A3B8", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:1, borderBottom:activeTab===i?"3px solid #fff":"3px solid transparent", fontFamily:FONT, minWidth:44, fontSize:18 }}>
          {t.icon}
        </button>
      ))}
    </div>
  );

  // ── Infók tab ─────────────────────────────────────────────
  const InfoTab = () => {
    const FR = ({label,value}) => value ? (
      <div style={{ padding:"0 0 2px" }}>
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
        <FR label="Telefonszám" value={m.clientTel||client?.phone}/>
        <FR label="E-mail cím" value={m.clientEmail||client?.email}/>
        <FR label="Értékesítő" value={m.ertekesito}/>

        {!megkezdve && (
          <div style={{ marginTop:20 }}>
            <button
              onClick={()=>{ setMegkezdve(true); updateItem("munkalapok",m.id,{megkezdve:true,status:"Folyamatban",statusSzin:"#2563EB"}); setActiveTab(3); }}
              style={{ width:"100%", padding:"15px", borderRadius:12, border:"none", background:"#22C55E", color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT }}
            >
              <Play size={20}/> Megkezdés →
            </button>
          </div>
        )}
        {megkezdve && (
          <div style={{ marginTop:12, padding:"10px 14px", background:"#ECFDF5", border:`1px solid #A7F3D0`, borderRadius:10, fontSize:13, color:C.success, fontWeight:600 }}>
            ✅ Munka megkezdve — töltsd ki a VBF és fotók tabokat!
          </div>
        )}
      </div>
    );
  };

  // ── Anyagok tab ───────────────────────────────────────────
  const AnyagokTab = () => (
    <div style={{ background:"#F1F5F9" }}>
      {(m.anyagok||[]).length === 0 && <div style={{ padding:"32px 16px", textAlign:"center", color:C.muted }}><p>Nincsenek anyagok</p></div>}
      {(m.anyagok||[]).map((a,i)=>(
        <div key={i} style={{ padding:"13px 16px", borderBottom:"1px solid #D1D9E6", display:"flex", justifyContent:"space-between" }}>
          <p style={{ fontWeight:600, fontSize:14, color:C.text, flex:1, paddingRight:16 }}>{a.nev}</p>
          <p style={{ fontWeight:700, fontSize:14, color:C.text, whiteSpace:"nowrap" }}>{a.menny} {a.egyseg}</p>
        </div>
      ))}
    </div>
  );

  // ── Felmérés tab ──────────────────────────────────────────
  const FelmeresTab = () => {
    const f = m.felmeres||{};
    const mezok = [
      ["Csatlakozási pont",f.csatlakozasiPont],["Csatl. pont állapota",f.csatlPontAllapota],
      ["AC kábel hossz (m)",f.acKabelHossz],["AC védelem típus",f.acVedelem],
      ["Inverter fal",f.inverterFal],["Akkumulátor fal",f.akkuFal],
      ["Tető típus",f.tetoTipus],["Tetőszerkezet típus",f.tetoszerkezetTipus],
      ["Padlás",f.padlas],["Villámhárító",f.villamharitor],
      ["Tartószerkezet típus",f.tartoszerkezetTipus],
      ["DC kábel hossz (m)",f.dcKabelHossz],["DC védelem típus",f.dcVedelem],
      ["Tűzeseti kapcsoló",f.tuzKapcsolo],["Panel elrendezés",f.panelElrendezes],
      ["Felhordó eszköz",f.felhordoEszkoz],["Engedélyeztetés",f.engedelyeztetes],
      ["Visszwatt védelem",f.visszwatt],["Megközelíthetőség",f.megkozelithetoseg],
    ].filter(([,v])=>v!==undefined&&v!=="");
    return (
      <div style={{ background:"#F1F5F9" }}>
        {mezok.length===0 && <div style={{ padding:"32px 16px", textAlign:"center", color:C.muted }}><p>Felmérés adatok nincsenek</p></div>}
        {mezok.map(([label,value])=>(
          <div key={label} style={{ padding:"0 16px" }}>
            <p style={{ fontSize:12, color:"#64748B", paddingTop:8, marginBottom:3 }}>{label}</p>
            <div style={{ background:"#E8EDF5", borderRadius:6, padding:"9px 12px", fontSize:14, color:C.text, borderBottom:"1px solid #D1D9E6" }}>{String(value)}</div>
          </div>
        ))}
      </div>
    );
  };

  // ── Szerelés tab (4.) ──────────────────────────────────────
  const SzerelesTab = () => (
    <div style={{ padding:"16px", background:"#F1F5F9" }}>
      <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
        <p style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:8 }}>Munka státusza</p>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {["Megkezdésre Vár","Folyamatban","Kész","Meghiúsult"].map(s=>(
            <button key={s} onClick={()=>updateItem("munkalapok",m.id,{status:s})} style={{ padding:"8px 14px", borderRadius:9, border:`1px solid ${m.status===s?C.accent:C.border}`, background:m.status===s?C.accentLight:"#fff", color:m.status===s?C.accent:C.textSub, fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:FONT }}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ── VBF Jegyzőkönyv tab (5.) ──────────────────────────────
  const VbfTab = () => (
    <div style={{ padding:"16px", background:"#F1F5F9" }}>
      {figyelmeztet && (
        <div style={{ background:"#FEF2F2", border:`1px solid #FECACA`, borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:C.danger, display:"flex", alignItems:"center", gap:8 }}>
          <AlertTriangle size={16}/> Hiányos mezők! Írj "0"-t ha az értéke nulla. Minden mezőnek kitöltöttnek kell lennie.
        </div>
      )}

      <MeroSzakasz title="AC feszültség">
        {["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.acFeszultseg[l]} onChange={v=>updVbf("acFeszultseg",l,v)} unit="V" piros={figyelmeztet}/>)}
      </MeroSzakasz>

      <MeroSzakasz title="Kismegszakító értéke inverternél">
        {["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.kismegsInverter[l]} onChange={v=>updVbf("kismegsInverter",l,v)} unit="A" piros={figyelmeztet}/>)}
      </MeroSzakasz>

      <MeroSzakasz title="Kismegszakító értéke mérőhelynél">
        {["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.kismegsMero[l]} onChange={v=>updVbf("kismegsMero",l,v)} unit="A" piros={figyelmeztet}/>)}
      </MeroSzakasz>

      <MeroSzakasz title="Panelszám">
        {["ST1","ST2","ST3","ST4","ST5","ST6"].map(s=><MeroSor key={s} label={s} value={vbf.panelszam[s]} onChange={v=>updVbf("panelszam",s,v)} unit="db" piros={figyelmeztet}/>)}
      </MeroSzakasz>

      <MeroSzakasz title="DC feszültség">
        {["ST1","ST2","ST3","ST4","ST5","ST6"].map(s=><MeroSor key={s} label={s} value={vbf.dcFeszultseg[s]} onChange={v=>updVbf("dcFeszultseg",s,v)} unit="V" piros={figyelmeztet}/>)}
      </MeroSzakasz>

      <MeroSzakasz title="Hurokellenállás">
        {["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.hurokellenallas[l]} onChange={v=>updVbf("hurokellenallas",l,v)} unit="MOhm" piros={figyelmeztet}/>)}
      </MeroSzakasz>

      <MeroSzakasz title="">
        <EgyMero label="Smart meter" value={vbf.smartMeter} onChange={v=>updVbf("smartMeter",null,v)} unit="DB" piros={figyelmeztet}/>
        <EgyMero label="AKKU" value={vbf.akku} onChange={v=>updVbf("akku",null,v)} unit="DB" piros={figyelmeztet}/>
      </MeroSzakasz>

      <MeroSzakasz title="Betáplált DC teljesítmény">
        <EgyMero label="Betáplált DC" value={vbf.betapaltDC} onChange={v=>updVbf("betapaltDC",null,v)} unit="Wp" piros={figyelmeztet}/>
      </MeroSzakasz>

      <MeroSzakasz title="Panel pontos adatok">
        <div style={{ marginBottom:10 }}>
          <p style={{ fontSize:13, color:C.muted, marginBottom:6 }}>Típusa</p>
          <input value={vbf.panelTipus||""} onChange={e=>updVbf("panelTipus",null,e.target.value)} placeholder="Panel típusa" style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${figyelmeztet&&!vbf.panelTipus?"#EF4444":C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", background:figyelmeztet&&!vbf.panelTipus?"#FEF2F2":"#F8FAFC" }}/>
        </div>
        <MeroSor label="Voc"  value={vbf.panelVoc}  onChange={v=>updVbf("panelVoc",null,v)}  unit="V"  piros={figyelmeztet}/>
        <MeroSor label="Vmp"  value={vbf.panelVmp}  onChange={v=>updVbf("panelVmp",null,v)}  unit="V"  piros={figyelmeztet}/>
        <MeroSor label="Imp"  value={vbf.panelImp}  onChange={v=>updVbf("panelImp",null,v)}  unit="A"  piros={figyelmeztet}/>
        <MeroSor label="Isc"  value={vbf.panelIsc}  onChange={v=>updVbf("panelIsc",null,v)}  unit="A"  piros={figyelmeztet}/>
        <MeroSor label="Telj." value={vbf.panelTelj} onChange={v=>updVbf("panelTelj",null,v)} unit="Wp" piros={figyelmeztet}/>
      </MeroSzakasz>

      <MeroSzakasz title="Inverter pontos adatok">
        <EgyMero label="Névleges teljesítménye" value={vbf.inverterNevleges} onChange={v=>updVbf("inverterNevleges",null,v)} unit="kVA" piros={figyelmeztet}/>
      </MeroSzakasz>

      <MeroSzakasz title="Tűzeseti adatok">
        <EgyMero label="Megszakító értéke" value={vbf.tuzMegszakito} onChange={v=>updVbf("tuzMegszakito",null,v)} unit="A" piros={figyelmeztet}/>
      </MeroSzakasz>

      <button onClick={mentes} style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", background:C.accent, color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT, marginTop:8 }}>
        <Save size={18}/>VBF mentése
      </button>
    </div>
  );

  // ── Fotók tab (6.) ────────────────────────────────────────
  const FotokTab = () => (
    <div style={{ padding:"16px", background:"#F1F5F9" }}>
      <p style={{ fontSize:13, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
        Minden fotót a megadott kategóriába töltsd fel. A feltöltött képek automatikusan az adott kategória nevét kapják.
      </p>
      {FOTO_KAT.map(kat=>(
        <FotoKartya key={kat.id} kat={kat} photos={fotok[kat.id]||[]} onChange={v=>setFotok(p=>({...p,[kat.id]:v}))}/>
      ))}
    </div>
  );

  // ── Ellenőrzés tab (7.) ───────────────────────────────────
  const EllenorzesTab = () => {
    const vbfKitoltott = !checkHianyos();
    const fotoKitoltott = FOTO_KAT.every(k=>(fotok[k.id]||[]).length>0);
    const osszesFoto = Object.values(fotok).reduce((s,a)=>s+(a.length||0),0);
    return (
      <div style={{ padding:"16px", background:"#F1F5F9" }}>
        <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:14 }}>
          <p style={{ fontSize:15, fontWeight:700, color:C.text, marginBottom:12 }}>Munka ellenőrzése</p>
          {[
            { label:"VBF Jegyzőkönyv kitöltve", ok:vbfKitoltott },
            { label:`Fotók feltöltve (${osszesFoto} db)`, ok:osszesFoto>0 },
            { label:"Minden fotó kategória feltöltve", ok:fotoKitoltott },
          ].map(item=>(
            <div key={item.label} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
              {item.ok ? <CheckCircle2 size={20} color={C.success}/> : <AlertTriangle size={20} color={C.warning}/>}
              <span style={{ fontSize:14, color:item.ok?C.success:C.warning, fontWeight:item.ok?600:400 }}>{item.label}</span>
            </div>
          ))}
        </div>
        {vbfKitoltott && (
          <button onClick={()=>{ updateItem("munkalapok",m.id,{status:"Kész",statusSzin:"#059669"}); setMentve(true); setTimeout(()=>setMentve(false),2500); }} style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", background:C.success, color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer", fontFamily:FONT }}>
            ✅ Munka befejezése
          </button>
        )}
      </div>
    );
  };

  return (
    <div style={{ minHeight:"100vh", background:"#F1F5F9", fontFamily:FONT }}>
      <Header/>
      <TabSav/>
      <div>
        {activeTab===0 && <InfoTab/>}
        {activeTab===1 && <AnyagokTab/>}
        {activeTab===2 && <FelmeresTab/>}
        {megkezdve && activeTab===3 && <SzerelesTab/>}
        {megkezdve && activeTab===4 && <VbfTab/>}
        {megkezdve && activeTab===5 && <FotokTab/>}
        {megkezdve && activeTab===6 && <EllenorzesTab/>}
      </div>
    </div>
  );
}
