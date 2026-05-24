import { useState, useEffect } from "react";
import { C } from "./lib/constants";
import { SAMPLE_DATA } from "./lib/sampleData";
import { driveLoad } from "./lib/driveApi";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import { MunkalapLista, MunkalapDetail } from "./pages/Munkalapok";
import Ugyfelek from "./pages/Ugyfelek";
import AdminPanel from "./pages/AdminPanel";
import ComingSoon from "./pages/ComingSoon";
import {
  LayoutDashboard, FileText, Users, ClipboardList,
  ScrollText, UserCheck, Calendar, Settings, LogOut, Sun, ChevronRight,
} from "lucide-react";
import { FONT, FONT_HEADING } from "./lib/constants";
import Avatar from "./components/Avatar";

const PAGE_TITLES = {
  dashboard:"Irányítópult", munkalapok:"Munkalapok", ugyfelek:"Ügyfelek",
  arajanlatok:"Árajánlatok", szerzodesek:"Szerződések", csapat:"Csapat",
  naptar:"Naptár", beallitasok:"Beállítások",
};

function useIsMobile() {
  const [mob, setMob] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mob;
}

const MOB_NAV = [
  { id:"dashboard",   label:"Irányítópult", icon:LayoutDashboard, desc:"Összefoglaló & statisztikák" },
  { id:"munkalapok",  label:"Munkalapok",   icon:FileText,        desc:"Munkák kezelése & számlázás" },
  { id:"ugyfelek",    label:"Ügyfelek",     icon:Users,           desc:"Ügyféladatbázis" },
  { id:"arajanlatok", label:"Árajánlatok",  icon:ClipboardList,   desc:"Ajánlatok készítése" },
  { id:"szerzodesek", label:"Szerződések",  icon:ScrollText,      desc:"Szerződések kezelése" },
  { id:"csapat",      label:"Csapat",       icon:UserCheck,       desc:"Munkatársak" },
  { id:"naptar",      label:"Naptár",       icon:Calendar,        desc:"Ütemezés & időpontok" },
  { id:"beallitasok", label:"Beállítások",  icon:Settings,        desc:"Felhasználók & beállítások" },
];

