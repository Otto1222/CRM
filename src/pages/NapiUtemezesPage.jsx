/**
 * NapiUtemezesPage.jsx
 * Napi kiosztás-tervező – sok, egyforma munkatípusú, be nem osztott projekt
 * (pl. tömegesen importált helyszínek) minél hatékonyabb szétosztása
 * csapatok és napok között, cím-közelség alapján.
 *
 * NEM garantáltan optimális (ld. utemezesOptimalizalo.js megjegyzés) – egy
 * gyakorlatban jól működő javaslatot ad, amit a PM végignéz és jóváhagy,
 * mielőtt tényleges munkalapok jönnének belőle létre.
 */
import { useState, useMemo } from "react";
import { Route, MapPin, Users2, Calendar, Wand2, RefreshCw, CheckCircle2, AlertTriangle, Navigation } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants.js";
import { loadProjektek, linkMunkalap, updateProjekt } from "../modules/projektek/projekt.service.js";
import { getAktivCsapatok, updateCsapat } from "../modules/csapatok/csapat.service.js";
import { getAktivMunkatipusok } from "../modules/munkatipusok/munkatipus.service.js";
import { createWorkorder } from "../services/workorder.service.js";
import { geocodeTomegesen } from "../lib/geoCache.js";
import { calcDrivingDistance } from "../lib/geoService.js";
import { tervezzNapiUtemezest, finomitsNapiKotegOsrmVal } from "../lib/utemezesOptimalizalo.js";

function todayStr() { return new Date().toISOString().slice(0, 10); }
function plusDays(n) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

