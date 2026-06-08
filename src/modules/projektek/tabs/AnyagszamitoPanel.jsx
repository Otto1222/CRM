/**
 * AnyagszamitoPanel.jsx
 * Anyagszámítási Motor – előnézet és jóváhagyás (Fázis 5A).
 *
 * Önálló UI-komponens, amelyet a TabKivitelezesiCsomag a Kivitelezési
 * Csomag fülön jelenít meg. A számítási logika a külön
 * src/services/anyagSzamito.service.js-ben él – ez a komponens csak
 * a bemeneti űrlapot, az előnézetet és a jóváhagyási lépést kezeli.
 *
 * Folyamat: Számítás → előnézet (még NEM kerül a csomagba) →
 * PM jóváhagyás → addAnyagszamitoTetelekToKivitelezesiCsomag
 * (nem destruktív, duplikáció-védett beillesztés).
 */
import { useState } from "react";
import { Calculator, Plus } from "lucide-react";
import { FONT, FONT_HEADING } from "../../../lib/constants.js";
import { addAnyagszamitoTetelekToKivitelezesiCsomag } from "../../kivitelezesi_csomag/kivitelezesiCsomag.service.js";
import { generateAnyagszamitas, makeUresAnyagszamitoBemenet } from "../../../services/anyagSzamito.service.js";
import {
  getAnyagelszamolasiModConfig,
  csakMennyisegiElszamolasAModban,
  anyagHasznotKellSzamolniAModban,
} from "../../../lib/workflowRules.js";

