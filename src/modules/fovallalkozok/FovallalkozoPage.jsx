import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, ToggleLeft, ToggleRight } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../lib/constants.js";
import { ft } from "../../lib/helpers.js";
import {
  loadFovallalkozok, createFovallalkozo, updateFovallalkozo, deleteFovallalkozo,
  loadSzabalyok, createSzabaly, updateSzabaly, deleteSzabaly, getSzabalyokByFovallalkozo,
} from "./fovallalkozo.service.js";
import {
  CSAPAT_BER_TIPUSOK, UTIKOLTSÉG_TIPUSOK, ANYAGKOLTSÉG_MODJAI, KARTÉRÍTÉS_MODJAI,
} from "./fovallalkozo.schema.js";
import { BEVETELI_TETEL_TIPUSOK } from "../munkatipusok/munkatipus.schema.js";
import { PROJEKT_TIPUSOK } from "../projektek/projekt.schema.js";
import { getAktivMunkatipusok } from "../munkatipusok/munkatipus.service.js";

const inp = { width:"100%", boxSizing:"border-box", padding:"8px 11px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none" };
const FL = ({ label, children, half }) => (
  <div style={{ gridColumn: half?"span 1":"span 2" }}>
    <label style={{ fontSize:10, fontWeight:700, color:"#64748B", display:"block", marginBottom:3, textTransform:"uppercase", letterSpacing:.6 }}>{label}</label>
    {children}
  </div>
);

