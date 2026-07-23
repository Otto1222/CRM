/**
 * AnyagszamitoPanel.jsx
 * Anyagszámítási Motor UI – TS-3 bővítés.
 *
 * Tetőtípus-alapú kalkulátor:
 *   - Cseréptető: soronkénti állított/fektetett elrendezés + méretparaméterek
 *   - Lemeztető/minisín: soronkénti panel db (elrendezés nélkül)
 *   - Régi egyszerű: napelem darabszám alapú fallback (backward compat)
 *
 * A számítási logika a anyagSzamito.service.js-ben él – ez a komponens
 * csak a bemeneti űrlapot, az előnézetet és a jóváhagyási lépést kezeli.
 */
import { useState } from "react";
import { Calculator, Plus, Trash2 } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../../lib/constants.js";
import { addAnyagszamitoTetelekToKivitelezesiCsomag } from "../../kivitelezesi_csomag/kivitelezesiCsomag.service.js";
import { generateAnyagszamitas, makeUresAnyagszamitoBemenet } from "../../../services/anyagSzamito.service.js";
import {
  getAnyagelszamolasiModConfig,
  csakMennyisegiElszamolasAModban,
  anyagHasznotKellSzamolniAModban,
} from "../../../lib/workflowRules.js";

const th = { textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1.5px solid ${C.border}` };
const td = { padding: "8px 10px", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.bg}` };
const inp = { padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: FONT, color: C.text, width: "100%", boxSizing: "border-box" };
const lbl = { display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: C.muted, fontFamily: FONT };

const TETOTIPUS_OPCIOK = [
  { value: "",                  label: "Régi egyszerű számítás / nincs megadva" },
  { value: "cserepteto",        label: "Cseréptető" },
  { value: "lemezteto_minisin", label: "Lemeztető / minisín" },
];

const CSERPETO_MERETMEZOK = [
  { key: "panelMagassag",      label: "Panel magasság" },
  { key: "panelSzelesseg",     label: "Panel szélesség" },
  { key: "sinHossz",           label: "Sínhossz" },
  { key: "szarufaTavolsag",    label: "Szarufatáv." },
  { key: "leszoritoSzelesseg", label: "Leszorító szél." },
];

const EGYEB_MEZOK = [
  { key: "inverterDarabszam",     label: "Inverter db" },
  { key: "akkuDarabszam",         label: "Akku db" },
  { key: "smartMeterDarabszam",   label: "Smart meter db" },
  { key: "optimalizaloDarabszam", label: "Optimalizáló db" },
];

