import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { C, FONT } from "../../../lib/constants.js";
import { addMegjegyzes } from "../projekt.service.js";

export default function TabKommunikacio({ projekt, currentUser }) {
  const [szoveg, setSzoveg] = useState("");
  const megjegyzesek = [...(projekt.megjegyzesek || [])].reverse();

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
    <div style={{ paddingTop: 16, fontFamily: FONT, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Bevitel */}
      <div style={{ background: "#fff", border: `1.5px solid ${C.accent}`, borderRadius: 12, padding: 14 }}>
        <textarea
          value={szoveg}
          onChange={e => setSzoveg(e.target.value)}
          placeholder="Megjegyzés, feljegyzés, teendő…"
          rows={3}
          onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleKuldes(); }}
          style={{ width: "100%", boxSizing: "border-box", border: "none", outline: "none", fontSize: 13, fontFamily: FONT, resize: "none", color: C.text }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button onClick={handleKuldes} disabled={!szoveg.trim()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: szoveg.trim() ? C.accent : C.border, color: "#fff", border: "none", borderRadius: 8, cursor: szoveg.trim() ? "pointer" : "default", fontWeight: 600, fontSize: 13, fontFamily: FONT }}>
            <Send size={13} /> Rögzít
          </button>
        </div>
      </div>

      {/* Lista */}
      {megjegyzesek.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: C.muted }}>
          <MessageSquare size={32} style={{ opacity: .2, display: "block", margin: "0 auto 8px" }} />
          <p style={{ fontSize: 13 }}>Még nincs feljegyzés</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {megjegyzesek.map(m => (
            <div key={m.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: C.accent }}>{m.user || "—"}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{fmtDatum(m.datum)}</span>
              </div>
              <p style={{ fontSize: 13, color: C.text, margin: 0, whiteSpace: "pre-wrap" }}>{m.szoveg}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
