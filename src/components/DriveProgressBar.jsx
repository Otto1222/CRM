import { C, FONT } from "../lib/constants";

const LABELS = {
  projektek:             "Projektek",
  munkalapok:            "Munkalapok",
  ugyfelek:              "Ügyfelek",
  beallitasok:           "Beállítások",
  munkatipusok:          "Munkatípusok",
  fovallalkozok:         "Fővállalkozók",
  elszamolasi_szabalyok: "Elszámolási szabályok",
  karteritesek:          "Kártérítések",
  sablonok:              "Sablonok",
  csapatok:              "Csapatok",
  csapat_tagok:          "Csapattagok",
  crm_napelem_users:     "Felhasználók",
  szamlak:               "Számlák",
};

export default function DriveProgressBar({ progress }) {
  if (!progress || !progress.active) return null;

  const pct    = Math.max(0, Math.min(100, progress.percent || 0));
  const status = progress.status || "saving";

  const barColor =
    status === "error" ? C.danger :
    status === "ok"    ? C.success :
    C.accent;

  const title =
    status === "error" ? "Mentési hiba" :
    status === "ok"    ? "Mentés kész"  :
    "Mentés Drive-ra…";

  const sub =
    status === "saving" && progress.total > 1
      ? `${LABELS[progress.collection] || progress.collection} · ${progress.done}/${progress.total}`
      : status === "ok"  ? "Minden kollekció elmentve"
      : status === "error" ? "Néhány kollekció nem mentődött"
      : LABELS[progress.collection] || progress.collection;

  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 9999,
      background: "#fff", borderTop: `1px solid ${C.border}`,
      boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
      padding: "10px 20px 12px", fontFamily: FONT,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 15 }}>
            {status === "error" ? "⚠️" : status === "ok" ? "✅" : "☁️"}
          </span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>
          </div>
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: barColor, marginLeft: 12 }}>
          {pct}%
        </div>
      </div>
      <div style={{ height: 7, borderRadius: 999, background: C.border, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, borderRadius: 999,
          background: barColor, transition: "width .25s ease",
        }} />
      </div>
    </div>
  );
}
