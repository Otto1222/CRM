import { useRef, useState, useEffect } from "react";
import { X, RotateCcw, Check } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";

const JEGYZOKONYV_SZOVEG = `ÁTADÁS-ÁTVÉTELI JEGYZŐKÖNYV

Napelemes rendszer telepítése

Helyszín: {cim}
Dátum: {datum}
Munkaszám: {munkaszam}

Alulírott ügyfél igazolom, hogy a fenti munkaszámon nyilvántartott napelemes rendszer telepítési munkát a(z) {csapat} csapat elvégezte, a rendszer átadásra került.

A telepítés során az alábbi munkák valósultak meg:
{feladat}

Az ügyfél kijelenti:
• A munkaterületet rendben, hiánytalanul visszakapta.
• A rendszer beüzemelése megtörtént.
• A kezelési útmutatót megkapta és megértette.
• A rendszerrel kapcsolatos kérdéseire választ kapott.

Az elvégzett munkával elégedett és azt átvette.`;

export default function AlairasModal({ m, onClose, onSave }) {
  const canvasRef  = useRef(null);
  const [drawing,  setDrawing]  = useState(false);
  const [hasSign,  setHasSign]  = useState(false);
  const [lastPos,  setLastPos]  = useState(null);
  const [step,     setStep]     = useState("preview"); // preview | sign | done

  const datum   = new Date().toLocaleDateString("hu-HU", { year:"numeric", month:"long", day:"numeric" });
  const szoveg  = JEGYZOKONYV_SZOVEG
    .replace("{cim}",      m.clientCim || "—")
    .replace("{datum}",    datum)
    .replace("{munkaszam}",m.id)
    .replace("{csapat}",   m.assigneeNev || "—")
    .replace("{feladat}",  m.feladat || m.projektMegnevezes || "Napelem rendszer telepítés");

  // Canvas méret beállítás
  useEffect(() => {
    if (step === "sign" && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width  = canvas.offsetWidth  * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      const ctx = canvas.getContext("2d");
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth   = 2.5;
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
    }
  }, [step]);

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left),
      y: (src.clientY - rect.top),
    };
  }

  function startDraw(e) {
    e.preventDefault();
    setDrawing(true);
    const pos = getPos(e, canvasRef.current);
    setLastPos(pos);
    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e) {
    e.preventDefault();
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pos    = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setLastPos(pos);
    setHasSign(true);
  }

  function stopDraw(e) {
    e.preventDefault();
    setDrawing(false);
  }

  function clearSign() {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSign(false);
  }

  function saveSign() {
    const canvas = canvasRef.current;
    const dataUrl = canvas.toDataURL("image/png");
    const ts = new Date().toISOString();
    onSave({ alairasDataUrl: dataUrl, alairasDatum: ts, szoveg });
    setStep("done");
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:300, display:"flex", flexDirection:"column", fontFamily:FONT }}>
      <div style={{ background:"#fff", flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* Fejléc */}
        <div style={{ background:"#1e3a5c", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div>
            <p style={{ color:"#fff", fontWeight:800, fontSize:17, fontFamily:FONT_HEADING }}>
              {step==="preview" ? "Átadás-átvételi jegyzőkönyv" : step==="sign" ? "Ügyfél aláírása" : "Aláírva ✓"}
            </p>
            <p style={{ color:"#94A3B8", fontSize:12 }}>{m.id} · {m.clientNev || ""}</p>
          </div>
          <button onClick={onClose} style={{ border:"none", background:"rgba(255,255,255,0.15)", color:"#fff", cursor:"pointer", borderRadius:8, padding:"6px 10px" }}>
            <X size={20}/>
          </button>
        </div>

        {/* ELŐNÉZET lépés */}
        {step==="preview" && (
          <>
            <div style={{ flex:1, overflowY:"auto", padding:"20px 24px" }}>
              <div style={{ background:"#F8FAFC", borderRadius:12, padding:"20px 24px", border:`1px solid ${C.border}`, whiteSpace:"pre-wrap", fontSize:14, lineHeight:1.8, color:C.text, fontFamily:"monospace" }}>
                {szoveg}
              </div>
              <p style={{ fontSize:13, color:C.muted, marginTop:16, lineHeight:1.6 }}>
                📝 Az ügyfél elolvassa a fenti szöveget, majd a következő lapon aláírja. Az aláírás a munkalaphoz kerül mentésre.
              </p>
            </div>
            <div style={{ padding:"16px 24px", borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
              <button onClick={()=>setStep("sign")} style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", background:"#1e3a5c", color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer", fontFamily:FONT }}>
                Tovább az aláíráshoz →
              </button>
            </div>
          </>
        )}

        {/* ALÁÍRÁS lépés */}
        {step==="sign" && (
          <>
            <div style={{ flex:1, display:"flex", flexDirection:"column", padding:"16px 20px" }}>
              <p style={{ fontSize:13, color:C.muted, marginBottom:12, textAlign:"center" }}>
                Ügyfél: aláírjon az alábbi fehér területen
              </p>
              <div style={{ flex:1, border:`2px solid #1e3a5c`, borderRadius:12, overflow:"hidden", background:"#fff", position:"relative", minHeight:200 }}>
                <canvas
                  ref={canvasRef}
                  style={{ width:"100%", height:"100%", display:"block", touchAction:"none", cursor:"crosshair" }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
                {!hasSign && (
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
                    <p style={{ fontSize:14, color:"#CBD5E1", fontStyle:"italic" }}>✍️ Aláírás helye</p>
                  </div>
                )}
              </div>
              <p style={{ fontSize:12, color:C.muted, textAlign:"center", marginTop:10 }}>
                Az aláírással az ügyfél igazolja az átadás-átvételt.
              </p>
            </div>
            <div style={{ padding:"12px 20px 20px", flexShrink:0, display:"flex", gap:12, borderTop:`1px solid ${C.border}` }}>
              <button onClick={clearSign} style={{ flex:1, padding:"12px", borderRadius:10, border:`1.5px solid ${C.border}`, background:"#fff", color:C.textSub, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:FONT }}>
                <RotateCcw size={16}/> Törlés
              </button>
              <button onClick={saveSign} disabled={!hasSign} style={{ flex:2, padding:"12px", borderRadius:10, border:"none", background:hasSign?"#22C55E":"#E2E8F0", color:"#fff", fontWeight:700, cursor:hasSign?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:FONT, fontSize:15 }}>
                <Check size={18}/> Aláírás elfogadása
              </button>
            </div>
          </>
        )}

        {/* KÉSZ lépés */}
        {step==="done" && (
          <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:32, textAlign:"center" }}>
            <div style={{ width:72, height:72, borderRadius:"50%", background:"#ECFDF5", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:20 }}>
              <Check size={36} color={C.success}/>
            </div>
            <p style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:8 }}>Aláírva!</p>
            <p style={{ fontSize:14, color:C.muted, marginBottom:24 }}>A jegyzőkönyv és az aláírás mentve lett a munkalaphoz.</p>
            <button onClick={onClose} style={{ padding:"13px 32px", borderRadius:12, border:"none", background:C.accent, color:"#fff", fontWeight:700, fontSize:16, cursor:"pointer", fontFamily:FONT }}>
              Bezárás
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
