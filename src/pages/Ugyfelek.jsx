import { useState, useEffect } from "react";
import { Search, Plus, Pencil, Trash2, X, Save, User, Phone, Mail, MapPin, FolderOpen, Download } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { loadLocal, saveLocal } from "../lib/localDb";
import { canSeeFovallalkozo } from "../lib/roles";
import { loadFovallalkozok } from "../modules/fovallalkozok/fovallalkozo.service";

function resolveForrAs(u, fovallalkozok) {
  if (!u.forrás || u.forrás === "Saját") return u.forrás;
  const byRov = fovallalkozok.find(f => f.rovidites === u.forrás);
  if (byRov) return byRov.rovidites;
  if (u.fovallalkozoNev) {
    const byNev = fovallalkozok.find(f =>
      f.nev?.toLowerCase().trim() === u.fovallalkozoNev?.toLowerCase().trim()
    );
    if (byNev?.rovidites) return byNev.rovidites;
  }
  return u.forrás;
}

const STATUSZ_CFG = {
  "Aktív":        { bg: C.successLight, color: C.success },
  "Potenciális":  { bg: C.accentLight,  color: C.accent  },
  "Inaktív":      { bg: C.bg,           color: C.muted   },
};
const STATUSZOK = Object.keys(STATUSZ_CFG);
const TIPUSOK   = ["Magánszemély", "Vállalkozás"];

const inp = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  border: `1.5px solid ${C.border}`,
  borderRadius: 9,
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  background: "#FAFAFA",
};

