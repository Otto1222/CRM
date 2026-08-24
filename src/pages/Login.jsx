import { useState } from "react";
import { User, Lock, Eye, EyeOff, LogIn, ChevronRight } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
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
      background: `linear-gradient(145deg, #051a17 0%, #082521 45%, ${C.accentDark} 100%)`,
      display: "flex", flexWrap: "wrap", alignItems: "stretch", justifyContent: "center",
      fontFamily: FONT,
    }}>
      <style>{`
        * { box-sizing: border-box; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .edi-input-wrap:focus-within { border-color: ${C.accent} !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(7,94,86,.14); }
        .edi-submit:not(:disabled):hover { background: ${C.accentHover} !important; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(7,94,86,.4) !important; }
        @media (max-width: 860px) { .login-brand-panel { display: none !important; } }
      `}</style>

      {/* ── Bal panel: márka / tagline (nincs form) ── */}
      <div className="login-brand-panel" style={{
        flex: "1 1 420px", maxWidth: 520,
        display: "flex", flexDirection: "column", justifyContent: "center",
        padding: "56px 48px",
      }}>
        <div style={{ animation: "fadeUp .35s ease" }}>
          <div style={{ marginBottom: 28, borderBottom: `2px solid rgba(255,255,255,0.14)`, paddingBottom: 24 }}>
            <img src="/edi-wordmark.png" alt="E.D.I." style={{ height: 40, width: "auto", display: "block" }} />
            <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 13, color: C.success, letterSpacing: 3, textTransform: "uppercase", marginTop: 10 }}>
              Solutions Kft.
            </div>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.45)", letterSpacing: 2, textTransform: "uppercase", marginTop: 10 }}>
              ELECTRONIC · DEVELOPMENT · INNOVATIONS
            </div>
          </div>

          <p style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 20, color: "#fff", marginBottom: 8 }}>
            CRM platform
          </p>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 14, marginBottom: 40, fontWeight: 500, maxWidth: 340, lineHeight: 1.6 }}>
            Napelemes projektek, munkalapok és elszámolások egy helyen.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              "Projektvezetés",
              "Tételes árajánlat-készítő",
              "Munkalapok & elszámolások",
            ].map(t => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ChevronRight size={14} color={C.success} />
                <span style={{ fontFamily: FONT, fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Jobb panel: a tényleges form ── */}
      <div className="login-form-panel" style={{
        flex: "1 1 420px",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 24px",
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
              width: 64, height: 64, borderRadius: 16,
              background: "#fff",
              boxShadow: "0 6px 20px rgba(7,94,86,0.25)",
              marginBottom: 14,
            }}>
              <img src="/edi-logo.png" alt="E.D.I." style={{ width: 56, height: 56, display: "block" }} />
            </div>
            <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 20, color: C.text, letterSpacing: 0.2 }}>
              Bejelentkezés
            </div>
            <div style={{ fontFamily: FONT, fontSize: 13, color: C.muted, marginTop: 4 }}>
              E.D.I. Solutions Kft. – CRM platform
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Felhasználónév */}
            <div>
              <label style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 700,
                color: C.textSub, textTransform: "uppercase", letterSpacing: 0.9,
                display: "block", marginBottom: 7,
              }}>Felhasználónév</label>
              <div className="edi-input-wrap" style={{
                display: "flex", alignItems: "center", gap: 10,
                background: C.bg,
                border: `1.5px solid ${error ? C.danger : C.border}`,
                borderRadius: 11, padding: "0 14px",
                transition: "all .18s",
              }}>
                <User size={15} color={C.muted} />
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(""); }}
                  placeholder="pl. edi"
                  autoFocus
                  autoComplete="username"
                  style={{
                    flex: 1, border: "none", outline: "none",
                    fontSize: 14.5, padding: "13px 0",
                    fontFamily: FONT, background: "transparent",
                    color: C.text,
                  }}
                />
              </div>
            </div>

            {/* Jelszó */}
            <div>
              <label style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 700,
                color: C.textSub, textTransform: "uppercase", letterSpacing: 0.9,
                display: "block", marginBottom: 7,
              }}>Jelszó</label>
              <div className="edi-input-wrap" style={{
                display: "flex", alignItems: "center", gap: 10,
                background: C.bg,
                border: `1.5px solid ${error ? C.danger : C.border}`,
                borderRadius: 11, padding: "0 14px",
                transition: "all .18s",
              }}>
                <Lock size={15} color={C.muted} />
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
                    color: C.text,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  tabIndex={-1}
                  style={{ border: "none", background: "none", cursor: "pointer", padding: "4px", color: C.muted, display: "flex", alignItems: "center" }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Hibaüzenet */}
            {error && (
              <div style={{
                background: C.dangerLight, border: "1.5px solid #F5A0A5",
                borderRadius: 10, padding: "10px 14px",
                fontSize: 13, color: C.danger, fontWeight: 600,
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
                background: loading ? C.muted : C.accent,
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

          <p style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 22, fontFamily: FONT }}>
            Elfelejtett jelszó? Kérd az adminisztrátortól.
          </p>
        </div>

        {/* Bottom brand */}
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <div style={{ fontFamily: FONT, fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: 1.5, textTransform: "uppercase" }}>
            E.D.I. Solutions Kft.
          </div>
        </div>
      </div>
    </div>
  );
}
