/**
 * LmraTelepltoView.jsx – Telepítő LMRA helyszíni flow
 *
 * Lépések:
 *   1. PM által előkészített kockázatok megtekintése (csak olvasható)
 *   2. Résztvevők: auto-feltöltés kiosztott csapatokból + ideiglenes hozzáadás + jelenVan toggle
 *   3. Aláírások: csak a jelen lévők írnak alá
 *   4. LMRA lezárása
 */

import { useState, useRef, useEffect } from "react";
import {
  Shield, X, Check, RotateCcw, ChevronRight,
  Users, UserPlus, Lock, AlertTriangle, Zap,
} from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import {
  loadLmraRec, addResztvevo, addIdeiglenesResztvevo,
  removeResztvevo, saveSignature, closeLmra,
  LMRA_STATUS_LABELS, LMRA_STATUS_COLORS,
  getTagokForMunkalap,
  autoPopulateResztvevok, updateResztvevoJelenlet,
} from "../lib/lmraData.service";
import { downloadLmraPdf } from "../lib/lmraPdfMerge";
import { CSAPAT_TAG_SZEREPEK } from "../modules/csapatok/csapat.schema.js";

// ─── Aláírás canvas ───────────────────────────────────────────

function AlairasMezo({ nev, onSave }) {
  const ref    = useRef(null);
  const [draw, setDraw] = useState(false);
  const [has,  setHas]  = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const c = ref.current;
    const r = window.devicePixelRatio || 1;
    c.width  = c.offsetWidth  * r;
    c.height = c.offsetHeight * r;
    const ctx = c.getContext("2d");
    ctx.scale(r, r);
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
  }, []);

  const pos = e => {
    const rect = ref.current.getBoundingClientRect();
    const s    = e.touches ? e.touches[0] : e;
    return { x: s.clientX - rect.left, y: s.clientY - rect.top };
  };
  const startD = e => {
    e.preventDefault(); setDraw(true);
    const p = pos(e); const ctx = ref.current.getContext("2d");
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
  };
  const onMove = e => {
    e.preventDefault(); if (!draw) return;
    const ctx = ref.current.getContext("2d"); const p = pos(e);
    ctx.lineTo(p.x, p.y); ctx.stroke(); setHas(true);
  };
  const stopD = e => { e.preventDefault(); setDraw(false); };
  const clear = () => {
    ref.current.getContext("2d").clearRect(0, 0, ref.current.width, ref.current.height);
    setHas(false);
  };

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "16px", border: `1.5px solid ${C.border}` }}>
      <p style={{ textAlign: "center", fontWeight: 800, fontSize: 16, color: "#1D4ED8", margin: "0 0 12px" }}>
        ✍️ {nev}
      </p>
      <div style={{ border: "2px solid #1e3a5c", borderRadius: 10, overflow: "hidden", position: "relative", height: 170 }}>
        <canvas
          ref={ref}
          style={{ width: "100%", height: "100%", display: "block", touchAction: "none", cursor: "crosshair" }}
          onMouseDown={startD} onMouseMove={onMove} onMouseUp={stopD} onMouseLeave={stopD}
          onTouchStart={startD} onTouchMove={onMove} onTouchEnd={stopD}
        />
        {!has && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <p style={{ fontSize: 14, color: "#CBD5E1", fontStyle: "italic" }}>Ide rajzolja az aláírást</p>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <button onClick={clear} style={{ flex: 1, padding: "11px", border: "1.5px solid #E2E8F0", borderRadius: 9, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, fontFamily: FONT, fontSize: 13 }}>
          <RotateCcw size={13} /> Törlés
        </button>
        <button onClick={() => onSave(ref.current.toDataURL("image/png"))} disabled={!has}
          style={{ flex: 2, padding: "11px", border: "none", borderRadius: 9, background: has ? "#059669" : "#E2E8F0", color: "#fff", cursor: has ? "pointer" : "default", fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: FONT }}>
          <Check size={16} /> Aláírva →
        </button>
      </div>
    </div>
  );
}

// ─── Ideiglenes dolgozó form ──────────────────────────────────

