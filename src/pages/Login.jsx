import { useState } from "react";
import { Sun, CheckCircle2, Loader2, Eye, EyeOff, ArrowLeft, User, Lock, Mail, Shield } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { registerUser, loginUser, forgotPassword, ROLES } from "../lib/authApi";

// ─── Közös input komponens ────────────────────────────────────
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

// ─── Hibaüzenet ───────────────────────────────────────────────
function ErrorBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background: "#FEF2F2", border: `1px solid #FECACA`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.danger, display: "flex", alignItems: "center", gap: 8 }}>
      ⚠️ {msg}
    </div>
  );
}

// ─── Sikeres üzenet ───────────────────────────────────────────
function SuccessBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background: "#ECFDF5", border: `1px solid #A7F3D0`, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.success, display: "flex", alignItems: "center", gap: 8 }}>
      ✅ {msg}
    </div>
  );
}

// ─── Fejléc ───────────────────────────────────────────────────
function Header({ onBack, backLabel }) {
  return (
    <div style={{ marginBottom: 28 }}>
      {onBack && (
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, color: C.accent, border: "none", background: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT, marginBottom: 16 }}>
          <ArrowLeft size={16} /> {backLabel}
        </button>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <div style={{ width: 48, height: 48, background: C.accent, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sun size={26} color="#fff" />
        </div>
        <span style={{ fontFamily: FONT_HEADING, fontSize: 26, fontWeight: 800, color: C.text }}>CRM Napelem</span>
      </div>
      <p style={{ color: C.muted, fontSize: 14 }}>Munkavégzési &amp; számlázási rendszer</p>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// BEJELENTKEZÉS
// ════════════════════════════════════════════════════════════
function LoginForm({ onSuccess, onRegister, onForgot }) {
  const [username, setUsername] = useState("");
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

  function handleKey(e) { if (e.key === "Enter") submit(); }

  return (
    <div>
      <Header />
      <p style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 20 }}>Bejelentkezés</p>
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
      <div style={{ textAlign: "right", marginBottom: 20, marginTop: -4 }}>
        <button onClick={onForgot} style={{ color: C.accent, border: "none", background: "none", cursor: "pointer", fontSize: 13, fontFamily: FONT }}>
          Elfelejtett jelszó?
        </button>
      </div>
      <button onClick={submit} onKeyDown={handleKey} disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT, marginBottom: 14 }}>
        {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : "Bejelentkezés"}
      </button>
      <div style={{ textAlign: "center", fontSize: 14, color: C.muted }}>
        Nincs még fiókod?{" "}
        <button onClick={onRegister} style={{ color: C.accent, border: "none", background: "none", cursor: "pointer", fontWeight: 700, fontFamily: FONT, fontSize: 14 }}>
          Regisztráció
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// REGISZTRÁCIÓ
// ════════════════════════════════════════════════════════════
function RegisterForm({ onBack, onSuccess }) {
  const [name,     setName]     = useState("");
  const [username, setUsername] = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [role,     setRole]     = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  async function submit() {
    setError(""); setSuccess("");
    if (password !== confirm) { setError("A két jelszó nem egyezik!"); return; }
    setLoading(true);
    const res = await registerUser({ name, username, email, password, role });
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    setSuccess(`Sikeres regisztráció! Küldtünk egy e-mailt a ${email} címre a belépési adataiddal.`);
    setTimeout(() => onSuccess(res.user), 2500);
  }

  return (
    <div>
      <Header onBack={onBack} backLabel="Vissza a bejelentkezéshez" />
      <p style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 20 }}>Új fiók létrehozása</p>
      <ErrorBox msg={error} />
      <SuccessBox msg={success} />

      {!success && <>
        <Input icon={User}   placeholder="Teljes név (pl. Kutasi László)" value={name}     onChange={setName} />
        <Input icon={Shield} placeholder="Felhasználónév"                  value={username} onChange={setUsername} />
        <Input icon={Mail}   placeholder="E-mail cím (kötelező)"           value={email}    onChange={setEmail} />
        <Input
          icon={Lock} type={showPw ? "text" : "password"}
          placeholder="Jelszó (min. 6 karakter)" value={password} onChange={setPassword}
          right={
            <button onClick={() => setShowPw(p => !p)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>
              {showPw ? <EyeOff size={16} color={C.muted} /> : <Eye size={16} color={C.muted} />}
            </button>
          }
        />
        <Input icon={Lock} type={showPw ? "text" : "password"} placeholder="Jelszó megerősítése" value={confirm} onChange={setConfirm} />

        {/* Szerepkör választó */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase", marginBottom: 10 }}>Szerepkör</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {ROLES.map(r => (
              <button key={r.value} onClick={() => setRole(r.value)} style={{ padding: "10px 12px", borderRadius: 10, border: `2px solid ${role === r.value ? r.color : C.border}`, background: role === r.value ? r.color + "15" : "#fff", color: role === r.value ? r.color : C.textSub, fontWeight: role === r.value ? 700 : 400, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontFamily: FONT }}>
                {role === r.value && <CheckCircle2 size={14} />}
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT }}>
          {loading
            ? <><Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />Regisztráció…</>
            : "Regisztráció & E-mail küldés"}
        </button>
        <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 12 }}>
          📧 A belépési adatokat kiküldük az e-mail címedre
        </p>
      </>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// ELFELEJTETT JELSZÓ
// ════════════════════════════════════════════════════════════
function ForgotForm({ onBack }) {
  const [email,    setEmail]    = useState("");
  const [newPw,    setNewPw]    = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  async function submit() {
    setError(""); setSuccess("");
    if (newPw !== confirm) { setError("A két jelszó nem egyezik!"); return; }
    setLoading(true);
    const res = await forgotPassword(email, newPw);
    setLoading(false);
    if (!res.ok) { setError(res.error); return; }
    setSuccess(res.message);
    setTimeout(onBack, 3000);
  }

  return (
    <div>
      <Header onBack={onBack} backLabel="Vissza a bejelentkezéshez" />
      <p style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 8 }}>Jelszó visszaállítása</p>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Add meg a regisztrált e-mail címed és az új jelszót.</p>
      <ErrorBox msg={error} />
      <SuccessBox msg={success} />
      {!success && <>
        <Input icon={Mail} placeholder="Regisztrált e-mail cím" value={email} onChange={setEmail} />
        <Input
          icon={Lock} type={showPw ? "text" : "password"}
          placeholder="Új jelszó (min. 6 karakter)" value={newPw} onChange={setNewPw}
          right={
            <button onClick={() => setShowPw(p => !p)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>
              {showPw ? <EyeOff size={16} color={C.muted} /> : <Eye size={16} color={C.muted} />}
            </button>
          }
        />
        <Input icon={Lock} type={showPw ? "text" : "password"} placeholder="Új jelszó megerősítése" value={confirm} onChange={setConfirm} />
        <button onClick={submit} disabled={loading} style={{ width: "100%", padding: 14, borderRadius: 12, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT }}>
          {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : "Jelszó mentése & Küldés"}
        </button>
      </>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// FŐ EXPORT
// ════════════════════════════════════════════════════════════
export default function Login({ onLogin }) {
  const [screen, setScreen] = useState("login"); // login | register | forgot

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(145deg, ${C.sidebar} 0%, #0a2540 60%, #1a3a5c 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: FONT,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input::placeholder { color: #94A3B8; }
      `}</style>

      <div style={{
        animation: "fadeUp .4s ease",
        background: "#fff", borderRadius: 22,
        padding: "40px 36px",
        width: "100%", maxWidth: 460,
        boxShadow: "0 32px 80px rgba(0,0,0,.35)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        {screen === "login"    && <LoginForm    onSuccess={onLogin} onRegister={() => setScreen("register")} onForgot={() => setScreen("forgot")} />}
        {screen === "register" && <RegisterForm onBack={() => setScreen("login")} onSuccess={onLogin} />}
        {screen === "forgot"   && <ForgotForm   onBack={() => setScreen("login")} />}
      </div>
    </div>
  );
}
