import { useState } from "react";
import { Sun, Loader2, Eye, EyeOff, ArrowLeft, Lock, Mail, User, CheckCircle2 } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { registerUser, loginUser, forgotPassword } from "../lib/authApi";

// ─── Előre definiált fiókok ───────────────────────────────────
const PRESET_USERS = [
  { name: "E.D.I. Solutions",  role: "Admin",            color: "#2563EB", initials: "ED" },
  { name: "Kutasi László",     role: "Telepítő",         color: "#059669", initials: "KL" },
  { name: "Csapat2",           role: "Telepítő",         color: "#9333EA", initials: "C2" },
  { name: "Projektmenedzser",  role: "Projektmenedzser", color: "#D97706", initials: "PM" },
  { name: "Iroda/Könyvelés",   role: "Iroda/Könyvelés",  color: "#0891B2", initials: "IK" },
];

// ─── Avatar ───────────────────────────────────────────────────
function Avatar({ initials, color, size = 44 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.35, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ─── Input mező ───────────────────────────────────────────────
function Input({ icon: Icon, type = "text", placeholder, value, onChange, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F8FAFC", border: `1.5px solid ${C.border}`, borderRadius: 11, padding: "0 14px", marginBottom: 12 }}>
      <Icon size={16} color={C.muted} style={{ flexShrink: 0 }} />
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1, border: "none", outline: "none", fontSize: 14, padding: "12px 0", fontFamily: FONT, background: "transparent", color: C.text }}
      />
      {right}
    </div>
  );
}

function ErrorBox({ msg }) {
  if (!msg) return null;
  return <div style={{ background: "#FEF2F2", border: `1px solid #FECACA`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.danger }}>⚠️ {msg}</div>;
}
function SuccessBox({ msg }) {
  if (!msg) return null;
  return <div style={{ background: "#ECFDF5", border: `1px solid #A7F3D0`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.success }}>✅ {msg}</div>;
}

// ════════════════════════════════════════════════════════
// 1. FŐKÉPERNYŐ – felhasználó választó kártyák
// ════════════════════════════════════════════════════════
function UserSelectScreen({ onSelect }) {
  return (
    <div>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <div style={{ width: 48, height: 48, background: C.accent, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sun size={26} color="#fff" />
        </div>
        <span style={{ fontFamily: FONT_HEADING, fontSize: 26, fontWeight: 800, color: C.text }}>CRM Napelem</span>
      </div>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 28 }}>Munkavégzési &amp; számlázási rendszer</p>

      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: C.muted, textTransform: "uppercase", marginBottom: 14 }}>
        Válassz fiókot
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {PRESET_USERS.map(u => (
          <button
            key={u.name}
            onClick={() => onSelect(u)}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 18px", borderRadius: 14,
              border: `1.5px solid ${C.border}`,
              background: "#fff",
              cursor: "pointer", transition: "all .15s",
              textAlign: "left", fontFamily: FONT,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = u.color; e.currentTarget.style.background = u.color + "08"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.background = "#fff"; }}
          >
            <Avatar initials={u.initials} color={u.color} size={46} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{u.name}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{u.role}</div>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: u.color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: u.color, fontSize: 16, fontWeight: 700 }}>›</span>
            </div>
          </button>
        ))}
      </div>
      <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 20 }}>🔒 Google Drive szinkronizáció aktív</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 2. REGISZTRÁCIÓ – adott névhez, rögzített szerepkörrel
