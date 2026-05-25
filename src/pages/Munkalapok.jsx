import { useState } from "react";
import {
  Search, Plus, ChevronRight, FileText, Phone, MapPin,
  ClipboardList, Package, Ruler, Printer, Send, Loader2,
  Pencil, Trash2, Eye, Euro
} from "lucide-react";
import { C, FONT, FONT_HEADING, USERS, STATUS_CFG } from "../lib/constants";
import { ft, totals } from "../lib/helpers";
import { canSeePrice, canCreateMunkalap } from "../lib/roles";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import Avatar from "../components/Avatar";

// ─── Cimke badge ─────────────────────────────────────────────
function CimkeBadge({ label, color }) {
  return (
    <span style={{ background: color, color: "#fff", borderRadius: 6, padding: "2px 10px", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// LISTA – mindenkinek ugyanaz
// ═══════════════════════════════════════════════════════════════
export function MunkalapLista({ data, onSelect, onNew, userRole }) {
  const [tab, setTab] = useState("Összes");
  const [q,   setQ]   = useState("");
  const STATUSES = ["Összes","Folyamatban","Ütemezett","Kész","Meghiúsult","Megkezdésre Vár"];

  const filtered = data.munkalapok.filter(m =>
    (tab === "Összes" || m.status === tab) &&
    (m.id.toLowerCase().includes(q.toLowerCase()) ||
     (data.ugyfelek.find(u => u.id === m.clientId)?.name || "").toLowerCase().includes(q.toLowerCase()) ||
     (m.title || "").toLowerCase().includes(q.toLowerCase()))
  );

  // ── Mobil kártyás lista ──
  const isMobile = window.innerWidth < 768;
  if (isMobile) {
    return (
      <div style={{ padding: "12px 16px", fontFamily: FONT }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "0 12px" }}>
            <Search size={15} color={C.muted} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Keresés…" style={{ border: "none", outline: "none", fontSize: 14, padding: "10px 0", flex: 1, fontFamily: FONT, background: "transparent", color: C.text }} />
          </div>
        </div>
        {filtered.map(m => {
          const cl = data.ugyfelek.find(u => u.id === m.clientId);
          const hasGroup = USERS.find(u => u.id === m.assigneeId)?.id === "u2" || USERS.find(u => u.id === m.assigneeId)?.id === "u3";
          return (
            <button key={m.id} onClick={() => onSelect(m)} style={{ width: "100%", background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10, cursor: "pointer", textAlign: "left", fontFamily: FONT }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                {hasGroup && <span style={{ fontSize: 14 }}>👥</span>}
                <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{m.id}</span>
                {m.cimke && <CimkeBadge label={m.cimke} color={m.cimkeSzin || C.accent} />}
                <span style={{ marginLeft: "auto", fontSize: 12, color: C.muted }}>{m.date}</span>
              </div>
              {m.status && <span style={{ color: m.statusSzin || C.muted, fontSize: 13, fontWeight: 600 }}>{m.status}</span>}
              {m.projektMegnevezes && <p style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>{m.projektMegnevezes}</p>}
              {cl && <div style={{ marginTop: 8 }}><p style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{cl.name}</p><p style={{ fontSize: 12, color: C.muted }}>{cl.address}</p></div>}
            </button>
          );
        })}
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}><FileText size={36} style={{ opacity:.2, display:"block", margin:"0 auto 10px" }} />Nincs találat</div>}
      </div>
    );
  }

  // ── Asztali táblázatos lista ──
  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "0 14px", flex: 1, maxWidth: 340 }}>
          <Search size={15} color={C.muted} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Keresés munkaszám, ügyfél…" style={{ border: "none", outline: "none", fontSize: 14, padding: "10px 0", flex: 1, fontFamily: FONT, color: C.text, background: "transparent" }} />
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setTab(s)} style={{ padding: "7px 13px", borderRadius: 8, border: `1px solid ${tab===s ? C.accent : C.border}`, background: tab===s ? C.accentLight : "#fff", color: tab===s ? C.accent : C.textSub, fontWeight: tab===s ? 700 : 400, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>{s}</button>
          ))}
        </div>
        {canCreateMunkalap(userRole) && (
          <button onClick={onNew} style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT, whiteSpace: "nowrap" }}>
            <Plus size={16} />Új munkalap
          </button>
        )}
      </div>
      <Card>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${C.border}` }}>
              {["Munkaszám","Ügyfél","Dátum","Szerelő","Státusz", ...(canSeePrice(userRole) ? ["Összeg"] : []),""].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, letterSpacing: .8, color: C.muted, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(m => {
              const cl = data.ugyfelek.find(u => u.id === m.clientId);
              const as = USERS.find(u => u.id === m.assigneeId);
              const tot = totals(m.items || []);
              return (
                <tr key={m.id} onClick={() => onSelect(m)} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = C.bg}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, color: C.accent }}>{m.id}</span>
                      {m.cimke && <CimkeBadge label={m.cimke} color={m.cimkeSzin || C.accent} />}
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", color: C.textSub }}>{cl?.name || "—"}</td>
                  <td style={{ padding: "14px 16px", color: C.textSub }}>{m.date}</td>
                  <td style={{ padding: "14px 16px" }}>{as && <div style={{ display: "flex", alignItems: "center", gap: 7 }}><Avatar u={as} size={26} /><span style={{ color: C.textSub }}>{as.name.split(" ")[0]}</span></div>}</td>
                  <td style={{ padding: "14px 16px" }}><StatusBadge s={m.status || "Ütemezett"} /></td>
                  {canSeePrice(userRole) && <td style={{ padding: "14px 16px", fontWeight: 700, color: C.text }}>{tot.brutto > 0 ? ft(tot.brutto) : "—"}</td>}
                  <td style={{ padding: "14px 16px" }}><ChevronRight size={16} color={C.muted} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ textAlign: "center", padding: "48px 0", color: C.muted }}><FileText size={36} style={{ opacity:.25, display:"block", margin:"0 auto 10px" }} />Nincs találat</div>}
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TELEPÍTŐ NÉZET – mobil, tabok
// ═══════════════════════════════════════════════════════════════
function TelepItoHeader({ m, client }) {
  return (
    <div style={{ background: "#2C4A6E" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 8px" }}>
        <span style={{ fontWeight: 800, fontSize: 15, color: "#fff" }}>{m.id}</span>
        {m.cimke && <CimkeBadge label={m.cimke} color={m.cimkeSzin || C.accent} />}
        <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          {client?.phone && <a href={`tel:${client.phone}`} style={{ color: "#4ADE80" }}><Phone size={22} /></a>}
          {client?.address && <a href={`https://maps.google.com/?q=${encodeURIComponent(client.address)}`} target="_blank" rel="noreferrer" style={{ color: "#60A5FA" }}><MapPin size={22} /></a>}
        </div>
      </div>
      {client && (
        <div style={{ padding: "0 16px 14px" }}>
          <p style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>{client.name}</p>
          <p style={{ fontSize: 13, color: "#94A3B8" }}>{client.address}</p>
        </div>
      )}
    </div>
  );
}