function MobileSidebarFull({ page, onNav, user, onLogout }) {
  return (
    <div style={{ minHeight:"100vh", background:C.sidebar, display:"flex", flexDirection:"column", fontFamily:FONT }}>
      <div style={{ padding:"52px 24px 24px", borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:48, height:48, background:C.accent, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Sun size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily:FONT_HEADING, color:"#fff", fontWeight:800, fontSize:22 }}>CRM Napelem</div>
            <div style={{ color:"#4a6a8a", fontSize:13 }}>Munkavégzési rendszer</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:20, padding:"12px 14px", background:"rgba(255,255,255,0.05)", borderRadius:14 }}>
          <Avatar u={user} size={40} />
          <div>
            <div style={{ color:"#fff", fontWeight:600, fontSize:15 }}>{user.name}</div>
            <div style={{ color:"#4a6a8a", fontSize:12 }}>{user.role}</div>
          </div>
        </div>
      </div>
      <nav style={{ flex:1, padding:"16px", overflowY:"auto" }}>
        <p style={{ fontSize:10, fontWeight:700, letterSpacing:1.5, color:"#3a5070", textTransform:"uppercase", marginBottom:10, paddingLeft:4 }}>Főmenü</p>
        {MOB_NAV.map(({ id, label, icon:Icon, desc }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => onNav(id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 16px", borderRadius:14, border:"none", background:active?"rgba(37,99,235,0.3)":"rgba(255,255,255,0.03)", cursor:"pointer", marginBottom:6, textAlign:"left", borderLeft:active?`3px solid ${C.accent}`:"3px solid transparent" }}>
              <div style={{ width:40, height:40, borderRadius:10, background:active?C.accent:"rgba(255,255,255,0.07)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <Icon size={19} color={active?"#fff":"#64748B"} />
              </div>
              <div style={{ flex:1 }}>
                <div style={{ color:active?"#93C5FD":"#CBD5E1", fontWeight:active?700:500, fontSize:15 }}>{label}</div>
                <div style={{ color:"#3a5070", fontSize:12 }}>{desc}</div>
              </div>
              <ChevronRight size={16} color={active?"#93C5FD":"#2a4060"} />
            </button>
          );
        })}
      </nav>
      <div style={{ padding:"16px 16px 36px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onLogout} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"14px 16px", borderRadius:12, border:"none", background:"rgba(220,38,38,0.1)", color:"#EF4444", cursor:"pointer", fontSize:15, fontFamily:FONT, fontWeight:500 }}>
          <LogOut size={18} />Kijelentkezés
        </button>
      </div>
    </div>
  );
}

function PageContent({ page, sel, setSel, data, user, drive }) {
  if (page === "munkalapok" && sel) return <MunkalapDetail m={sel} data={data} />;
  if (page === "dashboard")   return <Dashboard data={data} user={user} />;
  if (page === "munkalapok")  return <MunkalapLista data={data} onSelect={setSel} onNew={() => alert("Hamarosan: Új munkalap")} />;
  if (page === "ugyfelek")    return <Ugyfelek data={data} />;
  if (page === "beallitasok") return <AdminPanel currentUser={user} />;
  if (page === "arajanlatok") return <ComingSoon title="Árajánlatok" />;
  if (page === "szerzodesek") return <ComingSoon title="Szerződések" />;
  if (page === "csapat")      return <ComingSoon title="Csapat" />;
  if (page === "naptar")      return <ComingSoon title="Naptár" />;
  return null;
}

export default function App() {
  const [user,        setUser]        = useState(null);
  const [page,        setPage]        = useState("dashboard");
  const [sel,         setSel]         = useState(null);
  const [data,        setData]        = useState(SAMPLE_DATA);
  const [drive,       setDrive]       = useState("idle");
  const [showSidebar, setShowSidebar] = useState(true);
  const isMobile = useIsMobile();

  function nav(p) { setPage(p); setSel(null); if (isMobile) setShowSidebar(false); }

  useEffect(() => {
    if (!user) return;
    (async () => {
      setDrive("saving");
      const [ml, uk] = await Promise.all([driveLoad("munkalapok"), driveLoad("ugyfelek")]);
      if (ml || uk) setData(prev => ({
        ...prev,
        munkalapok: ml?.munkalapok || prev.munkalapok,
        ugyfelek:   uk?.ugyfelek   || prev.ugyfelek,
      }));
      setDrive("ok");
      setTimeout(() => setDrive("idle"), 2500);
    })();
  }, [user]);

  function logout() { setUser(null); setSel(null); setPage("dashboard"); setShowSidebar(true); }

  if (!user) return <Login onLogin={setUser} />;

  const topTitle = page === "munkalapok" && sel ? `${sel.id} – ${sel.title}` : PAGE_TITLES[page];
  const topBack  = page === "munkalapok" && sel ? () => setSel(null) : isMobile ? () => setShowSidebar(true) : undefined;
  const topBackLabel = page === "munkalapok" && sel ? "Munkalapok" : "Főmenü";

  if (isMobile) {
    if (showSidebar) return (
      <div style={{ minHeight:"100vh", background:C.sidebar }}>
        <style>{gStyles}</style>
        <MobileSidebarFull page={page} onNav={nav} user={user} onLogout={logout} />
      </div>
    );
    return (
      <div style={{ minHeight:"100vh", background:C.bg }}>
        <style>{gStyles}</style>
        <TopBar title={topTitle} user={user} driveStatus={drive} onBack={topBack} backLabel={topBackLabel} isMobile />
        <PageContent page={page} sel={sel} setSel={setSel} data={data} user={user} drive={drive} />
      </div>
    );
  }

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg }}>
      <style>{gStyles}</style>
      <Sidebar page={page} onNav={p => { setPage(p); setSel(null); }} user={user} onLogout={logout} />
      <div style={{ flex:1, overflow:"auto" }}>
        <TopBar title={topTitle} user={user} driveStatus={drive} onBack={page === "munkalapok" && sel ? () => setSel(null) : undefined} backLabel="Munkalapok" />
        <PageContent page={page} sel={sel} setSel={setSel} data={data} user={user} drive={drive} />
      </div>
    </div>
  );
}

const gStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; }
  button { font-family: 'DM Sans', sans-serif; }
  input { font-family: 'DM Sans', sans-serif; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
`;
