import { useState } from "react";
import { Eye, EyeOff, Pencil, Check, X, Copy, RefreshCw, ShieldCheck, User, Lock, Plus, Trash2, AlertTriangle, UserPlus } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { getUsers, saveUsersLocal, hashPw } from "../lib/crmUsers";
import { loadLocal, saveLocal } from "../lib/localDb";
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
function UserRow({ user, onSave, onDelete }) {
  const [editing,  setEditing]  = useState(false);
  const [name,     setName]     = useState(user.name);
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
    if (!username.trim() || !name.trim()) return;
    setSaving(true);
    const updates = {
      name:     name.trim(),
      username: username.trim(),
      initials: name.trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(),
    };
    if (newPw.trim()) {
      if (newPw.trim().length < 4) { setSaving(false); return; }
      updates.passwordHash = await hashPw(newPw.trim());
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
    setName(user.name);
    setUsername(user.username);
    setNewPw("");
  }

  return (
    <div style={{ borderBottom: `1px solid ${C.border}`, padding: "16px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar initials={user.initials} color={user.color} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{name}</div>
          <div style={{ fontSize: 11, color: user.color, fontWeight: 600 }}>{user.role}</div>
        </div>

        {!editing ? (
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: "#fff", color: C.textSub, cursor: "pointer", fontSize: 13, fontFamily: FONT }}>
              <Pencil size={14} /> Szerkesztés
            </button>
            {onDelete && (
              <button onClick={() => onDelete(user)} title="Felhasználó törlése" style={{ padding: "7px 10px", borderRadius: 8, border: "none", background: C.dangerLight, color: C.danger, cursor: "pointer", display:"flex", alignItems:"center" }}>
                <Trash2 size={14}/>
              </button>
            )}
          </div>
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
            <b style={{ color: C.text, fontFamily: "monospace", letterSpacing: 2 }}>••••••••</b>
            <span style={{ fontSize: 11, color: C.muted, marginLeft: 4 }}>– módosításhoz kattints Szerkesztésre</span>
          </div>
        </div>
      )}

      {/* Szerkesztő form */}
      {editing && (
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {/* Teljes Név – ez jelenik meg a login képernyőn és a rendszerben */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>
              Teljes neve <span style={{ color: C.danger, fontWeight: 700 }}>*</span>
              <span style={{ color: C.muted, fontWeight: 400, textTransform: "none", marginLeft: 8 }}>– ez jelenik meg a login képernyőn és a munkalapokban</span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg, border: `2px solid ${C.accent}`, borderRadius: 10, padding: "0 12px" }}>
              <User size={14} color={C.accent} />
              <input value={name} onChange={e => setName(e.target.value)} placeholder="pl. Nagy Péter"
                style={{ flex: 1, border: "none", outline: "none", fontSize: 14, padding: "10px 0", fontFamily: FONT, background: "transparent", color: C.text, fontWeight: 600 }} />
            </div>
          </div>

          {/* Felhasználónév */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .8, display: "block", marginBottom: 6 }}>Bejelentkezési név</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "0 12px" }}>
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
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "0 12px" }}>
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
const SZEREPKOROK = ["Telepítő","Projektmenedzser","Admin","Iroda/Könyvelés"];
const SZINEK = [C.success,C.accent,"#9333EA",C.warning,"#0891B2",C.danger,C.warning,"#0EA5E9"];

