/**
 * LmraModal.jsx – LMRA
 * 
 * Flow:
 *   1. Fejléc (auto kitölt) + Munkavezető pipálja a kockázatokat
 *   2. Csapattagok névlistája (szerkeszthető)
 *   3. Mindenki aláír sorban – semmi más, csak aláírás
 */

import { useState, useRef, useEffect } from "react";
import { Shield, ChevronRight, RotateCcw, Check, X, Users, FileText } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { LMRA_KOCKAZATOK, saveLmra, hasPdfSablon, getPdfSablon } from "../lib/lmraService";
import { getCsapat } from "../modules/csapatok/csapat.service";

// ─── Aláírás canvas ──────────────────────────────────────────
function AlairasMezo({ nev, onSave }) {
  const ref  = useRef(null);
  const [draw, setDraw] = useState(false);
  const [has,  setHas]  = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const c = ref.current, r = window.devicePixelRatio || 1;
    c.width  = c.offsetWidth  * r;
    c.height = c.offsetHeight * r;
    const ctx = c.getContext("2d");
    ctx.scale(r, r);
    ctx.strokeStyle = "#1e293b"; ctx.lineWidth = 2.5;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
  }, []);

  const pos = e => {
    const rect = ref.current.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return { x: s.clientX - rect.left, y: s.clientY - rect.top };
  };
  const startD = e => { e.preventDefault(); setDraw(true); const p = pos(e); const ctx = ref.current.getContext("2d"); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  const onMove = e => { e.preventDefault(); if (!draw) return; const ctx = ref.current.getContext("2d"); const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); setHas(true); };
  const stopD  = e => { e.preventDefault(); setDraw(false); };
  const clear  = () => { ref.current.getContext("2d").clearRect(0, 0, ref.current.width, ref.current.height); setHas(false); };

  return (
    <div>
      <p style={{ fontSize: 15, fontWeight: 700, color: "#1D4ED8", marginBottom: 10, textAlign: "center" }}>
        ✍️ {nev}
      </p>
      <div style={{ border: "2px solid #1e3a5c", borderRadius: 10, overflow: "hidden", background: "#fff", position: "relative", height: 160 }}>
        <canvas ref={ref}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "crosshair" }}
          onMouseDown={startD} onMouseMove={onMove} onMouseUp={stopD} onMouseLeave={stopD}
          onTouchStart={startD} onTouchMove={onMove} onTouchEnd={stopD}
        />
        {!has && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <p style={{ fontSize: 13, color: "#CBD5E1", fontStyle: "italic" }}>Aláírás helye</p>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button onClick={clear}
          style={{ flex: 1, padding: "11px", border: "1.5px solid #E2E8F0", borderRadius: 9, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: FONT, fontSize: 13 }}>
          <RotateCcw size={13} /> Törlés
        </button>
        <button onClick={() => onSave({ nev, dataUrl: ref.current.toDataURL("image/png"), datum: new Date().toISOString() })}
          disabled={!has}
          style={{ flex: 2, padding: "11px", border: "none", borderRadius: 9, background: has ? "#059669" : "#E2E8F0", color: "#fff", cursor: has ? "pointer" : "default", fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontFamily: FONT }}>
          <Check size={15} /> Aláírva →
        </button>
      </div>
    </div>
  );
}

