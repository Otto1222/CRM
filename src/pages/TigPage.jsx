/**
 * TigPage.jsx
 * Időszaki, összesített TIG (Teljesítési Igazolás) generálása – azoknak a
 * fővállalkozóknak, akiknél tigMod === "idoszaki" (ld. fovallalkozo.schema.js
 * TIG_MOD_OPCIOK). PM/Admin fővállalkozót + tetszőleges dátumtartományt
 * választ, kipipálja az abba eső, kész munkákat, és egy gombbal legenerálja
 * a fővállalkozó saját TIG-sablonjával az összesített dokumentumot.
 *
 * A munkánkénti (projektenkénti) TIG NEM itt van – az a projekt Pénzügy
 * fülén, egy gombbal letölthető (ld. TabPenzugy.jsx).
 */
import { useMemo, useState } from "react";
import { FileText, Download, Calendar } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants.js";
import { ft } from "../lib/helpers.js";
import { loadFovallalkozok } from "../modules/fovallalkozok/fovallalkozo.service.js";
import { loadProjektek } from "../modules/projektek/projekt.service.js";
import { getPenzugyi, upsertPenzugyi } from "../modules/penzugy/penzugyi.service.js";
import {
  hasTigSablon, buildTigTetelSorok, tigProjektDatum, generateTigDocxIdoszaki,
} from "../lib/tigDocxService.js";

const inp = {
  padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 9,
  fontSize: 14, fontFamily: FONT, outline: "none", background: "#fff",
};

function ma() { return new Date().toISOString().slice(0, 10); }
function ketHettelEzelott() {
  const d = new Date(); d.setDate(d.getDate() - 14);
  return d.toISOString().slice(0, 10);
}

