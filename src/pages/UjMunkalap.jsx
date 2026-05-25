import { useState, useRef } from "react";
import {
  ArrowLeft, Save, Plus, Trash2, Upload, X,
  ChevronDown, ChevronUp, FileText, Zap, Battery,
  Cpu, Gauge, Layers, Plug, Sun, Package
} from "lucide-react";
import { C, FONT, FONT_HEADING, USERS } from "../lib/constants";
import { ft, totals } from "../lib/helpers";

// ─── Eszköz kategóriák (beállításokból is módosítható) ────────
const DEFAULT_ESZKOZ_KAT = [
  { id:"inverter",   label:"Inverter",                 icon:"⚡", szin:"#2563EB" },
  { id:"akku",       label:"Akkumulátor",               icon:"🔋", szin:"#059669" },
  { id:"akku_vez",   label:"Akkumulátor vezérlő",       icon:"🖥️", szin:"#9333EA" },
  { id:"energia_m",  label:"Energia mérő",              icon:"📊", szin:"#D97706" },
  { id:"tarto",      label:"Tartószerkezet elemek",     icon:"🏗️", szin:"#0891B2" },
  { id:"ac_eszkoz",  label:"AC eszközök",               icon:"🔌", szin:"#DC2626" },
  { id:"dc_eszkoz",  label:"DC eszközök",               icon:"⚡", szin:"#7C3AED" },
  { id:"panel",      label:"Napelem panel",             icon:"☀️", szin:"#CA8A04" },
  { id:"egyeb",      label:"Egyéb anyagok",             icon:"📦", szin:"#64748B" },
];

const LS_ESZKOZ = "crm_eszkoz_kategoriak";
function getEszkozKat() {
  try { const s=localStorage.getItem(LS_ESZKOZ); if(s) return JSON.parse(s); } catch {}
  return DEFAULT_ESZKOZ_KAT;
}

