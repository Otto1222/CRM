import { useState, useRef, useEffect } from "react";
import {
  Users, Settings, FileText, Wrench, Building2, ChevronRight, BookTemplate, Shield, Trash2, BookOpen, ExternalLink, Upload, CheckCircle2, Save, Check, X, UserPlus, Pencil, HardHat,
} from "lucide-react";
import { loadLocal, saveLocal } from "../lib/localDb";
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

const MENU_ITEMS = [
  {
    id: "felhasznalok",
    label: "Felhasználók & Szerelő csapatok",
    desc: "CRM login felhasználók, jelszavak, szerepkörök + szerelő csapatok kezelése",
    icon: Users,
    color: "#2563EB",
    bg: "#EFF6FF",
  },
  {
    id: "fovallalkozok",
    label: "Fővállalkozók & Elszámolási szabályok",
    desc: "Fővállalkozók, km-elszámolás, díjtételek",
    icon: Building2,
    color: "#059669",
    bg: "#ECFDF5",
  },
  {
    id: "munkatipusok",
    label: "Munkatípusok",
    desc: "Munkatípus definíciók, bevételi tételek, árlogika",
    icon: Wrench,
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  {
    id: "munkakiosztas",
    label: "Munkakiosztás beállítások",
    desc: "Kiosztási szabályok, csapat kapacitás",
    icon: Settings,
    color: "#D97706",
    bg: "#FFFBEB",
  },
  {
    id: "jegyzokonyv",
    label: "Jegyzőkönyv beállítások",
    desc: "VBF és átadási jegyzőkönyv konfigurációja",
    icon: FileText,
    color: "#0891B2",
    bg: "#ECFEFF",
  },
  {
    id: "sablonok",
    label: "Dokumentum sablonok",
    desc: "Word-szerű sablonszerkesztő, fejléc/lábléc kezelés",
    icon: FileText,
    color: "#DC2626",
    bg: "#FEF2F2",
  },
  {
    id: "telepito_csapatok",
    label: "Telepítő csapatok",
    desc: "LMRA aláíráshoz: telepítő csapatok és tagjaik kezelése",
    icon: HardHat,
    color: "#059669",
    bg: "#ECFDF5",
  },
  {
    id: "lmra",
    label: "LMRA – Kockázatbecslés",
    desc: "Last Minute Risk Assessment kockázati pontok szerkesztése",
    icon: Shield,
    color: "#DC2626",
    bg: "#FEF2F2",
  },
  {
    id: "mentes",
    label: "Biztonsági mentések",
    desc: "Adatok mentése, visszaállítás, export JSON",
    icon: Shield,
    color: "#475569",
    bg: "#F8FAFC",
  },
  {
    id: "drive_status",
    label: "Drive szinkron állapot",
    desc: "Kapcsolat teszt, kollekciónkénti szinkron napló, teljes Drive mentés",
    icon: Shield,
    color: "#0891B2",
    bg: "#ECFEFF",
  },
  {
    id: "oktatoanyagok",
    label: "Oktató anyagok (Drive link)",
    desc: "Telepítők számára elérhető Google Drive mappa URL-je",
    icon: BookOpen,
    color: "#0891B2",
    bg: "#ECFEFF",
  },
  {
    id: "vbfpdfsablon",
    label: "VBF Sablon (.pdf)",
    desc: "VBF PDF sablon feltöltése – adatlap az eredeti nyomtatványra",
    icon: Upload,
    color: "#DC2626",
    bg: "#FEF2F2",
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
  if (aktiv === "telepito_csapatok") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="Telepítő csapatok" />
        <TelepitoCsapatokBeallitas />
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

  // Főmenü – kártyás elrendezés
  const lathatoMenuk = MENU_ITEMS.filter(m => {
    if (role === "Admin") return true;
    if (role === "Projektmenedzser") return ["fovallalkozok","munkatipusok","munkakiosztas","sablonok","lmra","vbfpdfsablon"].includes(m.id);
    return false;
  });

  return (
    <div style={{ padding: "24px 28px", fontFamily: FONT, maxWidth: 800 }}>
      <h1 style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 800, color: "#0F172A", margin: "0 0 6px" }}>
        ⚙️ Beállítások
      </h1>
      <p style={{ fontSize: 13, color: "#64748B", marginBottom: 24 }}>
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
                <p style={{ fontWeight: 700, fontSize: 14, color: "#0F172A", margin: "0 0 3px", lineHeight: 1.3 }}>
                  {item.label}
                </p>
                <p style={{ fontSize: 12, color: "#64748B", margin: 0, lineHeight: 1.4 }}>
                  {item.desc}
                </p>
              </div>
              <ChevronRight size={16} color="#CBD5E1" style={{ flexShrink: 0 }} />
            </button>
          );
        })}
      </div>

      {role === "Admin" && <AdatTorlesPanel />}
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
    <div style={{ marginTop: 32, padding: "20px 24px", border: "2px solid #FECACA", borderRadius: 14, background: "#FFF5F5" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Trash2 size={20} color="#DC2626" />
        <span style={{ fontWeight: 800, fontSize: 15, color: "#DC2626" }}>Operatív adatok törlése</span>
      </div>
      <p style={{ fontSize: 13, color: "#7F1D1D", marginBottom: 12, lineHeight: 1.6 }}>
        Ez a funkció törli az összes ügyfelet, munkalapot, projektet, számlát és kártérítést a böngészőből.
        A beállítások, felhasználók, fővállalkozók és munkatípusok <strong>megmaradnak</strong>.<br />
        A Drive-on tárolt adatokat ez nem törli — ott manuálisan kell.
      </p>
      <p style={{ fontSize: 12, color: "#64748B", marginBottom: 8 }}>
        Törlendő: {TORLENDO.map(t => t.label).join(", ")}
      </p>
      {done ? (
        <div style={{ background: "#ECFDF5", border: "1px solid #6EE7B7", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#065F46", fontWeight: 700 }}>
          ✅ Adatok törölve. Frissítsd az oldalt (F5) a teljes hatáshoz.
        </div>
      ) : (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder='Írd be: TÖRLÉS'
            style={{ padding: "8px 12px", border: "1.5px solid #FECACA", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", width: 200 }}
          />
          <button
            type="button"
            onClick={handleTorles}
            disabled={confirm !== "TÖRLÉS"}
            style={{ padding: "8px 18px", background: confirm === "TÖRLÉS" ? "#DC2626" : "#FCA5A5", color: "#fff", border: "none", borderRadius: 8, cursor: confirm === "TÖRLÉS" ? "pointer" : "default", fontWeight: 700, fontSize: 13 }}
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
      <div style={{ borderBottom: `1px solid ${C.border}`, display: "flex", gap: 2, background: "#F8FAFC" }}>
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
        background: van ? "#F0FDF4" : "#FFFBEB",
        border: `1.5px solid ${van ? "#86EFAC" : "#FCD34D"}`,
        borderRadius: 12, padding: "16px 20px", marginBottom: 24,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        {van
          ? <CheckCircle2 size={22} color="#059669"/>
          : <Upload size={22} color="#D97706"/>
        }
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: van ? "#166534" : "#92400E", margin: 0 }}>
            {van ? `✓ VBF sablon feltöltve (${meta?.kb ?? "?"} KB)` : "Nincs sablon feltöltve"}
          </p>
          <p style={{ fontSize: 12, color: van ? "#15803D" : "#D97706", margin: "3px 0 0" }}>
            {van
              ? "A PM felületen megjelenik a 'VBF letöltés (.docx)' gomb minden kitöltött munkalapnál."
              : "Töltsd fel a Word (.docx) sablont az alábbi gombbal."}
          </p>
        </div>
        {van && (
          <button onClick={handleTorles} style={{ padding: "6px 14px", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT }}>
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
          background: uploading ? "#E2E8F0" : "#7C3AED",
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
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px", background: "#F8FAFC", border: "none", cursor: "pointer", fontFamily: FONT }}
        >
          <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>
            📋 Útmutató: hogyan kell a Word sablont előkészíteni?
          </span>
          <span style={{ fontSize: 18, color: C.muted }}>{showDocs ? "▲" : "▼"}</span>
        </button>

        {showDocs && (
          <div style={{ padding: "18px 20px" }}>
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "12px 16px", marginBottom: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: "#1D4ED8", margin: "0 0 6px" }}>Lépések:</p>
              <ol style={{ fontSize: 13, color: "#1E40AF", margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
                <li>Nyisd meg a Word sablont</li>
                <li>Ahol az adatnak kell megjelennie, <strong>írd be a placeholdereket</strong> az alábbi listából: pl. <code style={{ background:"#DBEAFE", padding:"1px 5px", borderRadius:4 }}>{"{ugyfel_nev}"}</code></li>
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
                        <td style={{ padding: "7px 12px", fontFamily: "monospace", color: "#7C3AED", fontWeight: 700, whiteSpace: "nowrap", background: "#F5F3FF" }}>
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

            <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 10, padding: "10px 14px", marginTop: 8 }}>
              <p style={{ fontSize: 12, color: "#92400E", margin: 0, fontWeight: 600 }}>
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
      <div style={{ background: "#ECFEFF", border: "1.5px solid #67E8F9", borderRadius: 12, padding: "14px 18px", marginBottom: 24 }}>
        <p style={{ fontWeight: 700, fontSize: 14, color: "#0E7490", margin: "0 0 4px" }}>
          📚 Hogyan működik?
        </p>
        <p style={{ fontSize: 13, color: "#0E7490", margin: 0, lineHeight: 1.6 }}>
          Adj meg egy Google Drive mappa megosztási linkjét. A Telepítők az oldalsávban lévő
          <strong> "Oktató anyagok"</strong> gombra kattintva automatikusan megnyílik ez a mappa.
          Az anyagokat (útmutatók, sémák, szabályok) te töltöd fel a mappába.
        </p>
      </div>

      <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>
        Google Drive mappa URL
      </label>
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="https://drive.google.com/drive/folders/..."
        style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 14, fontFamily: FONT, outline: "none", background: "#FAFAFA", marginBottom: 12 }}
      />

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#0891B2", marginBottom: 16, textDecoration: "none", fontWeight: 600 }}
        >
          <ExternalLink size={13} /> Megnyitás tesztként (új fülön)
        </a>
      )}

      <button
        onClick={handleMent}
        style={{ padding: "10px 24px", background: mentve ? "#059669" : "#0891B2", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT, display: "flex", alignItems: "center", gap: 8 }}
      >
        {mentve ? "✓ Mentve!" : "Mentés"}
      </button>

      {beall.oktatoAnyagokUrl && (
        <div style={{ marginTop: 20, padding: "10px 14px", background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 9, fontSize: 12, color: "#166534" }}>
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
        fontSize: 13, color: "#64748B", fontFamily: FONT, fontWeight: 600, padding: 0,
      }}>
        ← Beállítások
      </button>
      <span style={{ color: "#CBD5E1" }}>›</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{label}</span>
    </div>
  );
}

// ─── LMRA Beállítások – PDF sablon feltöltés ─────────────────
import { hasPdfSablon, savePdfSablon, deletePdfSablon, getPdfSablonMeta, readFileAsBase64 as lmraReadFile, LMRA_KOCKAZATOK } from "../lib/lmraService";
import { hasVbfPdfSablon, saveVbfPdfSablon, deleteVbfPdfSablon, getVbfPdfSablonMeta } from "../lib/vbfPdfMerge";
import {
  loadTeleppCsapatok, createTeleppCsapat, updateTeleppCsapat,
  getTagokByCsapat, addTeleppTag, updateTeleppTag, deleteTeleppTag,
  loadTeleppTagok,
} from "../lib/lmraData.service";

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
      <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10 }}>
        <Shield size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontWeight: 700, fontSize: 13, color: "#991B1B", margin: 0 }}>LMRA – Munkavégzést megelőző kockázatértékelés</p>
          <p style={{ fontSize: 12, color: "#991B1B", margin: "3px 0 0" }}>
            Töltsd fel az eredeti, rögzített LMRA nyomtatványt PDF formátumban.
            Helyszínen a telepítők megtekinthetik és mellette kitöltik a digitális verziót, majd aláírnak.
          </p>
        </div>
      </div>

      {/* Sablon állapot */}
      <div style={{ background: van ? "#F0FDF4" : "#FFFBEB", border: `1.5px solid ${van ? "#86EFAC" : "#FCD34D"}`, borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
        {van ? <CheckCircle2 size={22} color="#059669" /> : <Upload size={22} color="#D97706" />}
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: van ? "#166534" : "#92400E", margin: 0 }}>
            {van ? `✓ LMRA nyomtatvány feltöltve (${meta?.kb ?? "?"} KB)` : "Nincs sablon feltöltve"}
          </p>
          <p style={{ fontSize: 12, color: van ? "#15803D" : "#D97706", margin: "2px 0 0" }}>
            {van ? "Helyszínen a 'Nyomtatvány' gombra kattintva megtekinthető referenciának." : "Feltöltés nélkül is működik a digitális LMRA flow."}
          </p>
        </div>
        {van && (
          <button onClick={handleTorles} style={{ padding: "6px 14px", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT }}>
            Törlés
          </button>
        )}
      </div>

      {/* Feltöltés gomb */}
      <input ref={fileRef} type="file" accept=".pdf,.docx" style={{ display: "none" }} onChange={handleFeltoltes} />
      <button onClick={() => fileRef.current?.click()} disabled={loading}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 22px", background: loading ? "#E2E8F0" : "#DC2626", color: "#fff", border: "none", borderRadius: 10, cursor: loading ? "default" : "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT, marginBottom: 28 }}>
        <Upload size={16} />
        {loading ? "Feltöltés..." : van ? "Nyomtatvány cseréje (.pdf / .docx)" : "LMRA nyomtatvány feltöltése (.pdf / .docx)"}
      </button>

      {/* Kockázat lista tájékoztató */}
      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 16px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: .7, margin: "0 0 10px" }}>
          Digitális kockázati pontok ({LMRA_KOCKAZATOK.length} db) – rögzített lista
        </p>
        <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 10px" }}>
          Ezek a pontok az eredeti nyomtatványból kerültek be. Igen/Nem értékelést adnak róluk helyszínen.
        </p>
        {LMRA_KOCKAZATOK.map((k, i) => (
          <div key={k.id} style={{ fontSize: 12, color: "#374151", padding: "4px 0", borderBottom: "1px solid #F1F5F9", display: "flex", gap: 8 }}>
            <span style={{ color: "#94A3B8", fontWeight: 700, minWidth: 20 }}>{i + 1}.</span>
            {k.szoveg}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Telepítő csapatok kezelése ──────────────────────────────

function TelepitoCsapatokBeallitas() {
  const [csapatok, setCsapatok] = useState(loadTeleppCsapatok);
  const [openId, setOpenId]     = useState(null);
  const [ujCsapatNev, setUjCsapatNev] = useState("");
  const [szerkesztId, setSzerkesztId] = useState(null);
  const [szerkesztNev, setSzerkesztNev] = useState("");

  useEffect(() => {
    const handler = () => setCsapatok(loadTeleppCsapatok());
    window.addEventListener("crm-db-updated", handler);
    return () => window.removeEventListener("crm-db-updated", handler);
  }, []);

  function handleAddCsapat() {
    if (!ujCsapatNev.trim()) return;
    createTeleppCsapat(ujCsapatNev.trim());
    setCsapatok(loadTeleppCsapatok());
    setUjCsapatNev("");
  }

  function handleSaveCsapatNev(id) {
    if (!szerkesztNev.trim()) return;
    updateTeleppCsapat(id, { nev: szerkesztNev.trim() });
    setCsapatok(loadTeleppCsapatok());
    setSzerkesztId(null);
  }

  function handleToggleAktiv(id, aktiv) {
    updateTeleppCsapat(id, { aktiv: !aktiv });
    setCsapatok(loadTeleppCsapatok());
  }

  return (
    <div style={{ padding: "20px 24px", fontFamily: FONT, maxWidth: 700 }}>
      {/* Info */}
      <div style={{ background: "#ECFDF5", border: "1.5px solid #6EE7B7", borderRadius: 12, padding: "12px 16px", marginBottom: 22, display: "flex", gap: 10 }}>
        <HardHat size={18} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 13, color: "#065F46", lineHeight: 1.6 }}>
          <strong>Telepítő csapatok</strong> – Ezek a csapatok és tagjaik jelennek meg az LMRA aláírási
          folyamatban a Telepítő felületen. A szerelő csapatoktól függetlenek – ezek az egyéni
          névlisták (pl. Kutasi László, Kovács Péter) az LMRA-hoz.
        </p>
      </div>

      {/* Új csapat */}
      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        <input
          value={ujCsapatNev}
          onChange={e => setUjCsapatNev(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAddCsapat()}
          placeholder="Új csapat neve…"
          style={{ flex: 1, padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 14, fontFamily: FONT, outline: "none" }}
        />
        <button
          onClick={handleAddCsapat}
          disabled={!ujCsapatNev.trim()}
          style={{ padding: "10px 20px", background: ujCsapatNev.trim() ? "#059669" : "#E2E8F0", color: "#fff", border: "none", borderRadius: 9, cursor: ujCsapatNev.trim() ? "pointer" : "default", fontWeight: 700, fontSize: 14, fontFamily: FONT, display: "flex", alignItems: "center", gap: 6 }}
        >
          <UserPlus size={15} /> Új csapat
        </button>
      </div>

      {csapatok.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: C.muted, fontSize: 13 }}>
          Még nincs telepítő csapat. Adj hozzá egyet fent.
        </div>
      )}

      {/* Csapat kártyák */}
      {csapatok.map(cs => (
        <div key={cs.id} style={{ background: "#fff", border: `1.5px solid ${openId === cs.id ? C.accent : C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
          {/* Csapat fejléc */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px" }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: cs.aktiv !== false ? "#ECFDF5" : "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <HardHat size={17} color={cs.aktiv !== false ? "#059669" : "#94A3B8"} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              {szerkesztId === cs.id ? (
                <div style={{ display: "flex", gap: 7 }}>
                  <input
                    value={szerkesztNev}
                    onChange={e => setSzerkesztNev(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSaveCsapatNev(cs.id)}
                    autoFocus
                    style={{ flex: 1, padding: "5px 9px", border: `1.5px solid ${C.accent}`, borderRadius: 7, fontSize: 13, fontFamily: FONT, outline: "none" }}
                  />
                  <button onClick={() => handleSaveCsapatNev(cs.id)} style={{ padding: "4px 10px", background: C.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}>
                    <Check size={13} />
                  </button>
                  <button onClick={() => setSzerkesztId(null)} style={{ padding: "4px 8px", background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer" }}>
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: cs.aktiv !== false ? C.text : C.muted }}>
                    {cs.nev}
                    {cs.aktiv === false && <span style={{ fontSize: 11, marginLeft: 7, color: "#94A3B8" }}>(inaktív)</span>}
                  </p>
                  <button onClick={() => { setSzerkesztId(cs.id); setSzerkesztNev(cs.nev); }} style={{ padding: "2px 6px", background: "none", border: "none", cursor: "pointer", color: C.muted }}>
                    <Pencil size={12} />
                  </button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: C.muted }}>
                {getTagokByCsapat(cs.id).length} tag
              </span>
              <button
                onClick={() => handleToggleAktiv(cs.id, cs.aktiv !== false)}
                style={{ fontSize: 11, padding: "3px 10px", borderRadius: 7, border: `1px solid ${cs.aktiv !== false ? "#FCD34D" : "#86EFAC"}`, background: cs.aktiv !== false ? "#FFFBEB" : "#ECFDF5", color: cs.aktiv !== false ? "#D97706" : "#059669", cursor: "pointer", fontWeight: 600 }}
              >
                {cs.aktiv !== false ? "Inaktiválás" : "Aktiválás"}
              </button>
              <button
                onClick={() => setOpenId(p => p === cs.id ? null : cs.id)}
                style={{ padding: "4px 8px", background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 7, cursor: "pointer" }}
              >
                {openId === cs.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {/* Tagok lista */}
          {openId === cs.id && (
            <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 14px" }}>
              <TelepitoCsapatTagok csapatId={cs.id} />
            </div>
          )}
        </div>
      ))}

      {/* Szerelő csapat kapcsolat magyarázat */}
      <div style={{ marginTop: 24, padding: "14px 16px", background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 12 }}>
        <p style={{ fontSize: 12, color: C.textSub, margin: 0, lineHeight: 1.7 }}>
          <strong>Tipp:</strong> A Beállítások → Felhasználók &amp; Szerelő csapatok menüpontban a „Telepítő csapat ID" mezőbe írd be egy csapat azonosítóját (pl. <code>tcs_1234567890</code>), hogy az adott szerelő csapathoz rendelt LMRA-ban automatikusan az ő csapatuk tagjai jelenjenek meg legördülőként.
        </p>
      </div>
    </div>
  );
}

function ChevronUp({ size, style }) {
  return (
    <svg width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ChevronDown({ size, style }) {
  return (
    <svg width={size || 16} height={size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ─── Csapat tagok kezelése ────────────────────────────────────

function TelepitoCsapatTagok({ csapatId }) {
  const [tagok, setTagok]   = useState(() => getTagokByCsapat(csapatId));
  const [ujNev, setUjNev]   = useState("");
  const [ujTel, setUjTel]   = useState("");
  const [szerkesztId, setSzId] = useState(null);
  const [szerkesztNev, setSzNev] = useState("");

  useEffect(() => {
    const handler = () => setTagok(getTagokByCsapat(csapatId));
    window.addEventListener("crm-db-updated", handler);
    return () => window.removeEventListener("crm-db-updated", handler);
  }, [csapatId]);

  function handleAdd() {
    if (!ujNev.trim()) return;
    addTeleppTag(csapatId, ujNev.trim(), ujTel.trim());
    setTagok(getTagokByCsapat(csapatId));
    setUjNev(""); setUjTel("");
  }

  function handleSaveNev(id) {
    if (!szerkesztNev.trim()) return;
    updateTeleppTag(id, { nev: szerkesztNev.trim() });
    setTagok(getTagokByCsapat(csapatId));
    setSzId(null);
  }

  function handleToggleAktivTag(id, aktiv) {
    updateTeleppTag(id, { aktiv: !aktiv });
    setTagok(getTagokByCsapat(csapatId));
  }

  function handleDelete(id) {
    if (!window.confirm("Biztosan törlöd ezt a tagot?")) return;
    deleteTeleppTag(id);
    setTagok(getTagokByCsapat(csapatId));
  }

  return (
    <div>
      {/* Tagok lista */}
      {tagok.length === 0 && (
        <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px", fontStyle: "italic" }}>
          Még nincs tag ebben a csapatban.
        </p>
      )}
      {loadTeleppTagok().filter(t => t.csapatId === csapatId).map(t => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 10px", background: t.aktiv !== false ? "#FAFAFA" : "#F1F5F9", borderRadius: 8, marginBottom: 5, border: `1px solid ${C.border}`, opacity: t.aktiv !== false ? 1 : 0.6 }}>
          {szerkesztId === t.id ? (
            <div style={{ flex: 1, display: "flex", gap: 6 }}>
              <input value={szerkesztNev} onChange={e => setSzNev(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSaveNev(t.id)} autoFocus
                style={{ flex: 1, padding: "5px 8px", border: `1.5px solid ${C.accent}`, borderRadius: 6, fontSize: 13, fontFamily: FONT, outline: "none" }} />
              <button onClick={() => handleSaveNev(t.id)} style={{ padding: "4px 9px", background: C.accent, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}><Check size={13} /></button>
              <button onClick={() => setSzId(null)} style={{ padding: "4px 7px", background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer" }}><X size={13} /></button>
            </div>
          ) : (
            <p style={{ flex: 1, margin: 0, fontSize: 13, fontWeight: 600, color: C.text }}>
              {t.nev}
              {t.aktiv === false && <span style={{ fontSize: 11, marginLeft: 6, color: C.muted }}>(inaktív)</span>}
              {t.telefon && <span style={{ fontSize: 11, marginLeft: 8, color: C.muted, fontWeight: 400 }}>{t.telefon}</span>}
            </p>
          )}
          {szerkesztId !== t.id && (
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button onClick={() => { setSzId(t.id); setSzNev(t.nev); }} style={{ padding: "3px 6px", background: "none", border: "none", cursor: "pointer", color: C.muted }}><Pencil size={12} /></button>
              <button onClick={() => handleToggleAktivTag(t.id, t.aktiv !== false)} style={{ fontSize: 10, padding: "2px 7px", border: "none", background: t.aktiv !== false ? "#FFFBEB" : "#ECFDF5", color: t.aktiv !== false ? "#D97706" : "#059669", borderRadius: 5, cursor: "pointer", fontWeight: 600 }}>
                {t.aktiv !== false ? "Inakt." : "Aktív"}
              </button>
              <button onClick={() => handleDelete(t.id)} style={{ padding: "3px 6px", background: "#FEF2F2", border: "none", borderRadius: 5, cursor: "pointer", color: "#DC2626" }}><Trash2 size={12} /></button>
            </div>
          )}
        </div>
      ))}

      {/* Új tag hozzáadása */}
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <input value={ujNev} onChange={e => setUjNev(e.target.value)} onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder="Új tag neve…"
          style={{ flex: 2, padding: "8px 10px", border: `1.5px dashed ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: FONT, outline: "none", background: "#F8FAFC" }} />
        <input value={ujTel} onChange={e => setUjTel(e.target.value)}
          placeholder="Telefon (opcionális)"
          style={{ flex: 2, padding: "8px 10px", border: `1.5px dashed ${C.border}`, borderRadius: 7, fontSize: 13, fontFamily: FONT, outline: "none", background: "#F8FAFC" }} />
        <button onClick={handleAdd} disabled={!ujNev.trim()}
          style={{ padding: "8px 16px", background: ujNev.trim() ? "#059669" : "#E2E8F0", color: "#fff", border: "none", borderRadius: 7, cursor: ujNev.trim() ? "pointer" : "default", fontWeight: 700, fontSize: 14, fontFamily: FONT, display: "flex", alignItems: "center", gap: 5 }}>
          <UserPlus size={14} /> Hozzáad
        </button>
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
      <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 12, padding: "12px 16px", marginBottom: 16, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Upload size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontWeight: 700, fontSize: 13, color: "#991B1B", margin: 0 }}>VBF – Villamos Biztonsági Felülvizsgálati Jegyzőkönyv (PDF sablon)</p>
          <p style={{ fontSize: 12, color: "#991B1B", margin: "3px 0 0" }}>
            Töltsd fel az eredeti VBF nyomtatványt PDF formátumban. A letöltött dokumentum az eredeti sablont
            tartalmazza + az utolsó oldalon a kitöltött mérési adatokat.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, padding: "12px 16px", background: van ? "#F0FDF4" : "#FFFBEB", border: `1px solid ${van ? "#86EFAC" : "#FCD34D"}`, borderRadius: 10 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 14, color: van ? "#166534" : "#92400E", margin: 0 }}>
            {van ? `✓ VBF PDF sablon feltöltve (${meta?.kb ?? "?"} KB)` : "Nincs PDF sablon feltöltve"}
          </p>
          <p style={{ fontSize: 12, color: van ? "#15803D" : "#D97706", margin: "3px 0 0" }}>
            {van ? "Munkalap nézetben megjelenik a 'VBF .pdf' letöltés gomb." : "Feltöltés nélkül a VBF adatlap csak adatoldalt tartalmaz sablon nélkül."}
          </p>
        </div>
        {van && (
          <button onClick={handleTorles} style={{ padding: "7px 14px", background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: FONT }}>
            Törlés
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handleFeltoltes} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 22px", background: loading ? "#E2E8F0" : "#DC2626", color: "#fff", border: "none", borderRadius: 10, cursor: loading ? "default" : "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT, marginBottom: 16 }}
      >
        <Upload size={16} />
        {loading ? "Feltöltés..." : van ? "PDF sablon cseréje" : "VBF PDF sablon feltöltése (.pdf)"}
      </button>

      <div style={{ background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
        <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.7 }}>
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