const th = { textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1.5px solid #E2E8F0" };
const td = { padding: "8px 10px", fontSize: 13, color: "#0F172A", borderBottom: "1px solid #F1F5F9" };
const inputStyle = { padding: "7px 10px", borderRadius: 7, border: "1.5px solid #E2E8F0", fontSize: 13, fontFamily: FONT, color: "#0F172A" };

// Az Anyagszámítási Motor bemeneti mezői (Fázis 5A spec 2. pont) – egy
// helyen felsorolva, hogy az űrlap és a bemeneti adatmodell ne térjen el.
const ANYAGSZAMITO_MEZOK = [
  { key: "napelemDarabszam",      label: "Napelem darabszám",      tipus: "szam" },
  { key: "tetotipus",             label: "Tetőtípus",              tipus: "szoveg" },
  { key: "tartoszerkezetTipus",   label: "Tartószerkezet típus",   tipus: "szoveg" },
  { key: "inverterDarabszam",     label: "Inverter darabszám",     tipus: "szam" },
  { key: "akkuDarabszam",         label: "Akku darabszám",         tipus: "szam" },
  { key: "smartMeterDarabszam",   label: "Smart meter darabszám",  tipus: "szam" },
  { key: "optimalizaloDarabszam", label: "Optimalizáló darabszám", tipus: "szam" },
];

export default function AnyagszamitoPanel({ csomag, currentUser, onCsomagFrissult, anyagelszamolasiMod }) {
  const [nyitva, setNyitva]     = useState(false);
  const [bemenet, setBemenet]   = useState(() => makeUresAnyagszamitoBemenet());
  const [elonezet, setElonezet] = useState(null);
  const [eredmeny, setEredmeny] = useState(null);
  const [hiba, setHiba]         = useState("");

  // Fázis 5B P0-1 javítás – a generált anyaglista sorsa a projekt
  // anyagelszámolási módjától függ: a mód itt dönti el, hogy a PM
  // milyen tájékoztatást kapjon a jóváhagyás előtt (ld. workflowRules.js).
  const anyagCfg = getAnyagelszamolasiModConfig(anyagelszamolasiMod);
  const csakMennyisegi = csakMennyisegiElszamolasAModban(anyagelszamolasiMod);
  const vanAnyaghaszon = anyagHasznotKellSzamolniAModban(anyagelszamolasiMod);

  function handleMezoValtoztatas(kulcs, ertek) {
    setBemenet(prev => ({ ...prev, [kulcs]: ertek }));
  }

  // Csak SZÁMOL – nem ír a csomagba. Az eredmény előnézetként jelenik meg,
  // a PM ezután dönt a jóváhagyásról (Fázis 5A spec 6. pont).
  function handleGeneralas(e) {
    e.preventDefault();
    setHiba("");
    setEredmeny(null);
    setElonezet(generateAnyagszamitas(bemenet));
  }

  // PM jóváhagyás – az előnézet sorai itt kerülnek be ténylegesen a
  // csomagba, nem destruktív módon (meglévő tételt nem ír felül,
  // duplikált anyagtorzs_id-t nem vesz fel – ld. service-réteg).
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

  return (
    <div style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: 16, marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", margin: "0 0 4px", fontFamily: FONT_HEADING }}>
            Anyagszámítási Motor – anyaglista generálása
          </p>
          <p style={{ fontSize: 12, color: "#94A3B8", margin: 0, fontFamily: FONT }}>
            A motor a megadott műszaki adatokból előzetes anyaglistát számol – a tételek csak jóváhagyás után kerülnek a csomagba.
          </p>
        </div>
        <button type="button" onClick={() => setNyitva(v => !v)}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "1.5px solid #2563EB", background: nyitva ? "#2563EB" : "#fff", color: nyitva ? "#fff" : "#2563EB", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
          <Calculator size={14} /> Anyaglista generálása
        </button>
      </div>

      {nyitva && (
        <div style={{ marginTop: 14 }}>
          <form onSubmit={handleGeneralas} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            {ANYAGSZAMITO_MEZOK.map(mezo => (
              <label key={mezo.key} style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#64748B", fontFamily: FONT, width: mezo.tipus === "szoveg" ? 170 : 140 }}>
                {mezo.label.toUpperCase()}
                <input
                  type={mezo.tipus === "szam" ? "number" : "text"}
                  min={mezo.tipus === "szam" ? "0" : undefined}
                  step={mezo.tipus === "szam" ? "1" : undefined}
                  value={bemenet[mezo.key]}
                  onChange={e => handleMezoValtoztatas(mezo.key, e.target.value)}
                  style={inputStyle} />
              </label>
            ))}
            <button type="submit"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
              Számítás
            </button>
          </form>

          {elonezet && (
            <div style={{ marginTop: 16, background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", margin: "0 0 10px", fontFamily: FONT_HEADING }}>
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
                <p style={{ fontSize: 12, color: "#94A3B8", fontFamily: FONT }}>A megadott adatok alapján egyetlen tétel sem generálódott.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT }}>
                    <thead>
                      <tr>
                        <th style={th}>Megnevezés</th>
                        <th style={th}>Kategória</th>
                        <th style={th}>Egység</th>
                        <th style={{ ...th, textAlign: "right" }}>Számolt mennyiség</th>
                        <th style={th}>Számítás forrása</th>
                        <th style={th}>Megjegyzés</th>
                      </tr>
                    </thead>
                    <tbody>
                      {elonezet.anyaglista.map((sor, i) => (
                        <tr key={`${sor.anyagtorzs_id}_${i}`}>
                          <td style={td}>{sor.megnevezes}</td>
                          <td style={td}>{sor.kategoria || "—"}</td>
                          <td style={td}>{sor.egyseg}</td>
                          <td style={{ ...td, textAlign: "right" }}>{sor.szamoltMennyiseg}</td>
                          <td style={td}>{sor.szamitasForrasa}</td>
                          <td style={{ ...td, color: "#64748B", fontSize: 12 }}>{sor.megjegyzes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {elonezet.figyelmeztetes && (
                <p style={{ fontSize: 12, color: "#D97706", fontWeight: 700, margin: "12px 0 0" }}>⚠️ {elonezet.figyelmeztetes}</p>
              )}
              {elonezet.hianyzoAnyagok.length > 0 && (
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12, color: "#94A3B8", fontFamily: FONT }}>
                  {elonezet.hianyzoAnyagok.map((h, i) => (
                    <li key={i}>{h.leiras} (anyagtörzs azonosító: {h.anyagtorzsId}) – számolt mennyiség: {h.szamoltMennyiseg} – nincs az anyagtörzsben, nem generálódott sor</li>
                  ))}
                </ul>
              )}

              {elonezet.anyaglista.length > 0 && (
                <button type="button" onClick={handleJovahagyas}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, padding: "9px 16px", borderRadius: 8, border: "none", background: "#16A34A", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
                  <Plus size={14} /> Jóváhagyás és hozzáadás a csomaghoz
                </button>
              )}
            </div>
          )}

          {eredmeny && (
            <p style={{ fontSize: 12, color: "#059669", fontWeight: 700, margin: "12px 0 0", fontFamily: FONT }}>
              ✅ {eredmeny.hozzaadva.length} tétel hozzáadva a csomaghoz
              {eredmeny.duplikalt.length > 0 && ` – ${eredmeny.duplikalt.length} tétel már szerepelt a csomagban (kihagyva)`}.
            </p>
          )}
          {hiba && (
            <p style={{ fontSize: 12, color: "#DC2626", fontWeight: 700, margin: "12px 0 0" }}>{hiba}</p>
          )}
        </div>
      )}
    </div>
  );
}