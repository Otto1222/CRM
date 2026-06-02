import { useState, useRef } from "react";
import {
  Users, Settings, FileText, Wrench, Building2, ChevronRight, BookTemplate, Shield, Trash2, BookOpen, ExternalLink, Upload, CheckCircle2, Save, Check, X,
} from "lucide-react";
import { loadLocal, saveLocal } from "../lib/localDb";
import {
  hasSablon, saveSablon, deleteSablon, getSablonMeta,
  readFileAsBase64, VBF_PLACEHOLDER_DOCS,
} from "../lib/vbfDocxService";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import AdminPanel from "./AdminPanel";
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
    id: "oktatoanyagok",
    label: "Oktató anyagok (Drive link)",
    desc: "Telepítők számára elérhető Google Drive mappa URL-je",
    icon: BookOpen,
    color: "#0891B2",
    bg: "#ECFEFF",
  },
  {
    id: "vbfsablon",
    label: "VBF Sablon (.docx)",
    desc: "VBF Villamos Biztonsági Felülvizsgálati Jegyzőkönyv Word sablonja",
    icon: Upload,
    color: "#7C3AED",
    bg: "#F5F3FF",
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
  if (aktiv === "oktatoanyagok") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="Oktató anyagok Drive link" />
        <OktatoAnyagokBeallitas />
      </div>
    );
  }
  if (aktiv === "vbfsablon") {
    return (
      <div>
        <BackBtn onClick={() => setAktiv(null)} label="VBF Sablon (.docx)" />
        <VbfSablonBeallitas />
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
    if (role === "Projektmenedzser") return ["fovallalkozok","munkatipusok","munkakiosztas","sablonok"].includes(m.id);
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

// ─── LMRA Beállítások ────────────────────────────────────────
const LMRA_KEY = "crm_lmra_beallitasok";
const DEFAULT_KOCKAZATOK = [
  { id: "k1", szoveg: "Munkaterületet felmértem, biztonságos a munkavégzéshez" },
  { id: "k2", szoveg: "Egyéni védőfelszerelés (sisak, kesztyű, biztonsági cipő) megvan és viselem" },
  { id: "k3", szoveg: "Elektromos veszélyeket azonosítottam, szükséges lekapcsolások megtörténtek" },
  { id: "k4", szoveg: "Tetőn végzett munkánál esővédelem, csúszásgátló eszköz megvan" },
  { id: "k5", szoveg: "Emelési munkáknál a teherbírás ellenőrizve, megfelelő eszköz biztosítva" },
  { id: "k6", szoveg: "Sürgősségi elérhetőségek ismertek, mentési útvonal szabad" },
  { id: "k7", szoveg: "A munkaterületen nincs illetéktelen személy (különösen gyermek)" },
];

function LmraBeallitasok() {
  const [kockazatok, setKockazatok] = useState(() => {
    try {
      const b = JSON.parse(localStorage.getItem(LMRA_KEY) || "{}");
      return b.kockazatok?.length ? b.kockazatok : DEFAULT_KOCKAZATOK;
    } catch { return DEFAULT_KOCKAZATOK; }
  });
  const [ujSzoveg, setUjSzoveg] = useState("");
  const [mentve, setMentve] = useState(false);

  function upd(i, v) { setKockazatok(p => p.map((k, j) => j === i ? { ...k, szoveg: v } : k)); setMentve(false); }
  function remove(i) { setKockazatok(p => p.filter((_, j) => j !== i)); setMentve(false); }
  function add() {
    if (!ujSzoveg.trim()) return;
    setKockazatok(p => [...p, { id: `k_${Date.now()}`, szoveg: ujSzoveg.trim() }]);
    setUjSzoveg("");
    setMentve(false);
  }
  function save() {
    localStorage.setItem(LMRA_KEY, JSON.stringify({ kockazatok }));
    setMentve(true);
    setTimeout(() => setMentve(false), 2500);
  }
  function reset() { setKockazatok(DEFAULT_KOCKAZATOK); setMentve(false); }

  const inp = { width: "100%", boxSizing: "border-box", padding: "10px 12px", border: "1.5px solid #E2E8F0", borderRadius: 9, fontSize: 13, fontFamily: FONT, outline: "none" };

  return (
    <div style={{ padding: "20px 24px", fontFamily: FONT, maxWidth: 640 }}>
      <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Shield size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <p style={{ fontWeight: 700, fontSize: 13, color: "#991B1B", margin: 0 }}>LMRA – Last Minute Risk Assessment</p>
          <p style={{ fontSize: 12, color: "#991B1B", margin: "3px 0 0" }}>
            Ezeket a pontokat minden csapattag elfogadja és aláírja a munka megkezdése előtt.
            A módosítások csak az ezután indított munkákra érvényesek.
          </p>
        </div>
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: .7, marginBottom: 10 }}>
        Kockázati pontok ({kockazatok.length} db)
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
        {kockazatok.map((k, i) => (
          <div key={k.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8", paddingTop: 11, flexShrink: 0, width: 20, textAlign: "right" }}>{i + 1}.</span>
            <textarea value={k.szoveg} onChange={e => upd(i, e.target.value)} rows={2}
              style={{ ...inp, resize: "none", flex: 1 }} />
            <button onClick={() => remove(i)}
              style={{ padding: "9px 10px", border: "none", background: "#FEF2F2", borderRadius: 8, cursor: "pointer", color: "#DC2626", flexShrink: 0 }}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <textarea value={ujSzoveg} onChange={e => setUjSzoveg(e.target.value)} rows={2}
          placeholder="+ Új kockázati pont szövege…"
          style={{ ...inp, flex: 1, resize: "none", border: "1.5px dashed #CBD5E1", background: "#F8FAFC" }} />
        <button onClick={add} disabled={!ujSzoveg.trim()}
          style={{ padding: "10px 16px", border: "none", background: ujSzoveg.trim() ? "#2563EB" : "#E2E8F0", color: "#fff", borderRadius: 9, cursor: ujSzoveg.trim() ? "pointer" : "default", fontWeight: 700, fontFamily: FONT, alignSelf: "flex-end" }}>
          + Add
        </button>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={reset}
          style={{ padding: "10px 16px", border: "1.5px solid #E2E8F0", borderRadius: 9, background: "#fff", cursor: "pointer", fontFamily: FONT, fontSize: 13, color: "#64748B" }}>
          Visszaállítás alapértelmezettre
        </button>
        <button onClick={save}
          style={{ flex: 1, padding: "11px 20px", border: "none", borderRadius: 9, background: mentve ? "#059669" : "#2563EB", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          {mentve ? <><Check size={15} /> Mentve!</> : <><Save size={15} /> Mentés</>}
        </button>
      </div>
    </div>
  );
}
