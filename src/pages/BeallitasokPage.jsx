import { useState, useRef, useEffect } from "react";
import {
  Users, Settings, FileText, Wrench, Building2, ChevronRight, BookTemplate, Shield, Trash2, BookOpen, ExternalLink, Upload, CheckCircle2, Save, Check, X, UserPlus, Pencil,
} from "lucide-react";
import { loadLocal, saveLocal } from "../lib/localDb";
import { ft } from "../lib/helpers";
import { ANYAGTORZS_KATEGORIAK, ANYAG_EGYSEGEK, AFA_KULCSOK } from "../modules/ajanla tok/anyagtorzs.schema";
import { loadAnyagtorzs, createAnyagtorzsTetel, updateAnyagtorzsTetel, deleteAnyagtorzsTetel } from "../modules/ajanla tok/anyagtorzs.service";
import { loadAjanlatSablonok, updateAjanlatSablon, deleteAjanlatSablon } from "../modules/ajanla tok/ajanlat_sablon.service";
import {
  hasSablon, saveSablon, deleteSablon, getSablonMeta,
  readFileAsBase64, VBF_PLACEHOLDER_DOCS,
} from "../lib/vbfDocxService";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import AdminPanel from "./AdminPanel";
import DriveStatusPanel from "../components/DriveStatusPanel";
import JegyzokonyviBeallitasok from "./JegyzokonyviBeallitasok";
import MunkakiosztasBeallitasok from "./MunkakiosztasBeallitasok";
import FovallalkozoPage from "../modules/fovallalkozok/FovallalkozoPage";
import MunkatipusokPage from "../modules/munkatipusok/MunkatipusokPage";
import SablonKezelo from "./SablonKezelo";
import BackupKezelo from "./BackupKezelo";
import CsapatokPage from "../modules/csapatok/CsapatokPage";
import AnyagtorzsPage from "./AnyagtorzsPage";
import { migrateMunkalapSzamok } from "../lib/munkalapSzam";
import { hasPdfSablon, savePdfSablon, deletePdfSablon, getPdfSablonMeta, readFileAsBase64 as lmraReadFile, LMRA_KOCKAZATOK } from "../lib/lmraService";
import { hasVbfPdfSablon, saveVbfPdfSablon, deleteVbfPdfSablon, getVbfPdfSablonMeta } from "../lib/vbfPdfMerge";

const MENU_ITEMS = [
  {
    id: "felhasznalok",
    label: "Felhasználók & Szerelő csapatok",
    desc: "CRM login felhasználók, jelszavak, szerepkörök + szerelő csapatok kezelése",
    icon: Users,
    color: C.accent,
    bg: C.accentLight,
  },
  {
    id: "fovallalkozok",
    label: "Fővállalkozók & Elszámolási szabályok",
    desc: "Fővállalkozók, km-elszámolás, díjtételek",
    icon: Building2,
    color: C.success,
    bg: C.successLight,
  },
  {
    id: "munkatipusok",
    label: "Munkatípusok",
    desc: "Munkatípus definíciók, bevételi tételek, árlogika",
    icon: Wrench,
    color: C.accent,
    bg: C.accentLight,
  },
  {
    id: "anyagtorzs",
    label: "Anyagtörzs",
    desc: "Villanyszerelési anyagok és egységárak – telepítő ebből választ",
    icon: Settings,
    color: "#0891B2",
    bg: "#F0F9FF",
  },
  {
    id: "munkakiosztas",
    label: "Munkakiosztás beállítások",
    desc: "Kiosztási szabályok, csapat kapacitás",
    icon: Settings,
    color: C.warning,
    bg: C.warningLight,
  },
  {
    id: "jegyzokonyv",
    label: "Jegyzőkönyv beállítások",
    desc: "VBF és átadási jegyzőkönyv konfigurációja",
    icon: FileText,
    color: C.accent,
    bg: C.accentLight,
  },
  {
    id: "sablonok",
    label: "Dokumentum sablonok",
    desc: "Word-szerű sablonszerkesztő, fejléc/lábléc kezelés",
    icon: FileText,
    color: C.danger,
    bg: C.dangerLight,
  },
  {
    id: "lmra",
    label: "LMRA – Kockázatbecslés",
    desc: "Last Minute Risk Assessment kockázati pontok szerkesztése",
    icon: Shield,
    color: C.danger,
    bg: C.dangerLight,
  },
  {
    id: "mentes",
    label: "Biztonsági mentések",
    desc: "Adatok mentése, visszaállítás, export JSON",
    icon: Shield,
    color: C.muted,
    bg: C.bg,
  },
  {
    id: "munkalapszam_migracio",
    label: "🔧 Munkalapszám javítás",
    desc: "Régi ml_xxx / #random azonosítók → E.D.I.XXX/001 formátum",
    icon: AlertTriangle,
    color: "#D97706",
    bg: "#FFFBEB",
  },
  {
    id: "drive_status",
    label: "Drive szinkron állapot",
    desc: "Kapcsolat teszt, kollekciónkénti szinkron napló, teljes Drive mentés",
    icon: Shield,
    color: C.accent,
    bg: C.accentLight,
  },
  {
    id: "oktatoanyagok",
    label: "Oktató anyagok (Drive link)",
    desc: "Telepítők számára elérhető Google Drive mappa URL-je",
    icon: BookOpen,
    color: C.accent,
    bg: C.accentLight,
  },
  {
    id: "vbfpdfsablon",
    label: "VBF Sablon (.pdf)",
    desc: "VBF PDF sablon feltöltése – adatlap az eredeti nyomtatványra",
    icon: Upload,
    color: C.danger,
    bg: C.dangerLight,
  },
  {
    id: "kezikonyvek",
    label: "Kézikönyvek & Útmutatók",
    desc: "Teljes rendszer-kézikönyv PDF-ben · Telepítői útmutató letöltése",
    icon: BookOpen,
    color: C.accent,
    bg: C.accentLight,
  },
  {
    id: "anyagtorzs",
    label: "Anyagtörzs",
    desc: "Anyag- és eszközkatalógus, árjegyzék az árajánlatokhoz",
    icon: Package,
    color: C.success,
    bg: C.successLight,
  },
  {
    id: "ajanlat_sablonok",
    label: "Ajánlati sablonok",
    desc: "Elmentett tételsor-sablonok az árajánlat-készítőhöz",
    icon: BookTemplate,
    color: C.accent,
    bg: C.accentLight,
  },
];

