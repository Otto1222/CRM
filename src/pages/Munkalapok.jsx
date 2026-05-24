import { useState } from "react";
import { Search, Plus, ChevronRight, FileText, Printer, Send, Loader2, Euro, Pencil, Trash2, Eye } from "lucide-react";
import { Phone, Mail, MapPin } from "lucide-react";
import { C, FONT, FONT_HEADING, USERS, ALL_STATUSES, STATUS_CFG } from "../lib/constants";
import { ft, totals } from "../lib/helpers";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import Avatar from "../components/Avatar";

// ─── LISTA ────────────────────────────────────────────────────
export function MunkalapLista({ data, onSelect, onNew }) {
  const [tab, setTab] = useState("Összes");
  const [q, setQ]     = useState("");

  const filtered = data.munkalapok.filter(m =>
    (tab === "Összes" || m.status === tab) &&
    (m.title.toLowerCase().includes(q.toLowerCase()) || m.id.toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "0 14px", flex: 1, maxWidth: 340 }}>
          <Search size={15} color={C.muted} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Keresés munkaszám, cím…" style={{ border: "none", outline: "none", fontSize: 14, padding: "10px 0", flex: 1, fontFamily: FONT, color: C.text, background: "transparent" }} />
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {ALL_STATUSES.map(s => (
            <button key={s} onClick={() => setTab(s)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${tab === s ? C.accent : C.border}`, background: tab === s ? C.accentLight : "#fff", color: tab === s ? C.accent : C.textSub, fontWeight: tab === s ? 700 : 400, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={onNew} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT, whiteSpace: "nowrap" }}>
          <Plus size={16} />Új munkalap
        </button>
      </div>

      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {["Munkaszám","Cím","Ügyfél","Dátum","Szerelő","Státusz","Összeg",""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: .8, color: C.muted, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const cl = data.ugyfelek.find(u => u.id === m.clientId);
              const as = USERS.find(u => u.id === m.assigneeId);
              const tot = totals(m.items);
              return (
                <tr key={m.id} onClick={() => onSelect(m)} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bg}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "14px 16px", fontWeight: 700, color: C.accent }}>{m.id}</td>
                  <td style={{ padding: "14px 16px", fontWeight: 600, color: C.text, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</td>
                  <td style={{ padding: "14px 16px", color: C.textSub }}>{cl?.name || "—"}</td>
                  <td style={{ padding: "14px 16px", color: C.textSub }}>{m.date}</td>
                  <td style={{ padding: "14px 16px" }}>
                    {as && <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Avatar u={as} size={26} /><span style={{ color: C.textSub }}>{as.name.split(" ")[0]}</span></div>}
                  </td>
                  <td style={{ padding: "14px 16px" }}><StatusBadge s={m.status} /></td>
                  <td style={{ padding: "14px 16px", fontWeight: 700, color: C.text }}>{tot.brutto > 0 ? ft(tot.brutto) : "—"}</td>
                  <td style={{ padding: "14px 16px" }}><ChevronRight size={16} color={C.muted} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: C.muted }}>
            <FileText size={36} style={{ opacity: .25, display: "block", margin: "0 auto 10px" }} />
            Nincs találat
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── RÉSZLETEK ────────────────────────────────────────────────
export function MunkalapDetail({ m, data }) {
  const cl  = data.ugyfelek.find(u => u.id === m.clientId);
  const as  = USERS.find(u => u.id === m.assigneeId);
  const tot = totals(m.items);
  const [saving, setSaving] = useState(false);

  async function issueInvoice() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1200));
    setSaving(false);
    alert(`✅ Számla kiállítva!\n${m.id} – ${m.title}\nBruttó: ${ft(tot.brutto)}`);
  }

  return (
    <div style={{ padding: "28px 32px", display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, fontFamily: FONT }}>

      {/* ── Bal oldal ── */}
      <div>
        {/* Fejléc */}
        <Card style={{ padding: "22px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>Munkaszám</span>
              <h2 style={{ fontFamily: FONT_HEADING, fontSize: 24, fontWeight: 800, color: C.text, margin: "6px 0 4px" }}>{m.id}</h2>
              <p style={{ fontSize: 16, color: C.text, fontWeight: 600 }}>{m.title}</p>
            </div>
            <StatusBadge s={m.status} />
          </div>
          <p style={{ fontSize: 13.5, color: C.textSub, lineHeight: 1.7 }}>{m.description}</p>
          <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
            <div>
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .8 }}>Dátum</span>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 3 }}>{m.date} {m.time}</p>
            </div>
            {as && (
              <div>
                <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .8 }}>Szerelő</span>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
                  <Avatar u={as} size={24} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{as.name}</span>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Számlázás */}
        <Card style={{ padding: "22px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ fontFamily: FONT_HEADING, fontSize: 16, fontWeight: 700, color: C.text }}>Számlázás – {m.items.length} tétel</h3>
            {tot.brutto > 0 && <span style={{ fontWeight: 800, fontSize: 18, color: C.accent }}>{ft(tot.brutto)}</span>}
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                {["Megnevezés","Mennyiség","Nettó egységár","ÁFA","Bruttó összeg"].map(h => (
                  <th key={h} style={{ padding: "8px 12px", textAlign: h === "Megnevezés" ? "left" : "right", fontSize: 11, fontWeight: 700, letterSpacing: .7, color: C.muted, textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.items.map((it, i) => {
                const n = it.qty * it.net;
                const b = n * (1 + it.vat / 100);
                return (
                  <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: "12px 12px", fontWeight: 600, color: C.text }}>{it.name}</td>
                    <td style={{ padding: "12px 12px", textAlign: "right", color: C.textSub }}>{it.qty} {it.unit}</td>
                    <td style={{ padding: "12px 12px", textAlign: "right", color: C.textSub }}>{ft(it.net)}</td>
                    <td style={{ padding: "12px 12px", textAlign: "right", color: C.textSub }}>{it.vat}%</td>
                    <td style={{ padding: "12px 12px", textAlign: "right", fontWeight: 700, color: C.text }}>{ft(b)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {m.items.length === 0 && (
            <div style={{ textAlign: "center", padding: "32px 0", color: C.muted }}>
              <Euro size={32} style={{ opacity: .2, display: "block", margin: "0 auto 8px" }} />
              <p style={{ fontSize: 13 }}>Még nincsenek tételek hozzáadva</p>
            </div>
          )}

          {tot.brutto > 0 && (
            <div style={{ borderTop: `2px solid ${C.border}`, marginTop: 12, paddingTop: 16 }}>
              {[["Nettó összeg", tot.netto], ["ÁFA összeg", tot.afa]].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.textSub, marginBottom: 6, padding: "0 12px" }}>
                  <span>{l}</span><span>{ft(v)}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 800, color: C.text, padding: "8px 12px 0", borderTop: `1px solid ${C.border}`, marginTop: 6 }}>
                <span>Bruttó összeg</span>
                <span style={{ color: C.accent }}>{ft(tot.brutto)}</span>
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button style={{ flex: 1, padding: "12px 0", borderRadius: 11, border: `2px solid ${C.border}`, background: "#fff", color: C.text, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT }}>
              <Printer size={16} />Díjbekérő
            </button>
            <button onClick={issueInvoice} disabled={saving || m.items.length === 0} style={{ flex: 1, padding: "12px 0", borderRadius: 11, border: "none", background: m.items.length ? C.success : "#E2E8F0", color: "#fff", fontWeight: 700, cursor: m.items.length ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT }}>
              {saving ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <><Send size={16} />Számla kiállítása</>}
            </button>
          </div>
        </Card>
      </div>

      {/* ── Jobb oldal ── */}
      <div>
        {cl && (
          <Card style={{ padding: "20px 22px", marginBottom: 16 }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase", marginBottom: 14 }}>Ügyfél</h4>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: C.accentLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontWeight: 700, color: C.accent, fontSize: 16 }}>{cl.name[0]}</span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{cl.name}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{cl.type}</div>
              </div>
            </div>
            {[{ icon: Phone, v: cl.phone }, { icon: Mail, v: cl.email }, { icon: MapPin, v: cl.address }].map(({ icon: Icon, v }) => (
              <div key={v} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: C.textSub, marginBottom: 8 }}>
                <Icon size={14} style={{ flexShrink: 0, marginTop: 2 }} color={C.muted} />{v}
              </div>
            ))}
          </Card>
        )}

        <Card style={{ padding: "20px 22px", marginBottom: 16 }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase", marginBottom: 14 }}>Státusz módosítása</h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {["Folyamatban","Ütemezett","Kész","Meghiúsult"].map(s => {
              const cfg = STATUS_CFG[s];
              return (
                <button key={s} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${m.status === s ? cfg.dot : C.border}`, background: m.status === s ? cfg.bg : "#fff", color: m.status === s ? cfg.text : C.textSub, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONT }}>
                  {s}
                </button>
              );
            })}
          </div>
        </Card>

        <Card style={{ padding: "20px 22px" }}>
          <h4 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase", marginBottom: 14 }}>Műveletek</h4>
          {[{ icon: Pencil, label: "Szerkesztés" }, { icon: FileText, label: "PDF exportálás" }, { icon: Eye, label: "Előnézet" }, { icon: Trash2, label: "Törlés", danger: true }].map(a => (
            <button key={a.label} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, border: "none", background: "transparent", color: a.danger ? C.danger : C.textSub, cursor: "pointer", fontSize: 13, marginBottom: 4, textAlign: "left", fontFamily: FONT }}>
              <a.icon size={15} />{a.label}
            </button>
          ))}
        </Card>
      </div>
    </div>
  );
}
