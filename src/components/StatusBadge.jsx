import { STATUS_CFG, C } from "../lib/constants";

export default function StatusBadge({ s }) {
  const cfg = STATUS_CFG[s] || { bg: C.bg, text: C.muted, dot: C.muted };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: cfg.bg, color: cfg.text,
      borderRadius: 20, padding: "3px 10px",
      fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
      {s}
    </span>
  );
}
