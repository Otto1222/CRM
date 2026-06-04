import { useState, useEffect, useCallback } from "react";
import { Save, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { saveVbf, loadVbf } from "../lib/munkalapDb";

// ─── Mező definíciók ─────────────────────────────────────────
const VBF_SECTIONS = [
  {
    id: "ac_feszultseg", title: "AC feszültség", fields: [
      { key: "ac_l1", label: "L1", unit: "V" },
      { key: "ac_l2", label: "L2", unit: "V" },
      { key: "ac_l3", label: "L3", unit: "V" },
    ]
  },
  {
    id: "kismeg_inverter", title: "Kismegszakító értéke inverternél", fields: [
      { key: "ki_l1", label: "L1", unit: "A" },
      { key: "ki_l2", label: "L2", unit: "A" },
      { key: "ki_l3", label: "L3", unit: "A" },
    ]
  },
  {
    id: "kismeg_mero", title: "Kismegszakító értéke mérőhelynél", fields: [
      { key: "km_l1", label: "L1", unit: "A" },
      { key: "km_l2", label: "L2", unit: "A" },
      { key: "km_l3", label: "L3", unit: "A" },
    ]
  },
  {
    id: "panelszam", title: "Panelszám", fields: [
      { key: "ps_st1", label: "ST1", unit: "db" },
      { key: "ps_st2", label: "ST2", unit: "db" },
      { key: "ps_st3", label: "ST3", unit: "db" },
      { key: "ps_st4", label: "ST4", unit: "db" },
      { key: "ps_st5", label: "ST5", unit: "db" },
      { key: "ps_st6", label: "ST6", unit: "db" },
    ]
  },
  {
    id: "dc_feszultseg", title: "DC feszültség", fields: [
      { key: "dc_st1", label: "ST1", unit: "V" },
      { key: "dc_st2", label: "ST2", unit: "V" },
      { key: "dc_st3", label: "ST3", unit: "V" },
      { key: "dc_st4", label: "ST4", unit: "V" },
      { key: "dc_st5", label: "ST5", unit: "V" },
      { key: "dc_st6", label: "ST6", unit: "V" },
    ]
  },
  {
    id: "hurokellenallas", title: "Hurokellenállás", fields: [
      { key: "hu_l1", label: "L1", unit: "MOhm" },
      { key: "hu_l2", label: "L2", unit: "MOhm" },
      { key: "hu_l3", label: "L3", unit: "MOhm" },
    ]
  },
  {
    id: "smart_akku", title: "Eszközök", fields: [
      { key: "smart_meter", label: "Smart meter", unit: "DB" },
      { key: "akku_db",     label: "AKKU",         unit: "DB" },
    ]
  },
  {
    id: "dc_tel", title: "Betáplált DC teljesítmény", fields: [
      { key: "dc_teljesitmeny", label: "DC teljesítmény", unit: "Wp" },
    ]
  },
  {
    id: "panel_adatok", title: "Panel pontos adatok", fields: [
      { key: "panel_tipus", label: "Típusa",  unit: "" },
      { key: "panel_voc",   label: "Voc",     unit: "V" },
      { key: "panel_vmp",   label: "Vmp",     unit: "V" },
      { key: "panel_imp",   label: "Imp",     unit: "A" },
      { key: "panel_isc",   label: "Isc",     unit: "A" },
      { key: "panel_telj",  label: "Telj.",   unit: "Wp" },
    ]
  },
  {
    id: "inverter_adatok", title: "Inverter pontos adatok", fields: [
      { key: "inv_nevleges", label: "Névleges teljesítménye", unit: "kVA" },
    ]
  },
  {
    id: "epulet_alapfoldes", title: "Épület alapföldelés", fields: [
      { key: "epulet_alapfoldes", label: "Épület alapföldelés", unit: "Ω" },
    ]
  },
  {
    id: "tuzeseti", title: "Tűzeseti adatok", fields: [
      { key: "tuz_megszakito", label: "Megszakító értéke", unit: "A" },
    ]
  },
];

// Összes mező listája validációhoz
export const ALL_VBF_FIELDS = VBF_SECTIONS.flatMap(s => s.fields);

function MezoSor({ field, value, onChange, hiba }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10 }}>
      <span style={{ fontSize:14, color:C.text, width:120, flexShrink:0 }}>{field.label}</span>
      <div style={{ flex:1, position:"relative" }}>
        <input
          type="text"
          inputMode="decimal"
          value={value ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder="0"
          style={{
            width:"100%", padding:"9px 12px",
            border:`1.5px solid ${hiba ? C.danger : (value !== "" && value !== undefined ? C.success : C.border)}`,
            borderRadius:8, fontSize:14, fontFamily:FONT,
            color:C.text, outline:"none",
            background: hiba ? "#FEF2F2" : "#fff",
          }}
        />
      </div>
      {field.unit && <span style={{ fontSize:13, color:C.muted, width:50, flexShrink:0 }}>{field.unit}</span>}
      {value !== "" && value !== undefined && !hiba && <CheckCircle2 size={16} color={C.success} style={{ flexShrink:0 }}/>}
      {hiba && <AlertTriangle size={16} color={C.danger} style={{ flexShrink:0 }}/>}
    </div>
  );
}

