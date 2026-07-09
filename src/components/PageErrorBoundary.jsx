import { Component } from "react";
import { C, FONT, FONT_HEADING } from "../lib/constants";

/**
 * Lap-szintű hibahatár: ha EGY oldal renderelése hibára fut, csak az adott
 * tartalmi terület mutat hibát – a sidebar/navigáció megmarad, és másik lapra
 * lépve (key={page} miatt) automatikusan helyreáll. Így egyetlen hibás rekord
 * vagy oldal nem viszi le az egész alkalmazást (fehér oldal helyett).
 */
export default class PageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[PageErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{ padding: 32, fontFamily: FONT }}>
        <div style={{ maxWidth: 560, margin: "40px auto", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 14, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", padding: "28px 28px", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ fontFamily: FONT_HEADING, fontSize: 19, fontWeight: 800, color: C.text, margin: "0 0 8px" }}>
            Ez az oldal hibába ütközött
          </h2>
          <p style={{ fontSize: 13.5, color: C.muted, margin: "0 0 18px", lineHeight: 1.6 }}>
            A többi oldal továbbra is működik – válassz egy másik menüpontot a bal oldali sávból,
            vagy töltsd újra az oldalt. Az adataid biztonságban vannak.
          </p>
          <details style={{ textAlign: "left", background: C.dangerLight, border: `1px solid ${C.danger}33`, borderRadius: 10, padding: "10px 14px", marginBottom: 18 }}>
            <summary style={{ fontSize: 12, color: C.danger, fontWeight: 700, cursor: "pointer" }}>
              Hiba részletei
            </summary>
            <pre style={{ fontSize: 11, color: "#991B1B", margin: "8px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {this.state.error?.toString()}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "10px 24px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13.5, fontFamily: FONT, cursor: "pointer" }}
          >
            Oldal újratöltése
          </button>
        </div>
      </div>
    );
  }
}
