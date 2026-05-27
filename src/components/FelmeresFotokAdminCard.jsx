import { useState, useEffect } from "react";
import { Camera, Trash2, Eye, X, Image, AlertTriangle } from "lucide-react";
import { C, FONT } from "../lib/constants";
import { loadFelmeresFotok, saveFelmeresFotok } from "../lib/munkalapDb";

/**
 * FelmeresFotokAdminCard
 * Admin/PM/Iroda nézetbe: felmérési fotók megjelenítése + törlési lehetőség
 * Props:
 *   munkalapId – munkalap azonosítója
 *   userRole   – "Admin" | "Projektmenedzser" | "Iroda/Könyvelés"
 */
export default function FelmeresFotokAdminCard({ munkalapId, userRole }) {
  const [fotok,     setFotok]     = useState(() => loadFelmeresFotok(munkalapId));
  const [nagyitas,  setNagyitas]  = useState(null); // foto obj
  const [torlendo,  setTorlendo]  = useState(null); // foto obj

  const canDelete = ["Admin", "Projektmenedzser"].includes(userRole);

  useEffect(() => {
    function refresh() {
      setFotok(loadFelmeresFotok(munkalapId));
    }
    window.addEventListener("crm-db-updated", refresh);
    return () => window.removeEventListener("crm-db-updated", refresh);
  }, [munkalapId]);

  function handleDelete(foto) {
    const ujFotok = fotok.filter(f => f.id !== foto.id);
    setFotok(ujFotok);
    saveFelmeresFotok(munkalapId, ujFotok);
    setTorlendo(null);
  }

  if (fotok.length === 0) {
    return (
      <div style={{
        background: "#F8FAFC", border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "14px 16px", marginTop: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Camera size={16} color={C.muted} />
          <p style={{ fontSize: 13, fontWeight: 600, color: C.muted }}>
            Felmérési fotók — még nincsenek feltöltve
          </p>
        </div>
      </div>
    );
  }

  const driveDb = fotok.filter(f => f.driveUploaded).length;

  return (
    <>
      <div style={{
        background: "#fff", border: `1px solid ${C.border}`,
        borderRadius: 12, padding: "16px 18px", marginTop: 16,
      }}>
        {/* Fejléc */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 14, paddingBottom: 12, borderBottom: `1px solid ${C.border}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Camera size={17} color={C.accent} />
            <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>
              📸 Felmérési fotók
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>
              {fotok.length} db
            </span>
            {driveDb > 0 && (
              <span style={{ fontSize: 11, color: C.success, marginLeft: 8 }}>
                ✅ {driveDb} szinkronizálva
              </span>
            )}
          </div>
        </div>

        {/* Fotó rács */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {fotok.map(foto => (
            <div key={foto.id} style={{ position: "relative", width: 90, height: 90 }}>
              {foto.base64 ? (
                <img
                  src={foto.base64} alt={foto.nev}
                  onClick={() => setNagyitas(foto)}
                  style={{
                    width: 90, height: 90, objectFit: "cover",
                    borderRadius: 10, border: `1px solid ${C.border}`, cursor: "pointer",
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

              {/* Drive szinkron */}
              {foto.driveUploaded && (
                <div style={{
                  position: "absolute", bottom: 3, left: 3,
                  background: "rgba(5,150,105,0.85)", borderRadius: "50%",
                  width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ color: "#fff", fontSize: 10 }}>✓</span>
                </div>
              )}

              {/* Megnéz */}
              {foto.base64 && (
                <button onClick={() => setNagyitas(foto)} style={{
                  position: "absolute", top: 2, left: 2, width: 22, height: 22,
                  background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Eye size={11} color="#fff" />
                </button>
              )}

              {/* Törlés – csak admin */}
              {canDelete && (
                <button onClick={() => setTorlendo(foto)} style={{
                  position: "absolute", top: 2, right: 2, width: 22, height: 22,
                  background: "rgba(220,38,38,0.85)", border: "none", borderRadius: "50%",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Trash2 size={11} color="#fff" />
                </button>
              )}

              {/* Ki töltötte fel */}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "rgba(0,0,0,0.55)", borderRadius: "0 0 10px 10px",
                padding: "2px 4px",
              }}>
                <p style={{ fontSize: 9, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {foto.feltoltteKi}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Feltöltési info */}
        <p style={{ fontSize: 11, color: C.muted, marginTop: 12 }}>
          Feltöltve a felmérés során · ✅ = Drive-ra szinkronizálva
          {canDelete && " · Törlés (piros gomb) csak adminnak elérhető"}
        </p>
      </div>

      {/* Nagyítás modal */}
      {nagyitas && (
        <div
          onClick={() => setNagyitas(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.92)", display: "flex",
            alignItems: "center", justifyContent: "center", padding: 16,
          }}
        >
          <img
            src={nagyitas.base64} alt={nagyitas.nev}
            style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12, objectFit: "contain" }}
          />
          <button onClick={() => setNagyitas(null)} style={{
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
            {nagyitas.nev} · Feltöltötte: {nagyitas.feltoltteKi} ·{" "}
            {new Date(nagyitas.feltoltveDatum).toLocaleString("hu-HU")}
          </div>
        </div>
      )}

      {/* Törlés megerősítő modal */}
      {torlendo && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(0,0,0,0.6)", display: "flex",
          alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: "28px 24px",
            width: "100%", maxWidth: 360, fontFamily: FONT,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%", background: "#FEF2F2",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <AlertTriangle size={26} color="#DC2626" />
            </div>
            <h3 style={{ textAlign: "center", fontSize: 18, fontWeight: 800, color: C.text, marginBottom: 8 }}>
              Fotó törlése
            </h3>
            <p style={{ textAlign: "center", fontSize: 13, color: C.textSub, marginBottom: 20 }}>
              Biztosan törlöd ezt a felmérési fotót?
              <br /><strong>{torlendo.nev}</strong>
              <br /><span style={{ color: "#DC2626", fontWeight: 600 }}>Ez a művelet nem visszavonható!</span>
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setTorlendo(null)}
                style={{
                  flex: 1, padding: "12px", borderRadius: 10,
                  border: `1.5px solid ${C.border}`, background: "#fff",
                  color: C.text, fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: FONT,
                }}
              >
                Mégsem
              </button>
              <button
                onClick={() => handleDelete(torlendo)}
                style={{
                  flex: 1, padding: "12px", borderRadius: 10, border: "none",
                  background: "#DC2626", color: "#fff", fontWeight: 700,
                  fontSize: 14, cursor: "pointer", fontFamily: FONT,
                }}
              >
                Törlöm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
