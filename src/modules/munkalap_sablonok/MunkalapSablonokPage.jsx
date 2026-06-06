import { useState, useEffect } from "react";
import { Plus, Copy, Edit3, Archive, ArchiveRestore, Trash2, ChevronUp, ChevronDown, X, Save, Settings, List, Image, FileText } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../lib/constants.js";
import {
  loadSablonok, saveSablonok, initSablonok, getSablon,
  createSablon, updateSablon, inaktivalSablon, aktivSablon,
  masolSablon, deleteSablon,
} from "./munkalapSablon.service.js";
import {
  MEZO_TIPUSOK, SABLON_BEALLITASOK_DEF, DEFAULT_BEALLITASOK,
  MUNKALAP_SABLON_SCHEMA, ujMezo, ujFotoKategoria,
} from "./munkalapSablon.schema.js";

// ─── IKON VÁLASZTÓ ───────────────────────────────────────────
const IKON_LISTA = ["📋","📐","☀️","⚡","🔧","🛡️","🏢","📄","📏","🔌","📦","🔋","🖥️","🏗️","⚙️","✅","📊","🗂️","🔍","📎"];

// ─── SEGÉD: Mező típus ikon ──────────────────────────────────
function MezoTipusLabel({ tipus }) {
  const t = MEZO_TIPUSOK.find(x => x.id === tipus);
  return (
    <span style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"2px 9px", background:C.accentLight, borderRadius:6, fontSize:12, fontWeight:600, color:C.accent, fontFamily:FONT }}>
      {t?.ikon} {t?.label || tipus}
    </span>
  );
}

// ─── BEÁLLÍTÁS TOGGLE ────────────────────────────────────────
function BeallitasToggle({ defObj, value, onChange }) {
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
      {SABLON_BEALLITASOK_DEF.map(b => (
        <button key={b.key} onClick={() => onChange({ ...value, [b.key]: !value[b.key] })}
          style={{
            display:"flex", alignItems:"center", gap:10, padding:"12px 14px",
            border:`2px solid ${value[b.key] ? C.accent : C.border}`,
            borderRadius:10, background: value[b.key] ? C.accentLight : "#fff",
            cursor:"pointer", textAlign:"left", fontFamily:FONT, transition:"all .15s",
          }}>
          <span style={{ fontSize:20, width:28, textAlign:"center", flexShrink:0 }}>
            {value[b.key] ? "✅" : "⬜"}
          </span>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color: value[b.key] ? C.accentDark : C.text, margin:0 }}>{b.label}</p>
            <p style={{ fontSize:11, color:C.muted, margin:"2px 0 0" }}>{b.leiras}</p>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── MEZŐ KONFIG PANEL ───────────────────────────────────────
function MezoKonfigPanel({ mezo, onChange }) {
  if (mezo.tipus === "szam" || mezo.tipus === "meresiAdat") {
    return (
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginTop:8, padding:"10px", background:C.bg, borderRadius:8 }}>
        <div>
          <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:"block", marginBottom:3 }}>Mértékegység</label>
          <input value={mezo.mertekegyseg || ""} onChange={e => onChange({ ...mezo, mertekegyseg: e.target.value })}
            placeholder="pl. m, V, kWp"
            style={{ width:"100%", boxSizing:"border-box", padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT, outline:"none" }}/>
        </div>
        <div>
          <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:"block", marginBottom:3 }}>Minimum</label>
          <input type="number" value={mezo.szamMin ?? ""} onChange={e => onChange({ ...mezo, szamMin: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="—"
            style={{ width:"100%", boxSizing:"border-box", padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT, outline:"none" }}/>
        </div>
        <div>
          <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:"block", marginBottom:3 }}>Maximum</label>
          <input type="number" value={mezo.szamMax ?? ""} onChange={e => onChange({ ...mezo, szamMax: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="—"
            style={{ width:"100%", boxSizing:"border-box", padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT, outline:"none" }}/>
        </div>
      </div>
    );
  }

  if (mezo.tipus === "legordulo") {
    const opciok = mezo.legordulo_opciok || [];
    return (
      <div style={{ marginTop:8, padding:"10px", background:C.bg, borderRadius:8 }}>
        <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:"block", marginBottom:6 }}>Opciók (soronként 1)</label>
        <textarea rows={Math.max(3, opciok.length + 1)} value={opciok.join("\n")}
          onChange={e => onChange({ ...mezo, legordulo_opciok: e.target.value.split("\n").filter(Boolean) })}
          placeholder={"1. opció\n2. opció\nEgyéb"}
          style={{ width:"100%", boxSizing:"border-box", padding:"8px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT, outline:"none", resize:"vertical" }}/>
        <p style={{ fontSize:11, color:C.muted, marginTop:4 }}>{opciok.length} opció</p>
      </div>
    );
  }

  if (mezo.tipus === "fotoKategoria") {
    return (
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginTop:8, padding:"10px", background:C.bg, borderRadius:8 }}>
        <div>
          <label style={{ fontSize:11, color:C.muted, fontWeight:600, display:"block", marginBottom:3 }}>Minimum fotó</label>
          <input type="number" min={0} max={20} value={mezo.foto_minDb ?? 1} onChange={e => onChange({ ...mezo, foto_minDb: Number(e.target.value) })}
            style={{ width:"100%", boxSizing:"border-box", padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT, outline:"none" }}/>
        </div>
      </div>
    );
  }

  return null;
}