// ─── Elszámolási szabály form ─────────────────────────────────
function SzabalyForm({ szabaly, fovallalkoziId, onSave, onClose }) {
  const isNew = !szabaly?.id;
  const munkatipusok = getAktivMunkatipusok();
  const [f, setF] = useState({
    fovallalkoziId,
    munkatipus:          szabaly?.munkatipus          || "",
    aktiv:               szabaly?.aktiv               ?? true,
    nettoBevitel:        szabaly?.nettoBevitel         || 0,
    csapatBerTipus:      szabaly?.csapatBerTipus       || "fix",
    csapatBerOsszeg:     szabaly?.csapatBerOsszeg      || 0,
    utikoltsegTipus:     szabaly?.utikoltsegTipus      || "oda_vissza",
    utikoltsegFtKm:      szabaly?.utikoltsegFtKm       || 0,
    kmKuszob:            szabaly?.kmKuszob              || 0,
    kmFixOsszeg:         szabaly?.kmFixOsszeg           || 0,
    tetelArak:           szabaly?.tetelArak             || {},
    anyagkoltségModja:   szabaly?.anyagkoltségModja    || "tényleges",
    anyagkoltségErtek:   szabaly?.anyagkoltségErtek    || 0,
    kartériétasModja:    szabaly?.kartériétasModja     || "tényleges",
    kartériétasLimit:    szabaly?.kartériétasLimit     || 0,
    megjegyzes:          szabaly?.megjegyzes           || "",
  });
  const u = (k, v) => setF(p => ({...p, [k]:v}));

  return (
    <div style={{ position:"fixed", inset:0, zIndex:2100, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ background:"#fff", borderRadius:14, width:"100%", maxWidth:560, padding:"24px", fontFamily:FONT, maxHeight:"90vh", overflowY:"auto" }}>
        <h3 style={{ fontFamily:FONT_HEADING, fontSize:16, fontWeight:800, margin:"0 0 18px" }}>{isNew?"Új elszámolási szabály":"Szabály szerkesztése"}</h3>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px 14px" }}>
          <FL label="Munkatípus (üres = általános)">
            <select value={f.munkatipus} onChange={e=>u("munkatipus",e.target.value)} style={inp}>
              <option value="">— Minden munkatípusra —</option>
              {munkatipusok.map(t=><option key={t.id} value={t.id}>{t.nev}</option>)}
              {/* Fallback ha nincs munkatípus */}
              {munkatipusok.length === 0 && PROJEKT_TIPUSOK.map(t=><option key={t}>{t}</option>)}
            </select>
          </FL>
          <FL label="Aktív" half><label style={{ display:"flex", alignItems:"center", gap:8, paddingTop:8, cursor:"pointer" }}>
            <input type="checkbox" checked={f.aktiv} onChange={e=>u("aktiv",e.target.checked)} style={{ width:16,height:16 }}/>
            <span style={{ fontSize:13 }}>{f.aktiv?"Aktív":"Inaktív"}</span>
          </label></FL>

          <FL label="Nettó bevétel (Ft)">
            <input type="number" value={f.nettoBevitel} onChange={e=>u("nettoBevitel",Number(e.target.value))} style={inp}/>
          </FL>

          <FL label="Csapat bér típusa" half>
            <select value={f.csapatBerTipus} onChange={e=>u("csapatBerTipus",e.target.value)} style={inp}>
              {CSAPAT_BER_TIPUSOK.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </FL>
          <FL label={`Csapat bér (${f.csapatBerTipus==="%"?"%":"Ft"})`} half>
            <input type="number" value={f.csapatBerOsszeg} onChange={e=>u("csapatBerOsszeg",Number(e.target.value))} style={inp}/>
          </FL>

          <FL label="Km-elszámolás típusa" half>
            <select value={f.utikoltsegTipus} onChange={e=>u("utikoltsegTipus",e.target.value)} style={inp}>
              {UTIKOLTSÉG_TIPUSOK.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </FL>
          {f.utikoltsegTipus !== "nincs" && f.utikoltsegTipus !== "fix_kiszallas" && f.utikoltsegTipus !== "kezi" && (
            <FL label="Ft/km díj (0 = fővállalkozó alapja)" half>
              <input type="number" value={f.utikoltsegFtKm} onChange={e=>u("utikoltsegFtKm",Number(e.target.value))} style={inp}/>
            </FL>
          )}
          {f.utikoltsegTipus === "kuszob_folott" && (
            <FL label="Küszöb (km) – ez alatt nincs elszámolás">
              <input type="number" value={f.kmKuszob} onChange={e=>u("kmKuszob",Number(e.target.value))} placeholder="pl. 50" style={inp}/>
            </FL>
          )}
          {f.utikoltsegTipus === "fix_kiszallas" && (
            <FL label="Fix kiszállási díj (Ft)">
              <input type="number" value={f.kmFixOsszeg} onChange={e=>u("kmFixOsszeg",Number(e.target.value))} placeholder="0" style={inp}/>
            </FL>
          )}

          <FL label="Anyagköltség módja" half>
            <select value={f.anyagkoltségModja} onChange={e=>u("anyagkoltségModja",e.target.value)} style={inp}>
              {ANYAGKOLTSÉG_MODJAI.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </FL>
          {f.anyagkoltségModja!=="tényleges"&&f.anyagkoltségModja!=="kézi"&&(
            <FL label={f.anyagkoltségModja==="kalkulált%"?"Anyag %":"Fix összeg (Ft)"} half>
              <input type="number" value={f.anyagkoltségErtek} onChange={e=>u("anyagkoltségErtek",Number(e.target.value))} style={inp}/>
            </FL>
          )}

          <FL label="Kártérítés módja" half>
            <select value={f.kartériétasModja} onChange={e=>u("kartériétasModja",e.target.value)} style={inp}>
              {KARTÉRÍTÉS_MODJAI.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </FL>
          {f.kartériétasModja==="limit%"&&(
            <FL label="Limit (%)" half>
              <input type="number" value={f.kartériétasLimit} onChange={e=>u("kartériétasLimit",Number(e.target.value))} style={inp}/>
            </FL>
          )}

          <FL label="Megjegyzés">
            <input value={f.megjegyzes} onChange={e=>u("megjegyzes",e.target.value)} style={inp}/>
          </FL>

          {/* Tételes árak override */}
          <div style={{ gridColumn:"span 2", paddingTop:10, borderTop:"1px solid #E2E8F0" }}>
            <p style={{ fontSize:11, fontWeight:700, color:"#64748B", marginBottom:8 }}>
              Tételes árak (felülírja a munkatípus definíciót)
              <span style={{ fontWeight:400, marginLeft:6 }}>– csak ha ettől a fővállalkozótól eltérő összeg jár</span>
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {BEVETELI_TETEL_TIPUSOK.filter(t => t.id !== "km_elszamolas").map(t => (
                <div key={t.id}>
                  <label style={{ fontSize:10, color:"#64748B", display:"block", marginBottom:2 }}>{t.label} (Ft, 0 = nem ír felül)</label>
                  <input type="number"
                    value={f.tetelArak?.[t.id] || ""}
                    onChange={e => u("tetelArak", { ...f.tetelArak, [t.id]: e.target.value === "" ? undefined : Number(e.target.value) })}
                    placeholder="0"
                    style={{...inp, padding:"6px 10px"}}/>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display:"flex", gap:10, marginTop:18, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"8px 16px", border:"1.5px solid #E2E8F0", borderRadius:8, background:"#fff", cursor:"pointer", fontFamily:FONT }}>Mégse</button>
          <button onClick={()=>onSave(f)} style={{ padding:"8px 18px", background:"#2563EB", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontFamily:FONT }}>
            {isNew?"Létrehozás":"Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fővállalkozó sor ─────────────────────────────────────────
function FvSor({ fv, onUpdate, onDelete }) {
  const [open, setOpen]     = useState(false);
  const [editFv, setEditFv] = useState(false);
  const [ujSz, setUjSz]     = useState(false);
  const [szerkSz, setSzerkSz] = useState(null);
  const [fvForm, setFvForm] = useState({ nev:fv.nev, rovidites:fv.rovidites||"", alapUtikoltsegFtKm:fv.alapUtikoltsegFtKm||80, megjegyzes:fv.megjegyzes||"" });
  const [szabalyok, setSzabalyok] = useState(() => getSzabalyokByFovallalkozo(fv.id));

  function refresh() { setSzabalyok(getSzabalyokByFovallalkozo(fv.id)); }

  function handleSzSave(data) {
    if (szerkSz?.id) updateSzabaly(szerkSz.id, data);
    else createSzabaly({ ...data, fovallalkoziId: fv.id });
    refresh();
    setSzerkSz(null);
    setUjSz(false);
  }

  return (
    <div style={{ background:"#fff", border:`1.5px solid ${fv.aktiv?"#E2E8F0":"#F1F5F9"}`, borderRadius:12, marginBottom:10, overflow:"hidden", opacity:fv.aktiv?1:.65 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", cursor:"pointer" }} onClick={()=>setOpen(o=>!o)}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <span style={{ fontWeight:700, fontSize:15 }}>{fv.nev}</span>
            {fv.rovidites && <span style={{ fontSize:11, background:"#EFF6FF", color:"#2563EB", padding:"2px 9px", borderRadius:20, fontWeight:700 }}>[{fv.rovidites}]</span>}
            <span style={{ fontSize:11, background:fv.aktiv?"#DCFCE7":"#F1F5F9", color:fv.aktiv?"#166534":"#94A3B8", padding:"2px 9px", borderRadius:20, fontWeight:600 }}>{fv.aktiv?"Aktív":"Inaktív"}</span>
            <span style={{ fontSize:12, color:"#64748B" }}>Alap: {fv.alapUtikoltsegFtKm||80} Ft/km · {szabalyok.length} szabály</span>
          </div>
          {fv.megjegyzes && <p style={{ fontSize:11, color:"#94A3B8", margin:"2px 0 0" }}>{fv.megjegyzes}</p>}
        </div>
        <button onClick={e=>{e.stopPropagation();onUpdate(fv.id,{aktiv:!fv.aktiv});}} style={{ padding:"5px 10px", border:"1px solid #E2E8F0", borderRadius:7, background:"#fff", cursor:"pointer", fontSize:11, fontFamily:FONT }}>
          {fv.aktiv?"Inaktivál":"Aktivál"}
        </button>
        <button onClick={e=>{e.stopPropagation();setEditFv(true);}} style={{ padding:"5px 10px", border:"none", background:"#EFF6FF", color:"#2563EB", borderRadius:7, cursor:"pointer", fontSize:11, fontFamily:FONT }}>Szerkeszt</button>
        <button onClick={e=>{e.stopPropagation();onDelete(fv.id);}} style={{ padding:"5px 8px", border:"none", background:"#FEF2F2", color:"#DC2626", borderRadius:7, cursor:"pointer" }}><Trash2 size={13}/></button>
        {open?<ChevronUp size={16} color="#94A3B8"/>:<ChevronDown size={16} color="#94A3B8"/>}
      </div>

      {/* Szerkesztés form */}
      {editFv && (
        <div style={{ borderTop:"1px solid #F1F5F9", padding:"14px 18px", background:"#F8FAFC", display:"grid", gridTemplateColumns:"2fr 0.7fr 1fr 2fr", gap:10 }}>
          <div><label style={{ fontSize:10, fontWeight:700, color:"#64748B", display:"block", marginBottom:3 }}>Név</label>
            <input value={fvForm.nev} onChange={e=>setFvForm(p=>({...p,nev:e.target.value}))} style={inp}/></div>
          <div><label style={{ fontSize:10, fontWeight:700, color:"#64748B", display:"block", marginBottom:3 }}>Rövidítés (max 4)</label>
            <input value={fvForm.rovidites||""} onChange={e=>setFvForm(p=>({...p,rovidites:e.target.value.toUpperCase().slice(0,4)}))} placeholder="pl. GH" maxLength={4} style={inp}/></div>
          <div><label style={{ fontSize:10, fontWeight:700, color:"#64748B", display:"block", marginBottom:3 }}>Alap Ft/km</label>
            <input type="number" value={fvForm.alapUtikoltsegFtKm} onChange={e=>setFvForm(p=>({...p,alapUtikoltsegFtKm:Number(e.target.value)}))} style={inp}/></div>
          <div><label style={{ fontSize:10, fontWeight:700, color:"#64748B", display:"block", marginBottom:3 }}>Megjegyzés</label>
            <input value={fvForm.megjegyzes} onChange={e=>setFvForm(p=>({...p,megjegyzes:e.target.value}))} style={inp}/></div>
          <div style={{ gridColumn:"span 4", display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button type="button" onClick={()=>setEditFv(false)} style={{ padding:"7px 14px", border:"1.5px solid #E2E8F0", borderRadius:8, background:"#fff", cursor:"pointer", fontFamily:FONT }}>Mégse</button>
            <button type="button" onClick={()=>{onUpdate(fv.id,fvForm);setEditFv(false);}} style={{ padding:"7px 14px", background:"#059669", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontFamily:FONT }}>Mentés</button>
          </div>
        </div>
      )}

      {/* Szabályok */}
      {open && (
        <div style={{ borderTop:"1px solid #F1F5F9", padding:"14px 18px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <span style={{ fontSize:12, fontWeight:700, color:"#374151" }}>Elszámolási szabályok ({szabalyok.length})</span>
            <button onClick={()=>setUjSz(true)} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", background:"#2563EB", color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontWeight:600, fontSize:12, fontFamily:FONT }}>
              <Plus size={12}/> Új szabály
            </button>
          </div>
          {szabalyok.length === 0
            ? <p style={{ fontSize:12, color:"#94A3B8", fontStyle:"italic" }}>Még nincs szabály – adj hozzá az „Új szabály" gombbal</p>
            : szabalyok.map(sz => (
              <div key={sz.id} style={{ background:"#F8FAFC", border:"1px solid #E2E8F0", borderRadius:9, padding:"10px 14px", marginBottom:6, display:"flex", alignItems:"flex-start", gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:13 }}>{sz.munkatipus || "Általános (minden típus)"}</span>
                    <span style={{ fontSize:10, background:sz.aktiv?"#DCFCE7":"#F1F5F9", color:sz.aktiv?"#166534":"#94A3B8", padding:"1px 7px", borderRadius:20, fontWeight:600 }}>{sz.aktiv?"Aktív":"Inaktív"}</span>
                  </div>
                  <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                    {[
                      ["Bevétel", ft(sz.nettoBevitel)],
                      ["Csapat bér", `${CSAPAT_BER_TIPUSOK.find(t=>t.id===sz.csapatBerTipus)?.label||"—"}: ${sz.csapatBerTipus==="%"?sz.csapatBerOsszeg+"%":ft(sz.csapatBerOsszeg)}`],
                      ["Útiköltség", UTIKOLTSÉG_TIPUSOK.find(t=>t.id===sz.utikoltsegTipus)?.label||"—"],
                      ["Anyag", ANYAGKOLTSÉG_MODJAI.find(t=>t.id===sz.anyagkoltségModja)?.label||"—"],
                    ].map(([l,v])=>(
                      <span key={l} style={{ fontSize:11, color:"#475569" }}><b>{l}:</b> {v}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                  <button onClick={()=>setSzerkSz(sz)} style={{ padding:"4px 8px", background:"#EFF6FF", color:"#2563EB", border:"none", borderRadius:6, cursor:"pointer", fontSize:11 }}>Szerkeszt</button>
                  <button onClick={()=>{ deleteSzabaly(sz.id); refresh(); }} style={{ padding:"4px 7px", background:"#FEF2F2", color:"#DC2626", border:"none", borderRadius:6, cursor:"pointer" }}><Trash2 size={11}/></button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {(ujSz || szerkSz) && (
        <SzabalyForm
          szabaly={szerkSz}
          fovallalkoziId={fv.id}
          onSave={handleSzSave}
          onClose={()=>{ setUjSz(false); setSzerkSz(null); }}
        />
      )}
    </div>
  );
}

// ─── Fő oldal ─────────────────────────────────────────────────
export default function FovallalkozoPage({ userRole }) {
  const [fvk,    setFvk]    = useState(() => loadFovallalkozok());
  const [ujOpen, setUjOpen] = useState(false);
  const [ujForm, setUjForm] = useState({ nev:"", rovidites:"", alapUtikoltsegFtKm:80, megjegyzes:"" });

  useEffect(()=>{
    const fn = e => { if(["fovallalkozok","elszamolasi_szabalyok"].includes(e.detail?.collection)) setFvk(loadFovallalkozok()); };
    window.addEventListener("crm-db-updated", fn);
    return ()=>window.removeEventListener("crm-db-updated", fn);
  },[]);

  function handleCreate() {
    if (!ujForm.nev.trim()) return;
    createFovallalkozo(ujForm);
    setFvk(loadFovallalkozok());
    setUjOpen(false);
    setUjForm({ nev:"", rovidites:"", alapUtikoltsegFtKm:80, megjegyzes:"" });
  }

  const isAdmin = ["Admin","Projektmenedzser"].includes(userRole);

  return (
    <div style={{ padding:"24px 28px", fontFamily:FONT, maxWidth:900 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:FONT_HEADING, fontSize:22, fontWeight:800, margin:"0 0 4px" }}>🏢 Fővállalkozók & Elszámolási szabályok</h1>
          <p style={{ fontSize:13, color:"#64748B", margin:0 }}>Fővállalkozónként eltérő elszámolási szabályok kezelése</p>
        </div>
        {isAdmin && (
          <button onClick={()=>setUjOpen(true)} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", background:"#2563EB", color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:FONT }}>
            <Plus size={15}/> Új fővállalkozó
          </button>
        )}
      </div>

      {fvk.length === 0 && !ujOpen && (
        <div style={{ textAlign:"center", padding:"60px 0", color:"#94A3B8" }}>
          <p style={{ fontSize:15, fontWeight:600 }}>Még nincs fővállalkozó rögzítve</p>
          <p style={{ fontSize:13, marginTop:6 }}>Az „Új fővállalkozó" gombbal hozd létre az elsőt</p>
        </div>
      )}

      {fvk.map(fv => (
        <FvSor key={fv.id} fv={fv}
          onUpdate={(id,u)=>{ updateFovallalkozo(id,u); setFvk(loadFovallalkozok()); }}
          onDelete={(id)=>{ if(window.confirm("Törlöd ezt a fővállalkozót?")){ deleteFovallalkozo(id); setFvk(loadFovallalkozok()); } }}
        />
      ))}

      {ujOpen && (
        <div style={{ background:"#F0F9FF", border:"2px solid #93C5FD", borderRadius:12, padding:"18px", marginTop:12 }}>
          <p style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>Új fővállalkozó adatai</p>
          <div style={{ display:"grid", gridTemplateColumns:"2fr 0.7fr 1fr 2fr", gap:10, marginBottom:12 }}>
            <div><label style={{ fontSize:10, fontWeight:700, color:"#64748B", display:"block", marginBottom:3 }}>Név *</label>
              <input value={ujForm.nev} onChange={e=>setUjForm(p=>({...p,nev:e.target.value}))} placeholder="pl. Green-Home Kft." style={inp}/></div>
            <div><label style={{ fontSize:10, fontWeight:700, color:"#64748B", display:"block", marginBottom:3 }}>Rövidítés (max 4)</label>
              <input value={ujForm.rovidites||""} onChange={e=>setUjForm(p=>({...p,rovidites:e.target.value.toUpperCase().slice(0,4)}))} placeholder="pl. GH" maxLength={4} style={inp}/></div>
            <div><label style={{ fontSize:10, fontWeight:700, color:"#64748B", display:"block", marginBottom:3 }}>Alap Ft/km</label>
              <input type="number" value={ujForm.alapUtikoltsegFtKm} onChange={e=>setUjForm(p=>({...p,alapUtikoltsegFtKm:Number(e.target.value)}))} style={inp}/></div>
            <div><label style={{ fontSize:10, fontWeight:700, color:"#64748B", display:"block", marginBottom:3 }}>Megjegyzés</label>
              <input value={ujForm.megjegyzes} onChange={e=>setUjForm(p=>({...p,megjegyzes:e.target.value}))} style={inp}/></div>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button type="button" onClick={()=>setUjOpen(false)} style={{ padding:"8px 16px", border:"1.5px solid #E2E8F0", borderRadius:8, background:"#fff", cursor:"pointer", fontFamily:FONT }}>Mégse</button>
            <button type="button" onClick={handleCreate} disabled={!ujForm.nev.trim()} style={{ padding:"8px 18px", background:ujForm.nev.trim()?"#2563EB":"#CBD5E1", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontFamily:FONT }}>Létrehozás</button>
          </div>
        </div>
      )}
    </div>
  );
}
