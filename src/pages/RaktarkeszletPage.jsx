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
import { Warehouse, Search, Plus, Minus, History, PackagePlus } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { getAktivAnyagok, adjustAnyagKeszlet, TELEPITOI_KATEGORIAK } from "../lib/anyagtorzs.js";
import { addRaktarMozgas, getRaktarMozgasokRendezve, getRaktarMozgasokByAnyag, RAKTAR_MOZGAS_TIPUSOK } from "../lib/raktarMozgas.js";
import { getProjekt } from "../modules/projektek/projekt.service.js";
import { getCsapat } from "../modules/csapatok/csapat.service.js";
import { getWorkorder } from "../services/workorder.service.js";
import { formatMunkalapAzonosito } from "../lib/azonositoHelper.js";
import Card from "../components/Card.jsx";

const KAT_LABEL = Object.fromEntries(TELEPITOI_KATEGORIAK.map(k => [k.id, k.label]));

const MOZGAS_LABEL = {
  [RAKTAR_MOZGAS_TIPUSOK.KIADAS]:          { label: "Kiadás",          szin: C.danger },
  [RAKTAR_MOZGAS_TIPUSOK.KIADAS_KOREKCIO]: { label: "Kiadás-korrekció", szin: C.warning },
  [RAKTAR_MOZGAS_TIPUSOK.BEVETELEZES]:     { label: "Bevételezés",     szin: C.success },
  [RAKTAR_MOZGAS_TIPUSOK.KOREKCIO]:        { label: "Korrekció",       szin: C.muted },
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

export default function RaktarkeszletPage({ currentUser }) {
  const [tab, setTab] = useState("keszlet");
  const [kereses, setKereses] = useState("");
  const [nyitottAnyagId, setNyitottAnyagId] = useState(null);
  const [, forceUpdate] = useState(0);

  const anyagok = useMemo(() => getAktivAnyagok(), [tab, nyitottAnyagId]);
  const mozgasok = useMemo(() => getRaktarMozgasokRendezve(), [tab]);

  const szurtAnyagok = useMemo(() => {
    const q = kereses.trim().toLowerCase();
    if (!q) return anyagok;
    return anyagok.filter(a =>
      a.nev?.toLowerCase().includes(q) ||
      KAT_LABEL[a.telepitoi_kategoria]?.toLowerCase().includes(q)
    );
  }, [anyagok, kereses]);

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
      </div>

      <div style={{ position: "relative", marginBottom: 16, maxWidth: 360 }}>
        <Search size={14} color={C.muted} style={{ position: "absolute", left: 10, top: 10 }} />
        <input value={kereses} onChange={e => setKereses(e.target.value)} placeholder="Keresés anyag neve vagy kategória szerint…"
          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px 8px 32px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: FONT, outline: "none" }} />
      </div>

      {tab === "keszlet" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Megnevezés</th>
                <th style={th}>Kategória</th>
                <th style={{ ...th, textAlign: "right" }}>Készleten</th>
                <th style={{ ...th, width: 140 }}></th>
              </tr>
            </thead>
            <tbody>
              {szurtAnyagok.map(a => {
                const nyitott = nyitottAnyagId === a.id;
                return (
                  <Fragment key={a.id}>
                    <tr>
                      <td style={td}>{a.nev}</td>
                      <td style={td}>{KAT_LABEL[a.telepitoi_kategoria] || a.telepitoi_kategoria || "—"}</td>
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
                          <BevetelezesForm anyag={a} currentUser={currentUser} onDone={() => { setNyitottAnyagId(null); forceUpdate(n => n + 1); }} />
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
              {szurtAnyagok.length === 0 && (
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
