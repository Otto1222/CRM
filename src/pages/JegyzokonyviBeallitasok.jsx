import { useState, useRef, useEffect } from "react";
import { Save, Upload, X, FileText, Printer, Image, Plus, Trash2 } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { loadLocal, saveLocal } from "../lib/localDb";

const LS_KEY = "crm_jegyzokonyv_beallitasok";

const DEFAULT_BEALLITASOK = {
  fejlecKep: null,      // base64 kép
  labKep: null,         // base64 lábléc kép
  cegNev: "E.D.I. Solutions",
  cegCim: "",
  cegTel: "",
  cegEmail: "",
  cegAdoszam: "",
  szovegSablonok: [
    {
      id: "alap",
      nev: "Alapértelmezett",
      szoveg: `ÁTADÁS-ÁTVÉTELI JEGYZŐKÖNYV

Napelemes rendszer telepítése

Ügyfél neve: {ugyfel_neve}
Ügyfél címe: {ugyfel_cime}
Projekt kód: {projekt_kod}
Telepítés dátuma: {datum}
Munkaszám: {munkaszam}

Alulírott ügyfél igazolom, hogy a fenti munkaszámon nyilvántartott napelemes rendszer telepítési munkát elvégezték és a rendszer átadásra került.

A telepítés során az alábbi munkák valósultak meg:
{feladat}

Az ügyfél kijelenti:
• A munkaterületet rendben, hiánytalanul visszakapta.
• A rendszer beüzemelése megtörtént.
• A kezelési útmutatót megkapta és megértette.
• A rendszerrel kapcsolatos kérdéseire választ kapott.

Az elvégzett munkával elégedett és azt átvette.

Kelt: {datum}

Ügyfél aláírása:                    Kivitelező aláírása:

_______________________          _______________________
{ugyfel_neve}                    {ceg_neve}`
    }
  ],
  aktivSablon: "alap",
};

function getBeallitasok() {
  try { const s = loadLocal(LS_KEY); if (s) return s; } catch {}
  return DEFAULT_BEALLITASOK;
}

// Változók listája
const VALTOZOK = [
  { k:"{ugyfel_neve}",  l:"Ügyfél neve" },
  { k:"{ugyfel_cime}",  l:"Ügyfél címe" },
  { k:"{projekt_kod}",  l:"Projekt kód / Munkaszám" },
  { k:"{munkaszam}",    l:"Munkaszám" },
  { k:"{datum}",        l:"Lezárás dátuma" },
  { k:"{feladat}",      l:"Elvégzett feladat" },
  { k:"{ceg_neve}",     l:"Cég neve (beállításból)" },
  { k:"{csapat_neve}",  l:"Telepítő csapat neve" },
];

