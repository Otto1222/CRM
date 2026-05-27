import { useState } from "react";
import UjrakiosztasModal from "./UjrakiosztasModal";
import VbfAdminCard from "../components/VbfAdminCard";
import FotokAdminCard from "../components/FotokAdminCard";
import FelmeresFotokAdminCard from "../components/FelmeresFotokAdminCard";
import TelepItoMunkalap from "./TelepItoMunkalap";
import {
  Search, Plus, ChevronRight, FileText, Phone, MapPin,
  ClipboardList, Package, Ruler, Printer, Send, Loader2,
  Pencil, Trash2, Eye, Euro, X, Check, ArrowLeft,
  User, Mail, Calendar, Hash, Tag, MessageSquare,
  ChevronDown, Save
} from "lucide-react";
import { C, FONT, FONT_HEADING, USERS, STATUS_CFG } from "../lib/constants";
import { ft, totals, generateId } from "../lib/helpers";
import { canSeePrice, canCreateMunkalap } from "../lib/roles";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import Avatar from "../components/Avatar";

function useIsMobile() {
  return window.innerWidth < 900;
}

function CimkeBadge({ label, color }) {
  return (
    <span style={{ background: color, color: "#fff", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// LISTA
// ═══════════════════════════════════════════════════════════════
// ─── Időtartam formázó ───────────────────────────────────────
function formatElapsedTime(startIso, endIso) {
  if (!startIso) return null;
  const start = new Date(startIso);
  const end   = endIso ? new Date(endIso) : new Date();
  const diff  = Math.max(0, Math.floor((end - start) / 1000));
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return `${String(h).padStart(2,"0")} óra ${String(m).padStart(2,"0")} perc ${String(s).padStart(2,"0")} mp`;
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("hu-HU", {
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit", second:"2-digit"
  });
}

// ─── Munka idő kártya (Admin/PM/Iroda nézetbe) ───────────────
function MunkaIdoBontasCard({ m }) {
  if (!m.megkezdesIdopont && !m.befejezesIdopont) return null;
  const elapsed = formatElapsedTime(m.megkezdesIdopont, m.befejezesIdopont);
  return (
    <div style={{ marginTop:16, background:"#F0F9FF", border:"1px solid #BAE6FD", borderRadius:12, padding:"14px 16px" }}>
      <p style={{ fontSize:11, fontWeight:700, color:"#0369A1", textTransform:"uppercase", letterSpacing:.8, marginBottom:12 }}>
        ⏱ Munkaidő összesítés
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div>
          <p style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:4 }}>Megkezdés időpontja</p>
          <p style={{ fontSize:13, fontWeight:700, color:"#0369A1" }}>{formatDateTime(m.megkezdesIdopont)}</p>
        </div>
        <div>
          <p style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:4 }}>
            {m.befejezesIdopont ? "Lezárás időpontja" : "Folyamatban (aktuális)"}
          </p>
          <p style={{ fontSize:13, fontWeight:700, color: m.befejezesIdopont ? C.success : C.warning }}>
            {formatDateTime(m.befejezesIdopont || new Date().toISOString())}
          </p>
        </div>
      </div>
      {elapsed && (
        <div style={{ marginTop:12, padding:"10px 14px", background:"#fff", borderRadius:10, border:"1px solid #BAE6FD" }}>
          <p style={{ fontSize:11, color:"#64748B", fontWeight:600, marginBottom:4 }}>Eltelt munkaidő</p>
          <p style={{ fontSize:16, fontWeight:800, color:"#0369A1", fontFamily:"monospace" }}>{elapsed}</p>
        </div>
      )}
    </div>
  );
}

