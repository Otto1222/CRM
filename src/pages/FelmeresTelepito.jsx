import { useState, useRef, useEffect } from "react";
import { Camera, Save, ArrowLeft, CheckCircle2, X, Loader2, Image, Phone, MapPin } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { updateItem, loadLocal, saveLocal } from "../lib/localDb";

// ─── Felmérési kategóriák ────────────────────────────────────
const FELMERES_KAT = [
  { id: "csatl_pont",    nev: "Csatlakozási pont",              icon: "🔌", leiras: "Hova csatlakozik a rendszer? Meglévő tablóra, alhálózatra stb." },
  { id: "inverter_fal",  nev: "Inverter fal, elhelyezés",       icon: "⚡", leiras: "Tervezett inverter elhelyezési hely – fal típusa, mérete, hozzáférés" },
  { id: "akku_fal",      nev: "Akkumulátor elhelyezése",        icon: "🔋", leiras: "Tervezett akku elhelyezési hely – fal, padló, méret, hozzáférés" },
  { id: "teto_tipus",    nev: "Tető típusa",                    icon: "🏠", leiras: "Tető anyaga, szöge, iránya, esetleges akadályok" },
  { id: "padlas",        nev: "Padlás",                         icon: "🏗️", leiras: "Padlástér állapota, járhatóság, kábelvezet lehetőség" },
  { id: "villamharitor", nev: "Villámhárító",                   icon: "⚡", leiras: "Van-e villámhárító? Ha igen, milyen típusú és állapotú?" },
  { id: "mero_kismeg",   nev: "Mérőóra és kismegszakító",       icon: "📊", leiras: "Szolgáltatói mérőóra és kismegszakító típusa, elhelyezése, elérhető kapacitás" },
];

