import { useState, useEffect } from "react";
import { ArrowLeft, Pencil, Printer } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../lib/constants.js";
import { getStatusConfig } from "./projekt.schema.js";
import { exportToPDF } from "../../lib/exportService.js";
import { formatProjectType } from "../../lib/projectTypeFormatter.js";
import ProjektForm from "./ProjektForm.jsx";
import TabAttekintes from "./tabs/TabAttekintes.jsx";
import TabAjanlatok from "./tabs/TabAjanlatok.jsx";
import TabMunkalapok from "./tabs/TabMunkalapok.jsx";
import TabKoltsegek from "./tabs/TabKoltsegek.jsx";
import TabDokumentumok from "./tabs/TabDokumentumok.jsx";
import TabUtemezas from "./tabs/TabUtemezas.jsx";
import TabSzamlazas from "./tabs/TabSzamlazas.jsx";
import TabKommunikacio from "./tabs/TabKommunikacio.jsx";
import TabNaplo from "./tabs/TabNaplo.jsx";
import TabRiport from "./tabs/TabRiport.jsx";

const TABS = [
  { id: "attekintes", label: "Áttekintés", icon: "📊" },
  { id: "ajanlatok", label: "Ajánlatok", icon: "📋" },
  { id: "munkalapok", label: "Munkalapok", icon: "🔧" },
  { id: "koltsegek", label: "Költségek", icon: "💰" },
  { id: "dokumentumok", label: "Dokumentumok", icon: "📁" },
  { id: "utemezas", label: "Ütemezés", icon: "📅" },
  { id: "szamlazas", label: "Számlázás", icon: "🧾" },
  { id: "kommunikacio", label: "Kommunikáció", icon: "💬" },
  { id: "naplo", label: "Napló", icon: "📝" },
  { id: "riport", label: "Riport / PDF", icon: "🖨️" },
];

export default function ProjektDetail({ projekt, munkalapok, onBack, onNavigateMunkalap, currentUser }) {
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
        return <TabMunkalapok {...props} onNavigate={onNavigateMunkalap} />;
      case "koltsegek":
        return <TabKoltsegek {...props} />;
      case "dokumentumok":
        return <TabDokumentumok {...props} />;
      case "utemezas":
        return <TabUtemezas {...props} />;
      case "szamlazas":
        return <TabSzamlazas {...props} />;
      case "kommunikacio":
        return <TabKommunikacio {...props} />;
      case "naplo":
        return <TabNaplo {...props} />;
      case "riport":
        return <TabRiport {...props} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: "24px 28px", fontFamily: FONT, maxWidth: 1100 }}>
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