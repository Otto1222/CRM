import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Users, MapPin, X, Save, ChevronDown } from "lucide-react";
import { FONT, FONT_HEADING } from "../../lib/constants.js";
import { getUsers } from "../../lib/crmUsers.js";
import { loadCsapatok, createCsapat, updateCsapat, deleteCsapat } from "./csapat.service.js";

const SZINEK = [
  "#2563EB", "#059669", "#9333EA", "#EA580C",
  "#0891B2", "#B45309", "#DC2626", "#475569",
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
          background: value ? "#2563EB" : "#CBD5E1", transition: "background .2s", flexShrink: 0,
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
        <h3 style={{ fontFamily: FONT_HEADING, fontSize: 16, fontWeight: 800, color: "#DC2626", margin: "0 0 10px" }}>Csapat törlése</h3>
        <p style={{ fontSize: 14, color: "#475569", margin: "0 0 20px" }}>
          Biztosan törlöd a <strong>"{csapat.nev}"</strong> csapatot? Ez nem vonható vissza.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid #E2E8F0", background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT }}>Mégse</button>
          <button onClick={onConfirm} style={{ padding: "9px 18px", borderRadius: 9, border: "none", background: "#DC2626", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: FONT }}>Törlés</button>
        </div>
      </div>
    </div>
  );
}

