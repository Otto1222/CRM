/**
 * RaktarkeszletPage.jsx – Raktárkészlet (Fázis 6C)
 *
 * Két nézet:
 *   - Készlet: aktuális raktáron lévő mennyiség anyagonként, kézi
 *     bevételezés/korrekció lehetőséggel (ld. adjustAnyagKeszlet).
 *   - Mozgások: teljes audit napló – hova (projekt/munkalap/csapat), mennyi,
 *     mikor és melyik felhasználó adta ki / vette be (ld. raktarMozgas.js).
 *
 * A kiadás (csapatnak történő kiosztás) automatikusan csökkenti a
 * készletet és naplózza a mozgást – ld. kivitelezesiCsomag.service.js
 * updateKiadottMennyisegFromMunkalap. Itt csak a MEGJELENÍTÉS és a kézi
 * bevételezés/korrekció történik.
 */
import { Fragment, useMemo, useState } from "react";
import { Warehouse, Search, Plus, Minus, History, PackagePlus, Undo2, Check, X } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { getAktivAnyagok, adjustAnyagKeszlet, AJANLAT_KATEGORIAK, FVK_SAJAT } from "../lib/anyagtorzs.js";
import { loadFovallalkozok } from "../modules/fovallalkozok/fovallalkozo.service.js";
import { addRaktarMozgas, getRaktarMozgasokRendezve, getRaktarMozgasokByAnyag, RAKTAR_MOZGAS_TIPUSOK } from "../lib/raktarMozgas.js";
import { getFuggoVisszahozasok, approveVisszahozas, rejectVisszahozas } from "../modules/kivitelezesi_csomag/kivitelezesiCsomag.service.js";
import { getProjekt } from "../modules/projektek/projekt.service.js";
import { getCsapat } from "../modules/csapatok/csapat.service.js";
import { getWorkorder } from "../services/workorder.service.js";
import { formatMunkalapAzonosito } from "../lib/azonositoHelper.js";
import Card from "../components/Card.jsx";

// Termék-szintű kategorizálás (Fázis 6E) – ugyanaz a lista, mint az
// Árajánlat kategória, kiegészítve "Szolgáltatások"-kal – a Raktárkészlet
// oldal szándékosan NEM a telepítői kategóriákat használja (az túl szűk,
// csak szerelési kellékanyagra), hanem ezt a teljes termékkört lefedő
// listát (napelem, inverter, akku, kiegészítők, szolgáltatás is).
const KAT_LABEL = Object.fromEntries(AJANLAT_KATEGORIAK.map(k => [k.id, k.label]));
const EGYEB_KAT = "egyeb";
const KAT_SORREND = [...AJANLAT_KATEGORIAK.map(k => k.id), EGYEB_KAT];
KAT_LABEL[EGYEB_KAT] = "Egyéb / nincs kategória";

const MOZGAS_LABEL = {
  [RAKTAR_MOZGAS_TIPUSOK.KIADAS]:          { label: "Kiadás",          szin: C.danger },
  [RAKTAR_MOZGAS_TIPUSOK.KIADAS_KOREKCIO]: { label: "Kiadás-korrekció", szin: C.warning },
  [RAKTAR_MOZGAS_TIPUSOK.BEVETELEZES]:     { label: "Bevételezés",     szin: C.success },
  [RAKTAR_MOZGAS_TIPUSOK.KOREKCIO]:        { label: "Korrekció",       szin: C.muted },
  [RAKTAR_MOZGAS_TIPUSOK.VISSZAHOZAS]:     { label: "Visszahozás",     szin: C.success },
};

function hu(dt) {
  if (!dt) return "—";
  try { return new Date(dt).toLocaleString("hu-HU"); } catch { return dt; }
}

