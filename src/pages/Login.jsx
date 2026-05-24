import { useState } from "react";
import { Wrench, CheckCircle2, Loader2 } from "lucide-react";
import { USERS, C, FONT, FONT_HEADING } from "../lib/constants";
import Avatar from "../components/Avatar";

export default function Login({ onLogin }) {
  const [sel, setSel]     = useState(null);
  const [loading, setLd]  = useState(false);

  async function submit() {
    if (!sel) return;
    setLd(true);
    await new Promise(r => setTimeout(r, 700));
    onLogin(sel);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: `linear-gradient(145deg, ${C.sidebar} 0%, #0a2540 60%, #1a3a5c 100%)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, fontFamily: FONT,
    }}>
      <div style={{
        animation: "fadeUp .4s ease",
        background: "#fff", borderRadius: 22,
        padding: "44px 40px 36px", width: 440,
        boxShadow: "0 32px 80px rgba(0,0,0,.35)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, background: C.accent, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Wrench size={22} color="#fff" />
          </div>
          <span style={{ fontFamily: FONT_HEADING, fontSize: 26, fontWeight: 800, color: C.text }}>SzakiFlow</span>
        </div>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 32 }}>
          Munkavégzési &amp; számlázási rendszer
        </p>

        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, color: C.muted, textTransform: "uppercase", marginBottom: 12 }}>
          Felhasználó kiválasztása
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {USERS.map(u => (
            <button key={u.id} onClick={() => setSel(u)} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "13px 16px", borderRadius: 12,
              border: `2px solid ${sel?.id === u.id ? C.accent : C.border}`,
              background: sel?.id === u.id ? C.accentLight : "#fff",
              cursor: "pointer", transition: "all .15s", fontFamily: FONT,
            }}>
              <Avatar u={u} size={42} />
              <div style={{ textAlign: "left", flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{u.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{u.role}</div>
              </div>
              {sel?.id === u.id && <CheckCircle2 size={18} color={C.accent} />}
            </button>
          ))}
        </div>

        <button onClick={submit} disabled={!sel || loading} style={{
          width: "100%", padding: 14, borderRadius: 12,
          border: "none", background: sel ? C.accent : "#E2E8F0",
          color: "#fff", fontWeight: 700, fontSize: 16,
          cursor: sel ? "pointer" : "default",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          fontFamily: FONT,
        }}>
          {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : "Belépés"}
        </button>

        <p style={{ textAlign: "center", fontSize: 12, color: C.muted, marginTop: 20 }}>
          🔒 Google Drive szinkronizáció aktív
        </p>
      </div>
    </div>
  );
}
