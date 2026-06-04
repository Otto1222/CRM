import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Trash2, Search, X, FileText, ArrowRight, CheckCircle } from "lucide-react";
import { FONT, FONT_HEADING } from "../lib/constants";
import { ft } from "../lib/helpers";
import { loadLocal } from "../lib/localDb";
import { AJANLAT_STATUSZOK, getAjanlatStatusConfig } from "../modules/ajanla tok/ajanlat.schema";
import { loadAjanlatok, updateAjanlat, deleteAjanlat } from "../modules/ajanla tok/ajanlat.service";
import AjanlatEditor from "../modules/ajanla tok/AjanlatEditor";
import ProjektForm from "../modules/projektek/ProjektForm";

function StatusPicker({ current, onSelect }) {
  return (
    <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)", padding: 8, display: "flex", flexDirection: "column", gap: 2, minWidth: 170, zIndex: 100 }}>
      {AJANLAT_STATUSZOK.map(s => (
        <button key={s.id} onClick={() => onSelect(s.id)}
          style={{ padding: "7px 12px", borderRadius: 7, border: "none", background: s.id === current ? s.bg : "transparent", color: s.id === current ? s.szin : "#374151", fontWeight: s.id === current ? 700 : 500, fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: FONT }}>
          {s.id}
        </button>
      ))}
    </div>
  );
}

