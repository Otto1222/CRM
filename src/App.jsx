import { useState, useEffect } from "react";
import { C } from "./lib/constants";
import { SAMPLE_DATA } from "./lib/sampleData";
import { driveLoad, driveSave } from "./lib/driveApi";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import { MunkalapLista, MunkalapDetail } from "./pages/Munkalapok";
import Ugyfelek from "./pages/Ugyfelek";
import ComingSoon from "./pages/ComingSoon";

const PAGE_TITLES = {
  dashboard:   "Irányítópult",
  munkalapok:  "Munkalapok",
  ugyfelek:    "Ügyfelek",
  arajanlatok: "Árajánlatok",
  szerzodesek: "Szerződések",
  csapat:      "Csapat",
  naptar:      "Naptár",
  beallitasok: "Beállítások",
};

// Detektáljuk hogy mobilon vagyunk-e
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return isMobile;
}

export default function App() {
  const [user,         setUser]        = useState(null);
  const [page,         setPage]        = useState("dashboard");
  const [sel,          setSel]         = useState(null);
  const [data,         setData]        = useState(SAMPLE_DATA);
  const [drive,        setDrive]       = useState("idle");
  // Mobilon: mutatjuk-e a sidebar-t (alapból igen, oldalra lépéskor nem)
  const [showSidebar,  setShowSidebar] = useState(true);
  const isMobile = useIsMobile();

  // Mobilon navigáláskor elrejti a sidebar-t
  function nav(p) {
    setPage(p);
    setSel(null);
    if (isMobile) setShowSidebar(false);
  }

  // Vissza a főmenübe (mobil)
  function goHome() {
    setShowSidebar(true);
    setSel(null);
  }

  // Drive betöltés
  useEffect(() => {
    if (!user) return;
    (async () => {
      setDrive("saving");
      const [ml, uk] = await Promise.all([
        driveLoad("munkalapok"),
        driveLoad("ugyfelek"),
      ]);
      if (ml || uk) {
        setData(prev => ({
          ...prev,
          munkalapok: ml?.munkalapok || prev.munkalapok,
          ugyfelek:   uk?.ugyfelek   || prev.ugyfelek,
        }));
      }
      setDrive("ok");
      setTimeout(() => setDrive("idle"), 2500);
    })();
  }, [user]);

  function logout() {
    setUser(null);
    setSel(null);
    setPage("dashboard");
    setData(SAMPLE_DATA);
    setShowSidebar(true);
  }

  if (!user) return <Login onLogin={setUser} />;

  // ── MOBIL LAYOUT ─────────────────────────────────────────────
  if (isMobile) {
    // Főmenü nézet
    if (showSidebar) {
      return (
        <div style={{ minHeight: "100vh", background: C.sidebar }}>
          <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap'); *{box-sizing:border-box;margin:0;padding:0} button{font-family:'DM Sans',sans-serif} @keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
          <MobileSidebarFull page={page} onNav={nav} user={user} onLogout={logout} />
        </div>
      );
    }

    // Oldal nézet (teljes képernyő)
    return (
      <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap'); *{box-sizing:border-box;margin:0;padding:0} button{font-family:'DM Sans',sans-serif} @keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>

        {page === "munkalapok" && sel ? (
          <>
            <TopBar
              title={sel.id}
              user={user}
              driveStatus={drive}
              onBack={() => setSel(null)}
              backLabel="Munkalapok"
              mobileGoHome={goHome}
              isMobile
            />
            <MunkalapDetail m={sel} data={data} />
          </>
        ) : (
          <>
            <TopBar
              title={PAGE_TITLES[page]}
              user={user}
              driveStatus={drive}
              onBack={goHome}
              backLabel="Főmenü"
              isMobile
            />
            <div style={{ animation: "fadeIn .2s ease" }}>
              {page === "dashboard"   && <Dashboard data={data} user={user} />}
              {page === "munkalapok"  && <MunkalapLista data={data} onSelect={m => { setSel(m); }} onNew={() => alert("Hamarosan: Új munkalap")} />}
              {page === "ugyfelek"    && <Ugyfelek data={data} />}
              {page === "arajanlatok" && <ComingSoon title="Árajánlatok" />}
              {page === "szerzodesek" && <ComingSoon title="Szerződések" />}
              {page === "csapat"      && <ComingSoon title="Csapat" />}
              {page === "naptar"      && <ComingSoon title="Naptár" />}
              {page === "beallitasok" && <ComingSoon title="Beállítások" />}
            </div>
          </>
        )}
      </div>
    );
  }

  // ── ASZTALI LAYOUT ───────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap'); *{box-sizing:border-box;margin:0;padding:0} button{font-family:'DM Sans',sans-serif} @keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}} ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:4px}`}</style>

      <Sidebar page={page} onNav={p => { setPage(p); setSel(null); }} user={user} onLogout={logout} />

      <div style={{ flex: 1, overflow: "auto", animation: "fadeIn .25s ease" }}>
        {page === "munkalapok" && sel ? (
          <>
            <TopBar title={`${sel.id} – ${sel.title}`} user={user} driveStatus={drive} onBack={() => setSel(null)} backLabel="Munkalapok" />
            <MunkalapDetail m={sel} data={data} />
          </>
        ) : (
          <>
            <TopBar title={PAGE_TITLES[page]} user={user} driveStatus={drive} />
            {page === "dashboard"   && <Dashboard data={data} user={user} />}
            {page === "munkalapok"  && <MunkalapLista data={data} onSelect={setSel} onNew={() => alert("Hamarosan: Új munkalap")} />}
            {page === "ugyfelek"    && <Ugyfelek data={data} />}
            {page === "arajanlatok" && <ComingSoon title="Árajánlatok" />}
            {page === "szerzodesek" && <ComingSoon title="Szerződések" />}
            {page === "csapat"      && <ComingSoon title="Csapat" />}
            {page === "naptar"      && <ComingSoon title="Naptár" />}
            {page === "beallitasok" && <ComingSoon title="Beállítások" />}
          </>
        )}
      </div>
    </div>
  );
}

