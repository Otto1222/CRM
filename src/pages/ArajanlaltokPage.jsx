import { useState, useEffect, useMemo } from "react";
import { Plus, Search, X, FileText, ArrowRight, CheckCircle, Printer } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { ft } from "../lib/helpers";
import { loadLocal } from "../lib/localDb";
import { AJANLAT_STATUSZOK, getAjanlatStatusConfig } from "../modules/ajanla tok/ajanlat.schema";
import { loadAjanlatok, updateAjanlat, deleteAjanlat } from "../modules/ajanla tok/ajanlat.service";
import { printAjanlat } from "../modules/ajanla tok/ajanlatPrint";
import AjanlatEditor from "../modules/ajanla tok/AjanlatEditor";
import ProjektForm from "../modules/projektek/ProjektForm";

function StatusBadge({ status }) {
  const cfg = getAjanlatStatusConfig(status);
  return (
    <span style={{ background: cfg.bg, color: cfg.szin, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", border: `1px solid ${cfg.szin}30` }}>
      {status}
    </span>
  );
}

function StatusPicker({ current, onSelect }) {
  return (
    <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.12)", padding: 8, display: "flex", flexDirection: "column", gap: 2, minWidth: 170, zIndex: 100 }}>
      {AJANLAT_STATUSZOK.map(s => (
        <button key={s.id} onClick={() => onSelect(s.id)}
          style={{ padding: "7px 12px", borderRadius: 7, border: "none", background: s.id === current ? s.bg : "transparent", color: s.id === current ? s.szin : C.textSub, fontWeight: s.id === current ? 700 : 500, fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: FONT }}>
          {s.id}
        </button>
      ))}
    </div>
  );
}

export default function ArajanlaltokPage({ currentUser }) {
  const [ajanlatok, setAjanlatok]               = useState(() => loadAjanlatok());
  const [editor, setEditor]                      = useState(null); // null=list, obj=edit (null={} for new)
  const [showProjektModal, setShowProjektModal]  = useState(false);
  const [ajanlatForProject, setAjanlatForProject] = useState(null);
  const [filterStatus, setFilterStatus]          = useState("Összes");
  const [search, setSearch]                      = useState("");
  const [statusPicker, setStatusPicker]          = useState(null);

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

  const filtered = useMemo(() => ajanlatok
    .filter(a => filterStatus === "Összes" || a.status === filterStatus)
    .filter(a => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (a.ajanlatkod || "").toLowerCase().includes(q) ||
             (a.clientNev  || "").toLowerCase().includes(q) ||
             (a.nev        || "").toLowerCase().includes(q);
    })
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
  [ajanlatok, filterStatus, search]);

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

  // ── Editor nézet ────────────────────────────────────────────────────────────
  if (editor !== null) {
    return (
      <AjanlatEditor
        ajanlat={editor?.id ? editor : undefined}
        onBack={() => setEditor(null)}
        onSaved={() => { setAjanlatok(loadAjanlatok()); setEditor(null); }}
        currentUser={currentUser}
      />
    );
  }

  // ── Lista nézet ─────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px max(16px, min(28px, 3vw))", fontFamily: FONT, background: C.bg, minHeight: "100vh" }}>

      {/* Fejléc */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 24, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>Árajánlatok</h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>3-szintű kalkulátor · ügyfél csak összesítést lát</p>
        </div>
        {isAdmin && (
          <button onClick={() => setEditor({})}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT, boxShadow: `0 4px 14px rgba(24,172,160,.3)` }}>
            <Plus size={16} /> Új ajánlat
          </button>
        )}
      </div>

      {/* Stat kártyák */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {[
          { label: "Kiküldve",   db: stats.kikuld.db,   osszeg: stats.kikuld.osszeg,   color: "#D97706", bg: "#FFFBEB" },
          { label: "Elfogadva",  db: stats.elfogad.db,  osszeg: stats.elfogad.osszeg,  color: "#059669", bg: "#ECFDF5" },
          { label: "Elutasítva", db: stats.elutasit.db, osszeg: stats.elutasit.osszeg, color: C.danger,  bg: C.dangerLight },
          { label: "Összes",     db: stats.osszes,      osszeg: 0,                     color: C.accent,  bg: C.accentLight },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: "14px 18px", border: `1px solid ${c.color}30`, flex: 1, minWidth: 140 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: c.color, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 4px" }}>{c.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 2px" }}>{c.db} db</p>
            {c.osszeg > 0 && <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{ft(c.osszeg)}</p>}
          </div>
        ))}
      </div>

      {/* Szűrők + keresés */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Összes", ...AJANLAT_STATUSZOK.map(s => s.id)].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT,
                background: filterStatus === s ? C.accent : "#fff",
                color:      filterStatus === s ? "#fff"   : C.muted,
                border:    `1.5px solid ${filterStatus === s ? C.accent : C.border}`,
              }}>
              {s}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 9, padding: "6px 12px", minWidth: 200, maxWidth: 300 }}>
          <Search size={15} color={C.muted} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kód, ügyfél, megnevezés…"
            style={{ border: "none", outline: "none", fontSize: 13, fontFamily: FONT, background: "transparent", flex: 1 }} />
          {search && <button onClick={() => setSearch("")} style={{ border: "none", background: "none", cursor: "pointer", color: C.muted, padding: 0 }}><X size={14} /></button>}
        </div>
      </div>

      {/* Táblázat */}
      <div style={{ background: "#fff", borderRadius: 14, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `2px solid ${C.border}` }}>
                {["Ajánlatkód", "Ügyfél", "Megnevezés", "Nettó összeg", "Státusz", "Érvényesség", "Projekt", ""].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: "48px", textAlign: "center", color: C.muted }}>
                  <div><FileText size={32} style={{ marginBottom: 10, opacity: 0.3 }} /></div>
                  <p style={{ margin: 0, fontWeight: 600 }}>Nincsenek ajánlatok</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12 }}>Kattints az "+ Új ajánlat" gombra az első létrehozásához</p>
                </td></tr>
              )}
              {filtered.map((a, i) => {
                const linkedProjekt = a.projektId ? projektek.find(p => p.id === a.projektId) : null;
                const cfg = getAjanlatStatusConfig(a.status);
                return (
                  <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : "#FAFAF9" }}>
                    <td style={{ padding: "12px 14px" }}>
                      <button onClick={() => setEditor(a)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
                        <p style={{ fontWeight: 700, color: C.accent, margin: 0, fontSize: 13 }}>{a.ajanlatkod}</p>
                        <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>{a.createdAt}</p>
                      </button>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <p style={{ fontWeight: 600, color: C.text, margin: 0 }}>{a.clientNev || "—"}</p>
                      {a.clientTel && <p style={{ fontSize: 11, color: C.muted, margin: 0 }}>{a.clientTel}</p>}
                    </td>
                    <td style={{ padding: "12px 14px", color: C.textSub, maxWidth: 200 }}>
                      <p style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nev || "—"}</p>
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: a.osszeg ? C.text : C.muted, whiteSpace: "nowrap" }}>
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
                    <td style={{ padding: "12px 14px", color: C.muted, fontSize: 12 }}>{a.ervenyesseg || "—"}</td>
                    <td style={{ padding: "12px 14px" }}>
                      {linkedProjekt ? (
                        <span style={{ background: C.successLight, color: C.success, border: `1px solid ${C.success}40`, borderRadius: 8, padding: "3px 8px", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle size={11} /> {linkedProjekt.projektkod}
                        </span>
                      ) : a.status === "Elfogadva" && isAdmin ? (
                        <button onClick={() => handleProjektLetrehoz(a)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", background: C.accentLight, color: C.accent, border: `1.5px solid ${C.accent}40`, borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 11, fontFamily: FONT, whiteSpace: "nowrap" }}>
                          <ArrowRight size={12} /> Projekt létrehozása
                        </button>
                      ) : <span style={{ color: C.muted, fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: "12px 14px" }} onClick={e => e.stopPropagation()}>
                      {isAdmin && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => printAjanlat(a)}
                            style={{ padding: "5px 8px", background: C.accentLight, border: "none", borderRadius: 7, cursor: "pointer", color: C.accent }} title="PDF nyomtatás">
                            <Printer size={14} />
                          </button>
                          <button onClick={() => setEditor(a)}
                            style={{ padding: "5px 8px", background: "#F1F5F9", border: "none", borderRadius: 7, cursor: "pointer", color: C.textSub }} title="Szerkesztés">
                            ✏
                          </button>
                          <button onClick={() => handleDelete(a)}
                            style={{ padding: "5px 8px", background: C.dangerLight, border: "none", borderRadius: 7, cursor: "pointer", color: C.danger }} title="Törlés">
                            🗑
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
        <div style={{ padding: "10px 16px", borderTop: `1px solid ${C.border}`, background: C.bg }}>
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{filtered.length} ajánlat</p>
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
