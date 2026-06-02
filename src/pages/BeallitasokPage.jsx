import { useState } from "react";
import {
  Users, Settings, FileText, Wrench, Building2, ChevronRight, BookTemplate, Shield, Trash2,
} from "lucide-react";
import { saveLocal } from "../lib/localDb";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import AdminPanel from "./AdminPanel";
import JegyzokonyviBeallitasok from "./JegyzokonyviBeallitasok";
import MunkakiosztasBeallitasok from "./MunkakiosztasBeallitasok";
import FovallalkozoPage from "../modules/fovallalkozok/FovallalkozoPage";
import MunkatipusokPage from "../modules/munkatipusok/MunkatipusokPage";
import SablonKezelo from "./SablonKezelo";
import BackupKezelo from "./BackupKezelo";

const MENU_ITEMS = [
  {
    id: "felhasznalok",
    label: "Felhasználók & Csapatok",
    desc: "Felhasználók kezelése, jelszó, szerepkörök",
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
    id: "mentes",
    label: "Biztonsági mentések",
    desc: "Adatok mentése, visszaállítás, export JSON",
    icon: Shield,
    color: "#475569",
    bg: "#F8FAFC",
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
        <AdminPanel currentUser={currentUser} />
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
