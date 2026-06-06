/**
 * TabKommunikacio.jsx – Napló + Megjegyzések (összevonva)
 */
import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { C, FONT } from "../../../lib/constants.js";
import { addMegjegyzes } from "../projekt.service.js";

export default function TabKommunikacio({ projekt, currentUser }) {
  const [szoveg, setSzoveg] = useState("");

  // Megjegyzések + eseménynapló összevonva, dátum szerint rendezve
  const osszesBejegyzes = [
    ...(projekt.megjegyzesek || []).map(m => ({
      id: m.id, datum: m.datum, user: m.user || currentUser?.name,
      cimke: "💬 Megjegyzés", szoveg: m.szoveg, tipus: "megjegyzes",
    })),
    ...(projekt.esemenynaplo || []).map(e => ({
      id: e.id, datum: e.datum, user: e.user || "Rendszer",
      cimke: e.esemeny === "Státusz változás" ? "🔄 Státusz" :
             e.esemeny === "Projekt létrehozva" ? "✅ Létrehozva" : `📌 ${e.esemeny}`,
      szoveg: e.reszletek || e.esemeny, tipus: "esemeny",
    })),
  ].sort((a, b) => new Date(b.datum) - new Date(a.datum));

  function handleKuldes() {
    if (!szoveg.trim()) return;
    addMegjegyzes(projekt.id, szoveg.trim(), currentUser?.name || "");
    setSzoveg("");
  }

  function fmtDatum(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("hu-HU", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div style={{ paddingTop: 16, fontFamily: FONT, display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Bevitel */}
      <div style={{ background: "#fff", border: `1.5px solid ${C.accent}`, borderRadius: 12, padding: 14 }}>
        <textarea value={szoveg} onChange={e => setSzoveg(e.target.value)}
          placeholder="Megjegyzés, feljegyzés, teendő…" rows={3}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleKuldes(); }}
          style={{ width: "100%", boxSizing: "border-box", border: "none", outline: "none",
            fontSize: 13, fontFamily: FONT, resize: "none", color: C.text }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <span style={{ fontSize: 11, color: C.muted }}>Ctrl+Enter = küldés</span>
          <button onClick={handleKuldes} disabled={!szoveg.trim()}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
              background: szoveg.trim() ? C.accent : C.border, color: "#fff", border: "none",
              borderRadius: 8, cursor: szoveg.trim() ? "pointer" : "default",
              fontWeight: 600, fontSize: 13, fontFamily: FONT }}>
            <Send size={13} /> Rögzít
          </button>
        </div>
      </div>

      {/* Lista */}
      {osszesBejegyzes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: C.muted }}>
          <MessageSquare size={32} style={{ opacity: .2, display: "block", margin: "0 auto 8px" }} />
          <p style={{ fontSize: 13 }}>Még nincs bejegyzés</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {osszesBejegyzes.map((b, i) => (
            <div key={b.id || i} style={{
              background: b.tipus === "esemeny" ? "#F8FAFC" : "#fff",
              border: `1px solid ${b.tipus === "esemeny" ? C.border : "#BFDBFE"}`,
              borderRadius: 10, padding: "11px 14px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: b.szoveg ? 5 : 0 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: b.tipus === "esemeny" ? C.muted : C.accent }}>
                  {b.cimke}
                  {b.user && <span style={{ fontWeight: 400, marginLeft: 6 }}>{b.user}</span>}
                </span>
                <span style={{ fontSize: 11, color: C.muted }}>{fmtDatum(b.datum)}</span>
              </div>
              {b.szoveg && (
                <p style={{ fontSize: 13, color: C.text, margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{b.szoveg}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
