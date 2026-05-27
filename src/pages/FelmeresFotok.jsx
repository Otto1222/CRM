import { useState, useRef, useEffect } from "react";
import { Camera, X, Trash2, Eye, Upload, Image, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { saveFelmeresFotok, loadFelmeresFotok } from "../lib/munkalapDb";

// ─── Kép tömörítő (mobil fényképekhez) ────────────────────────
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
        reader.onload = e => resolve(e.target.result); // base64 data URL
        reader.readAsDataURL(blob);
      }, "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// ─── Drive feltöltés (Apps Script webhook) ────────────────────
async function uploadToDrive(munkalapId, file, base64DataUrl) {
  const scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
  if (!scriptUrl) return false;
  try {
    const base64 = base64DataUrl.split(",")[1];
    const ext    = file.name.split(".").pop() || "jpg";
    const nev    = `Felmeres_${Date.now()}.${ext}`;
    await fetch(scriptUrl, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "saveFoto",
        munkalapId,
        almappa: "Felmeres",
        fotoNev: nev,
        fotoBase64: base64,
        mimeType: file.type || "image/jpeg",
      }),
    });
    return true;
  } catch { return false; }
}

// ─── Egy fotó kártya ──────────────────────────────────────────
function FotoKartya({ foto, canDelete, onDelete }) {
  const [nagyitas, setNagyitas] = useState(false);
  return (
    <>
      <div style={{ position: "relative", width: 88, height: 88, flexShrink: 0 }}>
        {foto.base64 ? (
          <img
            src={foto.base64}
            alt={foto.nev}
            onClick={() => setNagyitas(true)}
            style={{
              width: 88, height: 88, objectFit: "cover",
              borderRadius: 10, border: `1px solid ${C.border}`,
              cursor: "pointer",
            }}
          />
        ) : (
          <div style={{
            width: 88, height: 88, borderRadius: 10, background: C.bg,
            border: `1px solid ${C.border}`, display: "flex",
            flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
          }}>
            <Image size={22} color={C.muted} />
            <span style={{ fontSize: 9, color: C.muted, textAlign: "center", padding: "0 4px" }}>Drive-on</span>
          </div>
        )}

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
          <button onClick={() => setNagyitas(true)} style={{
            position: "absolute", top: 2, left: 2, width: 22, height: 22,
            background: "rgba(0,0,0,0.55)", border: "none", borderRadius: "50%",
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Eye size={12} color="#fff" />
          </button>
        )}

        {/* Törlés – csak admin */}
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

      {/* Nagyítás modal */}
      {nagyitas && foto.base64 && (
        <div
          onClick={() => setNagyitas(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.92)", display: "flex",
            alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <img
            src={foto.base64}
            alt={foto.nev}
            style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }}
          />
          <button onClick={() => setNagyitas(false)} style={{
            position: "absolute", top: 20, right: 20,
            background: "rgba(255,255,255,0.15)", border: "none",
            borderRadius: "50%", width: 44, height: 44, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <X size={22} color="#fff" />
          </button>
          <div style={{
            position: "absolute", bottom: 24, left: 0, right: 0,
            textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 12,
          }}>
            {foto.nev} · {new Date(foto.feltoltveDatum).toLocaleString("hu-HU")}
          </div>
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// FŐ KOMPONENS
// ═══════════════════════════════════════════════════════════════
/**
 * FelmeresFotok
 * Props:
 *   munkalapId  – munkalap azonosítója
 *   status      – jelenlegi státusz ("Felmérés" | "Kivitelezés" | egyéb)
 *   userRole    – "Telepítő" | "Admin" | "Projektmenedzser" | stb.
 *   onFotokChange – callback ha változott a fotók száma
 */
export default function FelmeresFotok({ munkalapId, status, userRole, onFotokChange }) {
  const [fotok,     setFotok]     = useState(() => loadFelmeresFotok(munkalapId));
  const [feltoltes, setFeltoltes] = useState(false); // loading
  const [drag,      setDrag]      = useState(false);
  const fileRef = useRef();

  const isFelmeres    = status === "Felmérés";
  const isKivitelezes = status === "Kivitelezés";
  const isTelepito    = userRole === "Telepítő";
  const isAdmin       = ["Admin", "Projektmenedzser", "Iroda/Könyvelés"].includes(userRole);

  // Feltölthet: telepítő Felmérés státuszban, vagy admin bármikor
  const canUpload = isAdmin || (isTelepito && isFelmeres);
  // Törölhet: csak admin
  const canDelete = isAdmin;
  // Láthatja: mindenki

  function save(ujFotok) {
    setFotok(ujFotok);
    saveFelmeresFotok(munkalapId, ujFotok);
    onFotokChange?.(ujFotok.length);
  }

  async function handleFiles(files) {
    if (!canUpload) return;
    setFeltoltes(true);
    const ujak = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await compressImage(file);
      if (!base64) continue;
      const foto = {
        id:            `fm_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        nev:           file.name,
        feltoltveDatum: new Date().toISOString(),
        feltoltteKi:   userRole,
        base64,
        driveUploaded: false,
      };
      ujak.push(foto);
      // Drive feltöltés háttérben
      uploadToDrive(munkalapId, file, base64).then(ok => {
        if (ok) {
          setFotok(prev => {
            const frissitett = prev.map(f =>
              f.id === foto.id ? { ...f, driveUploaded: true } : f
            );
            saveFelmeresFotok(munkalapId, frissitett);
            return frissitett;
          });
        }
      });
    }
    const ujFotok = [...fotok, ...ujak];
    save(ujFotok);
    setFeltoltes(false);
  }

  function handleDelete(id) {
    if (!canDelete) return;
    const ujFotok = fotok.filter(f => f.id !== id);
    save(ujFotok);
  }

  // ── Telepítő, Kivitelezés státusz: csak megtekintés ─────────
  if (isTelepito && isKivitelezes) {
    return (
      <div style={{ padding: "16px", fontFamily: FONT }}>
        <div style={{
          background: "#EFF6FF", border: `1px solid #BFDBFE`,
          borderRadius: 12, padding: "12px 16px", marginBottom: 16,
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Lock size={16} color={C.accent} />
          <p style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>
            Kivitelezési fázisban a felmérési fotókat csak megtekinteni lehet.
          </p>
        </div>
        <Gallery fotok={fotok} canDelete={false} onDelete={() => {}} />
      </div>
    );
  }

  return (
    <div style={{ padding: "16px", fontFamily: FONT }}>
      {/* Fejléc */}
      <div style={{
        background: "#fff", borderRadius: 12, padding: "14px 16px",
        border: `1px solid ${C.border}`, marginBottom: 16,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 15, color: C.text }}>📸 Felmérési fotók</p>
          <p style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
            {fotok.length} db feltöltve
            {fotok.filter(f => f.driveUploaded).length > 0 &&
              ` · ${fotok.filter(f => f.driveUploaded).length} db szinkronizálva Drive-ra`}
          </p>
        </div>
        {canUpload && (
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 16px", background: C.accent, color: "#fff",
              border: "none", borderRadius: 10, cursor: "pointer",
              fontWeight: 700, fontSize: 13, fontFamily: FONT,
            }}
          >
            <Camera size={16} /> Fotó hozzáadása
          </button>
        )}
      </div>

      {/* Feltöltés zóna – csak ha szabad */}
      {canUpload && (
        <>
          <div
            onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${drag ? C.accent : C.border}`,
              borderRadius: 12, padding: "20px 16px", textAlign: "center",
              cursor: "pointer", background: drag ? C.accentLight : "#F8FAFC",
              marginBottom: 16, transition: "all .15s",
            }}
          >
            {feltoltes ? (
              <Loader2 size={28} color={C.accent} style={{ display: "block", margin: "0 auto 8px", animation: "spin 1s linear infinite" }} />
            ) : (
              <Camera size={28} color={drag ? C.accent : C.muted} style={{ display: "block", margin: "0 auto 8px" }} />
            )}
            <p style={{ fontWeight: 600, fontSize: 14, color: drag ? C.accent : C.textSub }}>
              {feltoltes ? "Feltöltés folyamatban…" : "Fotók hozzáadása a felméréshez"}
            </p>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              Koppints a kamera megnyitásához · Automatikusan Drive-ra is menti
            </p>
          </div>
          <input
            ref={fileRef} type="file" multiple accept="image/*" capture="environment"
            style={{ display: "none" }} onChange={e => handleFiles(e.target.files)}
          />
        </>
      )}

      {/* Galéria */}
      <Gallery fotok={fotok} canDelete={canDelete} onDelete={handleDelete} />

      {fotok.length === 0 && !canUpload && (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>
          <Image size={40} style={{ opacity: .2, display: "block", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 14 }}>Még nincsenek felmérési fotók</p>
        </div>
      )}
    </div>
  );
}

function Gallery({ fotok, canDelete, onDelete }) {
  if (fotok.length === 0) return null;
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .8, marginBottom: 10 }}>
        Felmérési fotók ({fotok.length} db)
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {fotok.map(foto => (
          <FotoKartya key={foto.id} foto={foto} canDelete={canDelete} onDelete={onDelete} />
        ))}
      </div>
      <p style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
        ✅ = Drive-ra szinkronizálva &nbsp;·&nbsp; Koppints a képre a nagyításhoz
      </p>
    </div>
  );
}
