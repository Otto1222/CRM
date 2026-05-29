import { useState, useEffect, useCallback, useRef } from "react";
import { C } from "./lib/constants";
import { SAMPLE_DATA } from "./lib/sampleData";
import { driveLoad, driveSave } from "./lib/driveApi";
import { loadLocal, saveLocal, addItem, removeItem } from "./lib/localDb";
import { StoreProvider } from "./lib/store.jsx";
import { syncCsapatokWithUsers } from "./lib/munkakiosztasSettings";
import { getUsers } from "./lib/crmUsers";
import { drivePing, driveAvailable } from "./lib/driveApi";
import { getAllowedPages, getHomePage, canCreateMunkalap } from "./lib/roles";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import { MunkalapLista, MunkalapDetail } from "./pages/Munkalapok";
import Ugyfelek from "./pages/Ugyfelek";
import AdminPanel from "./pages/AdminPanel";
import BeallitasokPage from "./pages/BeallitasokPage.jsx";
import KarteritesekTab from "./pages/KarteritesekTab";
import SablonKezelo from "./pages/SablonKezelo";
import BackupKezelo from "./pages/BackupKezelo";
import FovallalkozoPage from "./modules/fovallalkozok/FovallalkozoPage.jsx";
import MunkatipusokPage from "./modules/munkatipusok/MunkatipusokPage.jsx";
import ProjektekPage from "./modules/projektek/ProjektekPage.jsx";
import { createBackup } from "./lib/backupService";
import MunkakiosztasBeallitasok from "./pages/MunkakiosztasBeallitasok";
import JegyzokonyviBeallitasok from "./pages/JegyzokonyviBeallitasok";
import Munkakiosztas from "./pages/Munkakiosztas";
import UjMunkalap from "./pages/UjMunkalap";
import ComingSoon from "./pages/ComingSoon";
import {
  LayoutDashboard, FileText, Users, ClipboardList,
  ScrollText, UserCheck, Calendar, Settings, LogOut,
  Sun, ChevronRight, Hammer,
} from "lucide-react";
import { FONT, FONT_HEADING } from "./lib/constants";
import Avatar from "./components/Avatar";