// ─── Felhasznált anyagok kártya (Admin/PM/Iroda) ─────────────
function FelhasznaltAnyagokCard({ m }) {
  const anyagok = m.felhasznaltAnyagok;
  if (!anyagok || anyagok.length === 0) return null;
  const SERIAL_ITEMS = ["Inverter","Optimalizáló","Akkumulátor modul","Akkumulátor vezérlő","Smart Méter","Tűzeseti leválasztó"];
  return (
    <div style={{ marginTop:16 }}>
      <Card style={{ padding:"20px 22px" }}>
        <h4 style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase", marginBottom:14 }}>
          ⚙️ Felhasznált anyagok ({anyagok.length} tétel)
        </h4>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
          <thead>
            <tr style={{ borderBottom:`2px solid ${C.border}` }}>
              {["Megnevezés","Mennyiség","Sorozatszám"].map(h=>(
                <th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.7 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {anyagok.map((a,i) => (
              <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                <td style={{ padding:"10px 10px", fontWeight:600, color:C.text }}>{a.nev}</td>
                <td style={{ padding:"10px 10px", color:C.textSub, whiteSpace:"nowrap" }}>{a.menny} {a.egyseg}</td>
                <td style={{ padding:"10px 10px", color: a.sorozatszam ? C.text : C.muted, fontFamily:"monospace", fontSize:12 }}>
                  {a.sorozatszam || (a.kotelezőSerial ? "⚠️ Hiányzik!" : "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function MunkalapLista({ data, onSelect, onNew, userRole, currentUser }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("Összes");
  const isMobile = useIsMobile();
  const STATUSES = ["Összes","Folyamatban","Ütemezett","Kész","Meghiúsult","Megkezdésre Vár"];

  const filtered = data.munkalapok.filter(m => {
    // Telepítőnek csak a nevéhez rendelt munkák
    if (userRole === "Telepítő" && currentUser) {
      const match = m.assigneeNev === currentUser.name ||
                    m.csapatNev   === currentUser.name ||
                    m.assigneeId  === currentUser.id;
      if (!match) return false;
    }
    const clientNev = m.clientNev || data.ugyfelek?.find(u => u.id === m.clientId)?.name || "";
    return (tab === "Összes" || m.status === tab) &&
      (m.id.toLowerCase().includes(q.toLowerCase()) ||
       clientNev.toLowerCase().includes(q.toLowerCase()));
  });

  return (
    <div style={{ padding: isMobile ? "12px 16px" : "28px 32px", fontFamily: FONT }}>
      {/* Kereső + Új */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "0 12px" }}>
          <Search size={15} color={C.muted} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Keresés…" style={{ border:"none", outline:"none", fontSize:14, padding:"10px 0", flex:1, fontFamily:FONT, background:"transparent", color:C.text }} />
        </div>
        {canCreateMunkalap(userRole) && (
          <button onClick={onNew} style={{ display:"flex", alignItems:"center", gap:6, padding:"0 16px", background:C.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:FONT, whiteSpace:"nowrap" }}>
            <Plus size={16} />{!isMobile && "Új munkalap"}
          </button>
        )}
      </div>

      {/* Státusz szűrők */}
      {!isMobile && (
        <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:16 }}>
          {STATUSES.map(s => (
            <button key={s} onClick={()=>setTab(s)} style={{ padding:"7px 13px", borderRadius:8, border:`1px solid ${tab===s?C.accent:C.border}`, background:tab===s?C.accentLight:"#fff", color:tab===s?C.accent:C.textSub, fontWeight:tab===s?700:400, fontSize:12, cursor:"pointer", fontFamily:FONT }}>{s}</button>
          ))}
        </div>
      )}

      {/* Asztali tábla */}
      {!isMobile ? (
        <Card>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:`2px solid ${C.border}` }}>
                {["Munkaszám","Ügyfél","Dátum","Szerelő","Státusz",...(canSeePrice(userRole)?["Összeg"]:[]),""].map(h=>(
                  <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, letterSpacing:.8, color:C.muted, textTransform:"uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(m => {
                const cl = data.ugyfelek?.find(u=>u.id===m.clientId);
                const as = USERS.find(u=>u.id===m.assigneeId);
                const tot = totals(m.items||[]);
                return (
                  <tr key={m.id} onClick={()=>onSelect(m)} style={{ borderBottom:`1px solid ${C.border}`, cursor:"pointer" }}
                    onMouseEnter={e=>e.currentTarget.style.background=C.bg}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <td style={{ padding:"14px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <span style={{ fontWeight:700, color:C.accent }}>{m.id}</span>
                        {m.cimke && <CimkeBadge label={m.cimke} color={m.cimkeSzin||C.accent} />}
                      </div>
                    </td>
                    <td style={{ padding:"14px 16px", color:C.textSub }}>{cl?.name||"—"}</td>
                    <td style={{ padding:"14px 16px", color:C.textSub }}>{m.date}</td>
                    <td style={{ padding:"14px 16px" }}>{as&&<div style={{ display:"flex", alignItems:"center", gap:7 }}><Avatar u={as} size={26}/><span style={{ color:C.textSub }}>{as.name.split(" ")[0]}</span></div>}</td>
                    <td style={{ padding:"14px 16px" }}><StatusBadge s={m.status||"Ütemezett"}/></td>
                    {canSeePrice(userRole)&&<td style={{ padding:"14px 16px", fontWeight:700, color:C.text }}>{tot.brutto>0?ft(tot.brutto):"—"}</td>}
                    <td style={{ padding:"14px 16px" }}><ChevronRight size={16} color={C.muted}/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length===0&&<div style={{ textAlign:"center", padding:"48px 0", color:C.muted }}><FileText size={36} style={{ opacity:.25, display:"block", margin:"0 auto 10px" }}/>Nincs találat</div>}
        </Card>
      ) : (
        /* Mobil kártyák */
        <div>
          {filtered.map(m => {
            const cl = data.ugyfelek?.find(u=>u.id===m.clientId);
            return (
              <button key={m.id} onClick={()=>onSelect(m)} style={{ width:"100%", background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:10, cursor:"pointer", textAlign:"left", fontFamily:FONT }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <span style={{ fontWeight:800, fontSize:15, color:C.text }}>{m.id}</span>
                  {m.cimke&&<CimkeBadge label={m.cimke} color={m.cimkeSzin||C.accent}/>}
                  <span style={{ marginLeft:"auto", fontSize:12, color:C.muted }}>{m.date}</span>
                </div>
                {m.status&&<span style={{ color:m.statusSzin||C.muted, fontSize:13, fontWeight:600 }}>{m.status}</span>}
                {m.projektMegnevezes&&<p style={{ fontSize:13, color:C.textSub, marginTop:4 }}>{m.projektMegnevezes}</p>}
                {(m.clientNev||cl)&&<div style={{ marginTop:8 }}><p style={{ fontWeight:700, fontSize:14, color:C.text }}>{m.clientNev||cl?.name}</p><p style={{ fontSize:12, color:C.muted }}>{m.clientCim||cl?.address}</p></div>}
              </button>
            );
          })}
          {filtered.length===0&&<div style={{ textAlign:"center", padding:"40px 0", color:C.muted }}><FileText size={36} style={{ opacity:.2, display:"block", margin:"0 auto 10px" }}/>Nincs találat</div>}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ÚJ MUNKALAP FORM (Modal)
// ═══════════════════════════════════════════════════════════════
export function UjMunkalapModal({ data, onClose, onSave }) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState({
    ugyszam: "", cimke: "Junior Vital", cimkeSzin: "#2563EB",
    projektMegnevezes: "", feladat: "", status: "Megkezdésre Vár",
    statusSzin: "#38BDF8", clientId: "", date: "", assigneeId: "",
    ertekesito: "",
    anyagok: [],
    felmeres: {
      csatlakozasiPont:"", csatlPontAllapota:"", acKabelHossz:"", acVedelem:"",
      kommKabelHossz:"", inverterFal:"", akkuFal:"", akkuKabelHossz:"",
      tetoTipus:"", tetoszerkezetTipus:"", padlas:"", villamharitor:"",
      tartoszerkezetTipus:"", potcserep:"", dcKabelHossz:"", dcKabelNyomvonal:"",
      dcVedelem:"", tuzKapcsolo:"", panelElrendezes:"", felhordoEszkoz:"",
      engedelyeztetes:"", visszwatt:"", megkozelithetoseg:"", felmeresIdopont:"",
    },
    items: [],
  });
  const [activeTab, setActiveTab] = useState("alap");
  const [ujAnyag, setUjAnyag] = useState({ nev:"", menny:1, egyseg:"db" });
  const [ujTetel, setUjTetel] = useState({ name:"", qty:1, unit:"db", net:0, vat:27 });

  function upd(k, v) { setForm(p=>({...p,[k]:v})); }
  function updF(k, v) { setForm(p=>({...p,felmeres:{...p.felmeres,[k]:v}})); }

  function addAnyag() {
    if (!ujAnyag.nev) return;
    setForm(p=>({...p, anyagok:[...p.anyagok,{...ujAnyag}]}));
    setUjAnyag({nev:"",menny:1,egyseg:"db"});
  }
  function addTetel() {
    if (!ujTetel.name) return;
    setForm(p=>({...p, items:[...p.items,{...ujTetel}]}));
    setUjTetel({name:"",qty:1,unit:"db",net:0,vat:27});
  }

  function handleSave() {
    const ml = { ...form, id: form.ugyszam || `ML${Date.now()}` };
    onSave(ml);
  }

  const FInput = ({label, k, type="text", placeholder, area}) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>{label}</label>
      {area
        ? <textarea value={form[k]||""} onChange={e=>upd(k,e.target.value)} placeholder={placeholder} rows={3}
            style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", resize:"vertical", background:"#F8FAFC" }} />
        : <input type={type} value={form[k]||""} onChange={e=>upd(k,e.target.value)} placeholder={placeholder}
            style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", background:"#F8FAFC" }} />
      }
    </div>
  );

  const FFInput = ({label, k, type="text", placeholder}) => (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>{label}</label>
      <input type={type} value={form.felmeres[k]||""} onChange={e=>updF(k,e.target.value)} placeholder={placeholder}
        style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", background:"#F8FAFC" }} />
    </div>
  );

  const TABS = [
    {id:"alap", label:"Alapadatok"},
    {id:"anyagok", label:"Anyagok"},
    {id:"szamlazas", label:"Számlázás"},
    {id:"felmeres", label:"Felmérés"},
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:100, display:"flex", alignItems:"flex-end", justifyContent:"center" }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:680, maxHeight:"95vh", display:"flex", flexDirection:"column" }}>
        {/* Fejléc */}
        <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <h2 style={{ fontFamily:FONT_HEADING, fontSize:20, fontWeight:800, color:C.text }}>Új munkalap</h2>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:C.muted }}><X size={22}/></button>
        </div>
        {/* Tabok */}
        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, flexShrink:0, overflowX:"auto" }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ padding:"12px 18px", border:"none", background:"transparent", color:activeTab===t.id?C.accent:C.muted, fontWeight:activeTab===t.id?700:400, fontSize:14, cursor:"pointer", fontFamily:FONT, borderBottom:activeTab===t.id?`2px solid ${C.accent}`:"2px solid transparent", whiteSpace:"nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Tartalom */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
          {/* ALAPADATOK */}
          {activeTab==="alap"&&(
            <div>
              <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:12 }}>
                <FInput label="Ügyszám / Munkaszám" k="ugyszam" placeholder="pl. T003700" />
                <FInput label="Dátum" k="date" type="date" />
              </div>
              <FInput label="Projekt megnevezés" k="projektMegnevezes" placeholder="Géda, megjegyzés…" area />
              <FInput label="Feladat" k="feladat" placeholder="pl. Napelem telepítés + akku" />
              <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:12 }}>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>Ügyfél</label>
                  <select value={form.clientId} onChange={e=>upd("clientId",e.target.value)} style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", background:"#F8FAFC" }}>
                    <option value="">— Válassz ügyfelet —</option>
                    {data.ugyfelek.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>Szerelő / Csapat</label>
                  <select value={form.assigneeId} onChange={e=>upd("assigneeId",e.target.value)} style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", background:"#F8FAFC" }}>
                    <option value="">— Válassz szerelőt —</option>
                    {USERS.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns: isMobile?"1fr":"1fr 1fr", gap:12 }}>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>Cimke</label>
                  <input value={form.cimke} onChange={e=>upd("cimke",e.target.value)} placeholder="Junior Vital, Saját Önerős…" style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", background:"#F8FAFC" }} />
                </div>
                <div style={{ marginBottom:14 }}>
                  <label style={{ display:"block", fontSize:12, color:C.muted, marginBottom:5, fontWeight:600 }}>Státusz</label>
                  <select value={form.status} onChange={e=>upd("status",e.target.value)} style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", background:"#F8FAFC" }}>
                    {["Megkezdésre Vár","Folyamatban","Ütemezett","Kész","Meghiúsult"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <FInput label="Értékesítő" k="ertekesito" placeholder="Értékesítő neve" />
            </div>
          )}

          {/* ANYAGOK */}
          {activeTab==="anyagok"&&(
            <div>
              <p style={{ fontSize:13, color:C.muted, marginBottom:14 }}>Telepítéshez szükséges anyagok és eszközök</p>
              {form.anyagok.map((a,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:C.bg, borderRadius:10, marginBottom:8 }}>
                  <span style={{ flex:1, fontSize:14, color:C.text, fontWeight:600 }}>{a.nev}</span>
                  <span style={{ fontSize:14, color:C.textSub }}>{a.menny} {a.egyseg}</span>
                  <button onClick={()=>setForm(p=>({...p,anyagok:p.anyagok.filter((_,j)=>j!==i)}))} style={{ border:"none", background:"none", cursor:"pointer", color:C.danger }}><Trash2 size={14}/></button>
                </div>
              ))}
              <div style={{ border:`1.5px dashed ${C.border}`, borderRadius:12, padding:16, marginTop:8 }}>
                <p style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, marginBottom:12 }}>Anyag hozzáadása</p>
                <input value={ujAnyag.nev} onChange={e=>setUjAnyag(p=>({...p,nev:e.target.value}))} placeholder="Anyag megnevezése" style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", background:"#fff", marginBottom:8 }} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:8 }}>
                  <input type="number" value={ujAnyag.menny} onChange={e=>setUjAnyag(p=>({...p,menny:parseInt(e.target.value)||1}))} placeholder="Mennyiség" style={{ padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", background:"#fff" }} />
                  <input value={ujAnyag.egyseg} onChange={e=>setUjAnyag(p=>({...p,egyseg:e.target.value}))} placeholder="Egység (db, m…)" style={{ padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", background:"#fff" }} />
                  <button onClick={addAnyag} style={{ padding:"9px 16px", background:C.accent, color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:700, fontFamily:FONT }}>+ Hozzá</button>
                </div>
              </div>
            </div>
          )}

          {/* SZÁMLÁZÁS */}
          {activeTab==="szamlazas"&&(
            <div>
              {form.items.map((it,i)=>{
                const n=it.qty*it.net, b=n*(1+it.vat/100);
                return(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px", background:C.bg, borderRadius:10, marginBottom:8 }}>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:14, fontWeight:600, color:C.text }}>{it.name}</p>
                      <p style={{ fontSize:12, color:C.muted }}>{it.qty} {it.unit} × {ft(it.net)} + {it.vat}% ÁFA = {ft(b)}</p>
                    </div>
                    <button onClick={()=>setForm(p=>({...p,items:p.items.filter((_,j)=>j!==i)}))} style={{ border:"none", background:"none", cursor:"pointer", color:C.danger }}><Trash2 size={14}/></button>
                  </div>
                );
              })}
              {form.items.length>0&&(
                <div style={{ padding:"12px 14px", background:C.accentLight, borderRadius:10, marginBottom:16, display:"flex", justifyContent:"space-between", fontSize:15, fontWeight:800, color:C.text }}>
                  <span>Bruttó összeg</span>
                  <span style={{ color:C.accent }}>{ft(totals(form.items).brutto)}</span>
                </div>
              )}
              <div style={{ border:`1.5px dashed ${C.border}`, borderRadius:12, padding:16, marginTop:8 }}>
                <p style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, marginBottom:12 }}>Tétel hozzáadása</p>
                <input value={ujTetel.name} onChange={e=>setUjTetel(p=>({...p,name:e.target.value}))} placeholder="Megnevezés" style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", background:"#fff", marginBottom:8 }} />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr auto", gap:8 }}>
                  <input type="number" value={ujTetel.qty} onChange={e=>setUjTetel(p=>({...p,qty:parseInt(e.target.value)||1}))} placeholder="db" style={{ padding:"9px 10px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none" }} />
                  <input value={ujTetel.unit} onChange={e=>setUjTetel(p=>({...p,unit:e.target.value}))} placeholder="egység" style={{ padding:"9px 10px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none" }} />
                  <input type="number" value={ujTetel.net} onChange={e=>setUjTetel(p=>({...p,net:parseInt(e.target.value)||0}))} placeholder="Nettó Ft" style={{ padding:"9px 10px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none" }} />
                  <input type="number" value={ujTetel.vat} onChange={e=>setUjTetel(p=>({...p,vat:parseInt(e.target.value)||27}))} placeholder="ÁFA%" style={{ padding:"9px 10px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none" }} />
                  <button onClick={addTetel} style={{ padding:"9px 14px", background:C.accent, color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:700, fontFamily:FONT }}>+</button>
                </div>
              </div>
            </div>
          )}

          {/* FELMÉRÉS */}
          {activeTab==="felmeres"&&(
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
                <FFInput key={k} label={label} k={k} type={type||"text"} />
              ))}
            </div>
          )}
        </div>

        {/* Mentés gomb */}
        <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
          <button onClick={handleSave} style={{ width:"100%", padding:"13px", borderRadius:12, border:"none", background:C.accent, color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT }}>
            <Save size={18}/> Munkalap mentése
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// KÖZÖS FEJLÉC A DETAIL NÉZETEKHEZ
// ═══════════════════════════════════════════════════════════════
function DetailHeader({ m, client, isMobile }) {
  return (
    <div style={{ background: "#2C4A6E" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, padding: isMobile ? "12px 16px 8px" : "16px 24px 10px" }}>
        <span style={{ fontWeight:800, fontSize: isMobile?15:17, color:"#fff" }}>{m.id}</span>
        {m.cimke&&<CimkeBadge label={m.cimke} color={m.cimkeSzin||C.accent}/>}
        <div style={{ marginLeft:"auto", display:"flex", gap:14 }}>
          {client?.phone&&<a href={`tel:${client.phone}`} style={{ color:"#4ADE80" }}><Phone size={22}/></a>}
          {client?.address&&<a href={`https://maps.google.com/?q=${encodeURIComponent(client.address)}`} target="_blank" rel="noreferrer" style={{ color:"#60A5FA" }}><MapPin size={22}/></a>}
        </div>
      </div>
      {client&&(
        <div style={{ padding: isMobile?"0 16px 14px":"0 24px 16px" }}>
          <p style={{ fontWeight:700, fontSize:isMobile?16:18, color:"#fff" }}>{client.name}</p>
          <p style={{ fontSize:13, color:"#94A3B8" }}>{client.address}</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN/PM/IRODA – MOBIL TAB NÉZET (árakkal, szerkesztéssel)
// ═══════════════════════════════════════════════════════════════
function AdminMobileDetail({ m, data, userRole, onDelete, onRefresh }) {
  const [showUjrakiosztas, setShowUjrakiosztas] = useState(false);
  const [tab, setTab] = useState(0);
  const client = data.ugyfelek.find(u=>u.id===m.clientId);
  const as = USERS.find(u=>u.id===m.assigneeId);
  const tot = totals(m.items||[]);
  const [saving, setSaving] = useState(false);

  const tabs = [
    { icon:"📄" }, { icon:"📦" }, { icon:"📋" }
  ];

  async function issueInvoice() {
    setSaving(true);
    await new Promise(r=>setTimeout(r,1000));
    setSaving(false);
    alert(`✅ Számla kiállítva!\n${m.id}\nBruttó: ${ft(tot.brutto)}`);
  }

  const FieldRow = ({label, value}) => value ? (
    <div style={{ padding:"0 16px" }}>
      <p style={{ fontSize:12, color:"#64748B", paddingTop:10, marginBottom:4 }}>{label}</p>
      <div style={{ background:"#E8EDF5", borderRadius:6, padding:"10px 12px", marginBottom:2, fontSize:14, color:C.text, borderBottom:"1px solid #D1D9E6" }}>{value}</div>
    </div>
  ) : null;

  return (
    <div style={{ fontFamily:FONT, background:"#F1F5F9", minHeight:"100vh" }}>
      <DetailHeader m={m} client={client} isMobile />
      <div style={{ display:"flex", background:"#2C4A6E" }}>
        {tabs.map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{ flex:1, padding:"12px 0", border:"none", background:"transparent", color:tab===i?"#fff":"#94A3B8", cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", borderBottom:tab===i?"3px solid #fff":"3px solid transparent", fontFamily:FONT }}>
            {t.icon}
          </button>
        ))}
      </div>

      {/* Tab 0 – Infók */}
      {tab===0&&(
        <div style={{ background:"#F1F5F9" }}>
          <FieldRow label="Projekt megnevezés" value={m.projektMegnevezes}/>
          <FieldRow label="Feladat" value={m.feladat}/>
          <FieldRow label="Ügyszám" value={m.ugyszam}/>
          <FieldRow label="Kapcsolattartó" value={client?.name}/>
          <FieldRow label="Telefonszám" value={client?.phone}/>
          <FieldRow label="E-mail cím" value={client?.email}/>
          <FieldRow label="Értékesítő" value={m.ertekesito}/>
          <FieldRow label="Dátum" value={m.date}/>
          {as&&<FieldRow label="Szerelő" value={as.name}/>}
          <MunkaIdoBontasCard m={m} />
          {/* Megjegyzések */}
          {m.alairas && (
            <div style={{ marginTop:16, background:"#ECFDF5", border:"1px solid #A7F3D0", borderRadius:12, padding:"14px 16px" }}>
              <p style={{ fontSize:12, fontWeight:700, color:C.success, marginBottom:8, textTransform:"uppercase", letterSpacing:.7 }}>✍️ Ügyfél aláírás</p>
              <p style={{ fontSize:12, color:C.textSub }}>Aláírva: {m.alairas.datum ? new Date(m.alairas.datum).toLocaleString("hu-HU") : "—"}</p>
              {m.alairas.dataUrl && <img src={m.alairas.dataUrl} alt="Aláírás" style={{ marginTop:8, maxWidth:"100%", maxHeight:100, background:"#fff", borderRadius:8, border:"1px solid #D1FAE5" }}/>}
            </div>
          )}
          <VbfAdminCard munkalapId={m.id} />
          <FelmeresFotokAdminCard munkalapId={m.id} userRole={userRole} />
        <FotokAdminCard munkalapId={m.id} />
          <FelhasznaltAnyagokCard m={m} />
          {/* Státusz */}
          <div style={{ padding:"16px" }}>
            <p style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, marginBottom:10 }}>Státusz módosítása</p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {["Folyamatban","Ütemezett","Kész","Meghiúsult","Megkezdésre Vár"].map(s=>{
                const cfg=STATUS_CFG[s]||{bg:"#F1F5F9",text:C.muted,dot:C.muted};
                return <button key={s} style={{ padding:"8px 14px", borderRadius:8, border:`1px solid ${m.status===s?cfg.dot:C.border}`, background:m.status===s?cfg.bg:"#fff", color:m.status===s?cfg.text:C.textSub, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:FONT }}>{s}</button>;
              })}
            </div>
          </div>
          {/* Műveletek */}
          <div style={{ padding:"0 16px 16px" }}>
            <p style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, marginBottom:10 }}>Műveletek</p>
            {[{icon:"✏️",label:"Szerkesztés"},{icon:"📄",label:"PDF export"},{icon:"👁",label:"Előnézet"}].map(a=>(
              <button key={a.label} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:10, border:"none", background:"#fff", color:C.text, cursor:"pointer", fontSize:14, marginBottom:8, textAlign:"left", fontFamily:FONT }}>
                {a.icon} {a.label}
              </button>
            ))}
            <button onClick={()=>onDelete&&onDelete(m)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:10, border:"none", background:"#FEF2F2", color:C.danger, cursor:"pointer", fontSize:14, marginBottom:8, textAlign:"left", fontFamily:FONT, fontWeight:600 }}>
              🗑️ Munkalap törlése
            </button>
            <button onClick={()=>setShowUjrakiosztas(true)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"12px 14px", borderRadius:10, border:"none", background:"#EFF6FF", color:C.accent, cursor:"pointer", fontSize:14, marginBottom:8, textAlign:"left", fontFamily:FONT, fontWeight:600 }}>
              ✏️ Újrakiosztás / Szerkesztés
            </button>
          </div>
        </div>
      )}
      {showUjrakiosztas && (
        <UjrakiosztasModal m={m} data={data} onClose={() => setShowUjrakiosztas(false)} onSave={(updates) => { onRefresh && onRefresh(updates); setShowUjrakiosztas(false); }} />
      )}

      {/* Tab 1 – Anyagok + Számlázás */}
      {tab===1&&(
        <div style={{ background:"#F1F5F9" }}>
          {(m.anyagok||[]).map((a,i)=>(
            <div key={i} style={{ padding:"14px 16px", borderBottom:"1px solid #D1D9E6", display:"flex", justifyContent:"space-between", background:"#F1F5F9" }}>
              <p style={{ fontWeight:600, fontSize:14, color:C.text, flex:1, paddingRight:16 }}>{a.nev}</p>
              <p style={{ fontWeight:700, fontSize:14, color:C.text, whiteSpace:"nowrap" }}>{a.menny} {a.egyseg}</p>
            </div>
          ))}
          {(m.anyagok||[]).length===0&&<div style={{ padding:"24px 16px", textAlign:"center", color:C.muted, fontSize:14 }}>Nincsenek anyagok</div>}

          {/* Számlázás – csak jogosultaknak */}
          {canSeePrice(userRole)&&(
            <div style={{ margin:16, background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:16 }}>
              <p style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, marginBottom:12 }}>Számlázás – {(m.items||[]).length} tétel</p>
              {(m.items||[]).map((it,i)=>{
                const n=it.qty*it.net, b=n*(1+it.vat/100);
                return(
                  <div key={i} style={{ padding:"10px 0", borderBottom:`1px solid ${C.border}` }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:14, fontWeight:600, color:C.text }}>{it.name}</span>
                      <span style={{ fontSize:14, fontWeight:700, color:C.text }}>{ft(b)}</span>
                    </div>
                    <p style={{ fontSize:12, color:C.muted }}>{it.qty} {it.unit} × {ft(it.net)} + {it.vat}% ÁFA</p>
                  </div>
                );
              })}
              {tot.brutto>0&&(
                <div style={{ marginTop:12 }}>
                  {[["Nettó összeg",tot.netto],["ÁFA összeg",tot.afa]].map(([l,v])=>(
                    <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:C.textSub, marginBottom:6 }}><span>{l}</span><span>{ft(v)}</span></div>
                  ))}
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:17, fontWeight:800, color:C.text, paddingTop:8, borderTop:`1px solid ${C.border}` }}>
                    <span>Bruttó összeg</span><span style={{ color:C.accent }}>{ft(tot.brutto)}</span>
                  </div>
                  <div style={{ display:"flex", gap:10, marginTop:14 }}>
                    <button style={{ flex:1, padding:"11px 0", borderRadius:10, border:`2px solid ${C.border}`, background:"#fff", color:C.text, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:FONT, fontSize:13 }}>
                      <Printer size={15}/>Díjbekérő
                    </button>
                    <button onClick={issueInvoice} disabled={saving} style={{ flex:1, padding:"11px 0", borderRadius:10, border:"none", background:C.success, color:"#fff", fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:FONT, fontSize:13 }}>
                      {saving?<Loader2 size={15} style={{ animation:"spin 1s linear infinite" }}/>:<><Send size={15}/>Számla</>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 2 – Felmérés */}
      {tab===2&&(
        <div style={{ background:"#F1F5F9" }}>
          {(() => {
            const f = m.felmeres||{};
            const mezok = [
              ["Csatlakozási pont",f.csatlakozasiPont],["Csatl. pont állapota",f.csatlPontAllapota],
              ["AC kábel terv. hossz (m)",f.acKabelHossz],["AC védelem típus",f.acVedelem],
              ["Komm. kábel hossza (m)",f.kommKabelHossz],["Inverter fal",f.inverterFal],
              ["Akkumulátor fal",f.akkuFal],["Akku kábel hossz (m)",f.akkuKabelHossz],
              ["Tető típus",f.tetoTipus],["Tetőszerkezet típus",f.tetoszerkezetTipus],
              ["Padlás",f.padlas],["Villámhárító",f.villamharitor],
              ["Tartószerkezet típus",f.tartoszerkezetTipus],["Pótcserép",f.potcserep],
              ["DC kábel hossz (m)",f.dcKabelHossz],["DC kábel nyomvonal",f.dcKabelNyomvonal],
              ["DC védelem típus",f.dcVedelem],["Tűzeseti kapcsoló",f.tuzKapcsolo],
              ["Panel elrendezés",f.panelElrendezes],["Felhordó eszköz",f.felhordoEszkoz],
              ["Engedélyeztetés",f.engedelyeztetes],["Visszwatt védelem",f.visszwatt],
              ["Megközelíthetőség",f.megkozelithetoseg],["Felmérés időpontja",f.felmeresIdopont],
            ].filter(([,v])=>v!==undefined&&v!=="");
            if(!mezok.length) return <div style={{ padding:"32px 16px", textAlign:"center", color:C.muted }}><Ruler size={32} style={{ opacity:.2, display:"block", margin:"0 auto 8px" }}/><p>Felmérés még nem történt</p></div>;
            return mezok.map(([label,value])=>(
              <div key={label} style={{ padding:"0 16px" }}>
                <p style={{ fontSize:12, color:"#64748B", paddingTop:10, marginBottom:4 }}>{label}</p>
                <div style={{ background:"#E8EDF5", borderRadius:6, padding:"10px 12px", marginBottom:2, fontSize:14, color:C.text, borderBottom:"1px solid #D1D9E6" }}>{String(value)}</div>
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ADMIN/PM/IRODA – ASZTALI NÉZET
// ═══════════════════════════════════════════════════════════════
function AdminDesktopDetail({ m, data, userRole, onDelete, onRefresh }) {
  const cl = data.ugyfelek?.find(u=>u.id===m.clientId);
  const as = USERS.find(u=>u.id===m.assigneeId);
  const tot = totals(m.items||[]);
  const [saving, setSaving] = useState(false);
  const [showUjrakiosztas, setShowUjrakiosztas] = useState(false);

  async function issueInvoice() {
    setSaving(true);
    await new Promise(r=>setTimeout(r,1200));
    setSaving(false);
    alert(`✅ Számla kiállítva!\n${m.id}\nBruttó: ${ft(tot.brutto)}`);
  }

  return (
    <div style={{ padding:"28px 32px", display:"grid", gridTemplateColumns:"1fr 360px", gap:24, fontFamily:FONT }}>
      <div>
        <Card style={{ padding:"22px 24px", marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                <span style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase" }}>Munkaszám</span>
                {m.cimke&&<CimkeBadge label={m.cimke} color={m.cimkeSzin||C.accent}/>}
              </div>
              <h2 style={{ fontFamily:FONT_HEADING, fontSize:24, fontWeight:800, color:C.text, margin:"4px 0" }}>{m.id}</h2>
              <p style={{ fontSize:15, color:C.text, fontWeight:600 }}>{m.projektMegnevezes||m.feladat||m.description}</p>
            </div>
            <StatusBadge s={m.status||"Ütemezett"}/>
          </div>
          <p style={{ fontSize:13.5, color:C.textSub, lineHeight:1.7 }}>{m.description}</p>
          <div style={{ display:"flex", gap:24, marginTop:16, flexWrap:"wrap" }}>
            <div><span style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:.8 }}>Dátum</span><p style={{ fontSize:13, fontWeight:600, color:C.text, marginTop:3 }}>{m.date}</p></div>
            {as&&<div><span style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:.8 }}>Szerelő</span><div style={{ display:"flex", alignItems:"center", gap:7, marginTop:3 }}><Avatar u={as} size={24}/><span style={{ fontSize:13, fontWeight:600, color:C.text }}>{as.name}</span></div></div>}
          </div>
          <MunkaIdoBontasCard m={m} />
        </Card>
        {canSeePrice(userRole)&&(
          <Card style={{ padding:"22px 24px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <h3 style={{ fontFamily:FONT_HEADING, fontSize:16, fontWeight:700, color:C.text }}>Számlázás – {(m.items||[]).length} tétel</h3>
              {tot.brutto>0&&<span style={{ fontWeight:800, fontSize:18, color:C.accent }}>{ft(tot.brutto)}</span>}
            </div>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead><tr style={{ borderBottom:`2px solid ${C.border}` }}>{["Megnevezés","Mennyiség","Nettó egységár","ÁFA","Bruttó összeg"].map(h=><th key={h} style={{ padding:"8px 12px", textAlign:h==="Megnevezés"?"left":"right", fontSize:11, fontWeight:700, letterSpacing:.7, color:C.muted, textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
              <tbody>
                {(m.items||[]).map((it,i)=>{ const n=it.qty*it.net, b=n*(1+it.vat/100); return(
                  <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:"12px 12px", fontWeight:600, color:C.text }}>{it.name}</td>
                    <td style={{ padding:"12px 12px", textAlign:"right", color:C.textSub }}>{it.qty} {it.unit}</td>
                    <td style={{ padding:"12px 12px", textAlign:"right", color:C.textSub }}>{ft(it.net)}</td>
                    <td style={{ padding:"12px 12px", textAlign:"right", color:C.textSub }}>{it.vat}%</td>
                    <td style={{ padding:"12px 12px", textAlign:"right", fontWeight:700, color:C.text }}>{ft(b)}</td>
                  </tr>
                );})}
              </tbody>
            </table>
            {(m.items||[]).length===0&&<div style={{ textAlign:"center", padding:"32px 0", color:C.muted }}><Euro size={32} style={{ opacity:.2, display:"block", margin:"0 auto 8px" }}/><p style={{ fontSize:13 }}>Még nincsenek tételek</p></div>}
            {tot.brutto>0&&(
              <div style={{ borderTop:`2px solid ${C.border}`, marginTop:12, paddingTop:16 }}>
                {[["Nettó összeg",tot.netto],["ÁFA összeg",tot.afa]].map(([l,v])=>(
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:C.textSub, marginBottom:6, padding:"0 12px" }}><span>{l}</span><span>{ft(v)}</span></div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:18, fontWeight:800, color:C.text, padding:"8px 12px 0", borderTop:`1px solid ${C.border}`, marginTop:6 }}>
                  <span>Bruttó összeg</span><span style={{ color:C.accent }}>{ft(tot.brutto)}</span>
                </div>
              </div>
            )}
            <div style={{ display:"flex", gap:12, marginTop:20 }}>
              <button style={{ flex:1, padding:"12px 0", borderRadius:11, border:`2px solid ${C.border}`, background:"#fff", color:C.text, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT }}><Printer size={16}/>Díjbekérő</button>
              <button onClick={issueInvoice} disabled={saving||(m.items||[]).length===0} style={{ flex:1, padding:"12px 0", borderRadius:11, border:"none", background:(m.items||[]).length?C.success:"#E2E8F0", color:"#fff", fontWeight:700, cursor:(m.items||[]).length?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT }}>
                {saving?<Loader2 size={16} style={{ animation:"spin 1s linear infinite" }}/>:<><Send size={16}/>Számla kiállítása</>}
              </button>
            </div>
          </Card>
        )}
      </div>
      {/* Jobb panel */}
      <div>
        {cl&&(
          <Card style={{ padding:"20px 22px", marginBottom:16 }}>
            <h4 style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase", marginBottom:14 }}>Ügyfél</h4>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontWeight:700, color:C.accent, fontSize:16 }}>{cl.name[0]}</span></div>
              <div><div style={{ fontWeight:700, fontSize:15, color:C.text }}>{cl.name}</div><div style={{ fontSize:12, color:C.muted }}>{cl.type}</div></div>
            </div>
            {[{icon:Phone,v:cl.phone},{icon:MapPin,v:cl.address}].map(({icon:Icon,v})=>(
              <div key={v} style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:13, color:C.textSub, marginBottom:8 }}><Icon size={14} style={{ flexShrink:0, marginTop:2 }} color={C.muted}/>{v}</div>
            ))}
          </Card>
        )}
        <Card style={{ padding:"20px 22px", marginBottom:16 }}>
          <h4 style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase", marginBottom:14 }}>Státusz módosítása</h4>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {["Folyamatban","Ütemezett","Kész","Meghiúsult","Megkezdésre Vár"].map(s=>{
              const cfg=STATUS_CFG[s]||{bg:"#F1F5F9",text:C.muted,dot:C.muted};
              return <button key={s} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${m.status===s?cfg.dot:C.border}`, background:m.status===s?cfg.bg:"#fff", color:m.status===s?cfg.text:C.textSub, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:FONT }}>{s}</button>;
            })}
          </div>
        </Card>
        <FelhasznaltAnyagokCard m={m} />
        <Card style={{ padding:"20px 22px", marginTop:16 }}>
          <h4 style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase", marginBottom:14 }}>Műveletek</h4>
          <button onClick={() => setShowUjrakiosztas(true)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:9, border:"none", background:"#EFF6FF", color:C.accent, cursor:"pointer", fontSize:13, marginBottom:4, textAlign:"left", fontFamily:FONT, fontWeight:600 }}>
            <Pencil size={15}/>Újrakiosztás / Szerkesztés
          </button>
          {[{icon:FileText,label:"PDF export"},{icon:Eye,label:"Előnézet"}].map(a=>(
            <button key={a.label} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:9, border:"none", background:"transparent", color:C.textSub, cursor:"pointer", fontSize:13, marginBottom:4, textAlign:"left", fontFamily:FONT }}>
              <a.icon size={15}/>{a.label}
            </button>
          ))}
          <button onClick={()=>onDelete&&onDelete(m)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:9, border:"none", background:"#FEF2F2", color:C.danger, cursor:"pointer", fontSize:13, marginBottom:4, textAlign:"left", fontFamily:FONT, fontWeight:600 }}>
            <Trash2 size={15}/>Munkalap törlése
          </button>
        </Card>
      </div>
      {showUjrakiosztas && (
        <UjrakiosztasModal
          m={m} data={data}
          onClose={() => setShowUjrakiosztas(false)}
          onSave={(updates) => { onRefresh && onRefresh(updates); setShowUjrakiosztas(false); }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TELEPÍTŐ NÉZET
// ═══════════════════════════════════════════════════════════════
function TelepItoDetail({ m, data }) {
  const [tab, setTab] = useState(0);
  const client = data.ugyfelek.find(u=>u.id===m.clientId);
  const FieldRow = ({label,value}) => value ? (
    <div style={{ padding:"0 16px" }}>
      <p style={{ fontSize:12, color:"#64748B", paddingTop:10, marginBottom:4 }}>{label}</p>
      <div style={{ background:"#E8EDF5", borderRadius:6, padding:"10px 12px", marginBottom:2, fontSize:14, color:C.text, borderBottom:"1px solid #D1D9E6" }}>{value}</div>
    </div>
  ) : null;

  return (
    <div style={{ fontFamily:FONT, background:"#F1F5F9", minHeight:"100vh" }}>
      <DetailHeader m={m} client={client} isMobile />
      <div style={{ display:"flex", background:"#2C4A6E" }}>
        {["📄","📦","📋"].map((ic,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{ flex:1, padding:"12px 0", border:"none", background:"transparent", color:tab===i?"#fff":"#94A3B8", cursor:"pointer", fontSize:20, display:"flex", alignItems:"center", justifyContent:"center", borderBottom:tab===i?"3px solid #fff":"3px solid transparent" }}>
            {ic}
          </button>
        ))}
      </div>
      {tab===0&&(
        <div style={{ background:"#F1F5F9" }}>
          <FieldRow label="Projekt megnevezés" value={m.projektMegnevezes}/>
          <FieldRow label="Feladat" value={m.feladat}/>
          <FieldRow label="Ügyszám" value={m.ugyszam}/>
          <FieldRow label="Kapcsolattartó" value={client?.name}/>
          <FieldRow label="Telefonszám" value={client?.phone}/>
          <FieldRow label="E-mail cím" value={client?.email}/>
          <FieldRow label="Értékesítő" value={m.ertekesito}/>
          <div style={{ padding:"16px" }}>
            <button style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 18px", background:"#fff", border:"2px solid #E2E8F0", borderRadius:10, cursor:"pointer", fontSize:14, fontFamily:FONT, marginBottom:10, color:C.text }}>💬 Információk</button>
            <button style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 18px", background:"#fff", border:"2px solid #E2E8F0", borderRadius:10, cursor:"pointer", fontSize:14, fontFamily:FONT, marginBottom:10, color:C.text }}>📏 Felmérés</button>
            <button style={{ width:"100%", padding:"13px", borderRadius:10, border:"none", background:C.accent, color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:FONT, marginBottom:10 }}>Munkalap átvétel</button>
            <button style={{ width:"100%", padding:"13px", borderRadius:10, border:"none", background:"#93C5FD", color:"#1e3a5f", fontWeight:600, fontSize:15, cursor:"pointer", fontFamily:FONT, marginBottom:10 }}>Kiírt anyag megrendelése</button>
            <button style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background:"#22C55E", color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:FONT }}>Megkezdés →</button>
          </div>
        </div>
      )}
      {tab===1&&(
        <div style={{ background:"#F1F5F9" }}>
          {(m.anyagok||[]).map((a,i)=>(
            <div key={i} style={{ padding:"14px 16px", borderBottom:"1px solid #D1D9E6", display:"flex", justifyContent:"space-between" }}>
              <p style={{ fontWeight:600, fontSize:14, color:C.text, flex:1, paddingRight:16 }}>{a.nev}</p>
              <p style={{ fontWeight:700, fontSize:14, color:C.text }}>{a.menny} {a.egyseg}</p>
            </div>
          ))}
          {(m.anyagok||[]).length===0&&<div style={{ padding:"32px 16px", textAlign:"center", color:C.muted }}><Package size={32} style={{ opacity:.2, display:"block", margin:"0 auto 8px" }}/><p>Nincsenek anyagok</p></div>}
        </div>
      )}
      {tab===2&&(
        <div style={{ background:"#F1F5F9" }}>
          {(() => {
            const f=m.felmeres||{};
            const mezok=[["Csatlakozási pont",f.csatlakozasiPont],["Csatl. pont állapota",f.csatlPontAllapota],["AC kábel hossz (m)",f.acKabelHossz],["AC védelem típus",f.acVedelem],["Komm. kábel hossza (m)",f.kommKabelHossz],["Inverter fal",f.inverterFal],["Akkumulátor fal",f.akkuFal],["Akku kábel hossz (m)",f.akkuKabelHossz],["Tető típus",f.tetoTipus],["Tetőszerkezet típus",f.tetoszerkezetTipus],["Padlás",f.padlas],["Villámhárító",f.villamharitor],["Tartószerkezet típus",f.tartoszerkezetTipus],["Pótcserép",f.potcserep],["DC kábel hossz (m)",f.dcKabelHossz],["DC kábel nyomvonal",f.dcKabelNyomvonal],["DC védelem típus",f.dcVedelem],["Tűzeseti kapcsoló",f.tuzKapcsolo],["Panel elrendezés",f.panelElrendezes],["Felhordó eszköz",f.felhordoEszkoz],["Engedélyeztetés",f.engedelyeztetes],["Visszwatt védelem",f.visszwatt],["Megközelíthetőség",f.megkozelithetoseg],["Felmérés időpontja",f.felmeresIdopont]].filter(([,v])=>v!==undefined&&v!=="");
            if(!mezok.length) return <div style={{ padding:"32px 16px", textAlign:"center", color:C.muted }}><Ruler size={32} style={{ opacity:.2, display:"block", margin:"0 auto 8px" }}/><p>Felmérés még nem történt</p></div>;
            return mezok.map(([label,value])=><FieldRow key={label} label={label} value={String(value)}/>);
          })()}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FŐ EXPORT
// ═══════════════════════════════════════════════════════════════
export function MunkalapDetail({ m, data, userRole, onBack, onDelete, onRefresh }) {
  const isMobile = useIsMobile();
  if (userRole === "Telepítő") return <TelepItoMunkalap m={m} data={data} onBack={onBack||(() => window.history.back())} />;
  if (isMobile) return <AdminMobileDetail m={m} data={data} userRole={userRole} onDelete={onDelete} onRefresh={onRefresh} />;
  return <AdminDesktopDetail m={m} data={data} userRole={userRole} onDelete={onDelete} onRefresh={onRefresh} />;
}
