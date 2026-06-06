import { useState, useEffect } from "react";
import { C } from "./lib/constants";
import { SAMPLE_DATA } from "./lib/sampleData";
import { driveSave, driveAvailable } from "./lib/driveApi";
import { hasDefaultPasswords } from "./lib/crmUsers";
import { getHomePage } from "./lib/roles";
import { loadLocal, saveLocal } from "./lib/localDb";
import { syncAllFromDrive, syncAllToDrive } from "./lib/dataSync.service";
import { migrateTelepitoCsapatok } from "./lib/csapatMigracio";
import { deleteWorkorder } from "./services/workorder.service";
import { linkMunkalap } from "./modules/projektek/projekt.service";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import { MunkalapLista, MunkalapDetail } from "./pages/Munkalapok";
import Ugyfelek from "./pages/Ugyfelek";
import ComingSoon from "./pages/ComingSoon";
import ArajanlaltokPage from "./pages/ArajanlaltokPage.jsx";
import BeallitasokPage from "./pages/BeallitasokPage";
import UjMunkalap from "./pages/UjMunkalap";
import ProjektekPage from "./modules/projektek/ProjektekPage.jsx";
import CsapatokPage from "./modules/csapatok/CsapatokPage.jsx";
import SzamlakPage from "./modules/szamlak/SzamlakPage.jsx";
import PwaInstallBanner from "./components/PwaInstallBanner.jsx";
import DriveProgressBar from "./components/DriveProgressBar.jsx";
import RiportokPage from "./pages/RiportokPage.jsx";
import NaptarPage from "./pages/NaptarPage.jsx";
import KarteritesekPage from "./pages/KarteritesekTab.jsx";
import MunkalapSablonokPage from "./modules/munkalap_sablonok/MunkalapSablonokPage.jsx";
import { initSablonok, getAktivSablonok } from "./modules/munkalap_sablonok/munkalapSablon.service.js";

const PAGE_TITLES = {
  dashboard:         "Dashboard",
  projektek:         "Projektek",
  munkalapok:        "Munkalapok",
  ugyfelek:          "Ügyfelek",
  arajanlatok:       "Ajánlatok",
  szerzodesek:       "Szerződések",
  szamlak:           "Számlák",
  csapat:            "Csapatok",
  naptar:            "Naptár",
  riportok:          "Riportok",
  karteritesek:      "Kártérítések",
  munkalap_sablonok: "ML Sablonok",
  dokumentumok:      "Dokumentumok",
  beallitasok:       "Beállítások / Rendszer",
};

function fixMunkalapokSzamozas(list) {
  let changed = false;
  const fixed = list.map(m => {
    if (!m.dokumentumszam && !m.ugyszam && !m.ediSorszam) {
      changed = true;
      const fallback = `#${(m.id || "").slice(-6)}`;
      return { ...m, dokumentumszam: fallback, ugyszam: fallback };
    }
    if (!m.dokumentumszam && (m.ugyszam || m.ediSorszam)) {
      changed = true;
      return { ...m, dokumentumszam: m.ugyszam || m.ediSorszam };
    }
    return m;
  });
  if (changed) saveLocal("munkalapok", fixed);
  return fixed;
}

