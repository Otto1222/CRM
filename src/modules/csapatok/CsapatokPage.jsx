import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Users, MapPin, X, Save, ChevronDown, DollarSign, Calculator, UserCheck } from "lucide-react";
import { FONT, FONT_HEADING, C } from "../../lib/constants.js";
import { ft } from "../../lib/helpers.js";
import { getUsers } from "../../lib/crmUsers.js";
import {
  loadCsapatok, createCsapat, updateCsapat, deleteCsapat,
  getAvSzabalyokByCsapat, createAvSzabaly, updateAvSzabaly, deleteAvSzabaly,
  getCsapatTagok, createCsapatTag, updateCsapatTag, deleteCsapatTag,
} from "./csapat.service.js";
import { CSAPAT_ELSZAMOLAS_TIPUSOK, CSAPAT_TIPUSOK, CSAPAT_TAG_SZEREPEK } from "./csapat.schema.js";
import {
  ELSZAMOLASI_MODOK, ELSZAMOLASI_MUNKATIPUSOK,
  calcSzabalyOsszeg, szabalyLeiras,
} from "../fovallalkozok/elszamolasiMotor.js";
import AddressSearch from "../../components/AddressSearch.jsx";

const SZINEK = [
  C.accent, C.success, C.accent, "#EA580C",
  "#0891B2", C.warning, C.danger, C.muted,
];

const inp = {
  width: "100%", boxSizing: "border-box", padding: "9px 12px",
  border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 14,
  fontFamily: "inherit", outline: "none", background: "#FAFAFA",
};

function Toggle({ value, onChange, label }) {
  return (
    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
      <div
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, position: "relative", cursor: "pointer",
          background: value ? C.accent : C.border, transition: "background .2s", flexShrink: 0,
        }}
      >
        <div style={{
          position: "absolute", top: 3, left: value ? 23 : 3, width: 18, height: 18,
          borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
        }} />
      </div>
      <span style={{ fontSize: 14, color: "#334155", fontWeight: 500 }}>{label}</span>
    </label>
  );
}

function TorlesModal({ csapat, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 380, width: "100%", fontFamily: FONT }}>
        <h3 style={{ fontFamily: FONT_HEADING, fontSize: 16, fontWeight: 800, color: C.danger, margin: "0 0 10px" }}>Csapat törlése</h3>
        <p style={{ fontSize: 14, color: C.muted, margin: "0 0 20px" }}>
          Biztosan törlöd a <strong>"{csapat.nev}"</strong> csapatot? Ez nem vonható vissza.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid #E2E8F0", background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT }}>Mégse</button>
          <button onClick={onConfirm} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: C.danger, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: FONT }}>Törlés</button>
        </div>
      </div>
    </div>
  );
}

