import { useState } from "react";
import { Calendar, Save, CheckCircle2 } from "lucide-react";
import { C, FONT } from "../../../lib/constants.js";
import { updateProjekt } from "../projekt.service.js";

function DateField({ label, value, onChange }) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: .7 }}>{label}</label>
      <input type="date" value={value || ""} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: FONT, outline: "none", color: C.text }} />
    </div>
  );
}

export default function TabUtemezas({ projekt, currentUser }) {
  const [form, setForm] = useState({
    tervezettKezdes:    projekt.tervezettKezdes    || "",
    tervezettBefejezes: projekt.tervezettBefejezes || "",
    valoKezdes:         projekt.valoKezdes         || "",
    valoBefejezes:      projekt.valoBefejezes      || "",
    elvegzettMunkaora:  projekt.elvegzettMunkaora  || "",
  });
  const [mentve, setMentve] = useState(false);

  function upd(k, v) { setForm(p => ({...p, [k]: v})); setMentve(false); }

  function handleSave() {
    updateProjekt(projekt.id, {
      ...form,
      elvegzettMunkaora: Number(form.elvegzettMunkaora) || 0,
    }, currentUser?.name || "");
    setMentve(true);
    setTimeout(() => setMentve(false), 2500);
  }

  // Hány nap a tervezett?
  let tervNapok = null;
  if (form.tervezettKezdes && form.tervezettBefejezes) {
    const d1 = new Date(form.tervezettKezdes);
    const d2 = new Date(form.tervezettBefejezes);
    tervNapok = Math.round((d2 - d1) / 86400000) + 1;
  }

  return (
    <div style={{ paddingTop: 16, fontFamily: FONT, maxWidth: 560 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7, margin: 0 }}>📅 Tervezett</p>
          <DateField label="Kezdés" value={form.tervezettKezdes} onChange={v => upd("tervezettKezdes", v)} />
          <DateField label="Befejezés" value={form.tervezettBefejezes} onChange={v => upd("tervezettBefejezes", v)} />
          {tervNapok !== null && (
            <p style={{ fontSize: 12, color: C.accent, fontWeight: 700, margin: 0 }}>⏱ {tervNapok} munkanap</p>
          )}
        </div>

        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7, margin: 0 }}>✅ Valós</p>
          <DateField label="Kezdés" value={form.valoKezdes} onChange={v => upd("valoKezdes", v)} />
          <DateField label="Befejezés" value={form.valoBefejezes} onChange={v => upd("valoBefejezes", v)} />
        </div>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginTop: 16 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: .7 }}>Elvégzett munkaórák</label>
        <input type="number" min="0" value={form.elvegzettMunkaora} onChange={e => upd("elvegzettMunkaora", e.target.value)}
          placeholder="pl. 16"
          style={{ width: 140, padding: "10px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 14, fontFamily: FONT, outline: "none" }} />
        <span style={{ fontSize: 13, color: C.muted, marginLeft: 8 }}>óra</span>
      </div>

      <button onClick={handleSave} style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 8, padding: "11px 24px", background: mentve ? C.success : C.accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>
        {mentve ? <><CheckCircle2 size={16} /> Mentve!</> : <><Save size={16} /> Mentés</>}
      </button>
    </div>
  );
}