// ─── MEZŐ SOR ────────────────────────────────────────────────
function MezoSor({ mezo, idx, total, onUp, onDown, onChange, onDelete }) {
  const [nyitva, setNyitva] = useState(false);
  const hasConfig = ["szam","meresiAdat","legordulo","fotoKategoria"].includes(mezo.tipus);

  return (
    <div style={{ border:`1.5px solid ${nyitva ? C.accent : C.border}`, borderRadius:10, marginBottom:8, background:"#fff", overflow:"hidden" }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 12px" }}>
        {/* Sorrend */}
        <div style={{ display:"flex", flexDirection:"column", gap:2, flexShrink:0 }}>
          <button onClick={onUp} disabled={idx===0} style={{ border:"none", background:"none", cursor:idx===0?"not-allowed":"pointer", color:idx===0?"#D1D5DB":C.muted, padding:"1px 3px", lineHeight:1 }}>▲</button>
          <button onClick={onDown} disabled={idx===total-1} style={{ border:"none", background:"none", cursor:idx===total-1?"not-allowed":"pointer", color:idx===total-1?"#D1D5DB":C.muted, padding:"1px 3px", lineHeight:1 }}>▼</button>
        </div>
        {/* Index */}
        <span style={{ fontSize:11, color:C.muted, width:18, textAlign:"center", flexShrink:0 }}>{idx+1}.</span>
        {/* Típus */}
        <MezoTipusLabel tipus={mezo.tipus} />
        {/* Cimke */}
        <input value={mezo.cimke} onChange={e => onChange({ ...mezo, cimke: e.target.value })}
          placeholder="Mező neve…"
          style={{ flex:1, padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT, outline:"none", color:C.text }}/>
        {/* Kötelező */}
        <button onClick={() => onChange({ ...mezo, kotelezo: !mezo.kotelezo })} title="Kötelező"
          style={{ padding:"5px 10px", border:`1.5px solid ${mezo.kotelezo ? C.danger : C.border}`, borderRadius:7, background: mezo.kotelezo ? C.dangerLight : "#fff", color: mezo.kotelezo ? C.danger : C.muted, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FONT, flexShrink:0 }}>
          {mezo.kotelezo ? "✱ köt." : "opcionális"}
        </button>
        {/* Típus váltó */}
        <select value={mezo.tipus} onChange={e => onChange({ ...mezo, tipus: e.target.value })}
          style={{ padding:"5px 8px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:FONT, cursor:"pointer", outline:"none" }}>
          {MEZO_TIPUSOK.map(t => <option key={t.id} value={t.id}>{t.ikon} {t.label}</option>)}
        </select>
        {/* Konfig gomb */}
        {hasConfig && (
          <button onClick={() => setNyitva(p => !p)} title="Beállítások"
            style={{ padding:"5px 8px", border:`1px solid ${nyitva ? C.accent : C.border}`, borderRadius:7, background: nyitva ? C.accentLight : "#fff", color: nyitva ? C.accent : C.muted, cursor:"pointer", fontSize:13 }}>
            ⚙
          </button>
        )}
        {/* Törlés */}
        <button onClick={onDelete} style={{ border:"none", background:"none", cursor:"pointer", color:C.danger, padding:"4px", flexShrink:0 }}>
          <Trash2 size={15}/>
        </button>
      </div>
      {nyitva && hasConfig && (
        <div style={{ padding:"0 12px 12px" }}>
          <MezoKonfigPanel mezo={mezo} onChange={onChange}/>
        </div>
      )}
    </div>
  );
}

// ─── FOTÓ KATEGÓRIA SOR ──────────────────────────────────────
function FotoKatSor({ fk, idx, total, onUp, onDown, onChange, onDelete }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 12px", border:`1px solid ${C.border}`, borderRadius:9, marginBottom:6, background:"#fff" }}>
      <div style={{ display:"flex", flexDirection:"column", gap:2, flexShrink:0 }}>
        <button onClick={onUp} disabled={idx===0} style={{ border:"none", background:"none", cursor:idx===0?"not-allowed":"pointer", color:idx===0?"#D1D5DB":C.muted, padding:"1px 3px", lineHeight:1, fontSize:11 }}>▲</button>
        <button onClick={onDown} disabled={idx===total-1} style={{ border:"none", background:"none", cursor:idx===total-1?"not-allowed":"pointer", color:idx===total-1?"#D1D5DB":C.muted, padding:"1px 3px", lineHeight:1, fontSize:11 }}>▼</button>
      </div>
      <span style={{ fontSize:13, color:C.muted, width:16, flexShrink:0 }}>{idx+1}.</span>
      <input value={fk.label} onChange={e => onChange({ ...fk, label: e.target.value })}
        placeholder="Fotókategória neve…"
        style={{ flex:1, padding:"6px 10px", border:`1px solid ${C.border}`, borderRadius:7, fontSize:13, fontFamily:FONT, outline:"none" }}/>
      <label style={{ fontSize:11, color:C.muted, display:"flex", alignItems:"center", gap:4, cursor:"pointer", flexShrink:0, whiteSpace:"nowrap" }}>
        Min. fotó:
        <input type="number" min={0} max={20} value={fk.minDb ?? 1}
          onChange={e => onChange({ ...fk, minDb: Number(e.target.value) })}
          style={{ width:44, padding:"5px 6px", border:`1px solid ${C.border}`, borderRadius:6, fontSize:12, fontFamily:FONT, outline:"none", textAlign:"center" }}/>
      </label>
      <button onClick={() => onChange({ ...fk, kotelezo: !fk.kotelezo })}
        style={{ padding:"4px 9px", border:`1.5px solid ${fk.kotelezo ? C.danger : C.border}`, borderRadius:6, background: fk.kotelezo ? C.dangerLight : "#fff", color: fk.kotelezo ? C.danger : C.muted, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FONT }}>
        {fk.kotelezo ? "✱ köt." : "opt."}
      </button>
      <button onClick={onDelete} style={{ border:"none", background:"none", cursor:"pointer", color:C.danger, padding:"4px", flexShrink:0 }}>
        <Trash2 size={14}/>
      </button>
    </div>
  );
}

// ─── SABLON SZERKESZTŐ ───────────────────────────────────────
function SablonEditor({ sablon, userRole, onSave, onCancel }) {
  const [tab,      setTab]      = useState("alapadatok");
  const [nev,      setNev]      = useState(sablon.nev || "");
  const [leiras,   setLeiras]   = useState(sablon.leiras || "");
  const [ikon,     setIkon]     = useState(sablon.ikon || "📋");
  const [beall,    setBeall]    = useState({ ...DEFAULT_BEALLITASOK, ...(sablon.beallitasok || {}) });
  const [mezok,    setMezok]    = useState(sablon.mezok ? [...sablon.mezok] : []);
  const [fotok,    setFotok]    = useState(sablon.fotoKategoriak ? [...sablon.fotoKategoriak] : []);

  const isNew = !sablon.id;

  function moveMezo(idx, dir) {
    const arr = [...mezok];
    const to = idx + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    setMezok(arr);
  }

  function moveFoto(idx, dir) {
    const arr = [...fotok];
    const to = idx + dir;
    if (to < 0 || to >= arr.length) return;
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    setFotok(arr);
  }

  function addMezo() {
    setMezok(prev => [...prev, ujMezo("szoveg", "")]);
    setTab("mezok");
  }

  function addFoto() {
    setFotok(prev => [...prev, ujFotoKategoria("")]);
    setTab("fotok");
  }

  function handleSave() {
    if (!nev.trim()) return;
    onSave({
      ...sablon,
      nev:            nev.trim(),
      leiras:         leiras.trim(),
      ikon,
      beallitasok:    beall,
      mezok,
      fotoKategoriak: fotok,
    });
  }

  const tabStl = (t) => ({
    display:"flex", alignItems:"center", gap:6,
    padding:"9px 16px", border:"none", background: tab===t ? "#fff" : "transparent",
    borderBottom: tab===t ? `3px solid ${C.accent}` : "3px solid transparent",
    color: tab===t ? C.accent : C.muted, fontWeight: tab===t ? 700 : 500,
    cursor:"pointer", fontSize:13, fontFamily:FONT,
  });

  return (
    <div style={{ background:"#fff", borderRadius:16, border:`1px solid ${C.border}`, overflow:"hidden" }}>
      {/* Fejléc */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:`1px solid ${C.border}`, background: C.accentLight }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:28 }}>{ikon}</span>
          <div>
            <h2 style={{ fontFamily:FONT_HEADING, fontSize:17, fontWeight:800, color:C.accentDark, margin:0 }}>
              {isNew ? "Új munkalap sablon" : "Sablon szerkesztése"}
            </h2>
            {sablon.gyari && (
              <span style={{ fontSize:11, color:C.muted, background:"#FEF9C3", borderRadius:5, padding:"2px 7px", fontWeight:600 }}>🏭 Gyári sablon – nem törölhető</span>
            )}
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <button onClick={onCancel} style={{ padding:"8px 14px", border:`1px solid ${C.border}`, borderRadius:9, background:"#fff", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:FONT }}>
            Mégse
          </button>
          <button onClick={handleSave} disabled={!nev.trim()}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 18px", background: nev.trim() ? C.accent : C.border, color:"#fff", border:"none", borderRadius:9, cursor: nev.trim() ? "pointer" : "not-allowed", fontWeight:700, fontSize:13, fontFamily:FONT }}>
            <Save size={14}/> Mentés
          </button>
        </div>
      </div>

      {/* Tabok */}
      <div style={{ display:"flex", borderBottom:`1px solid ${C.border}`, background:C.bg, overflowX:"auto" }}>
        {[
          ["alapadatok", <FileText size={14}/>, "Alapadatok"],
          ["mezok",      <List size={14}/>,     `Mezők (${mezok.length})`],
          ["beallitasok",<Settings size={14}/>, "Beállítások"],
          ["fotok",      <Image size={14}/>,    `Fotók (${fotok.length})`],
        ].map(([t, icon, label]) => (
          <button key={t} onClick={() => setTab(t)} style={tabStl(t)}>
            {icon} {label}
          </button>
        ))}
      </div>

      <div style={{ padding:"20px" }}>

        {/* ── ALAPADATOK ── */}
        {tab === "alapadatok" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
              <div>
                <label style={{ fontSize:12, color:C.muted, fontWeight:700, display:"block", marginBottom:5 }}>Sablon neve *</label>
                <input value={nev} onChange={e => setNev(e.target.value)} placeholder="pl. Napelemes kivitelezés"
                  style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1.5px solid ${nev ? C.accent : C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none" }}/>
              </div>
              <div>
                <label style={{ fontSize:12, color:C.muted, fontWeight:700, display:"block", marginBottom:5 }}>Ikon</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                  {IKON_LISTA.map(i => (
                    <button key={i} onClick={() => setIkon(i)}
                      style={{ fontSize:20, padding:"5px 7px", border:`2px solid ${ikon===i ? C.accent : C.border}`, borderRadius:7, background: ikon===i ? C.accentLight : "#fff", cursor:"pointer" }}>
                      {i}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label style={{ fontSize:12, color:C.muted, fontWeight:700, display:"block", marginBottom:5 }}>Leírás</label>
              <textarea value={leiras} onChange={e => setLeiras(e.target.value)} rows={3} placeholder="Mire való ez a sablon?"
                style={{ width:"100%", boxSizing:"border-box", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:13, fontFamily:FONT, outline:"none", resize:"vertical" }}/>
            </div>
          </div>
        )}

        {/* ── MEZŐK ── */}
        {tab === "mezok" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <p style={{ fontSize:13, color:C.muted, margin:0 }}>Húzd fel/le a sorrendet. A kötelező mezők lezáráskor ellenőrzöttek.</p>
              <button onClick={addMezo}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:C.accent, color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:FONT }}>
                <Plus size={14}/> Mező hozzáadása
              </button>
            </div>
            {mezok.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:C.muted }}>
                <p style={{ fontSize:28, margin:"0 0 8px" }}>📝</p>
                <p style={{ fontSize:14, fontWeight:600 }}>Nincsenek mezők</p>
                <p style={{ fontSize:12 }}>Adj hozzá mezőket az „Mező hozzáadása" gombbal</p>
              </div>
            ) : mezok.map((mezo, idx) => (
              <MezoSor key={mezo.id || idx} mezo={mezo} idx={idx} total={mezok.length}
                onUp={() => moveMezo(idx, -1)} onDown={() => moveMezo(idx, 1)}
                onChange={uj => setMezok(prev => prev.map((m, i) => i === idx ? uj : m))}
                onDelete={() => setMezok(prev => prev.filter((_, i) => i !== idx))}/>
            ))}
          </div>
        )}

        {/* ── BEÁLLÍTÁSOK ── */}
        {tab === "beallitasok" && (
          <div>
            <p style={{ fontSize:13, color:C.muted, marginBottom:16 }}>
              A bekapcsolt elemek lezáráskor kötelezők – a telepítő nem tudja lezárni a munkalapot, amíg nem teljesíti.
            </p>
            <BeallitasToggle value={beall} onChange={setBeall} />
            <div style={{ marginTop:20, padding:"14px 16px", background:C.warningLight, border:`1px solid #FDE68A`, borderRadius:10 }}>
              <p style={{ fontSize:12, color:"#92400E", fontWeight:700, margin:"0 0 4px" }}>⚠️ Részben kész és Sikertelen státusznál</p>
              <p style={{ fontSize:12, color:"#92400E", margin:0 }}>Minden esetben kötelező az indoklás megadása – ez nem kapcsolható ki.</p>
            </div>
          </div>
        )}

        {/* ── FOTÓK ── */}
        {tab === "fotok" && (
          <div>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <p style={{ fontSize:13, color:C.muted, margin:0 }}>
                Fotókategóriák sorrendje és minimális fotószáma. Ha „Fotódokumentáció kötelező" be van kapcsolva, a kötelező kategóriák teljesítendők.
              </p>
              <button onClick={addFoto}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:C.accent, color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:FONT }}>
                <Plus size={14}/> Kategória hozzáadása
              </button>
            </div>
            {fotok.length === 0 ? (
              <div style={{ textAlign:"center", padding:"40px 0", color:C.muted }}>
                <p style={{ fontSize:28, margin:"0 0 8px" }}>📷</p>
                <p style={{ fontSize:14, fontWeight:600 }}>Nincsenek fotókategóriák</p>
              </div>
            ) : fotok.map((fk, idx) => (
              <FotoKatSor key={fk.id || idx} fk={fk} idx={idx} total={fotok.length}
                onUp={() => moveFoto(idx, -1)} onDown={() => moveFoto(idx, 1)}
                onChange={uj => setFotok(prev => prev.map((f, i) => i === idx ? uj : f))}
                onDelete={() => setFotok(prev => prev.filter((_, i) => i !== idx))}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SABLON KÁRTYA ───────────────────────────────────────────
function SablonKartya({ sablon, userRole, onEdit, onMasol, onInaktival, onAktival, onDelete }) {
  const isAdmin = ["Admin", "Projektmenedzser"].includes(userRole);
  const aktiv   = sablon.aktiv !== false;
  const mezokDb = (sablon.mezok || []).length;
  const fotokDb = (sablon.fotoKategoriak || []).length;

  const beall = sablon.beallitasok || {};
  const beallLabels = [
    beall.kellVBF && "VBF",
    beall.kellLMRA && "LMRA",
    beall.kellTIG && "TIG",
    beall.kellJelenletiIv && "Jelenléti",
    beall.kellFotoDokumentacio && "Fotók",
    beall.kellAlairas && "Aláírás",
  ].filter(Boolean);

  return (
    <div style={{
      background: aktiv ? "#fff" : C.bg,
      borderRadius:14, border:`1.5px solid ${aktiv ? C.border : C.border}`,
      padding:"18px 20px", display:"flex", alignItems:"flex-start", gap:14,
      opacity: aktiv ? 1 : 0.7,
    }}>
      <span style={{ fontSize:36, flexShrink:0, lineHeight:1, marginTop:2 }}>{sablon.ikon || "📋"}</span>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4 }}>
          <h3 style={{ fontFamily:FONT_HEADING, fontSize:16, fontWeight:800, color: aktiv ? C.text : C.muted, margin:0 }}>
            {sablon.nev}
          </h3>
          {sablon.gyari && (
            <span style={{ fontSize:10, fontWeight:700, padding:"2px 6px", background:"#FEF9C3", color:"#92400E", borderRadius:5 }}>🏭 Gyári</span>
          )}
          {!aktiv && (
            <span style={{ fontSize:10, fontWeight:700, padding:"2px 6px", background:C.bg, color:C.muted, borderRadius:5 }}>⏸ Inaktív</span>
          )}
        </div>
        {sablon.leiras && (
          <p style={{ fontSize:12, color:C.muted, margin:"0 0 8px" }}>{sablon.leiras}</p>
        )}
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
          <span style={{ fontSize:12, color:C.muted, background:C.bg, padding:"2px 8px", borderRadius:5, border:`1px solid ${C.border}` }}>
            📝 {mezokDb} mező
          </span>
          <span style={{ fontSize:12, color:C.muted, background:C.bg, padding:"2px 8px", borderRadius:5, border:`1px solid ${C.border}` }}>
            📷 {fotokDb} fotókat.
          </span>
          {beallLabels.map(l => (
            <span key={l} style={{ fontSize:11, fontWeight:600, padding:"2px 7px", background:C.accentLight, color:C.accentDark, borderRadius:5 }}>{l}</span>
          ))}
        </div>
      </div>

      {isAdmin && (
        <div style={{ display:"flex", gap:6, flexShrink:0, flexWrap:"wrap", justifyContent:"flex-end" }}>
          <button onClick={() => onEdit(sablon)}
            style={{ padding:"7px 12px", background:C.accentLight, color:C.accent, border:"none", borderRadius:8, cursor:"pointer", fontFamily:FONT, fontSize:12, display:"flex", alignItems:"center", gap:4 }}>
            <Edit3 size={12}/> Szerk.
          </button>
          <button onClick={() => onMasol(sablon.id)}
            style={{ padding:"7px 12px", background:"#F5F3FF", color:"#7C3AED", border:"none", borderRadius:8, cursor:"pointer", fontFamily:FONT, fontSize:12, display:"flex", alignItems:"center", gap:4 }}>
            <Copy size={12}/> Másolás
          </button>
          {aktiv ? (
            <button onClick={() => onInaktival(sablon.id)}
              style={{ padding:"7px 12px", background:C.warningLight, color:C.warning, border:"none", borderRadius:8, cursor:"pointer", fontFamily:FONT, fontSize:12, display:"flex", alignItems:"center", gap:4 }}>
              <Archive size={12}/> Inaktivál
            </button>
          ) : (
            <button onClick={() => onAktival(sablon.id)}
              style={{ padding:"7px 12px", background:C.successLight, color:C.success, border:"none", borderRadius:8, cursor:"pointer", fontFamily:FONT, fontSize:12, display:"flex", alignItems:"center", gap:4 }}>
              <ArchiveRestore size={12}/> Aktivál
            </button>
          )}
          {!sablon.gyari && !aktiv && (
            <button onClick={() => onDelete(sablon.id)}
              style={{ padding:"7px 12px", background:C.dangerLight, color:C.danger, border:"none", borderRadius:8, cursor:"pointer", fontFamily:FONT, fontSize:12, display:"flex", alignItems:"center", gap:4 }}>
              <Trash2 size={12}/> Törlés
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── FŐ OLDAL ────────────────────────────────────────────────
export default function MunkalapSablonokPage({ userRole }) {
  const [sablonok, setSablonok] = useState(() => initSablonok());
  const [editor,   setEditor]   = useState(null); // null | sablon obj (new or existing)
  const [szuro,    setSzuro]    = useState("aktiv"); // "aktiv" | "inaktiv" | "mind"
  const isAdmin = ["Admin", "Projektmenedzser"].includes(userRole);

  useEffect(() => {
    function reload() { setSablonok(initSablonok()); }
    window.addEventListener("crm-db-updated", reload);
    return () => window.removeEventListener("crm-db-updated", reload);
  }, []);

  function handleSave(data) {
    let eredmeny;
    if (data.id) {
      eredmeny = updateSablon(data.id, data, "admin");
    } else {
      eredmeny = createSablon(data, "admin");
    }
    setSablonok(loadSablonok());
    setEditor(null);
  }

  function handleMasol(id) {
    masolSablon(id, "admin");
    setSablonok(loadSablonok());
  }

  function handleInaktival(id) {
    inaktivalSablon(id);
    setSablonok(loadSablonok());
  }

  function handleAktival(id) {
    aktivSablon(id);
    setSablonok(loadSablonok());
  }

  function handleDelete(id) {
    const sablon = sablonok.find(s => s.id === id);
    if (!sablon) return;
    if (sablon.gyari) { alert("Gyári sablont nem lehet törölni. Inaktiválás lehetséges."); return; }
    if (!window.confirm(`Biztosan törlöd: „${sablon.nev}"?`)) return;
    deleteSablon(id);
    setSablonok(loadSablonok());
  }

  const lathatoSablonok = sablonok.filter(s => {
    if (szuro === "aktiv")   return s.aktiv !== false;
    if (szuro === "inaktiv") return s.aktiv === false;
    return true;
  });

  if (editor !== null) {
    return (
      <div style={{ padding:"20px 24px", fontFamily:FONT, maxWidth:920, margin:"0 auto" }}>
        <SablonEditor
          sablon={editor}
          userRole={userRole}
          onSave={handleSave}
          onCancel={() => setEditor(null)}
        />
      </div>
    );
  }

  return (
    <div style={{ padding:"20px 24px", fontFamily:FONT }}>
      {/* Fejléc */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h2 style={{ fontFamily:FONT_HEADING, fontSize:22, fontWeight:800, color:C.text, margin:0 }}>
            📋 Munkalap sablonok
          </h2>
          <p style={{ fontSize:13, color:C.muted, margin:"4px 0 0" }}>
            Programozás nélkül hozz létre, másolj vagy módosíts munkalap sablonokat. Gyári sablonok nem törölhetők.
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setEditor({ ...MUNKALAP_SABLON_SCHEMA })}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 18px", background:C.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:FONT }}>
            <Plus size={16}/> Új sablon
          </button>
        )}
      </div>

      {/* Szűrő */}
      <div style={{ display:"flex", gap:6, marginBottom:18 }}>
        {[["aktiv","✅ Aktív"],["inaktiv","⏸ Inaktív"],["mind","Mind"]].map(([k,l]) => (
          <button key={k} onClick={() => setSzuro(k)}
            style={{ padding:"7px 14px", border:`1.5px solid ${szuro===k ? C.accent : C.border}`, borderRadius:8, background: szuro===k ? C.accentLight : "#fff", color: szuro===k ? C.accentDark : C.muted, fontWeight: szuro===k ? 700 : 500, fontSize:13, cursor:"pointer", fontFamily:FONT }}>
            {l}
          </button>
        ))}
        <span style={{ marginLeft:"auto", fontSize:13, color:C.muted, alignSelf:"center" }}>
          {lathatoSablonok.length} sablon
        </span>
      </div>

      {/* Lista */}
      {lathatoSablonok.length === 0 ? (
        <div style={{ textAlign:"center", padding:"60px 0", color:C.muted }}>
          <p style={{ fontSize:40, margin:"0 0 12px" }}>📋</p>
          <p style={{ fontSize:15, fontWeight:600 }}>Nincsenek sablonok ebben a szűrőben</p>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {lathatoSablonok.map(s => (
            <SablonKartya key={s.id} sablon={s} userRole={userRole}
              onEdit={setEditor}
              onMasol={handleMasol}
              onInaktival={handleInaktival}
              onAktival={handleAktival}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Tájékoztató */}
      <div style={{ marginTop:28, padding:"14px 18px", background:C.accentLight, borderRadius:12, border:`1px solid #BFDBFE` }}>
        <p style={{ fontSize:12, color:C.accent, fontWeight:700, margin:"0 0 6px" }}>💡 Sablon-rendszer – hogyan működik</p>
        <ul style={{ fontSize:12, color:"#3B82F6", margin:0, paddingLeft:18, lineHeight:2 }}>
          <li>Új munkalap létrehozásakor kötelező sablont választani</li>
          <li>A sablon mezői megjelennek a munkalapban – a telepítő tölti ki</li>
          <li>Gyári sablonok nem törölhetők, de másolhatók és módosíthatók</li>
          <li>OETP és egyéb új típusokhoz készíts új sablont másolással</li>
        </ul>
      </div>
    </div>
  );
}
