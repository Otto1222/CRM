import { useState } from "react";
import { Plus, ExternalLink, FilePlus, Users, ChevronDown, X, Save } from "lucide-react";
import { C, FONT } from "../../../lib/constants.js";
import { linkMunkalap, unlinkMunkalap } from "../projekt.service.js";
import { updateWorkorder } from "../../../services/workorder.service.js";
import { getAktivCsapatok } from "../../csapatok/csapat.service.js";
import { CSAPAT_KIOSZTASI_TIPUSOK } from "../../csapatok/csapat.schema.js";

// ─── Csapat Kiosztás Panel (PM/Admin kezeli) ─────────────────

function CsapatKiosztasPanel({ munkalap }) {
  const csapatok   = getAktivCsapatok();
  const [kiosztasok, setKiosztasok] = useState(munkalap.csapatKiosztasok || []);
  const [mentve, setMentve] = useState(false);

  const [ujCsapatId, setUjCsapatId] = useState("");
  const [ujTipus,    setUjTipus]    = useState("focsapat");
  const [ujDatumTol, setUjDatumTol] = useState("");
  const [ujDatumIg,  setUjDatumIg]  = useState("");
  const [ujMegjegyzes, setUjMegjegyzes] = useState("");

  function handleAdd() {
    if (!ujCsapatId) return;
    const cs = csapatok.find(c => c.id === ujCsapatId);
    const uj = {
      id:         `kio_${Date.now()}`,
      csapatId:   ujCsapatId,
      csapatNev:  cs?.nev || "",
      csapatSzin: cs?.szin || "#2563EB",
      tipus:      ujTipus,
      datumTol:   ujDatumTol,
      datumIg:    ujDatumIg,
      megjegyzes: ujMegjegyzes,
    };
    const updated = [...kiosztasok, uj];
    setKiosztasok(updated);
    setUjCsapatId(""); setUjTipus("focsapat");
    setUjDatumTol(""); setUjDatumIg(""); setUjMegjegyzes("");
  }

  function handleRemove(id) {
    setKiosztasok(kiosztasok.filter(k => k.id !== id));
  }

  function handleSave() {
    updateWorkorder(munkalap.id, { csapatKiosztasok: kiosztasok });
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "munkalapok" } }));
    setMentve(true);
    setTimeout(() => setMentve(false), 2000);
  }

  const inpS = {
    padding: "7px 10px", border: "1.5px solid #E2E8F0", borderRadius: 8,
    fontSize: 12, fontFamily: FONT, outline: "none", background: "#fff",
  };

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #F1F5F9" }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: .7, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 5 }}>
        <Users size={12} /> Kiosztott csapatok ({kiosztasok.length} db)
      </p>

      {/* Meglévő kiosztások */}
      {kiosztasok.map(k => (
        <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderLeft: `3px solid ${k.csapatSzin || "#2563EB"}`, borderRadius: 8, marginBottom: 5 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>{k.csapatNev || k.csapatId}</span>
              <span style={{ fontSize: 10, fontWeight: 700, background: k.tipus === "focsapat" ? "#EFF6FF" : "#F0FDF4", color: k.tipus === "focsapat" ? "#1D4ED8" : "#059669", padding: "1px 7px", borderRadius: 20 }}>
                {k.tipus === "focsapat" ? "Főcsapat" : "Segítő csapat"}
              </span>
              {k.datumTol && (
                <span style={{ fontSize: 10, color: "#64748B" }}>{k.datumTol}{k.datumIg ? ` – ${k.datumIg}` : ""}</span>
              )}
            </div>
            {k.megjegyzes && <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>{k.megjegyzes}</p>}
          </div>
          <button onClick={() => handleRemove(k.id)} style={{ padding: "3px 5px", background: "#FEF2F2", color: "#DC2626", border: "none", borderRadius: 5, cursor: "pointer" }}>
            <X size={11} />
          </button>
        </div>
      ))}

      {/* Új kiosztás form */}
      <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: "10px 12px", marginTop: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#065F46", margin: "0 0 8px" }}>Új csapat kiosztása</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
          <select value={ujCsapatId} onChange={e => setUjCsapatId(e.target.value)} style={{ ...inpS, gridColumn: "span 2" }}>
            <option value="">— Válassz csapatot —</option>
            {csapatok.map(cs => (
              <option key={cs.id} value={cs.id}>{cs.nev} {cs.tipus === "alvallalkozo" ? "(AV)" : "(Saját)"}</option>
            ))}
          </select>
          <select value={ujTipus} onChange={e => setUjTipus(e.target.value)} style={inpS}>
            {CSAPAT_KIOSZTASI_TIPUSOK.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <input type="date" value={ujDatumTol} onChange={e => setUjDatumTol(e.target.value)}
            placeholder="Dátumtól" style={inpS} title="Kezdő dátum" />
          <input type="date" value={ujDatumIg} onChange={e => setUjDatumIg(e.target.value)}
            placeholder="Dátumig" style={inpS} title="Befejező dátum" />
          <input value={ujMegjegyzes} onChange={e => setUjMegjegyzes(e.target.value)}
            placeholder="Megjegyzés (opcionális)" style={{ ...inpS, gridColumn: "span 2" }} />
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button onClick={handleAdd} disabled={!ujCsapatId}
            style={{ flex: 1, padding: "7px 12px", background: ujCsapatId ? "#059669" : "#E2E8F0", color: "#fff", border: "none", borderRadius: 7, cursor: ujCsapatId ? "pointer" : "default", fontWeight: 700, fontSize: 12, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Plus size={11} /> Hozzáadás
          </button>
          <button onClick={handleSave}
            style={{ flex: 1, padding: "7px 12px", background: mentve ? "#059669" : "#2563EB", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Save size={11} /> {mentve ? "Mentve ✓" : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fő komponens ─────────────────────────────────────────────

export default function TabMunkalapok({ projekt, munkalapok, onNavigate, onNewMunkalap }) {
  const linked = (munkalapok || []).filter(
    (m) => m.projektId === projekt.id || projekt.munkalapIds?.includes(m.id)
  );

  const unlinked = (munkalapok || []).filter(
    (m) => !m.projektId && !projekt.munkalapIds?.includes(m.id)
  );

  const [showLink, setShowLink] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const osszesMunkalapok = [...linked, ...unlinked];
  const getMunkalapAzonosito = (m) => {
    const dsz = m.dokumentumszam || m.munkalapSzam || "";
    if (/^E\.D\.I\.\d+\/\d+/.test(dsz)) return dsz;
    if (projekt?.projektkod) {
      const projektMls = osszesMunkalapok
        .filter(x => x.projektId === projekt.id)
        .sort((a, b) => new Date(a.createdAt||0) - new Date(b.createdAt||0));
      const sorsz = Math.max(1, projektMls.findIndex(x => x.id === m.id) + 1 || 1);
      const alap = `${projekt.projektkod}/${String(sorsz).padStart(3,"0")}`;
      const kulso = m.fovallalkoiAzonosito?.trim() || "";
      return kulso ? `${alap} / ${kulso}` : alap;
    }
    const regi = m.ediSorszam || m.ugyszam || dsz;
    if (regi && /^E\.D\.I\./.test(regi)) return regi;
    return dsz || "Nincs munkalapszám";
  };

  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>
          Kapcsolódó munkalapok ({linked.length} db)
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {onNewMunkalap && (
            <button onClick={onNewMunkalap}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "#059669", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT }}>
              <FilePlus size={14} /> Új munkalap
            </button>
          )}
          <button onClick={() => setShowLink(s => !s)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: showLink ? "#F1F5F9" : "#fff", color: "#2563EB", border: "1.5px solid #2563EB", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT }}>
            <Plus size={14} /> Meglévő hozzárendelése
          </button>
        </div>
      </div>

      {showLink && unlinked.length > 0 && (
        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#64748B", marginBottom: 10 }}>Szabad munkalapok (kattints a hozzárendeléshez):</p>
          {unlinked.slice(0, 20).map((m) => (
            <div key={m.id} onClick={() => { linkMunkalap(projekt.id, m.id); setShowLink(false); }}
              style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "#fff", border: "1px solid #E2E8F0", marginBottom: 6, cursor: "pointer" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{getMunkalapAzonosito(m)}</span>
              <span style={{ fontSize: 12, color: "#64748B" }}>{m.clientNev || "—"} · {m.status}</span>
            </div>
          ))}
        </div>
      )}

      {linked.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#94A3B8" }}>
          <p>Még nincs hozzárendelt munkalap</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {linked.map((m) => {
            const kiosztasDb = (m.csapatKiosztasok || []).length;
            const isExpanded = expandedId === m.id;
            return (
              <div key={m.id} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: "#2563EB", fontSize: 13 }}>{getMunkalapAzonosito(m)}</span>
                      <span style={{ fontSize: 11, background: "#F1F5F9", color: "#64748B", padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{m.status}</span>
                      {m.munkalapTipus && <span style={{ fontSize: 11, color: "#94A3B8" }}>{m.munkalapTipus}</span>}
                      {kiosztasDb > 0 && (
                        <span style={{ fontSize: 11, background: "#EFF6FF", color: "#1D4ED8", padding: "2px 8px", borderRadius: 20, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                          <Users size={10} /> {kiosztasDb} csapat
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "#64748B", margin: "4px 0 0" }}>
                      {m.clientNev || "—"} · {m.assigneeNev || "—"} · {m.date || m.datum || "—"}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setExpandedId(isExpanded ? null : m.id)}
                      title="Csapatok kiosztása"
                      style={{ padding: "6px 10px", background: isExpanded ? "#EFF6FF" : "#F8FAFC", color: isExpanded ? "#2563EB" : "#64748B", border: "1.5px solid #E2E8F0", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontFamily: FONT }}>
                      <Users size={13} />
                      Csapatok
                      <ChevronDown size={11} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                    </button>
                    {onNavigate && (
                      <button onClick={() => onNavigate(m)}
                        style={{ padding: "6px 10px", background: "#EFF6FF", color: "#2563EB", border: "none", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                        <ExternalLink size={13} /> Megnyit
                      </button>
                    )}
                    <button onClick={() => unlinkMunkalap(projekt.id, m.id)}
                      style={{ padding: "6px 10px", background: "#FEF2F2", color: "#DC2626", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>
                      Leválaszt
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: "0 16px 14px", borderTop: "1px solid #F1F5F9" }}>
                    <CsapatKiosztasPanel munkalap={m} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
