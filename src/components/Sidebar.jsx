import { useState } from "react";
import {
  LayoutDashboard, Users, ClipboardList,
  ScrollText, Calendar, Settings, LogOut, Building2, Receipt, FileText, BarChart3, BookOpen, X, AlertTriangle,
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
  { id: "naptar",      label: "Naptár",       icon: Calendar },
  { id: "riportok",    label: "Riportok",     icon: BarChart3 },
  { id: "karteritesek", label: "Kártérítések", icon: AlertTriangle },
];

// Sidebar belső tartalma (desktop + mobil overlay közös)
function SidebarContent({ page, onNav, user, onLogout, onClose }) {
  const allowed    = getAllowedPages(user?.role);
  const visibleNav = NAV.filter(item => allowed.includes(item.id));
  const showSettings = allowed.includes("beallitasok");

  function handleNav(id) {
    onNav(id);
    onClose?.(); // mobilon bezárja az overlay-t
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: FONT }}>
      {/* Fejléc – E.D.I. brand logo */}
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${C.sidebarBorder}`, display: "flex", alignItems: "center", gap: 12 }}>
        {/* E.D.I. szöveg logó */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 800, fontSize: 22, color: C.accent, letterSpacing: 2, lineHeight: 1 }}>
            E.D.I.
          </div>
          <div style={{ fontFamily: FONT_HEADING, fontWeight: 600, fontSize: 10, color: C.sidebarText, letterSpacing: 3, textTransform: "uppercase", marginTop: 2 }}>
            Solutions CRM
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: C.sidebarText, padding: 4, display: "flex", alignItems: "center", flexShrink: 0 }}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Navigáció */}
      <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.8, color: "rgba(111,173,168,0.5)", textTransform: "uppercase", padding: "4px 10px", marginBottom: 6 }}>Főmenü</p>
        {visibleNav.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => handleNav(id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 11,
              padding: "10px 12px", borderRadius: 9, border: "none",
              borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
              background: active ? C.sidebarActive : "transparent",
              color: active ? C.accent : C.sidebarText,
              cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 500,
              marginBottom: 2, transition: "all .15s", fontFamily: FONT,
            }}>
              <Icon size={16} strokeWidth={active ? 2.2 : 1.7} />{label}
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
                onClose?.();
              }}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 9, border: "none", borderLeft: "3px solid transparent", background: "transparent", color: "#67E8F9", cursor: "pointer", fontSize: 14, fontFamily: FONT, fontWeight: 600 }}
            >
              <BookOpen size={17} strokeWidth={1.7} />Oktató anyagok
            </button>
          </>
        )}

        {showSettings && (
          <>
            <div style={{ borderTop: `1px solid ${C.sidebarBorder}`, margin: "10px 0" }} />
            <button onClick={() => handleNav("beallitasok")} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 11,
              padding: "10px 12px", borderRadius: 9, border: "none",
              borderLeft: page === "beallitasok" ? `3px solid ${C.accent}` : "3px solid transparent",
              background: page === "beallitasok" ? C.sidebarActive : "transparent",
              color: page === "beallitasok" ? C.accent : C.sidebarText,
              cursor: "pointer", fontSize: 13, fontFamily: FONT, fontWeight: page === "beallitasok" ? 700 : 500,
            }}>
              <Settings size={16} strokeWidth={1.7} />Beállítások
            </button>
          </>
        )}
      </nav>

      {/* Felhasználó + kijelentkezés */}
      <div style={{ padding: "14px 14px 20px", borderTop: `1px solid ${C.sidebarBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px", borderRadius: 10, background: "rgba(24,172,160,0.06)", marginBottom: 4 }}>
          <Avatar u={user} size={34} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: FONT }}>{user.name}</div>
            <div style={{ color: C.sidebarText, fontSize: 11, fontFamily: FONT }}>{user.role}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, border: "none", background: "transparent", color: C.sidebarText, cursor: "pointer", fontSize: 12, fontFamily: FONT, fontWeight: 500 }}>
          <LogOut size={14} />Kijelentkezés
        </button>
      </div>
    </div>
  );
}

// Fő export: desktop sticky sidebar VAGY mobilon overlay drawer
export default function Sidebar({ page, onNav, user, onLogout, open, onClose }) {
  // Desktop: mindig látható sticky aside
  // Mobil: overlay drawer (open/onClose prop-ok vezérlik App.jsx-ből)

  return (
    <>
      {/* ── DESKTOP sidebar (≥768px) ── */}
      <aside style={{
        width: 240, flexShrink: 0,
        background: C.sidebar,
        height: "100vh",
        position: "sticky", top: 0,
        display: "flex", flexDirection: "column",
        // Mobilon elrejtjük
        ...(typeof window !== "undefined" && window.innerWidth < 768 ? { display: "none" } : {}),
      }} className="sidebar-desktop">
        <SidebarContent page={page} onNav={onNav} user={user} onLogout={onLogout} />
      </aside>

      {/* ── MOBIL overlay backdrop ── */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 999,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}

      {/* ── MOBIL drawer ── */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: 280, zIndex: 1000,
        background: C.sidebar,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
        display: "flex", flexDirection: "column",
        boxShadow: open ? "4px 0 32px rgba(0,0,0,0.4)" : "none",
      }} className="sidebar-mobile">
        <SidebarContent page={page} onNav={onNav} user={user} onLogout={onLogout} onClose={onClose} />
      </aside>
    </>
  );
}
