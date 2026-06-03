/**
 * TabLmra.jsx – PM/Admin LMRA kezelő tab a ProjektDetail-ban
 *
 * Funkciók:
 *  - Projekt összes munkalapjához LMRA státusz megjelenítése
 *  - Kockázatok kiválasztása, megelőző intézkedések megadása
 *  - Lezárás (Telepítőnek csak olvasható lesz)
 *  - Újranyitás, PDF export
 *  - Aláírások visszajelzése
 */

import { useState, useEffect, useRef } from "react";
import {
  Shield, Lock, Unlock, FileDown, Plus, ChevronDown, ChevronUp,
  Check, RotateCcw, AlertTriangle, Users, X,
} from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../../lib/constants";
import {
  loadLmraRec, initOrLoadLmraRec, saveLmraRec,
  lockLmraForInstaller, reopenLmra, exportLmraPdfWindow,
  LMRA_STATUS_LABELS, LMRA_STATUS_COLORS,
} from "../../../lib/lmraData.service";

export default function TabLmra({ projekt, munkalapok, currentUser }) {
  const projektMunkalapok = (munkalapok || []).filter(
    m => m.projektId === projekt.id || (projekt.munkalapIds || []).includes(m.id)
  );
  const [openId, setOpenId] = useState(projektMunkalapok[0]?.id || null);

  return (
    <div style={{ padding: "4px 0 24px" }}>
      {/* Info banner */}
      <div style={{
        background: "#FEF2F2", border: "1.5px solid #FECACA",
        borderRadius: 12, padding: "12px 16px", marginBottom: 18,
        display: "flex", gap: 10, alignItems: "flex-start",
      }}>
        <Shield size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 2 }} />
        <p style={{ margin: 0, fontSize: 13, color: "#991B1B", lineHeight: 1.6 }}>
          <strong>LMRA – Munkavégzést megelőző kockázatértékelés.</strong><br />
          Az Admin / PM előre kiválasztja a kockázatokat és megadja a megelőző intézkedéseket,
          majd „Lezárja Telepítőnek". A Telepítő a helyszínen csak hozzáad résztvevőket és aláír –
          a kockázatokat nem módosíthatja.
        </p>
      </div>

      {projektMunkalapok.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.muted, fontSize: 14 }}>
          Ehhez a projekthez még nincsenek munkalapok.
        </div>
      ) : (
        projektMunkalapok.map(ml => (
          <LmraMunkalapCard
            key={ml.id}
            munkalap={ml}
            projekt={projekt}
            currentUser={currentUser}
            open={openId === ml.id}
            onToggle={() => setOpenId(p => p === ml.id ? null : ml.id)}
          />
        ))
      )}
    </div>
  );
}

// ─── LMRA kártya – egy munkalaphoz ───────────────────────────

