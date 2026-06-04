import { useState, useMemo, useEffect } from "react";
import { BarChart3, TrendingUp, Sun, ChevronDown, ChevronRight, Users, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { loadLocal } from "../lib/localDb";
import { loadFovallalkozok } from "../modules/fovallalkozok/fovallalkozo.service";
import { loadCsapatok } from "../modules/csapatok/csapat.service";
import { calcEsmentProjektPenzugy } from "../services/workOrderFinancial.service";

// ─── Segédfüggvények ─────────────────────────────────────────

function fmtFt(n) {
  if (n === undefined || n === null) return "–";
  return new Intl.NumberFormat("hu-HU").format(Math.round(n)) + " Ft";
}
function fmtSzam(n) {
  if (!n && n !== 0) return "–";
  return new Intl.NumberFormat("hu-HU").format(n);
}
function marginColor(pct) {
  if (pct === null || pct === undefined) return C.muted;
  if (pct >= 20) return C.success;
  if (pct >= 10) return C.warning;
  return C.danger;
}

// ─── KPI kártya ───────────────────────────────────────────────

function KpiCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10, background: color + "18",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text, fontFamily: FONT_HEADING }}>
          {value}
        </div>
      </div>
    </div>
  );
}

// ─── Fővállalkozó elszámolás tab ──────────────────────────────

const FV_COLS = "40px 1fr 70px 80px 130px 130px 130px 90px";
const FV_DETAIL_COLS = "40px 1fr 130px 80px 90px 130px 130px 90px";

