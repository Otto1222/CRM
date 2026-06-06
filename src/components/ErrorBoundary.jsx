import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    const msg   = this.state.error?.toString() || "Ismeretlen hiba";
    const stack = this.state.error?.stack || "";
    const comp  = this.state.info?.componentStack || "";

    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "#1a0000",
        overflowY: "auto",
        padding: "20px 16px",
        fontFamily: "monospace",
        WebkitTextSizeAdjust: "100%",
      }}>
        {/* Fejléc */}
        <div style={{ background: "#ff0000", color: "#fff", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 1 }}>💥 RUNTIME ERROR</div>
          <div style={{ fontSize: 13, marginTop: 4, opacity: 0.85 }}>
            Az alkalmazás összeomlott. Küldd el ezt a képernyőt!
          </div>
        </div>

        {/* Hiba üzenet */}
        <div style={{ background: "#2d0000", border: "2px solid #ff4444", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ color: "#ff9999", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
            ERROR MESSAGE
          </div>
          <div style={{ color: "#ffcccc", fontSize: 15, fontWeight: 700, lineHeight: 1.5, wordBreak: "break-all" }}>
            {msg}
          </div>
        </div>

        {/* Stack trace */}
        {stack ? (
          <div style={{ background: "#1a1a00", border: "1px solid #888800", borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
            <div style={{ color: "#cccc44", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
              STACK TRACE
            </div>
            <pre style={{ color: "#ffffaa", fontSize: 11, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6 }}>
              {stack}
            </pre>
          </div>
        ) : null}

        {/* Component stack */}
        {comp ? (
          <div style={{ background: "#001a1a", border: "1px solid #006666", borderRadius: 8, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ color: "#44cccc", fontSize: 11, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
              COMPONENT STACK
            </div>
            <pre style={{ color: "#aaffff", fontSize: 11, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6 }}>
              {comp}
            </pre>
          </div>
        ) : null}

        {/* Újratöltés gomb */}
        <button
          onClick={() => window.location.reload()}
          style={{
            width: "100%", padding: "14px", background: "#cc0000",
            color: "#fff", border: "none", borderRadius: 8,
            fontWeight: 900, fontSize: 16, fontFamily: "monospace",
            cursor: "pointer", letterSpacing: 1,
          }}
        >
          🔄 OLDAL ÚJRATÖLTÉSE
        </button>
      </div>
    );
  }
}