// ── MOBIL TELJES KÉPERNYŐS MENÜ ───────────────────────────────
import {
  LayoutDashboard, FileText, Users, ClipboardList,
  ScrollText, UserCheck, Calendar, Settings, LogOut, Sun,
  ChevronRight,
} from "lucide-react";
import { FONT, FONT_HEADING } from "./lib/constants";
import Avatar from "./components/Avatar";

const MOB_NAV = [
  { id: "dashboard",   label: "Irányítópult", icon: LayoutDashboard, desc: "Összefoglaló & statisztikák" },
  { id: "munkalapok",  label: "Munkalapok",   icon: FileText,        desc: "Munkák kezelése & számlázás" },
  { id: "ugyfelek",    label: "Ügyfelek",     icon: Users,           desc: "Ügyféladatbázis" },
  { id: "arajanlatok", label: "Árajánlatok",  icon: ClipboardList,   desc: "Ajánlatok készítése" },
  { id: "szerzodesek", label: "Szerződések",  icon: ScrollText,      desc: "Szerződések kezelése" },
  { id: "csapat",      label: "Csapat",       icon: UserCheck,       desc: "Munkatársak" },
  { id: "naptar",      label: "Naptár",       icon: Calendar,        desc: "Ütemezés & időpontok" },
  { id: "beallitasok", label: "Beállítások",  icon: Settings,        desc: "Rendszerbeállítások" },
];

function MobileSidebarFull({ page, onNav, user, onLogout }) {
  return (
    <div style={{ minHeight: "100vh", background: C.sidebar, display: "flex", flexDirection: "column", fontFamily: FONT, animation: "fadeIn .2s ease" }}>
      {/* Fejléc */}
      <div style={{ padding: "52px 24px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, background: C.accent, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sun size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: FONT_HEADING, color: "#fff", fontWeight: 800, fontSize: 22, lineHeight: 1.2 }}>CRM Napelem</div>
            <div style={{ color: "#4a6a8a", fontSize: 13, marginTop: 2 }}>Munkavégzési rendszer</div>
          </div>
        </div>

        {/* Felhasználó */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20, padding: "12px 14px", background: "rgba(255,255,255,0.05)", borderRadius: 14 }}>
          <Avatar u={user} size={40} />
          <div style={{ flex: 1 }}>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>{user.name}</div>
            <div style={{ color: "#4a6a8a", fontSize: 12 }}>{user.role}</div>
          </div>
        </div>
      </div>

      {/* Menü lista */}
      <nav style={{ flex: 1, padding: "16px 16px", overflowY: "auto" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#3a5070", textTransform: "uppercase", marginBottom: 10, paddingLeft: 4 }}>Főmenü</p>
        {MOB_NAV.map(({ id, label, icon: Icon, desc }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => onNav(id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 14,
              padding: "14px 16px", borderRadius: 14, border: "none",
              background: active ? "rgba(37,99,235,0.3)" : "rgba(255,255,255,0.03)",
              cursor: "pointer", marginBottom: 6, textAlign: "left",
              borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
              transition: "all .15s",
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: active ? C.accent : "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all .15s" }}>
                <Icon size={19} color={active ? "#fff" : "#64748B"} strokeWidth={active ? 2 : 1.7} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: active ? "#93C5FD" : "#CBD5E1", fontWeight: active ? 700 : 500, fontSize: 15 }}>{label}</div>
                <div style={{ color: "#3a5070", fontSize: 12, marginTop: 1 }}>{desc}</div>
              </div>
              <ChevronRight size={16} color={active ? "#93C5FD" : "#2a4060"} />
            </button>
          );
        })}
      </nav>

      {/* Kijelentkezés */}
      <div style={{ padding: "16px 16px 36px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, border: "none", background: "rgba(220,38,38,0.1)", color: "#EF4444", cursor: "pointer", fontSize: 15, fontFamily: FONT, fontWeight: 500 }}>
          <LogOut size={18} />Kijelentkezés
        </button>
      </div>
    </div>
  );
}