function FvRiportTab({ data, expanded, onToggle }) {
  if (data.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: C.muted, fontSize: 14 }}>
        Nincs adat a kiválasztott időszakra.
      </div>
    );
  }

  return (
    <div>
      {/* Fejléc */}
      <div style={{
        display: "grid", gridTemplateColumns: FV_COLS, gap: 0,
        padding: "10px 16px", borderBottom: `1px solid ${C.border}`, background: C.bg,
      }}>
        {["", "Fővállalkozó", "Proj.", "Panel db", "Nettó bevétel", "Összes ktg.", "Haszon", "Margin"].map((h, i) => (
          <div key={i} style={{
            fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase",
            letterSpacing: 0.7, textAlign: i >= 4 ? "right" : "left",
          }}>{h}</div>
        ))}
      </div>

      {data.map(fv => {
        const isOpen = expanded === fv.fvId;
        const avgMargin = fv.osszBevitel > 0
          ? Math.round((fv.osszHaszon / fv.osszBevitel) * 100) : null;

        return (
          <div key={fv.fvId} style={{ borderBottom: `1px solid ${C.border}` }}>
            {/* Fővállalkozó összesítő sor */}
            <div
              onClick={() => onToggle(isOpen ? null : fv.fvId)}
              style={{
                display: "grid", gridTemplateColumns: FV_COLS, gap: 0,
                padding: "12px 16px", cursor: "pointer", alignItems: "center",
                background: isOpen ? C.accentLight : "#fff",
                transition: "background .12s",
              }}
              onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = C.bg; }}
              onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "#fff"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
              <div style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{fv.nev}</div>
              <div style={{ color: C.textSub, fontSize: 13 }}>{fv.projektek.length}</div>
              <div style={{ color: C.textSub, fontSize: 13 }}>{fmtSzam(fv.osszPanel)}</div>
              <div style={{ textAlign: "right", fontWeight: 700, color: C.text, fontSize: 13 }}>{fmtFt(fv.osszBevitel)}</div>
              <div style={{ textAlign: "right", color: C.textSub, fontSize: 13 }}>{fmtFt(fv.osszKolts)}</div>
              <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13, color: fv.osszHaszon >= 0 ? C.success : C.danger }}>
                {fmtFt(fv.osszHaszon)}
              </div>
              <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13, color: marginColor(avgMargin) }}>
                {avgMargin !== null ? avgMargin + "%" : "–"}
              </div>
            </div>

            {/* Projekt részletek */}
            {isOpen && (
              <div style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}>
                {/* Al-fejléc */}
                <div style={{
                  display: "grid", gridTemplateColumns: FV_DETAIL_COLS, gap: 0,
                  padding: "8px 16px 6px", borderBottom: `1px solid ${C.border}`,
                }}>
                  {["", "Projekt", "Státusz", "Panel", "Km (o-v)", "Nettó bev.", "Haszon", "Margin"].map((h, i) => (
                    <div key={i} style={{
                      fontSize: 10, fontWeight: 700, color: C.muted,
                      textTransform: "uppercase", letterSpacing: 0.5,
                      textAlign: i >= 4 ? "right" : "left",
                    }}>{h}</div>
                  ))}
                </div>

                {fv.projektek.map(({ projekt: p, kalk }) => (
                  <div
                    key={p.id}
                    style={{
                      display: "grid", gridTemplateColumns: FV_DETAIL_COLS, gap: 0,
                      padding: "9px 16px", borderBottom: "1px solid #F1F5F9", alignItems: "center",
                    }}
                  >
                    <div />
                    <div>
                      <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>
                        {p.projektkod || p.nev || p.id}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>{p.clientNev || ""}</div>
                    </div>
                    <div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 7px",
                        borderRadius: 5, background: C.bg, color: C.textSub,
                      }}>
                        {p.status || "–"}
                      </span>
                    </div>
                    <div style={{ color: C.textSub, fontSize: 13 }}>
                      {p.penzugy?.darabszam || p.napelemDb || "–"}
                    </div>
                    <div style={{ textAlign: "right", color: C.textSub, fontSize: 13 }}>
                      {p.penzugy?.tavKm ? (Number(p.penzugy.tavKm) * 2) + " km" : "–"}
                    </div>
                    <div style={{ textAlign: "right", fontWeight: 600, color: C.text, fontSize: 13 }}>
                      {fmtFt(kalk.nettoBevitel)}
                    </div>
                    <div style={{
                      textAlign: "right", fontWeight: 700, fontSize: 13,
                      color: (kalk.haszon || 0) >= 0 ? C.success : C.danger,
                    }}>
                      {fmtFt(kalk.haszon)}
                    </div>
                    <div style={{
                      textAlign: "right", fontWeight: 700, fontSize: 13,
                      color: marginColor(kalk.haszonPct),
                    }}>
                      {kalk.haszonPct !== null && kalk.haszonPct !== undefined ? kalk.haszonPct + "%" : "–"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Csapat teljesítmény tab ──────────────────────────────────

const CS_COLS = "40px 1fr 90px 100px 80px 90px 130px";
const CS_DETAIL_COLS = "40px 1fr 130px 80px 90px 130px";

function CsapatRiportTab({ data, expanded, onToggle }) {
  if (data.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: C.muted, fontSize: 14 }}>
        Nincs csapat adat.
      </div>
    );
  }

  return (
    <div>
      {/* Fejléc */}
      <div style={{
        display: "grid", gridTemplateColumns: CS_COLS, gap: 0,
        padding: "10px 16px", borderBottom: `1px solid ${C.border}`, background: C.bg,
      }}>
        {["", "Csapat", "Összes proj.", "Befejezett", "Aktív", "Panel db", "Csapatbér"].map((h, i) => (
          <div key={i} style={{
            fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase",
            letterSpacing: 0.7, textAlign: i >= 5 ? "right" : "left",
          }}>{h}</div>
        ))}
      </div>

      {data.map(cs => {
        const isOpen = expanded === cs.csId;
        return (
          <div key={cs.csId} style={{ borderBottom: `1px solid ${C.border}` }}>
            <div
              onClick={() => onToggle(isOpen ? null : cs.csId)}
              style={{
                display: "grid", gridTemplateColumns: CS_COLS, gap: 0,
                padding: "12px 16px", cursor: "pointer", alignItems: "center",
                background: isOpen ? C.accentLight : "#fff",
                transition: "background .12s",
              }}
              onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = C.bg; }}
              onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = "#fff"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: C.muted }}>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: cs.szin || C.muted, flexShrink: 0,
                }} />
                <span style={{ fontWeight: 700, color: C.text, fontSize: 14 }}>{cs.nev}</span>
              </div>
              <div style={{ color: C.textSub, fontSize: 13 }}>{cs.projektek.length}</div>
              <div style={{ fontWeight: 600, color: C.success, fontSize: 13 }}>{cs.befejezett}</div>
              <div style={{ color: cs.aktiv > 0 ? C.accent : C.muted, fontWeight: cs.aktiv > 0 ? 600 : 400, fontSize: 13 }}>
                {cs.aktiv}
              </div>
              <div style={{ color: C.textSub, fontSize: 13 }}>{fmtSzam(cs.osszPanel)}</div>
              <div style={{ textAlign: "right", fontWeight: 600, color: C.text, fontSize: 13 }}>
                {fmtFt(cs.osszCsapatBer)}
              </div>
            </div>

            {/* Projekt részletek */}
            {isOpen && (
              <div style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}>
                <div style={{
                  display: "grid", gridTemplateColumns: CS_DETAIL_COLS, gap: 0,
                  padding: "8px 16px 6px", borderBottom: `1px solid ${C.border}`,
                }}>
                  {["", "Projekt", "Státusz", "Panel", "Km (o-v)", "Csapatbér"].map((h, i) => (
                    <div key={i} style={{
                      fontSize: 10, fontWeight: 700, color: C.muted,
                      textTransform: "uppercase", letterSpacing: 0.5,
                      textAlign: i >= 4 ? "right" : "left",
                    }}>{h}</div>
                  ))}
                </div>

                {cs.projektek.map(({ projekt: p, kalk }) => (
                  <div
                    key={p.id}
                    style={{
                      display: "grid", gridTemplateColumns: CS_DETAIL_COLS, gap: 0,
                      padding: "9px 16px", borderBottom: "1px solid #F1F5F9", alignItems: "center",
                    }}
                  >
                    <div />
                    <div>
                      <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>
                        {p.projektkod || p.nev || p.id}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted }}>{p.clientNev || ""}</div>
                    </div>
                    <div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 7px",
                        borderRadius: 5, background: C.bg, color: C.textSub,
                      }}>
                        {p.status || "–"}
                      </span>
                    </div>
                    <div style={{ color: C.textSub, fontSize: 13 }}>
                      {p.penzugy?.darabszam || p.napelemDb || "–"}
                    </div>
                    <div style={{ textAlign: "right", color: C.textSub, fontSize: 13 }}>
                      {p.penzugy?.tavKm ? (Number(p.penzugy.tavKm) * 2) + " km" : "–"}
                    </div>
                    <div style={{ textAlign: "right", fontWeight: 600, color: C.text, fontSize: 13 }}>
                      {fmtFt(kalk.csapatBer)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Havi bontás tab ──────────────────────────────────────────

function HaviBontasTab({ data }) {
  if (data.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: C.muted, fontSize: 14 }}>
        Nincs adat a kiválasztott időszakra.
      </div>
    );
  }

  const chartData = data.map(d => ({
    name: d.honap.replace("-", ". ") + ".",
    "Nettó bevétel (eFt)": Math.round(d.bevitel / 1000),
    "Haszon (eFt)":        Math.round(d.haszon  / 1000),
  }));

  return (
    <div style={{ padding: "24px 16px" }}>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.muted }} />
          <YAxis tick={{ fontSize: 11, fill: C.muted }} tickFormatter={v => v + " e"} />
          <Tooltip
            formatter={(v, name) => [new Intl.NumberFormat("hu-HU").format(v) + " eFt", name]}
            contentStyle={{ fontFamily: "system-ui, sans-serif", fontSize: 13, borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          <Bar dataKey="Nettó bevétel (eFt)" fill={C.accent} radius={[4, 4, 0, 0]} />
          <Bar dataKey="Haszon (eFt)"        fill={C.success} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div style={{ marginTop: 20, borderRadius: 10, overflow: "hidden", border: "1px solid #E2E8F0" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 140px 140px 80px", gap: 0,
          padding: "10px 16px", background: C.bg, borderBottom: "1px solid #E2E8F0",
        }}>
          {["Hónap", "Nettó bevétel", "Haszon", "Projektek"].map((h, i) => (
            <div key={i} style={{
              fontSize: 11, fontWeight: 700, color: C.muted,
              textTransform: "uppercase", letterSpacing: 0.7,
              textAlign: i >= 1 ? "right" : "left",
            }}>{h}</div>
          ))}
        </div>
        {data.map(d => (
          <div key={d.honap} style={{
            display: "grid", gridTemplateColumns: "1fr 140px 140px 80px", gap: 0,
            padding: "10px 16px", borderBottom: "1px solid #F1F5F9", alignItems: "center",
          }}>
            <div style={{ fontWeight: 600, color: C.text, fontSize: 13 }}>{d.honap}</div>
            <div style={{ textAlign: "right", fontWeight: 600, color: C.text, fontSize: 13 }}>
              {fmtFt(d.bevitel)}
            </div>
            <div style={{
              textAlign: "right", fontWeight: 700, fontSize: 13,
              color: d.haszon >= 0 ? C.success : C.danger,
            }}>
              {fmtFt(d.haszon)}
            </div>
            <div style={{ textAlign: "right", color: C.muted, fontSize: 13 }}>{d.projektek}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Főoldal ──────────────────────────────────────────────────

export default function RiportokPage() {
  const [activeTab, setActiveTab]   = useState("fovallalkozo");
  const [evSzuro, setEvSzuro]       = useState(String(new Date().getFullYear()));
  const [expandedFv, setExpandedFv] = useState(null);
  const [expandedCs, setExpandedCs] = useState(null);
  const [expandedHavi, setExpandedHavi] = useState(null);

  const [projektek,     setProjektek]     = useState(() => loadLocal("projektek")    || []);
  const [fovallalkozok, setFovallalkozok] = useState(() => loadFovallalkozok());
  const [csapatok,      setCsapatok]      = useState(() => loadCsapatok());

  // Reaktív frissítés: ha más modulban változik valami, a riport is frissüljön
  useEffect(() => {
    function refresh(e) {
      const col = e?.detail?.collection;
      if (!col || col === "projektek")      setProjektek(loadLocal("projektek") || []);
      if (!col || col === "fovallalkozok")  setFovallalkozok(loadFovallalkozok());
      if (!col || col === "csapatok")       setCsapatok(loadCsapatok());
    }
    window.addEventListener("crm-db-updated", refresh);
    return () => window.removeEventListener("crm-db-updated", refresh);
  }, []);

  // Év-alapú szűrés (createdAt vagy tervezettKezdes első 4 karaktere)
  const szurtProjektek = useMemo(() => {
    if (evSzuro === "mind") return projektek;
    return projektek.filter(p => {
      const ev = (p.createdAt || p.tervezettKezdes || "").slice(0, 4);
      return ev === evSzuro;
    });
  }, [projektek, evSzuro]);

  // Pénzügyi kalkuláció minden projektre (memoizált)
  const URES_KALK = { nettoBevitel: 0, osszesKolts: 0, haszon: 0, csapatBer: 0, haszonPct: null };
  const projektKalkData = useMemo(() =>
    szurtProjektek.map(p => ({ projekt: p, kalk: calcEsmentProjektPenzugy(p) || URES_KALK })),
    [szurtProjektek]
  );

  // Fővállalkozó összesítők
  const fvRiport = useMemo(() => {
    const groups = {};
    projektKalkData.forEach(({ projekt: p, kalk }) => {
      const fvId = p.penzugy?.fovallalkoziId || "_nincs";
      if (!groups[fvId]) {
        const fv = fovallalkozok.find(f => f.id === fvId);
        groups[fvId] = {
          fvId,
          nev: fv?.nev || (fvId === "_nincs" ? "Nincs beállítva" : fvId),
          projektek: [],
          osszPanel: 0, osszKm: 0,
          osszBevitel: 0, osszKolts: 0, osszHaszon: 0,
        };
      }
      const g = groups[fvId];
      g.projektek.push({ projekt: p, kalk });
      g.osszPanel   += Number(p.penzugy?.darabszam || p.napelemDb || 0);
      g.osszKm      += Number(p.penzugy?.tavKm || 0) * 2;
      g.osszBevitel += kalk.nettoBevitel || 0;
      g.osszKolts   += kalk.osszesKolts  || 0;
      g.osszHaszon  += kalk.haszon       || 0;
    });
    return Object.values(groups).sort((a, b) => b.osszBevitel - a.osszBevitel);
  }, [projektKalkData, fovallalkozok]);

  // Csapat összesítők
  const csapatRiport = useMemo(() => {
    const groups = {};
    projektKalkData.forEach(({ projekt: p, kalk }) => {
      const csId = p.csapatId || "_nincs";
      if (!groups[csId]) {
        const cs = csapatok.find(c => c.id === csId);
        groups[csId] = {
          csId,
          nev: cs?.nev || (csId === "_nincs" ? "Nincs hozzárendelve" : csId),
          szin: cs?.szin || C.muted,
          projektek: [], befejezett: 0, aktiv: 0,
          osszPanel: 0, osszKm: 0, osszCsapatBer: 0,
        };
      }
      const g = groups[csId];
      g.projektek.push({ projekt: p, kalk });
      const lezart = ["Lezárva", "Kifizetve", "Leszámlázva", "Elkészült"].includes(p.status);
      if (lezart) g.befejezett++; else g.aktiv++;
      g.osszPanel     += Number(p.penzugy?.darabszam || p.napelemDb || 0);
      g.osszKm        += Number(p.penzugy?.tavKm || 0) * 2;
      g.osszCsapatBer += kalk.csapatBer || 0;
    });
    return Object.values(groups).sort((a, b) => b.projektek.length - a.projektek.length);
  }, [projektKalkData, csapatok]);

  // KPI összesítők (felső kártyák)
  const kpi = useMemo(() => ({
    projektek: projektKalkData.length,
    bevitel:   projektKalkData.reduce((s, { kalk }) => s + (kalk.nettoBevitel || 0), 0),
    haszon:    projektKalkData.reduce((s, { kalk }) => s + (kalk.haszon || 0), 0),
    panel:     projektKalkData.reduce((s, { projekt: p }) =>
                 s + Number(p.penzugy?.darabszam || p.napelemDb || 0), 0),
  }), [projektKalkData]);

  // Havi bontás (létrehozás dátuma szerint)
  const haviBontas = useMemo(() => {
    const map = {};
    projektKalkData.forEach(({ projekt: p, kalk }) => {
      const honap = (p.createdAt || p.tervezettKezdes || "").slice(0, 7);
      if (!honap) return;
      if (!map[honap]) map[honap] = { honap, bevitel: 0, haszon: 0, projektek: 0 };
      map[honap].bevitel  += kalk.nettoBevitel || 0;
      map[honap].haszon   += kalk.haszon       || 0;
      map[honap].projektek++;
    });
    return Object.values(map).sort((a, b) => a.honap.localeCompare(b.honap));
  }, [projektKalkData]);

  // CSV export az aktív tabhoz
  function exportCsv() {
    let rows = [];
    let filename = "riport.csv";
    if (activeTab === "fovallalkozo") {
      rows = [
        ["Fővállalkozó", "Projektek", "Panel db", "Nettó bevétel (Ft)", "Összes ktg. (Ft)", "Haszon (Ft)", "Margin (%)"],
        ...fvRiport.map(fv => {
          const m = fv.osszBevitel > 0 ? Math.round((fv.osszHaszon / fv.osszBevitel) * 100) : "";
          return [fv.nev, fv.projektek.length, fv.osszPanel, Math.round(fv.osszBevitel), Math.round(fv.osszKolts), Math.round(fv.osszHaszon), m];
        }),
      ];
      filename = `fovallalkozo_elszamolas_${evSzuro}.csv`;
    } else if (activeTab === "csapat") {
      rows = [
        ["Csapat", "Összes proj.", "Befejezett", "Aktív", "Panel db", "Csapatbér (Ft)"],
        ...csapatRiport.map(cs => [cs.nev, cs.projektek.length, cs.befejezett, cs.aktiv, cs.osszPanel, Math.round(cs.osszCsapatBer)]),
      ];
      filename = `csapat_teljesitmeny_${evSzuro}.csv`;
    } else {
      rows = [
        ["Hónap", "Nettó bevétel (Ft)", "Haszon (Ft)", "Projektek"],
        ...haviBontas.map(h => [h.honap, Math.round(h.bevitel), Math.round(h.haszon), h.projektek]),
      ];
      filename = `havi_bontas_${evSzuro}.csv`;
    }
    const bom = "﻿";
    const csv = bom + rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  // Elérhető évek az adatokból
  const evOptions = useMemo(() => {
    const evek = new Set(
      projektek.map(p => (p.createdAt || p.tervezettKezdes || "").slice(0, 4)).filter(Boolean)
    );
    return ["mind", ...Array.from(evek).sort().reverse()];
  }, [projektek]);

  const avgMarginTotal = kpi.bevitel > 0
    ? Math.round((kpi.haszon / kpi.bevitel) * 100) : null;

  function tabStyle(id) {
    const active = activeTab === id;
    return {
      padding: "10px 22px",
      border: "none",
      background: active ? "#fff" : "transparent",
      color: active ? C.accent : C.textSub,
      fontWeight: active ? 700 : 400,
      fontSize: 14,
      fontFamily: FONT,
      cursor: "pointer",
      borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent",
      transition: "color .15s",
    };
  }

  return (
    <div style={{ padding: "24px 28px", fontFamily: FONT, maxWidth: 1200 }}>

      {/* Fejléc + időszak szűrő */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>
            Riportok &amp; Kimutatások
          </h1>
          <p style={{ color: C.muted, fontSize: 13, marginTop: 4, margin: "4px 0 0" }}>
            Fővállalkozónkénti és csapat teljesítmény elemzés
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={exportCsv}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              border: "1.5px solid #E2E8F0", background: C.bg,
              color: C.muted, cursor: "pointer", fontSize: 13,
              fontWeight: 600, fontFamily: FONT,
            }}
          >
            <Download size={14} /> CSV export
          </button>
          <span style={{ fontSize: 13, color: C.textSub }}>Időszak:</span>
          <select
            value={evSzuro}
            onChange={e => { setEvSzuro(e.target.value); setExpandedFv(null); setExpandedCs(null); }}
            style={{
              padding: "7px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8,
              fontSize: 13, fontFamily: FONT, background: "#fff", color: C.text, cursor: "pointer",
            }}
          >
            {evOptions.map(ev => (
              <option key={ev} value={ev}>{ev === "mind" ? "Összes" : ev + ". év"}</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI kártyák */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <KpiCard
          icon={<BarChart3 size={20} color={C.accent} />}
          label="Projektek"
          value={fmtSzam(kpi.projektek)}
          color={C.accent}
        />
        <KpiCard
          icon={<TrendingUp size={20} color={C.success} />}
          label="Nettó bevétel"
          value={fmtFt(kpi.bevitel)}
          color={C.success}
        />
        <KpiCard
          icon={<TrendingUp size={20} color={kpi.haszon >= 0 ? C.success : C.danger} />}
          label={`Haszon${avgMarginTotal !== null ? "  (" + avgMarginTotal + "%)" : ""}`}
          value={fmtFt(kpi.haszon)}
          color={kpi.haszon >= 0 ? C.success : C.danger}
        />
        <KpiCard
          icon={<Sun size={20} color={C.warning} />}
          label="Telepített panel"
          value={`${fmtSzam(kpi.panel)} db`}
          color={C.warning}
        />
      </div>

      {/* Tab fejléc */}
      <div style={{ borderBottom: `1px solid ${C.border}`, display: "flex", gap: 2, marginBottom: 0 }}>
        <button style={tabStyle("fovallalkozo")} onClick={() => setActiveTab("fovallalkozo")}>
          Fővállalkozó elszámolás
        </button>
        <button style={tabStyle("csapat")} onClick={() => setActiveTab("csapat")}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={14} />
            Csapat teljesítmény
          </span>
        </button>
        <button style={tabStyle("havi")} onClick={() => setActiveTab("havi")}>
          Havi bontás
        </button>
      </div>

      {/* Tab tartalom */}
      <div style={{
        background: "#fff",
        border: `1px solid ${C.border}`,
        borderTop: "none",
        borderRadius: "0 0 12px 12px",
        overflow: "hidden",
      }}>
        {activeTab === "fovallalkozo" && (
          <FvRiportTab
            data={fvRiport}
            expanded={expandedFv}
            onToggle={setExpandedFv}
          />
        )}
        {activeTab === "csapat" && (
          <CsapatRiportTab
            data={csapatRiport}
            expanded={expandedCs}
            onToggle={setExpandedCs}
          />
        )}
        {activeTab === "havi" && (
          <HaviBontasTab data={haviBontas} />
        )}
      </div>
    </div>
  );
}