function LmraMunkalapCard({ munkalap, projekt, currentUser, open, onToggle }) {
  const [rec, setRec]     = useState(() => initOrLoadLmraRec(munkalap.id, projekt?.id));
  const [dirty, setDirty] = useState(false);

  const role      = currentUser?.role;
  const canEdit   = ["Admin", "Projektmenedzser"].includes(role);
  const canExport = ["Admin", "Projektmenedzser"].includes(role);
  const isLocked  = rec.lockedForInstaller && rec.status !== "ujranyitva";
  const status    = rec.status || "draft";
  const label     = LMRA_STATUS_LABELS[status] || status;
  const color     = LMRA_STATUS_COLORS[status] || "#94A3B8";
  const kivalDb   = (rec.kockazatok || []).filter(k => k.kivalasztva).length;
  const alairtDb  = (rec.resztvevok || []).filter(r => r.signed).length;

  // Frissítés ha crm-db-updated lő
  useEffect(() => {
    const handler = () => setRec(loadLmraRec(munkalap.id) || rec);
    window.addEventListener("crm-db-updated", handler);
    return () => window.removeEventListener("crm-db-updated", handler);
  }, [munkalap.id]);

  function handleToggleKockazat(id) {
    if (isLocked) return;
    setRec(r => ({
      ...r,
      kockazatok: r.kockazatok.map(k => k.id === id ? { ...k, kivalasztva: !k.kivalasztva } : k),
    }));
    setDirty(true);
  }

  function handleMegelozChange(id, val) {
    if (isLocked) return;
    setRec(r => ({
      ...r,
      kockazatok: r.kockazatok.map(k => k.id === id ? { ...k, megelozoIntezkedes: val } : k),
    }));
    setDirty(true);
  }

  function handleAddEgyedi() {
    if (isLocked) return;
    const szoveg = window.prompt("Egyedi kockázat szövege:");
    if (!szoveg?.trim()) return;
    setRec(r => ({
      ...r,
      kockazatok: [
        ...r.kockazatok,
        { id: `egyedi_${Date.now()}`, szoveg: szoveg.trim(), kivalasztva: true, megelozoIntezkedes: "", egyedi: true },
      ],
    }));
    setDirty(true);
  }

  function handleRemoveEgyedi(id) {
    if (isLocked) return;
    setRec(r => ({ ...r, kockazatok: r.kockazatok.filter(k => k.id !== id) }));
    setDirty(true);
  }

  function handleSave() {
    const toSave = {
      ...rec,
      status: (!rec.status || rec.status === "nincs") ? "draft" : rec.status,
    };
    saveLmraRec(munkalap.id, toSave);
    setRec(toSave);
    setDirty(false);
  }

  function handleLock() {
    if (dirty) {
      if (!window.confirm("Elmentetlen változások vannak. Mentsük el és zárjuk le?")) return;
      const toSave = { ...rec, status: "draft" };
      saveLmraRec(munkalap.id, toSave);
    }
    if (kivalDb === 0 && !window.confirm("Egy kockázat sincs kijelölve. Biztosan lezárod?")) return;
    const updated = lockLmraForInstaller(munkalap.id, currentUser?.name);
    if (updated) { setRec(updated); setDirty(false); }
  }

  function handleReopen() {
    if (!window.confirm("Újranyitod az LMRA-t? A Telepítő által hozzáadott aláírások megmaradnak, de a kockázatokat szerkeszthetővé teszed.")) return;
    const updated = reopenLmra(munkalap.id);
    if (updated) setRec(updated);
  }

  function handleExport() {
    const fresh = loadLmraRec(munkalap.id) || rec;
    exportLmraPdfWindow(fresh, munkalap, projekt, currentUser?.name);
    setTimeout(() => setRec(loadLmraRec(munkalap.id) || fresh), 800);
  }

  return (
    <div style={{
      background: "#fff",
      border: `1.5px solid ${open ? C.accent : C.border}`,
      borderRadius: 12, marginBottom: 10, overflow: "hidden",
    }}>
      {/* ── Fejléc ── */}
      <button
        onClick={onToggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "14px 16px", background: "none", border: "none",
          cursor: "pointer", fontFamily: FONT, textAlign: "left",
        }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 9,
          background: color + "18", display: "flex",
          alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Shield size={19} color={color} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>
            {munkalap.dokumentumszam || munkalap.munkalapSzam || munkalap.id}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: C.muted }}>
            {munkalap.munkalapTipus || munkalap.tipus || "—"}
            {munkalap.csapatNev ? ` · ${munkalap.csapatNev}` : ""}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0 }}>
          {kivalDb > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, background: "#FEF2F2", color: "#DC2626", padding: "2px 8px", borderRadius: 10 }}>
              ⚠️ {kivalDb}
            </span>
          )}
          {alairtDb > 0 && (
            <span style={{ fontSize: 11, fontWeight: 700, background: "#ECFDF5", color: "#059669", padding: "2px 8px", borderRadius: 10 }}>
              ✓ {alairtDb}
            </span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
            background: color + "18", color,
          }}>
            {label}
          </span>
          {open ? <ChevronUp size={16} color={C.muted} /> : <ChevronDown size={16} color={C.muted} />}
        </div>
      </button>

      {/* ── Tartalom ── */}
      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: "14px 16px 18px" }}>

          {/* Akció gombok */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {canEdit && !isLocked && (
              <>
                <button
                  onClick={handleSave}
                  disabled={!dirty}
                  style={{
                    padding: "7px 16px", border: "none", borderRadius: 8,
                    background: dirty ? C.accent : "#E2E8F0",
                    color: dirty ? "#fff" : C.muted,
                    cursor: dirty ? "pointer" : "default",
                    fontWeight: 700, fontSize: 13, fontFamily: FONT,
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <Check size={14} /> Mentés
                </button>
                <button
                  onClick={handleLock}
                  style={{
                    padding: "7px 16px", border: "none", borderRadius: 8,
                    background: "#1e3a5c", color: "#fff",
                    cursor: "pointer", fontWeight: 700, fontSize: 13,
                    fontFamily: FONT, display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <Lock size={14} /> Lezárás Telepítőnek
                </button>
                <button
                  onClick={handleAddEgyedi}
                  style={{
                    padding: "7px 14px", background: "#F5F3FF", color: "#7C3AED",
                    border: "1px solid #DDD6FE", borderRadius: 8,
                    cursor: "pointer", fontWeight: 700, fontSize: 13,
                    fontFamily: FONT, display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  <Plus size={14} /> Egyedi kockázat
                </button>
              </>
            )}
            {canEdit && isLocked && (
              <button
                onClick={handleReopen}
                style={{
                  padding: "7px 14px",
                  background: ["alairva", "exportalva"].includes(status) ? "#FEF2F2" : "#FFFBEB",
                  color: ["alairva", "exportalva"].includes(status) ? "#DC2626" : "#D97706",
                  border: `1px solid ${["alairva", "exportalva"].includes(status) ? "#FECACA" : "#FCD34D"}`,
                  borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13,
                  fontFamily: FONT, display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <RotateCcw size={14} /> Újranyitás
              </button>
            )}
            {canExport && (
              <button
                onClick={handleExport}
                style={{
                  padding: "7px 16px", background: "#7C3AED", color: "#fff",
                  border: "none", borderRadius: 8, cursor: "pointer",
                  fontWeight: 700, fontSize: 13, fontFamily: FONT,
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <FileDown size={14} /> PDF export
              </button>
            )}
          </div>

          {/* Zárolt figyelmeztetés */}
          {isLocked && (
            <div style={{
              background: "#EFF6FF", border: "1px solid #BFDBFE",
              borderRadius: 9, padding: "9px 12px", marginBottom: 13,
              fontSize: 12, color: "#1D4ED8",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <Lock size={13} />
              Kockázati lista lezárva – a Telepítő már látja.
              Módosításhoz kattints az „Újranyitás" gombra.
            </div>
          )}

          {/* Kockázati lista */}
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7, margin: "0 0 10px" }}>
            Kockázatok ({kivalDb} kiválasztva)
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16 }}>
            {(rec.kockazatok || []).map(k => (
              <KockazatRow
                key={k.id}
                kockazat={k}
                locked={isLocked}
                canEdit={canEdit}
                onToggle={() => handleToggleKockazat(k.id)}
                onMegelozChange={v => handleMegelozChange(k.id, v)}
                onRemoveEgyedi={k.egyedi ? () => handleRemoveEgyedi(k.id) : null}
              />
            ))}
          </div>

          {/* Résztvevők / aláírások összefoglalója */}
          {(rec.resztvevok || []).length > 0 && (
            <div style={{ marginTop: 4 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7, margin: "0 0 9px" }}>
                <Users size={12} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />
                Résztvevők és aláírások
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {rec.resztvevok.map(r => (
                  <div
                    key={r.id}
                    style={{
                      background: r.signed ? "#ECFDF5" : "#FFFBEB",
                      border: `1px solid ${r.signed ? "#86EFAC" : "#FCD34D"}`,
                      borderRadius: 9, padding: "5px 12px", fontSize: 12,
                      color: r.signed ? "#166534" : "#92400E", fontWeight: 600,
                    }}
                  >
                    {r.signed ? "✓" : "⏳"} {r.nev}
                    {r.signedAt && (
                      <span style={{ fontWeight: 400, fontSize: 10, marginLeft: 6, opacity: .7 }}>
                        {new Date(r.signedAt).toLocaleString("hu-HU")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {rec.lezarvaAt && (
                <p style={{ fontSize: 12, color: "#059669", marginTop: 8 }}>
                  ✓ Lezárva: {new Date(rec.lezarvaAt).toLocaleString("hu-HU")}
                  {rec.lezartaBy ? ` · ${rec.lezartaBy}` : ""}
                </p>
              )}
            </div>
          )}

          {/* Export napló */}
          {(rec.exportok || []).length > 0 && (
            <div style={{ marginTop: 14, padding: "9px 12px", background: "#F5F3FF", borderRadius: 9, fontSize: 12 }}>
              <p style={{ margin: "0 0 5px", fontWeight: 700, color: "#7C3AED", fontSize: 11, textTransform: "uppercase", letterSpacing: .5 }}>
                PDF exportok
              </p>
              {rec.exportok.map((e, i) => (
                <p key={i} style={{ margin: "2px 0", color: "#5B21B6", fontSize: 12 }}>
                  {new Date(e.exportedAt).toLocaleString("hu-HU")} · {e.exportedBy} · {e.fileName}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Egy kockázat sor ────────────────────────────────────────

function KockazatRow({ kockazat, locked, canEdit, onToggle, onMegelozChange, onRemoveEgyedi }) {
  return (
    <div style={{
      background: kockazat.kivalasztva ? "#FEF2F2" : "#F8FAFC",
      border: `1.5px solid ${kockazat.kivalasztva ? "#FECACA" : "#E2E8F0"}`,
      borderRadius: 10, padding: "10px 12px",
      opacity: locked && !kockazat.kivalasztva ? 0.55 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Checkbox */}
        <button
          onClick={onToggle}
          disabled={locked || !canEdit}
          style={{
            width: 22, height: 22, borderRadius: 5, flexShrink: 0, marginTop: 2,
            border: `2px solid ${kockazat.kivalasztva ? "#DC2626" : "#CBD5E1"}`,
            background: kockazat.kivalasztva ? "#DC2626" : "#fff",
            cursor: !locked && canEdit ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 0,
          }}
        >
          {kockazat.kivalasztva && <Check size={13} color="#fff" />}
        </button>

        {/* Szöveg + intézkedés */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
            <p style={{
              margin: 0, fontSize: 13, lineHeight: 1.4,
              color: kockazat.kivalasztva ? "#991B1B" : C.textSub,
              fontWeight: kockazat.kivalasztva ? 600 : 400,
            }}>
              {kockazat.egyedi && (
                <span style={{ fontSize: 10, background: "#F5F3FF", color: "#7C3AED", padding: "1px 6px", borderRadius: 4, marginRight: 6, fontWeight: 700 }}>
                  Egyedi
                </span>
              )}
              {kockazat.szoveg}
            </p>
            {kockazat.egyedi && onRemoveEgyedi && !locked && (
              <button
                onClick={onRemoveEgyedi}
                style={{ padding: "2px 5px", background: "none", border: "none", cursor: "pointer", color: C.muted, flexShrink: 0 }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {kockazat.kivalasztva && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 11, color: "#DC2626", margin: "0 0 4px", fontWeight: 700 }}>
                Megelőző intézkedés:
              </p>
              {locked ? (
                <p style={{ fontSize: 12, color: C.text, margin: 0, fontStyle: kockazat.megelozoIntezkedes ? "normal" : "italic" }}>
                  {kockazat.megelozoIntezkedes || "Nincs megadva"}
                </p>
              ) : (
                <input
                  value={kockazat.megelozoIntezkedes}
                  onChange={e => onMegelozChange(e.target.value)}
                  placeholder="Írd le a megelőző intézkedést…"
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "7px 10px", border: "1px solid #FECACA",
                    borderRadius: 7, fontSize: 12, fontFamily: FONT, outline: "none", background: "#fff",
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