export default function ArajanlaltokPage({ currentUser }) {
  const [ajanlatok, setAjanlatok]         = useState(() => loadAjanlatok());
  const [showEditor, setShowEditor]       = useState(false);
  const [editorAjanlat, setEditorAjanlat] = useState(null);
  const [showProjektModal, setShowProjektModal] = useState(false);
  const [ajanlatForProject, setAjanlatForProject] = useState(null);
  const [filterStatus, setFilterStatus]   = useState("Összes");
  const [search, setSearch]               = useState("");
  const [statusPicker, setStatusPicker]   = useState(null);

  useEffect(() => {
    function refresh() { setAjanlatok(loadAjanlatok()); }
    window.addEventListener("crm-db-updated", refresh);
    return () => window.removeEventListener("crm-db-updated", refresh);
  }, []);

  const projektek = useMemo(() => loadLocal("projektek") || [], [ajanlatok]);

  const stats = useMemo(() => {
    const toSum = arr => arr.reduce((s, a) => s + (Number(a.osszeg) || 0), 0);
    return {
      osszes:   ajanlatok.length,
      kikuld:   { db: ajanlatok.filter(a => a.status === "Kiküldve").length,   osszeg: toSum(ajanlatok.filter(a => a.status === "Kiküldve"))   },
      elfogad:  { db: ajanlatok.filter(a => a.status === "Elfogadva").length,  osszeg: toSum(ajanlatok.filter(a => a.status === "Elfogadva"))  },
      elutasit: { db: ajanlatok.filter(a => a.status === "Elutasítva").length, osszeg: toSum(ajanlatok.filter(a => a.status === "Elutasítva")) },
    };
  }, [ajanlatok]);

  const filtered = useMemo(() => {
    return ajanlatok
      .filter(a => filterStatus === "Összes" || a.status === filterStatus)
      .filter(a => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (a.ajanlatkod || "").toLowerCase().includes(q) ||
               (a.clientNev  || "").toLowerCase().includes(q) ||
               (a.nev        || "").toLowerCase().includes(q);
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [ajanlatok, filterStatus, search]);

  function handleDelete(a) {
    if (!window.confirm(`Törlöd ezt az ajánlatot?\n${a.ajanlatkod} – ${a.clientNev}`)) return;
    deleteAjanlat(a.id);
    setAjanlatok(loadAjanlatok());
  }

  function handleStatusChange(id, newStatus) {
    updateAjanlat(id, { status: newStatus });
    setAjanlatok(loadAjanlatok());
    setStatusPicker(null);
  }

  function handleProjektLetrehoz(a) {
    setAjanlatForProject(a);
    setShowProjektModal(true);
  }

  function handleProjektSaved(savedProject) {
    updateAjanlat(ajanlatForProject.id, { projektId: savedProject.id });
    setAjanlatok(loadAjanlatok());
    setShowProjektModal(false);
    setAjanlatForProject(null);
  }

  function openEditor(ajanlat) {
    setEditorAjanlat(ajanlat || null);
    setShowEditor(true);
  }

  const isAdmin = ["Admin", "Projektmenedzser"].includes(currentUser?.role);

  // ── Teljes képernyős szerkesztő nézet ───────────────────────
  if (showEditor) {
    return (
      <AjanlatEditor
        ajanlat={editorAjanlat}
        onClose={() => { setShowEditor(false); setEditorAjanlat(null); setAjanlatok(loadAjanlatok()); }}
        currentUser={currentUser}
      />
    );
  }

  return (
    <div style={{ padding: "24px 28px", fontFamily: FONT, background: "#F8FAFC", minHeight: "100vh" }}>
      {/* Fejléc */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: FONT_HEADING, fontSize: 24, fontWeight: 800, color: "#0F172A", margin: 0 }}>Árajánlatok</h1>
        {isAdmin && (
          <button onClick={() => openEditor(null)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>
            <Plus size={16} /> Új ajánlat
          </button>
        )}
      </div>

      {/* Stat kártyák */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { label: "Kiküldve",   db: stats.kikuld.db,   osszeg: stats.kikuld.osszeg,   color: "#D97706", bg: "#FFFBEB" },
          { label: "Elfogadva",  db: stats.elfogad.db,  osszeg: stats.elfogad.osszeg,  color: "#059669", bg: "#ECFDF5" },
          { label: "Elutasítva", db: stats.elutasit.db, osszeg: stats.elutasit.osszeg, color: "#DC2626", bg: "#FEF2F2" },
          { label: "Összes",     db: stats.osszes,      osszeg: 0,                     color: "#0369A1", bg: "#F0F9FF" },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: "14px 18px", border: `1px solid ${c.color}30`, flex: 1, minWidth: 140 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: c.color, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 4px" }}>{c.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", margin: "0 0 2px" }}>{c.db} db</p>
            {c.osszeg > 0 && <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>{ft(c.osszeg)}</p>}
          </div>
        ))}
      </div>

      {/* Szűrők + keresés */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Összes", ...AJANLAT_STATUSZOK.map(s => s.id)].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                background: filterStatus === s ? "#2563EB" : "#fff",
                color:      filterStatus === s ? "#fff"    : "#64748B",
                border:    `1.5px solid ${filterStatus === s ? "#2563EB" : "#E2E8F0"}`,
              }}>
              {s}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 9, padding: "6px 12px", minWidth: 200, maxWidth: 300 }}>
          <Search size={15} color="#94A3B8" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kód, ügyfél, megnevezés…"
            style={{ border: "none", outline: "none", fontSize: 13, fontFamily: FONT, background: "transparent", flex: 1 }} />
          {search && <button onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", color: "#94A3B8", padding: 0 }}><X size={14} /></button>}
        </div>
      </div>

      {/* Táblázat */}
      <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "2px solid #E2E8F0" }}>
                {["Ajánlatkód", "Ügyfél", "Megnevezés", "Összeg", "Státusz", "Érvényesség", "Projekt", ""].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: "#94A3B8" }}>
                  <div><FileText size={32} style={{ marginBottom: 10, opacity: 0.3 }} /></div>
                  <p style={{ margin: 0, fontWeight: 600 }}>Nincsenek ajánlatok</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12 }}>Kattints az "+ Új ajánlat" gombra az első létrehozásához</p>
                </td></tr>
              )}
              {filtered.map((a, i) => {
                const linkedProjekt = a.projektId ? projektek.find(p => p.id === a.projektId) : null;
                const cfg = getAjanlatStatusConfig(a.status);
                return (
                  <tr key={a.id} style={{ borderBottom: "1px solid #F1F5F9", background: i % 2 === 0 ? "#fff" : "#FAFAFA", cursor: "pointer" }}
                    onClick={() => openEditor(a)}>
                    <td style={{ padding: "12px 14px" }}>
                      <p style={{ fontWeight: 700, color: "#2563EB", margin: 0 }}>{a.ajanlatkod}</p>
                      <p style={{ fontSize: 10, color: "#94A3B8", margin: 0 }}>{a.createdAt}</p>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <p style={{ fontWeight: 600, color: "#0F172A", margin: 0 }}>{a.clientNev || "—"}</p>
                      {a.clientTel && <p style={{ fontSize: 11, color: "#64748B", margin: 0 }}>{a.clientTel}</p>}
                    </td>
                    <td style={{ padding: "12px 14px", color: "#374151", maxWidth: 200 }}>
                      <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nev || "—"}</p>
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: a.osszeg ? "#0F172A" : "#94A3B8", whiteSpace: "nowrap" }}>
                      {a.osszeg ? ft(Number(a.osszeg)) : "—"}
                    </td>
                    <td style={{ padding: "12px 14px" }} onClick={e => e.stopPropagation()}>
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <button onClick={() => isAdmin && setStatusPicker(statusPicker === a.id ? null : a.id)}
                          style={{ background: cfg.bg, color: cfg.szin, border: `1.5px solid ${cfg.szin}40`, borderRadius: 20, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: isAdmin ? "pointer" : "default", fontFamily: FONT }}>
                          {a.status} {isAdmin && "▾"}
                        </button>
                        {isAdmin && statusPicker === a.id && (
                          <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50 }}>
                            <StatusPicker current={a.status} onSelect={s => handleStatusChange(a.id, s)} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", color: "#64748B", fontSize: 12 }}>{a.ervenyesseg || "—"}</td>
                    <td style={{ padding: "12px 14px" }} onClick={e => e.stopPropagation()}>
                      {linkedProjekt ? (
                        <span style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #86EFAC", borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle size={11} /> {linkedProjekt.projektkod}
                        </span>
                      ) : a.status === "Elfogadva" && isAdmin ? (
                        <button onClick={() => handleProjektLetrehoz(a)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "#EFF6FF", color: "#2563EB", border: "1.5px solid #BFDBFE", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 11, fontFamily: FONT, whiteSpace: "nowrap" }}>
                          <ArrowRight size={12} /> Projekt létrehozása
                        </button>
                      ) : (
                        <span style={{ color: "#94A3B8", fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px" }} onClick={e => e.stopPropagation()}>
                      {isAdmin && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => openEditor(a)}
                            style={{ padding: "5px 8px", background: "#F1F5F9", border: "none", borderRadius: 7, cursor: "pointer", color: "#475569" }} title="Szerkesztés">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(a)}
                            style={{ padding: "5px 8px", background: "#FEF2F2", border: "none", borderRadius: 7, cursor: "pointer", color: "#DC2626" }} title="Törlés">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: "10px 16px", borderTop: "1px solid #E2E8F0", background: "#F8FAFC" }}>
          <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>{filtered.length} ajánlat · Kattints egy sorra a szerkesztőhöz</p>
        </div>
      </div>

      {showProjektModal && ajanlatForProject && (
        <ProjektForm
          projekt={null}
          ajanlatElofolt={ajanlatForProject}
          onClose={() => { setShowProjektModal(false); setAjanlatForProject(null); }}
          onSaved={handleProjektSaved}
          currentUser={currentUser}
        />
      )}

      {statusPicker && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setStatusPicker(null)} />
      )}
    </div>
  );
}