// ─── Törlés megerősítő modal ─────────────────────────────────
function DeleteConfirmModal({ ml, onConfirm, onCancel }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:"#fff", borderRadius:20, padding:"32px 28px", width:"100%", maxWidth:420, boxShadow:"0 20px 60px rgba(0,0,0,.3)", fontFamily:"'DM Sans',sans-serif" }}>
        <div style={{ width:56, height:56, borderRadius:"50%", background:"#FEF2F2", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
          <span style={{ fontSize:28 }}>🗑️</span>
        </div>
        <h2 style={{ textAlign:"center", fontSize:20, fontWeight:800, color:"#0F172A", marginBottom:10 }}>
          Munkalap törlése
        </h2>
        <p style={{ textAlign:"center", fontSize:14, color:"#64748B", marginBottom:6 }}>
          Biztosan törölni szeretnéd ezt a munkalapot?
        </p>
        <div style={{ background:"#F8FAFC", borderRadius:12, padding:"12px 16px", margin:"16px 0 24px", textAlign:"center" }}>
          <p style={{ fontWeight:800, fontSize:16, color:"#0F172A" }}>{ml.id}</p>
          <p style={{ fontSize:13, color:"#64748B" }}>{ml.clientNev || ml.projektMegnevezes || ml.feladat || ""}</p>
        </div>
        <p style={{ textAlign:"center", fontSize:13, color:"#DC2626", marginBottom:24, fontWeight:600 }}>
          ⚠️ Ez a művelet nem visszavonható! Az összes adat törlődik.
        </p>
        <div style={{ display:"flex", gap:12 }}>
          <button onClick={onCancel} style={{ flex:1, padding:"13px", borderRadius:12, border:"1.5px solid #E2E8F0", background:"#fff", fontWeight:700, fontSize:15, cursor:"pointer", color:"#475569", fontFamily:"'DM Sans',sans-serif" }}>
            Mégsem
          </button>
          <button onClick={onConfirm} style={{ flex:1, padding:"13px", borderRadius:12, border:"none", background:"#DC2626", color:"#fff", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
            Igen, törlöm
          </button>
        </div>
      </div>
    </div>
  );
}

const PAGE_TITLES = {
  dashboard:"Pénzügy", munkalapok:"Munkalapok", ugyfelek:"Ügyfelek",
  munkakiosztas:"Munkakiosztás", arajanlatok:"Árajánlatok", szerzodesek:"Szerződések",
  csapat:"Csapat", naptar:"Naptár", beallitasok:"Beállítások",
};

function useIsMobile() {
  const [mob, setMob] = useState(window.innerWidth < 900);
  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 900);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mob;
}

// ─── Adatok inicializálása: localStorage → sample data ────────
function initData() {
  const localMl = loadLocal("munkalapok");
  const localUk = loadLocal("ugyfelek");
  const localUsers = (() => { try { const s=localStorage.getItem("crm_napelem_users"); return s?JSON.parse(s):null; } catch{return null;} })();
  const localBeall = (() => { try { const s=localStorage.getItem("beallitasok"); return s?JSON.parse(s):{};  } catch{return {};} })();
  const localKart  = (() => { try { const s=localStorage.getItem("karteritesek"); return s?JSON.parse(s):[];  } catch{return [];} })();
  const localSabl  = (() => { try { const s=localStorage.getItem("sablonok");     return s?JSON.parse(s):[];  } catch{return [];} })();
  const localFv = (() => { try { const s=localStorage.getItem("fovallalkozok");          return s?JSON.parse(s):null; } catch{return null;} })();
  const localMt = (() => { try { const s=localStorage.getItem("munkatipusok");           return s?JSON.parse(s):null; } catch{return null;} })();
  const localSz = (() => { try { const s=localStorage.getItem("elszamolasi_szabalyok");  return s?JSON.parse(s):[];   } catch{return [];} })();
  const localPr = (() => { try { const s=localStorage.getItem("projektek");              return s?JSON.parse(s):[];   } catch{return [];} })();
  return {
    munkalapok:            localMl ?? SAMPLE_DATA.munkalapok,
    ugyfelek:              localUk ?? SAMPLE_DATA.ugyfelek,
    users:                 localUsers,
    beallitasok:           localBeall,
    karteritesek:          localKart,
    sablonok:              localSabl,
    fovallalkozok:         localFv || [],
    munkatipusok:          localMt  || [],
    elszamolasi_szabalyok: localSz,
    projektek:             localPr,
  };
}

const ALL_MOB_NAV = [
  { id:"dashboard",      label:"Pénzügy",         icon:LayoutDashboard, desc:"Pénzügyi összesítő & kártérítések" },
  { id:"projektek",      label:"Projektek",        icon:FileText,        desc:"Projekt kezelés" },
  { id:"munkakiosztas",  label:"Munkakiosztás",    icon:Hammer,          desc:"Excel import & csapat kiosztás" },
  { id:"ugyfelek",       label:"Ügyfelek",         icon:Users,           desc:"Ügyféladatbázis" },
  { id:"arajanlatok",    label:"Árajánlatok",      icon:ClipboardList,   desc:"Ajánlatok készítése" },
  { id:"szerzodesek",    label:"Szerződések",      icon:ScrollText,      desc:"Szerződések kezelése" },
  { id:"naptar",         label:"Naptár",           icon:Calendar,        desc:"Ütemezés & időpontok" },
  { id:"munkalapok",     label:"Munkalapok",       icon:FileText,        desc:"Munkák kezelése" },
  { id:"beallitasok",    label:"Beállítások",      icon:Settings,        desc:"Felhasználók & kiosztás" },
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

// ─── FIX 1: setPage és setData prop-on át PageContent-nek ─────
function PageContent({ page, sel, setSel, data, setData, setPage, user, onNewMunkalap, onDelete }) {
  const role = user?.role;

  if (page === "munkalapok" && sel) return (
    <MunkalapDetail
      m={sel}
      data={data}
      userRole={role}
      onBack={(refresh) => {
        if (refresh) {
          const fresh = loadLocal("munkalapok");
          if (fresh) setData(prev => ({ ...prev, munkalapok: fresh }));
        }
        setTimeout(() => setSel(null), 50);
      }}
      onDelete={onDelete}
      onRefresh={(updates) => {
        const fresh = loadLocal("munkalapok");
        if (fresh) setData(prev => ({ ...prev, munkalapok: fresh }));
        setSel(prev => prev ? { ...prev, ...updates } : prev);
      }}
    />
  );

  if (page === "dashboard")     return <Dashboard data={data} user={user} />;
  if (page === "munkalapok")    return <MunkalapLista data={data} onSelect={setSel} onNew={onNewMunkalap} userRole={role} currentUser={user} />;
  if (page === "munkakiosztas") return <Munkakiosztas />;
  if (page === "ugyfelek")      return <Ugyfelek data={data} />;
  if (page === "projektek")     return (
    <ProjektekPage
      data={data}
      currentUser={user}
      onNavigateMunkalap={(m) => { setPage("munkalapok"); setSel(m); }}
    />
  );
  if (page === "karteritesek")  return <KarteritesekTab userRole={role} currentUser={user} munkalapok={data.munkalapok} />;
  if (page === "fovallalkozok") return <FovallalkozoPage userRole={user?.role} />;
  if (page === "munkatipusok")  return <MunkatipusokPage userRole={user?.role} />;
  if (page === "sablonok")      return <SablonKezelo userRole={role} />;
  if (page === "biztmentes")    return <BackupKezelo userRole={role} />;
  if (page === "beallitasok")   return <BeallitasokPage currentUser={user} />;
  if (page === "arajanlatok")   return <ComingSoon title="Árajánlatok" />;
  if (page === "szerzodesek")   return <ComingSoon title="Szerződések" />;
  if (page === "csapat")        return <ComingSoon title="Csapat" />;
  if (page === "naptar")        return <ComingSoon title="Naptár" />;
  return null;
}

export default function App() {
  const [user,           setUser]           = useState(null);
  const [page,           setPage]           = useState("dashboard");
  const [sel,            setSel]            = useState(null);
  const [data,           setData]           = useState(initData);
  const [drive,          setDrive]          = useState("idle");
  const [driveOnline,    setDriveOnline]    = useState(false);
  const [showSidebar,    setShowSidebar]    = useState(true);
  const [ujMunkalapPage, setUjMunkalapPage] = useState(false);
  const [deleteConfirm,  setDeleteConfirm]  = useState(null);
  const isMobile = useIsMobile();

  const allowedPages = user ? getAllowedPages(user.role) : [];

  function nav(p) {
    if (!allowedPages.includes(p)) return;
    setPage(p); setSel(null);
    if (isMobile) setShowSidebar(false);
  }

  // ─── FIX 2: crm-db-updated → data frissítés (mobil + asztali) ──
  useEffect(() => {
    function handleDbUpdate(e) {
      const col = e.detail?.collection || "";

      if (col === "munkalapok" || col === "all") {
        const fresh = loadLocal("munkalapok");
        if (fresh) {
          setData(prev => ({ ...prev, munkalapok: fresh }));
          setSel(prev => {
            if (!prev) return prev;
            return fresh.find(m => m.id === prev.id) || prev;
          });
        }
      }
      if (col === "ugyfelek" || col === "all") {
        const fresh = loadLocal("ugyfelek");
        if (fresh) setData(prev => ({ ...prev, ugyfelek: fresh }));
      }
      if (col === "users" || col === "all") {
        try {
          const fresh = getUsers();
          if (fresh) {
            setData(prev => ({ ...prev, users: fresh }));
            syncCsapatokWithUsers(fresh);
          }
        } catch {}
      }
      if (col === "beallitasok" || col === "all") {
        try { setData(prev => ({ ...prev, beallitasok: JSON.parse(localStorage.getItem("beallitasok") || "{}") })); } catch {}
      }
      if (col === "karteritesek" || col === "all") {
        try { setData(prev => ({ ...prev, karteritesek: JSON.parse(localStorage.getItem("karteritesek") || "[]") })); } catch {}
      }
      if (col === "sablonok" || col === "all") {
        try { setData(prev => ({ ...prev, sablonok: JSON.parse(localStorage.getItem("sablonok") || "[]") })); } catch {}
      }
      if (col === "fovallalkozok" || col === "all") {
        try { setData(prev => ({ ...prev, fovallalkozok: JSON.parse(localStorage.getItem("fovallalkozok") || "[]") })); } catch {}
      }
      if (col === "munkatipusok" || col === "all") {
        try { setData(prev => ({ ...prev, munkatipusok: JSON.parse(localStorage.getItem("munkatipusok") || "[]") })); } catch {}
      }
      if (col === "elszamolasi_szabalyok" || col === "all") {
        try { setData(prev => ({ ...prev, elszamolasi_szabalyok: JSON.parse(localStorage.getItem("elszamolasi_szabalyok") || "[]") })); } catch {}
      }
      if (col === "projektek" || col === "all") {
        try { setData(prev => ({ ...prev, projektek: JSON.parse(localStorage.getItem("projektek") || "[]") })); } catch {}
      }
    }
    window.addEventListener("crm-db-updated", handleDbUpdate);
    return () => window.removeEventListener("crm-db-updated", handleDbUpdate);
  }, []);

  // ─── Bejelentkezés után: Drive szinkron ──────────────────────
  useEffect(() => {
    if (!user) return;
    const home = getHomePage(user.role);
    setPage(home);
    setShowSidebar(user.role === "Telepítő" ? false : true);

    (async () => {
      if (driveAvailable()) {
        const online = await drivePing();
        setDriveOnline(online);
        if (online) setDrive("ok");
      }
      setDrive("saving");
      const [ml, uk] = await Promise.all([
        driveLoad("munkalapok"),
        driveLoad("ugyfelek"),
      ]);
      let updated = false;
      const next = { ...data };
      if (ml?.munkalapok) { next.munkalapok = ml.munkalapok; updated = true; }
      if (uk?.ugyfelek)   { next.ugyfelek   = uk.ugyfelek;   updated = true; }
      if (updated) {
        setData(next);
        if (ml?.munkalapok) saveLocal("munkalapok", ml.munkalapok);
        if (uk?.ugyfelek)   saveLocal("ugyfelek",   uk.ugyfelek);
      }
      setDrive("ok");
      setTimeout(() => setDrive("idle"), 2500);
    })();
  }, [user]); // eslint-disable-line

  function handleDeleteRequest(ml) { setDeleteConfirm(ml); }

  function handleDeleteConfirm() {
    if (!deleteConfirm) return;
    const newMunkalapok = removeItem("munkalapok", deleteConfirm.id);
    setData(prev => ({ ...prev, munkalapok: newMunkalapok }));
    driveSave("munkalapok", { munkalapok: newMunkalapok });
    setSel(null);
    setDeleteConfirm(null);
  }

  function handleUjMunkalapSave(ml) {
    const newMunkalapok = addItem("munkalapok", ml);
    setData(prev => ({ ...prev, munkalapok: newMunkalapok }));
    setDrive("saving");
    driveSave("munkalapok", { munkalapok: newMunkalapok })
      .then(ok => { setDrive(ok ? "ok" : "error"); setTimeout(() => setDrive("idle"), 2500); });
    setUjMunkalapPage(false);
    setPage("munkalapok");
    if (isMobile) setShowSidebar(false);
  }

  function logout() {
    setUser(null); setSel(null); setPage("dashboard");
    setShowSidebar(true); setUjMunkalapPage(false);
  }

  if (!user) return <Login onLogin={setUser} />;

  const isMunkalapDetail = page === "munkalapok" && sel;
  const isTelepito = user.role === "Telepítő";

  if (ujMunkalapPage) {
    return (
      // ─── FIX 3: StoreProvider az UjMunkalap körül is ────────
      <StoreProvider initialData={data}>
        <div style={{ minHeight:"100vh", background:C.bg }}>
          <style>{gStyles}</style>
          <UjMunkalap data={data} onBack={() => setUjMunkalapPage(false)} onSave={handleUjMunkalapSave} />
        </div>
      </StoreProvider>
    );
  }

  // ─── FIX 4: StoreProvider MINDEN nézetet befoglal ────────────
  return (
    <StoreProvider initialData={data}>
      <style>{gStyles}</style>
      {deleteConfirm && (
        <DeleteConfirmModal
          ml={deleteConfirm}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}

      {/* ── MOBIL ─────────────────────────────────────────────── */}
      {isMobile ? (
        <div style={{ minHeight:"100vh", background: isMunkalapDetail ? "#2C4A6E" : C.bg }}>
          {showSidebar && !isTelepito ? (
            <MobileSidebarFull
              page={page} onNav={nav} user={user}
              onLogout={logout} allowedPages={allowedPages}
            />
          ) : isMunkalapDetail ? (
            <>
              {!(isTelepito && sel.status === "Felmérés") && (
                <div style={{ background:"#2C4A6E", padding:"44px 16px 0", display:"flex", alignItems:"center", gap:10 }}>
                  <button onClick={() => setSel(null)} style={{ border:"none", background:"none", color:"#94A3B8", cursor:"pointer", display:"flex", alignItems:"center", gap:6, fontSize:13, fontFamily:FONT, fontWeight:600 }}>
                    <span style={{ fontSize:18 }}>←</span> {isTelepito ? "Feladatok" : "Munkalapok"}
                  </button>
                  <span style={{ fontSize:13, color:"#94A3B8", marginLeft:"auto" }}>{sel.id}</span>
                </div>
              )}
              <MunkalapDetail
                m={sel} data={data} userRole={user.role}
                onBack={(refresh) => {
                  setSel(null);
                  if (refresh) {
                    const fresh = loadLocal("munkalapok");
                    if (fresh) setData(prev => ({ ...prev, munkalapok: fresh }));
                  }
                }}
                onDelete={user.role !== "Telepítő" ? handleDeleteRequest : undefined}
              />
            </>
          ) : isTelepito ? (
            <div>
              <div style={{ background:"#2C4A6E", padding:"44px 16px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <span style={{ fontFamily:FONT_HEADING, color:"#fff", fontWeight:800, fontSize:20 }}>Feladatok</span>
                <button onClick={logout} style={{ border:"none", background:"rgba(255,255,255,0.1)", color:"#94A3B8", cursor:"pointer", borderRadius:8, padding:"6px 12px", fontSize:12, fontFamily:FONT }}>
                  Kilépés
                </button>
              </div>
              <MunkalapLista data={data} onSelect={setSel} onNew={null} userRole={user.role} currentUser={user} />
            </div>
          ) : (
            <>
              <TopBar title={PAGE_TITLES[page]} user={user} driveStatus={drive} onBack={() => setShowSidebar(true)} backLabel="Főmenü" isMobile />
              <PageContent
                page={page} sel={sel} setSel={setSel}
                data={data} setData={setData} setPage={setPage}
                user={user}
                onNewMunkalap={() => setUjMunkalapPage(true)}
                onDelete={handleDeleteRequest}
              />
            </>
          )}
        </div>
      ) : (
        /* ── ASZTALI ─────────────────────────────────────────── */
        <div style={{ display:"flex", minHeight:"100vh", background:C.bg }}>
          <Sidebar page={page} onNav={p => { setPage(p); setSel(null); }} user={user} onLogout={logout} allowedPages={allowedPages} />
          <div style={{ flex:1, overflow:"auto" }}>
            <TopBar
              title={isMunkalapDetail ? sel.id : PAGE_TITLES[page]}
              user={user} driveStatus={drive}
              onBack={isMunkalapDetail ? () => setSel(null) : undefined}
              backLabel="Munkalapok"
            />
            <PageContent
              page={page} sel={sel} setSel={setSel}
              data={data} setData={setData} setPage={setPage}
              user={user}
              onNewMunkalap={() => setUjMunkalapPage(true)}
              onDelete={handleDeleteRequest}
            />
          </div>
        </div>
      )}
    </StoreProvider>
  );
}

const gStyles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; }
  button { font-family: 'DM Sans', sans-serif; }
  input, textarea, select { font-family: 'DM Sans', sans-serif; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 4px; }