import { useState } from "react";
import {
  ExternalLink, FolderPlus, RefreshCw, FileText,
  Shield, Receipt, FileCheck, Layers, FolderOpen
} from "lucide-react";
import { C, FONT } from "../../../lib/constants.js";
import {
  driveCreateProjektFolder, driveAvailable,
} from "../../../lib/driveApi.js";
import { updateProjekt } from "../projekt.service.js";
import { loadLocal } from "../../../lib/localDb.js";
import { hasSablon, generateVbfDocx } from "../../../lib/vbfDocxService.js";
import { hasLmra, loadLmra } from "../../../lib/lmraService.js";

function KategoriaKartya({ icon: Icon, color, title, count, countLabel, children }) {
  return (
    <div style={{
      background: "#fff", border: `1.5px solid ${C.border}`,
      borderRadius: 12, padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: children ? 10 : 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}15`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} color={color} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: 0 }}>{title}</p>
          {count !== undefined && (
            <p style={{ fontSize: 11, color: C.muted, margin: "1px 0 0" }}>
              {count > 0 ? `${count} ${countLabel}` : `Még nincs ${countLabel}`}
            </p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function TabDokumentumok({ projekt, munkalapok = [] }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState("");
  const driveOk = driveAvailable();

  const projektMunkalapok = munkalapok.filter(
    m => m.projektId === projekt.id || (projekt.munkalapIds || []).includes(m.id)
  );

  const driveUrl = projekt.driveFolderUrl
    || `https://drive.google.com/drive/search?q=${encodeURIComponent('"' + projekt.projektkod + '"')}`;

  async function handleMappaLetrehoz() {
    setLoading(true); setMsg("");
    try {
      const res = await driveCreateProjektFolder(projekt);
      const url = res?.folderId
        ? `https://drive.google.com/drive/folders/${res.folderId}`
        : driveUrl;
      updateProjekt(projekt.id, { driveProjektMappa: "kérve", driveFolderUrl: url });
      window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "projektek" } }));
      setMsg("ok");
    } catch { setMsg("hiba"); }
    finally { setLoading(false); setTimeout(() => setMsg(""), 4000); }
  }

  // VBF-ek
  const vbfMunkalapok = projektMunkalapok.filter(m => {
    const vbf = loadLocal(`vbf_${m.id}`);
    return vbf && Object.keys(vbf).length > 0;
  });

  // LMRA-k
  const lmraMunkalapok = projektMunkalapok.filter(m => hasLmra(m.id));

  return (
    <div style={{ paddingTop: 16, fontFamily: FONT, display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Drive projekt mappa ── */}
      <div style={{ background: "#fff", border: `1.5px solid ${projekt.driveProjektMappa ? "#86EFAC" : C.border}`,
        borderRadius: 12, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>
              🗂️ Drive projekt mappa
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>
              {projekt.projektkod}{projekt.clientNev ? ` – ${projekt.clientNev}` : ""}
              {projekt.driveProjektMappa && <span style={{ color: "#059669", marginLeft: 8, fontWeight: 700 }}>✓ Létrehozva</span>}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href={driveUrl} target="_blank" rel="noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9,
              background: "#2563EB", color: "#fff", textDecoration: "none",
              fontWeight: 700, fontSize: 13, fontFamily: FONT }}>
            <ExternalLink size={14} /> Megnyitás Drive-ban
          </a>
          {driveOk && (
            <button onClick={handleMappaLetrehoz} disabled={loading}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: 9,
                background: "#F8FAFC", border: `1.5px solid ${C.border}`, color: C.textSub,
                cursor: loading ? "wait" : "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT }}>
              {loading ? <RefreshCw size={13} style={{ animation: "spin 1s linear infinite" }} /> : <FolderPlus size={13} />}
              {projekt.driveProjektMappa ? "Újralétrehozás" : "Mappa létrehozása"}
            </button>
          )}
        </div>

        {msg === "ok"   && <p style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, marginTop: 8 }}>✅ Mappa létrehozva!</p>}
        {msg === "hiba" && <p style={{ fontSize: 12, color: "#DC2626", fontWeight: 700, marginTop: 8 }}>⚠️ Drive hiba – ellenőrizd a kapcsolatot.</p>}
        {!driveOk       && <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>Drive szinkron nincs konfigurálva.</p>}
      </div>

      {/* ── Dokumentum kategóriák ── */}
      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7, margin: "4px 0 0" }}>
        Dokumentum kategóriák
      </p>

      {/* Szerződések */}
      <KategoriaKartya icon={FileCheck} color="#7C3AED" title="Szerződések">
        <a href={driveUrl} target="_blank" rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#7C3AED", textDecoration: "none" }}>
          <FolderOpen size={13} /> Megnyitás Drive-ban <ExternalLink size={11} />
        </a>
      </KategoriaKartya>

      {/* Tervek */}
      <KategoriaKartya icon={Layers} color="#0891B2" title="Tervek">
        <a href={driveUrl} target="_blank" rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#0891B2", textDecoration: "none" }}>
          <FolderOpen size={13} /> Megnyitás Drive-ban <ExternalLink size={11} />
        </a>
      </KategoriaKartya>

      {/* VBF dokumentumok */}
      <KategoriaKartya icon={FileText} color="#7C3AED" title="VBF Dokumentumok"
        count={vbfMunkalapok.length} countLabel="kitöltött VBF">
        {vbfMunkalapok.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {vbfMunkalapok.map(m => (
              <button key={m.id}
                onClick={() => {
                  if (!hasSablon()) { alert("Nincs VBF sablon feltöltve. Beállítások → VBF Sablon."); return; }
                  generateVbfDocx(m, projekt);
                }}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                  background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 8,
                  cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 600, color: "#6D28D9", textAlign: "left" }}>
                <FileText size={13} color="#7C3AED" />
                VBF – {m.munkalapSzam || m.id} · Letöltés DOCX
              </button>
            ))}
          </div>
        )}
      </KategoriaKartya>

      {/* LMRA dokumentumok */}
      <KategoriaKartya icon={Shield} color="#059669" title="LMRA Dokumentumok"
        count={lmraMunkalapok.length} countLabel="aláírt LMRA">
        {lmraMunkalapok.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {lmraMunkalapok.map(m => {
              const lmra = loadLmra(m.id);
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
                  background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 8 }}>
                  <Shield size={13} color="#059669" style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#166534", margin: 0 }}>{m.munkalapSzam || m.id}</p>
                    {lmra?.datum && (
                      <p style={{ fontSize: 11, color: "#16A34A", margin: "1px 0 0" }}>
                        {new Date(lmra.datum).toLocaleDateString("hu-HU")}
                        {lmra?.tagok?.length > 0 ? ` · ${lmra.tagok.join(", ")}` : ""}
                      </p>
                    )}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, background: "#ECFDF5", color: "#059669", padding: "2px 8px", borderRadius: 20 }}>✓ Aláírva</span>
                </div>
              );
            })}
          </div>
        )}
      </KategoriaKartya>

      {/* Számlák */}
      <KategoriaKartya icon={Receipt} color="#D97706" title="Számlák">
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
          Számlák kezelése a <strong>Pénzügy</strong> fülön érhető el.
          A Drive-on az <em>04_Számlák</em> mappában találod.
        </p>
      </KategoriaKartya>

      {/* Egyéb dokumentumok */}
      <KategoriaKartya icon={FolderOpen} color="#64748B" title="Egyéb dokumentumok">
        <a href={driveUrl} target="_blank" rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 600, color: "#64748B", textDecoration: "none" }}>
          <FolderOpen size={13} /> Megnyitás Drive-ban <ExternalLink size={11} />
        </a>
      </KategoriaKartya>

    </div>
  );
}