export default function AdminPanel({ currentUser }) {
  const [users,      setUsers]      = useState(getUsers());
  const [toast,      setToast]      = useState("");
  const [ujModal,    setUjModal]    = useState(false);
  const [ujForm,     setUjForm]     = useState({ name:"", username:"", role:"Telepítő", password:"", szin:C.success });
  const [ujHiba,     setUjHiba]     = useState("");
  const [torles,     setTorles]     = useState(null);
  const [ujJelszo,   setUjJelszo]   = useState(null); // { name, username, password } – csak mentés pillanatában

  const isAdmin = currentUser?.role === "Admin";

  async function handleSave(userId, updates) {
    const updated = users.map(u => u.id === userId ? { ...u, ...updates } : u);
    setUsers(updated);
    saveUsersLocal(updated); // saveUsersLocal most már dispatch-el crm-db-updated "users" event-et
    // Frissítsük a munkalapokat is ahol ez a user assigneeNev-ként szerepel (ha nevét változtatta)
    if (updates.name) {
      const oldUser = users.find(u => u.id === userId);
      if (oldUser && oldUser.name !== updates.name) {
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

  async function handleUjUser() {
    setUjHiba("");
    const { name, username, role, password, szin } = ujForm;
    if (!name.trim())     { setUjHiba("A teljes neve kötelező!"); return; }
    if (!username.trim()) { setUjHiba("A bejelentkezési név kötelező!"); return; }
    if (!password.trim() || password.trim().length < 4) { setUjHiba("Minimum 4 karakteres jelszó szükséges!"); return; }
    if (users.find(u => u.username.toLowerCase() === username.trim().toLowerCase())) {
      setUjHiba("Ez a bejelentkezési név már foglalt!"); return;
    }
    const rawPw   = password.trim();
    const pwHash  = await hashPw(rawPw);
    const initials = name.trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
    const newUser = {
      id:           "u" + Date.now(),
      name:         name.trim(),
      username:     username.trim().toLowerCase(),
      role,
      color:        szin,
      initials,
      passwordHash: pwHash,
      // defaultPassword szándékosan NEM kerül tárolásra – csak az alábbi state-ben él
    };
    const updated = [...users, newUser];
    setUsers(updated);
    saveUsersLocal(updated);
    setUjModal(false);
    setUjForm({ name:"", username:"", role:"Telepítő", password:"", szin:C.success });
    // Jelszó egyszeri megmutatása – nem kerül Drive-ra / localStorage-ba
    setUjJelszo({ name: name.trim(), username: username.trim().toLowerCase(), password: rawPw });
    setToast("Új felhasználó sikeresen hozzáadva!");
    setTimeout(() => setToast(""), 3000);
  }

  function handleTorles(user) {
    if (user.id === currentUser?.id) {
      setToast("Saját magadat nem törölheted!"); setTimeout(()=>setToast(""),3000); return;
    }
    setTorles(user);
  }

  function confirmTorles() {
    if (!torles) return;
    const updated = users.filter(u => u.id !== torles.id);
    setUsers(updated);
    saveUsersLocal(updated);
    setTorles(null);
    setToast(torles.name + " törölve!");
    setTimeout(() => setToast(""), 3000);
  }

  function copyAllCredentials() {
    const text = users.map(u =>
      `${u.name}\n  Felhasználónév: ${u.username}\n  Szerepkör: ${u.role}`
    ).join("\n\n");
    navigator.clipboard?.writeText(text);
    setToast("Felhasználói adatok vágólapra másolva!");
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
          {isAdmin && <p style={{ fontSize: 13, color: C.muted }}>Nevek, jelszavak módosítása · Új csapat/felhasználó hozzáadása</p>}
        </div>
        {isAdmin && (
          <button onClick={()=>setUjModal(true)} style={{ display:"flex", alignItems:"center", gap:6, padding:"9px 18px", background:C.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:FONT }}>
            <UserPlus size={15}/> Új felhasználó / Csapat
          </button>
        )}
        <button onClick={copyAllCredentials} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", background: C.accentLight, color: C.accent, border: `1px solid ${C.accent}30`, borderRadius: 10, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT }}>
            <Copy size={15} /> Összes adat másolása
          </button>
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
            <UserRow key={u.id} user={u} onSave={handleSave} onDelete={isAdmin ? handleTorles : null} />
          ))}
          <div style={{ padding: "16px 0 8px" }}>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
              💡 <b>Drive szinkron:</b> A változtatások azonnal érvényesek, és a következő Drive mentéskor (<b>Beállítások → Drive teljes mentés</b>) szinkronizálódnak minden eszközre.
              A jelszavak titkosítva (SHA-256) kerülnek mentésre — plain text soha nem kerül Drive-ra.
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

      {/* ════ ÚJ FELHASZNÁLÓ MODAL ════ */}
      {ujModal && (
        <div style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:440, padding:"28px 24px", fontFamily:FONT }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <h3 style={{ fontFamily:FONT_HEADING, fontSize:18, fontWeight:800, color:C.text, margin:0 }}>
                👤 Új felhasználó / Csapat
              </h3>
              <button onClick={()=>{setUjModal(false);setUjHiba("");}} style={{ border:"none", background:"none", cursor:"pointer", color:C.muted }}>
                <X size={20}/>
              </button>
            </div>

            {ujHiba && (
              <div style={{ background:C.dangerLight, border:"1.5px solid #FECACA", borderRadius:9, padding:"9px 12px", marginBottom:14, fontSize:13, color:C.danger, fontWeight:600, display:"flex", gap:8 }}>
                <AlertTriangle size={16} style={{flexShrink:0}}/> {ujHiba}
              </div>
            )}

            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              {/* Teljes neve */}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, display:"block", marginBottom:6 }}>
                  Teljes neve <span style={{ color:C.danger }}>*</span>
                  <span style={{ color:C.muted, fontWeight:400, textTransform:"none", marginLeft:6 }}>– ez jelenik meg mindenhol</span>
                </label>
                <input value={ujForm.name} onChange={e=>setUjForm(p=>({...p, name:e.target.value}))}
                  placeholder="pl. Kovács Péter" autoFocus
                  style={{ width:"100%", boxSizing:"border-box", padding:"10px 14px", border:`2px solid ${C.accent}`, borderRadius:10, fontSize:14, fontFamily:FONT, outline:"none", fontWeight:600 }}/>
              </div>

              {/* Bejelentkezési név */}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, display:"block", marginBottom:6 }}>Bejelentkezési név <span style={{ color:C.danger }}>*</span></label>
                <input value={ujForm.username} onChange={e=>setUjForm(p=>({...p, username:e.target.value.toLowerCase()}))}
                  placeholder="pl. kovacspeter"
                  style={{ width:"100%", boxSizing:"border-box", padding:"10px 14px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:14, fontFamily:FONT, outline:"none" }}/>
              </div>

              {/* Szerepkör */}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, display:"block", marginBottom:6 }}>Szerepkör</label>
                <select value={ujForm.role} onChange={e=>setUjForm(p=>({...p, role:e.target.value}))}
                  style={{ width:"100%", padding:"10px 14px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:14, fontFamily:FONT, outline:"none", background:C.bg }}>
                  {SZEREPKOROK.map(r=><option key={r}>{r}</option>)}
                </select>
              </div>

              {/* Jelszó */}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, display:"block", marginBottom:6 }}>Jelszó <span style={{ color:C.danger }}>*</span></label>
                <div style={{ display:"flex", gap:8 }}>
                  <input value={ujForm.password} onChange={e=>setUjForm(p=>({...p, password:e.target.value}))}
                    placeholder="Min. 4 karakter"
                    style={{ flex:1, padding:"10px 14px", border:`1.5px solid ${C.border}`, borderRadius:10, fontSize:14, fontFamily:FONT, outline:"none" }}/>
                  <button onClick={()=>setUjForm(p=>({...p, password:genPassword()}))}
                    style={{ padding:"0 12px", borderRadius:10, border:`1.5px solid ${C.border}`, background:"#fff", color:C.textSub, cursor:"pointer", fontSize:12, fontFamily:FONT, whiteSpace:"nowrap", display:"flex", alignItems:"center", gap:4 }}>
                    <RefreshCw size={13}/> Generál
                  </button>
                </div>
                {ujForm.password && <p style={{ fontSize:11, color:C.muted, marginTop:4 }}>💡 Jegyezd fel a jelszót!</p>}
              </div>

              {/* Szín */}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, display:"block", marginBottom:8 }}>Avatar szín</label>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  {SZINEK.map(szin=>(
                    <button key={szin} onClick={()=>setUjForm(p=>({...p, szin}))}
                      style={{ width:32, height:32, borderRadius:"50%", background:szin, border:`3px solid ${ujForm.szin===szin?C.text:"transparent"}`, cursor:"pointer" }}/>
                  ))}
                </div>
              </div>

              {/* Előnézet */}
              {ujForm.name && (
                <div style={{ background:C.bg, borderRadius:10, padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:38, height:38, borderRadius:"50%", background:ujForm.szin, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:14, flexShrink:0 }}>
                    {ujForm.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontWeight:700, fontSize:14, color:C.text, margin:0 }}>{ujForm.name}</p>
                    <p style={{ fontSize:11, color:ujForm.szin, fontWeight:600, margin:0 }}>{ujForm.role}</p>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display:"flex", gap:10, marginTop:20 }}>
              <button onClick={()=>{setUjModal(false);setUjHiba("");}} style={{ flex:1, padding:"11px", borderRadius:9, border:`1.5px solid ${C.border}`, background:"#fff", fontWeight:600, fontSize:14, cursor:"pointer", fontFamily:FONT }}>Mégse</button>
              <button onClick={handleUjUser} style={{ flex:2, padding:"11px", borderRadius:9, border:"none", background:C.accent, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:FONT, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                <Plus size={16}/> Felhasználó létrehozása
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════ TÖRLÉS MEGERŐSÍTŐ MODAL ════ */}
      {torles && (
        <div style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:380, padding:"28px 24px", fontFamily:FONT, textAlign:"center" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:C.dangerLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <Trash2 size={26} color={C.danger}/>
            </div>
            <h3 style={{ fontSize:18, fontWeight:800, color:C.text, marginBottom:8 }}>Felhasználó törlése</h3>
            <p style={{ fontSize:13, color:C.textSub, marginBottom:6 }}>
              Biztosan törlöd <strong>{torles.name}</strong> felhasználót?
            </p>
            <p style={{ fontSize:12, color:C.danger, fontWeight:600, marginBottom:20 }}>
              ⚠️ Ez nem visszavonható! A hozzárendelt munkalapok megmaradnak, csak a belépési jog szűnik meg.
            </p>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setTorles(null)} style={{ flex:1, padding:"11px", borderRadius:9, border:`1.5px solid ${C.border}`, background:"#fff", fontWeight:600, cursor:"pointer", fontFamily:FONT }}>Mégse</button>
              <button onClick={confirmTorles} style={{ flex:1, padding:"11px", borderRadius:9, border:"none", background:C.danger, color:"#fff", fontWeight:700, cursor:"pointer", fontFamily:FONT }}>Törlöm</button>
            </div>
          </div>
        </div>
      )}

      {/* ════ ÚJ JELSZÓ EGYSZERI MEGMUTATÁSA ════ */}
      {ujJelszo && (
        <div style={{ position:"fixed", inset:0, zIndex:2100, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:400, padding:"28px 24px", fontFamily:FONT, textAlign:"center" }}>
            <div style={{ width:56, height:56, borderRadius:"50%", background:C.successLight, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
              <ShieldCheck size={26} color={C.success}/>
            </div>
            <h3 style={{ fontSize:18, fontWeight:800, color:C.text, marginBottom:6 }}>Felhasználó létrehozva!</h3>
            <p style={{ fontSize:13, color:C.textSub, marginBottom:16 }}>
              Add át <b>{ujJelszo.name}</b> részére személyesen az alábbi adatokat. Ez az ablak <b>bezárás után nem mutatható újra</b>.
            </p>
            <div style={{ background:C.bg, border:`1.5px solid ${C.border}`, borderRadius:12, padding:"16px", marginBottom:16, textAlign:"left" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                <span style={{ fontSize:12, color:C.muted, fontWeight:600 }}>BELÉPÉSI ADATOK</span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(`Felhasználónév: ${ujJelszo.username}\nJelszó: ${ujJelszo.password}`);
                    setToast("Vágólapra másolva!"); setTimeout(()=>setToast(""),2000);
                  }}
                  style={{ display:"flex", alignItems:"center", gap:4, border:`1px solid ${C.border}`, background:"#fff", borderRadius:7, padding:"4px 10px", cursor:"pointer", fontSize:12, color:C.textSub, fontFamily:FONT }}
                >
                  <Copy size={13}/> Másolás
                </button>
              </div>
              <p style={{ margin:"4px 0", fontSize:14 }}><b>Felhasználónév:</b> {ujJelszo.username}</p>
              <p style={{ margin:"4px 0", fontSize:14 }}><b>Jelszó:</b> <span style={{ fontFamily:"monospace", fontSize:16, color:C.text, letterSpacing:1 }}>{ujJelszo.password}</span></p>
            </div>
            <p style={{ fontSize:11, color:C.danger, fontWeight:600, marginBottom:16 }}>
              ⚠️ A jelszó NEM kerül tárolásra – bezárás után nem megjeleníthető. Ha elvész, generálj újat.
            </p>
            <button onClick={() => setUjJelszo(null)} style={{ width:"100%", padding:"12px", borderRadius:10, border:"none", background:C.accent, color:"#fff", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:FONT }}>
              Megértettem, bezárom
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