function TelepItoInfo({ m, client }) {
  const fields = [
    { label: "Projekt megnevezés", value: m.projektMegnevezes, big: true },
    { label: "Feladat", value: m.feladat },
    { label: "Ügyszám", value: m.ugyszam },
    { label: "Kapcsolattartó", value: client?.name },
    { label: "Telefonszám", value: client?.phone },
    { label: "E-mail cím", value: client?.email },
    { label: "Értékesítő", value: m.ertekesito },
  ];
  return (
    <div style={{ background: "#F1F5F9" }}>
      {fields.map(f => (
        <div key={f.label} style={{ padding: "0 16px", background: "#F1F5F9" }}>
          <p style={{ fontSize: 12, color: "#64748B", paddingTop: 10, marginBottom: 4 }}>{f.label}</p>
          <div style={{ background: f.big ? "#E8EDF5" : "#E8EDF5", borderRadius: 6, padding: "10px 12px", marginBottom: 2, minHeight: f.big ? 60 : "auto", fontSize: 14, color: f.value ? C.text : "#94A3B8", borderBottom: "1px solid #D1D9E6" }}>
            {f.value || ""}
          </div>
        </div>
      ))}
      <div style={{ padding: "16px" }}>
        <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", background: "#fff", border: "2px solid #E2E8F0", borderRadius: 10, cursor: "pointer", fontSize: 14, fontFamily: FONT, marginBottom: 10, color: C.text }}>
          💬 Információk
        </button>
        <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", background: "#fff", border: "2px solid #E2E8F0", borderRadius: 10, cursor: "pointer", fontSize: 14, fontFamily: FONT, marginBottom: 10, color: C.text }}>
          📏 Felmérés
        </button>
        <button style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: FONT, marginBottom: 10 }}>
          Munkalap átvétel
        </button>
        <button style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: "#93C5FD", color: "#1e3a5f", fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: FONT, marginBottom: 10 }}>
          Kiírt anyag megrendelése
        </button>
        <button style={{ width: "100%", padding: "14px", borderRadius: 10, border: "none", background: "#22C55E", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", fontFamily: FONT }}>
          Megkezdés →
        </button>
      </div>
    </div>
  );
}

