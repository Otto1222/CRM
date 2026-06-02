import { useState, useEffect } from "react";
import { C, FONT } from "../lib/constants";
import { loadLocal } from "../lib/localDb";
import { CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { generateVbfDocx, hasSablon } from "../lib/vbfDocxService";

const VBF_LABELS = {
  acFeszultseg:    { label:"AC feszültség",              unit:"V",    keys:["L1","L2","L3"] },
  kismegsInverter: { label:"Kismegszakító (inverter)",   unit:"A",    keys:["L1","L2","L3"] },
  kismegsMero:     { label:"Kismegszakító (mérőhely)",   unit:"A",    keys:["L1","L2","L3"] },
  panelszam:       { label:"Panelszám",                  unit:"db",   keys:["ST1","ST2","ST3","ST4","ST5","ST6"] },
  dcFeszultseg:    { label:"DC feszültség",              unit:"V",    keys:["ST1","ST2","ST3","ST4","ST5","ST6"] },
  hurokellenallas: { label:"Hurokellenállás",            unit:"MOhm", keys:["L1","L2","L3"] },
};

const VBF_SINGLE = [
  { key:"smartMeter",       label:"Smart meter",              unit:"DB"  },
  { key:"akku",             label:"AKKU",                     unit:"DB"  },
  { key:"betapaltDC",       label:"Betáplált DC teljesítmény",unit:"Wp"  },
  { key:"panelTipus",       label:"Panel típusa",             unit:""    },
  { key:"panelVoc",         label:"Panel Voc",                unit:"V"   },
  { key:"panelVmp",         label:"Panel Vmp",                unit:"V"   },
  { key:"panelImp",         label:"Panel Imp",                unit:"A"   },
  { key:"panelIsc",         label:"Panel Isc",                unit:"A"   },
  { key:"panelTelj",        label:"Panel teljesítmény",       unit:"Wp"  },
  { key:"inverterNevleges", label:"Inverter névleges telj.",  unit:"kVA" },
  { key:"tuzMegszakito",    label:"Tűzeseti megszakító",      unit:"A"   },
];

/**
 * VbfAdminCard
 * Props:
 *   munkalapId  – kötelező, a munkalap ID-ja
 *   munkalap    – opcionális teljes munkalap objektum (VBF letöltéshez kell)
 *   projekt     – opcionális projekt objektum (projektkód, ügyfél adatok)
 */
export default function VbfAdminCard({ munkalapId, munkalap: munkalapProp, projekt: projektProp }) {
  const [vbf, setVbf] = useState(() => loadLocal(`vbf_${munkalapId}`));
  const [letoltes, setLetoltes] = useState(false);

  // Frissítés ha az adatbázis változik (pl. Telepítő menti)
  useEffect(() => {
    function refresh() { setVbf(loadLocal(`vbf_${munkalapId}`)); }
    window.addEventListener("crm-db-updated", refresh);
    refresh();
    return () => window.removeEventListener("crm-db-updated", refresh);
  }, [munkalapId]);

  async function handleLetoltes() {
    setLetoltes(true);
    // Munkalap: prop vagy localStorage-ból
    const ml = munkalapProp
      || (loadLocal("munkalapok") || []).find(m => m.id === munkalapId)
      || { id: munkalapId };
    // Projekt: prop vagy a munkalap projektId alapján
    const pr = projektProp
      || (loadLocal("projektek") || []).find(p =>
          p.id === ml.projektId || (p.munkalapIds || []).includes(munkalapId)
        )
      || {};
    await generateVbfDocx(ml, pr, vbf);
    setLetoltes(false);
  }

  if (!vbf) return (
    <div style={{ background:"#F8FAFC", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginTop:16 }}>
      <p style={{ fontSize:13, fontWeight:700, color:C.muted }}>📐 VBF Jegyzőkönyv — még nem töltötték ki</p>
    </div>
  );

  const allValues = Object.values(vbf).flatMap(v => typeof v==="object" ? Object.values(v) : [v]);
  const filled    = allValues.filter(v => v!=="" && v!==null && v!==undefined).length;
  const total     = allValues.length;
  const pct       = Math.round(filled/total*100);
  const complete  = pct === 100;

  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 20px", marginTop:16 }}>
      {/* Fejléc */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, paddingBottom:10, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {complete ? <CheckCircle2 size={18} color={C.success}/> : <AlertTriangle size={18} color={C.warning}/>}
          <span style={{ fontWeight:700, fontSize:14, color:C.text }}>📐 VBF Jegyzőkönyv</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:13, fontWeight:700, color: complete?C.success:C.warning }}>{filled}/{total} ({pct}%)</span>
          {/* VBF letöltés gomb – csak ha van sablon */}
          {hasSablon() ? (
            <button
              onClick={handleLetoltes}
              disabled={letoltes}
              title="VBF Jegyzőkönyv letöltése Word (.docx) formátumban"
              style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"6px 14px",
                background: letoltes ? "#E2E8F0" : "#7C3AED",
                color:"#fff", border:"none", borderRadius:8,
                cursor: letoltes ? "default" : "pointer",
                fontWeight:700, fontSize:12, fontFamily:FONT,
              }}
            >
              <Download size={13}/>
              {letoltes ? "…" : "VBF .docx"}
            </button>
          ) : (
            <span
              title="Beállítások → VBF Sablon alatt töltsd fel a Word sablont"
              style={{ fontSize:11, color:C.muted, cursor:"help", borderBottom:`1px dashed ${C.muted}` }}
            >
              Sablon hiányzik
            </span>
          )}
        </div>
      </div>

      {/* Mérési szekciók */}
      {Object.entries(VBF_LABELS).map(([section, { label, unit, keys }]) => (
        <div key={section} style={{ marginBottom:12 }}>
          <p style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.7, marginBottom:6 }}>{label}</p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {keys.map(k => {
              const val = vbf[section]?.[k];
              const ok  = val !== "" && val !== null && val !== undefined;
              return (
                <div key={k} style={{ display:"flex", alignItems:"center", gap:4, background: ok?"#F0FDF4":"#FEF2F2", borderRadius:8, padding:"4px 10px", border:`1px solid ${ok?"#A7F3D0":"#FECACA"}` }}>
                  <span style={{ fontSize:12, color:C.muted }}>{k}:</span>
                  <span style={{ fontSize:13, fontWeight:700, color: ok?C.success:C.danger }}>
                    {ok ? `${val} ${unit}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Egyedi mezők */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5, marginTop:8 }}>
        {VBF_SINGLE.map(({ key, label, unit }) => {
          const val = vbf[key];
          const ok  = val !== "" && val !== null && val !== undefined;
          return (
            <div key={key} style={{ background: ok?"#F0FDF4":"#FEF2F2", borderRadius:8, padding:"6px 10px", border:`1px solid ${ok?"#A7F3D0":"#FECACA"}` }}>
              <p style={{ fontSize:10, color:C.muted, marginBottom:2 }}>{label}</p>
              <p style={{ fontSize:13, fontWeight:700, color: ok?C.success:C.danger }}>
                {ok ? `${val}${unit?" "+unit:""}` : "Hiányzik"}
              </p>
            </div>
          );
        })}
      </div>

      {!hasSablon() && (
        <div style={{ marginTop:12, padding:"8px 12px", background:"#F5F3FF", border:"1px solid #DDD6FE", borderRadius:8, fontSize:12, color:"#6D28D9" }}>
          💡 VBF letöltéshez: Beállítások → VBF Sablon → Word fájl feltöltése
        </div>
      )}
    </div>
  );
}
