import { useState, useEffect } from "react";
import { C } from "./lib/constants";
import { SAMPLE_DATA } from "./lib/sampleData";
import { driveSave } from "./lib/driveApi";
import { loadLocal, saveLocal } from "./lib/localDb";
import { syncAllFromDrive, syncAllToDrive } from "./lib/dataSync.service";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import { MunkalapLista, MunkalapDetail } from "./pages/Munkalapok";
import Ugyfelek from "./pages/Ugyfelek";
import ComingSoon from "./pages/ComingSoon";
import BeallitasokPage from "./pages/BeallitasokPage";
import UjMunkalap from "./pages/UjMunkalap";
import ProjektekPage from "./modules/projektek/ProjektekPage.jsx";
import CsapatokPage from "./modules/csapatok/CsapatokPage.jsx";
import PwaInstallBanner from "./components/PwaInstallBanner.jsx";

const PAGE_TITLES = {
  dashboard: "Pénzügy",
  munkalapok: "Munkalapok",
  projektek: "Projektek",
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
    projektek: loadLocal("projektek") || SAMPLE_DATA.projektek || [],
    munkalapok: loadLocal("munkalapok") || SAMPLE_DATA.munkalapok || [],
    ugyfelek: loadLocal("ugyfelek") || SAMPLE_DATA.ugyfelek || [],
    beallitasok: loadLocal("beallitasok") || SAMPLE_DATA.beallitasok || {},
    munkatipusok: loadLocal("munkatipusok") || SAMPLE_DATA.munkatipusok || [],
    fovallalkozok: loadLocal("fovallalkozok") || SAMPLE_DATA.fovallalkozok || [],
    elszamolasi_szabalyok:
      loadLocal("elszamolasi_szabalyok") ||
      SAMPLE_DATA.elszamolasi_szabalyok ||
      [],
    karteritesek: loadLocal("karteritesek") || SAMPLE_DATA.karteritesek || [],
    sablonok: loadLocal("sablonok") || SAMPLE_DATA.sablonok || [],
  };
}

export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("dashboard");
  const [sel, setSel] = useState(null);
  const [data, setData] = useState(loadInitialData);
  const [drive, setDrive] = useState("idle");
  const [showNew, setShowNew] = useState(false);
  const [ujMunkalapInit, setUjMunkalapInit] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online",  goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online",  goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    function reloadFromLocal() {
      setData(prev => ({
        ...prev,
        projektek: loadLocal("projektek") || prev.projektek || [],
        munkalapok: loadLocal("munkalapok") || prev.munkalapok || [],
        ugyfelek: loadLocal("ugyfelek") || prev.ugyfelek || [],
        beallitasok: loadLocal("beallitasok") || prev.beallitasok || {},
        munkatipusok: loadLocal("munkatipusok") || prev.munkatipusok || [],
        fovallalkozok: loadLocal("fovallalkozok") || prev.fovallalkozok || [],
        elszamolasi_szabalyok:
          loadLocal("elszamolasi_szabalyok") ||
          prev.elszamolasi_szabalyok ||
          [],
        karteritesek: loadLocal("karteritesek") || prev.karteritesek || [],
        sablonok: loadLocal("sablonok") || prev.sablonok || [],
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
        const synced = await syncAllFromDrive();

        setData(prev => ({
          ...prev,
          projektek:
            synced.projektek ||
            loadLocal("projektek") ||
            prev.projektek ||
            [],
          munkalapok:
            synced.munkalapok ||
            loadLocal("munkalapok") ||
            prev.munkalapok ||
            [],
          ugyfelek:
            synced.ugyfelek ||
            loadLocal("ugyfelek") ||
            prev.ugyfelek ||
            [],
          beallitasok:
            synced.beallitasok ||
            loadLocal("beallitasok") ||
            prev.beallitasok ||
            {},
          munkatipusok:
            synced.munkatipusok ||
            loadLocal("munkatipusok") ||
            prev.munkatipusok ||
            [],
          fovallalkozok:
            synced.fovallalkozok ||
            loadLocal("fovallalkozok") ||
            prev.fovallalkozok ||
            [],
          elszamolasi_szabalyok:
            synced.elszamolasi_szabalyok ||
            loadLocal("elszamolasi_szabalyok") ||
            prev.elszamolasi_szabalyok ||
            [],
          karteritesek:
            synced.karteritesek ||
            loadLocal("karteritesek") ||
            prev.karteritesek ||
            [],
          sablonok:
            synced.sablonok ||
            loadLocal("sablonok") ||
            prev.sablonok ||
            [],
        }));

        setDrive("ok");
      } catch (e) {
        console.warn("[App syncAllFromDrive]", e);
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

  async function handleSyncAllToDrive() {
    setDrive("saving");

    try {
      await syncAllToDrive();
      setDrive("ok");
    } catch (e) {
      console.warn("[App syncAllToDrive]", e);
      setDrive("error");
    }

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
                const fresh = (loadLocal("munkalapok") || []).find(
                  x => x.id === sel.id
                );
                if (fresh) setSel(fresh);
              }}
            />
          </>
        ) : (
          <>
            <TopBar title={PAGE_TITLES[page]} user={user} driveStatus={drive} />

            {page === "dashboard" && <Dashboard user={user} />}

            {page === "munkalapok" && (
              <MunkalapLista
                data={data}
                onSelect={setSel}
                onNew={() => setShowNew(true)}
                userRole={user?.role}
                currentUser={user}
              />
            )}

            {page === "projektek" && (
              <ProjektekPage
                data={data}
                currentUser={user}
                onNavigateMunkalap={(m) => {
                  setPage("munkalapok");
                  setSel(m);
                }}
                onNewMunkalapForProjekt={(projekt) => {
                  setUjMunkalapInit({
                    projektId:  projekt.id,
                    projektNev: projekt.nev,
                    projektkod: projekt.projektkod,
                    clientNev:  projekt.clientNev  || "",
                    clientCim:  projekt.clientCim  || "",
                    clientTel:  projekt.clientTel  || "",
                    clientEmail:projekt.clientEmail || "",
                  });
                  setShowNew(true);
                }}
              />
            )}

            {page === "ugyfelek" && <Ugyfelek data={data} />}

            {page === "arajanlatok" && <ComingSoon title="Árajánlatok" />}
            {page === "szerzodések" && <ComingSoon title="Szerződések" />}
            {page === "csapat" && <CsapatokPage currentUser={user} />}
            {page === "naptar" && <ComingSoon title="Naptár" />}

            {page === "beallitasok" && (
              <>
                <div style={{ padding: "16px 24px 0" }}>
                  <button
                    type="button"
                    onClick={handleSyncAllToDrive}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      border: "1px solid #ddd",
                      background: "#fff",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Drive teljes mentés
                  </button>
                </div>

                <BeallitasokPage currentUser={user} />
              </>
            )}
          </>
        )}
      </div>

      {showNew && (
        <UjMunkalap
          data={data}
          onSave={handleNewMunkalap}
          onClose={() => { setShowNew(false); setUjMunkalapInit(null); }}
          initialData={ujMunkalapInit}
        />
      )}

      {/* Offline jelző */}
      {!isOnline && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          background: "#B91C1C", color: "#fff",
          padding: "8px 16px", textAlign: "center",
          fontSize: 13, fontWeight: 700, fontFamily: "system-ui, sans-serif",
        }}>
          📵 Nincs internetkapcsolat – az adatok helyi mentésből töltődnek, Drive szinkron szünetel
        </div>
      )}

      <PwaInstallBanner />
    </div>
  );
}
