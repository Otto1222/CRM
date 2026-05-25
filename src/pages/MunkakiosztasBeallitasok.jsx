import { useState } from "react";
import { Plus, Trash2, Save, RefreshCw, MapPin, Users, Settings2 } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { getSettings, saveSettings, DEFAULT_SETTINGS } from "../lib/munkakiosztasSettings";
import Card from "../components/Card";

function SectionTitle({ icon: Icon, title, sub }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, paddingBottom:12, borderBottom:`1px solid ${C.border}` }}>
      <div style={{ width:36, height:36, borderRadius:9, background:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center" }}>
        <Icon size={18} color={C.accent} />
      </div>
      <div>
        <div style={{ fontWeight:700, fontSize:15, color:C.text }}>{title}</div>
        {sub && <div style={{ fontSize:12, color:C.muted }}>{sub}</div>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type="text", placeholder }) {
  return (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, marginBottom:6 }}>{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width:"100%", padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, color:C.text, outline:"none", background:"#F8FAFC" }}
      />
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 0" }}>
      <span style={{ fontSize:14, color:C.text }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{ width:44, height:24, borderRadius:12, border:"none", background: value ? C.accent : C.border, cursor:"pointer", position:"relative", transition:"background .2s" }}
      >
        <span style={{ position:"absolute", top:3, left: value ? 22 : 3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }} />
      </button>
    </div>
  );
}

