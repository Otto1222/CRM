import { useState, useRef } from "react";
import {
  ArrowLeft, Save, Plus, Trash2, Upload, X,
  ChevronDown, ChevronUp, FileText, Search
} from "lucide-react";
import { C, FONT, FONT_HEADING, MUNKALAP_TIPUSOK, WORKFLOW_STATUSES } from "../lib/constants";
import { getAktivSablonok } from "../modules/munkalap_sablonok/munkalapSablon.service.js";
import { generateMunkalapSzam } from "../lib/munkalapSzam";
import { createBackup } from "../lib/backupService";
import { getUsers } from "../lib/crmUsers";
import { ft, totals } from "../lib/helpers";
import { getAktivCsapatok } from "../modules/csapatok/csapat.service";

// ─── Munkalap sorszám auto-generálás projektkód alapján ──────
function genMunkalapKod(projektId, projektkod) {
  if (!projektId || !projektkod) return "";
  try {
    const all      = JSON.parse(localStorage.getItem("munkalapok") || "[]");
    const existing = new Set(all.map(m => m.ugyszam || m.dokumentumszam).filter(Boolean));
    let seq = all.filter(m => m.projektId === projektId).length + 1;
    let candidate = `${projektkod}/M-${String(seq).padStart(3, "0")}`;
    while (existing.has(candidate)) {
      seq++;
      candidate = `${projektkod}/M-${String(seq).padStart(3, "0")}`;
    }
    return candidate;
  } catch { return ""; }
}

// ─── Fővállalkozói díj auto-számítás projekt adataiból ───────
function calcBillingFromProject(projekt) {
  if (!projekt?.napelemDb || !projekt?.munkatipusId) return null;
  try {
    const munkatipusok = JSON.parse(localStorage.getItem("munkatipusok") || "[]");
    const mt = munkatipusok.find(m => m.id === projekt.munkatipusId);
    if (!mt?.beveteliTetelek) return null;
    const tetel = mt.beveteliTetelek.find(t => t.arlogikaTipus === "darab_egysegar" && Number(t.egysegAr) > 0);
    if (!tetel) return null;
    const ar = Math.round(projekt.napelemDb * Number(tetel.egysegAr));
    return {
      ar,
      megjegyzes: `${projekt.napelemDb} db × ${Number(tetel.egysegAr).toLocaleString("hu-HU")} Ft = ${ar.toLocaleString("hu-HU")} Ft`,
    };
  } catch { return null; }
}

// ─── Eszköz kategóriák ────────────────────────────────────────
const DEFAULT_ESZKOZ_KAT = [
  { id:"inverter",  label:"Inverter",             icon:"⚡", szin:"#2563EB" },
  { id:"akku",      label:"Akkumulátor",           icon:"🔋", szin:"#059669" },
  { id:"akku_vez",  label:"Akkumulátor vezérlő",   icon:"🖥️", szin:"#9333EA" },
  { id:"energia_m", label:"Energia mérő",          icon:"📊", szin:"#D97706" },
  { id:"tarto",     label:"Tartószerkezet elemek", icon:"🏗️", szin:"#0891B2" },
  { id:"ac_eszkoz", label:"AC eszközök",           icon:"🔌", szin:"#DC2626" },
  { id:"dc_eszkoz", label:"DC eszközök",           icon:"⚡", szin:"#7C3AED" },
  { id:"panel",     label:"Napelem panel",         icon:"☀️", szin:"#CA8A04" },
  { id:"egyeb",     label:"Egyéb anyagok",         icon:"📦", szin:"#64748B" },
];
const LS_ESZKOZ = "crm_eszkoz_kategoriak";
function getEszkozKat() {
  try { const s=localStorage.getItem(LS_ESZKOZ); if(s) return JSON.parse(s); } catch {}
  return DEFAULT_ESZKOZ_KAT;
}

// ─── Segéd komponensek ────────────────────────────────────────
function Section({ title, icon, open, onToggle, children, szin }) {
  return (
    <div style={{ marginBottom:16 }}>
      <button onClick={onToggle} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"14px 16px", background: open ? (szin||C.accent)+"15" : "#fff", border:`1.5px solid ${open?(szin||C.accent)+"50":C.border}`, borderRadius: open?"12px 12px 0 0":12, cursor:"pointer", textAlign:"left", fontFamily:FONT }}>
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
            style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", resize:"vertical", background:C.bg }}/>
        : <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
            style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", background:C.bg }}/>
      }
    </div>
  );
}

