import { useState } from "react";
import { User, Lock, Eye, EyeOff, LogIn } from "lucide-react";
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
      setError("Add meg a felhasználónevet és a jelszót!");
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
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: FONT,
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .edi-input-wrap:focus-within { border-color: ${C.accent} !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(24,172,160,.12); }
        .edi-login-btn:not(:disabled):hover { background: ${C.accentHover} !important; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(24,172,160,.4) !important; }
      `}</style>

      <div style={{
        animation: "fadeUp .35s ease",
        background: "#fff", borderRadius: 24,
        padding: "44px 40px", width: "100%", maxWidth: 440,
        boxShadow: "0 32px 80px rgba(0,0,0,.45)",
      }}>

        {/* ── E.D.I. Logo ── */}
        <div style={{ marginBottom: 28, borderBottom: `2px solid ${C.accentLight}`, paddingBottom: 24 }}>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 800, fontSize: 36, color: C.accentDark, letterSpacing: 4, lineHeight: 1 }}>
            E.D.I.
          </div>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 13, color: C.accent, letterSpacing: 3, textTransform: "uppercase", marginTop: 4 }}>
            Solutions Kft.
          </div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: "uppercase", marginTop: 10 }}>
            ELECTRONIC · DEVELOPMENT · INNOVATIONS
          </div>
        </div>

        <p style={{ fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 18, color: C.text, marginBottom: 4 }}>
          Bejelentkezés
        </p>
        <p style={{ color: C.muted, fontSize: 13, marginBottom: 28, fontWeight: 500 }}>
          CRM rendszer hozzáférés
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Felhasználónév ── */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
              Felhasználónév
            </label>
            <div className="edi-input-wrap" style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#F2F8F7",
              border: `1.5px solid ${error ? C.danger : C.border}`,
              borderRadius: 12, padding: "0 14px", transition: "all .15s",
            }}>
              <User size={16} color={C.muted} />
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                placeholder="pl. edi"
                autoFocus
                autoComplete="username"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 15, padding: "13px 0", fontFamily: FONT, background: "transparent", color: C.text, fontWeight: 500 }}
              />
            </div>
          </div>

          {/* ── Jelszó ── */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
              Jelszó
            </label>
            <div className="edi-input-wrap" style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#F2F8F7",
              border: `1.5px solid ${error ? C.danger : C.border}`,
              borderRadius: 12, padding: "0 14px", transition: "all .15s",
            }}>
              <Lock size={16} color={C.muted} />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 15, padding: "13px 0", fontFamily: FONT, background: "transparent", color: C.text, fontWeight: 500 }}
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                style={{ border: "none", background: "none", cursor: "pointer", padding: "4px", color: C.muted, display: "flex", alignItems: "center" }}
                tabIndex={-1}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* ── Hibaüzenet ── */}
          {error && (
            <div style={{
              background: C.dangerLight, border: `1.5px solid #FECACA`,
              borderRadius: 10, padding: "10px 14px", fontSize: 13,
              color: C.danger, fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* ── Bejelentkezés gomb ── */}
          <button
            type="submit"
            disabled={loading}
            className="edi-login-btn"
            style={{
              marginTop: 4, padding: "14px", borderRadius: 12, border: "none",
              background: loading ? C.muted : C.accent,
              color: "#fff", fontWeight: 700, fontSize: 15,
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: FONT, display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, transition: "all .15s",
              boxShadow: loading ? "none" : `0 4px 16px rgba(24,172,160,.35)`,
              letterSpacing: 0.5,
            }}>
            {loading ? (
              <>
                <span style={{ display: "inline-block", width: 17, height: 17, border: "2.5px solid rgba(255,255,255,.35)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                Ellenőrzés...
              </>
            ) : (
              <><LogIn size={18} /> Bejelentkezés</>
            )}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 24, fontWeight: 500 }}>
          Elfelejtett jelszó? Kérd az adminisztrátortól.
        </p>
      </div>
    </div>
  );
}
