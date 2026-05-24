import { STATUS_CFG } from "../lib/constants";

export default function StatusBadge({ s }) {
  const cfg = STATUS_CFG[s] || { bg: "#F1F5F9", text: "#94A3B8", dot: "#94A3B8" };
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
