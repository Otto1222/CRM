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

export default function App() {
  const [user,  setUser]  = useState(null);
  const [page,  setPage]  = useState("dashboard");
  const [sel,   setSel]   = useState(null);
  const [data,  setData]  = useState(SAMPLE_DATA);
  const [drive, setDrive] = useState("idle");

  // Google Drive betöltés bejelentkezéskor
  useEffect(() => {
    if (!user) return;
    (async () => {
      setDrive("saving");
      const loaded = await driveLoad(user.id);
      if (loaded) {
        setData(loaded);
        setDrive("ok");
      } else {
        // Első belépés: minta adat mentése Drive-ba
        await driveSave(user.id, SAMPLE_DATA);
        setDrive("ok");
      }
      setTimeout(() => setDrive("idle"), 2500);
    })();
  }, [user]);

  async function saveData(next) {
    setData(next);
    setDrive("saving");
    const ok = await driveSave(user.id, next);
    setDrive(ok ? "ok" : "error");
    setTimeout(() => setDrive("idle"), 2500);
  }

  function nav(p) { setPage(p); setSel(null); }

  function logout() { setUser(null); setSel(null); setPage("dashboard"); setData(SAMPLE_DATA); }

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <Sidebar page={page} onNav={nav} user={user} onLogout={logout} />

      <div style={{ flex: 1, overflow: "auto", animation: "fadeIn .25s ease" }}>
        {/* Munkalap részlet nézet */}
        {page === "munkalapok" && sel ? (
          <>
            <TopBar
              title={`${sel.id} – ${sel.title}`}
              user={user}
              driveStatus={drive}
              onBack={() => setSel(null)}
              backLabel="Munkalapok"
            />
            <MunkalapDetail m={sel} data={data} />
          </>
        ) : (
          <>
            <TopBar title={PAGE_TITLES[page]} user={user} driveStatus={drive} />
            {page === "dashboard"   && <Dashboard data={data} user={user} />}
            {page === "munkalapok"  && <MunkalapLista data={data} onSelect={setSel} onNew={() => alert("Hamarosan: Új munkalap form")} />}
            {page === "ugyfelek"    && <Ugyfelek data={data} />}
            {page === "arajanlatok" && <ComingSoon title="Árajánlatok" />}
            {page === "szerzodesek" && <ComingSoon title="Szerződések" />}
            {page === "csapat"      && <ComingSoon title="Csapat kezelése" />}
            {page === "naptar"      && <ComingSoon title="Naptár" />}
            {page === "beallitasok" && <ComingSoon title="Beállítások" />}
          </>
        )}
      </div>
    </div>
  );
}
