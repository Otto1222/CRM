/**
 * LmraModal.jsx – Last Minute Risk Assessment
 *
 * Flow:
 * 1. Csapattagok nevének megadása (előtöltve a csapatból, szerkeszthető)
 * 2. Kockázatok áttekintése (checkboxok)
 * 3. Minden tag aláír egymás után a saját neve alatt
 * 4. Mentés → munkalap megkezdés engedélyezett
 */

import { useState, useRef, useEffect } from "react";
import { AlertTriangle, Check, ChevronRight, RotateCcw, X, Shield, Users } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { loadLocal, saveLocal } from "../lib/localDb";
import { getCsapat } from "../modules/csapatok/csapat.service";

// ─── Kockázati pontok – Beállítások-ból vagy default ─────────
const DEFAULT_KOCKAZATOK = [
  { id: "k1", szoveg: "Munkaterületet felmértem, biztonságos a munkavégzéshez" },
  { id: "k2", szoveg: "Egyéni védőfelszerelés (sisak, kesztyű, biztonsági cipő) megvan és viselem" },
  { id: "k3", szoveg: "Elektromos veszélyeket azonosítottam, szükséges lekapcsolások megtörténtek" },
  { id: "k4", szoveg: "Tetőn végzett munkánál esővédelem, csúszásgátló eszköz megvan" },
  { id: "k5", szoveg: "Emelési munkáknál a teherbírás ellenőrizve, megfelelő eszköz biztosítva" },
  { id: "k6", szoveg: "Sürgősségi elérhetőségek ismertek, mentési útvonal szabad" },
  { id: "k7", szoveg: "A munkaterületen nincs illetéktelen személy (különösen gyermek)" },
];

function loadKockazatok() {
  try {
    const b = loadLocal("crm_lmra_beallitasok");
    if (b?.kockazatok?.length) return b.kockazatok;
  } catch {}
  return DEFAULT_KOCKAZATOK;
}

// ─── Aláírás canvas komponens ────────────────────────────────
function AlairasMezo({ nev, onSave, onCancel }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSign, setHasSign] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
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
  }, []);

  function getPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }
  function startDraw(e) { e.preventDefault(); setDrawing(true); const p = getPos(e); const ctx = canvasRef.current.getContext("2d"); ctx.beginPath(); ctx.moveTo(p.x, p.y); }
  function draw(e)      { e.preventDefault(); if (!drawing) return; const ctx = canvasRef.current.getContext("2d"); const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setHasSign(true); }
  function stopDraw(e)  { e.preventDefault(); setDrawing(false); }
  function clearSign()  { const c = canvasRef.current; c.getContext("2d").clearRect(0, 0, c.width, c.height); setHasSign(false); }

  function handleMent() {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onSave({ nev, dataUrl, datum: new Date().toISOString() });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "10px 14px", fontSize: 14, fontWeight: 700, color: "#1D4ED8", textAlign: "center" }}>
        ✍️ {nev} — kérem, írja alá!
      </div>
      <div style={{ border: "2px solid #1e3a5c", borderRadius: 12, overflow: "hidden", background: "#fff", position: "relative", height: 160 }}>
        <canvas ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "crosshair" }}
          onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
          onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
        {!hasSign && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <p style={{ fontSize: 13, color: "#CBD5E1", fontStyle: "italic" }}>✍️ Aláírás helye</p>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={clearSign}
          style={{ flex: 1, padding: "11px", border: "1.5px solid #E2E8F0", borderRadius: 9, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: FONT, fontWeight: 600 }}>
          <RotateCcw size={15} /> Törlés
        </button>
        <button onClick={handleMent} disabled={!hasSign}
          style={{ flex: 2, padding: "11px", border: "none", borderRadius: 9, background: hasSign ? "#059669" : "#E2E8F0", color: "#fff", cursor: hasSign ? "pointer" : "default", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: FONT }}>
          <Check size={16} /> Aláírva – Következő
        </button>
      </div>
    </div>
  );
}