// ─── Fő modal ────────────────────────────────────────────────
export default function LmraModal({ munkalap, onClose, onComplete }) {
  const pdfVan = hasPdfSablon();
  const pdfSrc = pdfVan ? `data:application/pdf;base64,${getPdfSablon()}` : null;
  const [showPdf, setShowPdf] = useState(false);

  // Automatikus munka név: típus + projekt neve
  const autoMunkaNev = [
    munkalap.munkalapTipus || munkalap.tipus || "",
    munkalap.projektMegnevezes || munkalap.projektNev || "",
  ].filter(Boolean).join(" – ") || munkalap.munkalapSzam || munkalap.id;

  // Csapattagok init
  const initTagok = () => {
    const cs = getCsapat(munkalap.csapatId || munkalap.assigneeId);
    const nevek = cs?.tagNevek?.length ? cs.tagNevek
      : munkalap.csapatNev ? [munkalap.csapatNev] : [""];
    return nevek.map(n => n.trim()).filter(Boolean);
  };

  const [step,      setStep]    = useState("kockazat"); // rögtön kockázatnál kezd
  const [tagok,     setTagok]   = useState(initTagok);
  const [ujTag,     setUjTag]   = useState("");
  const [alairasSor, setSort]   = useState(0);
  const [alairiasok, setAlrs]   = useState([]);

  // Fejléc – auto, nem szerkeszthető a csapat által
  const fejlec = {
    idopont:     new Date().toLocaleString("hu-HU"),
    helyszin:    munkalap.telepitesiCim || munkalap.clientCim || "",
    munkavezeto: tagok[0] || munkalap.csapatNev || "",
    munka:       autoMunkaNev,
  };

  // Kockázat értékelés – munkavezető tölti ki
  const [kock, setKock] = useState(() =>
    Object.fromEntries(LMRA_KOCKAZATOK.map(k => [k.id, null])) // null = nem értékelt
  );
  const mindenKitoltve = LMRA_KOCKAZATOK.every(k => kock[k.id] !== null);
  const fennallo = LMRA_KOCKAZATOK.filter(k => kock[k.id] === true);

  const aktivTagok = tagok.filter(t => t.trim());

  function addTag() {
    if (!ujTag.trim()) return;
    setTagok(p => [...p, ujTag.trim()]); setUjTag("");
  }

  function handleAlairasSave(data) {
    const uj = [...alairiasok, data];
    setAlrs(uj);
    if (uj.length >= aktivTagok.length) {
      const lmraAdat = {
        datum:      new Date().toISOString(),
        munkalapId: munkalap.id,
        fejlec,
        kockazatok: LMRA_KOCKAZATOK.map(k => ({ ...k, ertek: kock[k.id] })),
        alairiasok: uj,
        tagok:      aktivTagok,
      };
      saveLmra(munkalap.id, lmraAdat);
      onComplete(lmraAdat);
      setStep("kesz");
    } else {
      setSort(s => s + 1);
    }
  }

  // Lépésjelző: kockázat → tagok → alairas → kesz
  const lepesek    = ["kockazat", "tagok", "alairas"];
  const lepesLabel = ["1. Kockázatok (MV)", "2. Csapattagok", "3. Aláírások"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.82)", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Header ── */}
        <div style={{ background: "#1e3a5c", padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={19} color="#FCD34D" />
            <div>
              <p style={{ color: "#fff", fontWeight: 800, fontSize: 14, fontFamily: FONT_HEADING, margin: 0 }}>LMRA – Munkavégzést megelőző kockázatértékelés</p>
              {/* Auto munka név a fejlécben */}
              <p style={{ color: "#FCD34D", fontSize: 12, margin: 0, fontWeight: 600 }}>{autoMunkaNev}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            {pdfVan && (
              <button onClick={() => setShowPdf(s => !s)}
                style={{ border: "1px solid rgba(255,255,255,0.3)", background: "transparent", color: "#93C5FD", cursor: "pointer", borderRadius: 7, padding: "5px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                <FileText size={13} />{showPdf ? "Bezár" : "Nyomtatvány"}
              </button>
            )}
            <button onClick={onClose}
              style={{ border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", borderRadius: 8, padding: "6px 10px" }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── PDF nézet ── */}
        {showPdf && pdfSrc && (
          <div style={{ height: 260, flexShrink: 0, borderBottom: "2px solid #E2E8F0" }}>
            <iframe src={pdfSrc} style={{ width: "100%", height: "100%", border: "none" }} title="LMRA nyomtatvány" />
          </div>
        )}

        {/* ── Lépés jelző ── */}
        {step !== "kesz" && (
          <div style={{ display: "flex", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
            {lepesek.map((id, i) => {
              const aktIdx = lepesek.indexOf(step);
              const done   = aktIdx > i;
              const active = step === id;
              return (
                <div key={id} style={{ flex: 1, padding: "9px 4px", display: "flex", alignItems: "center", justifyContent: "center",
                  borderBottom: active ? "3px solid #2563EB" : "3px solid transparent", opacity: done || active ? 1 : 0.4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#2563EB" : done ? "#059669" : "#94A3B8" }}>
                    {done ? "✓ " : ""}{lepesLabel[i]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Tartalom ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 20px" }}>

          {/* ── LÉPÉS 1: KOCKÁZATOK – munkavezető tölti ki ── */}
          {step === "kockazat" && (
            <div>
              {/* Fejléc összefoglaló – olvasható, nem szerkeszthető */}
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                  <div><span style={{ color: C.muted }}>Időpont: </span><strong>{fejlec.idopont}</strong></div>
                  <div><span style={{ color: C.muted }}>Helyszín: </span><strong>{fejlec.helyszin || "—"}</strong></div>
                  <div><span style={{ color: C.muted }}>Munkavezető: </span><strong>{fejlec.munkavezeto || "—"}</strong></div>
                  <div><span style={{ color: C.muted }}>Munka: </span><strong>{fejlec.munka}</strong></div>
                </div>
              </div>

              <p style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Shield size={13} /> MUNKAVEZETŐ tölti ki — fennáll-e az adott kockázat?
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {LMRA_KOCKAZATOK.map(k => {
                  const val = kock[k.id];
                  return (
                    <div key={k.id} style={{
                      background: val === true ? "#FEF2F2" : val === false ? "#F0FDF4" : "#F8FAFC",
                      border: `1.5px solid ${val === true ? "#FCA5A5" : val === false ? "#86EFAC" : "#E2E8F0"}`,
                      borderRadius: 10, padding: "10px 12px",
                    }}>
                      <p style={{ fontSize: 13, color: C.text, margin: "0 0 8px", lineHeight: 1.4 }}>{k.szoveg}</p>
                      <div style={{ display: "flex", gap: 7 }}>
                        <button onClick={() => setKock(p => ({ ...p, [k.id]: true }))}
                          style={{ flex: 1, padding: "8px 4px", border: `2px solid ${val === true ? "#DC2626" : "#E2E8F0"}`, borderRadius: 8, background: val === true ? "#DC2626" : "#fff", color: val === true ? "#fff" : C.textSub, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: FONT }}>
                          ⚠️ Igen
                        </button>
                        <button onClick={() => setKock(p => ({ ...p, [k.id]: false }))}
                          style={{ flex: 1, padding: "8px 4px", border: `2px solid ${val === false ? "#059669" : "#E2E8F0"}`, borderRadius: 8, background: val === false ? "#059669" : "#fff", color: val === false ? "#fff" : C.textSub, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: FONT }}>
                          ✓ Nem
                        </button>
                      </div>
                      {val === true && (
                        <p style={{ margin: "7px 0 0", fontSize: 11, color: "#991B1B", background: "#FFF1F2", padding: "5px 8px", borderRadius: 6 }}>
                          ⚠️ Szükséges intézkedés — jelöld a nyomtatványon!
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {!mindenKitoltve && (
                <p style={{ fontSize: 12, color: "#92400E", background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, padding: "8px 12px", marginTop: 10 }}>
                  ⚠️ Minden kockázatot értékelj ({LMRA_KOCKAZATOK.filter(k => kock[k.id] !== null).length}/{LMRA_KOCKAZATOK.length} kész)
                </p>
              )}
            </div>
          )}

          {/* ── LÉPÉS 2: CSAPATTAGOK ── */}
          {step === "tagok" && (
            <div>
              {/* Fennálló kockázatok összefoglalója */}
              {fennallo.length > 0 && (
                <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "#991B1B", margin: "0 0 5px" }}>⚠️ Fennálló kockázatok – intézkedés szükséges:</p>
                  {fennallo.map(k => (
                    <p key={k.id} style={{ fontSize: 12, color: "#DC2626", margin: "2px 0" }}>• {k.szoveg}</p>
                  ))}
                </div>
              )}

              <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>
                Ellenőrizd a mai csapat névsorát. Mindenki a saját neve alatt ír alá.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
                {tagok.map((t, i) => (
                  <div key={i} style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    <input value={t} onChange={e => setTagok(p => p.map((x, j) => j === i ? e.target.value : x))}
                      placeholder={`${i + 1}. tag neve`}
                      style={{ flex: 1, padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 14, fontFamily: FONT, outline: "none" }} />
                    {tagok.length > 1 && (
                      <button onClick={() => setTagok(p => p.filter((_, j) => j !== i))}
                        style={{ padding: "8px 9px", border: "none", background: "#FEF2F2", borderRadius: 7, cursor: "pointer", color: "#DC2626" }}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <input value={ujTag} onChange={e => setUjTag(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag()}
                  placeholder="+ Új tag neve…"
                  style={{ flex: 1, padding: "9px 11px", border: "1.5px dashed #CBD5E1", borderRadius: 9, fontSize: 13, fontFamily: FONT, outline: "none", background: "#F8FAFC" }} />
                <button onClick={addTag} disabled={!ujTag.trim()}
                  style={{ padding: "9px 14px", border: "none", background: ujTag.trim() ? "#2563EB" : "#E2E8F0", color: "#fff", borderRadius: 9, cursor: ujTag.trim() ? "pointer" : "default", fontWeight: 700 }}>
                  +
                </button>
              </div>
            </div>
          )}

          {/* ── LÉPÉS 3: ALÁÍRÁSOK – csak aláírás, semmi más ── */}
          {step === "alairas" && (
            <div>
              {/* Összefoglaló – mire írnak alá */}
              <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12 }}>
                <p style={{ fontWeight: 700, color: "#166534", margin: "0 0 4px" }}>✅ Kockázatok értékelve ({fennallo.length} fennálló)</p>
                <p style={{ color: "#166534", margin: 0 }}>
                  Aláírásommal igazolom, hogy a kockázatokat és a munkavégzés veszélyeit megismertem,
                  a munkát a munkabiztonsági szabályok betartásával végzem.
                </p>
              </div>

              {/* Tag sorrend jelző */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {aktivTagok.map((t, i) => (
                  <span key={i} style={{ fontSize: 12, fontWeight: 700, padding: "4px 11px", borderRadius: 20,
                    background: i < alairiasok.length ? "#ECFDF5" : i === alairasSor ? "#EFF6FF" : "#F8FAFC",
                    color:      i < alairiasok.length ? "#059669"  : i === alairasSor ? "#2563EB"  : "#94A3B8",
                    border: `1px solid ${i < alairiasok.length ? "#86EFAC" : i === alairasSor ? "#BFDBFE" : "#E2E8F0"}` }}>
                    {i < alairiasok.length ? "✓ " : i === alairasSor ? "→ " : ""}{t}
                  </span>
                ))}
              </div>

              <AlairasMezo
                nev={aktivTagok[alairasSor]}
                onSave={handleAlairasSave}
              />

              <p style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 10 }}>
                {alairasSor + 1} / {aktivTagok.length} aláírás
              </p>
            </div>
          )}

          {/* ── KÉSZ ── */}
          {step === "kesz" && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: 70, height: 70, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <Shield size={34} color="#059669" />
              </div>
              <p style={{ fontSize: 18, fontWeight: 800, color: C.text, margin: "0 0 6px" }}>LMRA kész!</p>
              <p style={{ fontSize: 13, color: C.muted, margin: "0 0 4px" }}>{fejlec.idopont}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, margin: "0 0 14px" }}>{fejlec.munka}</p>
              <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
                {alairiasok.map((a, i) => (
                  <span key={i} style={{ fontSize: 12, background: "#ECFDF5", color: "#059669", padding: "3px 12px", borderRadius: 20, fontWeight: 700 }}>✓ {a.nev}</span>
                ))}
              </div>
              {fennallo.length > 0 && (
                <p style={{ fontSize: 12, background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, padding: "8px 14px", color: "#92400E", display: "inline-block" }}>
                  ⚠️ Fennálló kockázat: {fennallo.length} db — intézkedés szükséges
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Footer gombok ── */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #E2E8F0", flexShrink: 0 }}>
          {step === "kockazat" && (
            <button onClick={() => setStep("tagok")} disabled={!mindenKitoltve}
              style={{ width: "100%", padding: "14px", border: "none", borderRadius: 11, background: mindenKitoltve ? "#2563EB" : "#E2E8F0", color: "#fff", fontWeight: 700, fontSize: 15, cursor: mindenKitoltve ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: FONT }}>
              Tovább: Csapattagok <ChevronRight size={17} />
            </button>
          )}
          {step === "tagok" && (
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={() => setStep("kockazat")}
                style={{ flex: 1, padding: "13px", border: "1.5px solid #E2E8F0", borderRadius: 10, background: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: FONT }}>
                ← Vissza
              </button>
              <button onClick={() => setStep("alairas")} disabled={!aktivTagok.length}
                style={{ flex: 2, padding: "13px", border: "none", borderRadius: 10, background: aktivTagok.length ? "#2563EB" : "#E2E8F0", color: "#fff", fontWeight: 700, fontSize: 14, cursor: aktivTagok.length ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: FONT }}>
                Tovább: Aláírások <ChevronRight size={16} />
              </button>
            </div>
          )}
          {step === "kesz" && (
            <button onClick={onClose}
              style={{ width: "100%", padding: "14px", border: "none", borderRadius: 11, background: "#059669", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: FONT }}>
              <Check size={17} /> Munka megkezdése →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
