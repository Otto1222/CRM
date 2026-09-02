import { useState, useEffect, useRef } from "react";
import { Plus, Search, Download, Users, Handshake, AlertTriangle, WifiOff, Users2 } from "lucide-react";
import ProjektBulkImportPanel from "../../components/ProjektBulkImportPanel.jsx";
import { C, FONT, FONT_HEADING } from "../../lib/constants.js";
import { PROJEKT_STATUSZOK, PROJEKT_FORRAS } from "./projekt.schema.js";
import { FORRAS_ELLENORZES_SZUKSEGES } from "../../lib/workflowRules.js";
import { loadProjektek } from "./projekt.service.js";
import { exportToExcel, exportToPDF } from "../../lib/exportService.js";
import ProjektTable from "./ProjektTable.jsx";
import ProjektDetail from "./ProjektDetail.jsx";
import ProjektForm from "./ProjektForm.jsx";

const FORRAS_FILTER = [
  { id: "Összes",                       label: "Összes",              color: C.muted },
  { id: "sajat_ajanlat",                label: "Saját ajánlat",       color: C.accent },
  { id: "fovallalkozoi_munka",          label: "Fővállalkozói",       color: C.accent },
  { id: "belso_munka",                  label: "Belső munka",         color: C.success },
  { id: FORRAS_ELLENORZES_SZUKSEGES,   label: "⚠ Ellenőrzendő",     color: C.danger },
];

