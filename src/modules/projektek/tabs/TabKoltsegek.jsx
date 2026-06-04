import { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, Pencil, Check, X, ChevronDown, ChevronRight } from "lucide-react";
import { C, FONT } from "../../../lib/constants.js";
import { ft } from "../../../lib/helpers.js";
import { loadKarteritesek } from "../../../lib/karterites.js";
import { calcEsmentProjektPenzugy, loadTetelek, felulirTetel, visszaallitTetel } from "../../../services/workOrderFinancial.service.js";
import { calcProjektOsszesites } from "../../../services/settlementCalculator.js";
import { loadFovallalkozok } from "../../fovallalkozok/fovallalkozo.service.js";
import { getCsapat } from "../../csapatok/csapat.service.js";
import { getMunkatipus } from "../../munkatipusok/munkatipus.service.js";

// ─── Stat kártya ─────────────────────────────────────────────
function StatCard({ label, value, color, sub, highlight }) {
  return (
    <div style={{ background: highlight ? `${color}10` : "#fff", border: `1px solid ${highlight ? color + "40" : C.border}`, borderRadius: 12, padding: "14px 16px" }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7, margin: "0 0 5px" }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 800, color, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: C.muted, margin: "3px 0 0" }}>{sub}</p>}
    </div>
  );
}

