import { useRef, useState, useEffect } from "react";
import { X, RotateCcw, Check, Printer } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { loadLocal } from "../lib/localDb";

const LS_KEY = "crm_jegyzokonyv_beallitasok";

function getBeallitasok() {
  try { return loadLocal(LS_KEY); } catch { return null; }
}

function buildSzoveg(sablon, m, cegNev) {
  const datum = m.befejezesIdopont
    ? new Date(m.befejezesIdopont).toLocaleDateString("hu-HU", { year:"numeric", month:"long", day:"numeric" })
    : new Date().toLocaleDateString("hu-HU", { year:"numeric", month:"long", day:"numeric" });

  return (sablon || "")
    .replace(/\{ugyfel_neve\}/g,  m.clientNev  || "—")
    .replace(/\{ugyfel_cime\}/g,  m.clientCim  || "—")
    .replace(/\{projekt_kod\}/g,  m.id         || "—")
    .replace(/\{munkaszam\}/g,    m.id         || "—")
    .replace(/\{datum\}/g,        datum)
    .replace(/\{feladat\}/g,      m.feladat || m.projektMegnevezes || "Napelem rendszer telepítés")
    .replace(/\{ceg_neve\}/g,     cegNev       || "—")
    .replace(/\{csapat_neve\}/g,  m.assigneeNev|| "—");
}