// ════════════════════════════════════════════════════════
function RegisterScreen({ preset, onBack, onSuccess }) {
  const [username, setUsername] = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  async function submit() {
    setError("");
    if (password !== confirm) { setError("A két jelszó nem egyezik!"); return; }
    setLoading(true);
    const res = await registerUser({
      name:     preset.name,
      username,
      email,
      password,
      role:     preset.role,
    });
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    setSuccess(`Sikeres regisztráció! Küldtünk egy e-mailt a ${email} címre.`);
    setTimeout(() => onSuccess(res.user), 2200);
  }

  const pwToggle = (
    <button onClick={() => setShowPw(p => !p)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>
      {showPw ? <EyeOff size={16} color={C.muted} /> : <Eye size={16} color={C.muted} />}
    </button>
  );

  return (
    <div>
      {/* Vissza gomb */}
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, color: C.accent, border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT, marginBottom: 22 }}>
        <ArrowLeft size={16} /> Vissza a fiókválasztóhoz
      </button>

      {/* Kiválasztott fiók */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, background: preset.color + "10", border: `1.5px solid ${preset.color}30`, borderRadius: 14, padding: "14px 18px", marginBottom: 24 }}>
        <Avatar initials={preset.initials} color={preset.color} size={46} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{preset.name}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Szerepkör: <b style={{ color: preset.color }}>{preset.role}</b></div>
        </div>
      </div>

      <p style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 18 }}>Fiók létrehozása</p>
      <ErrorBox msg={error} />
      <SuccessBox msg={success} />

      {!success && <>
        <Input icon={User}  placeholder="Felhasználónév"          value={username} onChange={setUsername} />
        <Input icon={Mail}  placeholder="E-mail cím (kötelező)"   value={email}    onChange={setEmail} />
        <Input icon={Lock}  type={showPw ? "text" : "password"} placeholder="Jelszó (min. 6 karakter)" value={password} onChange={setPassword} right={pwToggle} />
        <Input icon={Lock}  type={showPw ? "text" : "password"} placeholder="Jelszó megerősítése"       value={confirm}  onChange={setConfirm}  right={pwToggle} />

        <button onClick={submit} disabled={loading} style={{ width: "100%", marginTop: 8, padding: "13px", borderRadius: 12, border: "none", background: preset.color, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT }}>
          {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : "Regisztráció & E-mail küldés"}
        </button>
        <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 12 }}>📧 A belépési adatokat kiküldük az e-mail címedre</p>
      </>}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 3. BEJELENTKEZÉS – adott névhez
// ════════════════════════════════════════════════════════
function LoginScreen({ preset, onBack, onSuccess, onForgot }) {
  const [username, setUsername] = useState(preset.name); // előre kitöltve
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function submit() {
    setError(""); setLoading(true);
    const res = await loginUser(username, password);
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    onSuccess(res.user);
  }

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, color: C.accent, border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT, marginBottom: 22 }}>
        <ArrowLeft size={16} /> Vissza a fiókválasztóhoz
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 14, background: preset.color + "10", border: `1.5px solid ${preset.color}30`, borderRadius: 14, padding: "14px 18px", marginBottom: 24 }}>
        <Avatar initials={preset.initials} color={preset.color} size={46} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 16, color: C.text }}>{preset.name}</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Szerepkör: <b style={{ color: preset.color }}>{preset.role}</b></div>
        </div>
        <CheckCircle2 size={20} color={C.success} style={{ marginLeft: "auto" }} />
      </div>

      <p style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 18 }}>Bejelentkezés</p>
      <ErrorBox msg={error} />

      <Input icon={User} placeholder="Felhasználónév vagy e-mail" value={username} onChange={setUsername} />
      <Input
        icon={Lock} type={showPw ? "text" : "password"}
        placeholder="Jelszó" value={password} onChange={setPassword}
        right={
          <button onClick={() => setShowPw(p => !p)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>
            {showPw ? <EyeOff size={16} color={C.muted} /> : <Eye size={16} color={C.muted} />}
          </button>
        }
      />
      <div style={{ textAlign: "right", marginBottom: 18, marginTop: -4 }}>
        <button onClick={onForgot} style={{ color: C.accent, border: "none", background: "none", cursor: "pointer", fontSize: 13, fontFamily: FONT }}>
          Elfelejtett jelszó?
        </button>
      </div>

      <button onClick={submit} disabled={loading} style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: preset.color, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT }}>
        {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : "Bejelentkezés"}
      </button>

      <p style={{ textAlign: "center", fontSize: 13, color: C.muted, marginTop: 14 }}>
        Nincs még fiókod?{" "}
        <button onClick={onForgot} style={{ color: C.accent, border: "none", background: "none", cursor: "pointer", fontWeight: 700, fontFamily: FONT, fontSize: 13 }}>
          Regisztráció
        </button>
      </p>
    </div>
  );
}