export default function AnyagszamitoPanel({ csomag, currentUser, onCsomagFrissult, anyagelszamolasiMod }) {
  const [nyitva, setNyitva]     = useState(false);
  const [bemenet, setBemenet]   = useState(() => makeUresAnyagszamitoBemenet());
  const [elonezet, setElonezet] = useState(null);
  const [eredmeny, setEredmeny] = useState(null);
  const [hiba, setHiba]         = useState("");

  const anyagCfg       = getAnyagelszamolasiModConfig(anyagelszamolasiMod);
  const csakMennyisegi = csakMennyisegiElszamolasAModban(anyagelszamolasiMod);
  const vanAnyaghaszon = anyagHasznotKellSzamolniAModban(anyagelszamolasiMod);

  function upd(key, val) {
    setBemenet(prev => ({ ...prev, [key]: val }));
  }

  // Tetőtípus váltás: visszaállítja a sorok-at, megőrzi egyéb értékeket
  function handleTetotipusValtas(uj) {
    setBemenet(prev => ({
      ...makeUresAnyagszamitoBemenet(),
      inverterDarabszam:     prev.inverterDarabszam,
      akkuDarabszam:         prev.akkuDarabszam,
      smartMeterDarabszam:   prev.smartMeterDarabszam,
      optimalizaloDarabszam: prev.optimalizaloDarabszam,
      leszoritoMod:          prev.leszoritoMod,
      tetotipus:             uj,
      sorok:                 uj ? [{ elrendezes: "allitott", panelDb: 0 }] : [],
      napelemDarabszam:      0,
    }));
    setElonezet(null);
    setEredmeny(null);
    setHiba("");
  }

  function sorHozzaad() {
    setBemenet(prev => ({
      ...prev,
      sorok: [...prev.sorok, { elrendezes: "allitott", panelDb: 0 }],
    }));
  }

  function sorTorol(idx) {
    setBemenet(prev => {
      const ujSorok = prev.sorok.filter((_, i) => i !== idx);
      return {
        ...prev,
        sorok:            ujSorok,
        napelemDarabszam: ujSorok.reduce((s, r) => s + (Number(r.panelDb) || 0), 0),
      };
    });
  }

  function sorFrissit(idx, key, val) {
    setBemenet(prev => {
      const ujSorok = prev.sorok.map((r, i) => i === idx ? { ...r, [key]: val } : r);
      return {
        ...prev,
        sorok:            ujSorok,
        napelemDarabszam: ujSorok.reduce((s, r) => s + (Number(r.panelDb) || 0), 0),
      };
    });
  }

  function handleGeneralas(e) {
    e.preventDefault();
    setHiba("");
    setEredmeny(null);
    setElonezet(generateAnyagszamitas(bemenet));
  }

  function handleJovahagyas() {
    setHiba("");
    try {
      const { csomag: updated, hozzaadva, duplikalt } = addAnyagszamitoTetelekToKivitelezesiCsomag(
        csomag.id,
        elonezet?.anyaglista || [],
        currentUser?.name || ""
      );
      onCsomagFrissult(updated);
      setEredmeny({ hozzaadva, duplikalt });
      setElonezet(null);
    } catch (err) {
      setHiba(err.message || "Az anyaglista beillesztése sikertelen.");
    }
  }

  const tetotipus    = bemenet.tetotipus || "";
  const leszoritoMod = bemenet.leszoritoMod || "univerzalis";
  const vanTetotipus = tetotipus !== "";
  const isCserep     = tetotipus === "cserepteto";
  const panelOsszeg  = bemenet.sorok.reduce((s, r) => s + (Number(r.panelDb) || 0), 0);

  return (
    <div style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 18 }}>

      {/* Fejléc */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: "0 0 4px", fontFamily: FONT_HEADING }}>
            Anyagszámítási Motor – anyaglista generálása
          </p>
          <p style={{ fontSize: 12, color: C.muted, margin: 0, fontFamily: FONT }}>
            A motor a megadott műszaki adatokból előzetes anyaglistát számol – a tételek csak jóváhagyás után kerülnek a csomagba.
          </p>
        </div>
        <button type="button" onClick={() => setNyitva(v => !v)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: `1.5px solid ${C.accent}`, background: nyitva ? C.accent : "#fff", color: nyitva ? "#fff" : C.accent, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
          <Calculator size={14} /> Anyaglista generálása
        </button>
      </div>

      {nyitva && (
        <div style={{ marginTop: 14 }}>
          <form onSubmit={handleGeneralas}>

            {/* ── 1. Tetőtípus + leszorítómód ───────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", marginBottom: 14 }}>
              <label style={lbl}>
                TETŐTÍPUS
                <select value={tetotipus} onChange={e => handleTetotipusValtas(e.target.value)}
                  style={{ ...inp, background: "#fff" }}>
                  {TETOTIPUS_OPCIOK.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>

              {vanTetotipus && (
                <label style={lbl}>
                  LESZORÍTÓ MÓD
                  <select value={leszoritoMod} onChange={e => upd("leszoritoMod", e.target.value)}
                    style={{ ...inp, background: "#fff" }}>
                    <option value="univerzalis">Univerzális leszorító</option>
                    <option value="kulon">Külön köztes + végleszorító</option>
                  </select>
                </label>
              )}
            </div>

            {/* ── 2. Régi egyszerű mód ───────────────────────────────────────── */}
            {!vanTetotipus && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ ...lbl, width: 150 }}>
                  NAPELEM DARABSZÁM
                  <input type="number" min="0" value={bemenet.napelemDarabszam}
                    onChange={e => upd("napelemDarabszam", e.target.value)}
                    style={{ ...inp, width: 150 }} />
                </label>
              </div>
            )}

            {/* ── 3. Cseréptető méretparaméterek ────────────────────────────── */}
            {isCserep && (
              <div style={{ background: C.accentLight, border: `1.5px solid ${C.accentLight}`, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 10px" }}>
                  Méretparaméterek (mm)
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px 12px" }}>
                  {CSERPETO_MERETMEZOK.map(m => (
                    <label key={m.key} style={lbl}>
                      {m.label.toUpperCase()}
                      <input type="number" min="0" value={bemenet[m.key]}
                        onChange={e => upd(m.key, e.target.value)}
                        style={inp} />
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* ── 4. Soronkénti kiosztás ────────────────────────────────────── */}
            {vanTetotipus && (
              <div style={{ background: C.successLight, border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.success, textTransform: "uppercase", letterSpacing: 0.7, margin: 0 }}>
                    Soronkénti kiosztás
                    {panelOsszeg > 0 && (
                      <span style={{ fontWeight: 600, color: C.success, marginLeft: 8, textTransform: "none", letterSpacing: 0 }}>
                        – összesen {panelOsszeg} panel
                      </span>
                    )}
                  </p>
                  <button type="button" onClick={sorHozzaad}
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: `1.5px solid ${C.success}`, background: "#fff", color: C.success, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
                    <Plus size={12} /> Sor
                  </button>
                </div>

                {bemenet.sorok.length === 0 ? (
                  <p style={{ fontSize: 12, color: C.muted, margin: 0, fontFamily: FONT }}>
                    Kattints a „+ Sor" gombra az első sor hozzáadásához.
                  </p>
                ) : (
                  <div>
                    {/* Fejléc sor */}
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4, paddingLeft: 30 }}>
                      {isCserep && (
                        <span style={{ ...lbl, minWidth: 140, fontSize: 10 }}>ELRENDEZÉS</span>
                      )}
                      <span style={{ ...lbl, width: 100, fontSize: 10 }}>PANEL DB</span>
                    </div>

                    {bemenet.sorok.map((sor, idx) => (
                      <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, minWidth: 22, textAlign: "right" }}>
                          {idx + 1}.
                        </span>

                        {isCserep && (
                          <select
                            value={sor.elrendezes || "allitott"}
                            onChange={e => sorFrissit(idx, "elrendezes", e.target.value)}
                            style={{ ...inp, minWidth: 140, width: 140, background: "#fff" }}>
                            <option value="allitott">Állított</option>
                            <option value="fektetett">Fektetett</option>
                          </select>
                        )}

                        <input
                          type="number" min="0"
                          value={sor.panelDb}
                          onChange={e => sorFrissit(idx, "panelDb", e.target.value)}
                          style={{ ...inp, width: 100 }} />

                        <button type="button" onClick={() => sorTorol(idx)}
                          disabled={bemenet.sorok.length <= 1}
                          title="Sor törlése"
                          style={{ padding: "7px 9px", borderRadius: 7, border: `1.5px solid ${C.border}`, background: "#fff", color: bemenet.sorok.length <= 1 ? C.border : C.danger, cursor: bemenet.sorok.length <= 1 ? "default" : "pointer", display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── 5. Egyéb tételek (mindig látható) ────────────────────────── */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 14 }}>
              {EGYEB_MEZOK.map(m => (
                <label key={m.key} style={{ ...lbl, width: 120 }}>
                  {m.label.toUpperCase()}
                  <input type="number" min="0" value={bemenet[m.key]}
                    onChange={e => upd(m.key, e.target.value)}
                    style={{ ...inp, width: 120 }} />
                </label>
              ))}
            </div>

            {/* ── 6. Számítás gomb ─────────────────────────────────────────── */}
            <button type="submit"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
              Számítás
            </button>
          </form>

          {/* ── Előnézet ──────────────────────────────────────────────────── */}
          {elonezet && (
            <div style={{ marginTop: 16, background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: "0 0 10px", fontFamily: FONT_HEADING }}>
                Előnézet – jóváhagyás előtt még nem kerül a csomagba
              </p>
              <p style={{ fontSize: 12, fontWeight: 600, color: anyagCfg.color, margin: "0 0 10px", fontFamily: FONT }}>
                {csakMennyisegi
                  ? `ℹ️ ${anyagCfg.label}: a jóváhagyott tételek csak mennyiségi elszámolásra kerülnek be – ár és anyaghaszon nem számít bele a profitba.`
                  : vanAnyaghaszon
                    ? `ℹ️ ${anyagCfg.label}: a jóváhagyott tételek a normál anyagárral és anyaghaszon-számítással kerülnek a csomagba.`
                    : `ℹ️ ${anyagCfg.label}: a jóváhagyott tételek árral kerülnek be, de az anyaghaszon ebben a módban rögzítetten 0 Ft.`}
              </p>

              {elonezet.anyaglista.length === 0 ? (
                <p style={{ fontSize: 12, color: C.muted, fontFamily: FONT }}>
                  A megadott adatok alapján egyetlen tétel sem generálódott.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT }}>
                    <thead>
                      <tr>
                        <th style={th}>Megnevezés</th>
                        <th style={th}>Kategória</th>
                        <th style={th}>Egység</th>
                        <th style={{ ...th, textAlign: "right" }}>Számolt mennyiség</th>
                        <th style={th}>Megjegyzés</th>
                      </tr>
                    </thead>
                    <tbody>
                      {elonezet.anyaglista.map((sor, i) => (
                        <tr key={`${sor.anyagtorzs_id}_${i}`}>
                          <td style={{ ...td, fontWeight: 600 }}>{sor.megnevezes}</td>
                          <td style={td}>{sor.kategoria || "—"}</td>
                          <td style={td}>{sor.egyseg}</td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{sor.szamoltMennyiseg}</td>
                          <td style={{ ...td, color: C.muted, fontSize: 12 }}>{sor.megjegyzes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {elonezet.figyelmeztetes && (
                <p style={{ fontSize: 12, color: C.warning, fontWeight: 700, margin: "12px 0 0" }}>
                  ⚠️ {elonezet.figyelmeztetes}
                </p>
              )}
              {elonezet.hianyzoAnyagok.length > 0 && (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: C.muted, fontFamily: FONT }}>
                  {elonezet.hianyzoAnyagok.map((h, i) => (
                    <li key={i}>
                      {h.leiras} (anyagtörzs id: {h.anyagtorzsId}) – számolt: {h.szamoltMennyiseg} – nincs az anyagtörzsben, nem generálódott sor
                    </li>
                  ))}
                </ul>
              )}

              {elonezet.anyaglista.length > 0 && (
                <button type="button" onClick={handleJovahagyas}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, padding: "9px 16px", borderRadius: 8, border: "none", background: C.success, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
                  <Plus size={14} /> Jóváhagyás és hozzáadás a csomaghoz
                </button>
              )}
            </div>
          )}

          {eredmeny && (
            <p style={{ fontSize: 12, color: C.success, fontWeight: 700, margin: "12px 0 0", fontFamily: FONT }}>
              ✅ {eredmeny.hozzaadva.length} tétel hozzáadva a csomaghoz
              {eredmeny.duplikalt.length > 0 && ` – ${eredmeny.duplikalt.length} tétel már szerepelt a csomagban (kihagyva)`}.
            </p>
          )}
          {hiba && (
            <p style={{ fontSize: 12, color: C.danger, fontWeight: 700, margin: "12px 0 0" }}>{hiba}</p>
          )}
        </div>
      )}
    </div>
  );
}