export default function AlairasModal({ m, onClose, onSave }) {
  const canvasRef = useRef(null);
  const printRef  = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSign, setHasSign] = useState(false);
  const [step,    setStep]    = useState("preview");

  const b         = getBeallitasok();
  const aktivId   = b?.aktivSablon || "alap";
  const aktivSabl = b?.szovegSablonok?.find(s => s.id === aktivId) || b?.szovegSablonok?.[0];
  const cegNev    = b?.cegNev || "";
  const fejlecKep = b?.fejlecKep || null;
  const labKep    = b?.labKep   || null;

  // Fallback szöveg ha nincs beállítás
  const defaultSzoveg = `ÁTADÁS-ÁTVÉTELI JEGYZŐKÖNYV\n\nÜgyfél neve: {ugyfel_neve}\nÜgyfél címe: {ugyfel_cime}\nProjekt kód: {projekt_kod}\nDátum: {datum}\n\nAlulírott ügyfél igazolom a napelemes rendszer átadás-átvételét.\n\nAz elvégzett munkával elégedett és azt átvette.`;
  const szoveg = buildSzoveg(aktivSabl?.szoveg || defaultSzoveg, m, cegNev);

  // Canvas init
  useEffect(() => {
    if (step === "sign" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ratio  = window.devicePixelRatio || 1;
      canvas.width  = canvas.offsetWidth  * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      const ctx = canvas.getContext("2d");
      ctx.scale(ratio, ratio);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
    }
  }, [step]);

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }
  function startDraw(e) { e.preventDefault(); setDrawing(true); const p=getPos(e,canvasRef.current); const ctx=canvasRef.current.getContext("2d"); ctx.beginPath(); ctx.moveTo(p.x,p.y); }
  function draw(e) { e.preventDefault(); if (!drawing) return; const ctx=canvasRef.current.getContext("2d"); const p=getPos(e,canvasRef.current); ctx.lineTo(p.x,p.y); ctx.stroke(); setHasSign(true); }
  function stopDraw(e) { e.preventDefault(); setDrawing(false); }
  function clearSign() { const c=canvasRef.current; c.getContext("2d").clearRect(0,0,c.width,c.height); setHasSign(false); }

  function saveSign() {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onSave({ alairasDataUrl: dataUrl, alairasDatum: new Date().toISOString(), szoveg });
    setStep("done");
  }

  // PDF nyomtatás
  function handlePrint() {
    const w = window.open("", "_blank");
    w.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Átadás-átvételi Jegyzőkönyv – ${m.id}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; color: #1e293b; margin: 40px; line-height: 1.7; }
        .fejlec { text-align: center; margin-bottom: 24px; }
        .fejlec img { max-height: 120px; max-width: 100%; }
        .szoveg { white-space: pre-wrap; margin: 20px 0; }
        .alairasok { display: flex; justify-content: space-between; margin-top: 48px; }
        .alairas-box { text-align: center; width: 45%; }
        .alairas-box img { max-height: 80px; border-bottom: 1px solid #333; display: block; margin: 0 auto 4px; width: 100%; }
        .alairas-vonal { border-bottom: 1px solid #333; margin-bottom: 6px; height: 60px; }
        .ceg-adatok { font-size: 11px; color: #64748b; margin-top: 8px; }
        .labkep { text-align: center; margin-top: 32px; }
        .labkep img { max-height: 80px; max-width: 100%; }
        @media print { body { margin: 20px; } button { display: none !important; } }
      </style>
      </head><body>
      ${fejlecKep ? `<div class="fejlec"><img src="${fejlecKep}" alt="Fejléc"/></div>` : `<div class="fejlec"><h2>${cegNev || "Átadás-átvételi Jegyzőkönyv"}</h2></div>`}
      <pre class="szoveg">${szoveg.replace(/</g,"&lt;")}</pre>
      <div class="alairasok">
        <div class="alairas-box">
          ${m.alairas?.dataUrl ? `<img src="${m.alairas.dataUrl}" alt="Ügyfél aláírás"/>` : '<div class="alairas-vonal"></div>'}
          <div>${m.clientNev || "Ügyfél"}</div>
          <div style="font-size:11px;color:#64748b">${m.alairas?.datum ? new Date(m.alairas.datum).toLocaleString("hu-HU") : ""}</div>
        </div>
        <div class="alairas-box">
          <div class="alairas-vonal"></div>
          <div>${cegNev || "Kivitelező"}</div>
        </div>
      </div>
      ${labKep ? `<div class="labkep"><img src="${labKep}" alt="Lábléc"/></div>` : ""}
      ${b?.cegCim || b?.cegTel || b?.cegEmail ? `<div class="ceg-adatok" style="margin-top:24px;text-align:center">${[b?.cegCim, b?.cegTel, b?.cegEmail, b?.cegAdoszam].filter(Boolean).join(" · ")}</div>` : ""}
      <script>window.onload = () => { window.print(); }</script>
      </body></html>
    `);
    w.document.close();
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:300, display:"flex", flexDirection:"column", fontFamily:FONT }}>
      <div style={{ background:"#fff", flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Fejléc */}
        <div style={{ background:"#1e3a5c", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <p style={{ color:"#fff", fontWeight:800, fontSize:17, fontFamily:FONT_HEADING }}>
              {step==="preview" ? "Átadás-átvételi Jegyzőkönyv" : step==="sign" ? "Ügyfél aláírása" : "Aláírva ✓"}
            </p>
            <p style={{ color:"#94A3B8", fontSize:12 }}>{m.id} · {m.clientNev || ""}</p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {step==="preview" && (
              <button onClick={handlePrint} style={{ border:"none", background:"rgba(255,255,255,0.15)", color:"#fff", cursor:"pointer", borderRadius:8, padding:"6px 12px", display:"flex", alignItems:"center", gap:5, fontSize:13 }}>
                <Printer size={16}/> PDF
              </button>
            )}
            <button onClick={onClose} style={{ border:"none", background:"rgba(255,255,255,0.15)", color:"#fff", cursor:"pointer", borderRadius:8, padding:"6px 10px" }}>
              <X size={20}/>
            </button>
          </div>
        </div>

        {/* ELŐNÉZET */}
        {step==="preview" && (
          <>
            <div ref={printRef} style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
              {fejlecKep && <img src={fejlecKep} alt="Fejléc" style={{ maxHeight:100, maxWidth:"100%", display:"block", margin:"0 auto 16px" }}/>}
              <div style={{ background:"#F8FAFC", borderRadius:12, padding:"20px 24px", border:`1px solid ${C.border}`, whiteSpace:"pre-wrap", fontSize:14, lineHeight:1.8, color:C.text, fontFamily:"monospace" }}>
                {szoveg}
              </div>
              {labKep && <img src={labKep} alt="Lábléc" style={{ maxHeight:80, maxWidth:"100%", display:"block", margin:"16px auto 0" }}/>}
              <p style={{ fontSize:12, color:C.muted, marginTop:16, lineHeight:1.6, textAlign:"center" }}>
                Az ügyfél elolvassa, majd aláírja a következő lapon.
              </p>
            </div>
            <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.border}`, display:"flex", gap:10 }}>
              <button onClick={handlePrint} style={{ flex:1, padding:"13px", borderRadius:12, border:`1.5px solid ${C.border}`, background:"#fff", color:C.text, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:FONT }}>
                <Printer size={16}/> Nyomtatás / PDF
              </button>
              <button onClick={()=>setStep("sign")} style={{ flex:2, padding:"13px", borderRadius:12, border:"none", background:"#1e3a5c", color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:FONT }}>
                Tovább az aláíráshoz →
              </button>
            </div>
          </>
        )}

        {/* ALÁÍRÁS */}
        {step==="sign" && (
          <>
            <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"16px 20px" }}>
              <p style={{ fontSize:13, color:C.muted, marginBottom:12, textAlign:"center" }}>Kérem az ügyfelet, írja alá az alábbi mezőben!</p>
              <div style={{ flex:1, border:`2px solid #1e3a5c`, borderRadius:12, overflow:"hidden", background:"#fff", position:"relative", minHeight:220 }}>
                <canvas ref={canvasRef}
                  style={{ width:"100%", height:"100%", display:"block", touchAction:"none", cursor:"crosshair" }}
                  onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                  onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}/>
                {!hasSign && (
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                    <p style={{ fontSize:14, color:"#CBD5E1", fontStyle:"italic" }}>✍️ Aláírás helye</p>
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding:"12px 20px 20px", display:"flex", gap:10, borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
              <button onClick={clearSign} style={{ flex:1, padding:"12px", borderRadius:10, border:`1.5px solid ${C.border}`, background:"#fff", color:C.textSub, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:FONT }}>
                <RotateCcw size={16}/>Törlés
              </button>
              <button onClick={saveSign} disabled={!hasSign} style={{ flex:2, padding:"12px", borderRadius:10, border:"none", background:hasSign?"#22C55E":"#E2E8F0", color:"#fff", fontWeight:700, cursor:hasSign?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:FONT, fontSize:15 }}>
                <Check size={18}/>Aláírás elfogadása
              </button>
            </div>
          </>
        )}

        {/* KÉSZ */}
        {step==="done" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
            <div style={{ width:72, height:72, borderRadius:"50%", background:"#ECFDF5", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
              <Check size={36} color={C.success}/>
            </div>
            <p style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:8 }}>Aláírva!</p>
            <p style={{ fontSize:14, color:C.muted, marginBottom:24 }}>A jegyzőkönyv és az aláírás mentve lett a munkalaphoz.</p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={handlePrint} style={{ padding:"12px 20px", borderRadius:12, border:`1.5px solid ${C.border}`, background:"#fff", color:C.text, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontFamily:FONT }}>
                <Printer size={16}/>PDF letöltés
              </button>
              <button onClick={onClose} style={{ padding:"12px 24px", borderRadius:12, border:"none", background:C.accent, color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:FONT }}>
                Bezárás
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
