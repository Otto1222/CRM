/**
 * LmraModal.jsx – LMRA (Last Minute Risk Assessment)
 *
 * Az LMRA egy fix jogszabályi nyomtatvány.
 * Flow:
 *   1. Fejléc kitöltése (időpont, helyszín, munkavezető, munka)
 *   2. Kockázatok értékelése (Igen/Nem + intézkedés)
 *   3. Csapattagok aláírása egyenként
 *
 * Ha admin feltöltött PDF sablont → megtekinthető referenciának.
 */

import { useState, useRef, useEffect } from "react";
import { Shield, ChevronRight, RotateCcw, Check, X, Users, AlertTriangle, FileText } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { LMRA_KOCKAZATOK, saveLmra, hasPdfSablon, getPdfSablon } from "../lib/lmraService";
import { getCsapat } from "../modules/csapatok/csapat.service";

// ─── Aláírás canvas ──────────────────────────────────────────
function AlairasMezo({ nev, onSave }) {
  const ref = useRef(null);
  const [draw, setDraw] = useState(false);
  const [has, setHas]   = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const c = ref.current, r = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * r; c.height = c.offsetHeight * r;
    const ctx = c.getContext("2d");
    ctx.scale(r, r); ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2.5;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
  }, []);

  function pos(e) {
    const rect = ref.current.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return { x: s.clientX - rect.left, y: s.clientY - rect.top };
  }
  const startD = e => { e.preventDefault(); setDraw(true); const p = pos(e); const ctx = ref.current.getContext("2d"); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const onMove = e => { e.preventDefault(); if (!draw) return; const ctx = ref.current.getContext("2d"); const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setHas(true); };
  const stopD  = e => { e.preventDefault(); setDraw(false); };
  const clear  = () => { ref.current.getContext("2d").clearRect(0, 0, ref.current.width, ref.current.height); setHas(false); };

  return (
    <div>
      <p style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8", marginBottom: 8, textAlign: "center" }}>
        ✍️ {nev}
      </p>
      <div style={{ border: "2px solid #1e3a5c", borderRadius: 10, overflow: "hidden", background: "#fff", position: "relative", height: 140 }}>
        <canvas ref={ref} style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "crosshair" }}
          onMouseDown={startD} onMouseMove={onMove} onMouseUp={stopD} onMouseLeave={stopD}
          onTouchStart={startD} onTouchMove={onMove} onTouchEnd={stopD} />
        {!has && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <p style={{ fontSize: 12, color: "#CBD5E1", fontStyle: "italic" }}>Aláírás helye</p>
        </div>}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button onClick={clear} style={{ flex: 1, padding: "10px", border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: FONT, fontSize: 13 }}>
          <RotateCcw size={13} /> Törlés
        </button>
        <button onClick={() => onSave({ nev, dataUrl: ref.current.toDataURL("image/png"), datum: new Date().toISOString() })}
          disabled={!has}
          style={{ flex: 2, padding: "10px", border: "none", borderRadius: 8, background: has ? "#059669" : "#E2E8F0", color: "#fff", cursor: has ? "pointer" : "default", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: FONT }}>
          <Check size={14} /> Aláírva →
        </button>
      </div>
    </div>
  );
}