function mozgasHelye(m) {
  const reszek = [];
  if (m.projektId) {
    const p = getProjekt(m.projektId);
    if (p) reszek.push(`${p.projektkod || ""} ${p.nev || ""}`.trim());
  }
  if (m.munkalapId) {
    const ml = getWorkorder(m.munkalapId);
    if (ml) reszek.push(formatMunkalapAzonosito(ml));
  }
  if (m.csapatId) {
    const cs = getCsapat(m.csapatId);
    if (cs) reszek.push(`👷 ${cs.nev}`);
  }
  return reszek.length > 0 ? reszek.join(" · ") : "—";
}

// ─── Bevételezés / korrekció inline form ───────────────────────
function BevetelezesForm({ anyag, onDone, currentUser }) {
  const [menny, setMenny] = useState("");
  const [megjegyzes, setMegjegyzes] = useState("");
  const [hiba, setHiba] = useState("");

  function handle(irany) {
    const m = Number(menny);
    if (!m || m <= 0) { setHiba("Adj meg egy pozitív mennyiséget."); return; }
    const delta = irany === "be" ? m : -m;
    adjustAnyagKeszlet(anyag.id, delta);
    addRaktarMozgas({
      anyagtorzsId: anyag.id, anyagNev: anyag.nev, egyseg: anyag.egyseg,
      mennyiseg: -delta, // a napló előjele a kiadás-szemléletet követi (pozitív = csökkenés)
      tipus: irany === "be" ? RAKTAR_MOZGAS_TIPUSOK.BEVETELEZES : RAKTAR_MOZGAS_TIPUSOK.KOREKCIO,
      felhasznaloNev: currentUser?.name || currentUser?.nev || "",
      megjegyzes,
    });
    setMenny(""); setMegjegyzes(""); setHiba("");
    onDone();
  }

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
      <input type="number" min="0" step="any" value={menny} onChange={e => setMenny(e.target.value)}
        placeholder="Mennyiség" style={{ width: 100, padding: "6px 9px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: FONT }} />
      <input value={megjegyzes} onChange={e => setMegjegyzes(e.target.value)}
        placeholder="Megjegyzés (pl. beszállítói számla)" style={{ flex: 1, minWidth: 160, padding: "6px 9px", border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: FONT }} />
      <button type="button" onClick={() => handle("be")}
        style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: C.successLight, color: C.success, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: FONT }}>
        <Plus size={12} /> Bevételezés
      </button>
      <button type="button" onClick={() => handle("ki")}
        style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 12px", background: C.dangerLight, color: C.danger, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: FONT }}>
        <Minus size={12} /> Korrekció (csökkentés)
      </button>
      {hiba && <span style={{ fontSize: 11, color: C.danger }}>{hiba}</span>}
    </div>
  );
}

