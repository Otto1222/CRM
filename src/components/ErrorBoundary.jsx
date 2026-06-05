import { Component } from "react";
import { C, FONT, FONT_HEADING } from "../lib/constants";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8FAFC", fontFamily: FONT, padding: 24 }}>
        <div style={{ maxWidth: 520, width: "100%", background: "#fff", borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.10)", padding: "36px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 800, color: C.text, margin: "0 0 10px" }}>
            Váratlan hiba történt
          </h2>
          <p style={{ fontSize: 14, color: C.muted, margin: "0 0 24px", lineHeight: 1.6 }}>
            Az alkalmazás egy nem várt hibába ütközött. Az adatok biztonságban vannak — frissítsd az oldalt a folytatáshoz.
          </p>
          <details style={{ textAlign: "left", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 24 }}>
            <summary style={{ fontSize: 12, color: "#DC2626", fontWeight: 700, cursor: "pointer", marginBottom: 6 }}>
              Hiba részletei
            </summary>
            <pre style={{ fontSize: 11, color: "#991B1B", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {this.state.error?.toString()}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: "11px 28px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, fontFamily: FONT, cursor: "pointer" }}
          >
            Oldal újratöltése
          </button>
        </div>
      </div>
    );
  }
}