export default function BeallitasokPage({ currentUser }) {
  const [aktiv, setAktiv] = useState(null);
  const role = currentUser?.role;

  // Aloldal renderelése
  if (aktiv === "felhasznalok") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="Felhasználók & Csapatok" />
        <FelhasznalokCsapatokTab currentUser={currentUser} />
      </div>
    );
  }
  if (aktiv === "fovallalkozok") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="Fővállalkozók & Elszámolási szabályok" />
        <FovallalkozoPage userRole={role} />
      </div>
    );
  }
  if (aktiv === "munkatipusok") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="Munkatípusok" />
        <MunkatipusokPage userRole={role} />
      </div>
    );
  }
  if (aktiv === "sablonok") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="Dokumentum sablonok" />
        <SablonKezelo userRole={role} />
      </div>
    );
  }
  if (aktiv === "lmra") {
    return (
      <>
        <BackBtn onClick={() => setAktiv(null)} label="LMRA – Kockázatbecslés" />
        <LmraBeallitasok />
      </>
    );
  }

  if (aktiv === "anyagtorzs") {
    return (
      <>
        <BackBtn onClick={() => setAktiv(null)} label="Anyagtörzs" />
        <AnyagtorzsPage />
      </>
    );
  }

  if (aktiv === "munkalapszam_migracio") {
    return (
      <>
        <BackBtn onClick={() => setAktiv(null)} label="Munkalapszám javítás" />
        <MunkalapSzamMigracio />
      </>
    );
  }

  if (aktiv === "mentes") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="Biztonsági mentések" />
        <div style={{ padding: "0 0" }}>
          <BackupKezelo userRole={role} />
        </div>
      </div>
    );
  }
  if (aktiv === "drive_status") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="Drive szinkron állapot" />
        <DriveStatusPanel />
      </div>
    );
  }
  if (aktiv === "oktatoanyagok") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="Oktató anyagok Drive link" />
        <OktatoAnyagokBeallitas />
      </div>
    );
  }
  if (aktiv === "vbfpdfsablon") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="VBF Sablon (.pdf)" />
        <VbfPdfSablonBeallitas />
      </div>
    );
  }
  if (aktiv === "kezikonyvek") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="Kézikönyvek & Útmutatók" />
        <KezikonyvekPanel />
      </div>
    );
  }
  if (aktiv === "munkakiosztas") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="Munkakiosztás beállítások" />
        <div style={{ padding: "0 28px" }}>
          <MunkakiosztasBeallitasok />
        </div>
      </div>
    );
  }
  if (aktiv === "jegyzokonyv") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="Jegyzőkönyv beállítások" />
        <div style={{ padding: "0 28px" }}>
          <JegyzokonyviBeallitasok />
        </div>
      </div>
    );
  }

  if (aktiv === "anyagtorzs") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="Anyagtörzs" />
        <AnyagtorzsBeallitas />
      </div>
    );
  }
  if (aktiv === "ajanlat_sablonok") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="Ajánlati sablonok" />
        <AjanlatSablonokBeallitas />
      </div>
    );
  }

  // Főmenü – kártyás elrendezés
  const lathatoMenuk = MENU_ITEMS.filter(m => {
    if (role === "Admin") return true;
    if (role === "Projektmenedzser") return ["fovallalkozok","munkatipusok","munkakiosztas","sablonok","lmra","vbfpdfsablon","kezikonyvek"].includes(m.id);
    return false;
  });

  return (
    <div style={{ padding: "24px 28px", fontFamily: FONT, maxWidth: 800 }}>
      <h1 style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 6px" }}>
        ⚙️ Beállítások
      </h1>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
        Rendszer konfigurációja, felhasználók, elszámolási szabályok
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {lathatoMenuk.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setAktiv(item.id)}
              style={{
                background: "#fff",
                border: `1.5px solid ${C.border}`,
                borderRadius: 14,
                padding: "18px 20px",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: FONT,
                display: "flex",
                alignItems: "center",
                gap: 16,
                transition: "border-color .15s, box-shadow .15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.boxShadow = `0 0 0 3px ${item.color}18`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: 12,
                background: item.bg, display: "flex",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon size={22} color={item.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: C.text, margin: "0 0 3px", lineHeight: 1.3 }}>
                  {item.label}
                </p>
                <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.4 }}>
                  {item.desc}
                </p>
              </div>
              <ChevronRight size={16} color={C.border} style={{ flexShrink: 0 }} />
            </button>
          );
        })}
      </div>

      {role === "Admin" && <AdatTorlesPanel />}
    </div>
  );
}

