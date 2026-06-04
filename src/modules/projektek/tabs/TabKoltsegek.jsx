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
      <td style={{ padding: "9px 12px", fontSize: 12, fontWeight: 600, color: C.textSub }}>{tetel.megnevezes}</td>
      <td style={{ padding: "9px 12px" }}>
        {editMode ? (
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="number" value={editVal} onChange={e => setEditVal(Number(e.target.value))}
              style={{ width: 100, padding: "4px 8px", border: "1.5px solid #2563EB", borderRadius: 6, fontSize: 13, fontFamily: FONT }} />
            <button onClick={handleSave}   style={{ padding: "4px 8px", background: C.success, color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}><Check size={13} /></button>
            <button onClick={() => setEditMode(false)} style={{ padding: "4px 8px", background: C.bg, border: "none", borderRadius: 6, cursor: "pointer" }}><X size={13} /></button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: tetel.felulirva ? 700 : 400, color: tetel.felulirva ? C.warning : C.success }}>
              {ft(tetel.hasznalandoNetto)}
            </span>
            {tetel.felulirva && <span style={{ fontSize: 10, background: C.warningLight, color: C.warning, padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>⚠️ kézi</span>}
            {tetel.hiany && <span style={{ fontSize: 10, background: C.dangerLight, color: C.danger, padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>hiányos</span>}
          </div>
        )}
      </td>
      <td style={{ padding: "9px 12px", fontSize: 11, color: C.muted }}>{tetel.felulirva ? `Auto lenne: ${ft(tetel.autoNetto)}` : tetel.megjegyzes}</td>
      <td style={{ padding: "9px 12px" }}>
        <div style={{ display: "flex", gap: 4 }}>
          {!editMode && (
            <button onClick={() => { setEditVal(tetel.hasznalandoNetto); setEditMode(true); }} title="Felülír"
              style={{ padding: "3px 7px", background: C.accentLight, color: C.accent, border: "none", borderRadius: 6, cursor: "pointer" }}>
              <Pencil size={11} />
            </button>
          )}
          {tetel.felulirva && !editMode && (
            <button onClick={handleVissza} title="Auto visszaállítás"
              style={{ padding: "3px 7px", background: C.successLight, color: C.success, border: "none", borderRadius: 6, cursor: "pointer" }}>
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
    { csoport: "bevétel", label: "Nettó bevétel (fővállalkozói)", ertek: kalk.nettoBevitel, szin: C.success, bold: true },
    // Fővállalkozói oldal – alvállalkozói bérek
    { csoport: "koltseg", label: "Csapat bér (szabály alapján)", ertek: kalk.csapatBer, szin: C.danger,
      reszlet: penzugy.keziCsapatBer != null ? "⚠️ kézi" : null },
    csapat?.elszamolasAktiv ? {
      csoport: "koltseg", label: `Alvállalkozói díj – ${csapat.nev}`, ertek: kalk.alvallalkozoiBer, szin: C.danger,
      reszlet: kalk.alvallalkozoiBerMj, badge: "Alvállalkozói",
    } : null,
    kalk.alvallalkozoiKmBer > 0 ? {
      csoport: "koltseg", label: "Alvállalkozói km-díj", ertek: kalk.alvallalkozoiKmBer, szin: C.danger,
    } : null,
    kalk.utikoltség > 0 ? {
      csoport: "koltseg", label: "Kiszállási / km-díj", ertek: kalk.utikoltség, szin: C.danger,
      reszlet: penzugy.keziUtikoltség != null ? "⚠️ kézi" : null,
    } : null,
    kalk.anyagkoltség > 0 ? {
      csoport: "koltseg", label: "Anyagköltség", ertek: kalk.anyagkoltség, szin: C.danger,
      reszlet: penzugy.keziAnyagkoltség != null ? "⚠️ kézi" : null,
    } : null,
    kalk.emelőgepKoltseg     > 0 ? { csoport: "koltseg", label: "Emelőgép",         ertek: kalk.emelőgepKoltseg,     szin: C.danger } : null,
    kalk.daruKoltseg         > 0 ? { csoport: "koltseg", label: "Daru / Teheremelő", ertek: kalk.daruKoltseg,         szin: C.danger } : null,
    kalk.szallasKoltseg      > 0 ? { csoport: "koltseg", label: "Szállás",            ertek: kalk.szallasKoltseg,      szin: C.danger } : null,
    kalk.bereltEszkozKoltseg > 0 ? { csoport: "koltseg", label: "Bérelt eszközök",    ertek: kalk.bereltEszkozKoltseg, szin: C.danger } : null,
    kalk.irodaAdminKoltseg   > 0 ? { csoport: "koltseg", label: "Iroda / Admin",       ertek: kalk.irodaAdminKoltseg,   szin: C.danger } : null,
    kalk.kartérités          > 0 ? { csoport: "koltseg", label: "Kártérítés",          ertek: kalk.kartérités,          szin: C.danger } : null,
    kalk.egyebKoltseg        > 0 ? { csoport: "koltseg", label: "Egyéb költség",       ertek: kalk.egyebKoltseg,        szin: C.danger } : null,
  ].filter(Boolean);

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: C.bg, border: "none", cursor: "pointer", fontFamily: FONT, borderBottom: open ? `1px solid ${C.border}` : "none" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7 }}>Kombinált részletező</span>
        {open ? <ChevronDown size={14} color={C.muted} /> : <ChevronRight size={14} color={C.muted} />}
      </button>
      {open && (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {sorok.map((s, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #F8FAFC", background: s.bold ? C.successLight : "transparent" }}>
                <td style={{ padding: "9px 14px", fontSize: 12, fontWeight: s.bold ? 800 : 500, color: C.textSub, width: "40%" }}>
                  {s.label}
                  {s.badge && <span style={{ marginLeft: 6, fontSize: 10, background: C.successLight, color: C.success, padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>{s.badge}</span>}
                </td>
                <td style={{ padding: "9px 14px", fontSize: s.bold ? 15 : 13, fontWeight: s.bold ? 800 : 500, color: s.szin }}>
                  {ft(s.ertek)}
                </td>
                <td style={{ padding: "9px 14px", fontSize: 11, color: C.muted }}>{s.reszlet}</td>
              </tr>
            ))}
            <tr style={{ background: kalk.haszon >= 0 ? C.successLight : C.dangerLight, borderTop: "2px solid" + (kalk.haszon >= 0 ? C.success : C.dangerLight) }}>
              <td style={{ padding: "10px 14px", fontWeight: 800, fontSize: 13 }}>Eredmény (haszon)</td>
              <td style={{ padding: "10px 14px", fontWeight: 800, fontSize: 15, color: kalk.haszon >= 0 ? C.success : C.danger }}>
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
    <div style={{ background:C.bg, border:`1px solid ${C.border}`, borderRadius:12, padding:"12px 16px", marginBottom:14, fontSize:12, color:C.muted }}>
      Munkalap szintű elszámolás: nincs lezárt munkalap még.
    </div>
  );

  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, overflow:"hidden", marginBottom:14 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", background:C.bg, border:"none", cursor:"pointer", fontFamily:FONT, borderBottom: open ? `1px solid ${C.border}` : "none" }}>
        <span style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.7 }}>
          Munkalap szintű elszámolás ({lezartMlk.length} lezárt)
        </span>
        {open ? <ChevronDown size={14} color={C.muted}/> : <ChevronRight size={14} color={C.muted}/>}
      </button>
      {open && (
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:C.bg, borderBottom:`1px solid ${C.border}` }}>
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
                  <tr key={m.id} style={{ borderBottom:`1px solid #F1F5F9`, background: lezart ? "#fff" : C.warningLight }}>
                    <td style={{ padding:"8px 12px", fontWeight:600, color:C.textSub }}>
                      {m.munkalapSzam || m.dokumentumszam || m.id?.slice(-6)}
                      {!lezart && <span style={{ fontSize:10, color:C.muted, marginLeft:4 }}>(folyamatban)</span>}
                    </td>
                    <td style={{ padding:"8px 12px", color:C.muted }}>{e.inputs?.darabszam ?? "—"}</td>
                    <td style={{ padding:"8px 12px", color:C.muted }}>{e.inputs?.tavKm ? `${e.inputs.tavKm} km` : "—"}</td>
                    <td style={{ padding:"8px 12px", fontWeight:700, color:C.success }}>{e.bevitel > 0 ? ft(e.bevitel) : "—"}</td>
                    <td style={{ padding:"8px 12px", color:C.danger }}>{e.alvallalkozoiBer > 0 ? ft(e.alvallalkozoiBer) : "—"}</td>
                    <td style={{ padding:"8px 12px", color:C.danger }}>{e.anyagkoltság > 0 ? ft(e.anyagkoltság) : "—"}</td>
                    <td style={{ padding:"8px 12px", fontWeight:700, color: (e.haszon || 0) >= 0 ? C.success : C.danger }}>
                      {e.bevitel > 0 ? ft(e.haszon || 0) : "—"}
                    </td>
                    <td style={{ padding:"8px 12px" }}>
                      <span style={{ fontSize:10, background: lezart?C.successLight:C.warningLight, color:lezart?C.success:C.warning, padding:"2px 7px", borderRadius:20, fontWeight:700 }}>
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
                <tr style={{ background:C.successLight, borderTop:"2px solid #86EFAC" }}>
                  <td style={{ padding:"8px 12px", fontWeight:800 }}>Összesen (lezárt)</td>
                  <td />
                  <td />
                  <td style={{ padding:"8px 12px", fontWeight:800, color:C.success }}>
                    {ft(mlSorok.filter((_, i) => munkalapok[i]?.lezarva || munkalapok[i]?.status === "Ellenőrzés alatt" || munkalapok[i]?.status === "Lezárva").reduce((s, e) => s + (e.bevitel||0), 0))}
                  </td>
                  <td style={{ padding:"8px 12px", fontWeight:800, color:C.danger }}>
                    {ft(mlSorok.filter((_, i) => munkalapok[i]?.lezarva).reduce((s, e) => s + (e.alvallalkozoiBer||0), 0))}
                  </td>
                  <td style={{ padding:"8px 12px", fontWeight:800, color:C.danger }}>
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
        <div style={{ background: C.warningLight, border: "1.5px solid #FCD34D", borderRadius: 12, padding: "14px 16px", marginBottom: 16, display: "flex", gap: 10 }}>
          <AlertTriangle size={18} color={C.warning} />
          <div>
            <p style={{ fontWeight: 700, fontSize: 13, color: C.warning, margin: 0 }}>Nincs fővállalkozó és munkatípus beállítva</p>
            <p style={{ fontSize: 12, color: C.warning, margin: "3px 0 0" }}>Szerkeszd a projektet → Pénzügyi konfiguráció szekció.</p>
          </div>
        </div>
      )}

      {kalk.elteres && (
        <div style={{ background: C.warningLight, border: "1.5px solid #FCD34D", borderRadius: 12, padding: "10px 16px", marginBottom: 12, fontSize: 12, color: C.warning }}>
          ⚠️ <strong>Kézi eltérés a szabálytól:</strong> {kalk.elteresek.join(", ")}
        </div>
      )}
      {kalk.hianyosTetelek?.length > 0 && (
        <div style={{ background: C.dangerLight, border: "1.5px solid #FECACA", borderRadius: 12, padding: "10px 16px", marginBottom: 12, fontSize: 12, color: C.danger }}>
          ⚠️ <strong>Hiányos tételek:</strong> {kalk.hianyosTetelek.join(", ")}
        </div>
      )}

      {/* Konfig info sáv */}
      {fvNev && (
        <div style={{ background: C.successLight, border: "1px solid #86EFAC", borderRadius: 12, padding: "10px 16px", marginBottom: 14, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div><p style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: "0 0 1px" }}>FŐVÁLLALKOZÓ</p><p style={{ fontWeight: 700, fontSize: 13, color: C.success }}>{fvNev}</p></div>
          {mtipus && <div><p style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: "0 0 1px" }}>MUNKATÍPUS</p><p style={{ fontSize: 12, color: C.success }}>{mtipus.nev}</p></div>}
          {csapat && <div><p style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: "0 0 1px" }}>CSAPAT</p><p style={{ fontSize: 12, color: C.success }}>{csapat.nev}{csapat.elszamolasAktiv ? " 💰" : ""}</p></div>}
          <div><p style={{ fontSize: 10, fontWeight: 700, color: C.muted, margin: "0 0 1px" }}>KONFIG</p><p style={{ fontSize: 12, color: C.success }}>{penzugy.darabszam || 1} db · {penzugy.tavKm || 0} km · {penzugy.csapatLetszam || 1} fő · {penzugy.munkanapok || 1} nap</p></div>
        </div>
      )}

      {/* KPI kártyák */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        <StatCard label="Nettó bevétel"    value={ft(kalk.nettoBevitel)}   color={C.success} sub={kalk.bruttoBevitel > 0 ? `Bruttó: ${ft(kalk.bruttoBevitel)}` : null} />
        <StatCard label="Összes költség"   value={ft(kalk.osszesKolts)}    color={C.danger} />
        {kalk.alvallalkozoiBer > 0 && <StatCard label="Alvállalkozói díj" value={ft(kalk.alvallalkozoiBer)} color={C.accent} />}
        <StatCard label="Várható haszon"   value={ft(kalk.haszon)}          color={kalk.haszon >= 0 ? C.success : C.danger} highlight />
        <StatCard label="Haszonkulcs"
          value={kalk.haszonPct !== null ? `${kalk.haszonPct}%` : "—"}
          color={kalk.haszonPct !== null ? (kalk.haszonPct >= 20 ? C.success : kalk.haszonPct >= 10 ? C.warning : C.danger) : C.muted} />
      </div>

      {/* Kombinált részletező */}
      <KombiDetailSzekció kalk={kalk} penzugy={penzugy} csapat={csapat} />

      {/* Munkalap szintű bontás */}
      <MunkalapElszamolasTabla projekt={projekt} munkalapok={munkalapok || []} />

      {/* Bevételi tételek */}
      {tetelek.length > 0 && (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
          <p style={{ padding: "9px 14px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", background: C.bg, margin: 0, borderBottom: `1px solid ${C.border}` }}>
            Bevételi tételek (automatikus) – kézzel felülírható
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.bg, borderBottom: `1px solid ${C.border}` }}>
                {["Megnevezés", "Összeg", "Megjegyzés", ""].map(h => (
                  <th key={h} style={{ padding: "7px 12px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.muted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tetelek.map(t => (
                <TetelSor key={t.id} tetel={t} projektId={projekt.id} onRefresh={refresh} currentUser={currentUser} />
              ))}
              <tr style={{ background: C.successLight, borderTop: "2px solid #86EFAC" }}>
                <td style={{ padding: "9px 12px", fontWeight: 800 }}>Összes bevétel</td>
                <td style={{ padding: "9px 12px", fontWeight: 800, color: C.success, fontSize: 14 }}>{ft(kalk.nettoBevitel)}</td>
                <td /><td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Költségtételek */}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <p style={{ padding: "9px 14px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", background: C.bg, margin: 0, borderBottom: `1px solid ${C.border}` }}>
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
                <td style={{ padding: "8px 12px", fontSize: 12, fontWeight: 600, color: C.textSub }}>
                  {icon && <span style={{ marginRight: 5 }}>{icon}</span>}{l}
                </td>
                <td style={{ padding: "8px 12px", fontSize: 13, color: kezi != null ? C.warning : C.danger, fontWeight: kezi != null ? 700 : 400 }}>
                  {ft(v2)}
                  {kezi != null && <span style={{ marginLeft: 6, fontSize: 10, background: C.warningLight, color: C.warning, padding: "1px 6px", borderRadius: 20, fontWeight: 700 }}>⚠️ kézi</span>}
                </td>
                <td />
              </tr>
            ))}
            <tr style={{ background: C.dangerLight, borderTop: "2px solid #FECACA" }}>
              <td style={{ padding: "9px 12px", fontWeight: 800 }}>Összes költség</td>
              <td style={{ padding: "9px 12px", fontWeight: 800, color: C.danger, fontSize: 14 }}>{ft(kalk.osszesKolts)}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
