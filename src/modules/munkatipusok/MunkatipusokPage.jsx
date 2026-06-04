import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, ToggleLeft } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../lib/constants.js";
import { ft } from "../../lib/helpers.js";
import { loadMunkatipusok, saveMunkatipusok, createMunkatipus, updateMunkatipus, deleteMunkatipus } from "./munkatipus.service.js";
import { ARLOGIKA_TIPUSOK, BEVETELI_TETEL_TIPUSOK, MUNKATIPUS_BEVETELI_TETEL_SCHEMA } from "./munkatipus.schema.js";

const inp = { width:"100%", boxSizing:"border-box", padding:"8px 11px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none" };

// ─── Bevételi tétel szerkesztő egy sorra ─────────────────────
function TetelSor({ tetel, onChange, onDelete }) {
  const u = (k, v) => onChange({ ...tetel, [k]: v });
  return (
    <div style={{ background:C.bg, border:"1px solid #E2E8F0", borderRadius:9, padding:"10px 12px", marginBottom:8 }}>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1.5fr 1.5fr auto", gap:8, alignItems:"center" }}>
        <div>
          <label style={{ fontSize:10, fontWeight:700, color:C.muted, display:"block", marginBottom:3 }}>Tétel típusa</label>
          <select value={tetel.tetelTipusId} onChange={e=>u("tetelTipusId",e.target.value)} style={inp}>
            {BEVETELI_TETEL_TIPUSOK.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize:10, fontWeight:700, color:C.muted, display:"block", marginBottom:3 }}>Árlogika</label>
          <select value={tetel.arlogikaTipus} onChange={e=>u("arlogikaTipus",e.target.value)} style={inp}>
            {ARLOGIKA_TIPUSOK.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize:10, fontWeight:700, color:C.muted, display:"block", marginBottom:3 }}>
            {tetel.arlogikaTipus === "darab_egysegar" ? "Egységár (Ft)" :
             tetel.arlogikaTipus === "fix_osszeg"    ? "Fix összeg (Ft)" : "Érték"}
          </label>
          {tetel.arlogikaTipus === "tartomany_fix" ? (
            <p style={{ fontSize:11, color:C.muted, paddingTop:8 }}>Lent szerkeszthető</p>
          ) : tetel.arlogikaTipus === "kezi" ? (
            <p style={{ fontSize:11, color:C.muted, paddingTop:8 }}>Kézi bevitel</p>
          ) : (
            <input type="number" value={tetel.arlogikaTipus==="darab_egysegar"?tetel.egysegAr:tetel.fixOsszeg}
              onChange={e=>u(tetel.arlogikaTipus==="darab_egysegar"?"egysegAr":"fixOsszeg",Number(e.target.value))}
              style={inp}/>
          )}
        </div>
        <button onClick={onDelete} style={{ padding:"6px 8px", background:C.dangerLight, color:C.danger, border:"none", borderRadius:7, cursor:"pointer", marginTop:14 }}>
          <Trash2 size={13}/>
        </button>
      </div>

      {/* Tartomány szerkesztő */}
      {tetel.arlogikaTipus === "tartomany_fix" && (
        <div style={{ marginTop:10, paddingTop:10, borderTop:"1px solid #E2E8F0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.muted }}>Darabszám tartományok</span>
            <button onClick={()=>u("tartomanyok",[...(tetel.tartomanyok||[]),{tol:1,ig:999,ar:0}])}
              style={{ fontSize:11, padding:"3px 10px", background:C.accentLight, color:C.accent, border:"none", borderRadius:6, cursor:"pointer" }}>
              + Tartomány
            </button>
          </div>
          {(tetel.tartomanyok||[]).map((tar,i)=>(
            <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1.5fr auto", gap:6, marginBottom:5, alignItems:"center" }}>
              <div>
                <label style={{ fontSize:9, color:C.muted }}>Tól (db)</label>
                <input type="number" value={tar.tol} onChange={e=>{const t=[...tetel.tartomanyok];t[i]={...t[i],tol:Number(e.target.value)};u("tartomanyok",t);}} style={{...inp,padding:"5px 8px"}}/>
              </div>
              <div>
                <label style={{ fontSize:9, color:C.muted }}>Ig (db)</label>
                <input type="number" value={tar.ig===999?"":tar.ig} placeholder="végtelen"
                  onChange={e=>{const t=[...tetel.tartomanyok];t[i]={...t[i],ig:e.target.value?Number(e.target.value):999};u("tartomanyok",t);}} style={{...inp,padding:"5px 8px"}}/>
              </div>
              <div>
                <label style={{ fontSize:9, color:C.muted }}>Ár (Ft)</label>
                <input type="number" value={tar.ar} onChange={e=>{const t=[...tetel.tartomanyok];t[i]={...t[i],ar:Number(e.target.value)};u("tartomanyok",t);}} style={{...inp,padding:"5px 8px"}}/>
              </div>
              <button onClick={()=>u("tartomanyok",tetel.tartomanyok.filter((_,j)=>j!==i))}
                style={{ padding:"5px 7px", background:C.dangerLight, color:C.danger, border:"none", borderRadius:6, cursor:"pointer", marginTop:14 }}>
                <Trash2 size={11}/>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Munkatípus sor ───────────────────────────────────────────
function MtSor({ mt, onSave, onDelete }) {
  const [open, setOpen]   = useState(false);
  const [edit, setEdit]   = useState(false);
  const [form, setForm]   = useState({ nev:mt.nev, leiras:mt.leiras||"", aktiv:mt.aktiv??true, beveteliTetelek:mt.beveteliTetelek||[] });

  function addTetel() {
    const uj = { ...MUNKATIPUS_BEVETELI_TETEL_SCHEMA, id:`bt_${Date.now()}`, tetelTipusId:"napelem_telepites" };
    setForm(p => ({ ...p, beveteliTetelek:[...p.beveteliTetelek, uj] }));
  }
  function updateTetel(idx, tetel) {
    setForm(p => { const t=[...p.beveteliTetelek]; t[idx]=tetel; return {...p,beveteliTetelek:t}; });
  }
  function deleteTetel(idx) {
    setForm(p => ({ ...p, beveteliTetelek:p.beveteliTetelek.filter((_,i)=>i!==idx) }));
  }

  return (
    <div style={{ background:"#fff", border:`1.5px solid ${mt.aktiv?C.border:C.bg}`, borderRadius:12, marginBottom:10, overflow:"hidden", opacity:mt.aktiv?1:.65 }}>
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 18px", cursor:"pointer" }} onClick={()=>setOpen(o=>!o)}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontWeight:700, fontSize:14 }}>{mt.nev}</span>
            <span style={{ fontSize:11, background:mt.aktiv?C.successLight:C.bg, color:mt.aktiv?C.success:C.muted, padding:"2px 9px", borderRadius:20, fontWeight:600 }}>{mt.aktiv?"Aktív":"Inaktív"}</span>
            <span style={{ fontSize:11, color:C.muted }}>{(mt.beveteliTetelek||[]).length} bevételi tétel</span>
          </div>
          {mt.leiras && <p style={{ fontSize:11, color:C.muted, margin:"2px 0 0" }}>{mt.leiras}</p>}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={e=>{e.stopPropagation();setEdit(true);setOpen(true);}} style={{ padding:"5px 10px", background:C.accentLight, color:C.accent, border:"none", borderRadius:7, cursor:"pointer", fontSize:11 }}>Szerkeszt</button>
          <button onClick={e=>{e.stopPropagation();onDelete(mt.id);}} style={{ padding:"5px 8px", background:C.dangerLight, color:C.danger, border:"none", borderRadius:7, cursor:"pointer" }}><Trash2 size={13}/></button>
          {open?<ChevronUp size={16} color={C.muted}/>:<ChevronDown size={16} color={C.muted}/>}
        </div>
      </div>

      {open && (
        <div style={{ borderTop:"1px solid #F1F5F9", padding:"14px 18px" }}>
          {edit ? (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:C.muted, display:"block", marginBottom:3 }}>Munkatípus neve *</label>
                  <input value={form.nev} onChange={e=>setForm(p=>({...p,nev:e.target.value}))} style={inp}/>
                </div>
                <div>
                  <label style={{ fontSize:10, fontWeight:700, color:C.muted, display:"block", marginBottom:3 }}>Aktív</label>
                  <label style={{ display:"flex", alignItems:"center", gap:8, paddingTop:10, cursor:"pointer" }}>
                    <input type="checkbox" checked={form.aktiv} onChange={e=>setForm(p=>({...p,aktiv:e.target.checked}))} style={{ width:16,height:16 }}/>
                    <span style={{ fontSize:13 }}>{form.aktiv?"Aktív":"Inaktív"}</span>
                  </label>
                </div>
                <div style={{ gridColumn:"span 2" }}>
                  <label style={{ fontSize:10, fontWeight:700, color:C.muted, display:"block", marginBottom:3 }}>Leírás</label>
                  <input value={form.leiras} onChange={e=>setForm(p=>({...p,leiras:e.target.value}))} style={inp}/>
                </div>
              </div>

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                <span style={{ fontSize:12, fontWeight:700, color:C.textSub }}>Bevételi tételek</span>
                <button onClick={addTetel} style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", background:C.accent, color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontSize:11, fontFamily:FONT }}>
                  <Plus size={11}/> Tétel hozzáadása
                </button>
              </div>
              {form.beveteliTetelek.map((t,i)=>(
                <TetelSor key={t.id||i} tetel={t} onChange={nt=>updateTetel(i,nt)} onDelete={()=>deleteTetel(i)}/>
              ))}
              {form.beveteliTetelek.length===0&&<p style={{ fontSize:12, color:C.muted, fontStyle:"italic", marginBottom:10 }}>Még nincs bevételi tétel – adj hozzá egyet</p>}

              <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:12 }}>
                <button onClick={()=>{setEdit(false);setForm({nev:mt.nev,leiras:mt.leiras||"",aktiv:mt.aktiv??true,beveteliTetelek:mt.beveteliTetelek||[]});}} style={{ padding:"7px 14px", border:"1.5px solid #E2E8F0", borderRadius:8, background:"#fff", cursor:"pointer", fontFamily:FONT }}>Mégse</button>
                <button onClick={()=>{onSave(mt.id,form);setEdit(false);}} disabled={!form.nev.trim()} style={{ padding:"7px 16px", background:form.nev.trim()?C.success:C.border, color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontFamily:FONT }}>Mentés</button>
              </div>
            </>
          ) : (
            <div>
              {(mt.beveteliTetelek||[]).length===0
                ? <p style={{ fontSize:12, color:C.muted, fontStyle:"italic" }}>Nincs bevételi tétel definiálva</p>
                : (mt.beveteliTetelek||[]).map((t,i)=>{
                    const info = BEVETELI_TETEL_TIPUSOK.find(x=>x.id===t.tetelTipusId);
                    const arl  = ARLOGIKA_TIPUSOK.find(x=>x.id===t.arlogikaTipus);
                    return (
                      <div key={i} style={{ display:"flex", gap:12, padding:"7px 0", borderBottom:"1px solid #F1F5F9" }}>
                        <span style={{ fontSize:12, fontWeight:600, color:C.textSub, minWidth:220 }}>{info?.label||t.tetelTipusId}</span>
                        <span style={{ fontSize:12, color:C.muted }}>{arl?.label}</span>
                        {t.arlogikaTipus==="darab_egysegar"&&<span style={{ fontSize:12, color:C.accent }}>{ft(t.egysegAr)}/db</span>}
                        {t.arlogikaTipus==="fix_osszeg"&&<span style={{ fontSize:12, color:C.accent }}>{ft(t.fixOsszeg)}</span>}
                        {t.arlogikaTipus==="tartomany_fix"&&<span style={{ fontSize:12, color:C.accent }}>{(t.tartomanyok||[]).length} tartomány</span>}
                      </div>
                    );
                  })
              }
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Fő oldal ─────────────────────────────────────────────────
export default function MunkatipusokPage({ userRole }) {
  const [mtk,    setMtk]    = useState(() => loadMunkatipusok());
  const [ujOpen, setUjOpen] = useState(false);
  const [ujNev,  setUjNev]  = useState("");

  useEffect(()=>{
    const fn=e=>{ if(e.detail?.collection==="munkatipusok") setMtk(loadMunkatipusok()); };
    window.addEventListener("crm-db-updated",fn);
    return ()=>window.removeEventListener("crm-db-updated",fn);
  },[]);

  const isAdmin = ["Admin","Projektmenedzser"].includes(userRole);

  return (
    <div style={{ padding:"24px 28px", fontFamily:FONT, maxWidth:900 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h1 style={{ fontFamily:FONT_HEADING, fontSize:22, fontWeight:800, margin:"0 0 4px" }}>⚙️ Munkatípusok</h1>
          <p style={{ fontSize:13, color:C.muted, margin:0 }}>Admin szerkeszthető munkatípusok és bevételi tételdefiníciók</p>
        </div>
        {isAdmin && (
          <button onClick={()=>setUjOpen(true)} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", background:C.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:FONT }}>
            <Plus size={15}/> Új munkatípus
          </button>
        )}
      </div>

      <div style={{ background:C.warningLight, border:"1px solid #FCD34D", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:12, color:C.warning }}>
        💡 A munkatípusok határozzák meg, milyen bevételi tételeket generál automatikusan a rendszer projekt létrehozásakor. A fővállalkozói szabály az összegeket írja felül.
      </div>

      {mtk.map(mt=>(
        <MtSor key={mt.id} mt={mt}
          onSave={(id,data)=>{ updateMunkatipus(id,data); setMtk(loadMunkatipusok()); }}
          onDelete={(id)=>{ if(window.confirm("Törlöd ezt a munkatípust?")){ deleteMunkatipus(id); setMtk(loadMunkatipusok()); } }}
        />
      ))}

      {ujOpen && (
        <div style={{ background:"#F0F9FF", border:"2px solid #93C5FD", borderRadius:12, padding:"16px", marginTop:12 }}>
          <p style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>Új munkatípus neve</p>
          <div style={{ display:"flex", gap:8 }}>
            <input value={ujNev} onChange={e=>setUjNev(e.target.value)} placeholder="pl. Napelemes rendszer telepítés" style={{...inp,flex:1}}/>
            <button onClick={()=>{setUjOpen(false);setUjNev("");}} style={{ padding:"8px 14px", border:"1.5px solid #E2E8F0", borderRadius:8, background:"#fff", cursor:"pointer", fontFamily:FONT }}>Mégse</button>
            <button onClick={()=>{ if(!ujNev.trim()) return; createMunkatipus({nev:ujNev.trim(),beveteliTetelek:[]}); setMtk(loadMunkatipusok()); setUjOpen(false); setUjNev(""); }} disabled={!ujNev.trim()}
              style={{ padding:"8px 16px", background:ujNev.trim()?C.accent:C.border, color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontFamily:FONT }}>
              Létrehozás
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