function CsapatForm({ csapat, onClose, onSaved, currentUser }) {
  const isNew = !csapat?.id;
  const allUsers = getUsers().filter(u => ["Admin", "Projektmenedzser", "Telepítő"].includes(u.role));

  const [form, setForm] = useState({
    nev: csapat?.nev || "",
    telephely: csapat?.telephely || "",
    szin: csapat?.szin || "#2563EB",
    tagok: csapat?.tagok || [],
    tagNevek: csapat?.tagNevek || [],
    kapacitas: csapat?.kapacitas ?? 2,
    hetvegen: csapat?.hetvegen || false,
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
    <div
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "20px 16px", overflowY: "auto" }}
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, boxShadow: "0 24px 60px rgba(0,0,0,.25)", fontFamily: FONT }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid #E2E8F0" }}>
          <h2 style={{ fontFamily: FONT_HEADING, fontSize: 18, fontWeight: 800, margin: 0 }}>
            {isNew ? "Új csapat" : "Csapat szerkesztése"}
          </h2>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#94A3B8" }}><X size={22} /></button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {hiba && (
            <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 9, padding: "9px 12px", fontSize: 13, color: "#DC2626", fontWeight: 600 }}>{hiba}</div>
          )}

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.7 }}>Csapat neve *</label>
            <input value={form.nev} onChange={e => upd("nev", e.target.value)} placeholder="pl. Budapest Csapat A" style={{ ...inp, border: "2px solid #2563EB", fontWeight: 600 }} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.7 }}>Indulási telephely *</label>
            <input value={form.telephely} onChange={e => upd("telephely", e.target.value)} placeholder="pl. Budapest, Pest megye" style={inp} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 16px" }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.7 }}>Napi kapacitás (db munka)</label>
              <input type="number" min="1" max="20" value={form.kapacitas} onChange={e => upd("kapacitas", Number(e.target.value))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.7 }}>Csapat színe</label>
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

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.7 }}>
              Csapattagok ({form.tagok.length} kiválasztva)
            </label>
            <div style={{ border: "1.5px solid #E2E8F0", borderRadius: 10, overflow: "hidden" }}>
              {allUsers.length === 0 ? (
                <p style={{ padding: 14, fontSize: 13, color: "#94A3B8", margin: 0 }}>Nincs elérhető felhasználó</p>
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
                        background: selected ? "#EFF6FF" : "#fff",
                        transition: "background .1s",
                      }}
                    >
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                        background: selected ? "#2563EB" : "#fff",
                        border: `2px solid ${selected ? "#2563EB" : "#CBD5E1"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {selected && <span style={{ color: "#fff", fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#0F172A" }}>{u.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "#64748B" }}>{u.role}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: "14px 24px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid #E2E8F0", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>Mégse</button>
          <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 22px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>
            <Save size={15} />{isNew ? "Csapat létrehozása" : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CsapatKartya({ csapat, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,.05)" }}>
      <div style={{ borderLeft: `4px solid ${csapat.szin || "#2563EB"}`, padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: csapat.szin || "#2563EB", flexShrink: 0 }} />
              <h3 style={{ fontFamily: FONT_HEADING, fontSize: 16, fontWeight: 800, color: "#0F172A", margin: 0 }}>{csapat.nev}</h3>
              {!csapat.aktiv && (
                <span style={{ fontSize: 10, fontWeight: 700, background: "#F1F5F9", color: "#64748B", borderRadius: 20, padding: "2px 8px" }}>Inaktív</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748B" }}>
                <MapPin size={12} />{csapat.telephely || "—"}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#64748B" }}>
                <Users size={12} />{(csapat.tagok || []).length} tag
              </span>
              <span style={{ fontSize: 12, color: "#64748B" }}>
                Kapacitás: <strong>{csapat.kapacitas || 2} munka/nap</strong>
              </span>
              {csapat.hetvegen && (
                <span style={{ fontSize: 11, fontWeight: 700, background: "#EFF6FF", color: "#2563EB", borderRadius: 20, padding: "2px 8px" }}>Hétvégén is</span>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
            <button
              onClick={() => setExpanded(e => !e)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", cursor: "pointer", fontSize: 12, fontFamily: FONT, display: "flex", alignItems: "center", gap: 4, color: "#64748B" }}
            >
              Tagok <ChevronDown size={13} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>
            <button onClick={() => onEdit(csapat)} style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontFamily: FONT, color: "#475569" }}>
              <Pencil size={13} /> Szerkesztés
            </button>
            <button onClick={() => onDelete(csapat)} style={{ padding: "7px 10px", borderRadius: 8, border: "none", background: "#FEF2F2", cursor: "pointer", display: "flex", alignItems: "center", color: "#DC2626" }}>
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {expanded && (csapat.tagok || []).length > 0 && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F1F5F9" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>Csapattagok</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(csapat.tagNevek || csapat.tagok || []).map((nev, i) => (
                <span key={i} style={{ fontSize: 12, fontWeight: 600, background: `${csapat.szin}18`, color: csapat.szin, borderRadius: 20, padding: "4px 10px", border: `1px solid ${csapat.szin}30` }}>
                  {nev}
                </span>
              ))}
            </div>
          </div>
        )}
        {expanded && (csapat.tagok || []).length === 0 && (
          <p style={{ marginTop: 10, fontSize: 12, color: "#94A3B8", fontStyle: "italic" }}>Még nincs hozzárendelt tag</p>
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

  function handleEdit(csapat) {
    setEditTarget(csapat);
    setFormOpen(true);
  }

  function handleNew() {
    setEditTarget(null);
    setFormOpen(true);
  }

  function handleDelete() {
    deleteCsapat(deleteTarget.id);
    setDeleteTarget(null);
  }

  const isAdmin = ["Admin", "Projektmenedzser"].includes(currentUser?.role);
  const aktiv = csapatok.filter(c => c.aktiv !== false).length;
  const osszesTags = csapatok.reduce((s, c) => s + (c.tagok || []).length, 0);

  return (
    <div style={{ padding: "24px 28px", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 24, fontWeight: 800, color: "#0F172A", margin: "0 0 4px" }}>
            👷 Csapatok
          </h1>
          <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
            {csapatok.length} csapat · {aktiv} aktív · {osszesTags} tag összesen
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleNew}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}
          >
            <Plus size={15} /> Új csapat
          </button>
        )}
      </div>

      {csapatok.length === 0 ? (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", padding: "60px 24px", textAlign: "center" }}>
          <Users size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 15, fontWeight: 700, color: "#94A3B8", margin: "0 0 6px" }}>Még nincsenek csapatok</p>
          <p style={{ fontSize: 13, color: "#CBD5E1", margin: "0 0 16px" }}>Hozd létre az első csapatot a gombbal</p>
          {isAdmin && (
            <button onClick={handleNew} style={{ padding: "9px 20px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontFamily: FONT }}>
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
