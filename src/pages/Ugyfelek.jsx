import { useState } from "react";
import { Search, Plus, MoreVertical, Phone, Mail, MapPin, User } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import Card from "../components/Card";

export default function Ugyfelek({ data }) {
  const [q, setQ] = useState("");
  const filtered  = data.ugyfelek.filter(c =>
    c.name.toLowerCase().includes(q.toLowerCase()) ||
    c.email.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "0 14px", flex: 1, maxWidth: 340 }}>
          <Search size={15} color={C.muted} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Ügyfél keresése…" style={{ border: "none", outline: "none", fontSize: 14, padding: "10px 0", flex: 1, fontFamily: FONT, background: "transparent", color: C.text }} />
        </div>
        <button style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>
          <Plus size={16} />Új ügyfél
        </button>
      </div>

      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {["Név","Típus","Telefon","E-mail","Cím",""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: .8, color: C.muted, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = C.bg}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: C.accent, fontSize: 14 }}>{c.name[0]}</div>
                    <span style={{ fontWeight: 600, color: C.text }}>{c.name}</span>
                  </div>
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ background: c.type === "Vállalkozás" ? "#FEF9C3" : "#F1F5F9", color: c.type === "Vállalkozás" ? "#854D0E" : C.textSub, borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 600 }}>
                    {c.type}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", color: C.textSub }}>{c.phone}</td>
                <td style={{ padding: "14px 16px", color: C.accent }}>{c.email}</td>
                <td style={{ padding: "14px 16px", color: C.textSub }}>{c.address}</td>
                <td style={{ padding: "14px 16px" }}><MoreVertical size={15} color={C.muted} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.muted }}>
            <User size={36} style={{ opacity: .25, display: "block", margin: "0 auto 10px" }} />
            Nincs találat
          </div>
        )}
      </Card>
    </div>
  );
}
