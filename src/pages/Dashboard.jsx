import { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, FileText, Users, Wrench } from "lucide-react";
import { C, FONT, FONT_HEADING, STATUS_CFG } from "../lib/constants";
import { ft } from "../lib/helpers";
import { loadKarteritesek } from "../lib/karterites";
import { canSeePrice } from "../lib/roles";

function StatCard({ label, value, sub, color, bg, icon: Icon }) {
  return (
    <div style={{ background: bg || "#fff", borderRadius: 14, padding: "18px 20px", border: `1px solid ${color}30`, flex: 1, minWidth: 140 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        {Icon && <Icon size={18} color={color} />}
        <p style={{ fontSize:11, fontWeight:700, color: color, textTransform:"uppercase", letterSpacing:.7, margin:0 }}>{label}</p>
      </div>
      <p style={{ fontSize:24, fontWeight:800, color: "#0F172A", margin:0 }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:"#94A3B8", margin:"4px 0 0" }}>{sub}</p>}
    </div>
  );
}

function StatusBadge({ s }) {
  const cfg = STATUS_CFG[s] || { bg:"#F1F5F9", text:"#64748B", dot:"#94A3B8" };
  return (
    <span style={{ background:cfg.bg, color:cfg.text, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
      {s}
    </span>
  );
}

export default function Dashboard({ data, user }) {
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [filterStatus, setFilterStatus] = useState("Összes");

  const munkalapok = data.munkalapok || [];
  const karteritesek = useMemo(() => loadKarteritesek(), []);
  const isAdmin = canSeePrice(user?.role);

  // Statisztikák
  const stats = useMemo(() => {
    const aktiv     = munkalapok.filter(m => !["Lezárva","Számlázva","Meghiúsult","Befejezett"].includes(m.status)).length;
    const ellenorzes = munkalapok.filter(m => m.status === "Ellenőrzés alatt").length;
    const lezarva   = munkalapok.filter(m => m.status === "Lezárva").length;
    const szamlazva = munkalapok.filter(m => m.status === "Számlázva").length;
    const felmeres  = munkalapok.filter(m => m.status === "Felmérés" || m.status === "Befejezett Felmérés").length;

    // Pénzügyek
    const osszesBev  = munkalapok.reduce((s,m) => {
      const itemsBrutto = (m.items||[]).reduce((x,i) => x + (i.qty||i.mennyiseg||1)*(i.net||i.ar||0)*(1+(i.vat||27)/100), 0);
      return s + (m.ar || itemsBrutto || 0);
    }, 0);
    const osszesCost = munkalapok.reduce((s,m) => s + ((m.items||[]).reduce((x,i) => x + (i.net||i.ar||0)*(i.qty||i.mennyiseg||1), 0)) + (m.munkaeroDij||0) + (m.kiszallasiDij||0) + (m.egyebKolts||0), 0);
    const elfKartEritesek = karteritesek.filter(k=>k.elfogadott===true).reduce((s,k)=>s+k.osszeg,0);
    const eredmeny = osszesBev - osszesCost - elfKartEritesek;

    return { aktiv, ellenorzes, lezarva, szamlazva, felmeres, osszesBev, osszesCost, elfKartEritesek, eredmeny };
  }, [munkalapok, karteritesek]);

  // Táblázat adatok - minden munkalap pénzügyi összesítővel
  const tableData = useMemo(() => {
    return munkalapok.map(m => {
      const itemsBrutto = (m.items||[]).reduce((s,i) => s + (i.qty||i.mennyiseg||1)*(i.net||i.ar||0)*(1+(i.vat||27)/100), 0);
      const bevetal = m.ar || itemsBrutto || 0;
      const anyagKolts = (m.items||[]).reduce((s,i) => s + (i.net||i.ar||0)*(i.qty||i.mennyiseg||1), 0);
      const kartEritesElf = karteritesek.filter(k=>k.munkalapId===m.id&&k.elfogadott===true).reduce((s,k)=>s+k.osszeg,0);
      const osszesKolts = anyagKolts + (m.munkaeroDij||0) + (m.kiszallasiDij||0) + kartEritesElf + (m.egyebKolts||0);
      const eredmeny = bevetal - osszesKolts;
      const haszonPct = bevetal > 0 ? Math.round((eredmeny/bevetal)*100) : null;
      const nyereseg = eredmeny >= 0;
      return { ...m, bevetal, anyagKolts, osszesKolts, kartEritesElf, eredmeny, haszonPct, nyereseg };
    }).filter(m => filterStatus === "Összes" || m.status === filterStatus)
      .sort((a,b) => {
        let va = a[sortField], vb = b[sortField];
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });
  }, [munkalapok, karteritesek, sortField, sortDir, filterStatus]);

  function toggleSort(f) {
    if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("desc"); }
  }

  const STATUS_FILTERS = ["Összes","Felmérés","Befejezett Felmérés","Folyamatban","Ellenőrzés alatt","Lezárva","Számlázva","Meghiúsult"];

  return (
    <div style={{ padding:"24px 28px", fontFamily: FONT, background:"#F8FAFC", minHeight:"100vh" }}>
      <h1 style={{ fontFamily:FONT_HEADING, fontSize:24, fontWeight:800, color:"#0F172A", margin:"0 0 20px" }}>
        📊 Irányítópult
      </h1>

      {/* Stat kártyák */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:24 }}>
        <StatCard label="Aktív munkák"      value={stats.aktiv}      color="#2563EB" bg="#EFF6FF" icon={Wrench}/>
        <StatCard label="Ellenőrzésre vár"  value={stats.ellenorzes} color="#D97706" bg="#FFFBEB" icon={AlertTriangle}/>
        <StatCard label="Lezárva"           value={stats.lezarva}    color="#059669" bg="#ECFDF5" icon={CheckCircle2}/>
        <StatCard label="Felmérés fázis"    value={stats.felmeres}   color="#0EA5E9" bg="#F0F9FF" icon={Clock}/>
        {isAdmin && <>
          <StatCard label="Összes bevétel"  value={ft(stats.osszesBev)}  color="#059669" bg="#ECFDF5" icon={TrendingUp}/>
          <StatCard label="Kártérítések"    value={ft(stats.elfKartEritesek)} color="#DC2626" bg="#FEF2F2" icon={TrendingDown}/>
          <StatCard label="Eredmény"
            value={ft(stats.eredmeny)}
            color={stats.eredmeny >= 0 ? "#059669" : "#DC2626"}
            bg={stats.eredmeny >= 0 ? "#ECFDF5" : "#FEF2F2"}
            icon={stats.eredmeny >= 0 ? TrendingUp : TrendingDown}
            sub={stats.osszesBev > 0 ? `${Math.round((stats.eredmeny/stats.osszesBev)*100)}% haszon` : undefined}
          />
        </>}
      </div>

      {/* Szűrők */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:FONT,
              background: filterStatus===s ? "#2563EB" : "#fff",
              color: filterStatus===s ? "#fff" : "#64748B",
              border: `1.5px solid ${filterStatus===s ? "#2563EB" : "#E2E8F0"}`,
            }}>
            {s}
          </button>
        ))}
      </div>

      {/* Összesítő táblázat */}
      <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:"#F8FAFC", borderBottom:"2px solid #E2E8F0" }}>
                {[
                  {k:"id",         l:"Azonosító / EDI"},
                  {k:"clientNev",  l:"Ügyfél"},
                  {k:"status",     l:"Státusz"},
                  {k:"munkalapTipus",l:"Típus"},
                  {k:"assigneeNev",l:"Csapat"},
                  {k:"date",       l:"Dátum"},
                  ...(isAdmin ? [
                    {k:"bevetal",     l:"Bevétel"},
                    {k:"osszesKolts", l:"Költ."},
                    {k:"kartEritesElf",l:"Kártér."},
                    {k:"eredmeny",    l:"Eredmény"},
                    {k:"haszonPct",   l:"Haszon%"},
                  ] : []),
                ].map(col => (
                  <th key={col.k} onClick={() => toggleSort(col.k)}
                    style={{ padding:"11px 14px", textAlign:"left", fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:.7, cursor:"pointer", whiteSpace:"nowrap", userSelect:"none" }}>
                    {col.l} {sortField===col.k ? (sortDir==="asc"?"↑":"↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 && (
                <tr><td colSpan={20} style={{ padding:"40px", textAlign:"center", color:"#94A3B8" }}>Nincsenek munkalapok</td></tr>
              )}
              {tableData.map((m, i) => (
                <tr key={m.id} style={{ borderBottom:"1px solid #F1F5F9", background: i%2===0?"#fff":"#FAFAFA",
                  ...(isAdmin && m.bevetal > 0 ? { borderLeft:`3px solid ${m.nyereseg?"#22C55E":"#EF4444"}` } : {}),
                }}>
                  <td style={{ padding:"12px 14px" }}>
                    <p style={{ fontWeight:700, color:"#2563EB", margin:0, fontSize:13 }}>{m.dokumentumszam || m.ediSorszam || m.id}</p>
                    {m.dokumentumszam && <p style={{ fontSize:10, color:"#94A3B8", margin:0 }}>{m.id}</p>}
                  </td>
                  <td style={{ padding:"12px 14px", color:"#0F172A", fontWeight:500 }}>{m.clientNev || "—"}</td>
                  <td style={{ padding:"12px 14px" }}><StatusBadge s={m.status||"Ütemezett"}/></td>
                  <td style={{ padding:"12px 14px", color:"#64748B", fontSize:12 }}>{m.munkalapTipus || "—"}</td>
                  <td style={{ padding:"12px 14px", color:"#64748B" }}>{m.assigneeNev || "—"}</td>
                  <td style={{ padding:"12px 14px", color:"#64748B" }}>{m.date || "—"}</td>
                  {isAdmin && <>
                    <td style={{ padding:"12px 14px", fontWeight:600, color:"#059669" }}>{m.bevetal > 0 ? ft(m.bevetal) : "—"}</td>
                    <td style={{ padding:"12px 14px", color:"#DC2626" }}>{m.osszesKolts > 0 ? ft(m.osszesKolts) : "—"}</td>
                    <td style={{ padding:"12px 14px", color:m.kartEritesElf>0?"#DC2626":"#94A3B8", fontSize:12 }}>{m.kartEritesElf > 0 ? ft(m.kartEritesElf) : "—"}</td>
                    <td style={{ padding:"12px 14px", fontWeight:700, color: m.bevetal > 0 ? (m.nyereseg?"#059669":"#DC2626") : "#94A3B8" }}>
                      {m.bevetal > 0 ? ft(m.eredmeny) : "—"}
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      {m.haszonPct !== null && m.bevetal > 0 ? (
                        <span style={{ background:m.nyereseg?"#ECFDF5":"#FEF2F2", color:m.nyereseg?"#059669":"#DC2626", padding:"3px 8px", borderRadius:6, fontWeight:700, fontSize:12 }}>
                          {m.haszonPct}%
                        </span>
                      ) : "—"}
                    </td>
                  </>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding:"12px 16px", borderTop:"1px solid #E2E8F0", background:"#F8FAFC", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <p style={{ fontSize:12, color:"#64748B", margin:0 }}>{tableData.length} munkalap · Zöld sáv = nyereséges, piros = veszteséges</p>
          {isAdmin && tableData.length > 0 && (
            <p style={{ fontSize:12, color:"#64748B", margin:0 }}>
              Összes bevétel: <strong style={{color:"#059669"}}>{ft(tableData.reduce((s,m)=>s+m.bevetal,0))}</strong> ·
              Eredmény: <strong style={{color: tableData.reduce((s,m)=>s+m.eredmeny,0)>=0?"#059669":"#DC2626"}}>{ft(tableData.reduce((s,m)=>s+m.eredmeny,0))}</strong>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