function Szekció({ sec, data, onChange, hibak, validated }) {
  const [open, setOpen] = useState(true);
  const secHibak = sec.fields.filter(f => hibak.includes(f.key)).length;
  const secKitoltve = sec.fields.filter(f => data[f.key] !== "" && data[f.key] !== undefined).length;

  return (
    <div style={{ marginBottom:12, borderRadius:12, overflow:"hidden", border:`1.5px solid ${secHibak>0&&validated?C.danger:secKitoltve===sec.fields.length?C.success:C.border}` }}>
      <button onClick={()=>setOpen(p=>!p)} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"13px 16px", background:secKitoltve===sec.fields.length?"#ECFDF5":secHibak>0&&validated?"#FEF2F2":"#F8FAFC", border:"none", cursor:"pointer", fontFamily:FONT }}>
        <span style={{ flex:1, fontWeight:700, fontSize:14, color:C.text, textAlign:"left" }}>{sec.title}</span>
        <span style={{ fontSize:12, color: secKitoltve===sec.fields.length?C.success:C.muted }}>
          {secKitoltve}/{sec.fields.length} kitöltve
        </span>
        {open ? <ChevronUp size={16} color={C.muted}/> : <ChevronDown size={16} color={C.muted}/>}
      </button>
      {open && (
        <div style={{ padding:"12px 16px 8px", background:"#fff" }}>
          {sec.fields.map(f => (
            <MezoSor
              key={f.key} field={f}
              value={data[f.key]}
              onChange={v => onChange(f.key, v)}
              hiba={validated && hibak.includes(f.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VbfJegyzokonyv({ munkalapId }) {
  const [data, setData]           = useState(() => loadVbf(munkalapId));
  const [hibak, setHibak]         = useState([]);
  const [validated, setValidated] = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveMsg, setSaveMsg]     = useState("");

  // Automatikus mentés 1.5 mp után minden változásnál
  useEffect(() => {
    const t = setTimeout(() => {
      saveVbf(munkalapId, data);
      setSaved(true);
      setSaveMsg("Automatikusan mentve ✓");
      setTimeout(() => setSaved(false), 2000);
    }, 1500);
    return () => clearTimeout(t);
  }, [data, munkalapId]);

  function handleChange(key, value) {
    setData(prev => ({ ...prev, [key]: value }));
    // Validáció frissítése ha már volt
    if (validated) {
      const h = ALL_VBF_FIELDS.filter(f => {
        const v = key === f.key ? value : data[f.key];
        return v === undefined || v === null || v === "";
      }).map(f => f.key);
      setHibak(h);
    }
  }

  function validate() {
    const h = ALL_VBF_FIELDS.filter(f => {
      const v = data[f.key];
      return v === undefined || v === null || v === "";
    }).map(f => f.key);
    setHibak(h);
    setValidated(true);
    if (h.length === 0) {
      saveVbf(munkalapId, data);
      setSaveMsg("✅ Minden mező kitöltve és mentve!");
    } else {
      setSaveMsg(`⚠️ ${h.length} mező hiányzik! Az üres mezőkbe írj "0"-t.`);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 4000);
    return h.length === 0;
  }

  const osszes = ALL_VBF_FIELDS.length;
  const kitoltve = ALL_VBF_FIELDS.filter(f => data[f.key] !== "" && data[f.key] !== undefined).length;
  const szazalek = Math.round((kitoltve / osszes) * 100);

  return (
    <div style={{ padding:"12px 16px", fontFamily:FONT, paddingBottom:80 }}>
      {/* Fejléc + progress */}
      <div style={{ background:"#fff", borderRadius:12, padding:"14px 16px", marginBottom:16, border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ fontWeight:700, fontSize:15, color:C.text }}>VBF Jegyzőkönyv</span>
          <span style={{ fontSize:13, color:C.muted }}>{kitoltve}/{osszes} mező</span>
        </div>
        <div style={{ background:C.bg, borderRadius:8, height:8, overflow:"hidden" }}>
          <div style={{ width:`${szazalek}%`, height:"100%", background: szazalek===100?C.success:C.accent, borderRadius:8, transition:"width .3s" }}/>
        </div>
        <p style={{ fontSize:11, color:C.muted, marginTop:6 }}>
          Az üres mezőkbe írj <b>"0"</b>-t ha nem releváns!
        </p>
      </div>

      {/* Toast */}
      {saved && saveMsg && (
        <div style={{ background: saveMsg.startsWith("✅")?C.success:saveMsg.startsWith("⚠️")?C.warning:C.accent, color:"#fff", borderRadius:10, padding:"10px 16px", marginBottom:14, fontSize:13, fontWeight:600 }}>
          {saveMsg}
        </div>
      )}

      {/* Szekciók */}
      {VBF_SECTIONS.map(sec => (
        <Szekció key={sec.id} sec={sec} data={data} onChange={handleChange} hibak={hibak} validated={validated}/>
      ))}

      {/* Mentés / Ellenőrzés gomb */}
      <button onClick={validate} style={{ position:"fixed", bottom:16, left:16, right:16, padding:"14px", borderRadius:12, border:"none", background: kitoltve===osszes?C.success:C.accent, color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT, zIndex:10 }}>
        {kitoltve===osszes ? <><CheckCircle2 size={18}/> Mentés és ellenőrzés</> : <><Save size={18}/> Ellenőrzés ({szazalek}% kész)</>}
      </button>
    </div>
  );
}