// ─── Ügyfél mező szabad szöveggel + autocomplete ─────────────
function UgyfelField({ value, onChange, ugyfelek }) {
  const [open, setOpen] = useState(false);
  const [q, setQ]       = useState(value || "");

  const filtered = ugyfelek.filter(u =>
    u.name.toLowerCase().includes(q.toLowerCase()) ||
    u.address?.toLowerCase().includes(q.toLowerCase())
  );

  function select(u) {
    onChange({ nev: u.name, cim: u.address, tel: u.phone, email: u.email });
    setQ(u.name);
    setOpen(false);
  }

  return (
    <div style={{ marginBottom:14, position:"relative" }}>
      <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>Ügyfél neve<span style={{ color:C.danger }}> *</span></label>
      <div style={{ display:"flex", alignItems:"center", gap:8, background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:9, padding:"0 12px" }}>
        <Search size={15} color={C.muted} style={{ flexShrink:0 }}/>
        <input
          value={q}
          onChange={e=>{ setQ(e.target.value); onChange({ nev: e.target.value }); setOpen(e.target.value.length>0); }}
          onFocus={()=>q.length>0&&setOpen(true)}
          placeholder="Írd be az ügyfél nevét, vagy válassz meglévőt…"
          style={{ flex:1, border:"none", outline:"none", fontSize:14, padding:"10px 0", fontFamily:FONT, background:"transparent", color:C.text }}
        />
        {q && <button onClick={()=>{ setQ(""); onChange({}); }} style={{ border:"none", background:"none", cursor:"pointer", color:C.muted }}><X size={14}/></button>}
      </div>
      {/* Autocomplete dropdown */}
      {open && filtered.length > 0 && (
        <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, boxShadow:"0 8px 24px rgba(0,0,0,.12)", zIndex:50, maxHeight:200, overflowY:"auto" }}>
          {filtered.map(u=>(
            <button key={u.id} onClick={()=>select(u)} style={{ width:"100%", padding:"10px 14px", border:"none", background:"transparent", cursor:"pointer", textAlign:"left", fontFamily:FONT, borderBottom:`1px solid ${C.border}` }}
              onMouseEnter={e=>e.currentTarget.style.background=C.bg}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <p style={{ fontSize:14, fontWeight:600, color:C.text }}>{u.name}</p>
              <p style={{ fontSize:12, color:C.muted }}>{u.address}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Eszköz szekció ───────────────────────────────────────────
function EszkozSection({ label, icon, szin, items, onChange }) {
  const [open, setOpen] = useState(true);
  const [ujNev, setUjNev] = useState("");
  const [ujMenny, setUjMenny] = useState(1);
  const [ujEgyseg, setUjEgyseg] = useState("db");

  function add() {
    if (!ujNev.trim()) return;
    onChange([...items, { nev:ujNev.trim(), menny:ujMenny, egyseg:ujEgyseg }]);
    setUjNev(""); setUjMenny(1);
  }

  return (
    <Section title={`${label} (${items.length})`} icon={icon} open={open} onToggle={()=>setOpen(p=>!p)} szin={szin}>
      {items.map((it,i)=>(
        <div key={i} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8, padding:"8px 10px", background:C.bg, borderRadius:9 }}>
          <input value={it.nev} onChange={e=>onChange(items.map((x,j)=>j===i?{...x,nev:e.target.value}:x))} style={{ flex:1, padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT, outline:"none" }}/>
          <input type="number" value={it.menny} onChange={e=>onChange(items.map((x,j)=>j===i?{...x,menny:parseInt(e.target.value)||1}:x))} style={{ width:56, padding:"6px 8px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT, outline:"none", textAlign:"center" }}/>
          <input value={it.egyseg} onChange={e=>onChange(items.map((x,j)=>j===i?{...x,egyseg:e.target.value}:x))} style={{ width:48, padding:"6px 8px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:FONT, outline:"none" }}/>
          <button onClick={()=>onChange(items.filter((_,j)=>j!==i))} style={{ border:"none", background:"none", cursor:"pointer", color:C.danger }}><Trash2 size={15}/></button>
        </div>
      ))}
      <div style={{ display:"flex", gap:8, marginTop:8 }}>
        <input value={ujNev} onChange={e=>setUjNev(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="Eszköz neve…" style={{ flex:1, padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none", background:C.bg }}/>
        <input type="number" value={ujMenny} onChange={e=>setUjMenny(parseInt(e.target.value)||1)} style={{ width:56, padding:"9px 8px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none", textAlign:"center" }}/>
        <input value={ujEgyseg} onChange={e=>setUjEgyseg(e.target.value)} style={{ width:48, padding:"9px 8px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:12, fontFamily:FONT, outline:"none" }} placeholder="db"/>
        <button onClick={add} style={{ padding:"9px 14px", background:szin||C.accent, color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:700, fontSize:18, fontFamily:FONT }}>+</button>
      </div>
    </Section>
  );
}

// ─── PDF / fájl feltöltés ─────────────────────────────────────
function FajlFeltoltes({ files, onChange }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);

  function handleFiles(fileList) {
    const arr = Array.from(fileList).map(f=>({
      name:f.name, size:f.size, type:f.type,
      url:URL.createObjectURL(f), file:f
    }));
    onChange([...files, ...arr]);
  }

  return (
    <div>
      <div
        onDrop={e=>{ e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
        onDragOver={e=>{ e.preventDefault(); setDrag(true); }}
        onDragLeave={()=>setDrag(false)}
        onClick={()=>ref.current?.click()}
        style={{ border:`2px dashed ${drag?C.accent:C.border}`, borderRadius:12, padding:"24px 16px", textAlign:"center", cursor:"pointer", background:drag?C.accentLight: C.bg, marginBottom:12 }}
      >
        <Upload size={28} color={drag?C.accent:C.muted} style={{ display:"block", margin:"0 auto 8px" }}/>
        <p style={{ fontSize:14, fontWeight:600, color:drag?C.accent:C.text, marginBottom:4 }}>PDF, kép vagy dokumentum</p>
        <p style={{ fontSize:12, color:C.muted }}>Húzd ide vagy koppints</p>
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
          <button onClick={()=>onChange(files.filter((_,j)=>j!==i))} style={{ border:"none", background:"none", cursor:"pointer", color:C.danger }}><X size={16}/></button>
        </div>
      ))}
    </div>
  );
}

// ─── Sablon választó ─────────────────────────────────────────
function SablonValaszto({ onSelect, onClose }) {
  const sablonok = getAktivSablonok();
  return (
    <div style={{ position:"fixed", inset:0, zIndex:3000, background:"rgba(0,0,0,.65)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:720, maxHeight:"90vh", overflow:"auto", boxShadow:"0 24px 60px rgba(0,0,0,.35)", fontFamily:FONT }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"18px 24px", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, background:"#fff", zIndex:1 }}>
          <div>
            <h2 style={{ fontFamily:FONT_HEADING, fontSize:18, fontWeight:800, color:C.text, margin:0 }}>Válassz munkalap sablont</h2>
            <p style={{ fontSize:12, color:C.muted, margin:"3px 0 0" }}>A sablon határozza meg a munkalap mezőit és kötelező elemeit</p>
          </div>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:C.muted }}><X size={22}/></button>
        </div>
        <div style={{ padding:"16px 24px 24px", display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:12 }}>
          {sablonok.map(s => {
            const mezokDb = (s.mezok || []).length;
            const beall = s.beallitasok || {};
            const jelzok = [beall.kellVBF&&"VBF", beall.kellLMRA&&"LMRA", beall.kellTIG&&"TIG", beall.kellAlairas&&"Aláírás"].filter(Boolean);
            return (
              <button key={s.id} onClick={() => onSelect(s)}
                style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"14px 16px", border:`2px solid ${C.border}`, borderRadius:12, background:"#fff", cursor:"pointer", textAlign:"left", fontFamily:FONT, transition:"all .15s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.background = C.accentLight; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "#fff"; }}>
                <span style={{ fontSize:30, flexShrink:0, lineHeight:1 }}>{s.ikon || "📋"}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:700, fontSize:14, color:C.text, margin:"0 0 3px" }}>{s.nev}</p>
                  {s.leiras && <p style={{ fontSize:11, color:C.muted, margin:"0 0 6px", lineHeight:1.4 }}>{s.leiras}</p>}
                  <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    <span style={{ fontSize:11, color:C.muted, padding:"1px 6px", background:"#F8FAFC", borderRadius:4, border:`1px solid ${C.border}` }}>📝 {mezokDb} mező</span>
                    {jelzok.map(j => <span key={j} style={{ fontSize:10, fontWeight:600, padding:"1px 5px", background:C.accentLight, color:C.accentDark, borderRadius:4 }}>{j}</span>)}
                  </div>
                </div>
              </button>
            );
          })}
          {sablonok.length === 0 && (
            <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"40px 0", color:C.muted }}>
              <p style={{ fontSize:14, fontWeight:600 }}>Nincsenek aktív sablonok</p>
              <p style={{ fontSize:12 }}>Menj a „ML Sablonok" menüpontba és hozz létre sablont</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sablon mezők renderer ────────────────────────────────────
function SablonMezokSection({ sablon, mezokErtekek, onMezoChange }) {
  if (!sablon || !sablon.mezok || sablon.mezok.length === 0) return null;
  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, padding:"10px 14px", background:C.accentLight, borderRadius:10, border:`1px solid ${C.accentLight}` }}>
        <span style={{ fontSize:20 }}>{sablon.ikon || "📋"}</span>
        <div>
          <p style={{ fontWeight:700, fontSize:13, color:C.accentDark, margin:0 }}>{sablon.nev} – sablon mezők</p>
          <p style={{ fontSize:11, color:C.muted, margin:0 }}>{sablon.mezok.length} mező</p>
        </div>
      </div>
      {sablon.mezok.map(mezo => {
        const ertek = mezokErtekek[mezo.id] ?? "";
        const inputStyle = { width:"100%", boxSizing:"border-box", padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", background:"#F8FAFC", color:C.text };
        return (
          <div key={mezo.id} style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>
              {mezo.cimke}{mezo.kotelezo && <span style={{ color:C.danger }}> *</span>}
              {mezo.mertekegyseg && <span style={{ color:C.muted, fontWeight:400 }}> ({mezo.mertekegyseg})</span>}
            </label>
            {mezo.tipus === "szoveg" && (
              <input value={ertek} onChange={e => onMezoChange(mezo.id, e.target.value)} style={inputStyle}/>
            )}
            {mezo.tipus === "hosszu_szoveg" && (
              <textarea value={ertek} onChange={e => onMezoChange(mezo.id, e.target.value)} rows={3}
                style={{ ...inputStyle, resize:"vertical" }}/>
            )}
            {mezo.tipus === "szam" && (
              <input type="number" value={ertek} min={mezo.szamMin ?? undefined} max={mezo.szamMax ?? undefined}
                onChange={e => onMezoChange(mezo.id, e.target.value)} style={inputStyle}/>
            )}
            {mezo.tipus === "meresiAdat" && (
              <div style={{ display:"flex", gap:8 }}>
                <input type="number" value={ertek} min={mezo.szamMin ?? undefined} max={mezo.szamMax ?? undefined}
                  onChange={e => onMezoChange(mezo.id, e.target.value)} style={{ ...inputStyle, flex:1 }}/>
                {mezo.mertekegyseg && <span style={{ alignSelf:"center", fontWeight:600, color:C.muted, flexShrink:0 }}>{mezo.mertekegyseg}</span>}
              </div>
            )}
            {mezo.tipus === "datum" && (
              <input type="date" value={ertek} onChange={e => onMezoChange(mezo.id, e.target.value)} style={inputStyle}/>
            )}
            {mezo.tipus === "ido" && (
              <input type="time" value={ertek} onChange={e => onMezoChange(mezo.id, e.target.value)} style={inputStyle}/>
            )}
            {mezo.tipus === "igen_nem" && (
              <div style={{ display:"flex", gap:8 }}>
                {["Igen","Nem"].map(v => (
                  <button key={v} onClick={() => onMezoChange(mezo.id, v)}
                    style={{ flex:1, padding:"10px", border:`2px solid ${ertek===v ? (v==="Igen"?C.success:C.danger) : C.border}`, borderRadius:9, background: ertek===v ? (v==="Igen"?"#ECFDF5":"#FEF2F2") : "#fff", color: ertek===v ? (v==="Igen"?C.success:C.danger) : C.muted, fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:FONT }}>
                    {v==="Igen"?"✅":"❌"} {v}
                  </button>
                ))}
              </div>
            )}
            {mezo.tipus === "legordulo" && (
              <select value={ertek} onChange={e => onMezoChange(mezo.id, e.target.value)} style={inputStyle}>
                <option value="">— Válassz —</option>
                {(mezo.legordulo_opciok || []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
            {["alairas","jelenletiIv","fotoKategoria","anyagfelhasznalasok"].includes(mezo.tipus) && (
              <div style={{ padding:"10px 14px", background:"#F8FAFC", borderRadius:9, border:`1px solid ${C.border}`, fontSize:12, color:C.muted }}>
                📱 {mezo.tipus === "alairas" ? "Aláírás a telepítői nézetben rögzíthető" :
                     mezo.tipus === "fotoKategoria" ? "Fotók a telepítői nézetben tölthetők fel" :
                     mezo.tipus === "jelenletiIv" ? "Jelenléti ív a telepítői nézetben tölthető ki" :
                     "Anyagfelhasználás a telepítői nézetben rögzíthető"}
              </div>
            )}
            {mezo.szamMin !== null && mezo.szamMax !== null && ["szam","meresiAdat"].includes(mezo.tipus) && (
              <p style={{ fontSize:11, color:C.muted, marginTop:3 }}>Érvényes tartomány: {mezo.szamMin} – {mezo.szamMax} {mezo.mertekegyseg}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FŐ KOMPONENS
// ═══════════════════════════════════════════════════════════════
export default function UjMunkalap({ data, onBack, onSave, onClose, initialData }) {
  const handleClose = onClose || onBack;
  const eszkozKat   = getEszkozKat();
  const csapatok    = getAktivCsapatok();

  // Projektlista a projekt-választóhoz
  const projektek = (() => {
    try { return JSON.parse(localStorage.getItem("projektek") || "[]"); } catch { return []; }
  })();

  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});
  const [activeSec, setActive] = useState("alap");
  const [kivalasztottSablon, setKivalasztottSablon] = useState(
    initialData?.sablonId ? getAktivSablonok().find(s => s.id === initialData.sablonId) || null : null
  );
  const [sablonPickerNyitva, setSablonPickerNyitva] = useState(!initialData?.sablonId);
  const [sablonMezokErtekek, setSablonMezokErtekek] = useState({});
  const [projektQ, setProjektQ] = useState("");
  const [billingInfo, setBillingInfo] = useState(null); // auto-számított bevétel jelzése

  const [alap, setAlap] = useState(() => {
    const autoUgyszam = initialData?.projektId
      ? genMunkalapKod(initialData.projektId, initialData.projektkod)
      : "";
    return {
      ugyszam:          autoUgyszam,
      telepitesTipusa:  "Napelem",
      cimke:            "Junior Vital",
      cimkeSzin:        "#2563EB",
      projektMegnevezes: initialData?.projektNev || initialData?.projektkod || "",
      projektId:         initialData?.projektId  || "",
      munkalapTipus:     initialData?.tipus || "Első kivitelezés",
      feladat: "", status: "Kiosztásra vár",
      csapatId: initialData?.csapatId || "", csapatNev: "", date: initialData?.tervezettKezdes || "", ertekesito: "",
      ar: 0, munkaeroDij: 0, kiszallasiDij: 0, egyebKolts: 0,
      fovallalkoiAzonosito: initialData?.fovallalkoiAzonosito || "",
    };
  });
  const [ugyfEl, setUgyfel]   = useState({
    nev:   initialData?.clientNev   || "",
    cim:   initialData?.clientCim   || "",
    tel:   initialData?.clientTel   || "",
    email: initialData?.clientEmail || "",
  });
  const [eszkozok, setEszkozok] = useState(
    Object.fromEntries(eszkozKat.map(k=>[k.id,[]]))
  );
  const [felmeres, setFelmeres] = useState({ kapcsoltFelmeres:"" });
  const [files, setFiles]     = useState([]);
  const [items, setItems]     = useState([]);
  const [ujTetel, setUjTetel] = useState({ name:"",qty:1,unit:"db",net:0,vat:27 });

  // Korábbi felmérések (amelyek már mentve vannak)
  const korabbi = (data.munkalapok||[]).filter(m =>
    m.status === "Kész" && m.felmeres && Object.keys(m.felmeres).length > 0
  );

  function updAlap(k,v) { setAlap(p=>({...p,[k]:v})); }
  function updF(k,v)    { setFelmeres(p=>({...p,[k]:v})); }

  function validate() {
    const e={};
    if(!ugyfEl.nev)   e.ugyfel="Kötelező!";
    // Csapat és dátum opcionális – nem blokkolja a mentést
    setErrors(e);
    return Object.keys(e).length===0;
  }

  async function handleSave() {
    if(!validate()) { setActive("alap"); return; }
    setSaving(true);
    createBackup("Új munkalap mentés előtt");
    const projekt = projektek.find(p => p.id === alap.projektId);
    const meglevoMunkalapok = data?.munkalapok || JSON.parse(localStorage.getItem("munkalapok") || "[]");
    const ujMunkalapSzam = generateMunkalapSzam(
      projekt?.projektkod || "",
      alap.fovallalkoiAzonosito || "",
      meglevoMunkalapok
    );

    const veglegesUgyszam = alap.ugyszam || ujMunkalapSzam || `${projekt?.projektkod || "ML"}/001`;

    // Sablon mezők validáció – kötelező mezők ellenőrzése
    if (kivalasztottSablon) {
      const kotelez = (kivalasztottSablon.mezok || []).filter(m => m.kotelezo);
      const hianyzo = kotelez.filter(m => !String(sablonMezokErtekek[m.id] || "").trim());
      if (hianyzo.length > 0) {
        setErrors({ sablon: `Kötelező mezők hiányoznak: ${hianyzo.map(m => m.cimke).join(", ")}` });
        setActive("sablon");
        setSaving(false);
        return;
      }
    }

    const anyagok = eszkozKat.flatMap(k =>
      (eszkozok[k.id]||[]).map(it=>({ ...it, kategoria:k.label }))
    );

    // Kiválasztott csapat adatai
    const csapat = csapatok.find(c=>c.id===alap.csapatId);


    const ml = {
      id:                `ml_${Date.now()}`,  // egyedi belső ID (nem tartalmaz "/" karaktert)
      ugyszam:           veglegesUgyszam,
      cimke:             alap.cimke,
      cimkeSzin:         alap.cimkeSzin,
      status:            alap.status,
      statusSzin:        {
        "Felmérés":    "#0EA5E9",
        "Kivitelezés": "#EA580C",
        "Folyamatban": "#2563EB",
        "Ütemezett":   "#D97706",
        "Kész":        "#059669",
        "Meghiúsult":  "#DC2626",
      }[alap.status] || "#38BDF8",
      projektMegnevezes: alap.projektMegnevezes,
      feladat:           alap.feladat,
      description:       alap.feladat,
      date:              alap.date,
      ertekesito:        alap.ertekesito,
      ar:                Number(alap.ar) || 0,
      munkaeroDij:       Number(alap.munkaeroDij) || 0,
      kiszallasiDij:     Number(alap.kiszallasiDij) || 0,
      egyebKolts:        Number(alap.egyebKolts) || 0,
      munkalapTipus:     alap.munkalapTipus || "Első kivitelezés",
      telepitesTipusa:   alap.telepitesTipusa || "Napelem",
      fovallalkoiAzonosito: alap.fovallalkoiAzonosito || "",
      ediSorszam:        veglegesUgyszam,   // backward compat
      // Fő azonosító: E.D.I.XXX/NNN formátum
      dokumentumszam:    veglegesUgyszam,
      munkalapSzam:      veglegesUgyszam,
      // Csapat – a Telepítő szűrés erre támaszkodik
      assigneeId:        alap.csapatId,
      assigneeNev:       csapat?.nev || alap.csapatNev,
      // Projekt kapcsolat
      projektId:         alap.projektId || null,
      projektKod:        alap.projektId ? (projektek.find(p=>p.id===alap.projektId)?.projektkod || "") : "",
      tipus:             alap.munkalapTipus || "Első kivitelezés",
      // Ügyfél szabad szövegként tárolva
      clientId:          null,
      clientNev:         ugyfEl.nev,
      clientCim:         ugyfEl.cim,
      clientTel:         ugyfEl.tel,
      clientEmail:       ugyfEl.email,
      anyagok,
      eszkozok,
      felmeres:          { ...felmeres },
      items,
      files:             files.map(f=>({ name:f.name, size:f.size, type:f.type })),
      createdAt:         new Date().toISOString(),
      // Sablon integráció
      sablonId:          kivalasztottSablon?.id || null,
      sablonNev:         kivalasztottSablon?.nev || null,
      sablonMezokErtekek: kivalasztottSablon ? sablonMezokErtekek : {},
    };

    await new Promise(r=>setTimeout(r,600));
    setSaving(false);
    onSave(ml);
  }

  const SECTIONS = [
    {id:"alap",      label:"Alapadatok",        icon:"📋"},
    ...(kivalasztottSablon ? [{id:"sablon", label: kivalasztottSablon.nev, icon: kivalasztottSablon.ikon || "📋"}] : []),
    {id:"eszkozok",  label:"Eszközök / Anyagok", icon:"🔧"},
    {id:"szamlazas", label:"Számlázás",          icon:"💰"},
    {id:"felmeres",  label:"Felmérés",           icon:"📐"},
    {id:"fajlok",    label:"Fájlok / PDF",       icon:"📎"},
  ];

  const tot = totals(items);

  return (
    <div style={{ minHeight:"100vh", background:C.bg, fontFamily:FONT }}>
      {/* TopBar */}
      <div style={{ background:"#fff", borderBottom:`1px solid ${C.border}`, position:"sticky", top:0, zIndex:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px" }}>
          <button onClick={handleClose} style={{ border:"none", background:"none", cursor:"pointer", color:C.accent, display:"flex", alignItems:"center", gap:6, fontSize:14, fontWeight:600, fontFamily:FONT }}>
            <ArrowLeft size={20}/> Vissza
          </button>
          <span style={{ flex:1, fontFamily:FONT_HEADING, fontWeight:800, fontSize:18, color:C.text }}>Új munkalap</span>
          <button onClick={handleSave} disabled={saving} style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 18px", background:C.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:FONT }}>
            {saving ? "Mentés…" : <><Save size={16}/>Mentés</>}
          </button>
        </div>
        {/* Szekciók */}
        <div style={{ display:"flex", overflowX:"auto", borderTop:`1px solid ${C.border}` }}>
          {SECTIONS.map(s=>(
            <button key={s.id} onClick={()=>setActive(s.id)} style={{ padding:"10px 14px", border:"none", background:"transparent", color:activeSec===s.id?C.accent:C.muted, fontWeight:activeSec===s.id?700:400, fontSize:13, cursor:"pointer", fontFamily:FONT, borderBottom:activeSec===s.id?`2px solid ${C.accent}`:"2px solid transparent", whiteSpace:"nowrap" }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px" }}>
        {Object.keys(errors).length>0&&(
          <div style={{ background:C.dangerLight, border:`1px solid #FECACA`, borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:C.danger }}>
            ⚠️ {Object.values(errors).join(" · ")}
          </div>
        )}

        {/* ══ SABLON VÁLASZTÁS BANNER ══ */}
        {activeSec==="alap"&&(
          <div style={{ marginBottom:14 }}>
            {kivalasztottSablon ? (
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:C.accentLight, border:`1.5px solid ${C.border}`, borderRadius:12 }}>
                <span style={{ fontSize:24 }}>{kivalasztottSablon.ikon || "📋"}</span>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:700, color:C.accentDark, margin:0 }}>
                    Sablon: {kivalasztottSablon.nev}
                  </p>
                  <p style={{ fontSize:11, color:C.muted, margin:0 }}>
                    {(kivalasztottSablon.mezok||[]).length} mező · Kattints a „{kivalasztottSablon.nev}" tabra a sablon mezők kitöltéséhez
                  </p>
                </div>
                <button onClick={() => setSablonPickerNyitva(true)}
                  style={{ padding:"6px 12px", border:`1px solid ${C.border}`, borderRadius:8, background:"#fff", fontSize:12, color:C.muted, cursor:"pointer", fontFamily:FONT }}>
                  Csere
                </button>
              </div>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"#FFFBEB", border:`1.5px solid #FDE68A`, borderRadius:12 }}>
                <span style={{ fontSize:20 }}>⚠️</span>
                <p style={{ fontSize:13, color:"#92400E", fontWeight:600, margin:0, flex:1 }}>
                  Nincs sablon kiválasztva
                </p>
                <button onClick={() => setSablonPickerNyitva(true)}
                  style={{ padding:"7px 14px", background:C.accent, color:"#fff", border:"none", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>
                  Sablon választása
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ SABLON MEZŐK ══ */}
        {activeSec==="sablon"&&(
          <div>
            {errors.sablon && (
              <div style={{ background:"#FEF2F2", border:`1px solid #FECACA`, borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:C.danger }}>
                ⚠️ {errors.sablon}
              </div>
            )}
            <SablonMezokSection
              sablon={kivalasztottSablon}
              mezokErtekek={sablonMezokErtekek}
              onMezoChange={(id, val) => setSablonMezokErtekek(prev => ({ ...prev, [id]: val }))}
            />
          </div>
        )}

        {/* ══ ALAPADATOK ══ */}
        {activeSec==="alap"&&(
          <div>
            {/* ── PROJEKT KIVÁLASZTÁS ── */}
            {!alap.projektId ? (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>
                  🏗️ Projekt kiválasztása <span style={{ color:C.danger }}>*</span>
                </label>
                <input
                  value={projektQ}
                  onChange={e => setProjektQ(e.target.value)}
                  placeholder="Keresés projektkód, név, ügyfél alapján…"
                  style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1.5px solid ${C.accent}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none", marginBottom:6 }}
                />
                {projektek.length === 0 ? (
                  <p style={{ fontSize:12, color:C.warning, padding:"8px 12px", background:C.warningLight, borderRadius:8 }}>
                    ⚠️ Még nincs projekt. Hozz létre egy projektet először a <b>Projektek</b> menüben!
                  </p>
                ) : (
                  <div style={{ maxHeight:200, overflowY:"auto", border:`1px solid ${C.border}`, borderRadius:9, background:"#fff" }}>
                    {projektek
                      .filter(p => {
                        const q = projektQ.toLowerCase();
                        return !q || p.projektkod?.toLowerCase().includes(q) || p.nev?.toLowerCase().includes(q) || p.clientNev?.toLowerCase().includes(q);
                      })
                      .slice(0, 15)
                      .map(p => (
                        <div key={p.id} onClick={() => {
                          updAlap("projektId", p.id);
                          updAlap("projektMegnevezes", p.nev || p.projektkod);
                          setProjektQ("");
                          // Auto-kitöltés projektből
                          setUgyfel({ nev: p.clientNev||"", cim: p.telepitesiCim||p.clientCim||"", tel: p.clientTel||"", email: p.clientEmail||"" });
                          if (p.csapatId) updAlap("csapatId", p.csapatId);
                          if (p.tervezettKezdes) updAlap("date", p.tervezettKezdes);
                          // Auto-generált munkalap sorszám: projektkód/M-001
                          updAlap("ugyszam", genMunkalapKod(p.id, p.projektkod));
                          // Fővállalkozói azonosító auto-kitöltés
                          const fovAzon = p.penzugy?.fovallalkoziAzonosito || p.fovallalkoiAzonosito || "";
                          if (fovAzon) updAlap("fovallalkoiAzonosito", fovAzon);
                          // Telepítés típusa auto-kitöltés projektből
                          if (p.telepitesTipusa) updAlap("telepitesTipusa", p.telepitesTipusa);
                          // Fővállalkozói díj auto-számítás (napelem db × egységár)
                          const billing = calcBillingFromProject(p);
                          if (billing) { updAlap("ar", billing.ar); setBillingInfo(billing.megjegyzes); }
                          else setBillingInfo(null);
                        }} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${C.border}`, fontSize:13 }}
                          onMouseEnter={e => e.currentTarget.style.background=C.bg}
                          onMouseLeave={e => e.currentTarget.style.background=""}
                        >
                          <div>
                            <span style={{ fontWeight:700, color:C.accent }}>{p.projektkod}</span>
                            <span style={{ color:C.text, marginLeft:8 }}>{p.nev}</span>
                          </div>
                          <span style={{ fontSize:11, color:C.muted }}>{p.clientNev}</span>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background:C.accentLight, border:"1.5px solid #BFDBFE", borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:C.accent, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                <span>🏗️ Projekt: <strong>{alap.projektMegnevezes || alap.projektId}</strong>
                  <span style={{ fontWeight:400, color:C.accent, marginLeft:4 }}>– adatok előre kitöltve</span>
                </span>
                <button onClick={() => { updAlap("projektId",""); updAlap("projektMegnevezes",""); }} style={{ background:"none", border:"none", cursor:"pointer", color:C.muted, fontSize:18, lineHeight:1 }}>×</button>
              </div>
            )}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div>
                <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>
                  Munkaszám {alap.projektId ? <span style={{ fontWeight:400, color:C.success }}>✓ auto-generált</span> : <span style={{ color:C.danger }}> *</span>}
                </label>
                <input
                  value={alap.ugyszam||""}
                  onChange={e=>updAlap("ugyszam",e.target.value)}
                  placeholder={alap.projektId ? "E.D.I.001/M-001" : "Válassz projektet fentebb"}
                  style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${alap.ugyszam ? C.success : C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", background: alap.ugyszam ? C.successLight : C.bg }}
                />
                {errors.ugyszam&&<p style={{ color:C.danger,fontSize:11,marginTop:4 }}>{errors.ugyszam}</p>}
              </div>
              <div>
                <Field label="Dátum" value={alap.date} onChange={v=>updAlap("date",v)} type="date"/>
                {errors.date&&<p style={{ color:C.danger,fontSize:11,marginTop:-10,marginBottom:10 }}>{errors.date}</p>}
              </div>
            </div>

            {/* Billing auto-számítás jelzés */}
            {billingInfo && (
              <div style={{ background:C.successLight, border:"1px solid #86EFAC", borderRadius:9, padding:"8px 14px", marginBottom:12, fontSize:13, color:C.success, fontWeight:600 }}>
                💡 Fővállalkozói díj auto-számítva: {billingInfo}
              </div>
            )}

            {/* ÜGYFÉL – szabad szöveg + autocomplete */}
            <UgyfelField value={ugyfEl.nev} onChange={setUgyfel} ugyfelek={data.ugyfelek||[]} />
            {errors.ugyfel&&<p style={{ color:C.danger,fontSize:11,marginTop:-10,marginBottom:10 }}>{errors.ugyfel}</p>}

            {/* Ügyfél részletek (ha szabad szöveget ír) */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Field label="Ügyfél cím" value={ugyfEl.cim} onChange={v=>setUgyfel(p=>({...p,cim:v}))} placeholder="Város, utca, hsz."/>
              <Field label="Telefonszám" value={ugyfEl.tel} onChange={v=>setUgyfel(p=>({...p,tel:v}))} placeholder="+36…"/>
            </div>
            <Field label="E-mail cím" value={ugyfEl.email} onChange={v=>setUgyfel(p=>({...p,email:v}))} placeholder="ugyfél@email.com" type="email"/>

            <Field label="Projekt megnevezés / Megjegyzés" value={alap.projektMegnevezes} onChange={v=>updAlap("projektMegnevezes",v)} placeholder="Különleges feltételek, megjegyzés…" area/>
            <Field label="Feladat leírása" value={alap.feladat} onChange={v=>updAlap("feladat",v)} placeholder="pl. Napelem telepítés + akkumulátor"/>

            {/* CSAPAT – a beállításokból olvassa be */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>
                Szerelő / Csapat<span style={{ color:C.danger }}> *</span>
              </label>
              {csapatok.length === 0 ? (
                <div style={{ padding:"12px 14px", background:C.warningLight, border:`1px solid #FDE68A`, borderRadius:9, fontSize:13, color:C.warning }}>
                  ⚠️ Nincsenek csapatok beállítva. Menj a <b>Beállítások → Munkakiosztás</b> menübe és add hozzá a csapatokat!
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {csapatok.map(cs=>(
                    <button key={cs.id} onClick={()=>updAlap("csapatId",cs.id)} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", borderRadius:11, border:`2px solid ${alap.csapatId===cs.id?cs.szin||C.accent:C.border}`, background:alap.csapatId===cs.id?(cs.szin||C.accent)+"15":"#fff", cursor:"pointer", textAlign:"left", fontFamily:FONT }}>
                      <div style={{ width:36, height:36, borderRadius:"50%", background:cs.szin||C.accent, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:14, flexShrink:0 }}>
                        {cs.nev.charAt(0)}
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ fontWeight:700, fontSize:14, color:C.text }}>{cs.nev}</p>
                        <p style={{ fontSize:12, color:C.muted }}>{cs.telephely}</p>
                      </div>
                      {alap.csapatId===cs.id&&<span style={{ color:cs.szin||C.accent, fontSize:18 }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
              {errors.csapat&&<p style={{ color:C.danger,fontSize:11,marginTop:8 }}>{errors.csapat}</p>}
            </div>

            {/* Telepítés típusa – meghatározza az ikont a telepítői nézeten */}
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>Telepítés típusa</label>
              <div style={{ display:"flex", gap:8 }}>
                {[
                  { id:"Napelem",         ikon:"☀️",  szin:"#F97316" },
                  { id:"Elektromos töltő",ikon:"⚡",  szin:"#EAB308" },
                  { id:"Egyéb",           ikon:"🔧", szin:"#64748B" },
                ].map(t=>(
                  <button key={t.id} type="button" onClick={()=>updAlap("telepitesTipusa",t.id)}
                    style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, padding:"10px 8px", border:`2px solid ${alap.telepitesTipusa===t.id?t.szin:C.border}`, borderRadius:10, background:alap.telepitesTipusa===t.id?t.szin+"15": C.bg, cursor:"pointer", fontFamily:FONT, fontWeight:700, fontSize:13, color:alap.telepitesTipusa===t.id?t.szin:C.muted }}>
                    <span style={{ fontSize:18 }}>{t.ikon}</span> {t.id}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>Munkalap típusa</label>
                <select value={alap.munkalapTipus || "Első kivitelezés"} onChange={e=>updAlap("munkalapTipus",e.target.value)} style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", background:C.bg }}>
                  {MUNKALAP_TIPUSOK.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <Field label="Cimke (pl. Junior Vital)" value={alap.cimke} onChange={v=>updAlap("cimke",v)} placeholder="Junior Vital, Saját Önerős…"/>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>Státusz</label>
                <select value={alap.status} onChange={e=>updAlap("status",e.target.value)} style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", background:C.bg }}>
                  {WORKFLOW_STATUSES.slice(0,8).map(s=><option key={s}>{s}</option>)}
                </select>
                {alap.status === "Felmérés" && (
                  <div style={{ marginTop:8, padding:"8px 12px", background:C.accentLight, borderRadius:8, fontSize:12, color:C.accent, display:"flex", alignItems:"flex-start", gap:7, lineHeight:1.5 }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>📸</span>
                    <span>A telepítő <b>felmérési fotókat tölthet fel</b>. Az összes korábban feltöltött kép megtekinthető marad minden következő státuszban is.</span>
                  </div>
                )}
                {alap.status === "Kivitelezés" && (
                  <div style={{ marginTop:8, padding:"8px 12px", background:C.warningLight, borderRadius:8, fontSize:12, color:C.warning, display:"flex", alignItems:"flex-start", gap:7, lineHeight:1.5 }}>
                    <span style={{ fontSize:16, flexShrink:0 }}>🔧</span>
                    <span>A telepítő látja a felmérési fotókat és <b>új kivitelezési képeket tölthet fel</b>.</span>
                  </div>
                )}
              </div>
            </div>
            <Field label="Értékesítő neve" value={alap.ertekesito} onChange={v=>updAlap("ertekesito",v)} placeholder="Értékesítő neve"/>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:5 }}>Fővállalkozói azonosító</label>
                <input value={alap.fovallalkoiAzonosito||""} onChange={e=>updAlap("fovallalkoiAzonosito",e.target.value)} placeholder="pl. FŐV-2026-145" style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:"1.5px solid "+C.border, borderRadius:9, fontSize:14, fontFamily:"inherit", outline:"none" }} />
                <p style={{ fontSize:10, color:C.muted, marginTop:3 }}>EDI sorszám (E.D.I. 001) mentéskor kap</p>
              </div>
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:C.muted, display:"block", marginBottom:5 }}>Munkalap típusa</label>
                <select value={alap.munkalapTipus||"Első kivitelezés"} onChange={e=>updAlap("munkalapTipus",e.target.value)} style={{ width:"100%", padding:"10px 12px", border:"1.5px solid "+C.border, borderRadius:9, fontSize:14, fontFamily:"inherit", color:C.text, outline:"none", background:C.bg }}>
                  {MUNKALAP_TIPUSOK.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ══ ESZKÖZÖK ══ */}
        {activeSec==="eszkozok"&&(
          <div>
            <p style={{ fontSize:13, color:C.muted, marginBottom:16 }}>Kategóriánként adj hozzá eszközöket és anyagokat.</p>
            {eszkozKat.map(k=>(
              <EszkozSection key={k.id} label={k.label} icon={k.icon} szin={k.szin} items={eszkozok[k.id]||[]} onChange={v=>setEszkozok(p=>({...p,[k.id]:v}))}/>
            ))}
          </div>
        )}

        {/* ══ SZÁMLÁZÁS ══ */}
        {activeSec==="szamlazas"&&(
          <div>
            {items.map((it,i)=>{
              const b=(it.qty*it.net)*(1+it.vat/100);
              return(
                <div key={i} style={{ padding:"12px 14px", background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, marginBottom:8 }}>
                  <div style={{ display:"flex", gap:10, marginBottom:6 }}>
                    <input value={it.name} onChange={e=>setItems(p=>p.map((x,j)=>j===i?{...x,name:e.target.value}:x))} style={{ flex:1, padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT, outline:"none" }} placeholder="Megnevezés"/>
                    <button onClick={()=>setItems(p=>p.filter((_,j)=>j!==i))} style={{ border:"none", background:"none", cursor:"pointer", color:C.danger }}><Trash2 size={15}/></button>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 2fr 1fr", gap:8 }}>
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
            <div style={{ border:`1.5px dashed ${C.border}`, borderRadius:12, padding:16, background:"#fff" }}>
              <p style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, marginBottom:12 }}>Új tétel hozzáadása</p>
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
            {/* Kapcsolt felmérés kiválasztása */}
            <div style={{ background:C.accentLight, border:`1.5px solid #BFDBFE`, borderRadius:12, padding:"14px 16px", marginBottom:20 }}>
              <p style={{ fontSize:13, fontWeight:700, color:C.accent, marginBottom:10 }}>📎 Kapcsolt felmérés visszacsatolása</p>
              <p style={{ fontSize:12, color:C.textSub, marginBottom:12 }}>Ha a csapat már elvégzett egy felmérést, azt itt tudod visszacsatolni – az adatai automatikusan betöltődnek.</p>
              <select value={felmeres.kapcsoltFelmeres||""} onChange={e=>{
                const val = e.target.value;
                updF("kapcsoltFelmeres", val);
                if(val) {
                  // Betöltjük a kiválasztott felmérés adatait
                  const forras = (data.munkalapok||[]).find(m=>m.id===val);
                  if(forras?.felmeres) {
                    setFelmeres({ kapcsoltFelmeres:val, ...forras.felmeres });
                  }
                }
              }} style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", background:"#fff" }}>
                <option value="">— Nincs kapcsolt felmérés —</option>
                {korabbi.map(m=>(
                  <option key={m.id} value={m.id}>
                    {m.id} – {m.clientNev||m.id} ({m.date})
                  </option>
                ))}
                {(data.munkalapok||[]).filter(m=>m.felmeres&&Object.keys(m.felmeres).some(k=>k!=="kapcsoltFelmeres"&&m.felmeres[k])).map(m=>(
                  <option key={m.id+"-f"} value={m.id}>
                    {m.id} – {m.clientNev||m.clientId} ({m.date})
                  </option>
                ))}
              </select>
            </div>

            {/* Felmérési mezők */}
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

        <div style={{ marginTop:24, paddingBottom:40 }}>
          <button onClick={handleSave} disabled={saving} style={{ width:"100%", padding:"15px", borderRadius:12, border:"none", background:C.accent, color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT }}>
            <Save size={20}/>{saving?"Mentés folyamatban…":"Munkalap létrehozása"}
          </button>
        </div>
      </div>

      {sablonPickerNyitva && (
        <SablonValaszto
          onSelect={s => { setKivalasztottSablon(s); setSablonPickerNyitva(false); setActive("sablon"); }}
          onClose={() => setSablonPickerNyitva(false)}
        />
      )}
    </div>
  );
}
