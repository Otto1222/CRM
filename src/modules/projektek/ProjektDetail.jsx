import { useState, useEffect } from "react";
import { ArrowLeft, Pencil, Printer, Trash2 } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../lib/constants.js";
import { getStatusConfig } from "./projekt.schema.js";
import { exportToPDF } from "../../lib/exportService.js";
import { formatProjectType } from "../../lib/projectTypeFormatter.js";
import { deleteProjekt } from "./projekt.service.js";
import ProjektForm from "./ProjektForm.jsx";
import TabAttekintes   from "./tabs/TabAttekintes.jsx";
import TabMunkalapok   from "./tabs/TabMunkalapok.jsx";
import TabPenzugy      from "./tabs/TabPenzugy.jsx";
import TabDokumentumok from "./tabs/TabDokumentumok.jsx";
import TabKommunikacio from "./tabs/TabKommunikacio.jsx";
import TabKarteritesek from "./tabs/TabKarteritesek.jsx";
import TabAjanlatok    from "./tabs/TabAjanlatok.jsx";
// Legacy imports (back-compat ha valaki direktben hívja)
import TabRiport       from "./tabs/TabRiport.jsx";

// ── 6 tab az éles teszthez – minden üzleti funkció megvan ──────
const TABS = [
  { id: "attekintes",   label: "Áttekintés",  icon: "📊" },
  { id: "munkalapok",   label: "Munkalapok",  icon: "🔧" },
  { id: "penzugy",      label: "Pénzügy",     icon: "💰" },
  { id: "dokumentumok", label: "Dokumentumok",icon: "📁" },
  { id: "karteritesek", label: "Kártérítések",icon: "⚠️" },
  { id: "naplo",        label: "Napló",       icon: "💬" },
  { id: "ajanlatok",    label: "Árajánlat",   icon: "📋" },
];

export default function ProjektDetail({ projekt, munkalapok, onBack, onNavigateMunkalap, currentUser, onNewMunkalapForProjekt }) {
  const [tab, setTab] = useState("attekintes");
  const [editOpen, setEditOpen] = useState(false);
  const [lokalProjekt, setLokalProjekt] = useState(projekt);

  useEffect(() => {
    setLokalProjekt(projekt);
  }, [projekt]);

  if (!lokalProjekt) {
    return null;
  }

  const stCfg = getStatusConfig(lokalProjekt.status);
  const formattedTipus = formatProjectType(lokalProjekt.tipus);

  function handleSaved(updated) {
    setLokalProjekt(updated);
  }

  function handleDelete() {
    const mls = (munkalapok || []).filter(
      m => m.projektId === lokalProjekt.id || lokalProjekt.munkalapIds?.includes(m.id)
    );
    const figyelmezetes = mls.length > 0
      ? `\n\n⚠️ A projekthez ${mls.length} munkalap tartozik – ezek NEM törlődnek, de elveszítik a projekt-kapcsolatukat.`
      : "";
    if (!window.confirm(`Biztosan törlöd ezt a projektet?\n\n${lokalProjekt.projektkod} – ${lokalProjekt.nev}${figyelmezetes}\n\nEz a művelet visszavonhatatlan!`)) return;
    deleteProjekt(lokalProjekt.id);
    onBack();
  }

  function handlePrint() {
    const mls = (munkalapok || []).filter(
      m => m.projektId === lokalProjekt.id || lokalProjekt.munkalapIds?.includes(m.id)
    );
    exportToPDF(mls, `${lokalProjekt.projektkod} – ${lokalProjekt.nev}`);
  }

  const tabContent = () => {
    const props = { projekt: lokalProjekt, munkalapok, currentUser };

    switch (tab) {
      case "attekintes":
        return <TabAttekintes {...props} />;
      case "ajanlatok":
        return <TabAjanlatok {...props} />;
      case "munkalapok":
        return <TabMunkalapok {...props} onNavigate={onNavigateMunkalap} onNewMunkalap={onNewMunkalapForProjekt ? () => onNewMunkalapForProjekt(lokalProjekt) : undefined} />;
      case "penzugy":
        return <TabPenzugy {...props} />;
      // Legacy redirects
      case "koltsegek":
      case "szamlazas":
      case "elszamolas":
        return <TabPenzugy {...props} />;
      case "dokumentumok":
        return <TabDokumentumok {...props} />;
      case "naplo":
      case "kommunikacio":
        return <TabKommunikacio {...props} />;
      case "karteritesek":
        return <TabKarteritesek {...props} />;
      case "utemezas":
        // Ütemezés beolvadt Áttekintésbe – dátumok ott szerkeszthetők
        return <TabAttekintes {...props} />;
      case "riport":
        return <TabRiport {...props} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: "16px max(16px, min(28px, 3vw))", fontFamily: FONT, maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <button
          onClick={onBack}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "#64748B",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            fontFamily: FONT,
          }}
        >
          <ArrowLeft size={18} /> Vissza
        </button>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>
              {lokalProjekt.projektkod}
            </span>

            {lokalProjekt.kulsoAzonosito && (
              <span style={{ fontSize: 11, color: "#94A3B8" }}>
                / {lokalProjekt.kulsoAzonosito}
              </span>
            )}

            <span
              style={{
                background: stCfg.szin,
                color: "#fff",
                borderRadius: 20,
                padding: "3px 12px",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {lokalProjekt.status}
            </span>
          </div>

          <h1
            style={{
              fontFamily: FONT_HEADING,
              fontSize: 22,
              fontWeight: 800,
              color: "#0F172A",
              margin: "0 0 2px",
            }}
          >
            {lokalProjekt.nev}
          </h1>

          <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
            {lokalProjekt.clientNev} · {lokalProjekt.csapatNev || "—"} · {formattedTipus}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {currentUser?.role === "Admin" && (
            <button
              onClick={handleDelete}
              title="Projekt törlése"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                background: "#FEF2F2",
                color: "#DC2626",
                border: "1px solid #FECACA",
                borderRadius: 9,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
                fontFamily: FONT,
              }}
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={handlePrint}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              background: "#F1F5F9",
              color: "#475569",
              border: "none",
              borderRadius: 9,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              fontFamily: FONT,
            }}
          >
            <Printer size={14} /> PDF
          </button>

          <button
            onClick={() => setEditOpen(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              background: "#2563EB",
              color: "#fff",
              border: "none",
              borderRadius: 9,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              fontFamily: FONT,
            }}
          >
            <Pencil size={14} /> Szerkesztés
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #E2E8F0", marginBottom: 0, overflowX: "auto" }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "10px 14px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontFamily: FONT,
              fontWeight: tab === t.id ? 700 : 500,
              fontSize: 13,
              color: tab === t.id ? "#2563EB" : "#64748B",
              borderBottom: tab === t.id ? "2px solid #2563EB" : "2px solid transparent",
              marginBottom: -2,
              whiteSpace: "nowrap",
            }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: 4 }}>
        {tabContent()}
      </div>

      {editOpen && (
        <ProjektForm
          projekt={lokalProjekt}
          currentUser={currentUser}
          onClose={() => setEditOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}