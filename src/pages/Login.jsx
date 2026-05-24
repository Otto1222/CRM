import { useState } from "react";
import { Sun, Loader2, Eye, EyeOff, ArrowLeft, Lock, User } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { getUsers, checkLogin } from "../lib/crmUsers";

function Avatar({ initials, color, size = 46 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.35, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 1. KÁRTYA VÁLASZTÓ
// ════════════════════════════════════════════════════════
function SelectScreen({ onSelect }) {
  const users = getUsers();
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
        <div style={{ width: 48, height: 48, background: C.accent, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sun size={26} color="#fff" />
        </div>
        <span style={{ fontFamily: FONT_HEADING, fontSize: 26, fontWeight: 800, color: C.text }}>CRM Napelem</span>
      </div>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>Munkavégzési &amp; számlázási rendszer</p>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: C.muted, textTransform: "uppercase", marginBottom: 14 }}>Válassz fiókot</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {users.map(u => (
          <button
            key={u.id}
            onClick={() => onSelect(u)}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 14, border: `1.5px solid ${C.border}`, background: "#fff", cursor: "pointer", textAlign: "left", fontFamily: FONT, transition: "all .15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = u.color; e.currentTarget.style.background = u.color + "08"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "#fff"; }}
          >
            <Avatar initials={u.initials} color={u.color} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{u.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{u.role}</div>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: u.color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: u.color, fontSize: 18, lineHeight: 1 }}>›</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 2. BEJELENTKEZÉS
// ════════════════════════════════════════════════════════
function LoginScreen({ user, onBack, onSuccess }) {
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function submit() {
    if (!password) { setError("Add meg a jelszót!"); return; }
    setError(""); setLoading(true);
    const res = await checkLogin(username, password);
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    onSuccess(res.user);
  }

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, color: C.accent, border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT, marginBottom: 22 }}>
        <ArrowLeft size={16} /> Vissza a fiókválasztóhoz
      </button>

      {/* Kiválasztott felhasználó */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, background: user.color + "10", border: `1.5px solid ${user.color}30`, borderRadius: 14, padding: "14px 18px", marginBottom: 24 }}>
        <Avatar initials={user.initials} color={user.color} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{user.name}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Szerepkör: <b style={{ color: user.color }}>{user.role}</b></div>
        </div>
      </div>

      <p style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 18 }}>Bejelentkezés</p>

      {error && (
        <div style={{ background: "#FEF2F2", border: `1px solid #FECACA`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.danger }}>
          ⚠️ {error}
        </div>
      )}

      {/* Felhasználónév */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F8FAFC", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "0 14px", marginBottom: 12 }}>
        <User size={16} color={C.muted} />
        <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Felhasználónév" style={{ flex: 1, border: "none", outline: "none", fontSize: 14, padding: "12px 0", fontFamily: FONT, background: "transparent", color: C.text }} />
      </div>

      {/* Jelszó */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F8FAFC", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "0 14px", marginBottom: 24 }}>
        <Lock size={16} color={C.muted} />
        <input
          type={showPw ? "text" : "password"}
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="Jelszó"
          style={{ flex: 1, border: "none", outline: "none", fontSize: 14, padding: "12px 0", fontFamily: FONT, background: "transparent", color: C.text }}
        />
        <button onClick={() => setShowPw(p => !p)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>
          {showPw ? <EyeOff size={16} color={C.muted} /> : <Eye size={16} color={C.muted} />}
        </button>
      </div>

      <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: user.color, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT }}>
        {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : "Bejelentkezés"}
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// FŐ EXPORT
// ════════════════════════════════════════════════════════
export default function Login({ onLogin }) {
  const [screen,   setScreen]   = useState("select");
  const [selected, setSelected] = useState(null);

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(145deg, ${C.sidebar} 0%, #0a2540 60%, #1a3a5c 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: FONT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #94A3B8; }
      `}</style>
      <div style={{ animation: "fadeUp .35s ease", background: "#fff", borderRadius: 22, padding: "36px 32px", width: "100%", maxWidth: 460, boxShadow: "0 32px 80px rgba(0,0,0,.35)", maxHeight: "92vh", overflowY: "auto" }}>
        {screen === "select" && <SelectScreen onSelect={u => { setSelected(u); setScreen("login"); }} />}
        {screen === "login"  && <LoginScreen user={selected} onBack={() => setScreen("select")} onSuccess={onLogin} />}
      </div>
    </div>
  );
}
