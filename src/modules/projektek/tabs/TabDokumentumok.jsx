/**
 * TabDokumentumok.jsx – Dokumentumkezelés
 *
 * Csak valódi funkciók:
 * 1. Drive projekt mappa megnyitása / létrehozása
 * 2. VBF letöltés (ha van kitöltött VBF a munkalapokhoz)
 * 3. LMRA státusz + letöltés
 * 4. Fotók összesítő (hány fotó, melyik munkalap)
 * 5. Számlák feltöltési helye (Drive link)
 */

import { useState } from "react";
import {
  ExternalLink, FolderPlus, RefreshCw, FileDown,
  Camera, Shield, Receipt, FileText
} from "lucide-react";
import { C, FONT } from "../../../lib/constants.js";
import {
  driveCreateProjektFolder, driveAvailable,
  DRIVE_DB_FOLDER_ID,
} from "../../../lib/driveApi.js";
import { updateProjekt } from "../projekt.service.js";
import { loadLocal } from "../../../lib/localDb.js";
import { hasSablon, generateVbfDocx } from "../../../lib/vbfDocxService.js";
import { hasLmra, loadLmra } from "../../../lib/lmraService.js";

function SorGomb({ icon: Icon, label, onClick, href, color = "#2563EB", disabled }) {
  const style = {
    display: "flex", alignItems: "center", gap: 10,
    padding: "12px 16px", borderRadius: 10,
    background: "#fff", border: `1.5px solid ${C.border}`,
    cursor: disabled ? "default" : "pointer",
    fontFamily: FONT, fontSize: 13, fontWeight: 600,
    color: disabled ? C.muted : C.text,
    textDecoration: "none", width: "100%", boxSizing: "border-box",
    opacity: disabled ? .5 : 1,
  };
  const inner = (
    <>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}15`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={17} color={color} />
      </div>
      <span style={{ flex: 1 }}>{label}</span>
      <ExternalLink size={13} color={C.muted} />
    </>
  );
  if (href) return <a href={href} target="_blank" rel="noreferrer" style={style}>{inner}</a>;
  return <button onClick={onClick} disabled={disabled} style={{ ...style, border: `1.5px solid ${C.border}` }}>{inner}</button>;
}

export default function TabDokumentumok({ projekt, munkalapok = [] }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState("");
  const driveOk = driveAvailable();

  const projektMunkalapok = munkalapok.filter(
    m => m.projektId === projekt.id || (projekt.munkalapIds || []).includes(m.id)
  );

  // Drive mappa link – ha van driveFolderUrl tárolva, azt használjuk; különben keresés
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

  // Fotók
  const fotoSzam = projektMunkalapok.reduce((s, m) => {
    const fotok = loadLocal(`fotok_${m.id}`);
    if (!fotok) return s;
    return s + Object.values(fotok).reduce((ss, arr) => ss + (Array.isArray(arr) ? arr.length : 0), 0);
  }, 0);

  return (
    <div style={{ paddingTop: 16, fontFamily: FONT, display: "flex", flexDirection: "column", gap: 8 }}>

      {/* ── Drive projekt mappa ── */}
      <div style={{ background: "#fff", border: `1.5px solid ${projekt.driveProjektMappa ? "#86EFAC" : C.border}`,
        borderRadius: 12, padding: "14px 16px", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>
              📁 Drive projekt mappa
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>
              {projekt.projektkod}{projekt.clientNev ? ` – ${projekt.clientNev}` : ""}
              {projekt.driveProjektMappa && <span style={{ color: "#059669", marginLeft: 8, fontWeight: 700 }}>✓ Létrehozva</span>}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Megnyitás gomb */}
          <a href={driveUrl} target="_blank" rel="noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 9,
              background: "#2563EB", color: "#fff", textDecoration: "none",
              fontWeight: 700, fontSize: 13, fontFamily: FONT }}>
            <ExternalLink size={14} /> Megnyitás Drive-ban
          </a>

          {/* Létrehozás / újra */}
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

      {/* ── VBF Letöltés ── */}
      {vbfMunkalapok.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7, margin: 0 }}>
            VBF Jegyzőkönyvek ({vbfMunkalapok.length} db)
          </p>
          {vbfMunkalapok.map(m => (
            <SorGomb key={m.id} icon={FileText} label={`VBF – ${m.munkalapSzam || m.id}`}
              color="#7C3AED"
              onClick={() => {
                if (!hasSablon()) { alert("Nincs VBF sablon feltöltve. Beállítások → VBF Sablon."); return; }
                generateVbfDocx(m, projekt);
              }} />
          ))}
        </div>
      ) : (
        <div style={{ background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 10, color: C.muted, fontSize: 13 }}>
          <FileText size={16} color={C.muted} />
          <span>Még nincs VBF – a munkalap lezárásakor keletkezik</span>
        </div>
      )}

      {/* ── LMRA Státusz ── */}
      {lmraMunkalapok.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7, margin: 0 }}>
            LMRA ({lmraMunkalapok.length} db)
          </p>
          {lmraMunkalapok.map(m => {
            const lmra = loadLmra(m.id);
            return (
              <div key={m.id} style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                <Shield size={16} color="#059669" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#166534", margin: 0 }}>{m.munkalapSzam || m.id}</p>
                  <p style={{ fontSize: 11, color: "#16A34A", margin: "2px 0 0" }}>
                    {lmra?.datum ? new Date(lmra.datum).toLocaleString("hu-HU") : ""} · {lmra?.tagok?.join(", ")}
                  </p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: "#ECFDF5", color: "#059669", padding: "2px 8px", borderRadius: 20 }}>✓ Aláírva</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px",
          display: "flex", alignItems: "center", gap: 10, color: C.muted, fontSize: 13 }}>
          <Shield size={16} color={C.muted} />
          <span>Még nincs LMRA – a munka megkezdésekor töltik ki</span>
        </div>
      )}

      {/* ── Fotók összesítő ── */}
      <div style={{ background: fotoSzam > 0 ? "#EFF6FF" : "#F8FAFC",
        border: `1px solid ${fotoSzam > 0 ? "#BFDBFE" : C.border}`,
        borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <Camera size={16} color={fotoSzam > 0 ? "#2563EB" : C.muted} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: fotoSzam > 0 ? "#1D4ED8" : C.muted, margin: 0 }}>
            {fotoSzam > 0 ? `${fotoSzam} fotó rögzítve` : "Még nincs fotó"}
          </p>
          {fotoSzam > 0 && (
            <p style={{ fontSize: 11, color: "#3B82F6", margin: "2px 0 0" }}>
              {projektMunkalapok.filter(m => {
                const f = loadLocal(`fotok_${m.id}`);
                return f && Object.values(f).some(a => Array.isArray(a) && a.length > 0);
              }).map(m => m.munkalapSzam || m.id).join(", ")}
            </p>
          )}
        </div>
        {fotoSzam > 0 && projekt.driveProjektMappa && (
          <a href={driveUrl} target="_blank" rel="noreferrer"
            style={{ fontSize: 12, fontWeight: 600, color: "#2563EB", textDecoration: "none" }}>
            Drive →
          </a>
        )}
      </div>

      {/* ── Számlák helye ── */}
      <div style={{ background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px",
        display: "flex", alignItems: "center", gap: 10 }}>
        <Receipt size={16} color={C.muted} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: C.muted, flex: 1 }}>Számlák → Számlázás tab</span>
        <span style={{ fontSize: 11, color: C.muted }}>04_Számlák (Drive)</span>
      </div>
    </div>
  );
}
