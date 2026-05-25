import { useState, useEffect } from "react";
import { C } from "./lib/constants";
import { SAMPLE_DATA } from "./lib/sampleData";
import { driveLoad } from "./lib/driveApi";
import { getAllowedPages, getHomePage, canCreateMunkalap } from "./lib/roles";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import { MunkalapLista, MunkalapDetail, UjMunkalapModal } from "./pages/Munkalapok";
import UjMunkalap from "./pages/UjMunkalap";
import Ugyfelek from "./pages/Ugyfelek";
import AdminPanel from "./pages/AdminPanel";
import MunkakiosztasBeallitasok from "./pages/MunkakiosztasBeallitasok";
import Munkakiosztas from "./pages/Munkakiosztas";
import ComingSoon from "./pages/ComingSoon";
import {
  LayoutDashboard, FileText, Users, ClipboardList,
  ScrollText, UserCheck, Calendar, Settings, LogOut, Sun, ChevronRight, Hammer,
} from "lucide-react";
import { FONT, FONT_HEADING } from "./lib/constants";
import Avatar from "./components/Avatar";

const PAGE_TITLES = {
  dashboard:"Irányítópult", munkalapok:"Munkalapok", ugyfelek:"Ügyfelek",
  munkakiosztas:"Munkakiosztás", arajanlatok:"Árajánlatok", szerzodesek:"Szerződések",
  csapat:"Csapat", naptar:"Naptár", beallitasok:"Beállítások",
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

const ALL_MOB_NAV = [
  { id:"dashboard",     label:"Irányítópult",  icon:LayoutDashboard, desc:"Összefoglaló & statisztikák" },
  { id:"munkalapok",    label:"Munkalapok",    icon:FileText,        desc:"Munkák kezelése" },
  { id:"munkakiosztas", label:"Munkakiosztás", icon:Hammer,          desc:"Excel import & csapat kiosztás" },
  { id:"ugyfelek",      label:"Ügyfelek",      icon:Users,           desc:"Ügyféladatbázis" },
  { id:"arajanlatok",   label:"Árajánlatok",   icon:ClipboardList,   desc:"Ajánlatok készítése" },
  { id:"szerzodesek",   label:"Szerződések",   icon:ScrollText,      desc:"Szerződések kezelése" },
  { id:"csapat",        label:"Csapat",        icon:UserCheck,       desc:"Munkatársak" },
  { id:"naptar",        label:"Naptár",        icon:Calendar,        desc:"Ütemezés & időpontok" },
  { id:"beallitasok",   label:"Beállítások",   icon:Settings,        desc:"Felhasználók & kiosztás" },
];

function MobileSidebarFull({ page, onNav, user, onLogout, allowedPages }) {
  const navItems = ALL_MOB_NAV.filter(n => allowedPages.includes(n.id));
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
        {navItems.map(({ id, label, icon:Icon, desc }) => {
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

function PageContent({ page, sel, setSel, data, user }) {
  const role = user?.role;
  if (page === "munkalapok" && sel) return <MunkalapDetail m={sel} data={data} userRole={role} />;
  if (page === "dashboard")     return <Dashboard data={data} user={user} />;
  if (page === "munkalapok")    return <MunkalapLista data={data} onSelect={setSel} onNew={() => setUjMunkalapPage(true)} userRole={role} />;
  if (page === "munkakiosztas") return <Munkakiosztas />;
  if (page === "ugyfelek")      return <Ugyfelek data={data} />;
  if (page === "beallitasok")   return <div><AdminPanel currentUser={user} /><div style={{ borderTop:`1px solid ${C.border}`, margin:"0 32px" }} /><MunkakiosztasBeallitasok /></div>;
  if (page === "arajanlatok")   return <ComingSoon title="Árajánlatok" />;
  if (page === "szerzodesek")   return <ComingSoon title="Szerződések" />;
  if (page === "csapat")        return <ComingSoon title="Csapat" />;
  if (page === "naptar")        return <ComingSoon title="Naptár" />;
  return null;
}

export default function App() {
  const [user,        setUser]        = useState(null);
  const [page,        setPage]        = useState("dashboard");
  const [sel,         setSel]         = useState(null);
  const [data,        setData]        = useState(SAMPLE_DATA);
  const [drive,       setDrive]       = useState("idle");
  const [showSidebar, setShowSidebar] = useState(true);
  const [ujMunkalapModal, setUjMunkalapModal] = useState(false);
  const [ujMunkalapPage, setUjMunkalapPage] = useState(false);
  const isMobile = useIsMobile();

  const allowedPages = user ? getAllowedPages(user.role) : [];

  function nav(p) {
    if (!allowedPages.includes(p)) return;
    setPage(p); setSel(null);
    if (isMobile) setShowSidebar(false);
  }

  useEffect(() => {
    if (!user) return;
    // Telepítő automatikusan a munkalapokra kerül
    const home = getHomePage(user.role);
    setPage(home);
    setShowSidebar(user.role === "Telepítő" ? false : true);

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

  function logout() { setUser(null); setSel(null); setPage("dashboard"); setShowSidebar(true); setData(SAMPLE_DATA); }

  function handleUjMunkalapSave(ml) {
    setData(prev => ({ ...prev, munkalapok: [ml, ...prev.munkalapok] }));
    setUjMunkalapModal(false);
  }

  if (!user) return <Login onLogin={setUser} />;

  const isMunkalapDetail = page === "munkalapok" && sel;
  const isTelepito = user.role === "Telepítő";

  // ── TELEPÍTŐ SPECIÁLIS NÉZET ─────────────────────────────
  // Telepítőnél a munkalap detail saját TopBar-ral jelenik meg
  if (isMobile) {
    // Új munkalap teljes képernyős oldal
    if (ujMunkalapPage) return (
      <div style={{ minHeight:"100vh", background:C.bg }}>
        <style>{gStyles}</style>
        <UjMunkalap data={data} onBack={() => setUjMunkalapPage(false)} onSave={ml => { handleUjMunkalapSave(ml); setUjMunkalapPage(false); }} />
      </div>
    );

    if (showSidebar && !isTelepito) {
      return (
        <div style={{ minHeight:"100vh", background:C.sidebar }}>
          <style>{gStyles}</style>
          <MobileSidebarFull page={page} onNav={nav} user={user} onLogout={logout} allowedPages={allowedPages} />
        </div>
      );
    }

    return (
      <div style={{ minHeight:"100vh", background: isMunkalapDetail ? "#2C4A6E" : C.bg }}>
        <style>{gStyles}</style>
        {/* Telepítőnél a munkalap detail saját fejléccel rendelkezik */}
        {isMunkalapDetail ? (
          <>
            {/* Vissza gomb felül */}
            <div style={{ background:"#2C4A6E", padding:"44px 16px 0", display:"flex", alignItems:"center", gap:10 }}>
              <button onClick={() => setSel(null)} style={{ border:"none", background:"none", color:"#94A3B8", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:13, fontFamily:FONT, fontWeight:600 }}>
                <span style={{ fontSize:18 }}>←</span> {isTelepito ? "Feladatok" : "Munkalapok"}
              </button>
              <span style={{ fontSize:13, color:"#94A3B8", marginLeft:"auto" }}>{sel.id}</span>
            </div>
            <MunkalapDetail m={sel} data={data} userRole={user.role} />
          </>
        ) : (
          <>
            {/* Telepítőnek nincs TopBar, csak a lista */}
            {isTelepito ? (
              <div>
                <div style={{ background:"#2C4A6E", padding:"44px 16px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <span style={{ fontFamily:FONT_HEADING, color:"#fff", fontWeight:800, fontSize:20 }}>Feladatok</span>
                  <button onClick={logout} style={{ border:"none", background:"rgba(255,255,255,0.1)", color:"#94A3B8", cursor:"pointer", borderRadius:8, padding:"6px 12px", fontSize:12, fontFamily:FONT }}>
                    Kilépés
                  </button>
                </div>
                <MunkalapLista data={data} onSelect={setSel} onNew={() => setUjMunkalapPage(true)} userRole={user.role} />
              </div>
            ) : (
              <>
                <TopBar title={PAGE_TITLES[page]} user={user} driveStatus={drive} onBack={() => setShowSidebar(true)} backLabel="Főmenü" isMobile />
                <PageContent page={page} sel={sel} setSel={setSel} data={data} user={user} />
              </>
            )}
          </>
        )}
      </div>
    );
  }

  // ── ASZTALI NÉZET ────────────────────────────────────────────
  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg }}>
      <style>{gStyles}</style>
      <Sidebar page={page} onNav={nav} user={user} onLogout={logout} allowedPages={allowedPages} />
      <div style={{ flex:1, overflow:"auto" }}>
        <TopBar
          title={isMunkalapDetail ? sel.id : PAGE_TITLES[page]}
          user={user} driveStatus={drive}
          onBack={isMunkalapDetail ? () => setSel(null) : undefined}
          backLabel="Munkalapok"
        />
        <PageContent page={page} sel={sel} setSel={setSel} data={data} user={user} />
      </div>
      {ujMunkalapModal && <UjMunkalapModal data={data} onClose={() => setUjMunkalapModal(false)} onSave={handleUjMunkalapSave} />}
      {ujMunkalapPage && (
        <div style={{ position:"fixed", inset:0, zIndex:50, background:C.bg, overflowY:"auto" }}>
          <UjMunkalap data={data} onBack={() => setUjMunkalapPage(false)} onSave={ml => { handleUjMunkalapSave(ml); setUjMunkalapPage(false); }} />
        </div>
      )}
    </div>
  );
}

const gStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; }
  button { font-family: 'DM Sans', sans-serif; }
  input, textarea { font-family: 'DM Sans', sans-serif; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }
`;
