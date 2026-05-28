import { Sun, ChevronRight } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { getUsers } from "../lib/crmUsers";

// Login képernyőn az élő felhasználói lista jelenik meg (nem hardcode)
// Ha valaki nevet vált az AdminPanel-en, itt is azonnal frissül
function getLoginUsers() {
  return getUsers().map(({ passwordHash: _, ...u }) => u);
}

function Avatar({ u, size=46 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:u.color, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, fontSize:size*0.35, flexShrink:0 }}>
      {u.initials}
    </div>
  );
}

export default function Login({ onLogin }) {
  return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(145deg, ${C.sidebar} 0%, #0a2540 60%, #1a3a5c 100%)`, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:FONT }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={{ animation:"fadeUp .35s ease", background:"#fff", borderRadius:22, padding:"36px 32px", width:"100%", maxWidth:460, boxShadow:"0 32px 80px rgba(0,0,0,.35)" }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
          <div style={{ width:48, height:48, background:C.accent, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Sun size={26} color="#fff" />
          </div>
          <span style={{ fontFamily:FONT_HEADING, fontSize:26, fontWeight:800, color:C.text }}>CRM Napelem</span>
        </div>
        <p style={{ color:C.muted, fontSize:14, marginBottom:28 }}>Válassz felhasználót a belépéshez</p>

        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {getLoginUsers().map(u => (
            <button
              key={u.id}
              onClick={() => onLogin(u)}
              style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderRadius:14, border:`1.5px solid ${C.border}`, background:"#fff", cursor:"pointer", textAlign:"left", fontFamily:FONT, transition:"all .15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=u.color; e.currentTarget.style.background=u.color+"08"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor=C.border; e.currentTarget.style.background="#fff"; }}
            >
              <Avatar u={u} />
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:15, color:C.text }}>{u.name}</div>
                <div style={{ fontSize:12, color:C.muted, marginTop:2 }}>{u.role}</div>
              </div>
              <ChevronRight size={18} color={C.muted} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
