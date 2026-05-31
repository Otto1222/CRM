import { useState, useEffect } from "react";
import { C } from "./lib/constants";
import { SAMPLE_DATA } from "./lib/sampleData";
import { driveLoad, driveSave } from "./lib/driveApi";
import { loadLocal, saveLocal } from "./lib/localDb";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import { MunkalapLista, MunkalapDetail } from "./pages/Munkalapok";
import Ugyfelek from "./pages/Ugyfelek";
import ComingSoon from "./pages/ComingSoon";
import BeallitasokPage from "./pages/BeallitasokPage";
import UjMunkalap from "./pages/UjMunkalap";

const PAGE_TITLES = {
  dashboard: "Irányítópult",
  munkalapok: "Munkalapok",
  ugyfelek: "Ügyfelek",
  arajanlatok: "Árajánlatok",
  szerzodések: "Szerződések",
  csapat: "Csapat",
  naptar: "Naptár",
  beallitasok: "Beállítások",
};

function loadInitialData() {
  return {
    ...SAMPLE_DATA,
    munkalapok: loadLocal("munkalapok") || SAMPLE_DATA.munkalapok || [],
    ugyfelek: loadLocal("ugyfelek") || SAMPLE_DATA.ugyfelek || [],
    projektek: loadLocal("projektek") || [],
  };
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [sel, setSel] = useState(null);
  const [data, setData] = useState(loadInitialData);
  const [drive, setDrive] = useState("idle");
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    function reloadFromLocal() {
      setData(prev => ({
        ...prev,
        munkalapok: loadLocal("munkalapok") || prev.munkalapok || [],
        ugyfelek: loadLocal("ugyfelek") || prev.ugyfelek || [],
        projektek: loadLocal("projektek") || prev.projektek || [],
      }));
    }

    window.addEventListener("crm-db-updated", reloadFromLocal);
    window.addEventListener("storage", reloadFromLocal);

    return () => {
      window.removeEventListener("crm-db-updated", reloadFromLocal);
      window.removeEventListener("storage", reloadFromLocal);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    (async () => {
      setDrive("saving");

      try {
        const [ml, uk] = await Promise.all([
          driveLoad("munkalapok"),
          driveLoad("ugyfelek"),
        ]);

        setData(prev => {
          const localMunkalapok = loadLocal("munkalapok");
          const localUgyfelek = loadLocal("ugyfelek");
          const localProjektek = loadLocal("projektek");

          const driveMunkalapok =
            Array.isArray(ml?.munkalapok) && ml.munkalapok.length > 0
              ? ml.munkalapok
              : null;

          const driveUgyfelek =
            Array.isArray(uk?.ugyfelek) && uk.ugyfelek.length > 0
              ? uk.ugyfelek
              : null;

          return {
            ...prev,
            munkalapok: localMunkalapok || driveMunkalapok || prev.munkalapok || [],
            ugyfelek: localUgyfelek || driveUgyfelek || prev.ugyfelek || [],
            projektek: localProjektek || prev.projektek || [],
          };
        });

        setDrive("ok");
      } catch (e) {
        console.warn("[App Drive load]", e);
        setDrive("error");
      }

      setTimeout(() => setDrive("idle"), 2500);
    })();
  }, [user]);

  async function saveCollection(collection, items) {
    saveLocal(collection, items);

    setDrive("saving");

    try {
      const res = await driveSave(collection, { [collection]: items });
      setDrive(res?.ok ? "ok" : "error");
    } catch (e) {
      console.warn("[App Drive save]", e);
      setDrive("error");
    }

    window.dispatchEvent(
      new CustomEvent("crm-db-updated", {
        detail: { collection, action: "save" },
      })
    );

    setTimeout(() => setDrive("idle"), 2500);
  }

  async function handleNewMunkalap(formData) {
    const today = new Date().toISOString().slice(0, 10);

    const newItem = {
      ...formData,
      createdAt: formData.createdAt || today,
      updatedAt: today,
    };

    const current = loadLocal("munkalapok") || data.munkalapok || [];
    const newList = [...current, newItem];

    setData(prev => ({ ...prev, munkalapok: newList }));
    saveLocal("munkalapok", newList);

    await saveCollection("munkalapok", newList);

    setShowNew(false);
    setPage("munkalapok");
    setSel(newItem);
  }

  function nav(p) {
    setPage(p);
    setSel(null);
  }

  function logout() {
    setUser(null);
    setSel(null);
    setPage("dashboard");
  }

  if (!user) return <Login onLogin={setUser} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <Sidebar page={page} onNav={nav} user={user} onLogout={logout} />

      <div style={{ flex: 1, overflow: "auto", animation: "fadeIn .25s ease" }}>
        {page === "munkalapok" && sel ? (
          <>
            <TopBar
              title={`${sel.dokumentumszam || sel.ediSorszam || sel.ugyszam || sel.id} – ${
                sel.title || sel.projektMegnevezes || sel.feladat || ""
              }`}
              user={user}
              driveStatus={drive}
              onBack={() => setSel(null)}
              backLabel="Munkalapok"
            />
            <MunkalapDetail
              m={sel}
              data={data}
              userRole={user?.role}
              onBack={() => setSel(null)}
              onRefresh={() => {
                setData(loadInitialData());
                const fresh = (loadLocal("munkalapok") || []).find(x => x.id === sel.id);
                if (fresh) setSel(fresh);
              }}
            />
          </>
        ) : (
          <>
            <TopBar title={PAGE_TITLES[page]} user={user} driveStatus={drive} />

            {page === "dashboard" && <Dashboard data={data} user={user} />}

            {page === "munkalapok" && (
              <MunkalapLista
                data={data}
                onSelect={setSel}
                onNew={() => setShowNew(true)}
                userRole={user?.role}
                currentUser={user}
              />
            )}

            {page === "ugyfelek" && <Ugyfelek data={data} />}

            {page === "arajanlatok" && <ComingSoon title="Árajánlatok" />}
            {page === "szerzodések" && <ComingSoon title="Szerződések" />}
            {page === "csapat" && <ComingSoon title="Csapat kezelése" />}
            {page === "naptar" && <ComingSoon title="Naptár" />}

            {page === "beallitasok" && <BeallitasokPage currentUser={user} />}
          </>
        )}
      </div>

      {showNew && (
        <UjMunkalap
          data={data}
          onSave={handleNewMunkalap}
          onClose={() => setShowNew(false)}
        />
      )}
    </div>
  );
}