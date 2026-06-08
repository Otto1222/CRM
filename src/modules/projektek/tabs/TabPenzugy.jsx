/**
 * TabPenzugy.jsx – Egyetlen pénzügyi tab
 * Spec: Összesítő + Költségek + Elszámolási státusz + Számlázási státusz + Számlák CRUD
 * Nincs külön Elszámolás / Számlázás / Költségek tab.
 */

import { useState, useEffect } from "react";
import { Save, Check, Plus, Receipt, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";
import { C, FONT } from "../../../lib/constants.js";
import { ft } from "../../../lib/helpers.js";
import { calcEsmentProjektPenzugy, ANYAGKOLTSEG_FORRAS } from "../../../services/workOrderFinancial.service.js";
import { calcProjektPenzugy }       from "../../../lib/costEngine.js";
import {
  ELSZAMOLAS_STATUSZOK, SZAMLAZAS_STATUSZOK, TIG_STATUSZOK,
  getElszamolasConfig, getSzamlazasConfig, getTigConfig,
  ellenorzSzamlazhatosagas,
} from "../../../lib/penzugyiRules.js";
import { getPenzugyi, upsertPenzugyi, autoElszamolasElokeszites } from "../../penzugy/penzugyi.service.js";
import { PENZUGYI_SCHEMA }   from "../../penzugy/penzugyi.schema.js";
import { loadSzamlak, createSzamla } from "../../szamlak/szamla.service.js";
import { getCsapat }         from "../../csapatok/csapat.service.js";

// Anyagköltség-forrás megjelenítendő rövid neve – P0-2 javítás: a forrás
// MINDIG látható, hogy pénzügyi vita esetén egyértelmű legyen, honnan jött a szám.
const ANYAGKOLTSEG_FORRAS_LABEL = {
  [ANYAGKOLTSEG_FORRAS.KIVITELEZESI_CSOMAG_TENYLEGES]: "Kivitelezési Csomag",
  [ANYAGKOLTSEG_FORRAS.MUNKALAP_ANYAGKOLTSEG_TOTAL]:   "Munkalap",
  [ANYAGKOLTSEG_FORRAS.FELHASZNALT_ANYAGOK_LOCAL]:     "Munkalap (helyi adat)",
  [ANYAGKOLTSEG_FORRAS.KEZI_PENZUGYI_ADAT]:            "Kézi adat",
  [ANYAGKOLTSEG_FORRAS.NINCS_ADAT]:                    "nincs adat",
};

// ─── KPI kártya ──────────────────────────────────────────────
function KPI({ label, value, color, sub }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", flex: 1, minWidth: 120 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7, margin: "0 0 4px" }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 800, color, margin: 0 }}>{value}</p>
      {sub && <p style={{ fontSize: 10, color: C.muted, margin: "3px 0 0" }}>{sub}</p>}
    </div>
  );
}