function CsapatForm({ csapat, onClose, onSaved, currentUser }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const isNew = !csapat?.id;
  const allUsers = getUsers().filter(u => ["Admin", "Projektmenedzser", "Telepítő"].includes(u.role));

  const [form, setForm] = useState({
    nev:      csapat?.nev      || "",
    tipus:    csapat?.tipus    || "sajat",
    telephely: csapat?.telephely || "",
    szin:     csapat?.szin     || C.accent,
    tagok:    csapat?.tagok    || [],
    tagNevek: csapat?.tagNevek || [],
    kapacitas: csapat?.kapacitas ?? 2,
    hetvegen: csapat?.hetvegen || false,
    elszamolasAktiv:   csapat?.elszamolasAktiv   || false,
    elszamolasInfo:    csapat?.elszamolasInfo    || "",
    dijTipus:          csapat?.dijTipus          || "fix",
    dijOsszeg:         csapat?.dijOsszeg         || 0,
    dijEgysegAr:       csapat?.dijEgysegAr       || 0,
    kmElszamolasAktiv: csapat?.kmElszamolasAktiv || false,
    kmDijFtKm:         csapat?.kmDijFtKm         || 0,
    kmKuszobKm:        csapat?.kmKuszobKm        || 0,
  });
  const [hiba, setHiba] = useState("");

  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); setHiba(""); }

  function toggleTag(user) {
    const inList = form.tagok.includes(user.id);
    if (inList) {
      setForm(p => ({
        ...p,
        tagok: p.tagok.filter(id => id !== user.id),
        tagNevek: p.tagNevek.filter(n => n !== user.name),
      }));
    } else {
      setForm(p => ({
        ...p,
        tagok: [...p.tagok, user.id],
        tagNevek: [...p.tagNevek, user.name],
      }));
    }
  }

  function handleSave() {
    if (!form.nev.trim()) { setHiba("A csapat neve kötelező."); return; }
    if (!form.telephely.trim()) { setHiba("Az indulási telephely kötelező."); return; }
    let saved;
    if (isNew) {
      saved = createCsapat(form, currentUser?.name || "");
    } else {
      saved = updateCsapat(csapat.id, form, currentUser?.name || "");
    }
    onSaved?.(saved);
    onClose?.();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 16px", overflowY: "auto" }}>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, boxShadow: "0 24px 60px rgba(0,0,0,.25)", fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #E2E8F0" }}>
          <h2 style={{ fontFamily: FONT_HEADING, fontSize: 18, fontWeight: 800, margin: 0 }}>
            {isNew ? "Új csapat" : "Csapat szerkesztése"}
          </h2>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: C.muted }}><X size={22} /></button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {hiba && (
            <div style={{ background: C.dangerLight, border: "1.5px solid #FECACA", borderRadius: 9, padding: "9px 12px", fontSize: 13, color: C.danger, fontWeight: 600 }}>{hiba}</div>
          )}

          {/* Csapat neve */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.7 }}>Csapat neve *</label>
            <input value={form.nev} onChange={e => upd("nev", e.target.value)} placeholder="pl. Budapest Csapat A" style={{ ...inp, border: "2px solid #2563EB", fontWeight: 600 }} />
          </div>

          {/* Csapat típusa */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>Csapat típusa</label>
            <div style={{ display: "flex", gap: 8 }}>
              {CSAPAT_TIPUSOK.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => upd("tipus", t.id)}
                  style={{
                    flex: 1, padding: "9px 12px", borderRadius: 9, cursor: "pointer", fontFamily: FONT,
                    fontSize: 13, fontWeight: 700, transition: "all .15s",
                    background: form.tipus === t.id ? (t.id === "sajat" ? C.accentLight : C.warningLight) : C.bg,
                    color:      form.tipus === t.id ? (t.id === "sajat" ? C.accent : "#C2410C") : C.muted,
                    border: `2px solid ${form.tipus === t.id ? (t.id === "sajat" ? C.accentLight : "#FED7AA") : C.border}`,
                  }}
                >
                  {t.id === "sajat" ? "🏢 " : "🤝 "}{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Telephely */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.7 }}>Indulási telephely *</label>
            <AddressSearch
              value={form.telephely}
              onChange={v => upd("telephely", v)}
              onSelect={r => upd("telephely", r.display_name.split(",").slice(0,3).join(",").trim())}
              placeholder="pl. Szeged, Kossuth Lajos sugárút 5."
              style={inp}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px" }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.7 }}>Napi kapacitás (db munka)</label>
              <input type="number" min="1" max="20" value={form.kapacitas} onChange={e => upd("kapacitas", Number(e.target.value))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.7 }}>Csapat színe</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", paddingTop: 4 }}>
                {SZINEK.map(sz => (
                  <div key={sz} onClick={() => upd("szin", sz)} style={{
                    width: 26, height: 26, borderRadius: "50%", background: sz, cursor: "pointer",
                    border: form.szin === sz ? "3px solid #0F172A" : "2px solid transparent",
                    boxSizing: "border-box", transition: "border .15s",
                  }} />
                ))}
              </div>
            </div>
          </div>

          <Toggle value={form.hetvegen} onChange={v => upd("hetvegen", v)} label="Hétvégén is dolgozik" />

          {/* CRM felhasználók hozzárendelése */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.7 }}>
              CRM felhasználók ({form.tagok.length} kiválasztva)
            </label>
            <p style={{ fontSize: 11, color: C.muted, margin: "0 0 6px" }}>Opcionális: CRM-es felhasználók hozzákapcsolása. A tényleges csapattagokat a Csapat kártyán a "Tagok" panelben kezeld.</p>
            <div style={{ border: "1.5px solid #E2E8F0", borderRadius: 10, overflow: "hidden" }}>
              {allUsers.length === 0 ? (
                <p style={{ padding: 14, fontSize: 13, color: C.muted, margin: 0 }}>Nincs elérhető felhasználó</p>
              ) : (
                allUsers.map(u => {
                  const selected = form.tagok.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => toggleTag(u)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                        cursor: "pointer", borderBottom: "1px solid #F1F5F9",
                        background: selected ? C.accentLight : "#fff", transition: "background .1s",
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        background: selected ? C.accent : "#fff",
                        border: `2px solid ${selected ? C.accent : C.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {selected && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: C.text }}>{u.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{u.role}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Alvállalkozói elszámolás – csak alvállalkozó típusnál releváns */}
          <div style={{ borderTop: "2px solid #E2E8F0", paddingTop: 16, marginTop: 4 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <DollarSign size={16} color={form.elszamolasAktiv ? C.success : C.muted} />
                <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
                  Alvállalkozói elszámolás
                </span>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <div onClick={() => upd("elszamolasAktiv", !form.elszamolasAktiv)}
                  style={{ width: 40, height: 22, borderRadius: 11, position: "relative", cursor: "pointer",
                    background: form.elszamolasAktiv ? C.success : C.border, transition: "background .2s", flexShrink: 0 }}>
                  <div style={{ position: "absolute", top: 2, left: form.elszamolasAktiv ? 20 : 2, width: 18, height: 18,
                    borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
                </div>
                <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>
                  {form.elszamolasAktiv ? "Aktív" : "Kikapcsolva"}
                </span>
              </label>
            </div>

            {form.elszamolasAktiv && (
              <div style={{ background: C.successLight, border: "1px solid #86EFAC", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: .6 }}>Elszámolás típusa</label>
                    <select value={form.dijTipus} onChange={e => upd("dijTipus", e.target.value)}
                      style={{ ...inp, background: "#fff" }}>
                      {CSAPAT_ELSZAMOLAS_TIPUSOK.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: .6 }}>
                      {form.dijTipus === "%" ? "Mérték (%)" : form.dijTipus === "darab" ? "Egységár (Ft/db)" : "Összeg (Ft)"}
                    </label>
                    <input type="number" min="0"
                      value={form.dijTipus === "darab" ? form.dijEgysegAr : form.dijOsszeg}
                      onChange={e => upd(form.dijTipus === "darab" ? "dijEgysegAr" : "dijOsszeg", Number(e.target.value))}
                      style={{ ...inp, background: "#fff" }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: .6 }}>Megjegyzés</label>
                  <input value={form.elszamolasInfo} onChange={e => upd("elszamolasInfo", e.target.value)}
                    placeholder="pl. Szóbeli megállapodás, 2026.01.01-től érvényes"
                    style={{ ...inp, background: "#fff" }} />
                </div>
                <div style={{ borderTop: "1px solid #BBF7D0", paddingTop: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.success }}>🚗 Km elszámolás (alvállalkozói oldal)</span>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                      <div onClick={() => upd("kmElszamolasAktiv", !form.kmElszamolasAktiv)}
                        style={{ width: 34, height: 18, borderRadius: 9, position: "relative", cursor: "pointer",
                          background: form.kmElszamolasAktiv ? C.success : C.border, transition: "background .2s" }}>
                        <div style={{ position: "absolute", top: 1, left: form.kmElszamolasAktiv ? 17 : 1, width: 16, height: 16,
                          borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                      </div>
                      <span style={{ fontSize: 12, color: "#334155" }}>{form.kmElszamolasAktiv ? "Aktív" : "Nincs"}</span>
                    </label>
                  </div>
                  {form.kmElszamolasAktiv && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3 }}>Ft/km díj</label>
                        <input type="number" min="0" value={form.kmDijFtKm}
                          onChange={e => upd("kmDijFtKm", Number(e.target.value))}
                          placeholder="pl. 150" style={{ ...inp, background: "#fff" }} />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3 }}>Küszöb (km) – ez alatt 0 Ft</label>
                        <input type="number" min="0" value={form.kmKuszobKm}
                          onChange={e => upd("kmKuszobKm", Number(e.target.value))}
                          placeholder="pl. 50" style={{ ...inp, background: "#fff" }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "14px 24px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid #E2E8F0", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>Mégse</button>
          <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 22px", background: C.accent, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>
            <Save size={15} />{isNew ? "Csapat létrehozása" : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Csapat Tag kezelő ────────────────────────────────────────

function CsapatTagForm({ tag, csapatId, onSave, onClose }) {
  const isNew = !tag?.id;
  const inpF = { width: "100%", boxSizing: "border-box", padding: "8px 11px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none" };

  const [f, setF] = useState({
    nev:     tag?.nev     || "",
    szerep:  tag?.szerep  || "Telepítő",
    napiBer: tag?.napiBer || 0,
    oradij:  tag?.oradij  || 0,
    aktiv:   tag?.aktiv   !== false,
  });
  const [hiba, setHiba] = useState("");
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));

  function handleSave() {
    if (!f.nev.trim()) { setHiba("Név kötelező!"); return; }
    onSave(f);
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3200, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 420, padding: 22, fontFamily: FONT }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <h3 style={{ fontFamily: FONT_HEADING, fontSize: 15, fontWeight: 800, margin: 0 }}>
            {isNew ? "Új csapattag" : "Tag szerkesztése"}
          </h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: C.muted }}><X size={15}/></button>
        </div>

        {hiba && <div style={{ background: C.dangerLight, border: "1px solid #FECACA", borderRadius: 7, padding: "7px 10px", fontSize: 12, color: C.danger, marginBottom: 10 }}>{hiba}</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: .6 }}>Teljes név *</label>
            <input value={f.nev} onChange={e => u("nev", e.target.value)} placeholder="pl. Kovács Béla" style={inpF} />
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: .6 }}>Szerepkör</label>
            <select value={f.szerep} onChange={e => u("szerep", e.target.value)} style={inpF}>
              {CSAPAT_TAG_SZEREPEK.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: .6 }}>Napi bér (Ft/nap)</label>
              <input type="number" min="0" value={f.napiBer} onChange={e => u("napiBer", Number(e.target.value))} placeholder="0" style={inpF} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: .6 }}>Óradíj (Ft/h)</label>
              <input type="number" min="0" value={f.oradij} onChange={e => u("oradij", Number(e.target.value))} placeholder="0" style={inpF} />
              <p style={{ fontSize: 10, color: C.muted, margin: "3px 0 0" }}>Ha napi bér is van, az az elsődleges</p>
            </div>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <div onClick={() => u("aktiv", !f.aktiv)}
              style={{ width: 36, height: 20, borderRadius: 10, position: "relative", cursor: "pointer",
                background: f.aktiv ? C.success : C.border, transition: "background .2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 2, left: f.aktiv ? 18 : 2, width: 16, height: 16,
                borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
            </div>
            <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{f.aktiv ? "Aktív tag" : "Inaktív"}</span>
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 14px", border: "1.5px solid #E2E8F0", borderRadius: 7, background: "#fff", cursor: "pointer", fontFamily: FONT }}>Mégse</button>
          <button onClick={handleSave} style={{ padding: "7px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontFamily: FONT }}>
            {isNew ? "Hozzáadás" : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CsapatTagPanel({ csapatId }) {
  const [tagok, setTagok]   = useState(() => getCsapatTagok(csapatId));
  const [ujForm, setUjForm] = useState(false);
  const [szerk,  setSzerk]  = useState(null);

  useEffect(() => {
    function refresh() { setTagok(getCsapatTagok(csapatId)); }
    window.addEventListener("crm-db-updated", refresh);
    return () => window.removeEventListener("crm-db-updated", refresh);
  }, [csapatId]);

  function refresh() { setTagok(getCsapatTagok(csapatId)); }

  function handleSave(data) {
    if (szerk?.id) updateCsapatTag(szerk.id, data);
    else createCsapatTag(csapatId, data);
    refresh(); setUjForm(false); setSzerk(null);
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F1F5F9" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7, margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
          <UserCheck size={12} /> Csapattagok ({tagok.length} db)
        </p>
        <button onClick={() => setUjForm(true)}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: C.success, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: FONT }}>
          <Plus size={10}/> Új tag
        </button>
      </div>

      {tagok.length === 0 ? (
        <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic", margin: "4px 0 8px" }}>
          Még nincs csapattag rögzítve. Add hozzá a dolgozókat a jelenléti és LMRA rendszerhez.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {tagok.map(tag => (
            <div key={tag.id} style={{
              background: C.bg, border: "1px solid #E2E8F0",
              borderRadius: 8, padding: "8px 12px",
              display: "flex", alignItems: "center", gap: 8,
              opacity: tag.aktiv === false ? .55 : 1,
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", background: C.accentLight,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 800, color: C.accent, flexShrink: 0,
              }}>
                {(tag.nev || "?").charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tag.nev}</p>
                <div style={{ display: "flex", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, background: C.accentLight, color: C.accent, padding: "1px 6px", borderRadius: 20, fontWeight: 600 }}>{tag.szerep || "—"}</span>
                  {tag.napiBer > 0 && <span style={{ fontSize: 10, color: C.success, fontWeight: 600 }}>{Number(tag.napiBer).toLocaleString("hu-HU")} Ft/nap</span>}
                  {tag.oradij > 0 && !tag.napiBer && <span style={{ fontSize: 10, color: C.success, fontWeight: 600 }}>{Number(tag.oradij).toLocaleString("hu-HU")} Ft/h</span>}
                  {tag.aktiv === false && <span style={{ fontSize: 10, color: C.muted }}>Inaktív</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                <button onClick={() => { updateCsapatTag(tag.id, { aktiv: !tag.aktiv }); refresh(); }}
                  style={{ padding: "3px 7px", background: tag.aktiv !== false ? C.warningLight : C.successLight, color: tag.aktiv !== false ? C.warning : C.success, border: "none", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
                  {tag.aktiv !== false ? "Inakt." : "Aktív"}
                </button>
                <button onClick={() => setSzerk(tag)} style={{ padding: "3px 6px", background: C.accentLight, color: C.accent, border: "none", borderRadius: 5, cursor: "pointer" }}><Pencil size={10}/></button>
                <button onClick={() => { if (window.confirm(`Törlöd: ${tag.nev}?`)) { deleteCsapatTag(tag.id); refresh(); } }} style={{ padding: "3px 5px", background: C.dangerLight, color: C.danger, border: "none", borderRadius: 5, cursor: "pointer" }}><Trash2 size={10}/></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(ujForm || szerk) && (
        <CsapatTagForm
          tag={szerk}
          csapatId={csapatId}
          onSave={handleSave}
          onClose={() => { setUjForm(false); setSzerk(null); }}
        />
      )}
    </div>
  );
}

// ─── AV Sávok szerkesztő ─────────────────────────────────────

function AvSavokSzerkeszto({ savok, onChange }) {
  function addSav() {
    const last = savok[savok.length - 1];
    onChange([...savok, { tol: last ? (Number(last.ig) + 1) : 1, ig: "", osszeg: 0 }]);
  }
  function removeSav(i) { onChange(savok.filter((_, idx) => idx !== i)); }
  function updSav(i, k, v) { onChange(savok.map((s, idx) => idx === i ? { ...s, [k]: v } : s)); }
  const inpS = { width: "100%", boxSizing: "border-box", padding: "6px 8px", border: "1.5px solid #E2E8F0", borderRadius: 7, fontSize: 12, fontFamily: "inherit", outline: "none" };

  return (
    <div>
      {savok.map((sav, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
          <span style={{ fontSize: 10, color: C.muted, minWidth: 16 }}>{i + 1}.</span>
          <input type="number" value={sav.tol} onChange={e => updSav(i, "tol", e.target.value)}
            placeholder="tól" style={{ ...inpS, width: 65, textAlign: "center" }} />
          <span style={{ fontSize: 10, color: C.muted }}>–</span>
          <input type="number" value={sav.ig} onChange={e => updSav(i, "ig", e.target.value)}
            placeholder="ig(∞)" style={{ ...inpS, width: 75, textAlign: "center" }} />
          <span style={{ fontSize: 10, color: C.muted }}>db =</span>
          <input type="number" value={sav.osszeg} onChange={e => updSav(i, "osszeg", e.target.value)}
            placeholder="Ft" style={{ ...inpS, flex: 1, textAlign: "right" }} />
          <span style={{ fontSize: 10, color: C.muted }}>Ft</span>
          <button onClick={() => removeSav(i)}
            style={{ padding: "3px 5px", background: C.dangerLight, color: C.danger, border: "none", borderRadius: 5, cursor: "pointer" }}>
            <X size={10} />
          </button>
        </div>
      ))}
      <button onClick={addSav}
        style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", border: "1.5px dashed #CBD5E1", borderRadius: 6, background: C.bg, cursor: "pointer", fontSize: 11, color: C.muted, fontFamily: FONT, marginTop: 4 }}>
        <Plus size={10} /> Új sáv
      </button>
    </div>
  );
}

// ─── AV Szabály form modal ────────────────────────────────────

function AvSzabalyForm({ szabaly, csapatId, onSave, onClose }) {
  const isNew = !szabaly?.id;
  const inpF = { width: "100%", boxSizing: "border-box", padding: "8px 11px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none" };

  const [f, setF] = useState({
    tulajdonosId:  csapatId,
    munkatipus:    szabaly?.munkatipus    || "",
    aktiv:         szabaly?.aktiv         ?? true,
    mod:           szabaly?.mod           || "fix",
    fixOsszeg:     szabaly?.fixOsszeg     || 0,
    darabEgysegAr: szabaly?.darabEgysegAr || 0,
    savok:         szabaly?.savok         || [],
    kmDijFtKm:     szabaly?.kmDijFtKm     || 0,
    kmKuszobKm:    szabaly?.kmKuszobKm    || 0,
    kiszallasiDij: szabaly?.kiszallasiDij || 0,
    megjegyzes:    szabaly?.megjegyzes    || "",
  });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));

  const [preDb, setPreDb] = useState(10);
  const [preKm, setPreKm] = useState(50);
  const eredmeny = calcSzabalyOsszeg(f, { darabszam: preDb, tavKm: preKm });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 3100, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 540, padding: 22, fontFamily: FONT, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <h3 style={{ fontFamily: FONT_HEADING, fontSize: 15, fontWeight: 800, margin: 0 }}>
            {isNew ? "Új AV szabály" : "Szabály szerkesztése"}
          </h3>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: C.muted }}><X size={15}/></button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 12px" }}>
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: .6 }}>Munkatípus</label>
            <select value={f.munkatipus} onChange={e => u("munkatipus", e.target.value)} style={inpF}>
              <option value="">— Minden munkatípusra (általános) —</option>
              {ELSZAMOLASI_MUNKATIPUSOK.map(mt => <option key={mt} value={mt}>{mt}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: .6 }}>Elszámolási mód</label>
            <select value={f.mod} onChange={e => u("mod", e.target.value)} style={{ ...inpF, fontWeight: 600 }}>
              {ELSZAMOLASI_MODOK.map(m => <option key={m.id} value={m.id}>{m.label} – {m.hint}</option>)}
            </select>
          </div>
          {f.mod === "fix" && (
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: .6 }}>Fix összeg (Ft)</label>
              <input type="number" min={0} value={f.fixOsszeg} onChange={e => u("fixOsszeg", Number(e.target.value))} style={inpF}/>
            </div>
          )}
          {f.mod === "darab" && (
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: .6 }}>Egységár (Ft/db)</label>
              <input type="number" min={0} value={f.darabEgysegAr} onChange={e => u("darabEgysegAr", Number(e.target.value))} style={inpF}/>
            </div>
          )}
          {f.mod === "km" && (<>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: .6 }}>Ft/km díj</label>
              <input type="number" min={0} value={f.kmDijFtKm} onChange={e => u("kmDijFtKm", Number(e.target.value))} style={inpF}/>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: .6 }}>Küszöb km</label>
              <input type="number" min={0} value={f.kmKuszobKm} onChange={e => u("kmKuszobKm", Number(e.target.value))} placeholder="0" style={inpF}/>
            </div>
          </>)}
          {f.mod === "fix_kiszallas" && (
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: .6 }}>Fix kiszállási díj (Ft)</label>
              <input type="number" min={0} value={f.kiszallasiDij} onChange={e => u("kiszallasiDij", Number(e.target.value))} style={inpF}/>
            </div>
          )}
          {f.mod === "savos" && (
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: .6 }}>Sávos díjazás</label>
              <div style={{ background: C.bg, border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px" }}>
                <AvSavokSzerkeszto savok={f.savok} onChange={v => u("savok", v)} />
              </div>
            </div>
          )}
          <div style={{ gridColumn: "span 2" }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: .6 }}>Megjegyzés</label>
            <input value={f.megjegyzes} onChange={e => u("megjegyzes", e.target.value)} placeholder="opcionális" style={inpF}/>
          </div>
        </div>

        <div style={{ background: C.successLight, border: "1px solid #86EFAC", borderRadius: 9, padding: "10px 12px", marginTop: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#065F46", margin: "0 0 7px", display: "flex", alignItems: "center", gap: 4 }}>
            <Calculator size={12}/> Tesztelő
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {["darab","savos"].includes(f.mod) && (
              <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                db: <input type="number" value={preDb} onChange={e => setPreDb(Number(e.target.value))}
                  style={{ width: 60, padding: "4px 7px", border: "1.5px solid #BBF7D0", borderRadius: 6, fontSize: 12, fontFamily: FONT }}/>
              </label>
            )}
            {["km","fix_kiszallas"].includes(f.mod) && (
              <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
                km: <input type="number" value={preKm} onChange={e => setPreKm(Number(e.target.value))}
                  style={{ width: 65, padding: "4px 7px", border: "1.5px solid #BBF7D0", borderRadius: 6, fontSize: 12, fontFamily: FONT }}/>
              </label>
            )}
            <span style={{ fontSize: 15, fontWeight: 800, color: eredmeny > 0 ? C.success : C.muted }}>
              = {ft(eredmeny)}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "7px 14px", border: "1.5px solid #E2E8F0", borderRadius: 7, background: "#fff", cursor: "pointer", fontFamily: FONT }}>Mégse</button>
          <button onClick={() => onSave(f)} style={{ padding: "7px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontFamily: FONT }}>
            {isNew ? "Létrehozás" : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AvSzabalyPanel({ csapatId }) {
  const [szabalyok, setSzabalyok] = useState(() => getAvSzabalyokByCsapat(csapatId));
  const [ujForm,    setUjForm]    = useState(false);
  const [szerkSz,   setSzerkSz]   = useState(null);

  function refresh() { setSzabalyok(getAvSzabalyokByCsapat(csapatId)); }

  function handleSave(data) {
    if (szerkSz?.id) updateAvSzabaly(szerkSz.id, data);
    else createAvSzabaly(csapatId, data);
    refresh(); setUjForm(false); setSzerkSz(null);
  }

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F1F5F9" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7, margin: 0 }}>
          Elszámolási szabályok ({szabalyok.length} db)
        </p>
        <button onClick={() => setUjForm(true)}
          style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: C.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 600, fontFamily: FONT }}>
          <Plus size={10}/> Új szabály
        </button>
      </div>

      {szabalyok.length === 0 ? (
        <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic", margin: "4px 0" }}>
          Még nincs alvállalkozói szabály
        </p>
      ) : (
        szabalyok.map(sz => {
          const modInfo = ELSZAMOLASI_MODOK.find(m => m.id === sz.mod);
          return (
            <div key={sz.id} style={{ background: C.bg, border: "1px solid #E2E8F0", borderLeft: "3px solid #7C3AED", borderRadius: 8, padding: "8px 12px", marginBottom: 5, display: "flex", alignItems: "flex-start", gap: 8, opacity: sz.aktiv === false ? .6 : 1 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: C.text }}>{sz.munkatipus || "Általános"}</span>
                  <span style={{ fontSize: 10, background: "#F3E8FF", color: C.accent, padding: "1px 7px", borderRadius: 20, fontWeight: 700 }}>{modInfo?.label || sz.mod}</span>
                  {sz.aktiv === false && <span style={{ fontSize: 10, color: C.muted }}>Inaktív</span>}
                </div>
                <div style={{ fontSize: 11, color: C.success, fontWeight: 600 }}>{szabalyLeiras(sz)}</div>
                {sz.mod === "savos" && (sz.savok || []).length > 0 && (
                  <div style={{ marginTop: 4, display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {(sz.savok || []).map((s, i) => (
                      <span key={i} style={{ fontSize: 10, background: C.accentLight, color: "#6D28D9", padding: "1px 6px", borderRadius: 20 }}>
                        {s.tol}–{s.ig || "∞"}: {Number(s.osszeg || 0).toLocaleString("hu-HU")} Ft
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
                <button onClick={() => { updateAvSzabaly(sz.id, { aktiv: !sz.aktiv }); refresh(); }}
                  style={{ padding: "3px 7px", background: sz.aktiv !== false ? C.warningLight : C.successLight, color: sz.aktiv !== false ? C.warning : C.success, border: "none", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
                  {sz.aktiv !== false ? "Inakt." : "Aktív"}
                </button>
                <button onClick={() => setSzerkSz(sz)} style={{ padding: "3px 6px", background: C.accentLight, color: C.accent, border: "none", borderRadius: 5, cursor: "pointer" }}><Pencil size={10}/></button>
                <button onClick={() => { if (window.confirm("Törlöd?")) { deleteAvSzabaly(sz.id); refresh(); } }} style={{ padding: "3px 5px", background: C.dangerLight, color: C.danger, border: "none", borderRadius: 5, cursor: "pointer" }}><Trash2 size={10}/></button>
              </div>
            </div>
          );
        })
      )}

      {(ujForm || szerkSz) && (
        <AvSzabalyForm
          szabaly={szerkSz}
          csapatId={csapatId}
          onSave={handleSave}
          onClose={() => { setUjForm(false); setSzerkSz(null); }}
        />
      )}
    </div>
  );
}

function CsapatKartya({ csapat, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const tipusInfo = csapat.tipus === "alvallalkozo"
    ? { label: "Alvállalkozó", bg: C.warningLight, color: "#C2410C", border: "#FED7AA" }
    : { label: "Saját csapat", bg: C.accentLight, color: C.accent, border: C.accentLight };

  const tagok = getCsapatTagok(csapat.id);

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
      <div style={{ borderLeft: `4px solid ${csapat.szin || C.accent}`, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: csapat.szin || C.accent, flexShrink: 0 }} />
              <h3 style={{ fontFamily: FONT_HEADING, fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>{csapat.nev}</h3>
              <span style={{ fontSize: 10, fontWeight: 700, background: tipusInfo.bg, color: tipusInfo.color, border: `1px solid ${tipusInfo.border}`, borderRadius: 20, padding: "2px 8px" }}>
                {tipusInfo.label}
              </span>
              {!csapat.aktiv && (
                <span style={{ fontSize: 10, fontWeight: 700, background: C.bg, color: C.muted, borderRadius: 20, padding: "2px 8px" }}>Inaktív</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.muted }}>
                <MapPin size={12} />{csapat.telephely || "—"}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.muted }}>
                <Users size={12} />{tagok.filter(t => t.aktiv !== false).length} tag
              </span>
              <span style={{ fontSize: 12, color: C.muted }}>
                Kapacitás: <strong>{csapat.kapacitas || 2} munka/nap</strong>
              </span>
              {csapat.hetvegen && (
                <span style={{ fontSize: 11, fontWeight: 700, background: C.accentLight, color: C.accent, borderRadius: 20, padding: "2px 8px" }}>Hétvégén is</span>
              )}
              {csapat.elszamolasAktiv && (
                <span style={{ fontSize: 11, fontWeight: 700, background: C.successLight, color: C.success, borderRadius: 20, padding: "2px 8px" }}>
                  💰 Alvállalkozói díj
                </span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: expanded ? C.accentLight : "#fff", cursor: "pointer", fontSize: 12, fontFamily: FONT, display: "flex", alignItems: "center", gap: 4, color: expanded ? C.accent : C.muted }}
            >
              Tagok & Szabályok <ChevronDown size={13} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>
            <button onClick={() => onEdit(csapat)} style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontFamily: FONT, color: C.muted }}>
              <Pencil size={13} /> Szerkesztés
            </button>
            <button onClick={() => onDelete(csapat)} style={{ padding: "7px 10px", borderRadius: 8, border: "none", background: C.dangerLight, cursor: "pointer", display: "flex", alignItems: "center", color: C.danger }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {expanded && (
          <>
            <CsapatTagPanel csapatId={csapat.id} />
            <AvSzabalyPanel csapatId={csapat.id} />
          </>
        )}
      </div>
    </div>
  );
}

export default function CsapatokPage({ currentUser }) {
  const [csapatok, setCsapatok] = useState(() => loadCsapatok());
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    function refresh() { setCsapatok(loadCsapatok()); }
    window.addEventListener("crm-db-updated", refresh);
    return () => window.removeEventListener("crm-db-updated", refresh);
  }, []);

  function handleEdit(csapat) { setEditTarget(csapat); setFormOpen(true); }
  function handleNew()        { setEditTarget(null);   setFormOpen(true); }
  function handleDelete()     { deleteCsapat(deleteTarget.id); setDeleteTarget(null); }

  const isAdmin = ["Admin", "Projektmenedzser"].includes(currentUser?.role);
  const aktiv   = csapatok.filter(c => c.aktiv !== false).length;
  const sajat   = csapatok.filter(c => c.tipus !== "alvallalkozo").length;
  const alv     = csapatok.filter(c => c.tipus === "alvallalkozo").length;

  return (
    <div style={{ padding: "24px 28px", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 24, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>
            👷 Csapatok
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            {csapatok.length} csapat · {aktiv} aktív · {sajat} saját · {alv} alvállalkozó
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleNew}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}
          >
            <Plus size={15} /> Új csapat
          </button>
        )}
      </div>

      {csapatok.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: "60px 24px", textAlign: "center" }}>
          <Users size={40} color={C.border} style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: C.muted, margin: "0 0 6px" }}>Még nincsenek csapatok</p>
          <p style={{ fontSize: 13, color: C.border, margin: "0 0 16px" }}>Hozd létre az első csapatot a gombbal</p>
          {isAdmin && (
            <button onClick={handleNew} style={{ padding: "9px 20px", background: C.accent, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontFamily: FONT }}>
              + Új csapat
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {csapatok.map(cs => (
            <CsapatKartya
              key={cs.id}
              csapat={cs}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <CsapatForm
          csapat={editTarget}
          currentUser={currentUser}
          onClose={() => { setFormOpen(false); setEditTarget(null); }}
          onSaved={() => setCsapatok(loadCsapatok())}
        />
      )}

      {deleteTarget && (
        <TorlesModal
          csapat={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
