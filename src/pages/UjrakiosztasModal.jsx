import { useState } from "react";
import {
  X, Save, AlertTriangle, Plus, Trash2, Hash,
  Calendar, Users, MessageSquare, Package
} from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { getSettings } from "../lib/munkakiosztasSettings";
import { updateItem, loadLocal } from "../lib/localDb";
import { driveSave } from "../lib/driveApi";

const SERIAL_KEYWORDS = [
  "inverter","optimalizáló","optimalizalo",
  "akkumulátor modul","akkumulator modul",
  "akkumulátor vezérlő","akkumulator vezerlő",
  "smart méter","smart meter","eastron","sdm",
  "tűzeseti leválasztó","tuzeseti levalaszto","leválasztó",
];
function requiresSerial(nev) {
  if (!nev) return false;
  const l = nev.toLowerCase()
    .replace(/[áàâä]/g,"a").replace(/[éèêë]/g,"e").replace(/[íìîï]/g,"i")
    .replace(/[óòôöő]/g,"o").replace(/[úùûüű]/g,"u");
  return SERIAL_KEYWORDS.some(k => {
    const kl = k.replace(/[áàâä]/g,"a").replace(/[éèêë]/g,"e").replace(/[íìîï]/g,"i")
      .replace(/[óòôöő]/g,"o").replace(/[úùûüű]/g,"u");
    return l.includes(kl);
  });
}

function ReadOnlyField({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ marginBottom:10 }}>
      <p style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:.7, marginBottom:4 }}>{label}</p>
      <div style={{ background:C.bg, borderRadius:8, padding:"9px 12px", fontSize:14, color:C.text, border:`1px solid ${C.border}` }}>
        {String(value)}
      </div>
    </div>
  );
}

