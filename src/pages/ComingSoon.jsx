import { C, FONT, FONT_HEADING } from "../lib/constants";

export default function ComingSoon({ title, desc }) {
  return (
    <div style={{ padding: "80px 32px", textAlign: "center", fontFamily: FONT }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🚧</div>
      <h2 style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 800, color: C.text, marginBottom: 8 }}>{title}</h2>
      <p style={{ color: C.muted, fontSize: 14, maxWidth: 320, margin: "0 auto" }}>
        {desc || "Ez a funkció fejlesztés alatt áll, hamarosan elérhető lesz."}
      </p>
    </div>
  );
}
