import { useState, useEffect } from "react";
import { C, FONT } from "../lib/constants";
import { loadLocal } from "../lib/localDb";
import { loadVbf } from "../lib/munkalapDb";
import { CheckCircle2, AlertTriangle, Download } from "lucide-react";
import { generateVbfDocx, hasSablon } from "../lib/vbfDocxService";
import { downloadVbfPdf, hasVbfPdfSablon } from "../lib/vbfPdfMerge";

// Csoportos mérési szekciók – kulcsok a VbfJegyzokonyv flat-key sémájával egyeznek
const VBF_GROUPS = [
  { label:"AC feszültség",              unit:"V",    items:[
    { key:"ac_l1", label:"L1" }, { key:"ac_l2", label:"L2" }, { key:"ac_l3", label:"L3" },
  ]},
  { label:"Kismegszakító (inverter)",   unit:"A",    items:[
    { key:"ki_l1", label:"L1" }, { key:"ki_l2", label:"L2" }, { key:"ki_l3", label:"L3" },
  ]},
  { label:"Kismegszakító (mérőhely)",   unit:"A",    items:[
    { key:"km_l1", label:"L1" }, { key:"km_l2", label:"L2" }, { key:"km_l3", label:"L3" },
  ]},
  { label:"Panelszám",                  unit:"db",   items:[
    { key:"ps_st1", label:"ST1" }, { key:"ps_st2", label:"ST2" }, { key:"ps_st3", label:"ST3" },
    { key:"ps_st4", label:"ST4" }, { key:"ps_st5", label:"ST5" }, { key:"ps_st6", label:"ST6" },
  ]},
  { label:"DC feszültség",              unit:"V",    items:[
    { key:"dc_st1", label:"ST1" }, { key:"dc_st2", label:"ST2" }, { key:"dc_st3", label:"ST3" },
    { key:"dc_st4", label:"ST4" }, { key:"dc_st5", label:"ST5" }, { key:"dc_st6", label:"ST6" },
  ]},
  { label:"Hurokellenállás",            unit:"MOhm", items:[
    { key:"hu_l1", label:"L1" }, { key:"hu_l2", label:"L2" }, { key:"hu_l3", label:"L3" },
  ]},
];

// Egyedi mezők – kulcsok a VbfJegyzokonyv flat-key sémájával egyeznek
const VBF_SINGLE = [
  { key:"smart_meter",       label:"Smart meter",              unit:"DB"  },
  { key:"akku_db",           label:"AKKU",                     unit:"DB"  },
  { key:"dc_teljesitmeny",   label:"Betáplált DC teljesítmény",unit:"Wp"  },
  { key:"panel_tipus",       label:"Panel típusa",             unit:""    },
  { key:"panel_voc",         label:"Panel Voc",                unit:"V"   },
  { key:"panel_vmp",         label:"Panel Vmp",                unit:"V"   },
  { key:"panel_imp",         label:"Panel Imp",                unit:"A"   },
  { key:"panel_isc",         label:"Panel Isc",                unit:"A"   },
  { key:"panel_telj",        label:"Panel teljesítmény",       unit:"Wp"  },
  { key:"inv_nevleges",      label:"Inverter névleges telj.",  unit:"kVA" },
  { key:"epulet_alapfoldes", label:"Épület alapföldelés",      unit:"Ω"   },
  { key:"tuz_megszakito",    label:"Tűzeseti megszakító",      unit:"A"   },
];

const ALL_DISPLAY_KEYS = [
  ...VBF_GROUPS.flatMap(g => g.items.map(i => i.key)),
  ...VBF_SINGLE.map(i => i.key),
];

/**
 * VbfAdminCard
 * Props:
 *   munkalapId  – kötelező
 *   munkalap    – opcionális teljes munkalap objektum
 *   projekt     – opcionális projekt objektum
 */