// ─── Státuszpill ─────────────────────────────────────────────
function Pills({ label, items, value, onChange, disabled }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7, margin: "0 0 7px" }}>{label}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map(s => (
          <button key={s.id} onClick={() => !disabled && onChange(s.id)}
            style={{ padding: "6px 14px", borderRadius: 20, border: `2px solid ${value === s.id ? s.szin : "#E2E8F0"}`,
              background: value === s.id ? s.bg : "#fff", color: value === s.id ? s.szin : C.muted,
              fontWeight: value === s.id ? 700 : 400, fontSize: 12, cursor: disabled ? "default" : "pointer", fontFamily: FONT }}>
            {s.id}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Számla badge ─────────────────────────────────────────────
function SzamlaBadge({ statusz }) {
  const cfg = {
    "Kiállítva":    { bg: "#FFFBEB", color: "#D97706" },
    "Fizetésre vár":{ bg: "#EFF6FF", color: "#2563EB" },
    "Fizetve":      { bg: "#ECFDF5", color: "#059669" },
    "Késedelmes":   { bg: "#FEF2F2", color: "#DC2626" },
  }[statusz] || { bg: "#F8FAFC", color: "#94A3B8" };
  return (
    <span style={{ background: cfg.bg, color: cfg.color, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
      {statusz}
    </span>
  );
}

// ─── Fő tab ──────────────────────────────────────────────────
export default function TabPenzugy({ projekt, munkalapok, currentUser }) {
  const isAdmin = ["Admin", "Projektmenedzser", "Iroda/Könyvelés"].includes(currentUser?.role);
  const projektMls = (munkalapok || []).filter(
    m => m.projektId === projekt.id || (projekt.munkalapIds || []).includes(m.id)
  );

  // Elszámolási rekord (státuszok, TIG, kézi összegek)
  const [rec, setRec]   = useState(() => getPenzugyi(projekt.id) || { ...PENZUGYI_SCHEMA, projektId: projekt.id });
  const [mentve, setMentve] = useState(false);
  const [section, setSection] = useState("osszesito"); // osszesito | koltsegek | statusz | szamlak

  // Kalkulált adatok
  const kalk = projekt.penzugy?.fovallalkoziId ? calcEsmentProjektPenzugy(projekt) : null;
  const penz = calcProjektPenzugy(projektMls);
  const csapat = getCsapat(projekt.penzugy?.csapatId || projekt.csapatId);

  // Számlák
  const [szamlak, setSzamlak] = useState([]);
  const [ujOpen, setUjOpen]   = useState(false);
  const [ujForm, setUjForm]   = useState({
    tipus: "kimeno", szamlaSzam: "",
    kiallitasDatum: new Date().toISOString().slice(0, 10),
    fizetesiHatarido: "", nettoOsszeg: "", megjegyzes: "",
  });

  function loadSzamlakLocal() {
    setSzamlak(loadSzamlak().filter(s => s.projektId === projekt.id));
  }

  useEffect(() => {
    loadSzamlakLocal();
    const fresh = getPenzugyi(projekt.id);
    if (fresh) setRec(fresh);
    const h = e => { if (!e.detail?.collection || ["penzugyi","szamlak"].includes(e.detail.collection)) { loadSzamlakLocal(); const f2=getPenzugyi(projekt.id); if(f2) setRec(f2); } };
    window.addEventListener("crm-db-updated", h);
    return () => window.removeEventListener("crm-db-updated", h);
  }, [projekt.id]);

  function handleMentes() {
    const saved = upsertPenzugyi({ ...rec, projektId: projekt.id }, currentUser?.name || "");
    setRec(saved); setMentve(true);
    setTimeout(() => setMentve(false), 2500);
  }

  function handleUjSzamla() {
    if (!ujForm.szamlaSzam || !ujForm.nettoOsszeg) { alert("Számlaszám és nettó összeg kötelező!"); return; }
    createSzamla({ ...ujForm, nettoOsszeg: Number(ujForm.nettoOsszeg), projektId: projekt.id, projektKod: projekt.projektkod, clientNev: projekt.clientNev || "" }, currentUser?.name || "");
    setUjOpen(false);
    setUjForm({ tipus: "kimeno", szamlaSzam: "", kiallitasDatum: new Date().toISOString().slice(0,10), fizetesiHatarido: "", nettoOsszeg: "", megjegyzes: "" });
  }

  const isBelso = projekt.forrás === "belso_munka";
  const profit  = (kalk?.nettoBevitel || projekt.elfogadottAjanlat || 0) - (kalk?.osszesKolts || 0);
  const profitPct = (kalk?.nettoBevitel || 0) > 0 ? kalk.haszonPct : null;

  const fizetve = szamlak.filter(s => s.statusz === "Fizetve").reduce((a, s) => a + (s.bruttoOsszeg || 0), 0);
  const kinnlevo = szamlak.filter(s => s.statusz !== "Fizetve").reduce((a, s) => a + (s.bruttoOsszeg || 0), 0);

  const inp = { width: "100%", boxSizing: "border-box", padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: FONT, outline: "none" };

  // Szekció navigáció
  const SECTIONS = [
    { id: "osszesito", label: "Összesítő" },
    { id: "koltsegek", label: "Költségek" },
    { id: "statusz",   label: "Státuszok" },
    { id: "szamlak",   label: `Számlák (${szamlak.length})` },
  ];

  return (
    <div style={{ paddingTop: 14, fontFamily: FONT }}>

      {/* Szekció váltó */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            style={{ padding: "7px 16px", borderRadius: 20, border: `1.5px solid ${section === s.id ? C.accent : C.border}`,
              background: section === s.id ? C.accent : "#fff", color: section === s.id ? "#fff" : C.textSub,
              cursor: "pointer", fontSize: 13, fontWeight: section === s.id ? 700 : 400, fontFamily: FONT }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── ÖSSZESÍTŐ ── */}
      {section === "osszesito" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* KPI kártyák */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <KPI label="Nettó bevétel (terv)" value={ft(kalk?.nettoBevitel || projekt.elfogadottAjanlat || 0)} color="#059669"
              sub={projekt.elfogadottAjanlat > 0 ? `Elfogadott ajánlat: ${ft(projekt.elfogadottAjanlat)}` : null} />
            <KPI label="Összes költség (terv)" value={ft(kalk?.osszesKolts || 0)} color="#DC2626" />
            <KPI label="Várható haszon" value={ft(profit)} color={profit >= 0 ? "#059669" : "#DC2626"} />
            <KPI label="Haszonkulcs" value={profitPct !== null ? `${profitPct}%` : "—"}
              color={profitPct === null ? C.muted : profitPct >= 20 ? "#059669" : profitPct >= 10 ? "#D97706" : "#DC2626"} />
          </div>

          {/* Kalkuláció részlet */}
          {kalk && (
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: .7, margin: "0 0 10px" }}>
                Fővállalkozói kalkuláció – {kalk.fovallalkoNev}
              </p>
              {[
                ["Nettó bevétel",     kalk.nettoBevitel,      "#059669"],
                ["Csapat bér",        kalk.csapatBer,         "#DC2626"],
                kalk.alvallalkozoiBer > 0 ? [`Alvállalkozói díj (${csapat?.nev || ""})`, kalk.alvallalkozoiBer, "#9333EA"] : null,
                kalk.utikoltség > 0  ? ["Km-díj",             kalk.utikoltség,        "#DC2626"] : null,
                kalk.anyagkoltság > 0 ? [`Anyagköltség (forrás: ${ANYAGKOLTSEG_FORRAS_LABEL[kalk.anyagkoltsegForras] || kalk.anyagkoltsegForras})`, kalk.anyagkoltság, "#DC2626"] : null,
                ["Összes ktg (terv)", kalk.osszesKolts,       "#DC2626"],
                ["Haszon",            kalk.haszon,            kalk.haszon >= 0 ? "#059669" : "#DC2626"],
              ].filter(Boolean).map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #DCFCE7" }}>
                  <span style={{ fontSize: 12, color: "#374151" }}>{l}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: c }}>{ft(v)}</span>
                </div>
              ))}
              {kalk.hianyosTetelek?.length > 0 && (
                <p style={{ fontSize: 11, color: "#D97706", marginTop: 8 }}>⚠️ Hiányos konfig: {kalk.hianyosTetelek.join(", ")}</p>
              )}
              {kalk.anyagkoltsegWarning && (
                <p style={{ fontSize: 11, color: '#D97706', fontWeight: 600, marginTop: 8 }}>⚠ {kalk.anyagkoltsegWarning}</p>
              )}
            </div>
          )}

          {/* Számlázott összesítő */}
          {(fizetve > 0 || kinnlevo > 0) && (
            <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7, margin: "0 0 10px" }}>Számlázás összesítő</p>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1, background: "#ECFDF5", borderRadius: 9, padding: "10px 14px" }}>
                  <p style={{ fontSize: 10, color: "#166534", fontWeight: 700, margin: "0 0 2px" }}>FIZETVE</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: "#059669", margin: 0 }}>{ft(fizetve)}</p>
                </div>
                <div style={{ flex: 1, background: "#FFFBEB", borderRadius: 9, padding: "10px 14px" }}>
                  <p style={{ fontSize: 10, color: "#92400E", fontWeight: 700, margin: "0 0 2px" }}>KINNLÉVŐ</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: "#D97706", margin: 0 }}>{ft(kinnlevo)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KÖLTSÉGEK ── */}
      {section === "koltsegek" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              { label: "Anyagköltség",           key: "anyagKoltsegNetto" },
              { label: "Saját csapat munkadíja", key: "sajatCsapatKoltsegNetto" },
              { label: "Alvállalkozói díj",      key: "alvallalkozoKoltsegNetto" },
              { label: "Km / Kiszállás",         key: "kiszallasKoltsegNetto" },
              { label: "Emelőgép",               key: "emeloKoltsegNetto" },
              { label: "Egyéb",                  key: "egyebKoltsegNetto" },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: .6 }}>{f.label} (Ft)</label>
                <input type="number" min="0" disabled={!isAdmin}
                  value={rec[f.key] || ""}
                  onChange={e => {
                    const v = Number(e.target.value) || 0;
                    setRec(p => {
                      const n = { ...p, [f.key]: v };
                      n.osszesKoltsegNetto = (n.anyagKoltsegNetto||0) + (n.sajatCsapatKoltsegNetto||0) + (n.alvallalkozoKoltsegNetto||0) + (n.kiszallasKoltsegNetto||0) + (n.emeloKoltsegNetto||0) + (n.egyebKoltsegNetto||0);
                      return n;
                    });
                    setMentve(false);
                  }}
                  style={{ ...inp, background: isAdmin ? "#fff" : "#F8FAFC" }} />
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 13 }}>Összes tényleges költség</span>
            <span style={{ fontWeight: 800, fontSize: 14, color: "#DC2626" }}>{ft(rec.osszesKoltsegNetto || 0)}</span>
          </div>
          {isAdmin && (
            <button onClick={handleMentes}
              style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 7, padding: "11px 22px", background: mentve ? "#059669" : C.accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>
              {mentve ? <><Check size={15} /> Mentve!</> : <><Save size={15} /> Mentés</>}
            </button>
          )}
        </div>
      )}

      {/* ── STÁTUSZOK ── */}
      {section === "statusz" && (
        <div>
          {isBelso && (
            <div style={{ background: "#ECFDF5", border: "1px solid #86EFAC", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: "#166534", fontWeight: 600 }}>
              🏢 Belső munka – nincs bevétel, számlázható státuszba nem kerülhet.
            </div>
          )}
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" }}>
            <Pills label="Elszámolási státusz" items={ELSZAMOLAS_STATUSZOK} value={rec.elszamolasStatusz}
              onChange={v => { setRec(p => ({...p, elszamolasStatusz: v})); setMentve(false); }} disabled={!isAdmin} />
            <Pills label="Számlázási státusz"
              items={isBelso ? SZAMLAZAS_STATUSZOK.filter(s => s.id === "Nem számlázható") : SZAMLAZAS_STATUSZOK}
              value={rec.szamlazasStatusz}
              onChange={v => { setRec(p => ({...p, szamlazasStatusz: v})); setMentve(false); }} disabled={!isAdmin || isBelso} />
            <Pills label="TIG státusz" items={TIG_STATUSZOK} value={rec.tigStatusz}
              onChange={v => { setRec(p => ({...p, tigStatusz: v})); setMentve(false); }} disabled={!isAdmin} />
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: .6 }}>Megjegyzés</label>
            <textarea rows={3} disabled={!isAdmin} value={rec.elszamolasNotes || ""}
              onChange={e => { setRec(p => ({...p, elszamolasNotes: e.target.value})); setMentve(false); }}
              style={{ ...inp, resize: "none", background: isAdmin ? "#fff" : "#F8FAFC" }} />
          </div>

          {isAdmin && (
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button onClick={() => { autoElszamolasElokeszites(projekt.id, projektMls, currentUser?.name); const f = getPenzugyi(projekt.id); if(f) setRec(f); }}
                style={{ padding: "10px 16px", border: `1.5px solid ${C.border}`, borderRadius: 9, background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT, display: "flex", alignItems: "center", gap: 6 }}>
                <RefreshCw size={13} /> Auto előkészítés
              </button>
              <button onClick={handleMentes}
                style={{ flex: 1, padding: "11px", background: mentve ? "#059669" : C.accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                {mentve ? <><Check size={15} /> Mentve!</> : <><Save size={15} /> Mentés</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── SZÁMLÁK ── */}
      {section === "szamlak" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>Számlák ({szamlak.length} db)</p>
            <button onClick={() => setUjOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: C.accent, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT }}>
              <Plus size={14} /> Új számla
            </button>
          </div>

          {szamlak.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>
              <Receipt size={36} style={{ opacity: .2, display: "block", margin: "0 auto 10px" }} />
              <p style={{ fontSize: 13 }}>Nincs számla ehhez a projekthez</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {szamlak.map(s => (
                <div key={s.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <Receipt size={16} color={s.tipus === "kimeno" ? "#059669" : "#D97706"} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <p style={{ fontWeight: 700, fontSize: 13, color: C.text, margin: 0 }}>{s.szamlaSzam || s.id}</p>
                    <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0" }}>
                      {s.tipus === "kimeno" ? "Kimenő" : "Bejövő"} · {s.kiallitasDatum}
                    </p>
                  </div>
                  <p style={{ fontWeight: 800, fontSize: 14, color: C.text, margin: 0, flexShrink: 0 }}>{ft(s.bruttoOsszeg || 0)}</p>
                  <SzamlaBadge statusz={s.statusz} />
                </div>
              ))}
            </div>
          )}

          {/* Új számla modal */}
          {ujOpen && (
            <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
              <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 460, padding: 24, fontFamily: FONT, maxHeight: "90vh", overflowY: "auto" }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 18px", color: C.text }}>Új számla – {projekt.projektkod}</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>Típus</label>
                    <select value={ujForm.tipus} onChange={e => setUjForm(p => ({...p, tipus: e.target.value}))} style={inp}>
                      <option value="kimeno">Kimenő (vevői)</option>
                      <option value="bejovo">Bejövő (szállítói)</option>
                    </select>
                  </div>
                  {[
                    { label: "Számlaszám *",       key: "szamlaSzam",        ph: "pl. 2026/001" },
                    { label: "Kiállítás dátuma",   key: "kiallitasDatum",    type: "date" },
                    { label: "Fizetési határidő",  key: "fizetesiHatarido",  type: "date" },
                    { label: "Nettó összeg (Ft) *", key: "nettoOsszeg",      type: "number" },
                    { label: "Megjegyzés",         key: "megjegyzes",        ph: "Opcionális" },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>{f.label}</label>
                      <input type={f.type || "text"} value={ujForm[f.key]} placeholder={f.ph}
                        onChange={e => setUjForm(p => ({...p, [f.key]: e.target.value}))} style={inp} />
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button onClick={() => setUjOpen(false)} style={{ flex: 1, padding: "11px", border: `1.5px solid ${C.border}`, borderRadius: 9, background: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: FONT }}>Mégse</button>
                  <button onClick={handleUjSzamla} style={{ flex: 2, padding: "11px", background: C.accent, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontFamily: FONT }}>Mentés</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