export default function ProjektekPage({ data, currentUser, onNavigateMunkalap, onNewMunkalapForProjekt, onNav }) {
  const munkalapok = data?.munkalapok || [];
  const userRole = currentUser?.role;

  const [projektek, setProjektek] = useState(() => loadProjektek());
  const [sel, setSel] = useState(null);
  const [ujOpen, setUjOpen] = useState(false);
  const [ujForrasInit, setUjForrasInit] = useState("");
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [q, setQ] = useState("");
  const [forrasFilter, setForrasFilter] = useState("Összes");
  const [tabFilter, setTabFilter] = useState("Összes");
  const [syncWarning, setSyncWarning] = useState("");

  const selRef = useRef(sel);
  useEffect(() => { selRef.current = sel; }, [sel]);

  useEffect(() => {
    function onDbUpdate(e) {
      if (!e.detail?.collection || ["projektek", "munkalapok", "all"].includes(e.detail.collection)) {
        const freshList = loadProjektek();
        setProjektek(freshList);
        if (selRef.current) {
          const fresh = freshList.find(p => p.id === selRef.current.id);
          if (fresh) setSel(fresh);
        }
      }
    }
    function onSyncWarning(e) {
      setSyncWarning(e.detail?.message || "Mentve helyileg, de nincs szinkronizálva.");
      setTimeout(() => setSyncWarning(""), 9000);
    }
    window.addEventListener("crm-db-updated", onDbUpdate);
    window.addEventListener("crm-sync-warning", onSyncWarning);
    return () => {
      window.removeEventListener("crm-db-updated", onDbUpdate);
      window.removeEventListener("crm-sync-warning", onSyncWarning);
    };
  }, []);

  const SZUROK = ["Összes", ...PROJEKT_STATUSZOK.map(s => s.id)];

  const filtered = projektek.filter(p => {
    const q2 = q.toLowerCase();
    const matchQ =
      !q ||
      p.nev?.toLowerCase().includes(q2) ||
      p.projektkod?.toLowerCase().includes(q2) ||
      p.clientNev?.toLowerCase().includes(q2) ||
      p.kulsoAzonosito?.toLowerCase().includes(q2);
    const matchForras = forrasFilter === "Összes" || p.forrás === forrasFilter;
    const matchT = tabFilter === "Összes" || p.status === tabFilter;
    return matchQ && matchForras && matchT;
  });

  const aktiv = projektek.filter(p => !["Lezárt"].includes(p.status)).length;
  const kivFolyamat = projektek.filter(p => p.status === "Kivitelezés alatt").length;
  const ellenorzendok = projektek.filter(p => p.forrás === FORRAS_ELLENORZES_SZUKSEGES);

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

      {/* Admin figyelmeztetés: bizonytalan projekt forrás (migráció) */}
      {["Admin", "Projektmenedzser"].includes(userRole) && ellenorzendok.length > 0 && (
        <div style={{ display:"flex", alignItems:"flex-start", gap:10, background:C.dangerLight, border:`1.5px solid ${C.dangerLight}`, borderRadius:10, padding:"12px 16px", marginBottom:14, fontSize:13, color:C.dangerDark }}>
          <AlertTriangle size={17} style={{ flexShrink:0, marginTop:1 }} />
          <div>
            <div style={{ fontWeight:700, marginBottom:4 }}>
              {ellenorzendok.length} projekt forrása nem határozható meg automatikusan – kézi ellenőrzés szükséges!
            </div>
            <div style={{ fontSize:12, color:C.dangerHover, lineHeight:1.6 }}>
              Ezek régi <em>garanciális</em> vagy <em>javítási</em> projektek, ahol az adatokból nem derül ki egyértelműen a forrás.
              Nyisd meg az érintett projektet, és kézzel állítsd be a forrást (Saját ajánlat / Fővállalkozói / Belső munka).<br/>
              Érintett projektek: {ellenorzendok.map(p => <span key={p.id} style={{ fontWeight:700, cursor:"pointer", textDecoration:"underline", marginRight:8 }} onClick={() => setSel(p)}>{p.projektkod || p.nev || p.id}</span>)}
            </div>
          </div>
          <button onClick={() => setForrasFilter(FORRAS_ELLENORZES_SZUKSEGES)}
            style={{ marginLeft:"auto", flexShrink:0, padding:"5px 12px", background:C.danger, color:"#fff", border:"none", borderRadius:7, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:FONT }}>
            Mutasd
          </button>
        </div>
      )}

      {/* Szinkron figyelmeztetés */}
      {syncWarning && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: C.warningLight, border: `1.5px solid ${C.warningLight}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.warning, fontWeight: 600 }}>
          <WifiOff size={15} />
          {syncWarning}
          <button onClick={() => setSyncWarning("")} style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", color: C.warning, fontWeight: 700, fontSize: 14 }}>×</button>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 24, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>
            Projektek
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            {projektek.length} projekt · {aktiv} aktív · {kivFolyamat} kivitelezés alatt
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {["Admin", "Projektmenedzser"].includes(userRole) && (
            <>
              <button onClick={() => exportToExcel(filtered, [], { fajlnev: "projektek" })}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 12px", background:C.bg, color:C.textSub, border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:12, fontFamily:FONT }}>
                <Download size={13} /> XLS
              </button>
              <button onClick={() => exportToPDF(filtered, [], "Projektek összesítő")}
                style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 12px", background:C.bg, color:C.textSub, border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:12, fontFamily:FONT }}>
                <Download size={13} /> PDF
              </button>
            </>
          )}
          {/* Saját munka / Fővállalkozói / Belső: mindhárom közvetlenül nyitja a
              formot, ugyanazzal a mintával – P0-007 előtt a "Saját ajánlat"
              gomb az Ajánlatok oldalra navigált el (mert akkor kizárólag
              onnan indulhatott saját munka), ami a tételes Excel-importos
              alfajta bevezetése óta 3 külön, rejtett útvonalat eredményezett
              ugyanahhoz a célhoz. Most mindhárom forrás egyenes, egylépéses
              gombbal érhető el; a form belsejében a "Saját munka" azonnal
              az Ajánlat/Excel alfajta-választót mutatja. Az Ajánlatok oldal
              saját "hozz létre projektet ebből az ajánlatból" gombja marad,
              ott hasznos kontextuális parancsikon. */}
          {["Admin", "Projektmenedzser"].includes(userRole) && (
            <>
              <button onClick={() => { setUjForrasInit("sajat_ajanlat"); setUjOpen(true); }}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", background:C.accentLight, color:C.accent, border:`1.5px solid ${C.accentLight}`, borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:FONT }}>
                <Users size={14} /> Saját munka
              </button>
              <button onClick={() => { setUjForrasInit("fovallalkozoi_munka"); setUjOpen(true); }}
                style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", background:C.accentLight, color:C.accent, border:`1.5px solid ${C.accentLight}`, borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:FONT }}>
                <Handshake size={14} /> Fővállalkozói
              </button>
              <button onClick={() => { setUjForrasInit("belso_munka"); setUjOpen(true); }}
                style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 18px", background:C.success, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:FONT }}>
                <Plus size={15} /> Belső munka
              </button>
              <button onClick={() => setBulkImportOpen(true)} title="Sok, egyforma jellegű munka (pl. sok helyszínes felmérés) egyszerre felvitele Excelből"
                style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 14px", background:"#fff", color:C.accent, border:`1.5px solid ${C.accent}`, borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:FONT }}>
                <Users2 size={14} /> Tömeges import
              </button>
            </>
          )}
        </div>
      </div>

      {/* Forrás-szűrő */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:10 }}>
        {FORRAS_FILTER.map(f => {
          const count = f.id === "Összes" ? projektek.length : projektek.filter(p => p.forrás === f.id).length;
          const active = forrasFilter === f.id;
          return (
            <button key={f.id} onClick={() => setForrasFilter(f.id)}
              style={{ padding:"6px 14px", borderRadius:20, border:`2px solid ${active ? f.color : "transparent"}`, background: active ? f.color + "18" : C.bg, color: active ? f.color : C.muted, fontWeight:600, fontSize:12, cursor:"pointer", fontFamily:FONT, whiteSpace:"nowrap", transition:"all .15s" }}>
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Keresés */}
      <div style={{ position:"relative", marginBottom:10 }}>
        <Search size={15} color={C.muted} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }} />
        <input value={q} onChange={e => setQ(e.target.value)}
          placeholder="Keresés név, kód, ügyfél, azonosító szerint…"
          style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px 9px 34px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:13, fontFamily:FONT, outline:"none", background:"#fff" }} />
      </div>

      {/* Státusz szűrő */}
      <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:6, marginBottom:14 }}>
        {SZUROK.map(s => {
          const cnt = s === "Összes"
            ? projektek.filter(p => forrasFilter === "Összes" || p.forrás === forrasFilter).length
            : projektek.filter(p => p.status === s && (forrasFilter === "Összes" || p.forrás === forrasFilter)).length;
          return (
            <button key={s} onClick={() => setTabFilter(s)}
              style={{ padding:"5px 12px", borderRadius:20, border:"none", cursor:"pointer", fontFamily:FONT, fontWeight:600, fontSize:12, whiteSpace:"nowrap", background: tabFilter === s ? C.accent : C.bg, color: tabFilter === s ? "#fff" : C.muted }}>
              {s} ({cnt})
            </button>
          );
        })}
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
          projekt={ujForrasInit ? { forrás: ujForrasInit, clientNev: ujForrasInit === "belso_munka" ? "E.D.I. Solutions Kft." : "" } : undefined}
          onClose={() => { setUjOpen(false); setUjForrasInit(""); }}
          onSaved={p => {
            setProjektek(loadProjektek());
            setSel(p);
            setUjForrasInit("");
          }}
        />
      )}

      {bulkImportOpen && (
        <ProjektBulkImportPanel
          currentUser={currentUser}
          onClose={() => setBulkImportOpen(false)}
          onImported={() => setProjektek(loadProjektek())}
        />
      )}
    </div>
  );
}