// ─── Kép tömörítő ─────────────────────────────────────────
async function compressImage(file, maxWidth = 1200, quality = 0.82) {
  return new Promise(resolve => {
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

// ─── Drive feltöltés (Apps Script) ──────────────────────────
async function driveUploadFelmeres(munkalapId, katId, katNev, fotoBase64, ext) {
  const scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
  if (!scriptUrl) return false;
  try {
    const base64 = fotoBase64.split(",")[1];
    const n = Date.now();
    const safeName = katNev.replace(/[^a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/g, "_").replace(/_+/g,"_");
    const nev = `${safeName}_${n}.${ext}`;
    await fetch(scriptUrl, {
      method: "POST", mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action:     "saveFoto",
        munkalapId,
        almappa:    "Felmeres",
        fotoNev:    nev,
        fotoBase64: base64,
        mimeType:   "image/jpeg",
      }),
    });
    return nev;
  } catch { return false; }
}

// ─── Storage helpers ─────────────────────────────────────────
const storageKey = (id) => `crm_ml_${id}_felm_kat`;
function loadKatFotok(id)       { try { const r = localStorage.getItem(storageKey(id)); return r ? JSON.parse(r) : {}; } catch { return {}; } }
function saveKatFotok(id, data) { try { localStorage.setItem(storageKey(id), JSON.stringify(data)); return true; } catch { return false; } }
const notesKey  = (id) => `crm_ml_${id}_felm_notes`;
function loadNotes(id)          { try { const r = localStorage.getItem(notesKey(id)); return r ? JSON.parse(r) : {}; } catch { return {}; } }
function saveNotes(id, data)    { try { localStorage.setItem(notesKey(id), JSON.stringify(data)); return true; } catch { return false; } }

// ─── Egyetlen kategória kártya ──────────────────────────────
function KatKartya({ kat, photos, note, onPhotos, onNote, munkalapId, saving }) {
  const ref = useRef();
  const [loading, setLoading] = useState(false);
  const [nagyitas, setNagyitas] = useState(null);
  const n = photos.length;
  const vanKep = n > 0;

  async function handleFiles(files) {
    setLoading(true);
    const ujak = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const base64 = await compressImage(file);
      if (!base64) continue;
      const ext = file.name.split(".").pop() || "jpg";
      const foto = {
        id:            `fk_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        nev:           file.name,
        base64,
        driveNev:      null,
        uploadedAt:    new Date().toISOString(),
      };
      ujak.push(foto);
      // Drive feltöltés háttérben
      driveUploadFelmeres(munkalapId, kat.id, kat.nev, base64, ext).then(nev => {
        if (nev) {
          onPhotos(prev => {
            const updated = prev.map(p => p.id === foto.id ? { ...p, driveNev: nev } : p);
            return updated;
          }, true);
        }
      });
    }
    onPhotos(prev => [...prev, ...ujak]);
    setLoading(false);
  }

  function removePhoto(photoId) {
    onPhotos(prev => prev.filter(p => p.id !== photoId));
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: `1.5px solid ${vanKep ? "#86EFAC" : C.border}`,
      overflow: "hidden", marginBottom: 14,
    }}>
      {/* Fejléc */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 16px", background: vanKep ? "#F0FDF4" : "#F8FAFC",
        borderBottom: `1px solid ${C.border}`,
      }}>
        <span style={{ fontSize: 24, flexShrink: 0 }}>{kat.icon}</span>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: C.text, margin: 0 }}>{kat.nev}</p>
          <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0" }}>{kat.leiras}</p>
        </div>
        {vanKep && (
          <div style={{
            background: "#22C55E", color: "#fff", borderRadius: "50%",
            width: 28, height: 28, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0,
          }}>
            {n}
          </div>
        )}
      </div>

      <div style={{ padding: "14px 16px" }}>
        {/* Megjegyzés mező */}
        <textarea
          value={note}
          onChange={e => onNote(e.target.value)}
          placeholder={`Megjegyzés a(z) ${kat.nev.toLowerCase()} kategóriához…`}
          rows={2}
          style={{
            width: "100%", boxSizing: "border-box", padding: "10px 12px",
            border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 14,
            fontFamily: FONT, color: C.text, outline: "none", resize: "none",
            background: "#F8FAFC", lineHeight: 1.5, marginBottom: 12,
          }}
        />

        {/* Fotók */}
        {photos.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {photos.map((foto, i) => (
              <div key={foto.id} style={{ position: "relative", width: 80, height: 80 }}>
                <img
                  src={foto.base64}
                  alt={foto.nev}
                  onClick={() => setNagyitas(foto)}
                  style={{
                    width: 80, height: 80, objectFit: "cover",
                    borderRadius: 9, border: `1.5px solid ${foto.driveNev ? "#86EFAC" : C.border}`,
                    cursor: "pointer",
                  }}
                />
                {/* Drive ikon */}
                {foto.driveNev && (
                  <div style={{
                    position: "absolute", bottom: 3, left: 3, background: "rgba(5,150,105,0.85)",
                    borderRadius: "50%", width: 18, height: 18,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <CheckCircle2 size={11} color="#fff" />
                  </div>
                )}
                {/* Sorszám */}
                <div style={{
                  position: "absolute", top: 3, left: 3, background: "rgba(0,0,0,0.6)",
                  borderRadius: 5, padding: "1px 5px", fontSize: 10, color: "#fff", fontWeight: 700,
                }}>{i + 1}</div>
                {/* Törlés */}
                <button onClick={() => removePhoto(foto.id)} style={{
                  position: "absolute", top: 2, right: 2, width: 22, height: 22,
                  background: "rgba(220,38,38,0.9)", border: "none", borderRadius: "50%",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <X size={12} color="#fff" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Fotó hozzáadás gomb */}
        <button
          onClick={() => ref.current?.click()}
          disabled={loading || saving}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            width: "100%", padding: "11px", borderRadius: 10,
            border: `2px dashed ${vanKep ? "#86EFAC" : C.border}`,
            background: vanKep ? "#F0FDF4" : "#F8FAFC",
            color: vanKep ? "#16A34A" : C.textSub,
            cursor: "pointer", fontFamily: FONT, fontWeight: 600, fontSize: 14,
          }}
        >
          {loading
            ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
            : <Camera size={18} />}
          {loading ? "Tömörítés…" : photos.length === 0 ? "📷 Fotó hozzáadása" : "📷 További fotók"}
        </button>
        <input
          ref={ref} type="file" multiple accept="image/*" capture="environment"
          style={{ display: "none" }} onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Nagyítás modal */}
      {nagyitas && (
        <div onClick={() => setNagyitas(null)} style={{
          position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.94)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <img src={nagyitas.base64} alt="" style={{
            maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain",
          }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setNagyitas(null)} style={{
            position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.15)",
            border: "none", borderRadius: "50%", width: 44, height: 44, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <X size={22} color="#fff" />
          </button>
          <div style={{
            position: "absolute", bottom: 20, left: 0, right: 0, textAlign: "center",
            color: "rgba(255,255,255,0.5)", fontSize: 12,
          }}>
            {nagyitas.driveNev ? "✅ Drive-ra mentve" : "⏳ Mentés folyamatban…"}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FŐ KOMPONENS
// ═══════════════════════════════════════════════════════════════
export default function FelmeresTelepito({ m, data, onBack }) {
  const clientNev = m.clientNev || data.ugyfelek?.find(u => u.id === m.clientId)?.name || "";
  const clientCim = m.clientCim || data.ugyfelek?.find(u => u.id === m.clientId)?.address || "";
  const clientTel = m.clientTel || data.ugyfelek?.find(u => u.id === m.clientId)?.phone || "";

  // Kategóriánként fotók state: { [katId]: [fotók] }
  const [katFotok, setKatFotok] = useState(() => {
    const saved = loadKatFotok(m.id);
    return Object.fromEntries(FELMERES_KAT.map(k => [k.id, saved[k.id] || []]));
  });
  // Kategóriánként megjegyzések: { [katId]: "szöveg" }
  const [notes, setNotes]     = useState(() => loadNotes(m.id));
  const [saving, setSaving]   = useState(false);
  const [mentve, setMentve]   = useState(false);

  // Auto-mentés minden változásnál
  useEffect(() => {
    saveKatFotok(m.id, katFotok);
  }, [katFotok, m.id]);

  useEffect(() => {
    saveNotes(m.id, notes);
  }, [notes, m.id]);

  // Fotó frissítés callback (szinkron vagy aszinkron drive update után)
  function setKatPhotos(katId, updater, silent = false) {
    setKatFotok(prev => {
      const newPhotos = typeof updater === "function" ? updater(prev[katId] || []) : updater;
      const next = { ...prev, [katId]: newPhotos };
      if (!silent) saveKatFotok(m.id, next);
      return next;
    });
  }

  function setNote(katId, val) {
    setNotes(prev => { const n = { ...prev, [katId]: val }; saveNotes(m.id, n); return n; });
  }

  async function handleMentes() {
    setSaving(true);

    // Összegyűjtjük a felmérési adatokat
    const felmeresAdat = {};
    FELMERES_KAT.forEach(k => {
      felmeresAdat[k.id + "_note"] = notes[k.id] || "";
      felmeresAdat[k.id + "_kepDb"] = (katFotok[k.id] || []).length;
    });
    felmeresAdat.felmeresIdopont = new Date().toISOString().slice(0, 10);
    felmeresAdat.felmeresKesz    = true;

    // Munkalap felmérés adatainak frissítése
    updateItem("munkalapok", m.id, {
      felmeres: { ...(m.felmeres || {}), ...felmeresAdat },
      felmeresKesz: true,
    });

    // crm-db-updated esemény
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "munkalapok" } }));

    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    setMentve(true);
    setTimeout(() => setMentve(false), 3000);
  }

  // Statisztikák
  const osszesKep = FELMERES_KAT.reduce((s, k) => s + (katFotok[k.id]?.length || 0), 0);
  const driveKep  = FELMERES_KAT.reduce((s, k) => s + (katFotok[k.id]?.filter(f => f.driveNev)?.length || 0), 0);
  const vanNotesDb = FELMERES_KAT.filter(k => notes[k.id]?.trim()).length;

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: FONT }}>
      {/* Fejléc */}
      <div style={{ background: "#1E3A5F" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "44px 16px 8px" }}>
          <button onClick={onBack} style={{
            border: "none", background: "none", color: "#94A3B8", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: FONT, fontWeight: 600,
          }}>
            <ArrowLeft size={18} /> Vissza
          </button>
          <span style={{ fontWeight: 800, fontSize: 14, color: "#fff", flex: 1 }}>{m.id}</span>
          <span style={{
            background: "#0EA5E9", color: "#fff", borderRadius: 8, padding: "3px 10px",
            fontSize: 11, fontWeight: 700,
          }}>📸 Felmérés</span>
        </div>

        {/* Ügyfél info */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 14px" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 16, color: "#fff", margin: 0 }}>{clientNev}</p>
            <p style={{ fontSize: 12, color: "#94A3B8", margin: "2px 0 0" }}>{clientCim}</p>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {clientTel && (
              <a href={`tel:${clientTel}`} style={{ color: "#4ADE80" }}><Phone size={22} /></a>
            )}
            {clientCim && (
              <a href={`https://maps.google.com/?q=${encodeURIComponent(clientCim)}`} target="_blank" rel="noreferrer" style={{ color: "#60A5FA" }}>
                <MapPin size={22} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Összefoglaló sáv */}
      <div style={{
        background: "#fff", borderBottom: `1px solid ${C.border}`,
        padding: "12px 16px", display: "flex", gap: 16, alignItems: "center",
      }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: C.accent, margin: 0 }}>{osszesKep}</p>
          <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>fotó</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: C.success, margin: 0 }}>{driveKep}</p>
          <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>Drive-on</p>
        </div>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 20, fontWeight: 800, color: "#7C3AED", margin: 0 }}>{vanNotesDb}</p>
          <p style={{ fontSize: 10, color: C.muted, margin: 0 }}>megjegyzés</p>
        </div>
        <div style={{ flex: 1, marginLeft: 8 }}>
          <div style={{ background: C.bg, borderRadius: 6, height: 8, overflow: "hidden" }}>
            <div style={{
              width: `${Math.min(100, (osszesKep / (FELMERES_KAT.length)) * 100)}%`,
              height: "100%", background: C.accent, borderRadius: 6, transition: "width .3s",
            }} />
          </div>
          <p style={{ fontSize: 10, color: C.muted, margin: "4px 0 0" }}>
            {osszesKep} fotó / {FELMERES_KAT.length} kategória
          </p>
        </div>
      </div>

      {/* Kategóriák */}
      <div style={{ padding: "16px 16px 120px" }}>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
          📌 Minden kategóriánál írj megjegyzést és tölts fel fotókat. A képek automatikusan mentődnek a Google Drive-ra a <strong>{m.id}/Felmérés/</strong> mappába.
        </p>

        {FELMERES_KAT.map(kat => (
          <KatKartya
            key={kat.id}
            kat={kat}
            photos={katFotok[kat.id] || []}
            note={notes[kat.id] || ""}
            onPhotos={(updater, silent) => setKatPhotos(kat.id, updater, silent)}
            onNote={val => setNote(kat.id, val)}
            munkalapId={m.id}
            saving={saving}
          />
        ))}
      </div>

      {/* Mentés gomb – fix alul */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100,
        background: "#fff", borderTop: `1px solid ${C.border}`,
        padding: "12px 16px 24px",
      }}>
        <button
          onClick={handleMentes}
          disabled={saving}
          style={{
            width: "100%", padding: "15px", borderRadius: 12, border: "none",
            background: mentve ? C.success : C.accent,
            color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, fontFamily: FONT, transition: "background .3s",
          }}
        >
          {saving
            ? <><Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />Mentés…</>
            : mentve
              ? <><CheckCircle2 size={20} />Felmérés elmentve ✓</>
              : <><Save size={20} />Felmérés mentése</>}
        </button>
      </div>
    </div>
  );
}
