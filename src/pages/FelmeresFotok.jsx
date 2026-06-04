import { useState, useRef, useEffect } from "react";
import { Camera, X, Eye, Image, CheckCircle2, Loader2, Lock, Plus } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { saveFelmeresFotok, loadFelmeresFotok } from "../lib/munkalapDb";

// ── Státusz → fázis leíró ────────────────────────────────────
const STATUS_FAZIS = {
  "Felmérés":    { szin: C.accent, bg: "#E0F2FE", icon: "📸", szoveg: "Felmérési fázis – fotók feltölthetők" },
  "Kivitelezés": { szin: "#EA580C", bg: "#FFF7ED", icon: "🔧", szoveg: "Kivitelezési fázis – korábbi fotók megtekinthetők, új képek feltölthetők" },
  "Megkezdésre Vár": { szin: "#38BDF8", bg: "#F0F9FF", icon: "⏳", szoveg: "Megkezdésre vár – fotók megtekinthetők, új feltöltés lehetséges" },
};

// ── Kép tömörítő (mobil fényképekhez) ────────────────────────
async function compressImage(file, maxWidth = 900, quality = 0.78) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(blob);
      }, "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// ── Drive feltöltés (Apps Script webhook) ────────────────────
async function uploadToDrive(munkalapId, file, base64DataUrl, tipus) {
  const scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
  if (!scriptUrl) return false;
  try {
    const base64 = base64DataUrl.split(",")[1];
    const ext = file.name.split(".").pop() || "jpg";
    const nev = `${tipus}_${Date.now()}.${ext}`;
    await fetch(scriptUrl, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "saveFoto",
        munkalapId,
        almappa: tipus === "Felmérés" ? "Felmeres" : "Kiviteli",
        fotoNev: nev,
        fotoBase64: base64,
        mimeType: file.type || "image/jpeg",
      }),
    });
    return true;
  } catch { return false; }
}