function IdeiglenesForm({ kiosztasok, onAdd, onClose }) {
  const [nev,       setNev]       = useState("");
  const [csapatId,  setCsapatId]  = useState(kiosztasok?.[0]?.csapatId || "");
  const [csapatNev, setCsapatNev] = useState(kiosztasok?.[0]?.csapatNev || "");
  const [szerep,    setSzerop]    = useState("Telepítő");
  const [hiba,      setHiba]      = useState("");

  function selectCsapat(id) {
    const k = (kiosztasok || []).find(c => c.csapatId === id);
    setCsapatId(id);
    setCsapatNev(k?.csapatNev || "");
  }

  function handleAdd() {
    if (!nev.trim())    { setHiba("Név kötelező!"); return; }
    if (!szerep.trim()) { setHiba("Szerep kötelező!"); return; }
    onAdd({ nev: nev.trim(), csapatId: csapatId || null, csapatNev: csapatNev || null, szerep: szerep.trim() });
    onClose();
  }

  return (
    <div style={{ background: "#FFF7ED", border: "1.5px solid #FED7AA", borderRadius: 12, padding: "14px 16px", marginTop: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#92400E", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 5 }}>
        <UserPlus size={13} /> Ideiglenes dolgozó hozzáadása
      </p>
      {hiba && <p style={{ fontSize: 12, color: "#DC2626", margin: "0 0 8px", fontWeight: 600 }}>{hiba}</p>}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input
          value={nev}
          onChange={e => { setNev(e.target.value); setHiba(""); }}
          placeholder="Teljes név *"
          style={{ padding: "9px 12px", border: "1.5px solid #FED7AA", borderRadius: 8, fontSize: 14, fontFamily: FONT, outline: "none", background: "#fff" }}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {(kiosztasok || []).length > 0 && (
            <select value={csapatId} onChange={e => selectCsapat(e.target.value)}
              style={{ padding: "9px 10px", border: "1.5px solid #FED7AA", borderRadius: 8, fontSize: 13, fontFamily: FONT, outline: "none", background: "#fff" }}>
              <option value="">— Csapat —</option>
              {(kiosztasok || []).map(k => (
                <option key={k.csapatId} value={k.csapatId}>{k.csapatNev || k.csapatId}</option>
              ))}
            </select>
          )}

          <select value={szerep} onChange={e => { setSzerop(e.target.value); setHiba(""); }}
            style={{ padding: "9px 10px", border: "1.5px solid #FED7AA", borderRadius: 8, fontSize: 13, fontFamily: FONT, outline: "none", background: "#fff" }}>
            {CSAPAT_TAG_SZEREPEK.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: FONT, fontSize: 13 }}>Mégse</button>
          <button onClick={handleAdd} style={{ flex: 2, padding: "9px", border: "none", borderRadius: 8, background: "#EA580C", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>
            + Hozzáadás
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Főkomponens ─────────────────────────────────────────────

export default function LmraTelepltoView({ munkalap, currentUser, onClose, onComplete }) {
  const [rec,  setRec]  = useState(() => loadLmraRec(munkalap.id));
  const [step, setStep] = useState("kockazatok");
  const [ujNev,         setUjNev]         = useState("");
  const [ujNevFromList, setUjNevFromList] = useState("");
  const [showIdeiglenes, setShowIdeiglenes] = useState(false);
  const [kivalasztottIdx, setKivalasztottIdx] = useState(0);

  const availableTagok  = getTagokForMunkalap(munkalap);
  const kiosztasok      = munkalap?.csapatKiosztasok || [];

  useEffect(() => {
    const handler = () => setRec(loadLmraRec(munkalap.id));
    window.addEventListener("crm-db-updated", handler);
    return () => window.removeEventListener("crm-db-updated", handler);
  }, [munkalap.id]);

  if (!rec || !rec.lockedForInstaller) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", maxWidth: 420, textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#FFFBEB", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <AlertTriangle size={30} color="#D97706" />
          </div>
          <p style={{ fontWeight: 800, fontSize: 17, color: C.text, margin: "0 0 8px" }}>LMRA nincs előkészítve</p>
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px", lineHeight: 1.6 }}>
            A Projektmenedzser / Admin még nem készítette elő az LMRA kockázati listát ehhez a munkalaphoz.
          </p>
          <button onClick={onClose} style={{ padding: "11px 28px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>Bezárás</button>
        </div>
      </div>
    );
  }

  const kivalasztott = (rec.kockazatok || []).filter(k => k.kivalasztva);
  const resztvevok   = rec.resztvevok  || [];
  // Aláírásra csak a jelenlévők kötelezők
  const jelenLevok   = resztvevok.filter(r => r.jelenVan !== false);
  const alairtDb     = jelenLevok.filter(r => r.signed).length;
  const mindenAlairt = jelenLevok.length > 0 && jelenLevok.every(r => r.signed);
  const isLezarva    = ["alairva", "exportalva"].includes(rec.status);

  const STEPS       = ["kockazatok", "resztvevok", "alairas"];
  const STEP_LABELS = ["1. Kockázatok", "2. Résztvevők", "3. Aláírások"];

  function handleAutoPopulate() {
    const updated = autoPopulateResztvevok(munkalap.id, munkalap);
    if (updated) setRec(updated);
  }

  function handleAddFromList() {
    if (!ujNevFromList.trim()) return;
    const tag = availableTagok.find(t => t.nev === ujNevFromList);
    const updated = addResztvevo(munkalap.id, {
      nev:          ujNevFromList.trim(),
      teamTagId:    tag?.id || null,
      tagId:        tag?.id || null,
      csapatId:     tag?.csapatId || null,
      csapatNev:    tag?.csapatNev || null,
      szerep:       tag?.szerep || null,
      addedManually: false,
    });
    if (updated) setRec(updated);
    setUjNevFromList("");
  }

  function handleAddManual() {
    if (!ujNev.trim()) return;
    const updated = addResztvevo(munkalap.id, { nev: ujNev.trim(), addedManually: true });
    if (updated) setRec(updated);
    setUjNev("");
  }

  function handleAddIdeiglenes(data) {
    const updated = addIdeiglenesResztvevo(munkalap.id, data);
    if (updated?.error) { alert(updated.error); return; }
    if (updated) setRec(updated);
  }

  function handleToggleJelenVan(resztvevoId, jelenVan) {
    const updated = updateResztvevoJelenlet(munkalap.id, resztvevoId, jelenVan);
    if (updated) setRec(updated);
  }

  function handleRemove(id) {
    const result = removeResztvevo(munkalap.id, id);
    if (result?.error) { alert(result.error); return; }
    if (result) setRec(result);
  }

  function handleSign(resztvevoId, dataUrl) {
    const updated = saveSignature(munkalap.id, resztvevoId, dataUrl);
    if (updated) {
      setRec(updated);
      const remaining = (updated.resztvevok || [])
        .filter(r => r.jelenVan !== false)
        .findIndex(r => !r.signed);
      setKivalasztottIdx(remaining === -1 ? 0 : remaining);
    }
  }

  function handleLezaras() {
    const result = closeLmra(munkalap.id, currentUser?.name || "Telepítő");
    if (result?.error) { alert(result.error); return; }
    setRec(result); setStep("kesz");
    if (onComplete) onComplete(result);
  }

  const akotuSzemely = jelenLevok[kivalasztottIdx] || jelenLevok.find(r => !r.signed);

  // ── LEZÁRT LMRA nézet ──
  if (isLezarva) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.82)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "28px 24px", maxWidth: 440, width: "100%", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Shield size={30} color="#059669" />
          </div>
          <p style={{ fontWeight: 800, fontSize: 18, color: C.text, margin: "0 0 6px" }}>LMRA lezárva</p>
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px" }}>
            {rec.lezarvaAt ? new Date(rec.lezarvaAt).toLocaleString("hu-HU") : ""}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "center", marginBottom: 20 }}>
            {resztvevok.map(r => (
              <span key={r.id} style={{ fontSize: 13, background: r.signed ? "#ECFDF5" : "#F1F5F9", color: r.signed ? "#059669" : "#64748B", padding: "4px 13px", borderRadius: 20, fontWeight: 700 }}>
                {r.signed ? "✓ " : "○ "}{r.nev}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 9, flexDirection: "column" }}>
            <button onClick={() => downloadLmraPdf(rec, munkalap, currentUser?.name)} style={{ padding: "11px 24px", background: "#1e3a5c", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>
              📄 LMRA PDF letöltése
            </button>
            <button onClick={onClose} style={{ padding: "12px 32px", background: "#059669", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 15, fontFamily: FONT }}>
              <Check size={16} style={{ display: "inline", marginRight: 7, verticalAlign: "middle" }} />
              Munka megkezdése →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.82)", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#fff", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Header ── */}
        <div style={{ background: "#1e3a5c", padding: "13px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={19} color="#FCD34D" />
            <div>
              <p style={{ color: "#fff", fontWeight: 800, fontSize: 14, margin: 0, fontFamily: FONT_HEADING }}>
                LMRA – Munkavégzést megelőző kockázatértékelés
              </p>
              <p style={{ color: "#FCD34D", fontSize: 12, margin: 0, fontWeight: 600 }}>
                {munkalap.dokumentumszam || munkalap.munkalapSzam || munkalap.id}
                {kiosztasok.length > 0 ? ` · ${kiosztasok.map(k => k.csapatNev || "").filter(Boolean).join(", ")}` : munkalap.csapatNev ? ` · ${munkalap.csapatNev}` : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "rgba(255,255,255,0.15)", color: "#fff", cursor: "pointer", borderRadius: 8, padding: "6px 10px" }}>
            <X size={18} />
          </button>
        </div>

        {/* ── Lépés jelző ── */}
        {step !== "kesz" && (
          <div style={{ display: "flex", background: "#F8FAFC", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            {STEPS.map((id, i) => {
              const aktIdx = STEPS.indexOf(step);
              const done   = aktIdx > i;
              const active = step === id;
              return (
                <div key={id} onClick={() => done && setStep(id)}
                  style={{ flex: 1, padding: "9px 4px", display: "flex", alignItems: "center", justifyContent: "center",
                    borderBottom: active ? "3px solid #2563EB" : "3px solid transparent",
                    opacity: done || active ? 1 : 0.4, cursor: done ? "pointer" : "default" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? "#2563EB" : done ? "#059669" : "#94A3B8" }}>
                    {done ? "✓ " : ""}{STEP_LABELS[i]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Tartalom ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 20px" }}>

          {/* ── LÉPÉS 1: KOCKÁZATOK ── */}
          {step === "kockazatok" && (
            <div>
              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 8, alignItems: "center" }}>
                <Lock size={14} color="#1D4ED8" style={{ flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: 12, color: "#1D4ED8" }}>
                  A kockázatokat az Admin / Projektmenedzser állította össze – te csak megtekintheted.
                  {rec.elokeszitette ? ` (Előkészítette: ${rec.elokeszitette})` : ""}
                </p>
              </div>

              {kivalasztott.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13 }}>Nincsenek kockázatok kijelölve.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {kivalasztott.map(k => (
                    <div key={k.id} style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 10, padding: "10px 14px" }}>
                      <p style={{ margin: 0, fontSize: 13, color: "#991B1B", fontWeight: 600, lineHeight: 1.4 }}>⚠️ {k.szoveg}</p>
                      {k.megelozoIntezkedes && (
                        <p style={{ margin: "6px 0 0", fontSize: 12, color: "#DC2626", background: "#FFF1F2", padding: "5px 8px", borderRadius: 6 }}>
                          <strong>Intézkedés:</strong> {k.megelozoIntezkedes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {(rec.kockazatok || []).some(k => !k.kivalasztva) && (
                <details style={{ marginTop: 14 }}>
                  <summary style={{ fontSize: 12, color: C.muted, cursor: "pointer", marginBottom: 7 }}>
                    Nem vonatkozó kockázatok ({(rec.kockazatok || []).filter(k => !k.kivalasztva).length} db)
                  </summary>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {(rec.kockazatok || []).filter(k => !k.kivalasztva).map(k => (
                      <div key={k.id} style={{ fontSize: 12, color: C.muted, padding: "6px 10px", background: "#F8FAFC", borderRadius: 7, border: `1px solid ${C.border}` }}>
                        ✓ {k.szoveg}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* ── LÉPÉS 2: RÉSZTVEVŐK ── */}
          {step === "resztvevok" && (
            <div>
              {/* Auto-feltöltés gomb */}
              {kiosztasok.length > 0 && (
                <button
                  onClick={handleAutoPopulate}
                  style={{ width: "100%", padding: "11px 14px", marginBottom: 14, background: "#1e3a5c", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
                >
                  <Zap size={14} /> Kiosztott csapattagok automatikus hozzáadása
                </button>
              )}

              {/* Meglévő résztvevők */}
              {resztvevok.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, margin: "0 0 7px", textTransform: "uppercase", letterSpacing: .5 }}>
                    Résztvevők ({resztvevok.length} fő · {resztvevok.filter(r => r.jelenVan !== false).length} jelen van)
                  </p>
                  {resztvevok.map(r => (
                    <div key={r.id} style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
                      background: r.signed ? "#ECFDF5" : r.jelenVan === false ? "#F8FAFC" : "#FAFAFA",
                      border: `1px solid ${r.signed ? "#86EFAC" : C.border}`,
                      borderRadius: 9, marginBottom: 6, opacity: r.jelenVan === false ? .7 : 1,
                    }}>
                      {/* jelenVan toggle */}
                      <div
                        onClick={() => !r.signed && handleToggleJelenVan(r.id, r.jelenVan === false)}
                        style={{ width: 36, height: 20, borderRadius: 10, position: "relative", cursor: r.signed ? "default" : "pointer", flexShrink: 0,
                          background: r.jelenVan !== false ? "#059669" : "#CBD5E1", transition: "background .2s" }}
                      >
                        <div style={{ position: "absolute", top: 2, left: r.jelenVan !== false ? 18 : 2, width: 16, height: 16,
                          borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: r.signed ? "#059669" : r.jelenVan === false ? C.muted : C.text }}>
                          {r.signed ? "✓ " : r.jelenVan === false ? "— " : ""}{r.nev}
                          {r.signed && r.signedAt && (
                            <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 6, color: C.muted }}>
                              {new Date(r.signedAt).toLocaleString("hu-HU")}
                            </span>
                          )}
                        </p>
                        <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                          {r.csapatNev && <span style={{ fontSize: 10, background: "#EFF6FF", color: "#2563EB", padding: "1px 6px", borderRadius: 20, fontWeight: 600 }}>{r.csapatNev}</span>}
                          {r.szerep    && <span style={{ fontSize: 10, color: C.muted }}>{r.szerep}</span>}
                          {r.ideiglenes && <span style={{ fontSize: 10, background: "#FFF7ED", color: "#C2410C", padding: "1px 6px", borderRadius: 20, fontWeight: 600 }}>Ideiglenes</span>}
                          {r.jelenVan === false && <span style={{ fontSize: 10, color: C.muted }}>Nem jelen</span>}
                        </div>
                      </div>

                      {!r.signed && (
                        <button onClick={() => handleRemove(r.id)}
                          style={{ padding: "4px 7px", background: "#FEF2F2", border: "none", borderRadius: 6, cursor: "pointer", color: "#DC2626", flexShrink: 0 }}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Hozzáadás listából */}
              {availableTagok.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, margin: "0 0 7px", textTransform: "uppercase", letterSpacing: .5 }}>Csapatból választás</p>
                  <div style={{ display: "flex", gap: 7 }}>
                    <div style={{ flex: 1 }}>
                      <select value={ujNevFromList} onChange={e => setUjNevFromList(e.target.value)}
                        style={{ width: "100%", padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 14, fontFamily: FONT, outline: "none", background: "#FAFAFA", appearance: "none" }}>
                        <option value="">— Válassz nevet —</option>
                        {availableTagok.filter(t => !resztvevok.some(r => r.nev === t.nev)).map(t => (
                          <option key={t.id || t.nev} value={t.nev}>{t.nev}{t.csapatNev ? ` (${t.csapatNev})` : ""}</option>
                        ))}
                      </select>
                    </div>
                    <button onClick={handleAddFromList} disabled={!ujNevFromList}
                      style={{ padding: "10px 18px", border: "none", background: ujNevFromList ? C.accent : "#E2E8F0", color: "#fff", borderRadius: 9, cursor: ujNevFromList ? "pointer" : "default", fontWeight: 700, fontSize: 15 }}>+</button>
                  </div>
                </div>
              )}

              {/* Kézi hozzáadás */}
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, margin: "0 0 7px", textTransform: "uppercase", letterSpacing: .5 }}>Kézi beírás</p>
                <div style={{ display: "flex", gap: 7 }}>
                  <input value={ujNev} onChange={e => setUjNev(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAddManual()}
                    placeholder="Teljes név…"
                    style={{ flex: 1, padding: "10px 12px", border: `1.5px dashed ${C.border}`, borderRadius: 9, fontSize: 14, fontFamily: FONT, outline: "none", background: "#F8FAFC" }} />
                  <button onClick={handleAddManual} disabled={!ujNev.trim()}
                    style={{ padding: "10px 18px", border: "none", background: ujNev.trim() ? "#059669" : "#E2E8F0", color: "#fff", borderRadius: 9, cursor: ujNev.trim() ? "pointer" : "default", fontWeight: 700, fontSize: 15 }}>+</button>
                </div>
              </div>

              {/* Ideiglenes dolgozó */}
              <button
                onClick={() => setShowIdeiglenes(s => !s)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: showIdeiglenes ? "#FFF7ED" : "#F8FAFC", border: `1px dashed ${showIdeiglenes ? "#FED7AA" : "#E2E8F0"}`, borderRadius: 9, cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 600, color: showIdeiglenes ? "#C2410C" : "#64748B" }}
              >
                <UserPlus size={13} /> + Ideiglenes dolgozó hozzáadása
              </button>

              {showIdeiglenes && (
                <IdeiglenesForm
                  kiosztasok={kiosztasok}
                  onAdd={handleAddIdeiglenes}
                  onClose={() => setShowIdeiglenes(false)}
                />
              )}
            </div>
          )}

          {/* ── LÉPÉS 3: ALÁÍRÁSOK ── */}
          {step === "alairas" && (
            <div>
              <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12 }}>
                <p style={{ fontWeight: 700, color: "#166534", margin: "0 0 4px" }}>
                  ✅ {kivalasztott.length} kockázat ellenőrizve · {jelenLevok.length} jelen lévő aláír
                </p>
                <p style={{ color: "#166534", margin: 0 }}>
                  Aláírásommal igazolom, hogy a kockázatokat megismertem, a munkát a munkabiztonsági szabályok betartásával végzem.
                </p>
              </div>

              {/* Sorrend jelző – csak jelen lévők */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {jelenLevok.map((r, i) => (
                  <span key={r.id} onClick={() => !r.signed && setKivalasztottIdx(i)}
                    style={{
                      fontSize: 12, fontWeight: 700, padding: "5px 13px", borderRadius: 20,
                      cursor: r.signed ? "default" : "pointer",
                      background: r.signed ? "#ECFDF5" : i === kivalasztottIdx ? "#EFF6FF" : "#F8FAFC",
                      color:      r.signed ? "#059669"  : i === kivalasztottIdx ? "#2563EB"  : "#94A3B8",
                      border: `1px solid ${r.signed ? "#86EFAC" : i === kivalasztottIdx ? "#BFDBFE" : "#E2E8F0"}`,
                    }}>
                    {r.signed ? "✓ " : i === kivalasztottIdx ? "→ " : ""}{r.nev}
                  </span>
                ))}
                {resztvevok.filter(r => r.jelenVan === false).map(r => (
                  <span key={r.id} style={{ fontSize: 12, padding: "5px 13px", borderRadius: 20, background: "#F8FAFC", color: "#CBD5E1", border: "1px solid #E2E8F0", textDecoration: "line-through" }}>
                    {r.nev}
                  </span>
                ))}
              </div>

              {akotuSzemely && !akotuSzemely.signed && (
                <AlairasMezo nev={akotuSzemely.nev} onSave={dataUrl => handleSign(akotuSzemely.id, dataUrl)} />
              )}

              {mindenAlairt && (
                <div style={{ background: "#ECFDF5", border: "1px solid #86EFAC", borderRadius: 10, padding: "12px 16px", marginTop: 14, textAlign: "center" }}>
                  <p style={{ fontWeight: 800, fontSize: 15, color: "#059669", margin: 0 }}>✅ Mindenki aláírt! Az LMRA lezárható.</p>
                </div>
              )}

              <p style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 10 }}>
                {alairtDb} / {jelenLevok.length} aláírás
              </p>
            </div>
          )}

          {/* ── KÉSZ ── */}
          {step === "kesz" && (
            <div style={{ textAlign: "center", padding: "28px 0" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Shield size={34} color="#059669" />
              </div>
              <p style={{ fontSize: 19, fontWeight: 800, color: C.text, margin: "0 0 6px" }}>LMRA lezárva!</p>
              <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px" }}>
                {rec.lezarvaAt ? new Date(rec.lezarvaAt).toLocaleString("hu-HU") : ""}
              </p>
              <div style={{ display: "flex", gap: 7, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
                {resztvevok.filter(r => r.signed).map(r => (
                  <span key={r.id} style={{ fontSize: 13, background: "#ECFDF5", color: "#059669", padding: "4px 14px", borderRadius: 20, fontWeight: 700 }}>✓ {r.nev}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer gombok ── */}
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, flexShrink: 0, background: "#fff" }}>
          {step === "kockazatok" && (
            <button onClick={() => setStep("resztvevok")}
              style={{ width: "100%", padding: "14px", border: "none", borderRadius: 11, background: C.accent, color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: FONT }}>
              Tovább: Résztvevők <ChevronRight size={17} />
            </button>
          )}
          {step === "resztvevok" && (
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={() => setStep("kockazatok")}
                style={{ flex: 1, padding: "13px", border: `1.5px solid ${C.border}`, borderRadius: 10, background: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: FONT, fontSize: 14 }}>
                ← Vissza
              </button>
              <button onClick={() => setStep("alairas")} disabled={resztvevok.filter(r => r.jelenVan !== false).length === 0}
                style={{ flex: 2, padding: "13px", border: "none", borderRadius: 10, background: resztvevok.filter(r => r.jelenVan !== false).length > 0 ? C.accent : "#E2E8F0", color: "#fff", fontWeight: 800, fontSize: 15, cursor: resztvevok.filter(r => r.jelenVan !== false).length > 0 ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: FONT }}>
                Tovább: Aláírások <ChevronRight size={16} />
              </button>
            </div>
          )}
          {step === "alairas" && (
            <div style={{ display: "flex", gap: 9 }}>
              <button onClick={() => setStep("resztvevok")}
                style={{ flex: 1, padding: "13px", border: `1.5px solid ${C.border}`, borderRadius: 10, background: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: FONT, fontSize: 14 }}>
                ← Vissza
              </button>
              <button onClick={handleLezaras} disabled={!mindenAlairt}
                style={{ flex: 2, padding: "13px", border: "none", borderRadius: 10, background: mindenAlairt ? "#059669" : "#E2E8F0", color: "#fff", fontWeight: 800, fontSize: 15, cursor: mindenAlairt ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: FONT }}>
                <Check size={16} /> LMRA Lezárása
              </button>
            </div>
          )}
          {step === "kesz" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              <button onClick={() => downloadLmraPdf(rec, munkalap, currentUser?.name)}
                style={{ width: "100%", padding: "12px", border: "none", borderRadius: 11, background: "#1e3a5c", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: FONT }}>
                📄 LMRA PDF letöltése
              </button>
              <button onClick={onClose}
                style={{ width: "100%", padding: "14px", border: "none", borderRadius: 11, background: "#059669", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontFamily: FONT }}>
                <Check size={17} /> Munka megkezdése →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
