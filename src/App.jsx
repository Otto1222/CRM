// ─── App.jsx módosítása – add-full-local-backup-export commit ──────────────
//
// VÁLTOZTATÁSOK:
//
// 1. Import hozzáadása (a meglévő importok UTÁN):
//
//    import Beallitasok from "./pages/Beallitasok";
//
// 2. JSX rendering – a beallitasok ág CSERÉJE:
//
//    VOLT:
//      {page === "beallitasok" && <ComingSoon title="Beállítások" />}
//
//    LESZ:
//      {page === "beallitasok" && <Beallitasok user={user} />}
//
// Más változtatás NEM szükséges.
// A ComingSoon import maradhat (más oldalakhoz még kell).
// ──────────────────────────────────────────────────────────────────────────────
//
// TELJES App.jsx az import+csere után:

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
import MunkalapFormModal from "./pages/MunkalapFormModal";
import Beallitasok from "./pages/Beallitasok";   // ← ÚJ

const PAGE_TITLES = {
  dashboard:   "Irányítópult",
  munkalapok:  "Munkalapok",
  ugyfelek:    "Ügyfelek",
  arajanlatok: "Árajánlatok",
  szerzodések: "Szerződések",
  csapat:      "Csapat",
  naptar:      "Naptár",
  beallitasok: "Beállítások",
};

export default function App() {
  const [user,    setUser]    = useState(null);
  const [page,    setPage]    = useState("dashboard");
  const [sel,     setSel]     = useState(null);
  const [data,    setData]    = useState(SAMPLE_DATA);
  const [drive,   setDrive]   = useState("idle");
  const [showNew, setShowNew] = useState(false);

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

  async function saveCollection(collection, items) {
    setDrive("saving");
    const ok = await driveSave(collection, { [collection]: items });
    setDrive(ok ? "ok" : "error");
    setTimeout(() => setDrive("idle"), 2500);
  }

  async function handleNewMunkalap(formData) {
    const today = new Date().toISOString().slice(0, 10);
    const newItem = { ...formData, createdAt: today, updatedAt: today };
    const newList = [...data.munkalapok, newItem];
    setData(prev => ({ ...prev, munkalapok: newList }));
    await saveCollection("munkalapok", newList);
    setShowNew(false);
    setPage("munkalapok");
    setSel(newItem);
  }

  function nav(p) { setPage(p); setSel(null); }
  function logout() { setUser(null); setSel(null); setPage("dashboard"); setData(SAMPLE_DATA); }

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <Sidebar page={page} onNav={nav} user={user} onLogout={logout} />
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
            {page === "munkalapok"  && <MunkalapLista data={data} onSelect={setSel} onNew={() => setShowNew(true)} />}
            {page === "ugyfelek"    && <Ugyfelek data={data} />}
            {page === "arajanlatok" && <ComingSoon title="Árajánlatok" />}
            {page === "szerzodések" && <ComingSoon title="Szerződések" />}
            {page === "csapat"      && <ComingSoon title="Csapat kezelése" />}
            {page === "naptar"      && <ComingSoon title="Naptár" />}
            {page === "beallitasok" && <Beallitasok user={user} />}  {/* ← MÓDOSÍTVA */}
          </>
        )}
      </div>

      {showNew && (
        <MunkalapFormModal
          data={data}
          onSave={handleNewMunkalap}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  );
}