export default function JegyzokonyviBeallitasok() {
  const [b,       setB]       = useState(getBeallitasok);
  const [saved,   setSaved]   = useState(false);
  const [activeTab, setTab]   = useState("sablon");
  const fejlecRef = useRef();
  const labRef    = useRef();

  function upd(k, v) { setB(p => ({ ...p, [k]: v })); }

  function handleKep(field, file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => upd(field, e.target.result);
    reader.readAsDataURL(file);
  }

  function updSablon(id, k, v) {
    setB(p => ({
      ...p,
      szovegSablonok: p.szovegSablonok.map(s => s.id===id ? {...s,[k]:v} : s)
    }));
  }

  function addSablon() {
    const id = `sablon_${Date.now()}`;
    setB(p => ({
      ...p,
      szovegSablonok: [...p.szovegSablonok, { id, nev:"Új sablon", szoveg:"" }],
      aktivSablon: id,
    }));
  }

  function delSablon(id) {
    setB(p => ({
      ...p,
      szovegSablonok: p.szovegSablonok.filter(s => s.id !== id),
      aktivSablon: p.szovegSablonok[0]?.id || "alap",
    }));
  }

  function save() {
    saveLocal(LS_KEY, b);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const aktivSablon = b.szovegSablonok.find(s => s.id === b.aktivSablon) || b.szovegSablonok[0];

  const TABS = [
    { id:"sablon", label:"📝 Szöveg sablon" },
    { id:"fejlec", label:"🖼 Fejléc / Logó" },
    { id:"ceg",    label:"🏢 Cég adatok" },
  ];

  return (
    <div style={{ padding:"24px 28px", fontFamily:FONT }}>
      {saved && (
        <div style={{ position:"fixed", top:20, right:20, background:C.success, color:"#fff", padding:"12px 20px", borderRadius:12, fontWeight:600, fontSize:14, zIndex:999 }}>
          ✅ Beállítások mentve!
        </div>
      )}

      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:FONT_HEADING, fontSize:20, fontWeight:800, color:C.text, marginBottom:4 }}>
            📋 Átadás-átvételi jegyzőkönyv beállítások
          </h2>
          <p style={{ fontSize:13, color:C.muted }}>Szöveg sablon, logó, cég adatok szerkesztése</p>
        </div>
        <button onClick={save} style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 18px", background:C.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:FONT }}>
          <Save size={15}/>Mentés
        </button>
      </div>

      {/* Tab sáv */}
      <div style={{ display:"flex", gap:4, marginBottom:20, background:C.bg, padding:4, borderRadius:12, width:"fit-content" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{ padding:"8px 16px", borderRadius:9, border:"none", background:activeTab===t.id?"#fff":"transparent", color:activeTab===t.id?C.text:C.muted, fontWeight:activeTab===t.id?700:400, fontSize:13, cursor:"pointer", fontFamily:FONT, boxShadow:activeTab===t.id?"0 1px 4px rgba(0,0,0,.08)":"none", whiteSpace:"nowrap" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SZÖVEG SABLON ── */}
      {activeTab==="sablon" && (
        <div>
          {/* Sablon választó */}
          <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
            {b.szovegSablonok.map(s => (
              <div key={s.id} style={{ display:"flex", alignItems:"center", gap:4 }}>
                <button onClick={()=>upd("aktivSablon",s.id)} style={{ padding:"7px 14px", borderRadius:9, border:`1.5px solid ${b.aktivSablon===s.id?C.accent:C.border}`, background:b.aktivSablon===s.id?C.accentLight:"#fff", color:b.aktivSablon===s.id?C.accent:C.textSub, fontSize:13, fontWeight:b.aktivSablon===s.id?700:400, cursor:"pointer", fontFamily:FONT }}>
                  {s.nev}
                </button>
                {b.szovegSablonok.length > 1 && (
                  <button onClick={()=>delSablon(s.id)} style={{ border:"none", background:"none", cursor:"pointer", color:C.danger }}><Trash2 size={13}/></button>
                )}
              </div>
            ))}
            <button onClick={addSablon} style={{ padding:"7px 12px", borderRadius:9, border:`1.5px dashed ${C.border}`, background:"transparent", color:C.accent, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontFamily:FONT }}>
              <Plus size={14}/>Új sablon
            </button>
          </div>

          {aktivSablon && (
            <div>
              {/* Sablon neve */}
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:.8, display:"block", marginBottom:6 }}>Sablon neve</label>
                <input value={aktivSablon.nev} onChange={e=>updSablon(aktivSablon.id,"nev",e.target.value)} style={{ width:"100%", maxWidth:300, padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none" }}/>
              </div>

              {/* Változók tájékoztató */}
              <div style={{ background:"#EFF6FF", border:`1px solid #BFDBFE`, borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
                <p style={{ fontSize:12, fontWeight:700, color:C.accent, marginBottom:8 }}>💡 Elérhető változók — ezeket automatikusan behelyettesíti a rendszer:</p>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {VALTOZOK.map(v => (
                    <code key={v.k} style={{ background:"#fff", border:"1px solid #BFDBFE", borderRadius:6, padding:"2px 8px", fontSize:12, color:C.accent, cursor:"pointer" }} title={v.l} onClick={()=>{
                      updSablon(aktivSablon.id, "szoveg", aktivSablon.szoveg + v.k);
                    }}>
                      {v.k}
                    </code>
                  ))}
                </div>
                <p style={{ fontSize:11, color:C.muted, marginTop:6 }}>Kattints egy változóra hogy beilleszd a kurzorod helyére a szövegszerkesztőben.</p>
              </div>

              {/* Szöveg szerkesztő */}
              <label style={{ fontSize:12, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:.8, display:"block", marginBottom:6 }}>Sablon szöveg</label>
              <textarea
                value={aktivSablon.szoveg}
                onChange={e=>updSablon(aktivSablon.id,"szoveg",e.target.value)}
                rows={20}
                style={{ width:"100%", padding:"12px 14px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, fontFamily:"monospace", color:C.text, outline:"none", resize:"vertical", lineHeight:1.7, background:"#FAFAFA" }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── FEJLÉC / LOGÓ ── */}
      {activeTab==="fejlec" && (
        <div>
          {/* Fejléc kép */}
          <div style={{ marginBottom:24 }}>
            <label style={{ fontSize:13, fontWeight:700, color:C.text, display:"block", marginBottom:10 }}>Fejléc kép / Logó</label>
            <p style={{ fontSize:12, color:C.muted, marginBottom:12 }}>Ez az oldaltetején jelenik meg a nyomtatott dokumentumon (pl. cég logó, fejléc).</p>
            {b.fejlecKep ? (
              <div style={{ position:"relative", display:"inline-block" }}>
                <img src={b.fejlecKep} alt="Fejléc" style={{ maxWidth:"100%", maxHeight:150, borderRadius:10, border:`1px solid ${C.border}` }}/>
                <button onClick={()=>upd("fejlecKep",null)} style={{ position:"absolute", top:-8, right:-8, width:22, height:22, background:C.danger, border:"none", borderRadius:"50%", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <X size={12} color="#fff"/>
                </button>
              </div>
            ) : (
              <button onClick={()=>fejlecRef.current?.click()} style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 18px", border:`2px dashed ${C.border}`, borderRadius:12, background:"#F8FAFC", cursor:"pointer", fontSize:14, color:C.textSub, fontFamily:FONT }}>
                <Image size={18} color={C.muted}/>Fejléc kép feltöltése (PNG/JPG)
              </button>
            )}
            <input ref={fejlecRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handleKep("fejlecKep",e.target.files[0])}/>
          </div>

          {/* Lábléc kép */}
          <div>
            <label style={{ fontSize:13, fontWeight:700, color:C.text, display:"block", marginBottom:10 }}>Lábléc kép (opcionális)</label>
            <p style={{ fontSize:12, color:C.muted, marginBottom:12 }}>Ez az oldal alján jelenik meg (pl. QR-kód, aláírás helye sablon).</p>
            {b.labKep ? (
              <div style={{ position:"relative", display:"inline-block" }}>
                <img src={b.labKep} alt="Lábléc" style={{ maxWidth:"100%", maxHeight:120, borderRadius:10, border:`1px solid ${C.border}` }}/>
                <button onClick={()=>upd("labKep",null)} style={{ position:"absolute", top:-8, right:-8, width:22, height:22, background:C.danger, border:"none", borderRadius:"50%", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <X size={12} color="#fff"/>
                </button>
              </div>
            ) : (
              <button onClick={()=>labRef.current?.click()} style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 18px", border:`2px dashed ${C.border}`, borderRadius:12, background:"#F8FAFC", cursor:"pointer", fontSize:14, color:C.textSub, fontFamily:FONT }}>
                <Image size={18} color={C.muted}/>Lábléc kép feltöltése (PNG/JPG)
              </button>
            )}
            <input ref={labRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e=>handleKep("labKep",e.target.files[0])}/>
          </div>
        </div>
      )}

      {/* ── CÉG ADATOK ── */}
      {activeTab==="ceg" && (
        <div style={{ maxWidth:500 }}>
          {[
            ["Cég neve", "cegNev", "E.D.I. Solutions"],
            ["Cég címe", "cegCim", "pl. Budapest, Váci út 1."],
            ["Telefonszám", "cegTel", "+36 30 ..."],
            ["E-mail", "cegEmail", "info@..."],
            ["Adószám", "cegAdoszam", "12345678-1-01"],
          ].map(([label, key, placeholder]) => (
            <div key={key} style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, color:C.muted, fontWeight:600, textTransform:"uppercase", letterSpacing:.8, display:"block", marginBottom:6 }}>{label}</label>
              <input value={b[key]||""} onChange={e=>upd(key,e.target.value)} placeholder={placeholder} style={{ width:"100%", padding:"10px 12px", border:`1.5px solid ${C.border}`, borderRadius:9, fontSize:14, fontFamily:FONT, outline:"none", background:"#F8FAFC" }}/>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Export beállítások getter for AlairasModal
export function getJegyzokonyv() {
  try { return loadLocal(LS_KEY) || DEFAULT_BEALLITASOK; } catch { return DEFAULT_BEALLITASOK; }
}