// ════════════════════════════════════════════════════════
// 4. ELFELEJTETT JELSZÓ
// ════════════════════════════════════════════════════════
function ForgotScreen({ preset, onBack }) {
  const [email,   setEmail]   = useState("");
  const [newPw,   setNewPw]   = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  async function submit() {
    setError("");
    if (newPw !== confirm) { setError("A két jelszó nem egyezik!"); return; }
    setLoading(true);
    const res = await forgotPassword(email, newPw);
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    setSuccess(res.message);
    setTimeout(onBack, 3000);
  }

  const pwToggle = (
    <button onClick={() => setShowPw(p => !p)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>
      {showPw ? <EyeOff size={16} color={C.muted} /> : <Eye size={16} color={C.muted} />}
    </button>
  );

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, color: C.accent, border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT, marginBottom: 22 }}>
        <ArrowLeft size={16} /> Vissza
      </button>
      <p style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 6 }}>Jelszó visszaállítása</p>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Add meg a regisztrált e-mail címed és az új jelszót.</p>
      <ErrorBox msg={error} />
      <SuccessBox msg={success} />
      {!success && <>
        <Input icon={Mail} placeholder="Regisztrált e-mail cím"      value={email}   onChange={setEmail} />
        <Input icon={Lock} type={showPw ? "text" : "password"} placeholder="Új jelszó (min. 6 karakter)" value={newPw}   onChange={setNewPw}   right={pwToggle} />
        <Input icon={Lock} type={showPw ? "text" : "password"} placeholder="Új jelszó megerősítése"       value={confirm} onChange={setConfirm} right={pwToggle} />
        <button onClick={submit} disabled={loading} style={{ width: "100%", marginTop: 8, padding: "13px", borderRadius: 12, border: "none", background: preset?.color || C.accent, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT }}>
          {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : "Jelszó mentése & Küldés"}
        </button>
      </>}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// FŐ EXPORT
// ════════════════════════════════════════════════════════
export default function Login({ onLogin }) {
  const [screen,      setScreen]     = useState("select"); // select | auth | register | forgot
  const [selected,    setSelected]   = useState(null);
  const [registeredUsers, setRegistered] = useState([]);

  async function handleSelect(preset) {
    setSelected(preset);
    // Ellenőrizzük hogy már regisztrált-e ez a fiók
    try {
      const { loadUsers } = await import("../lib/authApi");
      const users = await loadUsers();
      const exists = users.find(u => u.name === preset.name);
      setScreen(exists ? "login" : "register");
    } catch {
      setScreen("register"); // fallback: regisztráció
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(145deg, ${C.sidebar} 0%, #0a2540 60%, #1a3a5c 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: FONT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #94A3B8; }
      `}</style>

      <div style={{ animation: "fadeUp .4s ease", background: "#fff", borderRadius: 22, padding: "36px 32px", width: "100%", maxWidth: 460, boxShadow: "0 32px 80px rgba(0,0,0,.35)", maxHeight: "92vh", overflowY: "auto" }}>

        {/* Logo csak a főképernyőn nem látszik belül (RegisterScreen/LoginScreen saját header) */}
        {screen === "select" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <div style={{ width: 48, height: 48, background: C.accent, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sun size={26} color="#fff" />
            </div>
            <span style={{ fontFamily: FONT_HEADING, fontSize: 26, fontWeight: 800, color: C.text }}>CRM Napelem</span>
          </div>
        )}

        {screen === "select"   && <UserSelectScreen onSelect={handleSelect} />}
        {screen === "register" && <RegisterScreen preset={selected} onBack={() => setScreen("select")} onSuccess={onLogin} />}
        {screen === "login"    && <LoginScreen    preset={selected} onBack={() => setScreen("select")} onSuccess={onLogin} onForgot={() => setScreen("forgot")} />}
        {screen === "forgot"   && <ForgotScreen   preset={selected} onBack={() => setScreen(selected ? "login" : "select")} />}
      </div>
    </div>
  );
}
