import { useState, useMemo, useEffect } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock, Wrench, Building2, FileText, Users, BarChart3 } from "lucide-react";
import { C, FONT, FONT_HEADING, STATUS_CFG } from "../lib/constants";
import { ft } from "../lib/helpers";
import { loadKarteritesek, addKarterites, updateKarterites } from "../lib/karterites";
import { canSeePrice } from "../lib/roles";
import { loadLocal } from "../lib/localDb";
import { calcEsmentProjektPenzugy } from "../services/workOrderFinancial.service.js";
import { calcDashboardPenzugyiKpik } from "../modules/penzugy/penzugyi.service.js";

function StatCard({ label, value, sub, color, bg, icon: Icon }) {
  return (
    <div style={{ background: bg || C.card, borderRadius: 14, padding: "18px 20px", border: `1px solid ${color}30`, flex: 1, minWidth: 140 }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        {Icon && <Icon size={18} color={color} />}
        <p style={{ fontSize:11, fontWeight:700, color: color, textTransform:"uppercase", letterSpacing:.7, margin:0 }}>{label}</p>
      </div>
      <p style={{ fontSize:24, fontWeight:800, color: C.text, margin:0 }}>{value}</p>
      {sub && <p style={{ fontSize:11, color: C.muted, margin:"4px 0 0" }}>{sub}</p>}
    </div>
  );
}

function StatusBadge({ s }) {
  const cfg = STATUS_CFG[s] || { bg:C.bg, text:C.muted, dot:C.muted };
  return (
    <span style={{ background:cfg.bg, color:cfg.text, borderRadius:20, padding:"3px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
      {s}
    </span>
  );
}

function KarteritesekSzekció({ karteritesek, isAdmin, user, onRefresh }) {
  const [ujKart, setUjKart] = useState(false);

  function handleElfogad(id) {
    updateKarterites(id, { elfogadott: true });
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "karteritesek" } }));
  }
  function handleElutasit(id) {
    updateKarterites(id, { elfogadott: false });
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "karteritesek" } }));
  }
  function handleUjHozzaadas() {
    const get = k => document.getElementById(`nkf_${k}`)?.value || "";
    if (!get("munkalapId") || !get("osszeg") || !get("ok")) return;
    addKarterites({
      munkalapId: get("munkalapId"),
      osszeg: Number(get("osszeg")),
      ok: get("ok"),
      datum: get("datum"),
      megjegyzes: get("megjegyzes"),
      rogzitoSzemely: user?.name || "Admin",
    });
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "karteritesek" } }));
    setUjKart(false);
  }

  const sorted = [...karteritesek].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  return (
    <div style={{ background: C.card, borderRadius:14, border:`1px solid ${C.border}`, marginTop:20, overflow:"hidden" }}>
      <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, background: C.bg, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <p style={{ fontFamily:FONT_HEADING, fontSize:16, fontWeight:800, color: C.text, margin:0 }}>⚠️ Kártérítések</p>
          <p style={{ fontSize:12, color: C.muted, margin:"2px 0 0" }}>
            Elfogadott kártérítések automatikusan csökkentik a projekt eredményét
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setUjKart(true)}
            style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background: C.danger, color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:FONT }}>
            + Új kártérítés
          </button>
        )}
      </div>

      <div style={{ display:"flex", gap:14, padding:"14px 20px", borderBottom:`1px solid ${C.border}`, flexWrap:"wrap" }}>
        {[
          { label:"Elfogadott összeg", value: ft(karteritesek.filter(k=>k.elfogadott===true).reduce((s,k)=>s+k.osszeg,0)),  color: C.danger,   bg: C.dangerLight  },
          { label:"Függőben lévő",     value: ft(karteritesek.filter(k=>k.elfogadott===null).reduce((s,k)=>s+k.osszeg,0)),  color: C.warning,  bg: C.warningLight },
          { label:"Összes tétel",      value: karteritesek.length + " db",                                                   color: C.muted,    bg: C.bg           },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:10, padding:"10px 14px", border:`1px solid ${s.color}30`, minWidth:140 }}>
            <p style={{ fontSize:10, fontWeight:700, color:s.color, margin:"0 0 3px", textTransform:"uppercase", letterSpacing:.7 }}>{s.label}</p>
            <p style={{ fontSize:18, fontWeight:800, color:s.color, margin:0 }}>{s.value}</p>
          </div>
        ))}
      </div>

      {karteritesek.length === 0 ? (
        <p style={{ padding:"32px", textAlign:"center", color: C.muted, fontSize:13 }}>Nincsenek kártérítési tételek</p>
      ) : (
        <div style={{ padding:"12px 20px", display:"flex", flexDirection:"column", gap:8 }}>
          {sorted.slice(0, 10).map(k => (
            <div key={k.id} style={{
              display:"flex", alignItems:"center", gap:14, padding:"10px 14px",
              background: k.elfogadott===true ? C.dangerLight : k.elfogadott===false ? C.bg : C.warningLight,
              borderRadius:10, border:`1px solid ${k.elfogadott===true ? C.danger : k.elfogadott===false ? C.border : C.warning}`,
            }}>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700, fontSize:13, margin:0, color: C.text }}>{k.ok}</p>
                <p style={{ fontSize:11, color: C.muted, margin:"2px 0 0" }}>{k.munkalapId} · {k.datum} · {k.rogzitoSzemely}</p>
              </div>
              <p style={{ fontWeight:800, fontSize:14, color: C.danger, margin:0, flexShrink:0 }}>{ft(k.osszeg)}</p>
              <span style={{
                fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, flexShrink:0,
                background: k.elfogadott===true ? C.dangerLight : k.elfogadott===false ? C.bg : C.warningLight,
                color:      k.elfogadott===true ? C.danger : k.elfogadott===false ? C.muted : C.warning,
              }}>
                {k.elfogadott===true?"✓ Elfogadott":k.elfogadott===false?"✗ Elutasított":"⏳ Függőben"}
              </span>
              {isAdmin && (
                <div style={{ display:"flex", gap:4, flexShrink:0 }}>
                  {k.elfogadott!==true  && <button onClick={()=>handleElfogad(k.id)}  style={{padding:"3px 8px",background:C.successLight,color:C.success,border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:FONT}}>Elfogad</button>}
                  {k.elfogadott!==false && <button onClick={()=>handleElutasit(k.id)} style={{padding:"3px 8px",background:C.dangerLight,color:C.danger,border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontFamily:FONT}}>Elutasít</button>}
                </div>
              )}
            </div>
          ))}
          {karteritesek.length > 10 && (
            <p style={{ textAlign:"center", fontSize:12, color: C.muted }}>+ {karteritesek.length - 10} további tétel</p>
          )}
        </div>
      )}

      {ujKart && (
        <div style={{ position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:440, padding:"24px", fontFamily:FONT }}>
            <h3 style={{ fontFamily:FONT_HEADING, fontSize:17, fontWeight:800, margin:"0 0 18px", color: C.text }}>Új kártérítési tétel</h3>
            <div style={{ display:"flex", flexDirection:"column", gap:11 }}>
              {[
                { label:"Munkalap azonosító *", key:"munkalapId", ph:"pl. T003700" },
                { label:"Összeg (Ft) *",        key:"osszeg",     ph:"pl. 50000", type:"number" },
                { label:"Kártérítés oka *",     key:"ok",         ph:"pl. sérült panel" },
                { label:"Dátum",                key:"datum",      type:"date" },
                { label:"Megjegyzés",           key:"megjegyzes", ph:"Részletek…" },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize:11, fontWeight:700, color: C.muted, display:"block", marginBottom:3 }}>{f.label}</label>
                  <input type={f.type||"text"} id={`nkf_${f.key}`} placeholder={f.ph}
                    defaultValue={f.type==="date" ? new Date().toISOString().slice(0,10) : ""}
                    style={{ width:"100%", boxSizing:"border-box", padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:FONT, outline:"none" }}/>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:10, marginTop:18 }}>
              <button onClick={()=>setUjKart(false)} style={{ flex:1, padding:"10px", border:`1.5px solid ${C.border}`, borderRadius:9, background:"#fff", cursor:"pointer", fontFamily:FONT, color: C.text }}>Mégse</button>
              <button onClick={handleUjHozzaadas}    style={{ flex:2, padding:"10px", background: C.danger, color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:700, fontFamily:FONT }}>Hozzáadás</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard({ user }) {
  const [sortField, setSortField]       = useState("date");
  const [sortDir, setSortDir]           = useState("desc");
  const [filterStatus, setFilterStatus] = useState("Összes");
  const [munkalapok, setMunkalapok]     = useState(() => loadLocal("munkalapok")   || []);
  const [projektek, setProjektek]       = useState(() => loadLocal("projektek")    || []);
  const [ajanlatok, setAjanlatok]       = useState(() => loadLocal("ajanla tok")   || []);
  const [karteritesek, setKarteritesek] = useState(() => loadKarteritesek());

  const isAdmin = canSeePrice(user?.role);

  useEffect(() => {
    function refresh() {
      setMunkalapok(loadLocal("munkalapok")  || []);
      setProjektek(loadLocal("projektek")    || []);
      setAjanlatok(loadLocal("ajanla tok")   || []);
      setKarteritesek(loadKarteritesek());
    }
    window.addEventListener("crm-db-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("crm-db-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const stats = useMemo(() => {
    const aktiv      = munkalapok.filter(m => !["Lezárva","Számlázva","Meghiúsult","Befejezett"].includes(m.status)).length;
    const ellenorzes = munkalapok.filter(m => m.status === "Ellenőrzés alatt").length;
    const lezarva    = munkalapok.filter(m => m.status === "Lezárva").length;
    const felmeres   = munkalapok.filter(m => m.status === "Felmérés" || m.status === "Befejezett Felmérés").length;
    const osszesBev  = munkalapok.reduce((s,m) => {
      const itemsBrutto = (m.items||[]).reduce((x,i) => x + (i.qty||i.mennyiseg||1)*(i.net||i.ar||0)*(1+(i.vat||27)/100), 0);
      return s + (m.ar || itemsBrutto || 0);
    }, 0);
    const osszesCost = munkalapok.reduce((s,m) => s +
      (m.items||[]).reduce((x,i) => x + (i.net||i.ar||0)*(i.qty||i.mennyiseg||1), 0) +
      (m.munkaeroDij||0) + (m.kiszallasiDij||0) + (m.egyebKolts||0), 0);
    const elfKart    = karteritesek.filter(k=>k.elfogadott===true).reduce((s,k)=>s+k.osszeg,0);
    return { aktiv, ellenorzes, lezarva, felmeres, osszesBev, osszesCost, elfKartEritesek: elfKart, eredmeny: osszesBev - osszesCost - elfKart };
  }, [munkalapok, karteritesek]);

  const tableData = useMemo(() => {
    return munkalapok
      .map(m => {
        const itemsBrutto = (m.items||[]).reduce((s,i) => s + (i.qty||i.mennyiseg||1)*(i.net||i.ar||0)*(1+(i.vat||27)/100), 0);
        const bevetal     = m.ar || itemsBrutto || 0;
        const anyagKolts  = (m.items||[]).reduce((s,i) => s + (i.net||i.ar||0)*(i.qty||i.mennyiseg||1), 0);
        const kartElf     = karteritesek.filter(k=>k.munkalapId===m.id&&k.elfogadott===true).reduce((s,k)=>s+k.osszeg,0);
        const osszesKolts = anyagKolts + (m.munkaeroDij||0) + (m.kiszallasiDij||0) + kartElf + (m.egyebKolts||0);
        const eredmeny    = bevetal - osszesKolts;
        return { ...m, bevetal, osszesKolts, kartEritesElf: kartElf, eredmeny, haszonPct: bevetal > 0 ? Math.round((eredmeny/bevetal)*100) : null, nyereseg: eredmeny >= 0 };
      })
      .filter(m => filterStatus === "Összes" || m.status === filterStatus)
      .sort((a,b) => {
        let va = a[sortField], vb = b[sortField];
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        return sortDir === "asc" ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
      });
  }, [munkalapok, karteritesek, sortField, sortDir, filterStatus]);

  const projektBilling = useMemo(() => {
    const konfiguralt = projektek.filter(p => p.penzugy?.fovallalkoziId);
    if (konfiguralt.length === 0) return null;
    const rows = konfiguralt.map(p => {
      const kalk = calcEsmentProjektPenzugy(p);
      return {
        id:              p.id,
        projektkod:      p.projektkod || p.id,
        nev:             p.nev || p.clientNev || p.projektkod || "",
        fovNev:          kalk.fovallalkoNev || "—",
        nettoBevitel:    kalk.nettoBevitel,
        csapatBer:       kalk.csapatBer,
        alvallalkozoiBer:kalk.alvallalkozoiBer,
        alvallalkozoiKmBer: kalk.alvallalkozoiKmBer,
        utikoltség:      kalk.utikoltség,
        anyagkoltség:    kalk.anyagkoltség,
        osszesKolts:     kalk.osszesKolts,
        haszon:          kalk.haszon,
        haszonPct:       kalk.haszonPct,
        nyereseg:        kalk.nyereseg,
        hianyos:         kalk.hianyosTetelek?.length > 0,
      };
    });
    return {
      rows,
      totalBev:    rows.reduce((s, r) => s + r.nettoBevitel, 0),
      totalKolts:  rows.reduce((s, r) => s + r.osszesKolts, 0),
      totalHaszon: rows.reduce((s, r) => s + r.haszon, 0),
    };
  }, [projektek]);

  const ajanlatStats = useMemo(() => {
    const toSum = arr => arr.reduce((s, a) => s + (Number(a.osszeg) || 0), 0);
    const kikuld   = ajanlatok.filter(a => a.status === "Kiküldve");
    const elfogad  = ajanlatok.filter(a => a.status === "Elfogadva");
    const elutasit = ajanlatok.filter(a => a.status === "Elutasítva");
    return {
      kikuld:  { db: kikuld.length,   osszeg: toSum(kikuld)   },
      elfogad: { db: elfogad.length,  osszeg: toSum(elfogad)  },
      elutasit:{ db: elutasit.length, osszeg: toSum(elutasit) },
    };
  }, [ajanlatok]);

  const projektStats = useMemo(() => {
    const sajat      = projektek.filter(p => p.forrás === "sajat_ajanlat" || p.forrás === "saját_ügyfél");
    const fov        = projektek.filter(p => p.forrás === "fovallalkozoi_munka" || p.forrás === "fővállalkozói");
    const kivitelezés= projektek.filter(p => p.status === "Kivitelezés alatt");
    const szamlazva  = projektek.filter(p => p.status === "Számlázható" || p.status === "Leszámlázva");
    return { sajat: sajat.length, fov: fov.length, kivitelezés: kivitelezés.length, leszamlazva: szamlazva.length };
  }, [projektek]);

  const penzugyiKpik = useMemo(() => {
    try { return calcDashboardPenzugyiKpik(projektek); }
    catch { return null; }
  }, [projektek]);

  function toggleSort(f) {
    if (sortField === f) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(f); setSortDir("desc"); }
  }

  const STATUS_FILTERS = ["Összes","Felmérés","Befejezett Felmérés","Folyamatban","Ellenőrzés alatt","Lezárva","Számlázva","Meghiúsult"];

  return (
    <div style={{ padding:"24px 28px", fontFamily:FONT, background: C.bg, minHeight:"100vh" }}>
      <h1 style={{ fontFamily:FONT_HEADING, fontSize:24, fontWeight:800, color: C.text, margin:"0 0 20px" }}>
        💰 Pénzügy
      </h1>

      {/* Stat kártyák */}
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:24 }}>
        <StatCard label="Aktív munkák"     value={stats.aktiv}      color={C.success}  bg={C.successLight}  icon={Wrench}/>
        <StatCard label="Ellenőrzésre vár" value={stats.ellenorzes} color={C.warning}  bg={C.warningLight}  icon={AlertTriangle}/>
        <StatCard label="Lezárva"          value={stats.lezarva}    color={C.success}  bg={C.successLight}  icon={CheckCircle2}/>
        <StatCard label="Felmérés fázis"   value={stats.felmeres}   color={C.accent}   bg={C.accentLight}   icon={Clock}/>
        {isAdmin && <>
          <StatCard label="Összes bevétel" value={ft(stats.osszesBev)}         color={C.success}  bg={C.successLight}  icon={TrendingUp}/>
          <StatCard label="Kártérítések"   value={ft(stats.elfKartEritesek)}   color={C.danger}   bg={C.dangerLight}   icon={TrendingDown}/>
          <StatCard
            label="Eredmény"
            value={ft(stats.eredmeny)}
            color={stats.eredmeny >= 0 ? C.success : C.danger}
            bg={stats.eredmeny >= 0 ? C.successLight : C.dangerLight}
            icon={stats.eredmeny >= 0 ? TrendingUp : TrendingDown}
            sub={stats.osszesBev > 0 ? `${Math.round((stats.eredmeny/stats.osszesBev)*100)}% haszon` : undefined}
          />
        </>}
      </div>

      {/* Értékesítés – Árajánlatok */}
      {isAdmin && (
        <div style={{ background: C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:"16px 20px", marginBottom:20 }}>
          <p style={{ fontFamily:FONT_HEADING, fontSize:15, fontWeight:800, color: C.text, margin:"0 0 14px", display:"flex", alignItems:"center", gap:8 }}>
            <FileText size={17} color={C.accent} /> Értékesítés – Árajánlatok
          </p>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <div style={{ background: C.warningLight, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.warning}40`, flex:1, minWidth:130 }}>
              <p style={{ fontSize:10, fontWeight:700, color: C.warning, textTransform:"uppercase", letterSpacing:.7, margin:"0 0 3px" }}>Kiküldve</p>
              <p style={{ fontSize:20, fontWeight:800, color: C.text, margin:"0 0 2px" }}>{ajanlatStats.kikuld.db} db</p>
              {ajanlatStats.kikuld.osszeg > 0 && <p style={{ fontSize:11, color: C.muted, margin:0 }}>{ft(ajanlatStats.kikuld.osszeg)}</p>}
            </div>
            <div style={{ background: C.successLight, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.success}40`, flex:1, minWidth:130 }}>
              <p style={{ fontSize:10, fontWeight:700, color: C.success, textTransform:"uppercase", letterSpacing:.7, margin:"0 0 3px" }}>Elfogadva</p>
              <p style={{ fontSize:20, fontWeight:800, color: C.text, margin:"0 0 2px" }}>{ajanlatStats.elfogad.db} db</p>
              {ajanlatStats.elfogad.osszeg > 0 && <p style={{ fontSize:11, color: C.muted, margin:0 }}>{ft(ajanlatStats.elfogad.osszeg)}</p>}
            </div>
            <div style={{ background: C.dangerLight, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.danger}40`, flex:1, minWidth:130 }}>
              <p style={{ fontSize:10, fontWeight:700, color: C.danger, textTransform:"uppercase", letterSpacing:.7, margin:"0 0 3px" }}>Elutasítva</p>
              <p style={{ fontSize:20, fontWeight:800, color: C.text, margin:"0 0 2px" }}>{ajanlatStats.elutasit.db} db</p>
              {ajanlatStats.elutasit.osszeg > 0 && <p style={{ fontSize:11, color: C.muted, margin:0 }}>{ft(ajanlatStats.elutasit.osszeg)}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Projektek áttekintése */}
      {isAdmin && (
        <div style={{ background: C.card, borderRadius:14, border:`1px solid ${C.border}`, padding:"16px 20px", marginBottom:20 }}>
          <p style={{ fontFamily:FONT_HEADING, fontSize:15, fontWeight:800, color: C.text, margin:"0 0 14px", display:"flex", alignItems:"center", gap:8 }}>
            <Building2 size={17} color={C.accent} /> Projektek áttekintése
          </p>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <div style={{ background: C.accentLight, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.accent}30`, flex:1, minWidth:130 }}>
              <p style={{ fontSize:10, fontWeight:700, color: C.accent, textTransform:"uppercase", letterSpacing:.7, margin:"0 0 3px" }}>Saját projektek</p>
              <p style={{ fontSize:20, fontWeight:800, color: C.text, margin:0 }}>{projektStats.sajat}</p>
            </div>
            <div style={{ background: C.successLight, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.success}30`, flex:1, minWidth:130 }}>
              <p style={{ fontSize:10, fontWeight:700, color: C.success, textTransform:"uppercase", letterSpacing:.7, margin:"0 0 3px" }}>Fővállalkozói</p>
              <p style={{ fontSize:20, fontWeight:800, color: C.text, margin:0 }}>{projektStats.fov}</p>
            </div>
            <div style={{ background: C.accentLight, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.accent}30`, flex:1, minWidth:130 }}>
              <p style={{ fontSize:10, fontWeight:700, color: C.accent, textTransform:"uppercase", letterSpacing:.7, margin:"0 0 3px" }}>Kivitelezés alatt</p>
              <p style={{ fontSize:20, fontWeight:800, color: C.text, margin:0 }}>{projektStats.kivitelezés}</p>
            </div>
            <div style={{ background: C.successLight, borderRadius:10, padding:"12px 16px", border:`1px solid ${C.success}30`, flex:1, minWidth:130 }}>
              <p style={{ fontSize:10, fontWeight:700, color: C.success, textTransform:"uppercase", letterSpacing:.7, margin:"0 0 3px" }}>Leszámlázva (nem fizetve)</p>
              <p style={{ fontSize:20, fontWeight:800, color: C.text, margin:0 }}>{projektStats.leszamlazva}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Projekt pénzügyi KPI-k ── */}
      {isAdmin && penzugyiKpik && (
        <div style={{ background:"#fff", borderRadius:14, border:"1px solid #E2E8F0", padding:"16px 20px", marginBottom:20 }}>
          <p style={{ fontFamily:FONT_HEADING, fontSize:15, fontWeight:800, color:"#0F172A", margin:"0 0 14px", display:"flex", alignItems:"center", gap:8 }}>
            <BarChart3 size={17} color="#059669" /> Projekt pénzügyi összesítő
          </p>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            {/* Készre jelentett, elszámolás nélkül */}
            {penzugyiKpik.keszreJelentettElszamolasNelkul > 0 && (
              <div style={{ background:"#FEF2F2", borderRadius:10, padding:"12px 16px", border:"1px solid #FECACA40", flex:1, minWidth:140 }}>
                <p style={{ fontSize:10, fontWeight:700, color:"#DC2626", textTransform:"uppercase", letterSpacing:.7, margin:"0 0 3px" }}>⚠ Elszámolás hiányzik</p>
                <p style={{ fontSize:20, fontWeight:800, color:"#0F172A", margin:"0 0 2px" }}>{penzugyiKpik.keszreJelentettElszamolasNelkul} projekt</p>
                <p style={{ fontSize:11, color:"#64748B", margin:0 }}>Készre jelentve, de nincs pénzügyi rekord</p>
              </div>
            )}
            {/* Számlázható */}
            <div style={{ background:"#FFFBEB", borderRadius:10, padding:"12px 16px", border:"1px solid #FCD34D40", flex:1, minWidth:140 }}>
              <p style={{ fontSize:10, fontWeight:700, color:"#D97706", textTransform:"uppercase", letterSpacing:.7, margin:"0 0 3px" }}>Számlázható</p>
              <p style={{ fontSize:20, fontWeight:800, color:"#0F172A", margin:"0 0 2px" }}>{penzugyiKpik.szamlazhatoProjektek.length} projekt</p>
              <p style={{ fontSize:11, color:"#64748B", margin:0 }}>Kész, számlára vár</p>
            </div>
            {/* Számlázva, nem fizetve */}
            <div style={{ background:"#EFF6FF", borderRadius:10, padding:"12px 16px", border:"1px solid #BFDBFE40", flex:1, minWidth:140 }}>
              <p style={{ fontSize:10, fontWeight:700, color:"#2563EB", textTransform:"uppercase", letterSpacing:.7, margin:"0 0 3px" }}>Számlázva – várja a kifizetést</p>
              <p style={{ fontSize:20, fontWeight:800, color:"#0F172A", margin:"0 0 2px" }}>{penzugyiKpik.szamlazvaKifizetesre.length} projekt</p>
              <p style={{ fontSize:11, color:"#64748B", margin:0 }}>Kiküldött számla, nem érkezett be</p>
            </div>
            {/* FV várható bevétel */}
            {penzugyiKpik.fovVarhatoBevetel > 0 && (
              <div style={{ background:"#F5F3FF", borderRadius:10, padding:"12px 16px", border:"1px solid #C4B5FD40", flex:1, minWidth:140 }}>
                <p style={{ fontSize:10, fontWeight:700, color:"#7C3AED", textTransform:"uppercase", letterSpacing:.7, margin:"0 0 3px" }}>FV várható bevétel</p>
                <p style={{ fontSize:18, fontWeight:800, color:"#0F172A", margin:"0 0 2px" }}>{ft(penzugyiKpik.fovVarhatoBevetel)}</p>
                <p style={{ fontSize:11, color:"#64748B", margin:0 }}>Aktív fővállalkozói projektek</p>
              </div>
            )}
            {/* Saját projektek profitja */}
            {penzugyiKpik.sajatVarhatoProfit !== 0 && (
              <div style={{ background: penzugyiKpik.sajatVarhatoProfit >= 0 ? "#ECFDF5" : "#FEF2F2", borderRadius:10, padding:"12px 16px", border:"1px solid #86EFAC40", flex:1, minWidth:140 }}>
                <p style={{ fontSize:10, fontWeight:700, color: penzugyiKpik.sajatVarhatoProfit >= 0 ? "#059669" : "#DC2626", textTransform:"uppercase", letterSpacing:.7, margin:"0 0 3px" }}>Saját projektek profitja</p>
                <p style={{ fontSize:18, fontWeight:800, color:"#0F172A", margin:"0 0 2px" }}>{ft(penzugyiKpik.sajatVarhatoProfit)}</p>
                <p style={{ fontSize:11, color:"#64748B", margin:0 }}>Aktív saját ajánlat projektek</p>
              </div>
            )}
            {/* Belső munkák költsége */}
            {penzugyiKpik.belsoMunkaKoltseg > 0 && (
              <div style={{ background:"#F0FDF4", borderRadius:10, padding:"12px 16px", border:"1px solid #86EFAC40", flex:1, minWidth:140 }}>
                <p style={{ fontSize:10, fontWeight:700, color:"#166534", textTransform:"uppercase", letterSpacing:.7, margin:"0 0 3px" }}>Belső munkák költsége</p>
                <p style={{ fontSize:18, fontWeight:800, color:"#0F172A", margin:"0 0 2px" }}>{ft(penzugyiKpik.belsoMunkaKoltseg)}</p>
                <p style={{ fontSize:11, color:"#64748B", margin:0 }}>Garancia, javítás, karbantartás</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Szűrők */}
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
        {STATUS_FILTERS.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            style={{ padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:FONT,
              background: filterStatus===s ? C.accent : C.card,
              color:      filterStatus===s ? "#fff" : C.muted,
              border:    `1.5px solid ${filterStatus===s ? C.accent : C.border}`,
            }}>
            {s}
          </button>
        ))}
      </div>

      {/* Összesítő táblázat */}
      <div style={{ background: C.card, borderRadius:14, border:`1px solid ${C.border}`, overflow:"hidden" }}>
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom:`2px solid ${C.border}` }}>
                {[
                  {k:"id",           l:"Azonosító / EDI"},
                  {k:"clientNev",    l:"Ügyfél"},
                  {k:"status",       l:"Státusz"},
                  {k:"munkalapTipus",l:"Típus"},
                  {k:"assigneeNev",  l:"Csapat"},
                  {k:"date",         l:"Dátum"},
                  ...(isAdmin ? [
                    {k:"bevetal",      l:"Bevétel"},
                    {k:"osszesKolts",  l:"Költ."},
                    {k:"kartEritesElf",l:"Kártér."},
                    {k:"eredmeny",     l:"Eredmény"},
                    {k:"haszonPct",    l:"Haszon%"},
                  ] : []),
                ].map(col => (
                  <th key={col.k} onClick={() => toggleSort(col.k)}
                    style={{ padding:"11px 14px", textAlign:"left", fontSize:11, fontWeight:700, color: C.muted, textTransform:"uppercase", letterSpacing:.7, cursor:"pointer", whiteSpace:"nowrap", userSelect:"none" }}>
                    {col.l} {sortField===col.k ? (sortDir==="asc"?"↑":"↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableData.length === 0 && (
                <tr><td colSpan={20} style={{ padding:"40px", textAlign:"center", color: C.muted }}>Nincsenek munkalapok</td></tr>
              )}
              {tableData.map((m, i) => (
                <tr key={m.id} style={{ borderBottom:`1px solid ${C.bg}`, background: i%2===0 ? "#fff" : C.bg,
                  ...(isAdmin && m.bevetal > 0 ? { borderLeft:`3px solid ${m.nyereseg ? C.success : C.danger}` } : {}),
                }}>
                  <td style={{ padding:"12px 14px" }}>
                    <p style={{ fontWeight:700, color: C.accent, margin:0, fontSize:13 }}>{m.dokumentumszam || m.ediSorszam || m.id}</p>
                    {m.dokumentumszam && <p style={{ fontSize:10, color: C.muted, margin:0 }}>{m.id}</p>}
                  </td>
                  <td style={{ padding:"12px 14px", color: C.text, fontWeight:500 }}>{m.clientNev || "—"}</td>
                  <td style={{ padding:"12px 14px" }}><StatusBadge s={m.status||"Ütemezett"}/></td>
                  <td style={{ padding:"12px 14px", color: C.muted, fontSize:12 }}>{m.munkalapTipus || "—"}</td>
                  <td style={{ padding:"12px 14px", color: C.muted }}>{m.assigneeNev || "—"}</td>
                  <td style={{ padding:"12px 14px", color: C.muted }}>{m.date || "—"}</td>
                  {isAdmin && <>
                    <td style={{ padding:"12px 14px", fontWeight:600, color: C.success }}>{m.bevetal > 0 ? ft(m.bevetal) : "—"}</td>
                    <td style={{ padding:"12px 14px", color: C.danger }}>{m.osszesKolts > 0 ? ft(m.osszesKolts) : "—"}</td>
                    <td style={{ padding:"12px 14px", color: m.kartEritesElf>0 ? C.danger : C.muted, fontSize:12 }}>{m.kartEritesElf > 0 ? ft(m.kartEritesElf) : "—"}</td>
                    <td style={{ padding:"12px 14px", fontWeight:700, color: m.bevetal > 0 ? (m.nyereseg ? C.success : C.danger) : C.muted }}>
                      {m.bevetal > 0 ? ft(m.eredmeny) : "—"}
                    </td>
                    <td style={{ padding:"12px 14px" }}>
                      {m.haszonPct !== null && m.bevetal > 0 ? (
                        <span style={{ background: m.nyereseg ? C.successLight : C.dangerLight, color: m.nyereseg ? C.success : C.danger, padding:"3px 8px", borderRadius:6, fontWeight:700, fontSize:12 }}>
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
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.border}`, background: C.bg, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <p style={{ fontSize:12, color: C.muted, margin:0 }}>{tableData.length} munkalap · Zöld = nyereséges, piros = veszteséges</p>
          {isAdmin && tableData.length > 0 && (
            <p style={{ fontSize:12, color: C.muted, margin:0 }}>
              Összes bevétel: <strong style={{color: C.success}}>{ft(tableData.reduce((s,m)=>s+m.bevetal,0))}</strong> ·
              Eredmény: <strong style={{color: tableData.reduce((s,m)=>s+m.eredmeny,0)>=0 ? C.success : C.danger}}>{ft(tableData.reduce((s,m)=>s+m.eredmeny,0))}</strong>
            </p>
          )}
        </div>
      </div>

      {/* Projekt szintű fővállalkozói elszámolás */}
      {isAdmin && projektBilling && (
        <div style={{ background: C.card, borderRadius:14, border:`1px solid ${C.border}`, overflow:"hidden", marginTop:20 }}>
          <div style={{ padding:"14px 20px", borderBottom:`1px solid ${C.border}`, background: C.bg }}>
            <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <Building2 size={20} color={C.accent} />
                <div>
                  <p style={{ fontFamily:FONT_HEADING, fontSize:16, fontWeight:800, color: C.text, margin:0 }}>Projekt szintű fővállalkozói elszámolás</p>
                  <p style={{ fontSize:12, color: C.muted, margin:"2px 0 0" }}>Automatikus kalkuláció – fővállalkozói elszámolási szabályok alapján</p>
                </div>
              </div>
              <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                <div style={{ background: C.successLight, borderRadius:9, padding:"8px 14px", border:`1px solid ${C.success}40` }}>
                  <p style={{ fontSize:10, fontWeight:700, color: C.success, margin:"0 0 1px", textTransform:"uppercase", letterSpacing:.5 }}>Kalkulált bevétel</p>
                  <p style={{ fontSize:16, fontWeight:800, color: C.success, margin:0 }}>{ft(projektBilling.totalBev)}</p>
                </div>
                <div style={{ background: C.dangerLight, borderRadius:9, padding:"8px 14px", border:`1px solid ${C.danger}40` }}>
                  <p style={{ fontSize:10, fontWeight:700, color: C.danger, margin:"0 0 1px", textTransform:"uppercase", letterSpacing:.5 }}>Összes költség</p>
                  <p style={{ fontSize:16, fontWeight:800, color: C.danger, margin:0 }}>{ft(projektBilling.totalKolts)}</p>
                </div>
                <div style={{ background: projektBilling.totalHaszon >= 0 ? C.successLight : C.dangerLight, borderRadius:9, padding:"8px 14px", border:`1px solid ${projektBilling.totalHaszon >= 0 ? C.success : C.danger}40` }}>
                  <p style={{ fontSize:10, fontWeight:700, color: projektBilling.totalHaszon >= 0 ? C.success : C.danger, margin:"0 0 1px", textTransform:"uppercase", letterSpacing:.5 }}>Várható haszon</p>
                  <p style={{ fontSize:16, fontWeight:800, color: projektBilling.totalHaszon >= 0 ? C.success : C.danger, margin:0 }}>
                    {ft(projektBilling.totalHaszon)}
                    {projektBilling.totalBev > 0 && <span style={{ fontSize:11, marginLeft:5 }}>({Math.round((projektBilling.totalHaszon / projektBilling.totalBev) * 100)}%)</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background: C.bg, borderBottom:`2px solid ${C.border}` }}>
                  {["Projektkód", "Ügyfél / Projekt", "Fővállalkozó", "Kalkulált bev.", "Csapat bér", "Alváll. díj", "Km / Egyéb", "Haszon", "Haszon%"].map(h => (
                    <th key={h} style={{ padding:"9px 14px", textAlign:"left", fontSize:11, fontWeight:700, color: C.muted, textTransform:"uppercase", letterSpacing:.6, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projektBilling.rows.map((row, i) => (
                  <tr key={row.id} style={{ borderBottom:`1px solid ${C.bg}`, background: i%2===0?"#fff":C.bg, borderLeft:`3px solid ${row.nyereseg ? C.success : C.danger}` }}>
                    <td style={{ padding:"10px 14px" }}>
                      <p style={{ fontWeight:800, color: C.accent, margin:0 }}>{row.projektkod}</p>
                      {row.hianyos && <span style={{ fontSize:9, background: C.dangerLight, color: C.danger, padding:"1px 5px", borderRadius:4, fontWeight:700 }}>hiányos konfig</span>}
                    </td>
                    <td style={{ padding:"10px 14px", color: C.textSub, fontSize:12 }}>{row.nev}</td>
                    <td style={{ padding:"10px 14px", color: C.textSub }}>{row.fovNev}</td>
                    <td style={{ padding:"10px 14px", fontWeight:700, color: C.success }}>{row.nettoBevitel > 0 ? ft(row.nettoBevitel) : <span style={{color:C.muted}}>—</span>}</td>
                    <td style={{ padding:"10px 14px", color: C.danger }}>{row.csapatBer > 0 ? ft(row.csapatBer) : <span style={{color:C.muted}}>—</span>}</td>
                    <td style={{ padding:"10px 14px", color: C.accent }}>{row.alvallalkozoiBer > 0 ? ft(row.alvallalkozoiBer) : <span style={{color:C.muted}}>—</span>}</td>
                    <td style={{ padding:"10px 14px", color: C.muted, fontSize:12 }}>
                      {(row.utikoltség + row.alvallalkozoiKmBer + row.anyagkoltség) > 0
                        ? ft(row.utikoltség + row.alvallalkozoiKmBer + row.anyagkoltség)
                        : <span style={{color:C.muted}}>—</span>}
                    </td>
                    <td style={{ padding:"10px 14px", fontWeight:800, color: row.nyereseg ? C.success : C.danger }}>{ft(row.haszon)}</td>
                    <td style={{ padding:"10px 14px" }}>
                      {row.haszonPct !== null ? (
                        <span style={{ background: row.nyereseg ? C.successLight : C.dangerLight, color: row.nyereseg ? C.success : C.danger, padding:"3px 9px", borderRadius:6, fontWeight:700, fontSize:12 }}>
                          {row.haszonPct}%
                        </span>
                      ) : <span style={{color:C.muted}}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ padding:"9px 18px", borderTop:`1px solid ${C.border}`, background: C.bg, fontSize:11, color: C.muted, margin:0 }}>
            {projektBilling.rows.length} fővállalkozói projekt · Zöld = nyereséges, piros = veszteséges
          </p>
        </div>
      )}

      {isAdmin && !projektBilling && (
        <div style={{ background: C.warningLight, border:`1.5px solid ${C.warning}60`, borderRadius:12, padding:"14px 20px", marginTop:20, display:"flex", gap:12, alignItems:"flex-start" }}>
          <AlertTriangle size={18} color={C.warning} style={{ flexShrink:0, marginTop:1 }} />
          <div>
            <p style={{ fontWeight:700, fontSize:13, color:C.warning, margin:"0 0 3px" }}>Fővállalkozói elszámolás nincs beállítva egyetlen projektnél sem</p>
            <p style={{ fontSize:12, color:C.warning, margin:0, lineHeight:1.6 }}>
              Projekt szintű kalkulált bevételhez: <strong>Beállítások → Munkatípusok</strong> (bevételi tételek, egységárak) →
              <strong> Beállítások → Fővállalkozók</strong> (elszámolási szabályok) →
              <strong> Projekt szerkesztése</strong> → Fővállalkozó + munkatípus kiválasztása.
            </p>
          </div>
        </div>
      )}

      <KarteritesekSzekció
        karteritesek={karteritesek}
        isAdmin={isAdmin}
        user={user}
      />
    </div>
  );
}
