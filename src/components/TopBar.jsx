import { ArrowLeft, Bell, Menu } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import Avatar from "./Avatar";

export default function TopBar({ title, user, driveStatus, right, onBack, backLabel, onMenuOpen }) {
  const dsColors = {
    idle:      C.muted,
    saving:    C.warning,
    ok:        C.success,
    verified:  "#059669",
    error:     C.danger,
    local_ok:  "#D97706",
  };
  const dsLabel = {
    idle:      "Drive",
    saving:    "Mentés…",
    ok:        "Mentve ✓",
    verified:  "Ellenőrizve ✓",
    error:     "Drive hiba ✗",
    local_ok:  "Lokálisan mentve",
  };
  const ds = driveStatus || "idle";

  return (
    <>
      {/* CSS a responsive váltáshoz */}
      <style>{`
        .topbar-menu-btn { display: none !important; }
        .sidebar-mobile  { display: flex !important; }
        .sidebar-desktop { display: flex !important; }
        @media (max-width: 767px) {
          .topbar-menu-btn  { display: flex !important; }
          .sidebar-desktop  { display: none !important; }
          .topbar-back-label { display: none !important; }
          .topbar-bell      { display: none !important; }
          .topbar-drive-label { display: none !important; }
        }
        @media (min-width: 768px) {
          .sidebar-mobile { display: none !important; transform: translateX(-100%) !important; }
        }
      `}</style>

      <div style={{
        height: 56,
        background: "#fff",
        borderBottom: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 20,
        fontFamily: FONT,
      }}>
        {/* Hamburger – csak mobilon */}
        {!onBack && (
          <button
            className="topbar-menu-btn"
            onClick={onMenuOpen}
            style={{
              width: 36, height: 36, borderRadius: 9,
              background: C.accentLight,
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Menu size={20} color={C.accent} />
          </button>
        )}

        {/* Vissza gomb */}
        {onBack && (
          <button onClick={onBack} style={{
            display: "flex", alignItems: "center", gap: 6,
            color: C.accent, border: "none", background: "none",
            cursor: "pointer", fontWeight: 600, fontSize: 14,
            fontFamily: FONT, flexShrink: 0, padding: "6px 0",
          }}>
            <ArrowLeft size={20} />
            <span className="topbar-back-label">{backLabel || "Vissza"}</span>
          </button>
        )}

        {/* Cím */}
        <span style={{
          flex: 1,
          fontFamily: FONT_HEADING,
          fontWeight: 700,
          fontSize: 18,
          color: C.text,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}>
          {title}
        </span>

        {/* Drive státusz */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: dsColors[ds], fontWeight: 600, flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: dsColors[ds] }} />
          <span className="topbar-drive-label">{dsLabel[ds]}</span>
        </div>

        {right}

        {/* Bell – csak desktopon */}
        <button className="topbar-bell" style={{ width: 36, height: 36, borderRadius: "50%", background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none" }}>
          <Bell size={16} color={C.accent} />
        </button>

        <Avatar u={user} size={32} />
      </div>
    </>
  );
}