export default function UjrakiosztasModal({ m, data, onClose, onSave }) {
  const settings  = getSettings();
  const csapatok  = settings.csapatok || [];

  const [datum,        setDatum]       = useState(m.date || "");
  const [csapatId,     setCsapatId]    = useState(m.assigneeId || "");
  const [indoklas,     setIndoklas]    = useState("");
  const [plusAnyagok,  setPlusAnyagok] = useState([]);
  const [ujNev,        setUjNev]       = useState("");
  const [ujMenny,      setUjMenny]     = useState(1);
  const [ujEgyseg,     setUjEgyseg]    = useState("db");
  const [errors,       setErrors]      = useState({});
  const [saving,       setSaving]      = useState(false);
  const [activeTab,    setActiveTab]   = useState("kiosztás");

  function addAnyag() {
    if (!ujNev.trim()) return;
    setPlusAnyagok(p => [...p, {
      id: `pa_${Date.now()}`,
      nev: ujNev.trim(),
      menny: ujMenny,
      egyseg: ujEgyseg,
      sorozatszam: requiresSerial(ujNev) ? "" : null,
      kotelezőSerial: requiresSerial(ujNev),
      plusz: true,
    }]);
    setUjNev(""); setUjMenny(1);
  }

  function updSerial(id, val) {
    setPlusAnyagok(p => p.map(a => a.id===id ? {...a, sorozatszam:val} : a));
  }

  function validate() {
    const e = {};
    if (!csapatId) e.csapat = "Válassz csapatot!";
    if (!datum)    e.datum  = "Add meg az új dátumot!";
    if (!indoklas.trim() || indoklas.trim().length < 3)
      e.indoklas = "Az indoklás kötelező (min. 3 karakter)!";
    const hianySerial = plusAnyagok.filter(a => a.kotelezőSerial && !a.sorozatszam?.trim());
    if (hianySerial.length > 0)
      e.serial = `Hiányzó sorozatszám: ${hianySerial.map(a=>a.nev).join(", ")}`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);

    const cs = csapatok.find(c => c.id === csapatId);
    const ts = new Date().toISOString();

    // Eredeti anyagok + plusz anyagok
    const osszes = [
      ...(m.anyagok || []),
      ...plusAnyagok.map(a => ({ ...a, hozzaadasIdopont: ts, indoklas })),
    ];

    const updates = {
      date:          datum,
      assigneeId:    csapatId,
      assigneeNev:   cs?.nev || "",
      status:        "Megkezdésre Vár",
      statusSzin:    "#38BDF8",
      lezarva:       false,
      megkezdve:     false,
      megkezdesIdopont: null,
      befejezesIdopont: null,
      anyagok:       osszes,
      ujrakiosztas: [
        ...(m.ujrakiosztas || []),
        {
          datum: ts,
          eredetiCsapat:  m.assigneeNev || m.assigneeId || "—",
          ujCsapat:       cs?.nev || csapatId,
          eredetiDatum:   m.date,
          ujDatum:        datum,
          indoklas,
          plusAnyagok:    plusAnyagok.length,
        }
      ],
    };

    const newMl = updateItem("munkalapok", m.id, updates);

    // Drive szinkron
    try {
      await driveSave("munkalapok", { munkalapok: newMl });
    } catch(e) { console.warn("[Drive]", e); }

    setSaving(false);
    onSave(updates);
    onClose();
  }

  const TABS = [
    { id:"kiosztás",  label:"Kiosztás" },
    { id:"eredeti",   label:"Eredeti adatok" },
    { id:"anyagok",   label:"+ Anyagok" },
    { id:"előzmény",  label:"Előzmény" },
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center", fontFamily:FONT }}>
      <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", width:"100%", maxWidth:680, maxHeight:"93vh", display:"flex", flexDirection:"column" }}>

        {/* Fejléc */}
        <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <h2 style={{ fontFamily:FONT_HEADING, fontSize:19, fontWeight:800, color:C.text }}>Munkalap újrakiosztása</h2>
            <p style={{ fontSize:13, color:C.muted, marginTop:2 }}>{m.id} · {m.clientNev || m.projektMegnevezes}</p>
          </div>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:C.muted }}>
            <X size={22}/>
          </button>
        </div>

        {/* Tabok */}
        <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, flexShrink:0, overflowX:"auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ padding:"11px 16px", border:"none", background:"transparent", color:activeTab===t.id?C.accent:C.muted, fontWeight:activeTab===t.id?700:400, fontSize:13, cursor:"pointer", fontFamily:FONT, borderBottom:activeTab===t.id?`2px solid ${C.accent}`:"2px solid transparent", whiteSpace:"nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tartalom */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>

          {/* ── KIOSZTÁS TAB ── */}
          {activeTab==="kiosztás" && (
            <div>
              {/* Hibajelzések */}
              {Object.keys(errors).length > 0 && (
                <div style={{ background:C.dangerLight, border:`1px solid #FECACA`, borderRadius:10, padding:"10px 14px", marginBottom:16 }}>
                  {Object.values(errors).map((e,i) => (
                    <p key={i} style={{ fontSize:13, color:C.danger, display:"flex", alignItems:"center", gap:6 }}>
                      <AlertTriangle size={13}/>{e}
                    </p>
                  ))}
                </div>
              )}

              {/* Dátum */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:.8, marginBottom:8 }}>
                  <Calendar size={14}/> Új dátum
                </label>
                <input type="date" value={datum} onChange={e=>setDatum(e.target.value)}
                  style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${errors.datum?C.danger:C.border}`, borderRadius:10, fontSize:14, fontFamily:FONT, outline:"none", background:C.bg }}/>
              </div>

              {/* Csapat */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:.8, marginBottom:8 }}>
                  <Users size={14}/> Csapat kiválasztása
                </label>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {csapatok.map(cs => (
                    <button key={cs.id} onClick={()=>setCsapatId(cs.id)}
                      style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:10, border:`2px solid ${csapatId===cs.id?cs.szin||C.accent:C.border}`, background:csapatId===cs.id?(cs.szin||C.accent)+"12":"#fff", cursor:"pointer", textAlign:"left", fontFamily:FONT }}>
                      <div style={{ width:34, height:34, borderRadius:"50%", background:cs.szin||C.accent, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:13, flexShrink:0 }}>
                        {cs.nev.charAt(0)}
                      </div>
                      <div style={{ flex:1 }}>
                        <p style={{ fontWeight:700, fontSize:14, color:C.text }}>{cs.nev}</p>
                        <p style={{ fontSize:12, color:C.muted }}>{cs.telephely}</p>
                      </div>
                      {csapatId===cs.id && <span style={{ color:cs.szin||C.accent, fontSize:18 }}>✓</span>}
                    </button>
                  ))}
                </div>
                {errors.csapat && <p style={{ fontSize:12, color:C.danger, marginTop:6 }}>{errors.csapat}</p>}
              </div>

              {/* Indoklás */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:.8, marginBottom:8 }}>
                  <MessageSquare size={14}/> Indoklás (kötelező)
                </label>
                <textarea value={indoklas} onChange={e=>setIndoklas(e.target.value)}
                  placeholder="Pl. csapat betegség, dátumütközés…"
                  rows={3}
                  style={{ width:"100%", padding:"11px 14px", border:`1.5px solid ${errors.indoklas?C.danger:C.border}`, borderRadius:10, fontSize:14, fontFamily:FONT, outline:"none", resize:"vertical", background:C.bg }}/>
                <p style={{ fontSize:11, color:C.muted, marginTop:4 }}>{indoklas.length} karakter (min. 3)</p>
                {errors.indoklas && <p style={{ fontSize:12, color:C.danger }}>{errors.indoklas}</p>}
              </div>

              {/* Figyelmeztetés */}
              <div style={{ background:C.warningLight, border:`1px solid #FDE68A`, borderRadius:10, padding:"12px 14px", marginBottom:4 }}>
                <p style={{ fontSize:13, color:C.warning, fontWeight:600, marginBottom:4 }}>⚠️ Újrakiosztás hatása</p>
                <p style={{ fontSize:12, color:C.textSub }}>A státusz "Megkezdésre Vár"-ra változik. Az eredeti VBF adatok és fotók megmaradnak, csak az időbélyeg és státusz törlődik.</p>
              </div>
            </div>
          )}

          {/* ── EREDETI ADATOK TAB ── */}
          {activeTab==="eredeti" && (
            <div>
              <div style={{ background:C.bg, borderRadius:12, padding:"12px 14px", marginBottom:16, fontSize:13, color:C.muted, fontStyle:"italic" }}>
                📋 Csak olvasható — ezek az adatok nem módosíthatók
              </div>
              <ReadOnlyField label="Munkaszám" value={m.id}/>
              <ReadOnlyField label="Projekt megnevezés" value={m.projektMegnevezes}/>
              <ReadOnlyField label="Feladat" value={m.feladat}/>
              <ReadOnlyField label="Ügyfél" value={m.clientNev}/>
              <ReadOnlyField label="Cím" value={m.clientCim}/>
              <ReadOnlyField label="Jelenlegi dátum" value={m.date}/>
              <ReadOnlyField label="Jelenlegi csapat" value={m.assigneeNev}/>
              <ReadOnlyField label="Értékesítő" value={m.ertekesito}/>
              {m.megkezdesIdopont && (
                <div style={{ background:C.accentLight, borderRadius:10, padding:"12px 14px", marginTop:12, border:"1px solid #BFDBFE" }}>
                  <p style={{ fontSize:12, fontWeight:700, color:C.accent, marginBottom:10, textTransform:"uppercase", letterSpacing:.7 }}>⏱ Munkaidő adatok</p>
                  <ReadOnlyField label="Megkezdés időpontja" value={m.megkezdesIdopont ? new Date(m.megkezdesIdopont).toLocaleString("hu-HU", {year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}) : null}/>
                  <ReadOnlyField label="Befejezés időpontja" value={m.befejezesIdopont ? new Date(m.befejezesIdopont).toLocaleString("hu-HU", {year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}) : "Még folyamatban"}/>
                  {m.megkezdesIdopont && (
                    <div style={{ marginTop:8 }}>
                      <p style={{ fontSize:11, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:.7, marginBottom:4 }}>Eltelt munkaidő</p>
                      <div style={{ background:"#fff", borderRadius:8, padding:"9px 12px", fontSize:14, color:C.accent, fontWeight:800, fontFamily:"monospace", border:"1px solid #BAE6FD" }}>
                        {(() => {
                          const start = new Date(m.megkezdesIdopont);
                          const end   = m.befejezesIdopont ? new Date(m.befejezesIdopont) : new Date();
                          const diff  = Math.max(0, Math.floor((end - start) / 1000));
                          const h = Math.floor(diff / 3600);
                          const min = Math.floor((diff % 3600) / 60);
                          const s = diff % 60;
                          return `${String(h).padStart(2,"0")} óra ${String(min).padStart(2,"0")} perc ${String(s).padStart(2,"0")} mp`;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {(m.anyagok||[]).length > 0 && (
                <div>
                  <p style={{ fontSize:12, color:C.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:.7, marginBottom:10, marginTop:16 }}>Anyagok ({m.anyagok.length} tétel)</p>
                  {m.anyagok.map((a,i) => (
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", background:C.bg, borderRadius:8, marginBottom:6, fontSize:13 }}>
                      <span style={{ color:C.text, fontWeight:600 }}>{a.nev}</span>
                      <span style={{ color:C.muted }}>{a.menny} {a.egyseg}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PLUSZ ANYAGOK TAB ── */}
          {activeTab==="anyagok" && (
            <div>
              <p style={{ fontSize:13, color:C.muted, marginBottom:16, lineHeight:1.6 }}>
                Ha a munkához plusz anyag szükséges, add hozzá itt. <b>Kötelező indoklás az anyag hozzáadásához</b> (a Kiosztás tabban).
              </p>

              {errors.serial && (
                <div style={{ background:C.dangerLight, border:`1px solid #FECACA`, borderRadius:10, padding:"10px 14px", marginBottom:14, fontSize:13, color:C.danger }}>
                  ⚠️ {errors.serial}
                </div>
              )}

              {plusAnyagok.map((a,i) => (
                <div key={a.id} style={{ background:"#fff", border:`1.5px solid ${a.kotelezőSerial?C.accent+"40":C.border}`, borderRadius:11, padding:"12px 14px", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:a.kotelezőSerial?10:0 }}>
                    {a.kotelezőSerial && <Hash size={13} color={C.accent}/>}
                    <span style={{ flex:1, fontSize:14, fontWeight:600, color:C.text }}>{a.nev}</span>
                    <span style={{ fontSize:13, color:C.muted }}>{a.menny} {a.egyseg}</span>
                    <button onClick={()=>setPlusAnyagok(p=>p.filter(x=>x.id!==a.id))} style={{ border:"none", background:"none", cursor:"pointer", color:C.danger }}>
                      <Trash2 size={14}/>
                    </button>
                  </div>
                  {a.kotelezőSerial && (
                    <div>
                      <label style={{ fontSize:11, color:C.accent, fontWeight:700, textTransform:"uppercase", letterSpacing:.7 }}>Sorozatszám (kötelező)</label>
                      <input value={a.sorozatszam||""} onChange={e=>updSerial(a.id,e.target.value)}
                        placeholder="SN-..."
                        style={{ width:"100%", marginTop:6, padding:"9px 12px", border:`1.5px solid ${!a.sorozatszam?C.accent:C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", background:!a.sorozatszam?C.accentLight:C.bg }}/>
                    </div>
                  )}
                </div>
              ))}

              <div style={{ border:`1.5px dashed ${C.border}`, borderRadius:12, padding:14, background:C.bg }}>
                <p style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.7, marginBottom:10 }}>Plusz tétel hozzáadása</p>
                <input value={ujNev} onChange={e=>setUjNev(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addAnyag()}
                  placeholder="Anyag / eszköz neve…"
                  style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", marginBottom:8 }}/>
                {requiresSerial(ujNev) && <p style={{ fontSize:12, color:C.accent, marginBottom:8, fontWeight:600 }}>⚠️ Sorozatszámot igényel!</p>}
                <div style={{ display:"flex", gap:8 }}>
                  <input type="number" value={ujMenny} onChange={e=>setUjMenny(parseInt(e.target.value)||1)}
                    style={{ width:60, padding:"10px 8px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", textAlign:"center" }}/>
                  <input value={ujEgyseg} onChange={e=>setUjEgyseg(e.target.value)} placeholder="db"
                    style={{ width:70, padding:"10px 8px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none" }}/>
                  <button onClick={addAnyag} style={{ flex:1, padding:"10px", background:C.accent, color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:700, fontFamily:FONT }}>
                    + Hozzáad
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── ELŐZMÉNY TAB ── */}
          {activeTab==="előzmény" && (
            <div>
              {(!m.ujrakiosztas || m.ujrakiosztas.length===0) ? (
                <div style={{ textAlign:"center", padding:"32px 0", color:C.muted }}>
                  <p style={{ fontSize:14 }}>Ez az első kiosztás — nincs előzmény.</p>
                </div>
              ) : (
                m.ujrakiosztas.map((u,i) => (
                  <div key={i} style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
                    <p style={{ fontSize:11, color:C.muted, marginBottom:8 }}>{new Date(u.datum).toLocaleString("hu-HU")}</p>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                      <div><p style={{ fontSize:11, color:C.muted }}>Eredeti csapat</p><p style={{ fontSize:13, fontWeight:600, color:C.text }}>{u.eredetiCsapat}</p></div>
                      <div><p style={{ fontSize:11, color:C.muted }}>Új csapat</p><p style={{ fontSize:13, fontWeight:600, color:C.accent }}>{u.ujCsapat}</p></div>
                      <div><p style={{ fontSize:11, color:C.muted }}>Eredeti dátum</p><p style={{ fontSize:13, fontWeight:600, color:C.text }}>{u.eredetiDatum}</p></div>
                      <div><p style={{ fontSize:11, color:C.muted }}>Új dátum</p><p style={{ fontSize:13, fontWeight:600, color:C.accent }}>{u.ujDatum}</p></div>
                    </div>
                    <div style={{ background:C.bg, borderRadius:8, padding:"8px 12px" }}>
                      <p style={{ fontSize:11, color:C.muted, marginBottom:4 }}>Indoklás</p>
                      <p style={{ fontSize:13, color:C.text }}>{u.indoklas}</p>
                    </div>
                    {u.plusAnyagok > 0 && <p style={{ fontSize:12, color:C.success, marginTop:8 }}>+{u.plusAnyagok} plusz anyag hozzáadva</p>}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Mentés */}
        <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
          {!saving ? (
          <button onClick={handleSave}
            style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", background:C.accent, color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT }}>
            <Save size={18}/>✅ Megerősítem az újrakiosztást
          </button>
        ) : (
          <div style={{ width:"100%", padding:"14px", borderRadius:12, background:C.successLight, border:`1px solid #A7F3D0`, textAlign:"center", fontSize:15, fontWeight:700, color:C.success }}>
            ⏳ Mentés folyamatban…
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