export default function VbfAdminCard({ munkalapId, munkalap: munkalapProp, projekt: projektProp }) {
  const [vbf, setVbf] = useState(() => loadVbf(munkalapId));
  const [letoltes, setLetoltes] = useState(false);

  useEffect(() => {
    function refresh() { setVbf(loadVbf(munkalapId)); }
    window.addEventListener("crm-db-updated", refresh);
    refresh();
    return () => window.removeEventListener("crm-db-updated", refresh);
  }, [munkalapId]);

  async function handleLetoltes() {
    setLetoltes(true);
    const ml = munkalapProp
      || (loadLocal("munkalapok") || []).find(m => m.id === munkalapId)
      || { id: munkalapId };
    const pr = projektProp
      || (loadLocal("projektek") || []).find(p =>
          p.id === ml.projektId || (p.munkalapIds || []).includes(munkalapId)
        )
      || {};
    await generateVbfDocx(ml, pr, vbf);
    setLetoltes(false);
  }

  if (!vbf || Object.keys(vbf).filter(k => k !== "_savedAt").length === 0) return (
    <div style={{ background:"#F8FAFC", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginTop:16 }}>
      <p style={{ fontSize:13, fontWeight:700, color:C.muted }}>📐 VBF Jegyzőkönyv — még nem töltötték ki</p>
    </div>
  );

  const filled = ALL_DISPLAY_KEYS.filter(k => {
    const v = vbf[k];
    return v !== "" && v !== null && v !== undefined;
  }).length;
  const total = ALL_DISPLAY_KEYS.length;
  const pct   = Math.round(filled / total * 100);
  const complete = pct === 100;

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
          <div style={{ display:"flex", gap:6 }}>
            {hasVbfPdfSablon() && (
              <button
                onClick={async () => {
                  const ml = munkalapProp || (loadLocal("munkalapok")||[]).find(m=>m.id===munkalapId) || {id:munkalapId};
                  const pr = projektProp  || (loadLocal("projektek")||[]).find(p=>p.id===ml.projektId) || {};
                  await downloadVbfPdf(ml, pr, vbf);
                }}
                title="VBF letöltése PDF formátumban (sablon + adatok)"
                style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background:"#DC2626", color:"#fff", border:"none", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:12, fontFamily:FONT }}
              >
                <Download size={13}/> VBF .pdf
              </button>
            )}
            {hasSablon() ? (
              <button
                onClick={handleLetoltes}
                disabled={letoltes}
                title="VBF Jegyzőkönyv letöltése Word (.docx) formátumban"
                style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px", background: letoltes ? "#E2E8F0" : "#7C3AED", color:"#fff", border:"none", borderRadius:8, cursor: letoltes ? "default" : "pointer", fontWeight:700, fontSize:12, fontFamily:FONT }}
              >
                <Download size={13}/>{letoltes ? "…" : "VBF .docx"}
              </button>
            ) : !hasVbfPdfSablon() && (
              <span title="Beállítások → VBF Sablon" style={{ fontSize:11, color:C.muted, cursor:"help", borderBottom:`1px dashed ${C.muted}` }}>
                Sablon hiányzik
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Csoportos mérési szekciók */}
      {VBF_GROUPS.map(group => (
        <div key={group.label} style={{ marginBottom:12 }}>
          <p style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.7, marginBottom:6 }}>
            {group.label}
          </p>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {group.items.map(item => {
              const val = vbf[item.key];
              const ok  = val !== "" && val !== null && val !== undefined;
              return (
                <div key={item.key} style={{ display:"flex", alignItems:"center", gap:4, background: ok?"#F0FDF4":"#FEF2F2", borderRadius:8, padding:"4px 10px", border:`1px solid ${ok?"#A7F3D0":"#FECACA"}` }}>
                  <span style={{ fontSize:12, color:C.muted }}>{item.label}:</span>
                  <span style={{ fontSize:13, fontWeight:700, color: ok?C.success:C.danger }}>
                    {ok ? `${val} ${group.unit}` : "—"}
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
                {ok ? `${val}${unit ? " "+unit : ""}` : "Hiányzik"}
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