// ─── Fő modal ────────────────────────────────────────────────
export default function LmraModal({ munkalap, onClose, onComplete }) {
  const pdfVan   = hasPdfSablon();
  const pdfSrc   = pdfVan ? `data:application/pdf;base64,${getPdfSablon()}` : null;
  const [showPdf, setShowPdf] = useState(false);

  // Csapattagok init
  const initTagok = () => {
    const cs = getCsapat(munkalap.csapatId || munkalap.assigneeId);
    const nevek = cs?.tagNevek?.length ? cs.tagNevek
      : munkalap.csapatNev ? [munkalap.csapatNev] : [""];
    return nevek.map(n => n.trim()).filter(Boolean);
  };

  const [step, setStep]         = useState("fejlec");
  const [tagok, setTagok]       = useState(initTagok);
  const [ujTag, setUjTag]       = useState("");
  const [alairasSor, setSort]   = useState(0);
  const [alairiasok, setAlrs]   = useState([]);

  // Fejléc mezők
  const [fejlec, setFejlec] = useState({
    idopont:    new Date().toLocaleString("hu-HU"),
    helyszin:   munkalap.telepitesiCim || munkalap.clientCim || "",
    munkavezeto: tagok[0] || "",
    munka:      munkalap.feladat || munkalap.projektMegnevezes || munkalap.munkalapSzam || "",
  });

  // Kockázat értékelés
  const [kock, setKock] = useState(() =>
    Object.fromEntries(LMRA_KOCKAZATOK.map(k => [k.id, { ertek: null, intezkedesek: [] }]))
  );

  function setKockErtek(id, ertek) {
    setKock(p => ({ ...p, [id]: { ...p[id], ertek } }));
  }

  const aktivTagok = tagok.filter(t => t.trim());
  const mindenKitoltve = LMRA_KOCKAZATOK.every(k => kock[k.id].ertek !== null);

  function addTag() {
    if (!ujTag.trim()) return;
    setTagok(p => [...p, ujTag.trim()]); setUjTag("");
  }

  function handleAlairasSave(data) {
    const uj = [...alairiasok, data];
    setAlrs(uj);
    if (uj.length >= aktivTagok.length) {
      const lmraAdat = {
        datum:        new Date().toISOString(),
        munkalapId:   munkalap.id,
        fejlec,
        kockazatok:   LMRA_KOCKAZATOK.map(k => ({ ...k, ertek: kock[k.id].ertek })),
        alairiasok:   uj,
        tagok:        aktivTagok,
      };
      saveLmra(munkalap.id, lmraAdat);
      onComplete(lmraAdat);
      setStep("kesz");
    } else {
      setSort(s => s + 1);
    }
  }

  const lepesek = ["fejlec", "kockazat", "alairas"];
  const lepesLabels = ["1. Fejléc", "2. Kockázatok", "3. Aláírások"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.8)", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "#1e3a5c", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={20} color="#FCD34D" />
            <div>
              <p style={{ color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: FONT_HEADING, margin: 0 }}>LMRA – Munkavégzést megelőző kockázatértékelés</p>
              <p style={{ color: "#94A3B8", fontSize: 11, margin: 0 }}>{munkalap.munkalapSzam || munkalap.id}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {pdfVan && (
              <button onClick={() => setShowPdf(s => !s)}
                style={{ border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#93C5FD", cursor: "pointer", borderRadius: 7, padding: "5px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                <FileText size={13} /> {showPdf ? "Bezár" : "Nyomtatvány"}
              </button>
            )}
            <button onClick={onClose} style={{ border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", borderRadius: 8, padding: "6px 10px" }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PDF nézet */}
        {showPdf && pdfSrc && (
          <div style={{ height: 280, flexShrink: 0, borderBottom: "2px solid #E2E8F0" }}>
            <iframe src={pdfSrc} style={{ width: "100%", height: "100%", border: "none" }} title="LMRA nyomtatvány" />
          </div>
        )}

        {/* Lépés jelző */}
        {step !== "kesz" && (
          <div style={{ display: "flex", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
            {lepesek.map((id, i) => {
              const aktIdx = lepesek.indexOf(step);
              const done   = aktIdx > i;
              const active = step === id;
              return (
                <div key={id} style={{ flex: 1, padding: "9px 6px", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  borderBottom: active ? "3px solid #2563EB" : "3px solid transparent", opacity: done || active ? 1 : 0.4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#2563EB" : done ? "#059669" : "#94A3B8" }}>
                    {done ? "✓ " : ""}{lepesLabels[i]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Tartalom */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 20px" }}>

          {/* ── 1. FEJLÉC ── */}
          {step === "fejlec" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Ellenőrizd és töltsd ki az adatokat. Az időpont és helyszín automatikusan kitöltve.</p>
              {[
                { label: "Időpont",          key: "idopont",     readOnly: true },
                { label: "Helyszín",          key: "helyszin" },
                { label: "Munkavezető neve",  key: "munkavezeto" },
                { label: "Munka megnevezése", key: "munka" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: .6 }}>{f.label}</label>
                  <input value={fejlec[f.key]} onChange={e => setFejlec(p => ({ ...p, [f.key]: e.target.value }))}
                    readOnly={f.readOnly}
                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 14, fontFamily: FONT, outline: "none", background: f.readOnly ? "#F8FAFC" : "#fff", color: f.readOnly ? C.muted : C.text }} />
                </div>
              ))}

              {/* Csapattagok */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: .6 }}>
                  <Users size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />Csapattagok (aláírók)
                </label>
                {tagok.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 7, marginBottom: 6 }}>
                    <input value={t} onChange={e => setTagok(p => p.map((x, j) => j === i ? e.target.value : x))}
                      style={{ flex: 1, padding: "9px 11px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: FONT, outline: "none" }} />
                    {tagok.length > 1 && (
                      <button onClick={() => setTagok(p => p.filter((_, j) => j !== i))}
                        style={{ padding: "7px 9px", border: "none", background: "#FEF2F2", borderRadius: 7, cursor: "pointer", color: "#DC2626" }}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
                <div style={{ display: "flex", gap: 7 }}>
                  <input value={ujTag} onChange={e => setUjTag(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()}
                    placeholder="+ Tag neve…"
                    style={{ flex: 1, padding: "9px 11px", border: "1.5px dashed #CBD5E1", borderRadius: 8, fontSize: 13, fontFamily: FONT, outline: "none", background: "#F8FAFC" }} />
                  <button onClick={addTag} disabled={!ujTag.trim()}
                    style={{ padding: "9px 14px", border: "none", background: ujTag.trim() ? "#2563EB" : "#E2E8F0", color: "#fff", borderRadius: 8, cursor: ujTag.trim() ? "pointer" : "default", fontWeight: 700 }}>
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── 2. KOCKÁZATOK ── */}
          {step === "kockazat" && (
            <div>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
                Munkavezető értékeli: az adott kockázat fennáll-e ennél a munkánál?
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {LMRA_KOCKAZATOK.map(k => {
                  const val = kock[k.id].ertek;
                  return (
                    <div key={k.id} style={{ background: val === true ? "#FEF2F2" : val === false ? "#ECFDF5" : "#F8FAFC",
                      border: `1.5px solid ${val === true ? "#FECACA" : val === false ? "#86EFAC" : "#E2E8F0"}`,
                      borderRadius: 10, padding: "10px 12px" }}>
                      <p style={{ fontSize: 13, color: C.text, margin: "0 0 8px", fontWeight: 500 }}>{k.szoveg}</p>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setKockErtek(k.id, true)}
                          style={{ flex: 1, padding: "7px", border: `2px solid ${val === true ? "#DC2626" : "#E2E8F0"}`, borderRadius: 7, background: val === true ? "#DC2626" : "#fff", color: val === true ? "#fff" : C.text, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: FONT }}>
                          ⚠️ Igen – fennáll
                        </button>
                        <button onClick={() => setKockErtek(k.id, false)}
                          style={{ flex: 1, padding: "7px", border: `2px solid ${val === false ? "#059669" : "#E2E8F0"}`, borderRadius: 7, background: val === false ? "#059669" : "#fff", color: val === false ? "#fff" : C.text, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: FONT }}>
                          ✓ Nem – nem áll fenn
                        </button>
                      </div>
                      {val === true && (
                        <div style={{ marginTop: 8, padding: "7px 10px", background: "#FFF1F2", borderRadius: 7, fontSize: 12, color: "#991B1B" }}>
                          ⚠️ Intézkedés szükséges — rögzítsd a megtett lépéseket a nyomtatványon!
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {!mindenKitoltve && (
                <div style={{ marginTop: 10, padding: "9px 12px", background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, fontSize: 12, color: "#92400E" }}>
                  ⚠️ Minden kockázatot értékelj ({LMRA_KOCKAZATOK.filter(k => kock[k.id].ertek !== null).length}/{LMRA_KOCKAZATOK.length} kész)
                </div>
              )}
            </div>
          )}

          {/* ── 3. ALÁÍRÁSOK ── */}
          {step === "alairas" && (
            <div>
              <p style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>
                Minden csapattag aláírásával igazolja, hogy a kockázatokat és a munkavégzés veszélyeit megismerte.
              </p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {aktivTagok.map((t, i) => (
                  <span key={i} style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                    background: i < alairiasok.length ? "#ECFDF5" : i === alairasSor ? "#EFF6FF" : "#F8FAFC",
                    color:      i < alairiasok.length ? "#059669"  : i === alairasSor ? "#2563EB" : "#94A3B8",
                    border: `1px solid ${i < alairiasok.length ? "#86EFAC" : i === alairasSor ? "#BFDBFE" : "#E2E8F0"}` }}>
                    {i < alairiasok.length ? "✓ " : i === alairasSor ? "→ " : ""}{t}
                  </span>
                ))}
              </div>
              <AlairasMezo nev={aktivTagok[alairasSor]} onSave={handleAlairasSave} />
              <p style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 10 }}>
                {alairasSor + 1} / {aktivTagok.length}
              </p>
            </div>
          )}

          {/* ── KÉSZ ── */}
          {step === "kesz" && (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Shield size={36} color="#059669" />
              </div>
              <p style={{ fontSize: 19, fontWeight: 800, color: C.text, margin: "0 0 6px" }}>LMRA kész!</p>
              <p style={{ fontSize: 13, color: C.muted, margin: "0 0 4px" }}>{fejlec.idopont}</p>
              <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px" }}>{fejlec.helyszin}</p>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                {alairiasok.map((a, i) => (
                  <span key={i} style={{ fontSize: 12, background: "#ECFDF5", color: "#059669", padding: "3px 12px", borderRadius: 20, fontWeight: 700 }}>✓ {a.nev}</span>
                ))}
              </div>
              <div style={{ marginTop: 14, padding: "9px 14px", background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 9, fontSize: 12, color: "#92400E", display: "inline-block" }}>
                ⚠️ Fennálló kockázat: {LMRA_KOCKAZATOK.filter(k => kock[k.id]?.ertek === true).map(k => k.szoveg.split(" ")[0] + "…").join(", ") || "Egyik sem"}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 18px", borderTop: "1px solid #E2E8F0", flexShrink: 0 }}>
          {step === "fejlec" && (
            <button onClick={() => setStep("kockazat")} disabled={!aktivTagok.length}
              style={{ width: "100%", padding: "13px", border: "none", borderRadius: 11, background: aktivTagok.length ? "#2563EB" : "#E2E8F0", color: "#fff", fontWeight: 700, fontSize: 15, cursor: aktivTagok.length ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: FONT }}>
              Tovább: Kockázatok értékelése <ChevronRight size={17} />
            </button>
          )}
          {step === "kockazat" && (
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={() => setStep("fejlec")}
                style={{ flex: 1, padding: "12px", border: "1.5px solid #E2E8F0", borderRadius: 10, background: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: FONT }}>← Vissza</button>
              <button onClick={() => setStep("alairas")} disabled={!mindenKitoltve}
                style={{ flex: 2, padding: "12px", border: "none", borderRadius: 10, background: mindenKitoltve ? "#2563EB" : "#E2E8F0", color: "#fff", fontWeight: 700, fontSize: 14, cursor: mindenKitoltve ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: FONT }}>
                Tovább: Aláírások <ChevronRight size={16} />
              </button>
            </div>
          )}
          {step === "kesz" && (
            <button onClick={() => { onClose(); }}
              style={{ width: "100%", padding: "13px", border: "none", borderRadius: 11, background: "#059669", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: FONT }}>
              <Check size={17} /> Munka megkezdése →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