// ─── Fő LMRA modal ───────────────────────────────────────────
export default function LmraModal({ munkalap, onClose, onComplete }) {
  const kockazatok = loadKockazatok();

  // Csapattagok betöltése – előtölt a csapatból, szerkeszthető
  const initTagok = () => {
    const csapatId = munkalap.csapatId || munkalap.assigneeId;
    const csapat = csapatId ? getCsapat(csapatId) : null;
    const tagNevek = csapat?.tagNevek?.length
      ? csapat.tagNevek
      : munkalap.csapatNev
        ? [munkalap.csapatNev]
        : [""];
    return tagNevek.map(nev => ({ nev, aktiv: true }));
  };

  const [step, setStep]           = useState("tagok");    // tagok → kockazat → alairas → kesz
  const [tagok, setTagok]         = useState(initTagok);
  const [checkek, setCheckek]     = useState(() => Object.fromEntries(kockazatok.map(k => [k.id, false])));
  const [alairasSor, setAlairasSor] = useState(0);        // melyik tag ír alá épp
  const [alairiasok, setAlairasok] = useState([]);        // összegyűjtött aláírások
  const [ujNev, setUjNev]         = useState("");

  const aktivTagok = tagok.filter(t => t.aktiv && t.nev.trim());
  const mindCheck  = kockazatok.every(k => checkek[k.id]);

  // ─── Tag kezelés ──────────────────────────────────────────
  function updTag(i, v)   { setTagok(p => p.map((t, j) => j === i ? { ...t, nev: v } : t)); }
  function removeTag(i)   { setTagok(p => p.filter((_, j) => j !== i)); }
  function addTag()       { if (!ujNev.trim()) return; setTagok(p => [...p, { nev: ujNev.trim(), aktiv: true }]); setUjNev(""); }

  // ─── Kockázat checkbox ────────────────────────────────────
  function toggleCheck(id) { setCheckek(p => ({ ...p, [id]: !p[id] })); }

  // ─── Aláírás mentés ───────────────────────────────────────
  function handleAlairasSave(data) {
    const uj = [...alairiasok, data];
    setAlairasok(uj);
    if (uj.length >= aktivTagok.length) {
      // Mindenki aláírt – lezárjuk
      const lmraAdat = {
        datum:      new Date().toISOString(),
        munkalapId: munkalap.id,
        tagok:      aktivTagok.map(t => t.nev),
        kockazatok: kockazatok.map(k => ({ ...k, elfogadva: checkek[k.id] })),
        alairiasok: uj,
      };
      saveLocal(`lmra_${munkalap.id}`, lmraAdat);
      setStep("kesz");
      onComplete(lmraAdat);
    } else {
      setAlairasSor(s => s + 1);
    }
  }

  // ─── Render ───────────────────────────────────────────────
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "#1e3a5c", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={20} color="#FCD34D" />
            <div>
              <p style={{ color: "#fff", fontWeight: 800, fontSize: 16, fontFamily: FONT_HEADING, margin: 0 }}>LMRA – Kockázatbecslés</p>
              <p style={{ color: "#94A3B8", fontSize: 11, margin: 0 }}>Last Minute Risk Assessment · {munkalap.munkalapSzam || munkalap.id}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", borderRadius: 8, padding: "6px 10px" }}>
            <X size={20} />
          </button>
        </div>

        {/* Lépés jelző */}
        <div style={{ display: "flex", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
          {[
            { id: "tagok",    label: "1. Csapattagok", icon: Users },
            { id: "kockazat", label: "2. Kockázatok",  icon: AlertTriangle },
            { id: "alairas",  label: "3. Aláírások",   icon: Check },
          ].map(({ id, label, icon: Icon }) => {
            const steps  = ["tagok", "kockazat", "alairas", "kesz"];
            const aktIdx = steps.indexOf(step);
            const sIdx   = steps.indexOf(id);
            const done   = aktIdx > sIdx;
            const active = step === id || (step === "kesz" && id === "alairas");
            return (
              <div key={id} style={{ flex: 1, padding: "10px 8px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderBottom: active ? "3px solid #2563EB" : "3px solid transparent", opacity: done || active ? 1 : 0.4 }}>
                <Icon size={14} color={active ? "#2563EB" : done ? "#059669" : "#94A3B8"} />
                <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#2563EB" : done ? "#059669" : "#94A3B8" }}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* Tartalom */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 24px" }}>

          {/* ── LÉPÉS 1: Csapattagok ── */}
          {step === "tagok" && (
            <div>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                Ellenőrizd és szerkeszd a mai csapat tagjait. Mindenki a saját neve alatt fog aláírni.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {tagok.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input value={t.nev} onChange={e => updTag(i, e.target.value)}
                      placeholder={`${i + 1}. tag neve`}
                      style={{ flex: 1, padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 14, fontFamily: FONT, outline: "none" }} />
                    {tagok.length > 1 && (
                      <button onClick={() => removeTag(i)}
                        style={{ padding: "8px 10px", border: "none", background: "#FEF2F2", borderRadius: 8, cursor: "pointer", color: "#DC2626" }}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={ujNev} onChange={e => setUjNev(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addTag()}
                  placeholder="+ Új tag hozzáadása…"
                  style={{ flex: 1, padding: "10px 12px", border: "1.5px dashed #CBD5E1", borderRadius: 9, fontSize: 13, fontFamily: FONT, outline: "none", background: "#F8FAFC" }} />
                <button onClick={addTag} disabled={!ujNev.trim()}
                  style={{ padding: "10px 16px", border: "none", background: ujNev.trim() ? "#2563EB" : "#E2E8F0", color: "#fff", borderRadius: 9, cursor: ujNev.trim() ? "pointer" : "default", fontWeight: 700, fontFamily: FONT }}>
                  + Add
                </button>
              </div>
            </div>
          )}

          {/* ── LÉPÉS 2: Kockázatok ── */}
          {step === "kockazat" && (
            <div>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
                Olvassátok át és fogadjátok el az alábbi biztonsági pontokat a munkakezdés előtt.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {kockazatok.map(k => (
                  <div key={k.id} onClick={() => toggleCheck(k.id)}
                    style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                      background: checkek[k.id] ? "#ECFDF5" : "#F8FAFC",
                      border: `1.5px solid ${checkek[k.id] ? "#86EFAC" : "#E2E8F0"}`,
                      transition: "all .15s" }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                      background: checkek[k.id] ? "#059669" : "#fff",
                      border: `2px solid ${checkek[k.id] ? "#059669" : "#CBD5E1"}`,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {checkek[k.id] && <Check size={13} color="#fff" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 13, color: checkek[k.id] ? "#166534" : C.text, lineHeight: 1.5 }}>{k.szoveg}</span>
                  </div>
                ))}
              </div>
              {!mindCheck && (
                <div style={{ marginTop: 12, padding: "10px 14px", background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 9, fontSize: 12, color: "#92400E" }}>
                  ⚠️ Minden pontot el kell fogadni a folytatáshoz ({kockazatok.filter(k => checkek[k.id]).length}/{kockazatok.length} elfogadva)
                </div>
              )}
            </div>
          )}

          {/* ── LÉPÉS 3: Aláírások ── */}
          {step === "alairas" && (
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {aktivTagok.map((t, i) => (
                  <span key={i} style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20,
                    background: i < alairiasok.length ? "#ECFDF5" : i === alairasSor ? "#EFF6FF" : "#F8FAFC",
                    color: i < alairiasok.length ? "#059669" : i === alairasSor ? "#2563EB" : "#94A3B8",
                    border: `1px solid ${i < alairiasok.length ? "#86EFAC" : i === alairasSor ? "#BFDBFE" : "#E2E8F0"}` }}>
                    {i < alairiasok.length ? "✓ " : i === alairasSor ? "→ " : ""}{t.nev}
                  </span>
                ))}
              </div>
              <AlairasMezo
                nev={aktivTagok[alairasSor]?.nev || ""}
                onSave={handleAlairasSave}
                onCancel={onClose}
              />
              <p style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 10 }}>
                {alairasSor + 1} / {aktivTagok.length} aláírás
              </p>
            </div>
          )}

          {/* ── KÉSZ ── */}
          {step === "kesz" && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <Shield size={40} color="#059669" />
              </div>
              <p style={{ fontSize: 20, fontWeight: 800, color: C.text, marginBottom: 8 }}>LMRA kész!</p>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 4 }}>Minden csapattag aláírta a kockázatbecslést.</p>
              <p style={{ fontSize: 13, color: C.muted }}>{new Date().toLocaleString("hu-HU")}</p>
              <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                {alairiasok.map((a, i) => (
                  <span key={i} style={{ fontSize: 12, background: "#ECFDF5", color: "#059669", padding: "4px 12px", borderRadius: 20, fontWeight: 700 }}>
                    ✓ {a.nev}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer gombok */}
        {step !== "kesz" && step !== "alairas" && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid #E2E8F0", flexShrink: 0 }}>
            {step === "tagok" && (
              <button
                onClick={() => setStep("kockazat")}
                disabled={aktivTagok.length === 0}
                style={{ width: "100%", padding: "14px", border: "none", borderRadius: 12, background: aktivTagok.length > 0 ? "#2563EB" : "#E2E8F0", color: "#fff", fontWeight: 700, fontSize: 15, cursor: aktivTagok.length > 0 ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT }}>
                Tovább: Kockázatok áttekintése <ChevronRight size={18} />
              </button>
            )}
            {step === "kockazat" && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => setStep("tagok")}
                  style={{ flex: 1, padding: "13px", border: "1.5px solid #E2E8F0", borderRadius: 12, background: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: FONT }}>
                  ← Vissza
                </button>
                <button onClick={() => setStep("alairas")} disabled={!mindCheck}
                  style={{ flex: 2, padding: "13px", border: "none", borderRadius: 12, background: mindCheck ? "#2563EB" : "#E2E8F0", color: "#fff", fontWeight: 700, fontSize: 15, cursor: mindCheck ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT }}>
                  Tovább: Aláírások <ChevronRight size={18} />
                </button>
              </div>
            )}
          </div>
        )}

        {step === "kesz" && (
          <div style={{ padding: "14px 20px", borderTop: "1px solid #E2E8F0", flexShrink: 0 }}>
            <button onClick={onClose}
              style={{ width: "100%", padding: "14px", border: "none", borderRadius: 12, background: "#059669", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT }}>
              <Check size={18} /> Munka megkezdése →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
