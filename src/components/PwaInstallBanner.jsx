import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { FONT } from "../lib/constants";

function isIOS() {
  return /ipad|iphone|ipod/i.test(navigator.userAgent) && !window.MSStream;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

export default function PwaInstallBanner() {
  const [prompt, setPrompt]       = useState(null);   // beforeinstallprompt event
  const [mode, setMode]           = useState(null);   // "android" | "ios" | null
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem("pwa_dismissed") === "1"
  );

  useEffect(() => {
    if (dismissed || isStandalone()) return;

    // iOS: nincs beforeinstallprompt, manuális instrukció
    if (isIOS()) {
      setMode("ios");
      return;
    }

    // Android / desktop Chrome
    const handler = e => {
      e.preventDefault();
      setPrompt(e);
      setMode("android");
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, [dismissed]);

  function dismiss() {
    localStorage.setItem("pwa_dismissed", "1");
    setDismissed(true);
  }

  async function install() {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    setPrompt(null);
    setMode(null);
    if (outcome === "accepted") {
      localStorage.setItem("pwa_dismissed", "1");
    }
  }

  if (dismissed || !mode) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9998,
      background: "#0F172A",
      borderTop: "1px solid #1E3A5F",
      padding: "14px 16px calc(14px + env(safe-area-inset-bottom, 0px)) 16px",
      fontFamily: FONT,
      boxShadow: "0 -4px 20px rgba(0,0,0,0.3)",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: mode === "ios" ? 0 : 10 }}>
        <img src="/icon.svg" alt="" style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <p style={{ color: "#F8FAFC", fontWeight: 700, fontSize: 14, margin: "0 0 3px" }}>
            📱 Telepítsd az appot!
          </p>
          {mode === "ios" ? (
            <p style={{ color: "#94A3B8", fontSize: 12, margin: 0, lineHeight: 1.7 }}>
              Nyomd meg a <strong style={{ color: "#60A5FA" }}>⬆️ Megosztás</strong> gombot, majd válaszd:
              <br />
              <strong style={{ color: "#4ADE80" }}>"Főképernyőhöz adás"</strong>
            </p>
          ) : (
            <p style={{ color: "#94A3B8", fontSize: 12, margin: 0 }}>
              Offline is működik · Gyorsabb · Ikon a kezdőképernyőn
            </p>
          )}
        </div>
        <button
          onClick={dismiss}
          style={{ border: "none", background: "none", color: "#475569", cursor: "pointer", padding: "2px", flexShrink: 0 }}
          aria-label="Bezárás"
        >
          <X size={18} />
        </button>
      </div>

      {mode === "android" && (
        <button
          onClick={install}
          style={{
            width: "100%", padding: "12px", borderRadius: 10, border: "none",
            background: "#2563EB", color: "#fff", fontWeight: 700, fontSize: 14,
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8, fontFamily: FONT,
          }}
        >
          <Download size={16} /> Telepítés a kezdőképernyőre
        </button>
      )}
    </div>
  );
}