// ── Nagyítás nézet ───────────────────────────────────────────
function NagyitasModal({ foto, onClose }) {
  if (!foto?.base64) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.93)", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <img
        src={foto.base64} alt={foto.nev}
        style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }}
        onClick={e => e.stopPropagation()}
      />
      <button onClick={onClose} style={{
        position: "absolute", top: 20, right: 20,
        background: "rgba(255,255,255,0.15)", border: "none",
        borderRadius: "50%", width: 44, height: 44, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <X size={22} color="#fff" />
      </button>
      <div style={{
        position: "absolute", bottom: 24, left: 0, right: 0,
        textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 12,
      }}>
        {foto.tipus && <span style={{ marginRight: 8, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>{foto.tipus}</span>}
        {foto.nev} · {foto.feltoltteKi} · {new Date(foto.feltoltveDatum).toLocaleString("hu-HU")}
      </div>
    </div>
  );
}

// ── Egy fotó kártya ──────────────────────────────────────────
function FotoKartya({ foto, canDelete, onDelete, onClick }) {
  const tipusSzin = foto.tipus === "Felmérés" ? C.accent : "#EA580C";
  return (
    <div style={{ position: "relative", width: 90, height: 90, flexShrink: 0 }}>
      {foto.base64 ? (
        <img
          src={foto.base64} alt={foto.nev} onClick={onClick}
          style={{
            width: 90, height: 90, objectFit: "cover",
            borderRadius: 10, border: `2px solid ${tipusSzin}30`,
            cursor: "pointer",
          }}
        />
      ) : (
        <div style={{
          width: 90, height: 90, borderRadius: 10, background: C.bg,
          border: `1px solid ${C.border}`, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <Image size={22} color={C.muted} />
          <span style={{ fontSize: 9, color: C.muted, marginTop: 4 }}>Drive-on</span>
        </div>
      )}

      {/* Típus badge (Felmérés / Kivitelezés) */}
      <div style={{
        position: "absolute", top: 3, left: 3,
        background: tipusSzin, borderRadius: 4,
        padding: "1px 5px", fontSize: 8, fontWeight: 700, color: "#fff",
      }}>
        {foto.tipus === "Felmérés" ? "F" : "K"}
      </div>

      {/* Drive szinkron ikon */}
      {foto.driveUploaded && (
        <div style={{
          position: "absolute", bottom: 3, left: 3,
          background: "rgba(5,150,105,0.85)", borderRadius: "50%",
          width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <CheckCircle2 size={11} color="#fff" />
        </div>
      )}

      {/* Megnéz gomb */}
      {foto.base64 && (
        <button onClick={onClick} style={{
          position: "absolute", top: 2, right: canDelete ? 24 : 2,
          width: 22, height: 22, background: "rgba(0,0,0,0.5)",
          border: "none", borderRadius: "50%", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Eye size={11} color="#fff" />
        </button>
      )}

      {/* Törlés – CSAK admin */}
      {canDelete && (
        <button onClick={() => onDelete(foto.id)} style={{
          position: "absolute", top: 2, right: 2, width: 22, height: 22,
          background: "rgba(220,38,38,0.85)", border: "none", borderRadius: "50%",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <X size={12} color="#fff" />
        </button>
      )}
    </div>
  );
}

// ── Feltöltés gomb ───────────────────────────────────────────
function FeltoltesGomb({ tipus, loading, onFiles }) {
  const ref = useRef();
  const szin = tipus === "Felmérés" ? C.accent : "#EA580C";
  const bg   = tipus === "Felmérés" ? "#E0F2FE" : "#FFF7ED";
  const icon = tipus === "Felmérés" ? "📸" : "🔧";
  return (
    <>
      <button
        onClick={() => ref.current?.click()}
        disabled={loading}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 16px", background: bg,
          border: `1.5px solid ${szin}60`, borderRadius: 11,
          cursor: "pointer", fontFamily: FONT, color: szin, fontWeight: 700, fontSize: 13,
          opacity: loading ? .6 : 1,
        }}
      >
        {loading ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <span>{icon}</span>}
        {tipus} fotó
        <Plus size={14} />
      </button>
      <input
        ref={ref} type="file" multiple accept="image/*" capture="environment"
        style={{ display: "none" }} onChange={e => onFiles(e.target.files, tipus)}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// FŐ KOMPONENS
// ═══════════════════════════════════════════════════════════════
/**
 * FelmeresFotok
 *
 * Logika:
 *  - Telepítő: mindig láthatja az összes fotót (Felmérés + Kivitelezés), SOHA nem törölhet
 *    - status = "Felmérés"    → Felmérés típusú fotókat tölthet fel
 *    - Bármilyen más státusz → Kivitelezési típusú fotókat tölthet fel, Felmérés fotókat CSAK nézi
 *  - Admin/PM/Iroda: látja + törölhet + bármilyen típust feltölthet
 */
export default function FelmeresFotok({ munkalapId, status, userRole, onFotokChange }) {
  const [fotok,     setFotok]     = useState(() => loadFelmeresFotok(munkalapId));
  const [loading,   setLoading]   = useState(false);
  const [nagyitas,  setNagyitas]  = useState(null);
  const [drag,      setDrag]      = useState(false);
  const dragRef = useRef();

  const isAdmin    = ["Admin", "Projektmenedzser", "Iroda/Könyvelés"].includes(userRole);
  const isTelepito = userRole === "Telepítő";
  const isFelmeres = status === "Felmérés";

  // Telepítő soha nem törölhet – csak admin
  const canDelete = isAdmin;

  // Mit tölthet fel a jelenlegi felhasználó
  // - "Felmérés" státusz → Felmérés típusú képet
  // - Bármilyen más státusz (telepítő) → Kivitelezési képet
  // - Admin → mindkettőt
  const feltolthetTipus = isAdmin
    ? ["Felmérés", "Kivitelezés"]
    : isFelmeres
      ? ["Felmérés"]
      : ["Kivitelezés"];

  // Frissítés más tab-ból (crm-db-updated event)
  useEffect(() => {
    function refresh() { setFotok(loadFelmeresFotok(munkalapId)); }
    window.addEventListener("crm-db-updated", refresh);
    return () => window.removeEventListener("crm-db-updated", refresh);
  }, [munkalapId]);

  function save(ujFotok) {
    setFotok(ujFotok);
    saveFelmeresFotok(munkalapId, ujFotok);
    onFotokChange?.(ujFotok.length);
  }

  async function handleFiles(files, tipus) {
    setLoading(true);
    const ujak = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await compressImage(file);
      if (!base64) continue;
      const foto = {
        id:             `fm_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        nev:            file.name,
        tipus,           // "Felmérés" | "Kivitelezés"
        feltoltveDatum: new Date().toISOString(),
        feltoltteKi:    userRole,
        base64,
        driveUploaded:  false,
      };
      ujak.push(foto);
      // Drive feltöltés háttérben
      uploadToDrive(munkalapId, file, base64, tipus).then(ok => {
        if (ok) {
          setFotok(prev => {
            const f = prev.map(p => p.id === foto.id ? { ...p, driveUploaded: true } : p);
            saveFelmeresFotok(munkalapId, f);
            return f;
          });
        }
      });
    }
    const ujFotok = [...fotok, ...ujak];
    save(ujFotok);
    setLoading(false);
  }

  function handleDelete(id) {
    if (!canDelete) return;
    save(fotok.filter(f => f.id !== id));
  }

  // Fotók szétválasztás típus szerint
  const felmeresKepek    = fotok.filter(f => f.tipus === "Felmérés");
  const kiviteleziKepek  = fotok.filter(f => f.tipus === "Kivitelezés" || !f.tipus);

  // Státusz info sáv
  const fazis = STATUS_FAZIS[status] || { szin: C.accent, bg: C.accentLight, icon: "📷", szoveg: "Fotók megtekinthetők és új képek feltölthetők" };

  return (
    <div style={{ padding: "16px", fontFamily: FONT, paddingBottom: 32 }}>
      {/* Státusz info */}
      <div style={{
        background: fazis.bg, border: `1px solid ${fazis.szin}40`,
        borderRadius: 12, padding: "11px 14px", marginBottom: 16,
        display: "flex", alignItems: "flex-start", gap: 10,
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{fazis.icon}</span>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: fazis.szin, marginBottom: 2 }}>{status || "Aktív munka"}</p>
          <p style={{ fontSize: 12, color: C.textSub, lineHeight: 1.5 }}>{fazis.szoveg}</p>
          {isTelepito && (
            <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
              🔒 Feltöltött képeket törölni nem lehet – törléshez kérd az adminisztrátort.
            </p>
          )}
        </div>
      </div>

      {/* Feltöltés gombok */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {feltolthetTipus.map(tipus => (
          <FeltoltesGomb
            key={tipus}
            tipus={tipus}
            loading={loading}
            onFiles={handleFiles}
          />
        ))}
      </div>

      {/* Drag & drop zóna (ha van feltöltési jog) */}
      {feltolthetTipus.length > 0 && (
        <div
          ref={dragRef}
          onDrop={e => {
            e.preventDefault(); setDrag(false);
            // Ha több típus van, alapból Kivitelezési
            const t = feltolthetTipus.length === 1 ? feltolthetTipus[0] : "Kivitelezés";
            handleFiles(e.dataTransfer.files, t);
          }}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          style={{
            border: `2px dashed ${drag ? C.accent : C.border}`,
            borderRadius: 12, padding: "16px", textAlign: "center",
            background: drag ? C.accentLight : C.bg, marginBottom: 20,
            transition: "all .15s", display: drag ? "block" : "none",
          }}
        >
          <Camera size={28} color={C.accent} style={{ display: "block", margin: "0 auto 6px" }} />
          <p style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>Ejtsd ide a fájlokat</p>
        </div>
      )}

      {/* ── FELMÉRÉSI FOTÓK ─────────────────────────────────── */}
      <FotoSzekció
        cim="Felmérési fotók"
        tipus="Felmérés"
        szin={C.accent}
        bg="#E0F2FE"
        fotok={felmeresKepek}
        canDelete={canDelete}
        onDelete={handleDelete}
        onNagyit={setNagyitas}
        canUpload={feltolthetTipus.includes("Felmérés")}
        onFiles={handleFiles}
        loading={loading}
        isTelepito={isTelepito}
      />

      {/* ── KIVITELEZÉSI FOTÓK ──────────────────────────────── */}
      <FotoSzekció
        cim="Kivitelezési fotók"
        tipus="Kivitelezés"
        szin="#EA580C"
        bg="#FFF7ED"
        fotok={kiviteleziKepek}
        canDelete={canDelete}
        onDelete={handleDelete}
        onNagyit={setNagyitas}
        canUpload={feltolthetTipus.includes("Kivitelezés")}
        onFiles={handleFiles}
        loading={loading}
        isTelepito={isTelepito}
      />

      {fotok.length === 0 && (
        <div style={{ textAlign: "center", padding: "32px 0", color: C.muted }}>
          <Camera size={40} style={{ opacity: .2, display: "block", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14 }}>Még nincsenek feltöltött fotók</p>
          <p style={{ fontSize: 12, marginTop: 6 }}>Fotók feltöltése után automatikusan szinkronizálódnak a Google Drive-ra</p>
        </div>
      )}

      <NagyitasModal foto={nagyitas} onClose={() => setNagyitas(null)} />
    </div>
  );
}

// ── Fotó szekció komponens ──────────────────────────────────
function FotoSzekció({ cim, tipus, szin, bg, fotok, canDelete, onDelete, onNagyit, canUpload, onFiles, loading, isTelepito }) {
  const ref = useRef();
  const driveDb = fotok.filter(f => f.driveUploaded).length;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Szekció fejléc */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: szin, flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{cim}</span>
          <span style={{
            background: bg, color: szin, borderRadius: 20,
            padding: "2px 10px", fontSize: 11, fontWeight: 700,
          }}>
            {fotok.length} db
          </span>
          {driveDb > 0 && (
            <span style={{ fontSize: 11, color: C.success }}>
              ✅ {driveDb} szinkronizálva
            </span>
          )}
        </div>

        {/* Feltöltés gomb a szekció fejlécénél */}
        {canUpload && (
          <>
            <button
              onClick={() => ref.current?.click()}
              disabled={loading}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 12px", background: bg,
                border: `1.5px solid ${szin}60`, borderRadius: 9,
                cursor: "pointer", color: szin, fontWeight: 700,
                fontSize: 12, fontFamily: "inherit",
              }}
            >
              <Camera size={14} /> Fotó hozzáadása
            </button>
            <input
              ref={ref} type="file" multiple accept="image/*" capture="environment"
              style={{ display: "none" }} onChange={e => onFiles(e.target.files, tipus)}
            />
          </>
        )}
      </div>

      {/* Fotó rács */}
      {fotok.length > 0 ? (
        <div style={{
          background: "#fff", borderRadius: 12, padding: "12px",
          border: `1px solid ${szin}30`,
        }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {fotok.map(foto => (
              <FotoKartya
                key={foto.id}
                foto={foto}
                canDelete={canDelete}
                onDelete={onDelete}
                onClick={() => onNagyit(foto)}
              />
            ))}
          </div>
          {isTelepito && fotok.length > 0 && (
            <p style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
              Koppints a képre a nagyításhoz · Törléshez kérd az adminisztrátort
            </p>
          )}
        </div>
      ) : (
        <div style={{
          background: bg + "60", borderRadius: 12, padding: "20px",
          border: `1px dashed ${szin}40`, textAlign: "center",
        }}>
          <p style={{ fontSize: 13, color: szin, fontWeight: 600, opacity: .7 }}>
            {canUpload ? `Még nincs ${cim.toLowerCase()} – tölts fel egyet!` : `Még nincsenek ${cim.toLowerCase()}`}
          </p>
        </div>
      )}
    </div>
  );
}
