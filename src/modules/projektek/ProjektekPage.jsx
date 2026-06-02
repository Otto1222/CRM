import { useState, useEffect, useRef } from "react";
import { Plus, Search, Download } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../lib/constants.js";
import { PROJEKT_STATUSZOK } from "./projekt.schema.js";
import { loadProjektek } from "./projekt.service.js";
import { exportToExcel, exportToPDF } from "../../lib/exportService.js";
import ProjektTable from "./ProjektTable.jsx";
import ProjektDetail from "./ProjektDetail.jsx";
import ProjektForm from "./ProjektForm.jsx";

export default function ProjektekPage({ data, currentUser, onNavigateMunkalap, onNewMunkalapForProjekt }) {
  const munkalapok = data?.munkalapok || [];
  const userRole = currentUser?.role;

  const [projektek, setProjektek] = useState(() => loadProjektek());
  const [sel, setSel] = useState(null);
  const [ujOpen, setUjOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tabFilter, setTabFilter] = useState("Összes");

  const selRef = useRef(sel);
  useEffect(() => { selRef.current = sel; }, [sel]);

  useEffect(() => {
    function refresh(e) {
      if (!e.detail?.collection || e.detail.collection === "projektek" || e.detail.collection === "munkalapok" || e.detail.collection === "all") {
        const freshList = loadProjektek();
        setProjektek(freshList);
        if (selRef.current) {
          const fresh = freshList.find(p => p.id === selRef.current.id);
          if (fresh) setSel(fresh);
        }
      }
    }
    window.addEventListener("crm-db-updated", refresh);
    return () => window.removeEventListener("crm-db-updated", refresh);
  }, []);

  const SZUROK = ["Összes", ...PROJEKT_STATUSZOK.map(s => s.id)];

  const filtered = projektek.filter(p => {
    const q2 = q.toLowerCase();

    const matchQ =
      !q ||
      p.nev?.toLowerCase().includes(q2) ||
      p.projektkod?.toLowerCase().includes(q2) ||
      p.clientNev?.toLowerCase().includes(q2);

    const matchT = tabFilter === "Összes" || p.status === tabFilter;

    return matchQ && matchT;
  });

  const aktiv = projektek.filter(p => !["Lezárva", "Elbukott Projekt"].includes(p.status)).length;
  const kivFolyamat = projektek.filter(p => p.status === "Kivitelezés alatt").length;

  if (sel) {
    return (
      <ProjektDetail
        projekt={sel}
        munkalapok={munkalapok}
        currentUser={currentUser}
        onBack={() => setSel(null)}
        onNavigateMunkalap={onNavigateMunkalap}
        onNewMunkalapForProjekt={onNewMunkalapForProjekt}
      />
    );
  }

  return (
    <div style={{ padding: "16px max(16px, min(28px, 3vw))", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 24, fontWeight: 800, color: "#0F172A", margin: "0 0 4px" }}>
            🏗️ Projektek
          </h1>
          <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
            {projektek.length} projekt · {aktiv} aktív · {kivFolyamat} kivitelezés alatt
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {["Admin", "Projektmenedzser"].includes(userRole) && (
            <>
              <button
                onClick={() => exportToExcel(filtered, [], { fajlnev: "projektek" })}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "8px 12px",
                  background: "#F1F5F9",
                  color: "#475569",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 12,
                  fontFamily: FONT,
                }}
              >
                <Download size={13} /> XLS
              </button>

              <button
                onClick={() => exportToPDF(filtered, [], "Projektek összesítő")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "8px 12px",
                  background: "#F1F5F9",
                  color: "#475569",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 12,
                  fontFamily: FONT,
                }}
              >
                <Download size={13} /> PDF
              </button>
            </>
          )}

          <button
            onClick={() => setUjOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 18px",
              background: "#2563EB",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
              fontFamily: FONT,
            }}
          >
            <Plus size={15} /> Új projekt
          </button>
        </div>
      </div>

      <div style={{ position: "relative", marginBottom: 12 }}>
        <Search
          size={15}
          color="#94A3B8"
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
        />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Keresés név, kód, ügyfél szerint…"
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "9px 12px 9px 34px",
            border: "1.5px solid #E2E8F0",
            borderRadius: 10,
            fontSize: 13,
            fontFamily: FONT,
            outline: "none",
            background: "#fff",
          }}
        />
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 16 }}>
        {SZUROK.map(s => (
          <button
            key={s}
            onClick={() => setTabFilter(s)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 12,
              whiteSpace: "nowrap",
              background: tabFilter === s ? "#2563EB" : "#F1F5F9",
              color: tabFilter === s ? "#fff" : "#64748B",
            }}
          >
            {s} {s !== "Összes" && `(${projektek.filter(p => p.status === s).length})`}
          </button>
        ))}
      </div>

      <ProjektTable
        projektek={filtered}
        munkalapok={munkalapok}
        onSelect={setSel}
        userRole={userRole}
      />

      {ujOpen && (
        <ProjektForm
          currentUser={currentUser}
          onClose={() => setUjOpen(false)}
          onSaved={p => {
            setProjektek(loadProjektek());
            setSel(p);
          }}
        />
      )}
    </div>
  );
}