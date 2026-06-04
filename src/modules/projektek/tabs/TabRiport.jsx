import { useState } from "react";
import { Printer, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../../lib/constants.js";
import { printMunkalap, printProjektRiport } from "../../../lib/reportService.js";
import { calcMunkalapPenzugy } from "../../../lib/costEngine.js";
import { ft } from "../../../lib/helpers.js";

function RiportGomb({ label, icon, onClick, color = C.text }) {
  return (
    <button onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:8,
      padding:"10px 18px", background:color, color:"#fff",
      border:"none", borderRadius:10, cursor:"pointer",
      fontWeight:700, fontSize:13, fontFamily:FONT,
    }}>
      {icon} {label}
    </button>
  );
}

function MunkalapRiportSor({ m, onPrint }) {
  const [open, setOpen] = useState(false);
  const p = calcMunkalapPenzugy(m);
  const hasVbf   = !!localStorage.getItem(`vbf_${m.id}`);
  const hasAnyag = (() => { try { return JSON.parse(localStorage.getItem(`felh_anyagok_${m.id}`)||"[]").length > 0; } catch { return false; } })();
  const hasFelm  = !!localStorage.getItem(`crm_ml_${m.id}_felm_adat`);

  return (
    <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:12, marginBottom:8, overflow:"hidden" }}>
      {/* Fejléc sor */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", cursor:"pointer" }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontWeight:700, color:C.accent, fontSize:13 }}>{m.dokumentumszam || m.ediSorszam || m.id}</span>
            <span style={{ fontSize:11, background:C.bg, color:C.muted, padding:"2px 8px", borderRadius:20, fontWeight:600 }}>{m.status}</span>
            <span style={{ fontSize:11, color:C.muted }}>{m.munkalapTipus || "—"}</span>
          </div>
          <p style={{ fontSize:12, color:C.muted, margin:"3px 0 0" }}>
            {m.clientNev || "—"} · {m.assigneeNev || "—"} · {m.date || "—"}
            &nbsp;
            {hasVbf    && <span title="Van VBF" style={{ color:C.success }}>✓VBF</span>}
            {hasAnyag  && <span title="Van anyaglista" style={{ color:C.accent, marginLeft:4 }}>✓Anyag</span>}
            {hasFelm   && <span title="Van felmérés" style={{ color:C.accent, marginLeft:4 }}>✓Felmérés</span>}
          </p>
        </div>
        {p.bevetal > 0 && (
          <div style={{ textAlign:"right", marginRight:8 }}>
            <p style={{ fontSize:12, fontWeight:700, color:C.success, margin:0 }}>{ft(p.bevetal)}</p>
            <p style={{ fontSize:11, color: p.nyereseg?C.success:C.danger, margin:0 }}>{p.haszonPct}%</p>
          </div>
        )}
        <button onClick={e=>{ e.stopPropagation(); onPrint(m); }}
          style={{ padding:"7px 12px", background:C.text, color:"#fff", border:"none", borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", gap:5, fontSize:12, fontFamily:FONT, fontWeight:600, flexShrink:0 }}>
          <Printer size={13}/> Nyomtat
        </button>
        {open ? <ChevronUp size={16} color={C.muted}/> : <ChevronDown size={16} color={C.muted}/>}
      </div>

      {/* Részletes tartalom előnézet */}
      {open && (
        <div style={{ borderTop:"1px solid #F1F5F9", padding:"12px 16px", background:C.bg }}>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[
              ["📋 Alapadatok", true],
              ["📐 Felmérési adatok", hasFelm],
              ["🔧 Anyagok & sorozatszámok", hasAnyag],
              ["📊 VBF Jegyzőkönyv", hasVbf],
              ["💰 Pénzügy", p.bevetal > 0 || p.osszesKolts > 0],
            ].map(([label, van]) => (
              <span key={label} style={{
                fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:600,
                background: van?C.successLight:C.bg,
                color: van?C.success:C.muted,
              }}>
                {van ? "✓" : "—"} {label}
              </span>
            ))}
          </div>
          <p style={{ fontSize:11, color:C.muted, marginTop:8 }}>
            📸 Fotók <strong>nem</strong> szerepelnek a riportban
          </p>
        </div>
      )}
    </div>
  );
}

export default function TabRiport({ projekt, munkalapok }) {
  const mls = (munkalapok||[]).filter(m =>
    m.projektId === projekt.id || projekt.munkalapIds?.includes(m.id)
  );

  return (
    <div style={{ paddingTop:16 }}>
      {/* Projekt szintű riport */}
      <div style={{ background:C.accentLight, border:"1.5px solid #BFDBFE", borderRadius:14, padding:"18px 20px", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div>
            <h3 style={{ fontFamily:FONT_HEADING, fontSize:16, fontWeight:800, color:C.text, margin:"0 0 4px" }}>
              📑 Projekt teljes riport
            </h3>
            <p style={{ fontSize:13, color:C.muted, margin:0 }}>
              Tartalmaz: projekt adatok · összes munkalap · anyagok & sorozatszámok · VBF-ek · pénzügyi összesítő
            </p>
            <p style={{ fontSize:12, color:C.muted, margin:"4px 0 0" }}>
              📸 Fotók <strong>nem</strong> szerepelnek a riportban
            </p>
          </div>
          <RiportGomb
            label="Projekt riport nyomtatása / PDF"
            icon={<Printer size={15}/>}
            onClick={() => printProjektRiport(projekt, munkalapok)}
            color={C.text}
          />
        </div>
      </div>

      {/* Egyedi munkalap riportok */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <p style={{ fontWeight:700, fontSize:15, color:C.text, margin:0 }}>
          Egyedi munkalap riportok ({mls.length} db)
        </p>
        <p style={{ fontSize:12, color:C.muted, margin:0 }}>
          Kattints a nyilakra a tartalom megtekintéséhez
        </p>
      </div>

      {mls.length === 0 ? (
        <div style={{ textAlign:"center", padding:"40px 0", color:C.muted }}>
          <FileText size={36} style={{ opacity:.2, display:"block", margin:"0 auto 10px" }}/>
          <p>Nincs hozzárendelt munkalap a projekthez</p>
          <p style={{ fontSize:12, marginTop:6 }}>A Munkalapok fülön rendelj hozzá munkalapokat</p>
        </div>
      ) : (
        mls.map(m => (
          <MunkalapRiportSor
            key={m.id}
            m={m}
            onPrint={printMunkalap}
          />
        ))
      )}
    </div>
  );
}