// ─── Kézikönyvek panel ────────────────────────────────────────
function KezikonyvekPanel() {
  function openManual(print = false) {
    window.open(`/manual.html${print ? "?print=1" : ""}`, "_blank");
  }
  function openInstaller(print = false) {
    window.open(`/installer-guide.html${print ? "?print=1" : ""}`, "_blank");
  }
  return (
    <div style={{ padding: "0 28px 40px", fontFamily: FONT, maxWidth: 680 }}>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>
        Megnyitás → böngészőben olvasható · Letöltés PDF-ként → a megnyíló lapon kattints a <strong>„PDF mentés"</strong> gombra.
      </p>
      <div style={{ background: "#fff", border: "2px solid #BFDBFE", borderRadius: 14, padding: "22px 24px", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>📖</div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, color: C.text, margin: "0 0 4px" }}>Teljes rendszer-kézikönyv</p>
            <p style={{ fontSize: 12.5, color: C.muted, margin: 0, lineHeight: 1.5 }}>Összes funkció Admin / PM / Iroda felhasználóknak. Telepítős fejezet is benne van.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => openManual(false)} style={{ flex: 1, padding: "10px 0", background: C.accentLight, color: C.accent, border: `1.5px solid ${C.accent}40`, borderRadius: 9, fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>🌐 Megnyitás böngészőben</button>
          <button onClick={() => openManual(true)} style={{ flex: 1, padding: "10px 0", background: C.accent, color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>📥 Letöltés PDF-ként</button>
        </div>
      </div>
      <div style={{ background: "#fff", border: "2px solid #86EFAC", borderRadius: 14, padding: "22px 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: C.successLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 22 }}>📱</div>
          <div>
            <p style={{ fontWeight: 800, fontSize: 15, color: C.text, margin: "0 0 4px" }}>Telepítői kézikönyv</p>
            <p style={{ fontSize: 12.5, color: C.muted, margin: 0, lineHeight: 1.5 }}>Felmérés (7 fotókat.) + Kivitelezés (LMRA, VBF, 29 fotókat.) lépésről lépésre. Nyomtatva add az új telepítőknek.</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => openInstaller(false)} style={{ flex: 1, padding: "10px 0", background: C.successLight, color: C.success, border: `1.5px solid ${C.success}40`, borderRadius: 9, fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>🌐 Megnyitás böngészőben</button>
          <button onClick={() => openInstaller(true)} style={{ flex: 1, padding: "10px 0", background: C.success, color: "#fff", border: "none", borderRadius: 9, fontWeight: 700, fontSize: 13, fontFamily: FONT, cursor: "pointer" }}>📥 Letöltés PDF-ként</button>
        </div>
      </div>
    </div>
  );
}

// ─── Admin: Operatív adatok törlése ──────────────────────────
function AdatTorlesPanel() {
  const [confirm, setConfirm] = useState("");
  const [done, setDone]       = useState(false);

  const TORLENDO = [
    { key: "ugyfelek",    label: "Ügyfelek",   ertek: [] },
    { key: "munkalapok",  label: "Munkalapok", ertek: [] },
    { key: "projektek",   label: "Projektek",  ertek: [] },
    { key: "szamlak",     label: "Számlák",    ertek: [] },
    { key: "karteritesek",label: "Kártérítések",ertek:[] },
  ];

  function handleTorles() {
    if (confirm !== "TÖRLÉS") return;
    TORLENDO.forEach(({ key, ertek }) => saveLocal(key, ertek));
    // Projekt sorszám számláló reset
    localStorage.removeItem("edi_projekt_sorszam_counter");
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "all" } }));
    setDone(true);
    setConfirm("");
  }

  return (
    <div style={{ marginTop: 32, padding: "20px 24px", border: `2px solid ${C.danger}50`, borderRadius: 14, background: C.dangerLight }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Trash2 size={20} color={C.danger} />
        <span style={{ fontWeight: 800, fontSize: 15, color: C.danger }}>Operatív adatok törlése</span>
      </div>
      <p style={{ fontSize: 13, color: C.danger, marginBottom: 12, lineHeight: 1.6 }}>
        Ez a funkció törli az összes ügyfelet, munkalapot, projektet, számlát és kártérítést a böngészőből.
        A beállítások, felhasználók, fővállalkozók és munkatípusok <strong>megmaradnak</strong>.<br />
        A Drive-on tárolt adatokat ez nem törli — ott manuálisan kell.
      </p>
      <p style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
        Törlendő: {TORLENDO.map(t => t.label).join(", ")}
      </p>
      {done ? (
        <div style={{ background: C.successLight, border: `1px solid ${C.success}50`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.success, fontWeight: 700 }}>
          ✅ Adatok törölve. Frissítsd az oldalt (F5) a teljes hatáshoz.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder='Írd be: TÖRLÉS'
            style={{ padding: "8px 12px", border: `1.5px solid ${C.danger}50`, borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", width: 200 }}
          />
          <button
            type="button"
            onClick={handleTorles}
            disabled={confirm !== "TÖRLÉS"}
            style={{ padding: "8px 18px", background: confirm === "TÖRLÉS" ? C.danger : C.dangerLight, color: "#fff", border: "none", borderRadius: 8, cursor: confirm === "TÖRLÉS" ? "pointer" : "default", fontWeight: 700, fontSize: 13 }}
          >
            Törlés
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Felhasználók & Csapatok – kombinált tab nézet ───────────
function FelhasznalokCsapatokTab({ currentUser }) {
  const [tab, setTab] = useState("felhasznalok");

  function tabStyle(id) {
    const active = tab === id;
    return {
      padding: "9px 22px", border: "none", cursor: "pointer", fontFamily: FONT,
      fontWeight: active ? 700 : 400, fontSize: 14,
      color: active ? C.accent : C.textSub,
      background: active ? "#fff" : "transparent",
      borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent",
    };
  }

  return (
    <div>
      {/* Tab fejléc */}
      <div style={{ borderBottom: `1px solid ${C.border}`, display: "flex", gap: 2, background: C.bg }}>
        <button style={tabStyle("felhasznalok")} onClick={() => setTab("felhasznalok")}>
          👤 CRM Felhasználók (login)
        </button>
        <button style={tabStyle("csapatok")} onClick={() => setTab("csapatok")}>
          🛠️ Szerelő csapatok
        </button>
      </div>

      {tab === "felhasznalok" && (
        <div style={{ padding: "0 28px" }}>
          <div style={{ padding: "12px 0 4px", fontSize: 12, color: C.muted }}>
            Akik be tudnak lépni a CRM rendszerbe (Admin, PM, Telepítő, Iroda szerepkörrel).
          </div>
          <AdminPanel currentUser={currentUser} />
        </div>
      )}

      {tab === "csapatok" && (
        <div>
          <div style={{ padding: "12px 28px 4px", fontSize: 12, color: C.muted }}>
            Szerelő csapatok: kiszállási helyszín, tagok, kapacitás. Projektekhez rendelhetők.
          </div>
          <CsapatokPage currentUser={currentUser} />
        </div>
      )}
    </div>
  );
}

// ─── VBF Sablon feltöltés ─────────────────────────────────────
function VbfSablonBeallitas() {
  const fileRef  = useRef();
  const [van,  setVan]  = useState(hasSablon);
  const [meta, setMeta] = useState(getSablonMeta);
  const [uploading, setUploading] = useState(false);
  const [showDocs, setShowDocs]   = useState(false);

  async function handleFeltoltes(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".docx")) {
      alert("Csak .docx (Word) fájl fogadható el!");
      return;
    }
    setUploading(true);
    try {
      const b64 = await readFileAsBase64(file);
      saveSablon(b64);
      setVan(true);
      setMeta(getSablonMeta());
    } catch (err) {
      alert("Feltöltés sikertelen: " + err.message);
    }
    setUploading(false);
    e.target.value = "";
  }

  function handleTorles() {
    if (!window.confirm("Biztosan törlöd a feltöltött VBF sablont?")) return;
    deleteSablon();
    setVan(false);
    setMeta(null);
  }

  return (
    <div style={{ padding: "28px", fontFamily: FONT, maxWidth: 720 }}>

      {/* Állapot kártya */}
      <div style={{
        background: van ? C.successLight : C.warningLight,
        border: `1.5px solid ${van ? C.success : C.warning}50`,
        borderRadius: 12, padding: "16px 20px", marginBottom: 24,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        {van
          ? <CheckCircle2 size={22} color={C.success}/>
          : <Upload size={22} color={C.warning}/>
        }
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: van ? C.success : C.warning, margin: 0 }}>
            {van ? `✓ VBF sablon feltöltve (${meta?.kb ?? "?"} KB)` : "Nincs sablon feltöltve"}
          </p>
          <p style={{ fontSize: 12, color: van ? C.success : C.warning, margin: "3px 0 0" }}>
            {van
              ? "A PM felületen megjelenik a 'VBF letöltés (.docx)' gomb minden kitöltött munkalapnál."
              : "Töltsd fel a Word (.docx) sablont az alábbi gombbal."}
          </p>
        </div>
        {van && (
          <button onClick={handleTorles} style={{ padding: "6px 14px", background: C.dangerLight, color: C.danger, border: "1px solid #FECACA", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT }}>
            Törlés
          </button>
        )}
      </div>

      {/* Feltöltés gomb */}
      <input ref={fileRef} type="file" accept=".docx" style={{ display:"none" }} onChange={handleFeltoltes}/>
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "11px 22px",
          background: uploading ? C.border : C.accent,
          color: "#fff", border: "none", borderRadius: 10,
          cursor: uploading ? "default" : "pointer",
          fontWeight: 700, fontSize: 14, fontFamily: FONT,
          marginBottom: 28,
        }}
      >
        <Upload size={16}/>
        {uploading ? "Feltöltés..." : van ? "Sablon cseréje" : "Word sablon (.docx) feltöltése"}
      </button>

      {/* Útmutató: hogyan kell a Word fájlt előkészíteni */}
      <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 20 }}>
        <button
          onClick={() => setShowDocs(s => !s)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: C.bg, border: "none", cursor: "pointer", fontFamily: FONT }}
        >
          <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>
            📋 Útmutató: hogyan kell a Word sablont előkészíteni?
          </span>
          <span style={{ fontSize: 18, color: C.muted }}>{showDocs ? "▲" : "▼"}</span>
        </button>

        {showDocs && (
          <div style={{ padding: "18px 20px" }}>
            <div style={{ background: C.accentLight, border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: C.accent, margin: "0 0 6px" }}>Lépések:</p>
              <ol style={{ fontSize: 13, color: C.accent, margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                <li>Nyisd meg a Word sablont</li>
                <li>Ahol az adatnak kell megjelennie, <strong>írd be a placeholdereket</strong> az alábbi listából: pl. <code style={{ background:C.accentLight, padding:"1px 5px", borderRadius:4 }}>{"{ugyfel_nev}"}</code></li>
                <li>A kapcsos zárójeleket <strong>pontosan így írd</strong> – egy nyitó <code>{"{"}</code> és egy záró <code>{"}"}</code></li>
                <li>Mentsd el a fájlt <strong>.docx formátumban</strong></li>
                <li>Töltsd fel ide a fenti gombbal</li>
              </ol>
            </div>

            {VBF_PLACEHOLDER_DOCS.map(({ csoport, mezok }) => (
              <div key={csoport} style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>{csoport}</p>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <tbody>
                    {mezok.map(([placeholder, leiras]) => (
                      <tr key={placeholder} style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "7px 12px", fontFamily: "monospace", color: C.accent, fontWeight: 700, whiteSpace: "nowrap", background: C.accentLight }}>
                          {placeholder}
                        </td>
                        <td style={{ padding: "7px 12px", color: C.textSub, fontSize: 12 }}>
                          {leiras}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            <div style={{ background: C.warningLight, border: "1px solid #FCD34D", borderRadius: 10, padding: "10px 14px", marginTop: 8 }}>
              <p style={{ fontSize: 12, color: C.warning, margin: 0, fontWeight: 600 }}>
                ⚠️ Fontos: Ha a Word fájlban van olyan <code>{"{placeholder}"}</code> ami nem szerepel a fenti listában, hibát kapsz generáláskor.
                Ellenőrizd, hogy minden kapcsos zárójeles kifejezés szerepel a listában!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Oktató anyagok Drive link beállítás ─────────────────────
function OktatoAnyagokBeallitas() {
  const beall = loadLocal("beallitasok") || {};
  const [url, setUrl] = useState(beall.oktatoAnyagokUrl || "");
  const [mentve, setMentve] = useState(false);

  function handleMent() {
    const current = loadLocal("beallitasok") || {};
    saveLocal("beallitasok", { ...current, oktatoAnyagokUrl: url.trim() });
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "beallitasok" } }));
    setMentve(true);
    setTimeout(() => setMentve(false), 2500);
  }

  return (
    <div style={{ padding: "28px", fontFamily: FONT, maxWidth: 600 }}>
      <div style={{ background: C.accentLight, border: `1.5px solid ${C.success}50`, borderRadius: 12, padding: "14px 18px", marginBottom: 24 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: C.accent, margin: "0 0 4px" }}>
          📚 Hogyan működik?
        </p>
        <p style={{ fontSize: 13, color: C.accent, margin: 0, lineHeight: 1.6 }}>
          Adj meg egy Google Drive mappa megosztási linkjét. A Telepítők az oldalsávban lévő
          <strong> "Oktató anyagok"</strong> gombra kattintva automatikusan megnyílik ez a mappa.
          Az anyagokat (útmutatók, sémák, szabályok) te töltöd fel a mappába.
        </p>
      </div>

      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>
        Google Drive mappa URL
      </label>
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://drive.google.com/drive/folders/..."
        style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 14, fontFamily: FONT, outline: "none", background: C.bg, marginBottom: 12 }}
      />

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: C.accent, marginBottom: 16, textDecoration: "none", fontWeight: 600 }}
        >
          <ExternalLink size={13} /> Megnyitás tesztként (új fülön)
        </a>
      )}

      <button
        onClick={handleMent}
        style={{ padding: "10px 24px", background: mentve ? C.success : C.accent, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT, display: "flex", alignItems: "center", gap: 8 }}
      >
        {mentve ? "✓ Mentve!" : "Mentés"}
      </button>

      {beall.oktatoAnyagokUrl && (
        <div style={{ marginTop: 20, padding: "10px 14px", background: C.successLight, border: "1px solid #86EFAC", borderRadius: 9, fontSize: 12, color: C.success }}>
          ✓ Jelenleg beállított URL: <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{beall.oktatoAnyagokUrl}</span>
        </div>
      )}
    </div>
  );
}

function BackBtn({ onClick, label }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "14px 28px", borderBottom: `1px solid ${C.border}`,
      background: "#fff",
    }}>
      <button onClick={onClick} style={{
        display: "flex", alignItems: "center", gap: 6,
        border: "none", background: "none", cursor: "pointer",
        fontSize: 13, color: C.muted, fontFamily: FONT, fontWeight: 600, padding: 0,
      }}>
        ← Beállítások
      </button>
      <span style={{ color: C.border }}>›</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{label}</span>
    </div>
  );
}