function loadInitialData() {
  const rawMl = loadLocal("munkalapok") || SAMPLE_DATA.munkalapok || [];
  return {
    ...SAMPLE_DATA,
    projektek: loadLocal("projektek") || SAMPLE_DATA.projektek || [],
    munkalapok: fixMunkalapokSzamozas(rawMl),
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
  const [user, setUser] = useState(() => {
    try {
      const t = localStorage.getItem("__crm_test_session__");
      if (t) return JSON.parse(t);
    } catch {}
    return null;
  });
  const [page, setPage] = useState("dashboard");
  const [sel, setSel] = useState(null);
  const [data, setData] = useState(loadInitialData);
  const [drive, setDrive] = useState("idle");
  const [driveProgress, setDriveProgress] = useState({ active: false });
  const [defaultPwWarning, setDefaultPwWarning] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [ujMunkalapInit, setUjMunkalapInit] = useState(null);
  const [sablonValaszto, setSablonValaszto] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { localStorage.removeItem("__crm_test_session__"); }, []);

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
      if (driveAvailable()) setDrive("saving");

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

        if (driveAvailable()) setDrive("ok");
      } catch (e) {
        console.warn("[App syncAllFromDrive]", e);
        if (driveAvailable()) setDrive("error");
      }

      if (driveAvailable()) setTimeout(() => setDrive("idle"), 2500);
    })();
  }, [user]);

  async function saveCollection(collection, items) {
    saveLocal(collection, items);

    if (driveAvailable()) {
      setDrive("saving");
      setDriveProgress({ active: true, percent: 10, done: 0, total: 1, collection, status: "saving" });
      try {
        const res = await driveSave(collection, { [collection]: items });
        const ok = res?.ok;
        setDrive(ok ? "ok" : "error");
        setDriveProgress({ active: true, percent: 100, done: 1, total: 1, collection, status: ok ? "ok" : "error" });
      } catch (e) {
        console.warn("[App Drive save]", e);
        setDrive("error");
        setDriveProgress({ active: true, percent: 100, done: 1, total: 1, collection, status: "error" });
      }
      setTimeout(() => setDrive("idle"), 2500);
      setTimeout(() => setDriveProgress({ active: false }), 1800);
    }

    window.dispatchEvent(
      new CustomEvent("crm-db-updated", {
        detail: { collection, action: "save" },
      })
    );
  }

  async function handleSyncAllToDrive() {
    setDrive("saving");
    setDriveProgress({ active: true, percent: 0, done: 0, total: 0, collection: "", status: "saving" });

    try {
      const { allOk } = await syncAllToDrive((p) => {
        setDriveProgress({
          active: true,
          percent: p.percent,
          done: p.done,
          total: p.total,
          collection: p.collection,
          status: "saving",
        });
      });
      setDrive(allOk ? "ok" : "error");
      setDriveProgress(prev => ({ ...prev, active: true, percent: 100, status: allOk ? "ok" : "error" }));
    } catch (e) {
      console.warn("[App syncAllToDrive]", e);
      setDrive("error");
      setDriveProgress(prev => ({ ...prev, active: true, percent: 100, status: "error" }));
    }

    setTimeout(() => setDrive("idle"), 3000);
    setTimeout(() => setDriveProgress({ active: false }), 2400);
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

    // Projekt munkalapIds frissítése ha projekthez tartozik
    if (newItem.projektId) {
      linkMunkalap(newItem.projektId, newItem.id);
    }

    setShowNew(false);
    setPage("munkalapok");
    setSel(newItem);
  }

  function handleDeleteMunkalap(m) {
    if (!window.confirm(`Biztosan törlöd ezt a munkalapot?\n${m.dokumentumszam || m.munkalapSzam || m.id}`)) return;
    deleteWorkorder(m.id);
    setSel(null);
  }

  function nav(p) {
    setPage(p);
    setSel(null);
    setSidebarOpen(false);
  }

  function logout() {
    setUser(null);
    setSel(null);
    setPage("dashboard");
  }

  function handleLogin(u) {
    setUser(u);
    setPage(getHomePage(u?.role));
    if (u?.role === "Admin") setDefaultPwWarning(hasDefaultPasswords());
    initSablonok();
    // Egyszeri, idempotens csapat-migráció (régi Telepítő csapatok → egységes Csapatok)
    try { migrateTelepitoCsapatok(); } catch (e) { console.warn("[csapat migráció]", e); }
  }

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg }}>
      <Sidebar page={page} onNav={nav} user={user} onLogout={logout} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div style={{ flex: 1, overflow: "auto", animation: "fadeIn .25s ease", minWidth: 0 }}>
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
              onMenuOpen={() => setSidebarOpen(true)}
            />
            <MunkalapDetail
              m={sel}
              data={data}
              userRole={user?.role}
              currentUser={user}
              onBack={() => setSel(null)}
              onDelete={handleDeleteMunkalap}
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
            <TopBar
              title={user?.role === "Telepítő" && page === "munkalapok" ? "Saját munkalapok" : (PAGE_TITLES[page] || page)}
              user={user} driveStatus={drive} onMenuOpen={() => setSidebarOpen(true)}
            />

            {page === "dashboard" && <Dashboard user={user} />}

            {/* "munkalapok" – külön nav item + Telepítő főoldal */}
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
                onNav={setPage}
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

            {page === "ugyfelek" && <Ugyfelek data={data} currentUser={user} />}

            {page === "arajanlatok" && <ArajanlaltokPage currentUser={user} />}
            {page === "szerzodesek" && <ComingSoon title="Szerződések" />}
            {page === "dokumentumok" && <ComingSoon title="Dokumentumok" />}
            {page === "szamlak" && <SzamlakPage currentUser={user} />}
            {page === "csapat" && <CsapatokPage currentUser={user} />}
            {page === "naptar" && (
              <NaptarPage
                data={data}
                currentUser={user}
                onNavigate={(type, ref) => {
                  if (type === "munkalap" && ref) { setPage("munkalapok"); setSel(ref); }
                  else if (type === "projekt")    { setPage("projektek"); }
                }}
              />
            )}

            {page === "karteritesek" && <KarteritesekPage currentUser={user} userRole={user?.role} />}

            {page === "munkalap_sablonok" && <MunkalapSablonokPage userRole={user?.role} />}

            {page === "riportok" && <RiportokPage currentUser={user} />}

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

      {/* Alapértelmezett jelszó figyelmeztetés (Admin) */}
      {defaultPwWarning && (
        <div style={{
          position: "fixed", top: isOnline ? 0 : 38, left: 0, right: 0, zIndex: 9998,
          background: "#92400E", color: "#FEF3C7",
          padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
          fontSize: 13, fontWeight: 700, fontFamily: "system-ui, sans-serif", gap: 12,
        }}>
          <span>⛔ Alapértelmezett jelszavak aktívak – éles indulás ELŐTT változtasd meg! (Beállítások → Felhasználók)</span>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => { nav("beallitasok"); }}
              style={{ padding: "3px 12px", background: "#FEF3C7", color: "#92400E", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 }}
            >
              Megnyitás
            </button>
            <button
              onClick={() => setDefaultPwWarning(false)}
              style={{ padding: "3px 8px", background: "transparent", color: "#FEF3C7", border: "1px solid #FEF3C7", borderRadius: 6, cursor: "pointer", fontWeight: 700, fontSize: 12 }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <PwaInstallBanner />
      <DriveProgressBar progress={driveProgress} />
    </div>
  );
}
