import {
  LayoutDashboard, Users, ClipboardList,
  ScrollText, UserCheck, Calendar, Settings, LogOut, Sun, Building2, Receipt, FileText, BarChart3, BookOpen,
} from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { getAllowedPages } from "../lib/roles.js";
import Avatar from "./Avatar";

const NAV = [
  { id: "dashboard",   label: "Pénzügy",      icon: LayoutDashboard },
  { id: "projektek",   label: "Projektek",    icon: Building2 },
  { id: "munkalapok",  label: "Munkalapok",   icon: FileText },
  { id: "ugyfelek",    label: "Ügyfelek",     icon: Users },
  { id: "arajanlatok", label: "Árajánlatok",  icon: ClipboardList },
  { id: "szerzodesek", label: "Szerződések",  icon: ScrollText },
  { id: "szamlak",     label: "Számlák",      icon: Receipt },
  { id: "csapat",      label: "Csapat",       icon: UserCheck },
  { id: "naptar",      label: "Naptár",       icon: Calendar },
  { id: "riportok",    label: "Riportok",     icon: BarChart3 },
];

export default function Sidebar({ page, onNav, user, onLogout }) {
  const allowed    = getAllowedPages(user?.role);
  const visibleNav = NAV.filter(item => allowed.includes(item.id));
  const showSettings = allowed.includes("beallitasok");

  return (
    <aside style={{ width: 240, flexShrink: 0, background: C.sidebar, height: "100vh", position: "sticky", top: 0, display: "flex", flexDirection: "column", fontFamily: FONT }}>
      <div style={{ padding: "24px 20px 18px", borderBottom: `1px solid ${C.sidebarBorder}`, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, background: C.accent, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sun size={18} color="#fff" />
        </div>
        <span style={{ fontFamily: FONT_HEADING, color: "#fff", fontWeight: 800, fontSize: 18 }}>CRM Napelem</span>
      </div>
      <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: "#3a5070", textTransform: "uppercase", padding: "4px 10px", marginBottom: 6 }}>Főmenü</p>
        {visibleNav.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => onNav(id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 9, border: "none", borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent", background: active ? "rgba(37,99,235,0.25)" : "transparent", color: active ? "#93C5FD" : C.sidebarText, cursor: "pointer", fontSize: 14, fontWeight: active ? 600 : 400, marginBottom: 2, transition: "all .15s", fontFamily: FONT }}>
              <Icon size={17} strokeWidth={active ? 2 : 1.7} />{label}
            </button>
          );
        })}
        {/* Oktató anyagok – Telepítő számára */}
        {user?.role === "Telepítő" && (
          <>
            <div style={{ borderTop: `1px solid ${C.sidebarBorder}`, margin: "10px 0" }} />
            <button
              onClick={() => {
                try {
                  const b = JSON.parse(localStorage.getItem("beallitasok") || "{}");
                  const url = b?.oktatoAnyagokUrl;
                  if (url) window.open(url, "_blank", "noopener");
                  else alert("Az oktató anyagok mappája még nincs beállítva.\nKérj meg egy Adminisztrátort, hogy állítsa be a Beállítások menüben.");
                } catch { alert("Hiba az URL betöltésekor."); }
              }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 9, border: "none", borderLeft: "3px solid transparent", background: "transparent", color: "#67E8F9", cursor: "pointer", fontSize: 14, fontFamily: FONT, fontWeight: 600 }}
            >
              <BookOpen size={17} strokeWidth={1.7} />Oktató anyagok
            </button>
          </>
        )}

        {showSettings && (
          <>
            <div style={{ borderTop: `1px solid ${C.sidebarBorder}`, margin: "10px 0" }} />
            <button onClick={() => onNav("beallitasok")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "9px 12px", borderRadius: 9, border: "none", borderLeft: page === "beallitasok" ? `3px solid ${C.accent}` : "3px solid transparent", background: page === "beallitasok" ? "rgba(37,99,235,0.25)" : "transparent", color: page === "beallitasok" ? "#93C5FD" : C.sidebarText, cursor: "pointer", fontSize: 14, fontFamily: FONT }}>
              <Settings size={17} strokeWidth={1.7} />Beállítások
            </button>
          </>
        )}
      </nav>
      <div style={{ padding: "14px 14px 20px", borderTop: `1px solid ${C.sidebarBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px", borderRadius: 10, background: "rgba(255,255,255,0.04)", marginBottom: 4 }}>
          <Avatar u={user} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
            <div style={{ color: "#4a6a8a", fontSize: 11 }}>{user.role}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", color: "#4a6a8a", cursor: "pointer", fontSize: 13, fontFamily: FONT }}>
          <LogOut size={14} />Kijelentkezés
        </button>
      </div>
    </aside>
  );
}
