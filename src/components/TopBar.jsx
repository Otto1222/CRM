import { ArrowLeft, Bell, Menu } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import Avatar from "./Avatar";

export default function TopBar({ title, user, driveStatus, right, onBack, backLabel, isMobile }) {
  const dsColors = { idle: C.muted, saving: C.warning, ok: C.success, error: C.danger };
  const dsLabel  = { idle: "Drive", saving: "Mentés…", ok: "Mentve ✓", error: "Hiba ✗" };
  const ds = driveStatus || "idle";

  return (
    <div style={{
      height: isMobile ? 56 : 62,
      background: "#fff",
      borderBottom: `1px solid ${C.border}`,
      display: "flex",
      alignItems: "center",
      padding: isMobile ? "0 16px" : "0 28px",
      gap: isMobile ? 10 : 16,
      position: "sticky",
      top: 0,
      zIndex: 20,
      fontFamily: FONT,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: 6,
          color: C.accent, border: "none", background: "none",
          cursor: "pointer", fontWeight: 600,
          fontSize: isMobile ? 13 : 14,
          fontFamily: FONT, flexShrink: 0,
          padding: "6px 0",
        }}>
          <ArrowLeft size={isMobile ? 20 : 17} />
          {!isMobile && (backLabel || "Vissza")}
        </button>
      )}

      <span style={{
        flex: 1,
        fontFamily: FONT_HEADING,
        fontWeight: 700,
        fontSize: isMobile ? 17 : 20,
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
        {!isMobile && dsLabel[ds]}
      </div>

      {right}

      {!isMobile && (
        <button style={{ width: 36, height: 36, borderRadius: "50%", background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none" }}>
          <Bell size={16} color={C.accent} />
        </button>
      )}

      <Avatar u={user} size={isMobile ? 30 : 36} />
    </div>
  );
}
