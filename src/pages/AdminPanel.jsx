import { useState } from "react";
import { Eye, EyeOff, Pencil, Check, X, Copy, RefreshCw, ShieldCheck, User, Lock } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { getUsers, saveUsersLocal, hashPw } from "../lib/crmUsers";
import Card from "../components/Card";

function Avatar({ initials, color, size = 40 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.35, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// Véletlen jelszó generátor
function genPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// ─── Egy felhasználó sor ─────────────────────────────────────
function UserRow({ user, onSave }) {
  const [editing,  setEditing]  = useState(false);
  const [username, setUsername] = useState(user.username);
  const [newPw,    setNewPw]    = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [copied,   setCopied]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState("");

  function copyToClipboard(text) {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function save() {
    if (!username.trim()) return;
    setSaving(true);
    const updates = { username: username.trim() };
    if (newPw.trim()) {
      if (newPw.trim().length < 4) { setSaving(false); return; }
      updates.passwordHash    = await hashPw(newPw.trim());
      updates.defaultPassword = newPw.trim();
    }
    await onSave(user.id, updates);
    setSaving(false);
    setEditing(false);
    setNewPw("");
    setSuccess("Mentve! ✓");
    setTimeout(() => setSuccess(""), 2500);
  }

  function cancel() {
    setEditing(false);
    setUsername(user.username);
    setNewPw("");
  }

  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar initials={user.initials} color={user.color} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{user.name}</div>
          <div style={{ fontSize: 11, color: user.color, fontWeight: 600 }}>{user.role}</div>
        </div>

        {!editing ? (
          <button onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.textSub, cursor: "pointer", fontSize: 13, fontFamily: FONT }}>
            <Pencil size={14} /> Szerkesztés
          </button>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={save} disabled={saving} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: C.success, color: "#fff", cursor: "pointer", fontSize: 13, fontFamily: FONT, display: "flex", alignItems: "center", gap: 4 }}>
              <Check size={14} /> Mentés
            </button>
            <button onClick={cancel} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.textSub, cursor: "pointer", fontSize: 13, fontFamily: FONT }}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {success && <div style={{ marginTop: 10, fontSize: 13, color: C.success, fontWeight: 600 }}>✅ {success}</div>}

      {/* Jelenlegi adatok (csak admin látja) */}
      {!editing && (
        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.bg, borderRadius: 8, padding: "6px 12px", fontSize: 13 }}>
            <User size={13} color={C.muted} />
            <span style={{ color: C.textSub }}>Felhasználónév:</span>
            <b style={{ color: C.text }}>{user.username}</b>
            <button onClick={() => copyToClipboard(user.username)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, marginLeft: 2 }}>
              {copied ? <Check size={13} color={C.success} /> : <Copy size={13} color={C.muted} />}
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.bg, borderRadius: 8, padding: "6px 12px", fontSize: 13 }}>
            <Lock size={13} color={C.muted} />
            <span style={{ color: C.textSub }}>Jelszó:</span>
            <b style={{ color: C.text, fontFamily: showPw ? FONT : "monospace", letterSpacing: showPw ? 0 : 2 }}>
              {showPw ? (user.defaultPassword || "••••••••") : "••••••••"}
            </b>
            <button onClick={() => setShowPw(p => !p)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>
              {showPw ? <EyeOff size={13} color={C.muted} /> : <Eye size={13} color={C.muted} />}
            </button>
            {showPw && user.defaultPassword && (
              <button onClick={() => copyToClipboard(user.defaultPassword)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>
                <Copy size={13} color={C.muted} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Szerkesztő form */}
      {editing && (
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {/* Felhasználónév */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>Felhasználónév</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F8FAFC", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "0 12px" }}>
              <User size={14} color={C.muted} />
              <input value={username} onChange={e => setUsername(e.target.value)} style={{ flex: 1, border: "none", outline: "none", fontSize: 14, padding: "10px 0", fontFamily: FONT, background: "transparent", color: C.text }} />
            </div>
          </div>

          {/* Új jelszó */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>
              Új jelszó <span style={{ color: C.muted, fontWeight: 400, textTransform: "none" }}>(hagyd üresen ha nem változtatod)</span>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#F8FAFC", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "0 12px" }}>
                <Lock size={14} color={C.muted} />
                <input
                  type={showPw ? "text" : "password"}
                  value={newPw} onChange={e => setNewPw(e.target.value)}
                  placeholder="Új jelszó..."
                  style={{ flex: 1, border: "none", outline: "none", fontSize: 14, padding: "10px 0", fontFamily: FONT, background: "transparent", color: C.text }}
                />
                <button onClick={() => setShowPw(p => !p)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0 }}>
                  {showPw ? <EyeOff size={14} color={C.muted} /> : <Eye size={14} color={C.muted} />}
                </button>
              </div>
              <button
                onClick={() => { const pw = genPassword(); setNewPw(pw); setShowPw(true); }}
                title="Véletlen jelszó generálása"
                style={{ padding: "0 12px", borderRadius: 10, border: `1.5px solid ${C.border}`, background: "#fff", color: C.textSub, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontFamily: FONT, whiteSpace: "nowrap" }}
              >
                <RefreshCw size={14} /> Generál
              </button>
            </div>
            {newPw && <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>💡 Jegyezd fel és add át a felhasználónak!</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// FŐ ADMIN PANEL
// ════════════════════════════════════════════════════════
export default function AdminPanel({ currentUser }) {
  const [users, setUsers] = useState(getUsers());
  const [toast, setToast] = useState("");

  const isAdmin = currentUser?.role === "Admin";

  async function handleSave(userId, updates) {
    const updated = users.map(u => u.id === userId ? { ...u, ...updates } : u);
    setUsers(updated);
    saveUsersLocal(updated); // saveUsersLocal most már dispatch-el crm-db-updated "users" event-et
    // Frissítsük a munkalapokat is ahol ez a user assigneeNev-ként szerepel (ha nevét változtatta)
    if (updates.name) {
      const oldUser = users.find(u => u.id === userId);
      if (oldUser && oldUser.name !== updates.name) {
        const { loadLocal, saveLocal } = await import("../lib/localDb");
        const mls = loadLocal("munkalapok") || [];
        const updatedMls = mls.map(m => {
          if (m.assigneeId === userId || m.assigneeNev === oldUser.name) {
            return { ...m, assigneeNev: updates.name, csapatNev: updates.name };
          }
          return m;
        });
        saveLocal("munkalapok", updatedMls);
        window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "munkalapok" } }));
      }
    }
    setToast("Változtatások elmentve!");
    setTimeout(() => setToast(""), 3000);
  }

  function copyAllCredentials() {
    const text = users.map(u =>
      `${u.name}\n  Felhasználónév: ${u.username}\n  Jelszó: ${u.defaultPassword || "(nincs megjelenítve)"}\n  Szerepkör: ${u.role}`
    ).join("\n\n");
    navigator.clipboard?.writeText(text);
    setToast("Összes adat vágólapra másolva!");
    setTimeout(() => setToast(""), 3000);
  }

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, background: C.success, color: "#fff", padding: "12px 20px", borderRadius: 12, fontWeight: 600, fontSize: 14, zIndex: 999, boxShadow: "0 4px 20px rgba(0,0,0,.2)" }}>
          ✅ {toast}
        </div>
      )}

      {/* Fejléc */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 4 }}>
            {isAdmin ? "Felhasználók kezelése" : "Beállítások"}
          </h2>
          {isAdmin && <p style={{ fontSize: 13, color: C.muted }}>Felhasználónevek és jelszavak megtekintése, módosítása</p>}
        </div>
        {isAdmin && (
          <button onClick={copyAllCredentials} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", background: C.accentLight, color: C.accent, border: `1px solid ${C.accent}30`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT }}>
            <Copy size={15} /> Összes adat másolása
          </button>
        )}
      </div>

      {/* Admin nézet */}
      {isAdmin ? (
        <Card style={{ padding: "8px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0 16px", borderBottom: `2px solid ${C.border}`, marginBottom: 4 }}>
            <ShieldCheck size={18} color={C.accent} />
            <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Admin vezérlőpult</span>
            <span style={{ fontSize: 12, color: C.muted, marginLeft: 4 }}>— csak te látod ezt a részt</span>
          </div>
          {users.map(u => (
            <UserRow key={u.id} user={u} onSave={handleSave} />
          ))}
          <div style={{ padding: "16px 0 8px" }}>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              💡 <b>Fontos:</b> A változtatások ezen az eszközön (böngészőn) azonnal érvényesek.
              Ha más eszközön is érvényesíteni akarod, szólj a fejlesztőnek — a kód frissítése után mindenhol működik.
            </p>
          </div>
        </Card>
      ) : (
        <Card style={{ padding: "32px", textAlign: "center" }}>
          <ShieldCheck size={40} color={C.muted} style={{ opacity: .3, display: "block", margin: "0 auto 12px" }} />
          <p style={{ color: C.muted, fontSize: 14 }}>
            A felhasználók kezelése csak az <b>Admin</b> szerepkörrel érhető el.
          </p>
        </Card>
      )}
    </div>
  );
}