function Field({ label, children, half }) {
  return (
    <div style={{ gridColumn: half ? "span 1" : "span 2" }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.7 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function StatuszBadge({ s }) {
  const cfg = STATUSZ_CFG[s] || { bg: C.bg, color: C.muted };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {s || "Aktív"}
    </span>
  );
}

function UgyfelForm({ ugyfel, onClose, onSaved }) {
  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const isNew = !ugyfel?.id;
  const [form, setForm] = useState({
    name:       ugyfel?.name       || "",
    type:       ugyfel?.type       || "Magánszemély",
    phone:      ugyfel?.phone      || "",
    email:      ugyfel?.email      || "",
    address:    ugyfel?.address    || "",
    status:     ugyfel?.status     || "Aktív",
    megjegyzes: ugyfel?.megjegyzes || "",
  });
  const [hiba, setHiba] = useState("");

  function upd(k, v) {
    setForm(p => ({ ...p, [k]: v }));
    if (hiba) setHiba("");
  }

  function handleSave() {
    if (!form.name.trim()) { setHiba("A név megadása kötelező."); return; }

    const list = loadLocal("ugyfelek") || [];
    const now  = new Date().toISOString();

    let updated;
    if (isNew) {
      const newItem = { ...form, id: `ugy_${Date.now()}`, createdAt: now, updatedAt: now };
      updated = [...list, newItem];
      onSaved(newItem);
    } else {
      updated = list.map(c => c.id === ugyfel.id ? { ...c, ...form, updatedAt: now } : c);
      onSaved(updated.find(c => c.id === ugyfel.id));
    }

    saveLocal("ugyfelek", updated);
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "ugyfelek" } }));
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 16px", overflowY: "auto" }}>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, boxShadow: "0 24px 60px rgba(0,0,0,.25)", fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ fontFamily: FONT_HEADING, fontSize: 18, fontWeight: 800, margin: 0, color: C.text }}>
            {isNew ? "Új ügyfél" : "Ügyfél szerkesztése"}
          </h2>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: C.muted }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ padding: "20px 24px" }}>
          {hiba && (
            <div style={{ background: C.dangerLight, border: `1.5px solid ${C.danger}40`, borderRadius: 9, padding: "9px 12px", marginBottom: 14, fontSize: 13, color: C.danger, fontWeight: 600 }}>
              {hiba}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px" }}>
            <Field label="Név *">
              <input value={form.name} onChange={e => upd("name", e.target.value)} placeholder="pl. Kovács János" style={{ ...inp, border: `2px solid ${C.accent}`, fontWeight: 600 }} />
            </Field>
            <Field label="Típus" half>
              <select value={form.type} onChange={e => upd("type", e.target.value)} style={inp}>
                {TIPUSOK.map(t => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Státusz" half>
              <select value={form.status} onChange={e => upd("status", e.target.value)} style={inp}>
                {STATUSZOK.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Telefonszám" half>
              <input value={form.phone} onChange={e => upd("phone", e.target.value)} placeholder="+36 30 123 4567" style={inp} />
            </Field>
            <Field label="E-mail" half>
              <input type="email" value={form.email} onChange={e => upd("email", e.target.value)} placeholder="email@example.com" style={inp} />
            </Field>
            <Field label="Cím">
              <input value={form.address} onChange={e => upd("address", e.target.value)} placeholder="Irányítószám, Város, utca, hsz." style={inp} />
            </Field>
            <Field label="Megjegyzés">
              <textarea
                value={form.megjegyzes}
                onChange={e => upd("megjegyzes", e.target.value)}
                placeholder="Belső megjegyzés az ügyfélről…"
                rows={3}
                style={{ ...inp, resize: "vertical" }}
              />
            </Field>
          </div>
        </div>

        <div style={{ padding: "14px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONT, color: C.text }}>
            Mégse
          </button>
          <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 22px", background: C.accent, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>
            <Save size={15} />
            {isNew ? "Ügyfél létrehozása" : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TorlesModal({ ugyfel, onCancel, onConfirm }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 400, padding: 28, fontFamily: FONT, textAlign: "center" }}>
        <div style={{ width: 52, height: 52, background: C.dangerLight, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <Trash2 size={24} color={C.danger} />
        </div>
        <h3 style={{ fontFamily: FONT_HEADING, fontSize: 17, fontWeight: 800, margin: "0 0 8px", color: C.text }}>Ügyfél törlése</h3>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px" }}>
          Biztosan törlöd <strong>{ugyfel.name}</strong> ügyfelét? A művelet nem vonható vissza.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px", border: `1.5px solid ${C.border}`, borderRadius: 9, background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONT, color: C.text }}>
            Mégse
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "10px", background: C.danger, color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
            Törlés
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Ugyfelek({ data, currentUser }) {
  const [ugyfelek, setUgyfelek] = useState(() => loadLocal("ugyfelek") || data?.ugyfelek || []);
  const [q, setQ]               = useState("");
  const [statuszFilter, setStatuszFilter] = useState("Összes");
  const [forrasFilter, setForrasFilter]   = useState("Összes");
  const [formOpen, setFormOpen]           = useState(false);
  const [editItem, setEditItem]           = useState(null);
  const [torlesItem, setTorlesItem]       = useState(null);
  const canPartner = canSeeFovallalkozo(currentUser?.role);
  const fovallalkozok = loadFovallalkozok();

  const projektek = data?.projektek || [];

  useEffect(() => {
    function refresh(e) {
      if (!e.detail?.collection || e.detail.collection === "ugyfelek") {
        setUgyfelek(loadLocal("ugyfelek") || []);
      }
    }
    window.addEventListener("crm-db-updated", refresh);
    return () => window.removeEventListener("crm-db-updated", refresh);
  }, []);

  function getProjektCount(ugyfel) {
    return projektek.filter(p =>
      p.clientNev === ugyfel.name ||
      p.clientId  === ugyfel.id
    ).length;
  }

  function handleEdit(c) { setEditItem(c); setFormOpen(true); }
  function handleNew()    { setEditItem(null); setFormOpen(true); }

  function handleTorles(c) {
    const list = loadLocal("ugyfelek") || [];
    const updated = list.filter(u => u.id !== c.id);
    saveLocal("ugyfelek", updated);
    setUgyfelek(updated);
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "ugyfelek" } }));
    setTorlesItem(null);
  }

  const SZUROK = ["Összes", ...STATUSZOK];

  const allForrasok = canPartner
    ? ["Összes", "Saját", ...new Set(ugyfelek.filter(u => u.forrás && u.forrás !== "Saját").map(u => u.forrás))]
    : [];

  const filtered = ugyfelek.filter(c => {
    const q2 = q.toLowerCase();
    const matchQ = !q ||
      (c.name    || "").toLowerCase().includes(q2) ||
      (c.email   || "").toLowerCase().includes(q2) ||
      (c.phone   || "").toLowerCase().includes(q2) ||
      (c.address || "").toLowerCase().includes(q2);
    const matchS = statuszFilter === "Összes" || (c.status || "Aktív") === statuszFilter;
    const matchF = !canPartner || forrasFilter === "Összes" || (c.forrás || "Saját") === forrasFilter;
    return matchQ && matchS && matchF;
  });

  function exportCsv() {
    const headers = ["Név","Típus","Telefon","E-mail","Cím","Státusz","Forrás","Fővállalkozó"];
    const rows = filtered.map(u => [
      u.name||"", u.type||"Magánszemély", u.phone||"", u.email||"",
      u.address||"", u.status||"Aktív", u.forrás||"Saját", u.fovallalkozoNev||""
    ]);
    const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿"+csv],{type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download=`ugyfelek_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ padding: "24px 28px", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 24, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>
            👤 Ügyfelek
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            {ugyfelek.length} ügyfél · {ugyfelek.filter(c => (c.status || "Aktív") === "Aktív").length} aktív
          </p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {canPartner && (
            <button type="button" onClick={exportCsv} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 16px", background: C.bg, color: C.muted, border:`1.5px solid ${C.border}`, borderRadius:10, cursor:"pointer", fontWeight:600, fontSize:13, fontFamily:FONT }}>
              <Download size={14}/> CSV export
            </button>
          )}
          <button
            type="button"
            onClick={handleNew}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}
          >
            <Plus size={15} /> Új ügyfél
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 340 }}>
          <Search size={15} color={C.muted} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Keresés név, e-mail, telefon szerint…"
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px 9px 34px", border: `1.5px solid ${C.border}`, borderRadius: 10, fontSize: 13, fontFamily: FONT, outline: "none", background: "#fff" }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap:"wrap" }}>
          {SZUROK.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatuszFilter(s)}
              style={{ padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontFamily: FONT, fontWeight: 600, fontSize: 12, whiteSpace: "nowrap", background: statuszFilter === s ? C.accent : C.bg, color: statuszFilter === s ? "#fff" : C.muted }}
            >
              {s}
            </button>
          ))}
          {canPartner && allForrasok.length > 2 && (
            <>
              <span style={{ color: C.border, alignSelf:"center" }}>|</span>
              {allForrasok.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setForrasFilter(f)}
                  style={{ padding:"6px 14px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:FONT, fontWeight:600, fontSize:12, whiteSpace:"nowrap",
                    background: forrasFilter===f ? (f==="Saját" ? C.success : C.accent) : C.bg,
                    color: forrasFilter===f ? "#fff" : C.muted }}
                >
                  {f==="Összes"?"Mind (forrás)":f==="Saját"?"Saját":`[${f}]`}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                {["Ügyfél", ...(canPartner?["Forrás"]:[]), "Típus", "Telefon", "E-mail", "Cím", "Státusz", "Projektek", ""].map(h => (
                  <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: "48px", textAlign: "center", color: C.muted }}>
                    <User size={36} style={{ opacity: 0.25, display: "block", margin: "0 auto 10px" }} />
                    {q ? "Nincs találat a keresésre" : "Még nincsenek ügyfelek"}
                  </td>
                </tr>
              )}
              {filtered.map((c, i) => {
                const projektSzam = getProjektCount(c);
                return (
                  <tr
                    key={c.id}
                    style={{ borderBottom: `1px solid ${C.bg}`, background: i % 2 === 0 ? "#fff" : "#FAFAFA", cursor: "pointer", transition: "background .1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.accentLight}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#FAFAFA"}
                    onClick={() => handleEdit(c)}
                  >
                    <td style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.accent, fontSize: 14, flexShrink: 0 }}>
                          {(c.name || "?")[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: C.text }}>{c.name}</div>
                          {c.megjegyzes && <div style={{ fontSize: 11, color: C.muted, marginTop: 1, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.megjegyzes}</div>}
                        </div>
                      </div>
                    </td>
                    {canPartner && (
                      <td style={{ padding:"14px 16px" }}>
                        {c.forrás ? (() => {
                          const aktualis = resolveForrAs(c, fovallalkozok);
                          return (
                            <span style={{
                              background: aktualis==="Saját" ? C.successLight : C.accentLight,
                              color:      aktualis==="Saját" ? C.success      : C.accent,
                              borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap"
                            }}>
                              {aktualis==="Saját"?"Saját":`[${aktualis}]`}
                            </span>
                          );
                        })() : <span style={{ color: C.border, fontSize:12 }}>—</span>}
                      </td>
                    )}
                    <td style={{ padding: "14px 16px" }}>
                      <span style={{ background: c.type === "Vállalkozás" ? "#FEF9C3" : C.bg, color: c.type === "Vállalkozás" ? "#854D0E" : C.muted, borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 600 }}>
                        {c.type || "Magánszemély"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 5, color: C.muted, textDecoration: "none", fontSize: 13 }}>
                          <Phone size={13} color={C.muted} /> {c.phone}
                        </a>
                      ) : <span style={{ color: C.border }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px" }}>
                      {c.email ? (
                        <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 5, color: C.accent, textDecoration: "none", fontSize: 13 }}>
                          <Mail size={13} /> {c.email}
                        </a>
                      ) : <span style={{ color: C.border }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px", color: C.muted, maxWidth: 200 }}>
                      {c.address ? (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                          <MapPin size={13} color={C.muted} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.address}</span>
                        </div>
                      ) : <span style={{ color: C.border }}>—</span>}
                    </td>
                    <td style={{ padding: "14px 16px" }}><StatuszBadge s={c.status || "Aktív"} /></td>
                    <td style={{ padding: "14px 16px" }}>
                      {projektSzam > 0 ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <FolderOpen size={13} color={C.accent} />
                          <span style={{ color: C.accent, fontWeight: 700, fontSize: 13 }}>{projektSzam} db</span>
                        </div>
                      ) : (
                        <span style={{ color: C.border, fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "14px 16px" }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => handleEdit(c)}
                          title="Szerkesztés"
                          style={{ padding: "6px 10px", background: C.bg, color: C.muted, border: "none", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setTorlesItem(c)}
                          title="Törlés"
                          style={{ padding: "6px 10px", background: C.dangerLight, color: C.danger, border: "none", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, background: C.bg }}>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
            {filtered.length} ügyfél megjelenítve · Kattints a sorra a szerkesztéshez
          </p>
        </div>
      </div>

      {formOpen && (
        <UgyfelForm
          ugyfel={editItem}
          onClose={() => { setFormOpen(false); setEditItem(null); }}
          onSaved={() => setUgyfelek(loadLocal("ugyfelek") || [])}
        />
      )}

      {torlesItem && (
        <TorlesModal
          ugyfel={torlesItem}
          onCancel={() => setTorlesItem(null)}
          onConfirm={() => handleTorles(torlesItem)}
        />
      )}
    </div>
  );
}