// ─── LMRA Beállítások – PDF sablon feltöltés ─────────────────

function LmraBeallitasok() {
  const fileRef = useRef();
  const [van,     setVan]     = useState(hasPdfSablon);
  const [meta,    setMeta]    = useState(getPdfSablonMeta);
  const [loading, setLoading] = useState(false);

  async function handleFeltoltes(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(pdf|docx)$/i)) {
      alert("Csak PDF vagy DOCX fájl fogadható el!"); return;
    }
    setLoading(true);
    try {
      const b64 = await lmraReadFile(file);
      savePdfSablon(b64);
      setVan(true); setMeta(getPdfSablonMeta());
    } catch (err) { alert("Feltöltés sikertelen: " + err.message); }
    setLoading(false); e.target.value = "";
  }

  function handleTorles() {
    if (!window.confirm("Biztosan törlöd a feltöltött LMRA nyomtatványt?")) return;
    deletePdfSablon(); setVan(false); setMeta(null);
  }

  return (
    <div style={{ padding: "20px 24px", fontFamily: FONT, maxWidth: 640 }}>
      {/* Info */}
      <div style={{ background: C.dangerLight, border: `1.5px solid ${C.danger}50`, borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10 }}>
        <Shield size={18} color={C.danger} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontWeight: 700, fontSize: 13, color: C.danger, margin: 0 }}>LMRA – Munkavégzést megelőző kockázatértékelés</p>
          <p style={{ fontSize: 12, color: C.danger, margin: "3px 0 0" }}>
            Töltsd fel az eredeti, rögzített LMRA nyomtatványt PDF formátumban.
            Helyszínen a telepítők megtekinthetik és mellette kitöltik a digitális verziót, majd aláírnak.
          </p>
        </div>
      </div>

      {/* Sablon állapot */}
      <div style={{ background: van ? C.successLight : C.warningLight, border: `1.5px solid ${van ? C.success : C.warning}50`, borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
        {van ? <CheckCircle2 size={22} color={C.success} /> : <Upload size={22} color={C.warning} />}
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: van ? C.success : C.warning, margin: 0 }}>
            {van ? `✓ LMRA nyomtatvány feltöltve (${meta?.kb ?? "?"} KB)` : "Nincs sablon feltöltve"}
          </p>
          <p style={{ fontSize: 12, color: van ? C.success : C.warning, margin: "2px 0 0" }}>
            {van ? "Helyszínen a 'Nyomtatvány' gombra kattintva megtekinthető referenciának." : "Feltöltés nélkül is működik a digitális LMRA flow."}
          </p>
        </div>
        {van && (
          <button onClick={handleTorles} style={{ padding: "6px 14px", background: C.dangerLight, color: C.danger, border: "1px solid #FECACA", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT }}>
            Törlés
          </button>
        )}
      </div>

      {/* Feltöltés gomb */}
      <input ref={fileRef} type="file" accept=".pdf,.docx" style={{ display: "none" }} onChange={handleFeltoltes} />
      <button onClick={() => fileRef.current?.click()} disabled={loading}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 22px", background: loading ? C.border : C.danger, color: "#fff", border: "none", borderRadius: 10, cursor: loading ? "default" : "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT, marginBottom: 28 }}>
        <Upload size={16} />
        {loading ? "Feltöltés..." : van ? "Nyomtatvány cseréje (.pdf / .docx)" : "LMRA nyomtatvány feltöltése (.pdf / .docx)"}
      </button>

      {/* Kockázat lista tájékoztató */}
      <div style={{ background: C.bg, border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7, margin: "0 0 10px" }}>
          Digitális kockázati pontok ({LMRA_KOCKAZATOK.length} db) – rögzített lista
        </p>
        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px" }}>
          Ezek a pontok az eredeti nyomtatványból kerültek be. Igen/Nem értékelést adnak róluk helyszínen.
        </p>
        {LMRA_KOCKAZATOK.map((k, i) => (
          <div key={k.id} style={{ fontSize: 12, color: C.textSub, padding: "4px 0", borderBottom: "1px solid #F1F5F9", display: "flex", gap: 8 }}>
            <span style={{ color: C.muted, fontWeight: 700, minWidth: 20 }}>{i + 1}.</span>
            {k.szoveg}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── VBF PDF Sablon feltöltés ─────────────────────────────────
function VbfPdfSablonBeallitas() {
  const fileRef  = useRef();
  const [van,     setVan]     = useState(hasVbfPdfSablon);
  const [meta,    setMeta]    = useState(getVbfPdfSablonMeta);
  const [loading, setLoading] = useState(false);

  async function handleFeltoltes(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      alert("Csak PDF fájl tölthető fel.");
      e.target.value = "";
      return;
    }
    setLoading(true);
    try {
      const b64 = await lmraReadFile(file);
      saveVbfPdfSablon(b64);
      setVan(true);
      setMeta(getVbfPdfSablonMeta());
    } catch (err) {
      alert("Feltöltés sikertelen: " + err.message);
    }
    setLoading(false);
    e.target.value = "";
  }

  function handleTorles() {
    if (!window.confirm("Biztosan törlöd a feltöltött VBF PDF sablont?")) return;
    deleteVbfPdfSablon();
    setVan(false);
    setMeta(null);
  }

  return (
    <div style={{ padding: "16px 0" }}>
      <div style={{ background: C.dangerLight, border: `1.5px solid ${C.danger}50`, borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Upload size={18} color={C.danger} style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontWeight: 700, fontSize: 13, color: C.danger, margin: 0 }}>VBF – Villamos Biztonsági Felülvizsgálati Jegyzőkönyv (PDF sablon)</p>
          <p style={{ fontSize: 12, color: C.danger, margin: "3px 0 0" }}>
            Töltsd fel az eredeti VBF nyomtatványt PDF formátumban. A letöltött dokumentum az eredeti sablont
            tartalmazza + az utolsó oldalon a kitöltött mérési adatokat.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "12px 16px", background: van ? C.successLight : C.warningLight, border: `1px solid ${van ? C.success : C.warning}`, borderRadius: 10 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: van ? C.success : C.warning, margin: 0 }}>
            {van ? `✓ VBF PDF sablon feltöltve (${meta?.kb ?? "?"} KB)` : "Nincs PDF sablon feltöltve"}
          </p>
          <p style={{ fontSize: 12, color: van ? C.success : C.warning, margin: "3px 0 0" }}>
            {van ? "Munkalap nézetben megjelenik a 'VBF .pdf' letöltés gomb." : "Feltöltés nélkül a VBF adatlap csak adatoldalt tartalmaz sablon nélkül."}
          </p>
        </div>
        {van && (
          <button onClick={handleTorles} style={{ padding: "7px 14px", background: C.dangerLight, color: C.danger, border: "1px solid #FECACA", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: FONT }}>
            Törlés
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFeltoltes} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 22px", background: loading ? C.border : C.danger, color: "#fff", border: "none", borderRadius: 10, cursor: loading ? "default" : "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT, marginBottom: 16 }}
      >
        <Upload size={16} />
        {loading ? "Feltöltés..." : van ? "PDF sablon cseréje" : "VBF PDF sablon feltöltése (.pdf)"}
      </button>

      <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
        <p style={{ fontSize: 12, color: C.textSub, margin: 0, lineHeight: 1.7 }}>
          <strong>Hogyan működik:</strong><br />
          1. Töltsd fel az eredeti VBF nyomtatvány PDF-jét itt.<br />
          2. A Telepítő kitölti a VBF méréssort a munkalap nézetben.<br />
          3. PM / Admin a munkalap nézetben: „VBF .pdf" gomb → letölt egyetlen PDF-et,<br />
          &nbsp;&nbsp;&nbsp;amelynek első oldala az eredeti sablon, utolsó oldala a kitöltött adatok.<br />
          <br />
          <strong>Word sablon is elérhető:</strong> Beállítások → VBF Sablon (.docx) – ha a Word sablonba
          {` {placeholder}`} mezőket írsz, a „VBF .docx" gomb pontosan beleilleszt minden mért értéket.
        </p>
      </div>
    </div>
  );
}

// ─── Munkalapszám Migráció ────────────────────────────────────

function MunkalapSzamMigracio() {
  const [eredmeny, setEredmeny] = useState(null);
  const [mentve, setMentve]     = useState(false);

  function handleElemez() {
    const mls = JSON.parse(localStorage.getItem("munkalapok") || "[]");
    const prj = JSON.parse(localStorage.getItem("projektek")  || "[]");
    const result = migrateMunkalapSzamok(mls, prj);
    setEredmeny(result);
    setMentve(false);
  }

  function handleJavit() {
    if (!eredmeny?.fixed?.length) return;
    const mls = JSON.parse(localStorage.getItem("munkalapok") || "[]");
    const frissitett = mls.map(m => {
      const fix = eredmeny.fixed.find(f => f.id === m.id);
      if (!fix) return m;
      return { ...m, dokumentumszam: fix.uj, munkalapSzam: fix.uj, _projektSorszam: fix._projektSorszam };
    });
    localStorage.setItem("munkalapok", JSON.stringify(frissitett));
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "munkalapok" } }));
    setMentve(true);
  }

  const inp = { width:"100%",boxSizing:"border-box",padding:"7px 10px",border:`1px solid ${C.border}`,borderRadius:7,fontSize:12,fontFamily:FONT,outline:"none",background:"#F8FAFC" };

  return (
    <div style={{ padding:"16px 20px", fontFamily:FONT, maxWidth:640 }}>
      <div style={{ background:"#FFFBEB",border:"1.5px solid #FCD34D",borderRadius:12,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#92400E" }}>
        ⚠️ Ez az eszköz elemzi a meglévő munkalapszámokat és javítja a helytelen formátumokat.<br/>
        <strong>Adatot nem töröl – csak a dokumentumszam mezőt egészíti ki.</strong>
      </div>
      <button onClick={handleElemez}
        style={{ padding:"10px 20px",background:C.accent,color:"#fff",border:"none",borderRadius:9,cursor:"pointer",fontWeight:700,fontFamily:FONT,marginBottom:16 }}>
        🔍 Munkalapszámok elemzése
      </button>
      {eredmeny && (
        <div>
          {eredmeny.fixed.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <p style={{ fontWeight:700,fontSize:13,color:"#059669",marginBottom:8 }}>✅ Javítható: {eredmeny.fixed.length} munkalap</p>
              <div style={{ maxHeight:200,overflowY:"auto",border:`1px solid ${C.border}`,borderRadius:9 }}>
                {eredmeny.fixed.map(f => (
                  <div key={f.id} style={{ padding:"7px 12px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:12,fontSize:12 }}>
                    <span style={{ color:C.muted,textDecoration:"line-through",minWidth:120 }}>{f.regi}</span>
                    <span style={{ color:"#059669",fontWeight:700 }}>→ {f.uj}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {eredmeny.needsAdminCheck.length > 0 && (
            <div style={{ marginBottom:14 }}>
              <p style={{ fontWeight:700,fontSize:13,color:"#DC2626",marginBottom:8 }}>⚠️ Admin ellenőrzés szükséges: {eredmeny.needsAdminCheck.length} munkalap</p>
              <div style={{ maxHeight:200,overflowY:"auto",border:`1px solid #FECACA`,borderRadius:9 }}>
                {eredmeny.needsAdminCheck.map(f => (
                  <div key={f.id} style={{ padding:"7px 12px",borderBottom:`1px solid #FEF2F2`,display:"flex",gap:12,fontSize:12 }}>
                    <span style={{ color:C.muted,minWidth:120 }}>{f.regi}</span>
                    <span style={{ color:"#DC2626" }}>← {f.ok}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {eredmeny.fixed.length === 0 && eredmeny.needsAdminCheck.length === 0 && (
            <div style={{ background:"#ECFDF5",border:"1px solid #86EFAC",borderRadius:9,padding:"10px 14px",fontSize:13,color:"#166534" }}>
              ✅ Minden munkalapszám helyes formátumú!
            </div>
          )}
          {eredmeny.fixed.length > 0 && (
            <button onClick={handleJavit} disabled={mentve}
              style={{ padding:"11px 22px",background:mentve?"#059669":C.accent,color:"#fff",border:"none",borderRadius:9,cursor:mentve?"default":"pointer",fontWeight:700,fontFamily:FONT }}>
              {mentve ? "✅ Mentve!" : `Javítás alkalmazása (${eredmeny.fixed.length} munkalap)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
