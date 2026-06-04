import { useState } from "react";
import {
  LayoutDashboard, Users, ClipboardList,
  ScrollText, Calendar, Settings, LogOut, Building2, Receipt, FileText, BarChart3, BookOpen, X, CalendarRange,
} from "lucide-react";
import { C, FONT } from "../lib/constants";
import { getAllowedPages } from "../lib/roles.js";
import Avatar from "./Avatar";

const NAV = [
  { id: "dashboard",      label: "Irányítópult",   icon: LayoutDashboard },
  { id: "projektek",      label: "Projektek",       icon: Building2 },
  { id: "munkalapok",     label: "Munkalapok",      icon: FileText },
  { id: "ugyfelek",       label: "Ügyfelek",        icon: Users },
  { id: "arajanlatok",    label: "Árajánlatok",     icon: ClipboardList },
  { id: "szerzodesek",    label: "Szerződések",     icon: ScrollText },
  { id: "szamlak",        label: "Számlák",         icon: Receipt },
  { id: "naptar",         label: "Naptár",          icon: Calendar },
  { id: "riportok",       label: "Riportok",        icon: BarChart3 },
  { id: "munkakiosztas",  label: "Munkakiosztás",   icon: CalendarRange },
];

// E.D.I. Logo SVG-based text mark
function EdiLogo({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size,
      background: "rgba(255,255,255,0.12)",
      borderRadius: size * 0.28,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "1.5px solid rgba(255,255,255,0.2)",
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: size * 0.36,
        color: "#18ACA0",
        letterSpacing: 0.5,
        lineHeight: 1,
      }}>E</span>
    </div>
  );
}

function SidebarContent({ page, onNav, user, onLogout, onClose }) {
  const allowed    = getAllowedPages(user?.role);
  const visibleNav = NAV.filter(item => allowed.includes(item.id));
  const showSettings = allowed.includes("beallitasok");

  function handleNav(id) {
    onNav(id);
    onClose?.();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: FONT }}>

      {/* ── Fejléc / Logo ── */}
      <div style={{
        padding: "20px 18px 16px",
        borderBottom: `1px solid ${C.sidebarBorder}`,
        display: "flex", alignItems: "center", gap: 11,
      }}>
        <EdiLogo size={38} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 800, fontSize: 16, letterSpacing: 0.3, lineHeight: 1.1 }}>
            E.D.I. <span style={{ color: "#18ACA0" }}>Solutions</span>
          </div>
          <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 9.5, letterSpacing: 1.2, textTransform: "uppercase", marginTop: 2 }}>
            Vállalatirányítás
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: 4, display: "flex", alignItems: "center" }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* ── Navigáció ── */}
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        <p style={{
          fontSize: 9.5, fontWeight: 700, letterSpacing: 1.6,
          color: "rgba(255,255,255,0.25)",
          textTransform: "uppercase", padding: "4px 10px", marginBottom: 4,
        }}>Főmenü</p>

        {visibleNav.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button key={id} onClick={() => handleNav(id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 8, border: "none",
              borderLeft: active ? `3px solid #18ACA0` : "3px solid transparent",
              background: active ? "rgba(24,172,160,0.18)" : "transparent",
              color: active ? "#18ACA0" : C.sidebarText,
              cursor: "pointer", fontSize: 13.5, fontWeight: active ? 700 : 400,
              marginBottom: 1, transition: "all .15s", fontFamily: FONT,
              letterSpacing: active ? 0.1 : 0,
            }}>
              <Icon size={16} strokeWidth={active ? 2.2 : 1.7} />
              {label}
            </button>
          );
        })}

        {/* Oktató anyagok – Telepítő */}
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
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, border: "none", borderLeft: "3px solid transparent", background: "transparent", color: "#67E8F9", cursor: "pointer", fontSize: 13.5, fontFamily: FONT, fontWeight: 500 }}
            >
              <BookOpen size={16} strokeWidth={1.7} />Oktató anyagok
            </button>
          </>
        )}

        {showSettings && (
          <>
            <div style={{ borderTop: `1px solid ${C.sidebarBorder}`, margin: "10px 0" }} />
            <button onClick={() => handleNav("beallitasok")} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 8, border: "none",
              borderLeft: page === "beallitasok" ? "3px solid #18ACA0" : "3px solid transparent",
              background: page === "beallitasok" ? "rgba(24,172,160,0.18)" : "transparent",
              color: page === "beallitasok" ? "#18ACA0" : C.sidebarText,
              cursor: "pointer", fontSize: 13.5, fontWeight: page === "beallitasok" ? 700 : 400, fontFamily: FONT,
            }}>
              <Settings size={16} strokeWidth={1.7} />Beállítások
            </button>
          </>
        )}
      </nav>

      {/* ── Felhasználó + kijelentkezés ── */}
      <div style={{ padding: "12px 12px 18px", borderTop: `1px solid ${C.sidebarBorder}` }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "10px 10px", borderRadius: 10,
          background: "rgba(255,255,255,0.06)",
          marginBottom: 6,
        }}>
          <Avatar u={user} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "#fff", fontWeight: 600, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
            <div style={{ color: "rgba(255,255,255,0.32)", fontSize: 10.5, marginTop: 1 }}>{user.role}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{
          width: "100%", display: "flex", alignItems: "center", gap: 8,
          padding: "7px 10px", borderRadius: 7, border: "none",
          background: "transparent", color: "rgba(255,255,255,0.35)",
          cursor: "pointer", fontSize: 12.5, fontFamily: FONT,
          transition: "color .15s",
        }}>
          <LogOut size={14} />Kijelentkezés
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({ page, onNav, user, onLogout, open, onClose }) {
  return (
    <>
      {/* ── DESKTOP sidebar ── */}
      <aside style={{
        width: 236, flexShrink: 0,
        background: C.sidebar,
        height: "100vh",
        position: "sticky", top: 0,
        display: "flex", flexDirection: "column",
        boxShadow: "2px 0 20px rgba(0,0,0,0.18)",
      }} className="sidebar-desktop">
        <SidebarContent page={page} onNav={onNav} user={user} onLogout={onLogout} />
      </aside>

      {/* ── MOBIL overlay backdrop ── */}
      {open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, zIndex: 999,
            background: "rgba(7,94,86,0.45)",
            backdropFilter: "blur(3px)",
          }}
        />
      )}

      {/* ── MOBIL drawer ── */}
      <aside style={{
        position: "fixed", top: 0, left: 0, bottom: 0,
        width: 276, zIndex: 1000,
        background: C.sidebar,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.28s cubic-bezier(.4,0,.2,1)",
        display: "flex", flexDirection: "column",
        boxShadow: open ? "4px 0 32px rgba(0,0,0,0.35)" : "none",
      }} className="sidebar-mobile">
        <SidebarContent page={page} onNav={onNav} user={user} onLogout={onLogout} onClose={onClose} />
      </aside>
    </>
  );
}