// ─── Segéd komponensek ────────────────────────────────────────
function Section({ title, icon, open, onToggle, children, accent }) {
  return (
    <div style={{ marginBottom:16 }}>
      <button onClick={onToggle} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"14px 16px", background:accent||"#fff", border:`1.5px solid ${accent?accent+"40":C.border}`, borderRadius: open ? "12px 12px 0 0" : 12, cursor:"pointer", textAlign:"left", fontFamily:FONT }}>
        <span style={{ fontSize:20 }}>{icon}</span>
        <span style={{ flex:1, fontWeight:700, fontSize:15, color:C.text }}>{title}</span>
        {open ? <ChevronUp size={18} color={C.muted}/> : <ChevronDown size={18} color={C.muted}/>}
      </button>
      {open && (
        <div style={{ border:`1.5px solid ${C.border}`, borderTop:"none", borderRadius:"0 0 12px 12px", padding:16, background:"#fff" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type="text", placeholder, area, required }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>
        {label}{required&&<span style={{ color:C.danger }}> *</span>}
      </label>
      {area
        ? <textarea value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={3}
            style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", resize:"vertical", background:"#F8FAFC" }}/>
        : <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
            style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", background:"#F8FAFC" }}/>
      }
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>{label}</label>
      <select value={value||""} onChange={e=>onChange(e.target.value)} style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:value?C.text:C.muted, outline:"none", background:"#F8FAFC" }}>
        <option value="">{placeholder||"— Válassz —"}</option>
        {options.map(o=><option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
      </select>
    </div>
  );
}

// ─── Anyag / eszköz sor ──────────────────────────────────────
function EszkozSection({ katId, label, icon, szin, items, onChange }) {
  const [open, setOpen] = useState(true);
  const [ujNev, setUjNev] = useState("");
  const [ujMenny, setUjMenny] = useState(1);
  const [ujEgyseg, setUjEgyseg] = useState("db");

  function add() {
    if (!ujNev.trim()) return;
    onChange([...items, { nev: ujNev.trim(), menny: ujMenny, egyseg: ujEgyseg }]);
    setUjNev(""); setUjMenny(1);
  }
  function del(i) { onChange(items.filter((_,j)=>j!==i)); }
  function updateItem(i, field, val) {
    onChange(items.map((it,j)=>j===i?{...it,[field]:val}:it));
  }

  return (
    <Section title={`${label} (${items.length} db)`} icon={icon} open={open} onToggle={()=>setOpen(p=>!p)} accent={szin}>
      {items.map((it,i)=>(
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, padding:"8px 10px", background:C.bg, borderRadius:9 }}>
          <input value={it.nev} onChange={e=>updateItem(i,"nev",e.target.value)} style={{ flex:1, padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT, outline:"none" }}/>
          <input type="number" value={it.menny} onChange={e=>updateItem(i,"menny",parseInt(e.target.value)||1)} style={{ width:56, padding:"6px 8px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT, outline:"none", textAlign:"center" }}/>
          <input value={it.egyseg} onChange={e=>updateItem(i,"egyseg",e.target.value)} style={{ width:48, padding:"6px 8px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:FONT, outline:"none" }}/>
          <button onClick={()=>del(i)} style={{ border:"none", background:"none", cursor:"pointer", color:C.danger, flexShrink:0 }}><Trash2 size={15}/></button>
        </div>
      ))}
      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <input value={ujNev} onChange={e=>setUjNev(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Eszköz / anyag neve…" style={{ flex:1, padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none", background:"#F8FAFC" }}/>
        <input type="number" value={ujMenny} onChange={e=>setUjMenny(parseInt(e.target.value)||1)} style={{ width:56, padding:"9px 8px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none", textAlign:"center" }}/>
        <input value={ujEgyseg} onChange={e=>setUjEgyseg(e.target.value)} style={{ width:48, padding:"9px 8px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:12, fontFamily:FONT, outline:"none" }} placeholder="db"/>
        <button onClick={add} style={{ padding:"9px 14px", background:szin||C.accent, color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:700, fontFamily:FONT, fontSize:18 }}>+</button>
      </div>
    </Section>
  );
}

// ─── PDF / fájl feltöltés ────────────────────────────────────
function FajlFeltoltes({ files, onChange }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);

  function handleFiles(fileList) {
    const arr = Array.from(fileList).map(f=>({
      name: f.name, size: f.size, type: f.type,
      url: URL.createObjectURL(f), file: f
    }));
    onChange([...files, ...arr]);
  }

  function del(i) { onChange(files.filter((_,j)=>j!==i)); }

  return (
    <div>
      <div
        onDrop={e=>{ e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        onDragOver={e=>{ e.preventDefault(); setDrag(true); }}
        onDragLeave={()=>setDrag(false)}
        onClick={()=>ref.current?.click()}
        style={{ border:`2px dashed ${drag?C.accent:C.border}`, borderRadius:12, padding:"24px 16px", textAlign:"center", cursor:"pointer", background:drag?C.accentLight:"#F8FAFC", marginBottom:12 }}
      >
        <Upload size={28} color={drag?C.accent:C.muted} style={{ display:"block", margin:"0 auto 8px" }}/>
        <p style={{ fontSize:14, fontWeight:600, color:drag?C.accent:C.text, marginBottom:4 }}>PDF, kép vagy dokumentum</p>
        <p style={{ fontSize:12, color:C.muted }}>Húzd ide vagy koppints a kiválasztáshoz</p>
        <input ref={ref} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ display:"none" }} onChange={e=>handleFiles(e.target.files)}/>
      </div>
      {files.map((f,i)=>(
        <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, marginBottom:8 }}>
          <FileText size={18} color={f.type==="application/pdf"?C.danger:C.accent}/>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.name}</p>
            <p style={{ fontSize:11, color:C.muted }}>{(f.size/1024).toFixed(1)} KB</p>
          </div>
          {f.url&&<a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize:12, color:C.accent, textDecoration:"none" }}>Megnyit</a>}
          <button onClick={()=>del(i)} style={{ border:"none", background:"none", cursor:"pointer", color:C.danger }}><X size={16}/></button>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FŐ KOMPONENS
// ═══════════════════════════════════════════════════════════════
export default function UjMunkalap({ data, onBack, onSave }) {
  const eszkozKat = getEszkozKat();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeSec, setActiveSec] = useState("alap");

  // Form állapot
  const [alap, setAlap] = useState({
    ugyszam:"", cimke:"Junior Vital", cimkeSzin:"#2563EB",
    projektMegnevezes:"", feladat:"", status:"Megkezdésre Vár",
    clientId:"", date:"", assigneeId:"", ertekesito:"",
  });
  const [eszkozok, setEszkozok] = useState(
    Object.fromEntries(eszkozKat.map(k=>[k.id,[]]))
  );
  const [felmeres, setFelmeres] = useState({});
  const [files, setFiles] = useState([]);
  const [items, setItems] = useState([]); // számlázási tételek
  const [ujTetel, setUjTetel] = useState({name:"",qty:1,unit:"db",net:0,vat:27});

  function updAlap(k,v) { setAlap(p=>({...p,[k]:v})); }
  function updF(k,v) { setFelmeres(p=>({...p,[k]:v})); }

  function validate() {
    const e={};
    if(!alap.ugyszam) e.ugyszam="Kötelező!";
    if(!alap.date)    e.date="Kötelező!";
    setErrors(e);
    return Object.keys(e).length===0;
  }

  async function handleSave() {
    if(!validate()) { setActiveSec("alap"); return; }
    setSaving(true);

    // Anyagok összeállítása eszkozok-ból
    const anyagok = eszkozKat.flatMap(k =>
      (eszkozok[k.id]||[]).map(it=>({ ...it, kategoria: k.label }))
    );

    const ml = {
      id: alap.ugyszam,
      ugyszam: alap.ugyszam,
      cimke: alap.cimke,
      cimkeSzin: alap.cimkeSzin,
      status: alap.status,
      statusSzin: "#38BDF8",
      projektMegnevezes: alap.projektMegnevezes,
      feladat: alap.feladat,
      clientId: alap.clientId,
      date: alap.date,
      assigneeId: alap.assigneeId,
      ertekesito: alap.ertekesito,
      description: alap.feladat,
      anyagok,
      eszkozok,
      felmeres,
      items,
      files: files.map(f=>({ name:f.name, size:f.size, type:f.type })),
    };

    await new Promise(r=>setTimeout(r,600));
    setSaving(false);
    onSave(ml);
  }

  const SECTIONS = [
    { id:"alap",      label:"Alapadatok",       icon:"📋" },
    { id:"eszkozok",  label:"Eszközök / Anyagok", icon:"🔧" },
    { id:"szamlazas", label:"Számlázás",         icon:"💰" },
    { id:"felmeres",  label:"Felmérés",          icon:"📐" },
    { id:"fajlok",    label:"Fájlok / PDF",      icon:"📎" },
  ];

  const tot = totals(items);

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FONT }}>
      {/* TopBar */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, zIndex:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px" }}>
          <button onClick={onBack} style={{ border:"none", background:"none", cursor:"pointer", color:C.muted, display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:600, fontFamily:FONT }}>
            <ArrowLeft size={20} color={C.accent}/> Vissza
          </button>
          <span style={{ flex:1, fontFamily:FONT_HEADING, fontWeight:800, fontSize:18, color:C.text }}>Új munkalap</span>
          <button onClick={handleSave} disabled={saving} style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 18px", background:C.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:FONT }}>
            {saving ? "Mentés…" : <><Save size={16}/>Mentés</>}
          </button>
        </div>
        {/* Szekció tab sáv */}
        <div style={{ display:"flex", overflowX:"auto", borderTop:`1px solid ${C.border}` }}>
          {SECTIONS.map(s=>(
            <button key={s.id} onClick={()=>setActiveSec(s.id)} style={{ padding:"10px 14px", border:"none", background:"transparent", color:activeSec===s.id?C.accent:C.muted, fontWeight:activeSec===s.id?700:400, fontSize:13, cursor:"pointer", fontFamily:FONT, borderBottom:activeSec===s.id?`2px solid ${C.accent}`:"2px solid transparent", whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:5 }}>
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px" }}>
        {/* Hibajelzés */}
        {Object.keys(errors).length>0&&(
          <div style={{ background:"#FEF2F2", border:`1px solid #FECACA`, borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:C.danger }}>
            ⚠️ Töltsd ki a kötelező mezőket!
          </div>
        )}

        {/* ══ ALAPADATOK ══ */}
        {activeSec==="alap"&&(
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <Field label="Munkaszám / Ügyszám" value={alap.ugyszam} onChange={v=>updAlap("ugyszam",v)} placeholder="T003700" required/>
                {errors.ugyszam&&<p style={{ color:C.danger, fontSize:11, marginTop:-10, marginBottom:10 }}>{errors.ugyszam}</p>}
              </div>
              <div>
                <Field label="Dátum" value={alap.date} onChange={v=>updAlap("date",v)} type="date" required/>
                {errors.date&&<p style={{ color:C.danger, fontSize:11, marginTop:-10, marginBottom:10 }}>{errors.date}</p>}
              </div>
            </div>
            <Field label="Projekt megnevezés / Megjegyzés" value={alap.projektMegnevezes} onChange={v=>updAlap("projektMegnevezes",v)} placeholder="Géda, különleges feltétel, megjegyzés…" area/>
            <Field label="Feladat leírása" value={alap.feladat} onChange={v=>updAlap("feladat",v)} placeholder="pl. Napelem telepítés + akkumulátor"/>
            <SelectField label="Ügyfél" value={alap.clientId} onChange={v=>updAlap("clientId",v)} placeholder="— Válassz ügyfelet —" options={data.ugyfelek.map(u=>({value:u.id,label:`${u.name} – ${u.address}`}))}/>
            <SelectField label="Szerelő / Csapat" value={alap.assigneeId} onChange={v=>updAlap("assigneeId",v)} placeholder="— Válassz szerelőt —" options={USERS.map(u=>({value:u.id,label:u.name+" ("+u.role+")"}))}/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Cimke" value={alap.cimke} onChange={v=>updAlap("cimke",v)} placeholder="Junior Vital, Saját Önerős…"/>
              <SelectField label="Státusz" value={alap.status} onChange={v=>updAlap("status",v)} options={["Megkezdésre Vár","Folyamatban","Ütemezett","Kész","Meghiúsult"]}/>
            </div>
            <Field label="Értékesítő neve" value={alap.ertekesito} onChange={v=>updAlap("ertekesito",v)} placeholder="Értékesítő neve"/>
          </div>
        )}

        {/* ══ ESZKÖZÖK / ANYAGOK ══ */}
        {activeSec==="eszkozok"&&(
          <div>
            <p style={{ fontSize:13, color:C.muted, marginBottom:16 }}>Adj hozzá eszközöket és anyagokat kategóriánként. Minden sor szerkeszthető.</p>
            {eszkozKat.map(k=>(
              <EszkozSection
                key={k.id}
                katId={k.id}
                label={k.label}
                icon={k.icon}
                szin={k.szin}
                items={eszkozok[k.id]||[]}
                onChange={v=>setEszkozok(p=>({...p,[k.id]:v}))}
              />
            ))}
          </div>
        )}

        {/* ══ SZÁMLÁZÁS ══ */}
        {activeSec==="szamlazas"&&(
          <div>
            {items.map((it,i)=>{
              const n=it.qty*it.net, b=n*(1+it.vat/100);
              return(
                <div key={i} style={{ padding:"12px 14px", background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, marginBottom:8 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                    <input value={it.name} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,name:e.target.value}:x))} style={{ flex:1, padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT, outline:"none" }}/>
                    <button onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))} style={{ border:"none", background:"none", cursor:"pointer", color:C.danger }}><Trash2 size={15}/></button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8 }}>
                    <input type="number" value={it.qty} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,qty:parseInt(e.target.value)||1}:x))} placeholder="db" style={{ padding:"6px 8px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:FONT, outline:"none" }}/>
                    <input value={it.unit} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,unit:e.target.value}:x))} placeholder="egység" style={{ padding:"6px 8px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:FONT, outline:"none" }}/>
                    <input type="number" value={it.net} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,net:parseInt(e.target.value)||0}:x))} placeholder="Nettó Ft" style={{ padding:"6px 8px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:FONT, outline:"none" }}/>
                    <input type="number" value={it.vat} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,vat:parseInt(e.target.value)||27}:x))} placeholder="ÁFA%" style={{ padding:"6px 8px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:FONT, outline:"none" }}/>
                  </div>
                  <p style={{ fontSize:12, color:C.accent, fontWeight:600, marginTop:6 }}>Bruttó: {ft(b)}</p>
                </div>
              );
            })}
            {tot.brutto>0&&(
              <div style={{ padding:"14px", background:C.accentLight, borderRadius:10, marginBottom:16, display:"flex", justifyContent:"space-between", fontSize:16, fontWeight:800 }}>
                <span style={{ color:C.text }}>Bruttó összeg</span>
                <span style={{ color:C.accent }}>{ft(tot.brutto)}</span>
              </div>
            )}
            {/* Új tétel */}
            <div style={{ border:`1.5px dashed ${C.border}`, borderRadius:12, padding:16, background:"#fff" }}>
              <p style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, marginBottom:12 }}>Új számlázási tétel</p>
              <input value={ujTetel.name} onChange={e=>setUjTetel(p=>({...p,name:e.target.value}))} placeholder="Megnevezés" style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", marginBottom:8 }}/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 2fr 1fr auto", gap:8 }}>
                <input type="number" value={ujTetel.qty} onChange={e=>setUjTetel(p=>({...p,qty:parseInt(e.target.value)||1}))} placeholder="db" style={{ padding:"9px 8px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none" }}/>
                <input value={ujTetel.unit} onChange={e=>setUjTetel(p=>({...p,unit:e.target.value}))} placeholder="egység" style={{ padding:"9px 8px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none" }}/>
                <input type="number" value={ujTetel.net} onChange={e=>setUjTetel(p=>({...p,net:parseInt(e.target.value)||0}))} placeholder="Nettó Ft" style={{ padding:"9px 8px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none" }}/>
                <input type="number" value={ujTetel.vat} onChange={e=>setUjTetel(p=>({...p,vat:parseInt(e.target.value)||27}))} placeholder="ÁFA%" style={{ padding:"9px 8px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:12, fontFamily:FONT, outline:"none" }}/>
                <button onClick={()=>{ if(!ujTetel.name) return; setItems(p=>[...p,{...ujTetel}]); setUjTetel({name:"",qty:1,unit:"db",net:0,vat:27}); }} style={{ padding:"9px 14px", background:C.accent, color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:700, fontFamily:FONT, fontSize:18 }}>+</button>
              </div>
            </div>
          </div>
        )}

        {/* ══ FELMÉRÉS ══ */}
        {activeSec==="felmeres"&&(
          <div>
            {[
              ["Csatlakozási pont","csatlakozasiPont"],
              ["Csatl. pont állapota","csatlPontAllapota"],
              ["AC kábel terv. hossz (m)","acKabelHossz","number"],
              ["AC védelem típus","acVedelem"],
              ["Komm. kábel tervezett hossza (m)","kommKabelHossz","number"],
              ["Inverter fal, elhelyezés leírása","inverterFal"],
              ["Akkumulátor fal, elhelyezés leírása","akkuFal"],
              ["Akku kábel terv. hossz (m)","akkuKabelHossz","number"],
              ["Tető típus","tetoTipus"],
              ["Tetőszerkezet típus","tetoszerkezetTipus"],
              ["Padlás","padlas"],
              ["Villámhárító","villamharitor"],
              ["Tartószerkezet típus","tartoszerkezetTipus"],
              ["Pótcserép","potcserep"],
              ["DC kábel terv. hossz (m)","dcKabelHossz","number"],
              ["DC kábel további szükséges nyomvonal","dcKabelNyomvonal","number"],
              ["DC védelem típus","dcVedelem"],
              ["Tűzeseti kapcsoló szükséges","tuzKapcsolo"],
              ["Panel elrendezés információk","panelElrendezes"],
              ["Telepítéshez szükséges felhordó eszköz","felhordoEszkoz"],
              ["Engedélyeztetés állapota","engedelyeztetes"],
              ["Visszwatt védelem","visszwatt"],
              ["Ingatlan megközelíthetősége, megjegyzés","megkozelithetoseg"],
              ["Felmérés elvégzésének időpontja","felmeresIdopont","date"],
            ].map(([label,k,type])=>(
              <Field key={k} label={label} value={felmeres[k]} onChange={v=>updF(k,v)} type={type||"text"} placeholder={label}/>
            ))}
          </div>
        )}

        {/* ══ FÁJLOK ══ */}
        {activeSec==="fajlok"&&(
          <div>
            <p style={{ fontSize:13, color:C.muted, marginBottom:16 }}>Töltsd fel a munkához kapcsolódó dokumentumokat, terveket, PDF-eket, fotókat.</p>
            <FajlFeltoltes files={files} onChange={setFiles}/>
          </div>
        )}

        {/* Mentés gomb alul */}
        <div style={{ marginTop:24, paddingBottom:32 }}>
          <button onClick={handleSave} disabled={saving} style={{ width:"100%", padding:"15px", borderRadius:12, border:"none", background:C.accent, color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT }}>
            <Save size={20}/>{saving?"Mentés folyamatban…":"Munkalap létrehozása"}
          </button>
        </div>
      </div>
    </div>
  );
}