// ─── Visszahozás jóváhagyás (PM / Raktár) ───────────────────────
// A telepítő csak bejelenti, mennyit hoz vissza – ide csak akkor kerül egy
// sor jóváhagyásra "készen", ha a munkalapot a telepítő csapat már lezárta
// (ld. kivitelezesiCsomag.service.js approveVisszahozas dokumentációja).
function VisszahozasJovahagyasTab({ currentUser, refreshKey, onChanged }) {
  const [hiba, setHiba] = useState("");
  const [sorErrors, setSorErrors] = useState({});

  const sorok = useMemo(() => {
    return getFuggoVisszahozasok().map(v => {
      const munkalap = getWorkorder(v.munkalapId);
      const projekt  = getProjekt(v.projektId);
      return {
        ...v,
        munkalap,
        projekt,
        lezarva: !!munkalap?.lezarva,
      };
    }).sort((a, b) => (b.jelentveAt || "").localeCompare(a.jelentveAt || ""));
  }, [refreshKey]);

  function handleJovahagy(sor) {
    setHiba(""); setSorErrors(p => ({ ...p, [sor.munkalapId + sor.tetelId]: "" }));
    try {
      approveVisszahozas(sor.csomagId, sor.tetelId, sor.munkalapId, currentUser?.name || "", sor.lezarva, sor.munkalap?.csapatId || null);
      onChanged();
    } catch (err) {
      setSorErrors(p => ({ ...p, [sor.munkalapId + sor.tetelId]: err.message || "Jóváhagyás sikertelen." }));
    }
  }

  function handleElutasit(sor) {
    if (!confirm(`Biztosan elutasítod ezt a visszahozási bejelentést (${sor.anyagNev}, ${sor.visszahozottMenny} ${sor.egyseg})? A raktárkészletet nem módosítja.`)) return;
    setHiba(""); setSorErrors(p => ({ ...p, [sor.munkalapId + sor.tetelId]: "" }));
    try {
      rejectVisszahozas(sor.csomagId, sor.tetelId, sor.munkalapId, currentUser?.name || "");
      onChanged();
    } catch (err) {
      setSorErrors(p => ({ ...p, [sor.munkalapId + sor.tetelId]: err.message || "Elutasítás sikertelen." }));
    }
  }

  const th = { textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1.5px solid ${C.border}` };
  const td = { padding: "8px 10px", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.bg}` };

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      {hiba && <p style={{ fontSize: 12, color: C.danger, fontWeight: 700, padding: "10px 14px", margin: 0 }}>{hiba}</p>}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Bejelentve</th>
              <th style={th}>Anyag</th>
              <th style={{ ...th, textAlign: "right" }}>Mennyiség</th>
              <th style={th}>Projekt</th>
              <th style={th}>Munkalap</th>
              <th style={th}>Csapat</th>
              <th style={th}>Állapot</th>
              <th style={{ ...th, width: 180 }}></th>
            </tr>
          </thead>
          <tbody>
            {sorok.map(sor => {
              const csapat = sor.munkalap?.csapatId ? getCsapat(sor.munkalap.csapatId) : null;
              const key = sor.munkalapId + sor.tetelId;
              return (
                <tr key={key}>
                  <td style={td}>{hu(sor.jelentveAt)}</td>
                  <td style={td}>{sor.anyagNev}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{sor.visszahozottMenny} {sor.egyseg}</td>
                  <td style={td}>{sor.projekt ? `${sor.projekt.projektkod || ""} ${sor.projekt.nev || ""}`.trim() : "—"}</td>
                  <td style={td}>{sor.munkalap ? formatMunkalapAzonosito(sor.munkalap) : "—"}</td>
                  <td style={td}>{csapat?.nev || "—"}</td>
                  <td style={td}>
                    {sor.lezarva ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.accent, background: C.accentLight, borderRadius: 6, padding: "2px 8px" }}>Jóváhagyásra kész</span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, background: C.bg, borderRadius: 6, padding: "2px 8px" }}>Munkalap még nincs lezárva</span>
                    )}
                    {sorErrors[key] && <div style={{ fontSize: 11, color: C.danger, marginTop: 4 }}>{sorErrors[key]}</div>}
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    {sor.lezarva && (
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button type="button" onClick={() => handleJovahagy(sor)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", background: C.successLight, color: C.success, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: FONT }}>
                          <Check size={12} /> Jóváhagyás
                        </button>
                        <button type="button" onClick={() => handleElutasit(sor)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", background: C.dangerLight, color: C.danger, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: FONT }}>
                          <X size={12} /> Elutasítás
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {sorok.length === 0 && (
              <tr><td colSpan={8} style={{ ...td, textAlign: "center", color: C.muted }}>Nincs jóváhagyásra váró visszahozott anyag.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function RaktarkeszletPage({ currentUser }) {
  const [tab, setTab] = useState("keszlet");
  const [kereses, setKereses] = useState("");
  const [szuroKat, setSzuroKat] = useState("mind");
  const [szuroBeszallito, setSzuroBeszallito] = useState("mind");
  const [nyitottAnyagId, setNyitottAnyagId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const forceUpdate = () => setRefreshKey(n => n + 1);

  // Fővállalkozónkénti raktár-elkülönítés – "Saját munka" + minden aktív
  // fővállalkozó saját, egymástól független készlete (ld. anyagtorzs.js
  // FVK_SAJAT / tulajdonosId). A "Mozgások" és "Visszahozás jóváhagyás" fül
  // szándékosan a TELJES naplót mutatja (tulajdonostól függetlenül), mert
  // az egy adott projekt/munkalap/csapat felől nézve amúgy is egyértelmű,
  // csak a "Készlet" fül tétel-listáját szűrjük.
  const fovallalkozok = useMemo(() => loadFovallalkozok().filter(f => f.aktiv !== false), []);
  const [szuroTulajdonos, setSzuroTulajdonos] = useState(FVK_SAJAT);

  const anyagok = useMemo(
    () => getAktivAnyagok().filter(a => (a.tulajdonosId || FVK_SAJAT) === szuroTulajdonos),
    [tab, nyitottAnyagId, refreshKey, szuroTulajdonos]
  );
  const mozgasok = useMemo(() => getRaktarMozgasokRendezve(), [tab, refreshKey]);
  const fuggoVisszahozasokDb = useMemo(() => getFuggoVisszahozasok().length, [refreshKey]);

  // Beszállítók – dinamikusan az anyagtörzsben ténylegesen szereplő,
  // kitöltött beszallito mezőkből épül fel, nem előre felsorolt lista.
  const beszallitok = useMemo(() => {
    const set = new Set(anyagok.map(a => a.beszallito?.trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "hu"));
  }, [anyagok]);

  const szurtAnyagok = useMemo(() => {
    const q = kereses.trim().toLowerCase();
    return anyagok.filter(a => {
      if (szuroKat !== "mind" && (a.kategoria || EGYEB_KAT) !== szuroKat) return false;
      if (szuroBeszallito !== "mind" && (a.beszallito || "").trim() !== szuroBeszallito) return false;
      if (!q) return true;
      return a.nev?.toLowerCase().includes(q) ||
        KAT_LABEL[a.kategoria]?.toLowerCase().includes(q) ||
        a.beszallito?.toLowerCase().includes(q);
    });
  }, [anyagok, kereses, szuroKat, szuroBeszallito]);

  // Kategóriánkénti csoportosítás (Fázis 6E) – a lista fixen a KAT_SORREND
  // sorrendjében jelenik meg, üres kategóriák nem jelennek meg soha.
  const csoportok = useMemo(() => {
    const map = new Map();
    for (const a of szurtAnyagok) {
      const kat = a.kategoria || EGYEB_KAT;
      if (!map.has(kat)) map.set(kat, []);
      map.get(kat).push(a);
    }
    return KAT_SORREND
      .filter(kat => map.has(kat))
      .map(kat => ({ kat, label: KAT_LABEL[kat] || kat, tetelek: map.get(kat) }));
  }, [szurtAnyagok]);

  const th = { textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1.5px solid ${C.border}` };
  const td = { padding: "8px 10px", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.bg}` };

  return (
    <div style={{ padding: "28px 32px", fontFamily: FONT }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Warehouse size={22} color={C.accent} />
        <h2 style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Raktárkészlet</h2>
      </div>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
        Aktuális készlet anyagonként, és teljes mozgásnapló – hova, mennyi, mikor és ki adott ki / vett be anyagot.
      </p>

      <div style={{ display: "flex", gap: 4, marginBottom: 18, background: C.bg, padding: 4, borderRadius: 12, width: "fit-content" }}>
        <button onClick={() => setTab("keszlet")} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: tab === "keszlet" ? "#fff" : "transparent", color: tab === "keszlet" ? C.text : C.muted, fontWeight: tab === "keszlet" ? 700 : 400, fontSize: 14, cursor: "pointer", fontFamily: FONT }}>
          Készlet
        </button>
        <button onClick={() => setTab("mozgasok")} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: tab === "mozgasok" ? "#fff" : "transparent", color: tab === "mozgasok" ? C.text : C.muted, fontWeight: tab === "mozgasok" ? 700 : 400, fontSize: 14, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 6 }}>
          <History size={14} /> Mozgások ({mozgasok.length})
        </button>
        <button onClick={() => setTab("visszahozas")} style={{ padding: "8px 18px", borderRadius: 9, border: "none", background: tab === "visszahozas" ? "#fff" : "transparent", color: tab === "visszahozas" ? C.text : C.muted, fontWeight: tab === "visszahozas" ? 700 : 400, fontSize: 14, cursor: "pointer", fontFamily: FONT, display: "flex", alignItems: "center", gap: 6 }}>
          <Undo2 size={14} /> Visszahozás jóváhagyás {fuggoVisszahozasokDb > 0 && `(${fuggoVisszahozasokDb})`}
        </button>
      </div>

      {tab !== "visszahozas" && (
        <div style={{ position: "relative", marginBottom: 16, maxWidth: 360 }}>
          <Search size={14} color={C.muted} style={{ position: "absolute", left: 10, top: 10 }} />
          <input value={kereses} onChange={e => setKereses(e.target.value)} placeholder="Keresés anyag neve, kategória vagy beszállító szerint…"
            style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px 8px 32px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: FONT, outline: "none" }} />
        </div>
      )}

      {tab === "keszlet" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 12 }}>
          {[{ id: FVK_SAJAT, nev: "Saját munka" }, ...fovallalkozok.map(f => ({ id: f.id, nev: f.nev }))].map(t => (
            <button key={t.id || "sajat"} onClick={() => setSzuroTulajdonos(t.id)}
              style={{ padding: "6px 13px", borderRadius: 20, border: `1.5px solid ${szuroTulajdonos === t.id ? C.accent : C.border}`,
                background: szuroTulajdonos === t.id ? C.accent : "#fff", color: szuroTulajdonos === t.id ? "#fff" : C.textSub,
                cursor: "pointer", fontSize: 13, fontFamily: FONT, fontWeight: szuroTulajdonos === t.id ? 700 : 500 }}>
              {t.nev}
            </button>
          ))}
        </div>
      )}

      {tab === "keszlet" && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {[{ id: "mind", label: "Mind" }, ...KAT_SORREND.map(k => ({ id: k, label: KAT_LABEL[k] || k }))].map(k => (
              <button key={k.id} onClick={() => setSzuroKat(k.id)}
                style={{ padding: "5px 11px", borderRadius: 20, border: `1.5px solid ${szuroKat === k.id ? C.accent : C.border}`,
                  background: szuroKat === k.id ? C.accent : "#fff", color: szuroKat === k.id ? "#fff" : C.textSub,
                  cursor: "pointer", fontSize: 12, fontFamily: FONT, fontWeight: szuroKat === k.id ? 700 : 400 }}>
                {k.label}
              </button>
            ))}
          </div>
          {beszallitok.length > 0 && (
            <select value={szuroBeszallito} onChange={e => setSzuroBeszallito(e.target.value)}
              style={{ padding: "6px 10px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 12, fontFamily: FONT, color: C.textSub, background: "#fff" }}>
              <option value="mind">Minden beszállító</option>
              {beszallitok.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
        </div>
      )}

      {tab === "visszahozas" && (
        <VisszahozasJovahagyasTab currentUser={currentUser} refreshKey={refreshKey} onChanged={forceUpdate} />
      )}

      {tab === "keszlet" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Megnevezés</th>
                <th style={th}>Beszállító</th>
                <th style={{ ...th, textAlign: "right" }}>Készleten</th>
                <th style={{ ...th, width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {csoportok.map(g => (
                <Fragment key={g.kat}>
                  <tr>
                    <td colSpan={4} style={{ padding: "9px 10px", background: C.bg, fontSize: 12, fontWeight: 700, color: C.textSub, borderBottom: `1px solid ${C.border}` }}>
                      {g.label} <span style={{ fontWeight: 400, color: C.muted }}>({g.tetelek.length})</span>
                    </td>
                  </tr>
                  {g.tetelek.map(a => {
                    const nyitott = nyitottAnyagId === a.id;
                    return (
                      <Fragment key={a.id}>
                        <tr>
                          <td style={td}>{a.nev}</td>
                          <td style={td}>{a.beszallito || "—"}</td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 700, color: (Number(a.keszlet) || 0) <= 0 ? C.danger : C.text }}>
                            {a.keszlet ?? 0} {a.egyseg}
                          </td>
                          <td style={{ ...td, textAlign: "right" }}>
                            <button type="button" onClick={() => setNyitottAnyagId(nyitott ? null : a.id)}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 10px", background: nyitott ? C.accentLight : C.bg, color: nyitott ? C.accent : C.textSub, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: FONT }}>
                              <PackagePlus size={12} /> Bevételezés / korrekció
                            </button>
                          </td>
                        </tr>
                        {nyitott && (
                          <tr>
                            <td colSpan={4} style={{ ...td, background: C.bg }}>
                              <BevetelezesForm anyag={a} currentUser={currentUser} onDone={() => { setNyitottAnyagId(null); forceUpdate(); }} />
                              <div style={{ marginTop: 10 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 6px" }}>Legutóbbi mozgások</p>
                                {getRaktarMozgasokByAnyag(a.id).slice(0, 5).map(m => (
                                  <div key={m.id} style={{ fontSize: 12, color: C.textSub, padding: "3px 0" }}>
                                    {hu(m.datum)} · <span style={{ color: MOZGAS_LABEL[m.tipus]?.szin || C.text, fontWeight: 700 }}>{MOZGAS_LABEL[m.tipus]?.label || m.tipus}</span> · {Math.abs(m.mennyiseg)} {m.egyseg} · {mozgasHelye(m)} · {m.felhasznaloNev || "—"}
                                  </div>
                                ))}
                                {getRaktarMozgasokByAnyag(a.id).length === 0 && (
                                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>Még nincs rögzített mozgás ehhez az anyaghoz.</p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </Fragment>
              ))}
              {csoportok.length === 0 && (
                <tr><td colSpan={4} style={{ ...td, textAlign: "center", color: C.muted }}>Nincs találat.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      )}

      {tab === "mozgasok" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Dátum</th>
                  <th style={th}>Anyag</th>
                  <th style={th}>Típus</th>
                  <th style={{ ...th, textAlign: "right" }}>Mennyiség</th>
                  <th style={th}>Hova</th>
                  <th style={th}>Felhasználó</th>
                  <th style={th}>Megjegyzés</th>
                </tr>
              </thead>
              <tbody>
                {mozgasok
                  .filter(m => !kereses.trim() || m.anyagNev?.toLowerCase().includes(kereses.trim().toLowerCase()))
                  .map(m => (
                    <tr key={m.id}>
                      <td style={td}>{hu(m.datum)}</td>
                      <td style={td}>{m.anyagNev}</td>
                      <td style={{ ...td, color: MOZGAS_LABEL[m.tipus]?.szin || C.text, fontWeight: 700 }}>{MOZGAS_LABEL[m.tipus]?.label || m.tipus}</td>
                      <td style={{ ...td, textAlign: "right" }}>{m.mennyiseg > 0 ? "−" : "+"}{Math.abs(m.mennyiseg)} {m.egyseg}</td>
                      <td style={td}>{mozgasHelye(m)}</td>
                      <td style={td}>{m.felhasznaloNev || "—"}</td>
                      <td style={td}>{m.megjegyzes || "—"}</td>
                    </tr>
                  ))}
                {mozgasok.length === 0 && (
                  <tr><td colSpan={7} style={{ ...td, textAlign: "center", color: C.muted }}>Még nincs rögzített raktármozgás.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