export default function TigPage({ currentUser }) {
  const isAdmin = ["Admin", "Projektmenedzser", "Iroda/Könyvelés"].includes(currentUser?.role);
  const idoszakiFovallalkozok = useMemo(
    () => loadFovallalkozok().filter(f => f.aktiv !== false && f.tigMod === "idoszaki"),
    []
  );

  const [fvId, setFvId] = useState(idoszakiFovallalkozok[0]?.id || "");
  const [datumTol, setDatumTol] = useState(ketHettelEzelott());
  const [datumIg, setDatumIg]   = useState(ma());
  const [kijelolt, setKijelolt] = useState(() => new Set());
  const [statuszFrissit, setStatuszFrissit] = useState(true);
  const [generalva, setGeneralva] = useState(false);

  const fovallalkozo = idoszakiFovallalkozok.find(f => f.id === fvId) || null;

  const jeloltProjektek = useMemo(() => {
    if (!fvId) return [];
    const all = loadProjektek();
    return all
      .filter(p => p.forrás === "fovallalkozoi_munka" && p.penzugy?.fovallalkoziId === fvId)
      .filter(p => {
        const d = tigProjektDatum(p);
        return d && d >= datumTol && d <= datumIg;
      })
      .filter(p => {
        const pnz = getPenzugyi(p.id);
        return (pnz?.tigStatusz || "Nem szükséges") !== "Elfogadva";
      })
      .map(p => ({ projekt: p, tetelek: buildTigTetelSorok(p) }))
      .filter(({ tetelek }) => tetelek.length > 0)
      .sort((a, b) => tigProjektDatum(a.projekt).localeCompare(tigProjektDatum(b.projekt)));
  }, [fvId, datumTol, datumIg]);

  // Alapból minden jelölt projekt ki van pipálva – dátum/fővállalkozó
  // váltáskor újraindul a kijelölés a friss listával.
  useMemo(() => {
    setKijelolt(new Set(jeloltProjektek.map(({ projekt }) => projekt.id)));
    setGeneralva(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fvId, datumTol, datumIg]);

  function toggle(id) {
    setKijelolt(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const kivalasztottProjektek = jeloltProjektek
    .filter(({ projekt }) => kijelolt.has(projekt.id))
    .map(({ projekt }) => projekt);

  const osszesen = jeloltProjektek
    .filter(({ projekt }) => kijelolt.has(projekt.id))
    .reduce((s, { tetelek }) => s + tetelek.reduce((x, t) => x + (Number(t.osszesen) || 0), 0), 0);

  function handleGeneral() {
    if (!fovallalkozo || kivalasztottProjektek.length === 0) return;
    const ok = generateTigDocxIdoszaki(kivalasztottProjektek, fovallalkozo, datumTol, datumIg);
    if (!ok) return;
    if (statuszFrissit) {
      kivalasztottProjektek.forEach(p => {
        const pnz = getPenzugyi(p.id);
        upsertPenzugyi({ ...(pnz || { projektId: p.id }), projektId: p.id, tigStatusz: "Kiküldve" }, currentUser?.name || "");
      });
    }
    setGeneralva(true);
  }

  if (!isAdmin) {
    return <div style={{ padding: 28 }}>Nincs jogosultságod ehhez az oldalhoz.</div>;
  }

  return (
    <div style={{ padding: "24px 28px", fontFamily: FONT, maxWidth: 980 }}>
      <h1 style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>
        TIG – Időszaki összesített Teljesítési Igazolás
      </h1>
      <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px" }}>
        Azoknak a fővállalkozóknak, akik nem munkánként, hanem egy-egy időszakot összesítve kérnek TIG-et
        (ld. Fővállalkozók oldal → TIG mód). Munkánkénti TIG a projekt Pénzügy füléről tölthető le.
      </p>

      {idoszakiFovallalkozok.length === 0 ? (
        <div style={{ background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 12, padding: 24, textAlign: "center", color: C.muted }}>
          Nincs "Időszaki összesített" TIG-módú fővállalkozó. Állítsd be a Fővállalkozók oldalon (TIG mód: Időszaki összesített), ha valakinek erre van szüksége.
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 18, background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: .6 }}>Fővállalkozó</label>
              <select value={fvId} onChange={e => setFvId(e.target.value)} style={{ ...inp, minWidth: 220 }}>
                {idoszakiFovallalkozok.map(f => <option key={f.id} value={f.id}>{f.nev}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: .6 }}>Időszak – tól</label>
              <input type="date" value={datumTol} onChange={e => setDatumTol(e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: .6 }}>Időszak – ig</label>
              <input type="date" value={datumIg} onChange={e => setDatumIg(e.target.value)} style={inp} />
            </div>
            {fovallalkozo && !hasTigSablon(fovallalkozo.id) && (
              <span style={{ fontSize: 12, color: C.warning, fontWeight: 600 }}>
                ⚠️ Nincs TIG sablon feltöltve ehhez a fővállalkozóhoz (Fővállalkozók oldal).
              </span>
            )}
          </div>

          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.textSub, display: "flex", alignItems: "center", gap: 6 }}>
                <Calendar size={14} /> Az időszakba eső, TIG-re váró projektek ({jeloltProjektek.length})
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>Kiválasztva: {kijelolt.size} · {ft(osszesen)}</span>
            </div>
            {jeloltProjektek.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: C.muted, fontSize: 13 }}>
                Nincs egyező projekt ebben az időszakban – vagy nincs tétel-kosaruk/bevételük, amiből TIG-tétel épülne.
              </div>
            ) : (
              jeloltProjektek.map(({ projekt, tetelek }) => {
                const sorOsszeg = tetelek.reduce((s, t) => s + (Number(t.osszesen) || 0), 0);
                return (
                  <label key={projekt.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: `1px solid ${C.bg}`, cursor: "pointer" }}>
                    <input type="checkbox" checked={kijelolt.has(projekt.id)} onChange={() => toggle(projekt.id)}
                      style={{ width: 16, height: 16, accentColor: C.accent }} />
                    <FileText size={14} color={C.muted} />
                    <span style={{ flex: 1, fontSize: 13, color: C.text }}>
                      <strong>{projekt.projektkod}</strong> · {projekt.clientNev || "—"} · {tigProjektDatum(projekt)}
                    </span>
                    <span style={{ fontSize: 12, color: C.muted }}>{tetelek.length} tétel</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.text, minWidth: 90, textAlign: "right" }}>{ft(sorOsszeg)}</span>
                  </label>
                );
              })
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <button type="button" onClick={handleGeneral}
              disabled={!fovallalkozo || kivalasztottProjektek.length === 0 || !hasTigSablon(fvId)}
              style={{
                display: "flex", alignItems: "center", gap: 7, padding: "10px 20px",
                background: (!fovallalkozo || kivalasztottProjektek.length === 0 || !hasTigSablon(fvId)) ? C.border : C.accent,
                color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT,
              }}>
              <Download size={15} /> TIG generálása ({kijelolt.size} projekt)
            </button>
            <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.textSub, cursor: "pointer" }}>
              <input type="checkbox" checked={statuszFrissit} onChange={e => setStatuszFrissit(e.target.checked)}
                style={{ width: 15, height: 15, accentColor: C.accent }} />
              Generálás után a kiválasztott projektek TIG státusza "Kiküldve"-re álljon
            </label>
            {generalva && <span style={{ fontSize: 13, color: C.success, fontWeight: 700 }}>✅ TIG letöltve</span>}
          </div>
        </>
      )}
    </div>
  );
}
