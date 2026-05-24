export default function Avatar({ u, size = 34 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: u.color, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.36, flexShrink: 0,
      userSelect: "none",
    }}>
      {u.initials}
    </div>
  );
}