const card = { background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px" };
const label = { fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .6, display: "block", marginBottom: 6 };
const inp = { width: "100%", boxSizing: "border-box", padding: "8px 11px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: FONT, outline: "none" };

export default function NapiUtemezesPage({ currentUser }) {
  const [projektek, setProjektek] = useState(() => loadProjektek());
  const [csapatokMind] = useState(() => getAktivCsapatok());
  const munkatipusok = getAktivMunkatipusok();

  const [munkatipusId, setMunkatipusId] = useState("");
  const [datumTol, setDatumTol] = useState(todayStr());
  const [datumIg, setDatumIg]   = useState(plusDays(13));
  const [kizartProjektIds, setKizartProjektIds] = useState(new Set());
  const [kizartCsapatIds, setKizartCsapatIds]   = useState(new Set());

  const [geoAllapot, setGeoAllapot] = useState(null); // { kesz, osszes } | null
  const [dolgozik, setDolgozik]     = useState(false);
  const [finomitDolgozik, setFinomitDolgozik] = useState(false);
  const [eredmeny, setEredmeny]     = useState(null); // { napiKotegek, beosztatlanFeladatok }
  const [hiba, setHiba]             = useState("");
  const [mentesEredmeny, setMentesEredmeny] = useState(null);

  const jeloltProjektek = useMemo(() => {
    if (!munkatipusId) return [];
    return projektek.filter(p => p.tipus === munkatipusId && (!p.munkalapIds || p.munkalapIds.length === 0));
  }, [projektek, munkatipusId]);

  const jeloltCsapatok = useMemo(() => {
    if (!munkatipusId) return [];
    return csapatokMind.filter(c => (c.munkatipusok || []).includes(munkatipusId));
  }, [csapatokMind, munkatipusId]);

  function cimje(p) { return p.telepitesiCim || p.clientCim || ""; }

  async function handleTervezes() {
    setHiba(""); setEredmeny(null); setMentesEredmeny(null);
    const projektLista = jeloltProjektek.filter(p => !kizartProjektIds.has(p.id));
    const csapatLista  = jeloltCsapatok.filter(c => !kizartCsapatIds.has(c.id));
    if (projektLista.length === 0) { setHiba("Nincs kiválasztott, ütemezendő projekt."); return; }
    if (csapatLista.length === 0)  { setHiba("Nincs kiválasztott csapat, ami ért ehhez a munkatípushoz."); return; }

    setDolgozik(true);
    try {
      // ── 1. Geokódolás – csak azok, akiknek még nincs (vagy elavult) koordinátája ──
      const geoKellProjekt = projektLista.filter(p => p.geoLat == null || p.geoCimSzoveg !== cimje(p));
      const geoKellCsapat  = csapatLista.filter(c => c.lat == null || c.geoCimSzoveg !== c.telephely);
      const osszesGeo = geoKellProjekt.length + geoKellCsapat.length;
      if (osszesGeo > 0) {
        setGeoAllapot({ kesz: 0, osszes: osszesGeo });
        let kesz = 0;
        await geocodeTomegesen(
          geoKellProjekt.map(p => ({ id: p.id, cim: cimje(p) })),
          (id, geo) => {
            updateProjekt(id, geo
              ? { geoLat: geo.lat, geoLon: geo.lon, geoCimSzoveg: cimje(projektLista.find(p => p.id === id)) }
              : {}, currentUser?.name || "");
          },
          () => setGeoAllapot({ kesz: ++kesz, osszes: osszesGeo }),
        );
        await geocodeTomegesen(
          geoKellCsapat.map(c => ({ id: c.id, cim: c.telephely })),
          (id, geo) => {
            const cs = csapatLista.find(c => c.id === id);
            updateCsapat(id, geo ? { lat: geo.lat, lon: geo.lon, geoCimSzoveg: cs?.telephely || "" } : {}, currentUser?.name || "");
          },
          () => setGeoAllapot({ kesz: ++kesz, osszes: osszesGeo }),
        );
      }
      setGeoAllapot(null);

      // ── 2. Friss (geokódolt) adatok újratöltése ──
      const frissProjektek = loadProjektek();
      const frissCsapatok  = getAktivCsapatok();

      const feladatok = projektLista.map(p0 => {
        const p = frissProjektek.find(x => x.id === p0.id) || p0;
        return { id: p.id, nev: p.clientNev || p.projektkod, cim: cimje(p), lat: p.geoLat, lon: p.geoLon };
      });
      const csapatokGeo = csapatLista.map(c0 => {
        const c = frissCsapatok.find(x => x.id === c0.id) || c0;
        return {
          id: c.id, nev: c.nev, lat: c.lat, lon: c.lon, hetvegen: c.hetvegen,
          maxDbNap: c.maxNapiMunka?.[munkatipusId] ?? c.kapacitas ?? 1,
        };
      });

      const geoHianyzikProjekt = feladatok.filter(f => f.lat == null);
      const geoHianyzikCsapat  = csapatokGeo.filter(c => c.lat == null);

      const res = tervezzNapiUtemezest({ feladatok, csapatok: csapatokGeo, datumTol, datumIg });
      const beosztatlan = [
        ...res.beosztatlanFeladatok,
        ...geoHianyzikProjekt.filter(f => !res.beosztatlanFeladatok.some(b => b.id === f.id)),
      ];
      if (geoHianyzikCsapat.length > 0) {
        setHiba(`${geoHianyzikCsapat.length} csapat telephelye nem geokódolható (ellenőrizd a címet a Csapatok oldalon): ${geoHianyzikCsapat.map(c => c.nev).join(", ")}`);
      }
      setEredmeny({ napiKotegek: res.napiKotegek, beosztatlanFeladatok: beosztatlan });
      setProjektek(loadProjektek());
    } catch (e) {
      setHiba(e.message || "Ismeretlen hiba a tervezés közben.");
    } finally {
      setDolgozik(false);
      setGeoAllapot(null);
    }
  }

  async function handleFinomitas() {
    if (!eredmeny) return;
    setFinomitDolgozik(true);
    const csapatokFriss = getAktivCsapatok();
    const ujKotegek = [];
    for (const koteg of eredmeny.napiKotegek) {
      const csapat = csapatokFriss.find(c => c.id === koteg.csapatId);
      if (!csapat || csapat.lat == null) { ujKotegek.push(koteg); continue; }
      const finomitott = await finomitsNapiKotegOsrmVal(koteg, { lat: csapat.lat, lon: csapat.lon }, calcDrivingDistance);
      ujKotegek.push(finomitott);
      await new Promise(r => setTimeout(r, 300)); // kímélje a megosztott OSRM demo szervert
    }
    setEredmeny(p => ({ ...p, napiKotegek: ujKotegek }));
    setFinomitDolgozik(false);
  }

  async function handleJovahagyas() {
    if (!eredmeny) return;
    setDolgozik(true);
    let letrehozva = 0;
    const hibas = [];
    const projektLista = loadProjektek();
    for (const koteg of eredmeny.napiKotegek) {
      for (const f of koteg.feladatok) {
        const projekt = projektLista.find(p => p.id === f.id);
        if (!projekt) { hibas.push({ nev: f.nev, ok: "A projekt már nem található" }); continue; }
        try {
          const munkalap = createWorkorder({
            projektId:      projekt.id,
            projektKod:     projekt.projektkod,
            tipus:          munkatipusId,
            munkalapTipus:  munkatipusId,
            datum:          koteg.datum,
            clientNev:      projekt.clientNev || "",
            clientCim:      projekt.clientCim || "",
            clientTel:      projekt.clientTel || "",
            clientEmail:    projekt.clientEmail || "",
            telepitesiCim:  projekt.telepitesiCim || projekt.clientCim || "",
            csapatId:       koteg.csapatId,
            csapatNev:      koteg.csapatNev,
            assigneeId:     koteg.csapatId,
            assigneeNev:    koteg.csapatNev,
            megjegyzes:     "Napi kiosztás-tervezőből automatikusan ütemezve.",
            status:         "Létrehozva",
          }, currentUser?.name || "");
          linkMunkalap(projekt.id, munkalap.id);
          letrehozva++;
        } catch (e) {
          hibas.push({ nev: f.nev, ok: e.message || "Ismeretlen hiba" });
        }
      }
    }
    setDolgozik(false);
    setMentesEredmeny({ letrehozva, hibas });
    setProjektek(loadProjektek());
  }

  return (
    <div style={{ padding: "24px 28px", fontFamily: FONT, maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <Route size={22} color={C.accent} />
        <h1 style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>Napi kiosztás-tervező</h1>
      </div>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
        Sok, egyforma munkatípusú, be nem osztott projekt szétosztása csapatok és napok között, cím-közelség alapján – javaslat, amit jóváhagyás előtt átnézel.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div>
          <label style={label}>Munkatípus</label>
          <select value={munkatipusId} onChange={e => { setMunkatipusId(e.target.value); setEredmeny(null); setKizartProjektIds(new Set()); setKizartCsapatIds(new Set()); }} style={inp}>
            <option value="">— Válassz —</option>
            {munkatipusok.map(m => <option key={m.id} value={m.id}>{m.nev}</option>)}
          </select>
        </div>
        <div>
          <label style={label}>Dátumtól</label>
          <input type="date" value={datumTol} min={todayStr()} onChange={e => setDatumTol(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={label}>Dátumig</label>
          <input type="date" value={datumIg} min={datumTol} onChange={e => setDatumIg(e.target.value)} style={inp} />
        </div>
      </div>

      {munkatipusId && (
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14, marginBottom: 16 }}>
          <div style={card}>
            <p style={{ ...label, display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}><MapPin size={13} /> Ütemezendő projektek ({jeloltProjektek.length - [...kizartProjektIds].filter(id => jeloltProjektek.some(p => p.id === id)).length} / {jeloltProjektek.length})</p>
            {jeloltProjektek.length === 0 ? (
              <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>Nincs ilyen munkatípusú, még munkalap nélküli projekt.</p>
            ) : (
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {jeloltProjektek.map(p => {
                  const kizarva = kizartProjektIds.has(p.id);
                  return (
                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 12.5, cursor: "pointer", opacity: kizarva ? .5 : 1 }}>
                      <input type="checkbox" checked={!kizarva} onChange={() => setKizartProjektIds(s => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })} />
                      <span style={{ fontWeight: 600 }}>{p.clientNev || p.projektkod}</span>
                      <span style={{ color: C.muted }}>· {cimje(p) || "nincs cím"}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <div style={card}>
            <p style={{ ...label, display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}><Users2 size={13} /> Csapatok ({jeloltCsapatok.length - [...kizartCsapatIds].filter(id => jeloltCsapatok.some(c => c.id === id)).length} / {jeloltCsapatok.length})</p>
            {jeloltCsapatok.length === 0 ? (
              <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>Egyetlen aktív csapat sem ért ehhez a munkatípushoz (Csapatok oldal → csapat szerkesztése).</p>
            ) : (
              <div style={{ maxHeight: 220, overflowY: "auto" }}>
                {jeloltCsapatok.map(c => {
                  const kizarva = kizartCsapatIds.has(c.id);
                  const maxDb = c.maxNapiMunka?.[munkatipusId] ?? c.kapacitas ?? 1;
                  return (
                    <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 12.5, cursor: "pointer", opacity: kizarva ? .5 : 1 }}>
                      <input type="checkbox" checked={!kizarva} onChange={() => setKizartCsapatIds(s => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })} />
                      <span style={{ fontWeight: 600 }}>{c.nev}</span>
                      <span style={{ color: C.muted }}>· {c.telephely || "nincs telephely"} · max {maxDb} db/nap</span>
                      {c.lat == null && <span style={{ color: C.warning }}>⚠ geokódolás szükséges</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {munkatipusId && (
        <button onClick={handleTervezes} disabled={dolgozik}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 20px", background: dolgozik ? C.border : C.accent, color: "#fff", border: "none", borderRadius: 10, cursor: dolgozik ? "default" : "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT, marginBottom: 16 }}>
          <Wand2 size={16} /> {dolgozik ? (geoAllapot ? `Geokódolás… ${geoAllapot.kesz}/${geoAllapot.osszes}` : "Tervezés…") : "Javaslat készítése"}
        </button>
      )}

      {hiba && (
        <div style={{ background: C.dangerLight, border: `1px solid ${C.danger}40`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12.5, color: C.danger, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} /> {hiba}
        </div>
      )}

      {eredmeny && (
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: C.text, margin: 0 }}>
              Javasolt beosztás – {eredmeny.napiKotegek.length} csapat-nap, {eredmeny.napiKotegek.reduce((s, k) => s + k.feladatok.length, 0)} projekt
              {eredmeny.beosztatlanFeladatok.length > 0 && <span style={{ color: C.warning }}> · {eredmeny.beosztatlanFeladatok.length} nem fért bele</span>}
            </p>
            <button onClick={handleFinomitas} disabled={finomitDolgozik}
              title="Légvonal-becslés cseréje valós vezetési távolságra (OSRM) – néhány másodpercet vehet igénybe"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 13px", background: "#fff", color: C.accent, border: `1.5px solid ${C.accent}`, borderRadius: 8, cursor: finomitDolgozik ? "default" : "pointer", fontWeight: 700, fontSize: 12, fontFamily: FONT }}>
              {finomitDolgozik ? <RefreshCw size={13} className="spin" /> : <Navigation size={13} />} {finomitDolgozik ? "Finomítás…" : "Valós útvonallal pontosítás"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {eredmeny.napiKotegek.map((k, i) => (
              <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                  <Calendar size={13} color={C.muted} />
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{k.datum}</span>
                  <span style={{ background: C.accentLight, color: C.accent, borderRadius: 20, padding: "2px 10px", fontSize: 11.5, fontWeight: 700 }}>{k.csapatNev}</span>
                  <span style={{ fontSize: 11.5, color: C.muted, marginLeft: "auto" }}>~{k.osszTavKm} km{k.osszUtazasPerc ? ` · ${k.osszUtazasPerc} perc` : ""}</span>
                </div>
                {k.feladatok.map(f => (
                  <div key={f.id} style={{ fontSize: 12, color: C.textSub, padding: "2px 0 2px 21px" }}>
                    {f.nev} <span style={{ color: C.muted }}>· {f.cim} · {f.tavKm} km</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {eredmeny.beosztatlanFeladatok.length > 0 && (
            <div style={{ background: C.warningLight, border: `1px solid ${C.warning}40`, borderRadius: 9, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: C.warning }}>
              Nem fértek bele a tervezési ablakba (bővítsd a dátumtartományt, vagy vonj be több csapatot): {eredmeny.beosztatlanFeladatok.map(f => f.nev).join(", ")}
            </div>
          )}

          {mentesEredmeny ? (
            <div style={{ background: C.successLight, border: `1px solid ${C.success}40`, borderRadius: 9, padding: "12px 16px" }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.success, margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={15} /> {mentesEredmeny.letrehozva} munkalap létrehozva
              </p>
              {mentesEredmeny.hibas.length > 0 && mentesEredmeny.hibas.map((h, i) => (
                <p key={i} style={{ fontSize: 11.5, color: C.danger, margin: "3px 0 0" }}>{h.nev}: {h.ok}</p>
              ))}
            </div>
          ) : (
            <button onClick={handleJovahagyas} disabled={dolgozik}
              style={{ width: "100%", padding: "12px", borderRadius: 10, border: "none", background: dolgozik ? C.border : C.success, color: "#fff", fontWeight: 700, fontSize: 14, cursor: dolgozik ? "default" : "pointer", fontFamily: FONT }}>
              {dolgozik ? "Munkalapok létrehozása…" : `Jóváhagyás – munkalapok létrehozása (${eredmeny.napiKotegek.reduce((s, k) => s + k.feladatok.length, 0)} db)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
