import { ArrowLeft, Bell } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import Avatar from "./Avatar";

export default function TopBar({ title, user, driveStatus, right, onBack, backLabel }) {
  const dsColors = { idle: C.muted, saving: C.warning, ok: C.success, error: C.danger };
  const dsLabel  = { idle: "Drive", saving: "Mentés…", ok: "Mentve ✓", error: "Hiba ✗" };
  const ds = driveStatus || "idle";

  return (
    <div style={{
      height: 62, background: "#fff", borderBottom: `1px solid ${C.border}`,
      display: "flex", alignItems: "center", padding: "0 28px", gap: 16,
      position: "sticky", top: 0, zIndex: 20, fontFamily: FONT,
    }}>
      {onBack && (
        <button onClick={onBack} style={{
          display: "flex", alignItems: "center", gap: 6,
          color: C.accent, border: "none", background: "none",
          cursor: "pointer", fontWeight: 600, fontSize: 14, fontFamily: FONT,
        }}>
          <ArrowLeft size={17} />{backLabel || "Vissza"}
        </button>
      )}

      <span style={{ flex: 1, fontFamily: FONT_HEADING, fontWeight: 700, fontSize: 20, color: C.text }}>
        {title}
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: dsColors[ds], fontWeight: 600 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: dsColors[ds], flexShrink: 0 }} />
        {dsLabel[ds]}
      </div>

      {right}

      <button style={{ width: 36, height: 36, borderRadius: "50%", background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "none" }}>
        <Bell size={16} color={C.accent} />
      </button>

      <Avatar u={user} size={36} />
    </div>
  );
}