export default function MunkakiosztasBeallitasok() {
  const [settings, setSettings] = useState(getSettings());
  const [saved,    setSaved]    = useState(false);
  const [activeTab, setActiveTab] = useState("csapatok");

  function update(path, value) {
    setSettings(prev => {
      const next = JSON.parse(JSON.stringify(prev));
      const keys = path.split(".");
      let obj = next;
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
      obj[keys[keys.length - 1]] = value;
      return next;
    });
  }

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function resetDefaults() {
    if (!confirm("Visszaállítja az alapértelmezett beállításokat. Folytatod?")) return;
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }

  // ─── Csapat kezelés ───────────────────────────────────────
  function addCsapat() {
    const next = [...settings.csapatok, {
      id: `cs_${Date.now()}`, nev: "Új csapat", telephely: "",
      lat: 47.4979, lon: 19.0402, szin: "#64748B",
      hetvegen: false,
      munkatipusok: [],
      maxNapiMunka: {},
    }];
    setSettings(p => ({ ...p, csapatok: next }));
  }

  function delCsapat(id) {
    setSettings(p => ({ ...p, csapatok: p.csapatok.filter(c => c.id !== id) }));
  }

  function updateCsapat(id, field, val) {
    setSettings(p => ({ ...p, csapatok: p.csapatok.map(c => c.id === id ? { ...c, [field]: val } : c) }));
  }

  function toggleMunkatipus(csapatId, tipNev) {
    setSettings(p => ({
      ...p,
      csapatok: p.csapatok.map(c => {
        if (c.id !== csapatId) return c;
        const lst = c.munkatipusok.includes(tipNev)
          ? c.munkatipusok.filter(t => t !== tipNev)
          : [...c.munkatipusok, tipNev];
        return { ...c, munkatipusok: lst };
      }),
    }));
  }

  function updateMaxNapi(csapatId, tipNev, val) {
    setSettings(p => ({
      ...p,
      csapatok: p.csapatok.map(c =>
        c.id !== csapatId ? c : { ...c, maxNapiMunka: { ...c.maxNapiMunka, [tipNev]: parseInt(val) || 1 } }
      ),
    }));
  }

  // ─── Munkatípus kezelés ─────────────────────────────────
  function addTipus() {
    setSettings(p => ({ ...p, munkatipusok: [...p.munkatipusok, { id:`mt_${Date.now()}`, nev:"Új típus", szin:"#64748B" }] }));
  }
  function delTipus(id) {
    setSettings(p => ({ ...p, munkatipusok: p.munkatipusok.filter(t => t.id !== id) }));
  }

  const tabs = [
    { id:"csapatok",    label:"Csapatok" },
    { id:"munkatipusok",label:"Munka típusok" },
    { id:"excel",       label:"Excel beállítások" },
    { id:"maps",        label:"Térképi beállítások" },
  ];

  return (
    <div style={{ padding:"28px 32px", fontFamily:FONT }}>
      {saved && (
        <div style={{ position:"fixed", top:20, right:20, background:C.success, color:"#fff", padding:"12px 20px", borderRadius:12, fontWeight:600, fontSize:14, zIndex:999 }}>
          ✅ Beállítások mentve!
        </div>
      )}

      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h2 style={{ fontFamily:FONT_HEADING, fontSize:22, fontWeight:800, color:C.text, marginBottom:4 }}>Munkakiosztás beállítások</h2>
          <p style={{ fontSize:13, color:C.muted }}>Csapatok, munkatípusok, kiosztási paraméterek</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={resetDefaults} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", border:`1px solid ${C.border}`, background:"#fff", borderRadius:10, cursor:"pointer", fontSize:13, color:C.textSub, fontFamily:FONT }}>
            <RefreshCw size={14} /> Alapértelmezett
          </button>
          <button onClick={handleSave} style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 18px", background:C.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:FONT }}>
            <Save size={15} /> Mentés
          </button>
        </div>
      </div>

      {/* Tabok */}
      <div style={{ display:"flex", gap:4, marginBottom:24, background:C.bg, padding:4, borderRadius:12, width:"fit-content" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{ padding:"8px 18px", borderRadius:9, border:"none", background: activeTab===t.id ? "#fff" : "transparent", color: activeTab===t.id ? C.text : C.muted, fontWeight: activeTab===t.id ? 700 : 400, fontSize:14, cursor:"pointer", fontFamily:FONT, boxShadow: activeTab===t.id ? "0 1px 4px rgba(0,0,0,.08)" : "none" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ══ CSAPATOK TAB ══ */}
      {activeTab === "csapatok" && (
        <div>
          {settings.csapatok.map(cs => (
            <Card key={cs.id} style={{ padding:"20px 24px", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:16 }}>
                <input type="color" value={cs.szin} onChange={e => updateCsapat(cs.id,"szin",e.target.value)} style={{ width:36, height:36, borderRadius:"50%", border:"none", cursor:"pointer", padding:0 }} title="Csapat színe" />
                <input
                  value={cs.nev} onChange={e => updateCsapat(cs.id,"nev",e.target.value)}
                  style={{ flex:1, fontFamily:FONT_HEADING, fontSize:17, fontWeight:700, border:"none", outline:"none", color:C.text, background:"transparent" }}
                  placeholder="Csapat neve"
                />
                <button onClick={() => delCsapat(cs.id)} style={{ border:"none", background:"none", cursor:"pointer", color:C.danger, padding:4 }}>
                  <Trash2 size={16} />
                </button>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                <Field label="Telephely (indulási hely)" value={cs.telephely} onChange={v => updateCsapat(cs.id,"telephely",v)} placeholder="pl. Budapest, Váci út 12." />
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <Field label="Szélességi fok (lat)" value={cs.lat} onChange={v => updateCsapat(cs.id,"lat",parseFloat(v)||0)} type="number" placeholder="47.4979" />
                  <Field label="Hosszúsági fok (lon)" value={cs.lon} onChange={v => updateCsapat(cs.id,"lon",parseFloat(v)||0)} type="number" placeholder="19.0402" />
                </div>
              </div>

              <Toggle label="Dolgozik hétvégén" value={cs.hetvegen} onChange={v => updateCsapat(cs.id,"hetvegen",v)} />

              {/* Elvégezhető munkatípusok + napi max */}
              <div style={{ marginTop:14 }}>
                <p style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, marginBottom:10 }}>Elvégezhető munkatípusok & napi maximum</p>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px,1fr))", gap:8 }}>
                  {settings.munkatipusok.map(mt => {
                    const be = cs.munkatipusok.includes(mt.nev);
                    return (
                      <div key={mt.id} style={{ border:`1.5px solid ${be ? mt.szin : C.border}`, borderRadius:10, padding:"10px 12px", background: be ? mt.szin+"10" : "#fff" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: be ? 8 : 0 }}>
                          <input type="checkbox" checked={be} onChange={() => toggleMunkatipus(cs.id, mt.nev)} style={{ cursor:"pointer" }} />
                          <span style={{ fontSize:13, fontWeight:be?700:400, color:be?mt.szin:C.textSub }}>{mt.nev}</span>
                        </div>
                        {be && (
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <span style={{ fontSize:11, color:C.muted }}>Max/nap:</span>
                            <input
                              type="number" min={1} max={20}
                              value={cs.maxNapiMunka?.[mt.nev] ?? 3}
                              onChange={e => updateMaxNapi(cs.id, mt.nev, e.target.value)}
                              style={{ width:54, padding:"3px 7px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:13, fontFamily:FONT, textAlign:"center" }}
                            />
                            <span style={{ fontSize:11, color:C.muted }}>db</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          ))}
          <button onClick={addCsapat} style={{ width:"100%", padding:"12px", borderRadius:12, border:`2px dashed ${C.border}`, background:"transparent", color:C.accent, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT }}>
            <Plus size={16} /> Új csapat hozzáadása
          </button>
        </div>
      )}

      {/* ══ MUNKA TÍPUSOK TAB ══ */}
      {activeTab === "munkatipusok" && (
        <div>
          {settings.munkatipusok.map((mt, i) => (
            <Card key={mt.id} style={{ padding:"14px 20px", marginBottom:10, display:"flex", alignItems:"center", gap:14 }}>
              <input type="color" value={mt.szin} onChange={e => setSettings(p => ({ ...p, munkatipusok: p.munkatipusok.map((t,j) => j===i ? {...t,szin:e.target.value} : t) }))} style={{ width:32, height:32, borderRadius:"50%", border:"none", cursor:"pointer", padding:0 }} />
              <input
                value={mt.nev}
                onChange={e => setSettings(p => ({ ...p, munkatipusok: p.munkatipusok.map((t,j) => j===i ? {...t,nev:e.target.value} : t) }))}
                style={{ flex:1, padding:"8px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, color:C.text, outline:"none" }}
              />
              <button onClick={() => delTipus(mt.id)} style={{ border:"none", background:"none", cursor:"pointer", color:C.danger }}><Trash2 size={16}/></button>
            </Card>
          ))}
          <button onClick={addTipus} style={{ width:"100%", padding:"12px", borderRadius:12, border:`2px dashed ${C.border}`, background:"transparent", color:C.accent, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT }}>
            <Plus size={16} /> Új munkatípus
          </button>
        </div>
      )}

      {/* ══ EXCEL BEÁLLÍTÁSOK TAB ══ */}
      {activeTab === "excel" && (
        <Card style={{ padding:"24px" }}>
          <SectionTitle icon={Settings2} title="Excel oszlop nevek" sub="Az Excel fájlban használt fejlécek pontos neve" />
          <Field label="Cím oszlop neve" value={settings.excelOszlopok.cim} onChange={v => update("excelOszlopok.cim",v)} placeholder="Cím" />
          <Field label="Munka típusa oszlop neve" value={settings.excelOszlopok.munkatipus} onChange={v => update("excelOszlopok.munkatipus",v)} placeholder="Munka típusa" />
          <Field label="Megjegyzés oszlop neve (opcionális)" value={settings.excelOszlopok.megjegyzes} onChange={v => update("excelOszlopok.megjegyzes",v)} placeholder="Megjegyzés" />
          <div style={{ marginTop:20 }}>
            <Field label="Kiosztás kezdési dátuma" value={settings.indulasDatum} onChange={v => update("indulasDatum",v)} type="date" />
          </div>
        </Card>
      )}

      {/* ══ TÉRKÉPI BEÁLLÍTÁSOK TAB ══ */}
      {activeTab === "maps" && (
        <Card style={{ padding:"24px" }}>
          <SectionTitle icon={MapPin} title="Távolságszámítás" sub="Alapértelmezetten ingyenes OpenStreetMap/OSRM-t használ" />
          <Field
            label="Google Maps API kulcs (opcionális)"
            value={settings.googleMapsApiKey}
            onChange={v => update("googleMapsApiKey",v)}
            placeholder="AIzaSy..."
          />
          <div style={{ background:C.accentLight, borderRadius:10, padding:"12px 16px", marginTop:8 }}>
            <p style={{ fontSize:13, color:C.accent, fontWeight:600, marginBottom:4 }}>💡 Ingyenes mód (Google Maps API kulcs nélkül)</p>
            <p style={{ fontSize:12, color:C.textSub }}>OpenStreetMap geocoding + OSRM útvonaltervezés – valódi útvonal távolságot számít, API kulcs nélkül.</p>
          </div>
          <div style={{ background:"#FFFBEB", borderRadius:10, padding:"12px 16px", marginTop:10 }}>
            <p style={{ fontSize:13, color:C.warning, fontWeight:600, marginBottom:4 }}>⚠️ Google Maps API kulccsal (pontosabb)</p>
            <p style={{ fontSize:12, color:C.textSub }}>Pontosabb eredmény, de számlázható. Ha megadsz API kulcsot, azt használja az ingyenes OSRM helyett.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── Export: Eszköz kategória beállítások ────────────────────
const LS_ESZKOZ = "crm_eszkoz_kategoriak";
const DEFAULT_ESZKOZ_KAT = [
  { id:"inverter",  label:"Inverter",              icon:"⚡", szin:"#2563EB" },
  { id:"akku",      label:"Akkumulátor",            icon:"🔋", szin:"#059669" },
  { id:"akku_vez",  label:"Akkumulátor vezérlő",    icon:"🖥️", szin:"#9333EA" },
  { id:"energia_m", label:"Energia mérő",           icon:"📊", szin:"#D97706" },
  { id:"tarto",     label:"Tartószerkezet elemek",  icon:"🏗️", szin:"#0891B2" },
  { id:"ac_eszkoz", label:"AC eszközök",            icon:"🔌", szin:"#DC2626" },
  { id:"dc_eszkoz", label:"DC eszközök",            icon:"⚡", szin:"#7C3AED" },
  { id:"panel",     label:"Napelem panel",          icon:"☀️", szin:"#CA8A04" },
  { id:"egyeb",     label:"Egyéb anyagok",          icon:"📦", szin:"#64748B" },
];