// ─── Bevételi tétel sor (szerkeszthető) ──────────────────────
function TetelSor({ tetel, projektId, onRefresh, currentUser }) {
  const [editMode, setEditMode] = useState(false);
  const [editVal, setEditVal]   = useState(tetel.hasznalandoNetto);

  function handleSave() {
    felulirTetel(projektId, tetel.tetelTipusId, editVal, currentUser?.name);
    setEditMode(false);
    onRefresh();
  }
  function handleVissza() {
    visszaallitTetel(projektId, tetel.tetelTipusId);
    setEditMode(false);
    onRefresh();
  }

  return (
    <tr style={{ borderBottom: "1px solid #F1F5F9" }}>
      <td style={{ padding: "9px 12px", fontSize: 12, fontWeight: 600, color: "#374151" }}>{tetel.megnevezes}</td>
      <td style={{ padding: "9px 12px" }}>
        {editMode ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="number" value={editVal} onChange={e => setEditVal(Number(e.target.value))}
              style={{ width: 100, padding: "4px 8px", border: "1.5px solid #2563EB", borderRadius: 6, fontSize: 13, fontFamily: FONT }} />
            <button onClick={handleSave}   style={{ padding: "4px 8px", background: "#059669", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}><Check size={13} /></button>
            <button onClick={() => setEditMode(false)} style={{ padding: "4px 8px", background: "#F1F5F9", border: "none", borderRadius: 6, cursor: "pointer" }}><X size={13} /></button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: tetel.felulirva ? 700 : 400, color: tetel.felulirva ? "#D97706" : "#059669" }}>
              {ft(tetel.hasznalandoNetto)}
            </span>
            {tetel.felulirva && <span style={{ fontSize: 10, background: "#FFFBEB", color: "#D97706", padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>⚠️ kézi</span>}
            {tetel.hiany && <span style={{ fontSize: 10, background: "#FEF2F2", color: "#DC2626", padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>hiányos</span>}
          </div>
        )}
      </td>
      <td style={{ padding: "9px 12px", fontSize: 11, color: C.muted }}>{tetel.felulirva ? `Auto lenne: ${ft(tetel.autoNetto)}` : tetel.megjegyzes}</td>
      <td style={{ padding: "9px 12px" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {!editMode && (
            <button onClick={() => { setEditVal(tetel.hasznalandoNetto); setEditMode(true); }} title="Felülír"
              style={{ padding: "3px 7px", background: "#EFF6FF", color: "#2563EB", border: "none", borderRadius: 6, cursor: "pointer" }}>
              <Pencil size={11} />
            </button>
          )}
          {tetel.felulirva && !editMode && (
            <button onClick={handleVissza} title="Auto visszaállítás"
              style={{ padding: "3px 7px", background: "#ECFDF5", color: "#059669", border: "none", borderRadius: 6, cursor: "pointer" }}>
              <RefreshCw size={11} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Kombinált részletező szekció ────────────────────────────
function KombiDetailSzekció({ kalk, penzugy, csapat }) {
  const [open, setOpen] = useState(true);

  const sorok = [
    // Bevétel oldal
    { csoport: "bevétel", label: "Nettó bevétel (fővállalkozói)", ertek: kalk.nettoBevitel, szin: "#059669", bold: true },
    // Fővállalkozói oldal – alvállalkozói bérek
    { csoport: "koltseg", label: "Csapat bér (szabály alapján)", ertek: kalk.csapatBer, szin: "#DC2626",
      reszlet: penzugy.keziCsapatBer != null ? "⚠️ kézi" : null },
    csapat?.elszamolasAktiv ? {
      csoport: "koltseg", label: `Alvállalkozói díj – ${csapat.nev}`, ertek: kalk.alvallalkozoiBer, szin: "#DC2626",
      reszlet: kalk.alvallalkozoiBerMj, badge: "Alvállalkozói",
    } : null,
    kalk.alvallalkozoiKmBer > 0 ? {
      csoport: "koltseg", label: "Alvállalkozói km-díj", ertek: kalk.alvallalkozoiKmBer, szin: "#DC2626",
    } : null,
    kalk.utikoltség > 0 ? {
      csoport: "koltseg", label: "Kiszállási / km-díj", ertek: kalk.utikoltség, szin: "#DC2626",
      reszlet: penzugy.keziUtikoltség != null ? "⚠️ kézi" : null,
    } : null,
    kalk.anyagkoltség > 0 ? {
      csoport: "koltseg", label: "Anyagköltség", ertek: kalk.anyagkoltség, szin: "#DC2626",
      reszlet: penzugy.keziAnyagkoltség != null ? "⚠️ kézi" : null,
    } : null,
    kalk.emelőgepKoltseg     > 0 ? { csoport: "koltseg", label: "Emelőgép",         ertek: kalk.emelőgepKoltseg,     szin: "#DC2626" } : null,
    kalk.daruKoltseg         > 0 ? { csoport: "koltseg", label: "Daru / Teheremelő", ertek: kalk.daruKoltseg,         szin: "#DC2626" } : null,
    kalk.szallasKoltseg      > 0 ? { csoport: "koltseg", label: "Szállás",            ertek: kalk.szallasKoltseg,      szin: "#DC2626" } : null,
    kalk.bereltEszkozKoltseg > 0 ? { csoport: "koltseg", label: "Bérelt eszközök",    ertek: kalk.bereltEszkozKoltseg, szin: "#DC2626" } : null,
    kalk.irodaAdminKoltseg   > 0 ? { csoport: "koltseg", label: "Iroda / Admin",       ertek: kalk.irodaAdminKoltseg,   szin: "#DC2626" } : null,
    kalk.kartérités          > 0 ? { csoport: "koltseg", label: "Kártérítés",          ertek: kalk.kartérités,          szin: "#DC2626" } : null,
    kalk.egyebKoltseg        > 0 ? { csoport: "koltseg", label: "Egyéb költség",       ertek: kalk.egyebKoltseg,        szin: "#DC2626" } : null,
  ].filter(Boolean);

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#F8FAFC", border: "none", cursor: "pointer", fontFamily: FONT, borderBottom: open ? `1px solid ${C.border}` : "none" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7 }}>Kombinált részletező</span>
        {open ? <ChevronDown size={14} color={C.muted} /> : <ChevronRight size={14} color={C.muted} />}
      </button>
      {open && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {sorok.map((s, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #F8FAFC", background: s.bold ? "#F0FDF4" : "transparent" }}>
                <td style={{ padding: "9px 14px", fontSize: 12, fontWeight: s.bold ? 800 : 500, color: "#374151", width: "40%" }}>
                  {s.label}
                  {s.badge && <span style={{ marginLeft: 6, fontSize: 10, background: "#ECFDF5", color: "#059669", padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>{s.badge}</span>}
                </td>
                <td style={{ padding: "9px 14px", fontSize: s.bold ? 15 : 13, fontWeight: s.bold ? 800 : 500, color: s.szin }}>
                  {ft(s.ertek)}
                </td>
                <td style={{ padding: "9px 14px", fontSize: 11, color: C.muted }}>{s.reszlet}</td>
              </tr>
            ))}
            <tr style={{ background: kalk.haszon >= 0 ? "#ECFDF5" : "#FEF2F2", borderTop: "2px solid" + (kalk.haszon >= 0 ? "#86EFAC" : "#FECACA") }}>
              <td style={{ padding: "10px 14px", fontWeight: 800, fontSize: 13 }}>Eredmény (haszon)</td>
              <td style={{ padding: "10px 14px", fontWeight: 800, fontSize: 15, color: kalk.haszon >= 0 ? "#059669" : "#DC2626" }}>
                {ft(kalk.haszon)}
              </td>
              <td style={{ padding: "10px 14px", fontSize: 12, color: C.muted }}>
                {kalk.haszonPct !== null ? `${kalk.haszonPct}% haszonkulcs` : ""}
              </td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Munkalap szintű elszámolás táblázat ─────────────────────
function MunkalapElszamolasTabla({ projekt, munkalapok }) {
  const [open, setOpen] = useState(false);
  if (!munkalapok?.length) return null;

  const ossz = calcProjektOsszesites(projekt, munkalapok);
  const mlSorok = ossz.munkalapok;
  const lezartMlk = munkalapok.filter(m => m.lezarva || m.status === "Ellenőrzés alatt" || m.status === "Lezárva");

  if (lezartMlk.length === 0) return (
    <div style={{ background:"#F8FAFC", border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 16px", marginBottom:14, fontSize:12, color:C.muted }}>
      Munkalap szintű elszámolás: nincs lezárt munkalap még.
    </div>
  );

  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", marginBottom:14 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", background:"#F8FAFC", border:"none", cursor:"pointer", fontFamily:FONT, borderBottom: open ? `1px solid ${C.border}` : "none" }}>
        <span style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.7 }}>
          Munkalap szintű elszámolás ({lezartMlk.length} lezárt)
        </span>
        {open ? <ChevronDown size={14} color={C.muted}/> : <ChevronRight size={14} color={C.muted}/>}
      </button>
      {open && (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:"#F8FAFC", borderBottom:`1px solid ${C.border}` }}>
                {["Munkalap", "Panel db", "Km", "FV bevétel", "AV bér", "Anyag", "Haszon", "Állapot"].map(h => (
                  <th key={h} style={{ padding:"7px 12px", textAlign:"left", fontWeight:700, color:C.muted, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {munkalapok.map((m, i) => {
                const e = mlSorok[i] || {};
                const lezart = m.lezarva || m.status === "Ellenőrzés alatt" || m.status === "Lezárva";
                return (
                  <tr key={m.id} style={{ borderBottom:`1px solid #F1F5F9`, background: lezart ? "#fff" : "#FFFBEB" }}>
                    <td style={{ padding:"8px 12px", fontWeight:600, color:"#374151" }}>
                      {m.munkalapSzam || m.dokumentumszam || m.id?.slice(-6)}
                      {!lezart && <span style={{ fontSize:10, color:C.muted, marginLeft:4 }}>(folyamatban)</span>}
                    </td>
                    <td style={{ padding:"8px 12px", color:C.muted }}>{e.inputs?.darabszam ?? "—"}</td>
                    <td style={{ padding:"8px 12px", color:C.muted }}>{e.inputs?.tavKm ? `${e.inputs.tavKm} km` : "—"}</td>
                    <td style={{ padding:"8px 12px", fontWeight:700, color:"#059669" }}>{e.bevitel > 0 ? ft(e.bevitel) : "—"}</td>
                    <td style={{ padding:"8px 12px", color:"#DC2626" }}>{e.alvallalkozoiBer > 0 ? ft(e.alvallalkozoiBer) : "—"}</td>
                    <td style={{ padding:"8px 12px", color:"#DC2626" }}>{e.anyagkoltság > 0 ? ft(e.anyagkoltság) : "—"}</td>
                    <td style={{ padding:"8px 12px", fontWeight:700, color: (e.haszon || 0) >= 0 ? "#059669" : "#DC2626" }}>
                      {e.bevitel > 0 ? ft(e.haszon || 0) : "—"}
                    </td>
                    <td style={{ padding:"8px 12px" }}>
                      <span style={{ fontSize:10, background: lezart?"#DCFCE7":"#FFFBEB", color:lezart?"#166534":"#D97706", padding:"2px 7px", borderRadius:20, fontWeight:700 }}>
                        {lezart ? "Lezárt" : "Aktív"}
                      </span>
                      {e._mentett && <span style={{ fontSize:9, color:C.muted, marginLeft:4 }}>●</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {lezartMlk.length > 1 && (
              <tfoot>
                <tr style={{ background:"#F0FDF4", borderTop:"2px solid #86EFAC" }}>
                  <td style={{ padding:"8px 12px", fontWeight:800 }}>Összesen (lezárt)</td>
                  <td />
                  <td />
                  <td style={{ padding:"8px 12px", fontWeight:800, color:"#059669" }}>
                    {ft(mlSorok.filter((_, i) => munkalapok[i]?.lezarva || munkalapok[i]?.status === "Ellenőrzés alatt" || munkalapok[i]?.status === "Lezárva").reduce((s, e) => s + (e.bevitel||0), 0))}
                  </td>
                  <td style={{ padding:"8px 12px", fontWeight:800, color:"#DC2626" }}>
                    {ft(mlSorok.filter((_, i) => munkalapok[i]?.lezarva).reduce((s, e) => s + (e.alvallalkozoiBer||0), 0))}
                  </td>
                  <td style={{ padding:"8px 12px", fontWeight:800, color:"#DC2626" }}>
                    {ft(mlSorok.filter((_, i) => munkalapok[i]?.lezarva).reduce((s, e) => s + (e.anyagkoltság||0), 0))}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
          <p style={{ fontSize:10, color:C.muted, padding:"6px 14px", borderTop:`1px solid ${C.border}` }}>
            ● = elmentett elszámolás · Mentett adatok prioritást élveznek a kalkulált értékkel szemben.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Fő tab ──────────────────────────────────────────────────
export default function TabKoltsegek({ projekt, munkalapok, currentUser }) {
  const [v, setV] = useState(0);
  const refresh = () => setV(n => n + 1);

  const kalk    = calcEsmentProjektPenzugy(projekt);
  const penzugy = projekt?.penzugy || {};
  const fvNev   = kalk.fovallalkoNev;
  const mtipus  = getMunkatipus(penzugy.munkatipus);
  const csapat  = getCsapat(penzugy.csapatId || projekt.csapatId);

  useEffect(() => {
    const TETELEK_KEY = `munkalap_tetelek_${projekt.id}`;
    const current = loadTetelek(projekt.id);
    const merged = kalk.beveteliTetelek.map(autoT => {
      const existing = current.find(e => e.tetelTipusId === autoT.tetelTipusId);
      if (existing?.felulirva) return { ...existing, autoNetto: autoT.autoNetto };
      return autoT;
    });
    localStorage.setItem(TETELEK_KEY, JSON.stringify(merged));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projekt.id, penzugy.fovallalkoziId, penzugy.munkatipus, penzugy.darabszam, penzugy.tavKm, penzugy.csapatLetszam]);

  const tetelek = (() => {
    const saved = loadTetelek(projekt.id);
    if (saved.length === 0) return kalk.beveteliTetelek;
    return kalk.beveteliTetelek.map(autoT => {
      const savedT = saved.find(s => s.tetelTipusId === autoT.tetelTipusId);
      if (savedT?.felulirva) return { ...savedT, autoNetto: autoT.autoNetto };
      return autoT;
    });
  })();

  const nincsKonfig = !penzugy.fovallalkoziId;

  return (
    <div style={{ paddingTop: 16, fontFamily: FONT }}>
      {nincsKonfig && (
        <div style={{ background: "#FFFBEB", border: "1.5px solid #FCD34D", borderRadius: 12, padding: "14px 16px", marginBottom: 16, display: "flex", gap: 10 }}>
          <AlertTriangle size={18} color="#D97706" />
          <div>
            <p style={{ fontWeight: 700, fontSize: 13, color: "#92400E", margin: 0 }}>Nincs fővállalkozó és munkatípus beállítva</p>
            <p style={{ fontSize: 12, color: "#92400E", margin: "3px 0 0" }}>Szerkeszd a projektet → Pénzügyi konfiguráció szekció.</p>
          </div>
        </div>
      )}

      {kalk.elteres && (
        <div style={{ background: "#FFFBEB", border: "1.5px solid #FCD34D", borderRadius: 12, padding: "10px 16px", marginBottom: 12, fontSize: 12, color: "#92400E" }}>
          ⚠️ <strong>Kézi eltérés a szabálytól:</strong> {kalk.elteresek.join(", ")}
        </div>
      )}
      {kalk.hianyosTetelek?.length > 0 && (
        <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 12, padding: "10px 16px", marginBottom: 12, fontSize: 12, color: "#DC2626" }}>
          ⚠️ <strong>Hiányos tételek:</strong> {kalk.hianyosTetelek.join(", ")}
        </div>
      )}

      {/* Konfig info sáv */}
      {fvNev && (
        <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: "10px 16px", marginBottom: 14, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div><p style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: "0 0 1px" }}>FŐVÁLLALKOZÓ</p><p style={{ fontWeight: 700, fontSize: 13, color: "#166534" }}>{fvNev}</p></div>
          {mtipus && <div><p style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: "0 0 1px" }}>MUNKATÍPUS</p><p style={{ fontSize: 12, color: "#166534" }}>{mtipus.nev}</p></div>}
          {csapat && <div><p style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: "0 0 1px" }}>CSAPAT</p><p style={{ fontSize: 12, color: "#166534" }}>{csapat.nev}{csapat.elszamolasAktiv ? " 💰" : ""}</p></div>}
          <div><p style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: "0 0 1px" }}>KONFIG</p><p style={{ fontSize: 12, color: "#166534" }}>{penzugy.darabszam || 1} db · {penzugy.tavKm || 0} km · {penzugy.csapatLetszam || 1} fő · {penzugy.munkanapok || 1} nap</p></div>
        </div>
      )}

      {/* KPI kártyák */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        <StatCard label="Nettó bevétel"    value={ft(kalk.nettoBevitel)}   color="#059669" sub={kalk.bruttoBevitel > 0 ? `Bruttó: ${ft(kalk.bruttoBevitel)}` : null} />
        <StatCard label="Összes költség"   value={ft(kalk.osszesKolts)}    color="#DC2626" />
        {kalk.alvallalkozoiBer > 0 && <StatCard label="Alvállalkozói díj" value={ft(kalk.alvallalkozoiBer)} color="#9333EA" />}
        <StatCard label="Várható haszon"   value={ft(kalk.haszon)}          color={kalk.haszon >= 0 ? "#059669" : "#DC2626"} highlight />
        <StatCard label="Haszonkulcs"
          value={kalk.haszonPct !== null ? `${kalk.haszonPct}%` : "—"}
          color={kalk.haszonPct !== null ? (kalk.haszonPct >= 20 ? "#059669" : kalk.haszonPct >= 10 ? "#D97706" : "#DC2626") : C.muted} />
      </div>

      {/* Kombinált részletező */}
      <KombiDetailSzekció kalk={kalk} penzugy={penzugy} csapat={csapat} />

      {/* Munkalap szintű bontás */}
      <MunkalapElszamolasTabla projekt={projekt} munkalapok={munkalapok || []} />

      {/* Bevételi tételek */}
      {tetelek.length > 0 && (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
          <p style={{ padding: "9px 14px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", background: "#F8FAFC", margin: 0, borderBottom: `1px solid ${C.border}` }}>
            Bevételi tételek (automatikus) – kézzel felülírható
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: `1px solid ${C.border}` }}>
                {["Megnevezés", "Összeg", "Megjegyzés", ""].map(h => (
                  <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tetelek.map(t => (
                <TetelSor key={t.id} tetel={t} projektId={projekt.id} onRefresh={refresh} currentUser={currentUser} />
              ))}
              <tr style={{ background: "#F0FDF4", borderTop: "2px solid #86EFAC" }}>
                <td style={{ padding: "9px 12px", fontWeight: 800 }}>Összes bevétel</td>
                <td style={{ padding: "9px 12px", fontWeight: 800, color: "#059669", fontSize: 14 }}>{ft(kalk.nettoBevitel)}</td>
                <td /><td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Költségtételek */}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <p style={{ padding: "9px 14px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", background: "#F8FAFC", margin: 0, borderBottom: `1px solid ${C.border}` }}>
          Költségtételek
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {[
              ["Csapat bér",        kalk.csapatBer,        penzugy.keziCsapatBer,    null],
              kalk.alvallalkozoiBer > 0 ? [`Alvállalkozói díj – ${csapat?.nev || ""}`, kalk.alvallalkozoiBer, null, "💰"] : null,
              kalk.alvallalkozoiKmBer > 0 ? ["Alvállalkozói km-díj", kalk.alvallalkozoiKmBer, null, "🚗"] : null,
              ["Útiköltség",        kalk.utikoltség,        penzugy.keziUtikoltség,   null],
              ["Anyagköltség",      kalk.anyagkoltség,      penzugy.keziAnyagkoltség, null],
              ["Emelőgép",          kalk.emelőgepKoltseg,    null, null],
              ["Daru / Teheremelő", kalk.daruKoltseg,        null, null],
              ["Szállás",           kalk.szallasKoltseg,     null, null],
              ["Bérelt eszközök",   kalk.bereltEszkozKoltseg,null, null],
              ["Iroda / Admin",     kalk.irodaAdminKoltseg,  null, null],
              ["Kártérítés",        kalk.kartérités,         penzugy.keziKartérités, null],
              ["Egyéb",             kalk.egyebKoltseg,       null, null],
            ].filter(r => r && r[1] > 0).map(([l, v2, kezi, icon]) => (
              <tr key={l} style={{ borderBottom: `1px solid #F1F5F9` }}>
                <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "#374151" }}>
                  {icon && <span style={{ marginRight: 5 }}>{icon}</span>}{l}
                </td>
                <td style={{ padding: "8px 12px", fontSize: 13, color: kezi != null ? "#D97706" : "#DC2626", fontWeight: kezi != null ? 700 : 400 }}>
                  {ft(v2)}
                  {kezi != null && <span style={{ marginLeft: 6, fontSize: 10, background: "#FFFBEB", color: "#D97706", padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>⚠️ kézi</span>}
                </td>
                <td />
              </tr>
            ))}
            <tr style={{ background: "#FEF2F2", borderTop: "2px solid #FECACA" }}>
              <td style={{ padding: "9px 12px", fontWeight: 800 }}>Összes költség</td>
              <td style={{ padding: "9px 12px", fontWeight: 800, color: "#DC2626", fontSize: 14 }}>{ft(kalk.osszesKolts)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