function TelepItoAnyagok({ m }) {
  return (
    <div style={{ background: "#F1F5F9" }}>
      {(m.anyagok || []).map((a, i) => (
        <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid #D1D9E6", display: "flex", justifyContent: "space-between", background: "#F1F5F9" }}>
          <p style={{ fontWeight: 600, fontSize: 14, color: C.text, flex: 1, paddingRight: 16 }}>{a.nev}</p>
          <p style={{ fontWeight: 700, fontSize: 14, color: C.text, whiteSpace: "nowrap" }}>{a.menny} {a.egyseg}</p>
        </div>
      ))}
      {(m.anyagok || []).length === 0 && (
        <div style={{ padding: "32px 16px", textAlign: "center", color: C.muted }}>
          <Package size={32} style={{ opacity:.2, display:"block", margin:"0 auto 8px" }} />
          <p style={{ fontSize: 14 }}>Nincsenek anyagok</p>
        </div>
      )}
    </div>
  );
}

function TelepItoFelmeres({ m }) {
  const f = m.felmeres || {};
  const mezok = [
    ["Csatlakozási pont", f.csatlakozasiPont],
    ["Csatl. pont állapota", f.csatlPontAllapota],
    ["AC kábel terv. hossz (m)", f.acKabelHossz],
    ["AC védelem típus", f.acVedelem],
    ["Komm. kábel tervezett hossza (m)", f.kommKabelHossz],
    ["Inverter fal, elhelyezés leírása", f.inverterFal],
    ["Akkumulátor fal, elhelyezés leírása", f.akkuFal],
    ["Akku kábel terv. hossz (m)", f.akkuKabelHossz],
    ["Tető típus", f.tetoTipus],
    ["Tetőszerkezet típus", f.tetoszerkezetTipus],
    ["Padlás", f.padlas],
    ["Villámhárító", f.villamharitor],
    ["Tartószerkezet típus", f.tartoszerkezetTipus],
    ["Pótcserép", f.potcserep],
    ["DC kábel terv. hossz (m)", f.dcKabelHossz],
    ["DC kábel további szükséges nyomvonal", f.dcKabelNyomvonal],
    ["DC védelem típus", f.dcVedelem],
    ["Tűzeseti kapcsoló szükséges", f.tuzKapcsolo],
    ["Panel elrendezés információk", f.panelElrendezes],
    ["Telepítéshez szükséges felhordó eszköz", f.felhordoEszkoz],
    ["Engedélyeztetés állapota", f.engedelyeztetes],
    ["Visszwatt védelem", f.visszwatt],
    ["Ingatlan megközelíthetősége, megjegyzés", f.megkozelithetoseg],
    ["Felmérés elvégzésének időpontja", f.felmeresIdopont],
  ].filter(([, v]) => v !== undefined && v !== "" && v !== null);

  if (mezok.length === 0) return (
    <div style={{ padding: "40px 16px", textAlign: "center", color: C.muted, background: "#F1F5F9" }}>
      <Ruler size={32} style={{ opacity:.2, display:"block", margin:"0 auto 8px" }} />
      <p style={{ fontSize: 14 }}>Felmérés még nem történt</p>
    </div>
  );

  return (
    <div style={{ background: "#F1F5F9" }}>
      {mezok.map(([label, value]) => (
        <div key={label} style={{ padding: "0 16px", background: "#F1F5F9" }}>
          <p style={{ fontSize: 12, color: "#64748B", paddingTop: 10, marginBottom: 4 }}>{label}</p>
          <div style={{ background: "#E8EDF5", borderRadius: 6, padding: "10px 12px", marginBottom: 2, fontSize: 14, color: C.text, borderBottom: "1px solid #D1D9E6" }}>
            {String(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function MunkalapDetailTelepito({ m, data }) {
  const [tab, setTab] = useState(0);
  const client = data.ugyfelek.find(u => u.id === m.clientId);
  const tabs = [
    { icon: <FileText size={20} /> },
    { icon: <Package size={20} /> },
    { icon: <ClipboardList size={20} /> },
  ];
  return (
    <div style={{ fontFamily: FONT, background: "#F1F5F9", minHeight: "100vh" }}>
      <TelepItoHeader m={m} client={client} />
      <div style={{ display: "flex", background: "#2C4A6E" }}>
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{ flex: 1, padding: "12px 0", border: "none", background: "transparent", color: tab===i ? "#fff" : "#94A3B8", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: tab===i ? "3px solid #fff" : "3px solid transparent", fontFamily: FONT }}>
            {t.icon}
          </button>
        ))}
      </div>
      {tab === 0 && <TelepItoInfo m={m} client={client} />}
      {tab === 1 && <TelepItoAnyagok m={m} />}
      {tab === 2 && <TelepItoFelmeres m={m} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// EREDETI ASZTALI NÉZET – Admin / Projektmenedzser / Iroda
// ═══════════════════════════════════════════════════════════════
function MunkalapDetailDesktop({ m, data, userRole }) {
  const cl  = data.ugyfelek.find(u => u.id === m.clientId);
  const as  = USERS.find(u => u.id === m.assigneeId);
  const tot = totals(m.items || []);
  const [saving, setSaving] = useState(false);

  async function issueInvoice() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1200));
    setSaving(false);
    alert(`✅ Számla kiállítva!\n${m.id}\nBruttó: ${ft(tot.brutto)}`);
  }

  return (
    <div style={{ padding: "28px 32px", display: "grid", gridTemplateColumns: "1fr 360px", gap: 24, fontFamily: FONT }}>
      <div>
        {/* Fejléc */}
        <Card style={{ padding: "22px 24px", marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: C.muted, textTransform: "uppercase" }}>Munkaszám</span>
                {m.cimke && <CimkeBadge label={m.cimke} color={m.cimkeSzin || C.accent} />}
              </div>
              <h2 style={{ fontFamily: FONT_HEADING, fontSize: 24, fontWeight: 800, color: C.text, margin: "4px 0" }}>{m.id}</h2>
              <p style={{ fontSize: 15, color: C.text, fontWeight: 600 }}>{m.projektMegnevezes || m.feladat || m.description}</p>
            </div>
            <StatusBadge s={m.status || "Ütemezett"} />
          </div>
          <p style={{ fontSize: 13.5, color: C.textSub, lineHeight: 1.7 }}>{m.description}</p>
          <div style={{ display: "flex", gap: 24, marginTop: 16 }}>
            <div><span style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .8 }}>Dátum</span><p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginTop: 3 }}>{m.date}</p></div>
            {as && <div><span style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .8 }}>Szerelő</span><div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}><Avatar u={as} size={24} /><span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{as.name}</span></div></div>}
          </div>
        </Card>

        {/* Számlázás – csak jogosultaknak */}
        {canSeePrice(userRole) && (
          <Card style={{ padding: "22px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <h3 style={{ fontFamily: FONT_HEADING, fontSize: 16, fontWeight: 700, color: C.text }}>Számlázás – {(m.items||[]).length} tétel</h3>
              {tot.brutto > 0 && <span style={{ fontWeight: 800, fontSize: 18, color: C.accent }}>{ft(tot.brutto)}</span>}
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ borderBottom: `2px solid ${C.border}` }}>{["Megnevezés","Mennyiség","Nettó egységár","ÁFA","Bruttó összeg"].map(h=><th key={h} style={{ padding:"8px 12px", textAlign:h==="Megnevezés"?"left":"right", fontSize:11, fontWeight:700, letterSpacing:.7, color:C.muted, textTransform:"uppercase" }}>{h}</th>)}</tr></thead>
              <tbody>
                {(m.items||[]).map((it,i)=>{ const n=it.qty*it.net; const b=n*(1+it.vat/100); return(
                  <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
                    <td style={{ padding:"12px 12px", fontWeight:600, color:C.text }}>{it.name}</td>
                    <td style={{ padding:"12px 12px", textAlign:"right", color:C.textSub }}>{it.qty} {it.unit}</td>
                    <td style={{ padding:"12px 12px", textAlign:"right", color:C.textSub }}>{ft(it.net)}</td>
                    <td style={{ padding:"12px 12px", textAlign:"right", color:C.textSub }}>{it.vat}%</td>
                    <td style={{ padding:"12px 12px", textAlign:"right", fontWeight:700, color:C.text }}>{ft(b)}</td>
                  </tr>
                );})}
              </tbody>
            </table>
            {(m.items||[]).length===0 && <div style={{ textAlign:"center", padding:"32px 0", color:C.muted }}><Euro size={32} style={{ opacity:.2, display:"block", margin:"0 auto 8px" }}/><p style={{ fontSize:13 }}>Még nincsenek tételek</p></div>}
            {tot.brutto>0&&(
              <div style={{ borderTop:`2px solid ${C.border}`, marginTop:12, paddingTop:16 }}>
                {[["Nettó összeg",tot.netto],["ÁFA összeg",tot.afa]].map(([l,v])=>(
                  <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:13, color:C.textSub, marginBottom:6, padding:"0 12px" }}><span>{l}</span><span>{ft(v)}</span></div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:18, fontWeight:800, color:C.text, padding:"8px 12px 0", borderTop:`1px solid ${C.border}`, marginTop:6 }}>
                  <span>Bruttó összeg</span><span style={{ color:C.accent }}>{ft(tot.brutto)}</span>
                </div>
              </div>
            )}
            <div style={{ display:"flex", gap:12, marginTop:20 }}>
              <button style={{ flex:1, padding:"12px 0", borderRadius:11, border:`2px solid ${C.border}`, background:"#fff", color:C.text, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT }}><Printer size={16}/>Díjbekérő</button>
              <button onClick={issueInvoice} disabled={saving||(m.items||[]).length===0} style={{ flex:1, padding:"12px 0", borderRadius:11, border:"none", background:(m.items||[]).length?C.success:"#E2E8F0", color:"#fff", fontWeight:700, cursor:(m.items||[]).length?"pointer":"default", display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:FONT }}>
                {saving?<Loader2 size={16} style={{ animation:"spin 1s linear infinite" }}/>:<><Send size={16}/>Számla kiállítása</>}
              </button>
            </div>
          </Card>
        )}
      </div>

      {/* Jobb panel */}
      <div>
        {cl && (
          <Card style={{ padding:"20px 22px", marginBottom:16 }}>
            <h4 style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase", marginBottom:14 }}>Ügyfél</h4>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:C.accentLight, display:"flex", alignItems:"center", justifyContent:"center" }}><span style={{ fontWeight:700, color:C.accent, fontSize:16 }}>{cl.name[0]}</span></div>
              <div><div style={{ fontWeight:700, fontSize:15, color:C.text }}>{cl.name}</div><div style={{ fontSize:12, color:C.muted }}>{cl.type}</div></div>
            </div>
            {[{icon:Phone,v:cl.phone},{icon:MapPin,v:cl.address}].map(({icon:Icon,v})=>(
              <div key={v} style={{ display:"flex", alignItems:"flex-start", gap:8, fontSize:13, color:C.textSub, marginBottom:8 }}><Icon size={14} style={{ flexShrink:0, marginTop:2 }} color={C.muted}/>{v}</div>
            ))}
          </Card>
        )}
        <Card style={{ padding:"20px 22px", marginBottom:16 }}>
          <h4 style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase", marginBottom:14 }}>Státusz módosítása</h4>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {["Folyamatban","Ütemezett","Kész","Meghiúsult","Megkezdésre Vár"].map(s=>{
              const cfg=STATUS_CFG[s]||{bg:"#F1F5F9",text:C.muted,dot:C.muted};
              return <button key={s} style={{ padding:"7px 14px", borderRadius:8, border:`1px solid ${m.status===s?cfg.dot:C.border}`, background:m.status===s?cfg.bg:"#fff", color:m.status===s?cfg.text:C.textSub, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:FONT }}>{s}</button>;
            })}
          </div>
        </Card>
        <Card style={{ padding:"20px 22px" }}>
          <h4 style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:C.muted, textTransform:"uppercase", marginBottom:14 }}>Műveletek</h4>
          {[{icon:Pencil,label:"Szerkesztés"},{icon:FileText,label:"PDF export"},{icon:Eye,label:"Előnézet"},{icon:Trash2,label:"Törlés",danger:true}].map(a=>(
            <button key={a.label} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:9, border:"none", background:"transparent", color:a.danger?C.danger:C.textSub, cursor:"pointer", fontSize:13, marginBottom:4, textAlign:"left", fontFamily:FONT }}>
              <a.icon size={15}/>{a.label}
            </button>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FŐ EXPORT – role alapján dönti el melyik nézet
// ═══════════════════════════════════════════════════════════════
export function MunkalapDetail({ m, data, userRole }) {
  if (userRole === "Telepítő") {
    return <MunkalapDetailTelepito m={m} data={data} />;
  }
  return <MunkalapDetailDesktop m={m} data={data} userRole={userRole} />;
}
