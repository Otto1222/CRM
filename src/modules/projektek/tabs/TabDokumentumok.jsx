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
        border: `1.5px solid ${mappaAllapot === "kérve" ? C.success : C.border}`,
        borderRadius: 14, padding: "18px 20px", marginBottom: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FolderOpen size={22} color={C.accent} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: C.text, margin: 0 }}>
              Google Drive projekt mappa
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>
              {projekt.projektkod}{projekt.clientNev ? ` – ${projekt.clientNev}` : ""}
            </p>
          </div>
          {mappaAllapot === "kérve" && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.success, fontWeight: 700 }}>
              <CheckCircle2 size={15} /> Létrehozva
            </div>
          )}
          {!mappaAllapot && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: C.muted, fontWeight: 600 }}>
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
                background: C.accent, color: "#fff",
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
              background: C.bg, color: C.muted,
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
                background: mappaAllapot ? C.bg : C.successLight,
                color: mappaAllapot ? C.muted : C.success,
                border: `1.5px solid ${mappaAllapot ? C.border : C.success}`,
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
          <p style={{ fontSize: 12, color: C.success, fontWeight: 700, marginTop: 10 }}>
            ✅ Mappa létrehozás elküldve! Pár másodperc múlva elérhető Drive-ban.
          </p>
        )}
        {feedback === "hiba" && (
          <p style={{ fontSize: 12, color: C.danger, fontWeight: 700, marginTop: 10 }}>
            ⚠️ Hiba a Drive kapcsolatban. Ellenőrizd a VITE_APPS_SCRIPT_URL beállítást.
          </p>
        )}
        {!driveErheto && (
          <p style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>
            Drive szinkron nincs beállítva (VITE_APPS_SCRIPT_URL hiányzik).
          </p>
        )}
      </div>

      {/* Mappastruktúra */}
      <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
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
              <p style={{ fontWeight: 700, fontSize: 13, color: C.text, margin: 0 }}>{f.nev}</p>
              <p style={{ fontSize: 11, color: C.muted, margin: "3px 0 0", lineHeight: 1.5 }}>{f.leiras}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tipp */}
      <div style={{
        background: C.accentLight, border: "1.5px solid #BAE6FD",
        borderRadius: 10, padding: "12px 16px",
        fontSize: 12, color: C.accent, lineHeight: 1.7,
      }}>
        <strong>💡 Hogyan működik:</strong><br />
        Új projekt mentésekor automatikusan létrejön a projekt mappa Drive-ban.<br />
        A mappa neve: <strong>{projekt.projektkod}{projekt.clientNev ? ` – ${projekt.clientNev}` : ""}</strong><br />
        Helye: <em>CRM_munka / Projektek /</em> mappában.
      </div>
    </div>
  );
}
