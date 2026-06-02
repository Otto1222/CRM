import { useState } from "react";
import { ExternalLink, FolderOpen, RefreshCw, CheckCircle2, Clock, FolderPlus } from "lucide-react";
import { C, FONT } from "../../../lib/constants.js";
import { driveCreateProjektFolder, getDriveProjektSearchUrl, getDriveMunkaFolderUrl, driveAvailable } from "../../../lib/driveApi.js";
import { updateProjekt } from "../projekt.service.js";

const ALMAPPAK = [
  { icon: "📸", nev: "01_Felmérés",      leiras: "Felmérési fotók, jegyzetek" },
  { icon: "🔧", nev: "02_Kivitelezés",   leiras: "Munkalapok, telepítési fotók, VBF" },
  { icon: "📁", nev: "03_Dokumentumok",  leiras: "Szerződések, tervek, engedélyek" },
  { icon: "🧾", nev: "04_Számlák",       leiras: "Bejövő és kimenő számlák" },
];

export default function TabDokumentumok({ projekt }) {
  const [loading, setLoading]   = useState(false);
  const [feedback, setFeedback] = useState("");

  const mappaAllapot = projekt.driveProjektMappa || "";
  const driveErheto  = driveAvailable();
  const searchUrl    = getDriveProjektSearchUrl(projekt.projektkod);
  const munkaUrl     = getDriveMunkaFolderUrl();

  async function handleMappaLetrehoz() {
    setLoading(true);
    setFeedback("");
    try {
      await driveCreateProjektFolder(projekt);
      updateProjekt(projekt.id, { driveProjektMappa: "kérve" });
      window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "projektek" } }));
      setFeedback("ok");
    } catch {
      setFeedback("hiba");
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(""), 3500);
    }
  }

  return (
    <div style={{ padding: "20px 0", fontFamily: FONT }}>

      {/* Drive mappa státusz kártya */}
      <div style={{
        background: "#fff",
        border: `1.5px solid ${mappaAllapot === "kérve" ? "#86EFAC" : "#E2E8F0"}`,
        borderRadius: 14, padding: "18px 20px", marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FolderOpen size={22} color="#2563EB" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: "#0F172A", margin: 0 }}>
              Google Drive projekt mappa
            </p>
            <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0" }}>
              {projekt.projektkod}{projekt.clientNev ? ` – ${projekt.clientNev}` : ""}
            </p>
          </div>
          {mappaAllapot === "kérve" && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#16A34A", fontWeight: 700 }}>
              <CheckCircle2 size={15} /> Létrehozva
            </div>
          )}
          {!mappaAllapot && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>
              <Clock size={14} /> Nincs mappa
            </div>
          )}
        </div>

        {/* Gombok */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {driveErheto && (
            <a
              href={searchUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 14px", borderRadius: 9,
                background: "#2563EB", color: "#fff",
                border: "none", textDecoration: "none",
                fontWeight: 700, fontSize: 13, fontFamily: FONT,
              }}
            >
              <ExternalLink size={14} /> Mappa megnyitása Drive-ban
            </a>
          )}
          <a
            href={munkaUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: 9,
              background: "#F1F5F9", color: "#475569",
              border: "1.5px solid #E2E8F0", textDecoration: "none",
              fontWeight: 600, fontSize: 13, fontFamily: FONT,
            }}
          >
            <FolderOpen size={14} /> CRM_munka gyökér
          </a>
          {driveErheto && (
            <button
              onClick={handleMappaLetrehoz}
              disabled={loading}
              title={mappaAllapot ? "Mappa újralétrehozása" : "Drive mappa létrehozása"}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 14px", borderRadius: 9,
                background: mappaAllapot ? "#F1F5F9" : "#ECFDF5",
                color: mappaAllapot ? "#475569" : "#059669",
                border: `1.5px solid ${mappaAllapot ? "#E2E8F0" : "#86EFAC"}`,
                cursor: loading ? "wait" : "pointer",
                fontWeight: 600, fontSize: 13, fontFamily: FONT,
              }}
            >
              {loading
                ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                : <FolderPlus size={14} />
              }
              {mappaAllapot ? "Újralétrehozás" : "Mappa létrehozása"}
            </button>
          )}
        </div>

        {feedback === "ok" && (
          <p style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, marginTop: 10 }}>
            ✅ Mappa létrehozás elküldve! Pár másodperc múlva elérhető Drive-ban.
          </p>
        )}
        {feedback === "hiba" && (
          <p style={{ fontSize: 12, color: "#DC2626", fontWeight: 700, marginTop: 10 }}>
            ⚠️ Hiba a Drive kapcsolatban. Ellenőrizd a VITE_APPS_SCRIPT_URL beállítást.
          </p>
        )}
        {!driveErheto && (
          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 10 }}>
            Drive szinkron nincs beállítva (VITE_APPS_SCRIPT_URL hiányzik).
          </p>
        )}
      </div>

      {/* Mappastruktúra */}
      <p style={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
        Mappastruktúra
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        {ALMAPPAK.map(f => (
          <div key={f.nev} style={{
            background: "#fff", border: `1px solid ${C.border}`,
            borderRadius: 11, padding: "14px 16px",
            display: "flex", alignItems: "flex-start", gap: 12,
          }}>
            <span style={{ fontSize: 22, lineHeight: 1, marginTop: 1 }}>{f.icon}</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: 13, color: "#0F172A", margin: 0 }}>{f.nev}</p>
              <p style={{ fontSize: 11, color: "#64748B", margin: "3px 0 0", lineHeight: 1.5 }}>{f.leiras}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tipp */}
      <div style={{
        background: "#F0F9FF", border: "1.5px solid #BAE6FD",
        borderRadius: 10, padding: "12px 16px",
        fontSize: 12, color: "#0369A1", lineHeight: 1.7,
      }}>
        <strong>💡 Hogyan működik:</strong><br />
        Új projekt mentésekor automatikusan létrejön a projekt mappa Drive-ban.<br />
        A mappa neve: <strong>{projekt.projektkod}{projekt.clientNev ? ` – ${projekt.clientNev}` : ""}</strong><br />
        Helye: <em>CRM_munka / Projektek /</em> mappában.
      </div>
    </div>
  );
}
