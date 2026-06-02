import { useState } from "react";
import { Sun, User, Lock, Eye, EyeOff, LogIn } from "lucide-react";
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
    <div style={{ minHeight:"100vh", background:`linear-gradient(145deg, ${C.sidebar} 0%, #0a2540 60%, #1a3a5c 100%)`, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:FONT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to { transform: rotate(360deg); } }
        .login-input-wrap:focus-within { border-color: #2563EB !important; background: #fff !important; }
        .login-btn:not(:disabled):hover { background: #1d4ed8 !important; transform: translateY(-1px); box-shadow: 0 6px 20px rgba(37,99,235,.35) !important; }
      `}</style>

      <div style={{ animation:"fadeUp .35s ease", background:"#fff", borderRadius:22, padding:"40px 36px", width:"100%", maxWidth:420, boxShadow:"0 32px 80px rgba(0,0,0,.40)" }}>

        {/* ── Logo ── */}
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:6 }}>
          <div style={{ width:52, height:52, background:C.accent, borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 14px rgba(37,99,235,.3)" }}>
            <Sun size={28} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily:FONT_HEADING, fontSize:24, fontWeight:800, color:C.text, lineHeight:1.1 }}>CRM Napelem</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>E.D.I. Solutions Kft.</div>
          </div>
        </div>

        <p style={{ color:C.muted, fontSize:14, margin:"14px 0 28px" }}>Jelentkezz be a folytatáshoz</p>

        <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* ── Felhasználónév ── */}
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, display:"block", marginBottom:6 }}>
              Felhasználónév
            </label>
            <div className="login-input-wrap" style={{ display:"flex", alignItems:"center", gap:10, background:"#F8FAFC", border:`1.5px solid ${error ? "#EF4444" : C.border}`, borderRadius:12, padding:"0 14px", transition:"all .15s" }}>
              <User size={16} color={C.muted} />
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                placeholder="pl. edi"
                autoFocus
                autoComplete="username"
                style={{ flex:1, border:"none", outline:"none", fontSize:15, padding:"13px 0", fontFamily:FONT, background:"transparent", color:C.text }}
              />
            </div>
          </div>

          {/* ── Jelszó ── */}
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, display:"block", marginBottom:6 }}>
              Jelszó
            </label>
            <div className="login-input-wrap" style={{ display:"flex", alignItems:"center", gap:10, background:"#F8FAFC", border:`1.5px solid ${error ? "#EF4444" : C.border}`, borderRadius:12, padding:"0 14px", transition:"all .15s" }}>
              <Lock size={16} color={C.muted} />
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{ flex:1, border:"none", outline:"none", fontSize:15, padding:"13px 0", fontFamily:FONT, background:"transparent", color:C.text }}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                style={{ border:"none", background:"none", cursor:"pointer", padding:"4px", color:C.muted, display:"flex", alignItems:"center" }}
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* ── Hibaüzenet ── */}
          {error && (
            <div style={{ background:"#FEF2F2", border:"1.5px solid #FECACA", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#DC2626", fontWeight:600, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:16 }}>⚠️</span> {error}
            </div>
          )}

          {/* ── Bejelentkezés gomb ── */}
          <button
            type="submit"
            disabled={loading}
            className="login-btn"
            style={{ marginTop:6, padding:"14px", borderRadius:12, border:"none", background: loading ? "#94A3B8" : C.accent, color:"#fff", fontWeight:700, fontSize:15, cursor: loading ? "not-allowed" : "pointer", fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .15s", boxShadow: loading ? "none" : "0 4px 14px rgba(37,99,235,.25)" }}
          >
            {loading ? (
              <>
                <span style={{ display:"inline-block", width:17, height:17, border:"2.5px solid rgba(255,255,255,.35)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
                Ellenőrzés...
              </>
            ) : (
              <><LogIn size={18} /> Bejelentkezés</>
            )}
          </button>
        </form>

        <p style={{ textAlign:"center", fontSize:11, color:C.muted, marginTop:24 }}>
          Elfelejtett jelszó? Kérd az adminisztrátortól.
        </p>
      </div>
    </div>
  );
}
