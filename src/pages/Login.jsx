import { useState } from "react";
import { User, Lock, Eye, EyeOff, LogIn, ChevronRight } from "lucide-react";
import { FONT } from "../lib/constants";
import { checkLogin } from "../lib/crmUsers";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Kérjük add meg a felhasználónevet és a jelszót!");
      return;
    }
    setLoading(true);
    setError("");
    const result = await checkLogin(username.trim(), password.trim());
    setLoading(false);
    if (result.ok) {
      onLogin(result.user);
    } else {
      setError(result.error);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#075E56",
      display: "flex",
      fontFamily: FONT,
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Open+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes gridMove {
          from { transform: translateY(0); }
          to   { transform: translateY(40px); }
        }

        .edi-input-wrap:focus-within {
          border-color: #18ACA0 !important;
          background: #fff !important;
          box-shadow: 0 0 0 3px rgba(24,172,160,0.15) !important;
        }
        .edi-submit:not(:disabled):hover {
          background: #064f49 !important;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(7,94,86,0.45) !important;
        }
        .edi-submit:not(:disabled):active {
          transform: translateY(0);
        }
      `}</style>

      {/* ── Animated circuit grid background ── */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "40px 40px",
        animation: "gridMove 8s linear infinite alternate",
        pointerEvents: "none",
      }} />

      {/* ── Decorative orbs ── */}
      <div style={{
        position: "absolute", top: "-120px", right: "-80px",
        width: 420, height: 420,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(24,172,160,0.25) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-100px", left: "-60px",
        width: 340, height: 340,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(227,6,19,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* ── Left brand panel (desktop) ── */}
      <div style={{
        flex: "0 0 44%",
        display: "flex", flexDirection: "column",
        justifyContent: "center", alignItems: "flex-start",
        padding: "60px 52px",
        position: "relative",
      }} className="login-brand-panel">
        <style>{`
          @media (max-width: 768px) { .login-brand-panel { display: none !important; } .login-form-panel { flex: 1 !important; padding: 32px 24px !important; justify-content: center !important; } }
        `}</style>

        {/* E.D.I. wordmark */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            fontFamily: FONT, fontWeight: 900, fontSize: 56,
            color: "#fff", letterSpacing: 4, lineHeight: 1,
            textShadow: "0 2px 20px rgba(0,0,0,0.2)",
          }}>
            E.D.I.
          </div>
          <div style={{
            fontFamily: FONT, fontWeight: 600, fontSize: 20,
            color: "#18ACA0", letterSpacing: 5,
            textTransform: "uppercase", marginTop: 4,
          }}>
            Solutions
          </div>
          <div style={{
            fontFamily: FONT, fontWeight: 400, fontSize: 10,
            color: "rgba(255,255,255,0.35)", letterSpacing: 3.5,
            textTransform: "uppercase", marginTop: 8,
          }}>
            Electronic · Development · Innovations
          </div>
        </div>

        <div style={{
          width: 48, height: 2,
          background: "#E30613",
          marginBottom: 32, borderRadius: 2,
        }} />

        <h2 style={{
          fontFamily: FONT, fontWeight: 700, fontSize: 26,
          color: "#fff", lineHeight: 1.35, maxWidth: 340,
          marginBottom: 16,
        }}>
          Vállalatirányítási<br />rendszer
        </h2>
        <p style={{
          fontFamily: FONT, fontWeight: 400, fontSize: 14,
          color: "rgba(255,255,255,0.50)", lineHeight: 1.8, maxWidth: 300,
        }}>
          Projektek, ajánlatok, munkalapok és elszámolások egyetlen integrált platformon.
        </p>

        <div style={{ marginTop: 52, display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            "Napelem rendszerek projektvezetése",
            "Tételes árajánlat-készítő",
            "Munkalapok & elszámolások",
          ].map(t => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ChevronRight size={14} color="#18ACA0" />
              <span style={{ fontFamily: FONT, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-form-panel" style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 32px",
        background: "rgba(0,0,0,0.18)",
        backdropFilter: "blur(8px)",
      }}>
        <div style={{
          animation: "fadeUp .4s ease",
          background: "#fff",
          borderRadius: 20,
          padding: "44px 40px",
          width: "100%", maxWidth: 400,
          boxShadow: "0 40px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1)",
        }}>
          {/* Card logo */}
          <div style={{ marginBottom: 28, textAlign: "center" }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 56, height: 56, borderRadius: 16,
              background: "#075E56",
              boxShadow: "0 6px 20px rgba(7,94,86,0.35)",
              marginBottom: 14,
            }}>
              <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 18, color: "#18ACA0", letterSpacing: 1 }}>EDI</span>
            </div>
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 20, color: "#1D1D1B", letterSpacing: 0.2 }}>
              Bejelentkezés
            </div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: "#707070", marginTop: 4 }}>
              E.D.I. Solutions Kft. – CRM platform
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Felhasználónév */}
            <div>
              <label style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 700,
                color: "#3C3C3B", textTransform: "uppercase", letterSpacing: 0.9,
                display: "block", marginBottom: 7,
              }}>Felhasználónév</label>
              <div className="edi-input-wrap" style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "#F2F5F4",
                border: `1.5px solid ${error ? "#E30613" : "#DDE3E1"}`,
                borderRadius: 11, padding: "0 14px",
                transition: "all .18s",
              }}>
                <User size={15} color="#707070" />
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(""); }}
                  placeholder="Felhasználónév"
                  autoFocus
                  autoComplete="username"
                  style={{
                    flex: 1, border: "none", outline: "none",
                    fontSize: 14.5, padding: "13px 0",
                    fontFamily: FONT, background: "transparent",
                    color: "#1D1D1B",
                  }}
                />
              </div>
            </div>

            {/* Jelszó */}
            <div>
              <label style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 700,
                color: "#3C3C3B", textTransform: "uppercase", letterSpacing: 0.9,
                display: "block", marginBottom: 7,
              }}>Jelszó</label>
              <div className="edi-input-wrap" style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "#F2F5F4",
                border: `1.5px solid ${error ? "#E30613" : "#DDE3E1"}`,
                borderRadius: 11, padding: "0 14px",
                transition: "all .18s",
              }}>
                <Lock size={15} color="#707070" />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    flex: 1, border: "none", outline: "none",
                    fontSize: 14.5, padding: "13px 0",
                    fontFamily: FONT, background: "transparent",
                    color: "#1D1D1B",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  tabIndex={-1}
                  style={{ border: "none", background: "none", cursor: "pointer", padding: "4px", color: "#707070", display: "flex", alignItems: "center" }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Hibaüzenet */}
            {error && (
              <div style={{
                background: "#FDEAEB", border: "1.5px solid #F5A0A5",
                borderRadius: 10, padding: "10px 14px",
                fontSize: 13, color: "#C1000F", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 15, flexShrink: 0 }}>⚠</span> {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="edi-submit"
              style={{
                marginTop: 4, padding: "14px",
                borderRadius: 11, border: "none",
                background: loading ? "#6B6B6A" : "#075E56",
                color: "#fff", fontWeight: 700, fontSize: 14.5,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: FONT,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                transition: "all .18s",
                boxShadow: loading ? "none" : "0 4px 16px rgba(7,94,86,0.28)",
                letterSpacing: 0.3,
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    display: "inline-block", width: 17, height: 17,
                    border: "2.5px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff", borderRadius: "50%",
                    animation: "spin .75s linear infinite",
                  }} />
                  Ellenőrzés…
                </>
              ) : (
                <><LogIn size={17} /> Bejelentkezés</>
              )}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 11, color: "#707070", marginTop: 22, fontFamily: FONT }}>
            Elfelejtett jelszó? Kérd az adminisztrátortól.
          </p>
        </div>

        {/* Bottom brand */}
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <div style={{ fontFamily: FONT, fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, textTransform: "uppercase" }}>
            E.D.I. Solutions Kft. · Szeged · edisolutions.hu
          </div>
        </div>
      </div>
    </div>
  );
}
