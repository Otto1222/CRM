import { useState, useEffect } from "react";
import { Package, Plus } from "lucide-react";
import { FONT, FONT_HEADING } from "../../../lib/constants.js";
import { getAktivAnyagok } from "../../../lib/anyagtorzs.js";
import {
  getKivitelezesiCsomagByProjektId,
  createKivitelezesiCsomagForProjekt,
  addKeziTetelToKivitelezesiCsomag,
  setKivitelezesiCsomagStatus,
  updateKiviTetelMennyisegek,
  updateKiviTetelLathatosag,
} from "../../kivitelezesi_csomag/kivitelezesiCsomag.service.js";
import {
  getKivitelezesiCsomagStatusConfig,
  calcKiviTetelEltérés,
  getKivitelezesiCsomagKovetkezoStatus,
  isKivitelezesiCsomagSzerkesztesTiltott,
  KIVITELEZESI_CSOMAG_FORRAS,
} from "../../kivitelezesi_csomag/kivitelezesiCsomag.schema.js";
import {
  getAnyagelszamolasiModConfig,
  hasAnyagelszamolasiMod,
  anyagArakLathatokAModban,
  anyagHasznotKellSzamolniAModban,
  csakMennyisegiElszamolasAModban,
  calculateAnyagProfitByMod,
} from "../../../lib/workflowRules.js";
import AnyagszamitoPanel from "./AnyagszamitoPanel.jsx";

const th = { textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1.5px solid #E2E8F0" };
const td = { padding: "8px 10px", fontSize: 13, color: "#0F172A", borderBottom: "1px solid #F1F5F9" };
const inputStyle = { padding: "7px 10px", borderRadius: 7, border: "1.5px solid #E2E8F0", fontSize: 13, fontFamily: FONT, color: "#0F172A" };
const mennyisegInputStyle = { ...inputStyle, width: 64, padding: "4px 6px", textAlign: "right" };

// PM/Admin – ők kezelhetik a csomag státuszát, a mennyiségeket és az
// Anyagszámítási Motor előnézetének jóváhagyását (Fázis 4D / 5A).
const KIVITELEZESI_CSOMAG_KEZELO_SZEREPEK = ["Admin", "Projektmenedzser"];

export default function TabKivitelezesiCsomag({ projekt, currentUser }) {
  const [csomag, setCsomag] = useState(() => getKivitelezesiCsomagByProjektId(projekt.id));
  const [hiba, setHiba]     = useState("");
  const [letrehozva, setLetrehozva] = useState(false);

  // ── Kézi tétel hozzáadás (Fázis 4C – fővállalkozói / belső projekteknél) ──
  const [keziAnyagId, setKeziAnyagId]     = useState("");
  const [keziTervezett, setKeziTervezett] = useState("");
  const [keziKiadando, setKeziKiadando]   = useState("");
  const [keziHiba, setKeziHiba]           = useState("");

  // ── Státusz- és mennyiségkezelés (Fázis 4D) ──
  const [statuszHiba, setStatuszHiba]   = useState("");
  const [mennyisegHiba, setMennyisegHiba] = useState("");

  useEffect(() => {
    setCsomag(getKivitelezesiCsomagByProjektId(projekt.id));
  }, [projekt.id]);

  const sajatAjanlatbol = projekt.forrás === "sajat_ajanlat" && !!projekt.elfogadottAjanlatPillanatkep;
  // Kézi tételfelvitel csak a nem-ajánlatból generált (fővállalkozói / belső,
  // azaz "kezi" forrású) csomagoknál jelenik meg – a saját ajánlatos csomag
  // tételei a pillanatképből származnak, ott PM kézi felvitelre nincs szükség.
  const keziTetelFelvitelEngedve = csomag?.forras !== KIVITELEZESI_CSOMAG_FORRAS.AJANLATBOL;

  const isPMvagyAdmin       = KIVITELEZESI_CSOMAG_KEZELO_SZEREPEK.includes(currentUser?.role);
  const kovetkezoStatus     = csomag ? getKivitelezesiCsomagKovetkezoStatus(csomag.status) : null;
  const szerkesztesTiltott  = csomag ? isKivitelezesiCsomagSzerkesztesTiltott(csomag.status) : false;
  // Mennyiségeket csak PM/Admin szerkesztheti, és csak Lezárva/Elszámolva
  // státusz előtt – ott a normál módosítás tilos (admin override később).
  const mennyisegSzerkesztheto = isPMvagyAdmin && !szerkesztesTiltott;

  function handleLetrehozas() {
    setHiba("");
    try {
      const uj = createKivitelezesiCsomagForProjekt(
        projekt,
        sajatAjanlatbol ? projekt.elfogadottAjanlatPillanatkep : null,
        currentUser?.name || ""
      );
      setCsomag(uj);
      setLetrehozva(true);
    } catch (err) {
      setHiba(err.message || "A Kivitelezési Csomag létrehozása sikertelen.");
    }
  }

  function handleKeziTetelHozzaadas(e) {
    e.preventDefault();
    setKeziHiba("");
    if (!keziAnyagId) {
      setKeziHiba("Válassz anyagot az anyagtörzsből.");
      return;
    }
    try {
      const updated = addKeziTetelToKivitelezesiCsomag(
        csomag.id,
        keziAnyagId,
        { tervezettMennyiseg: keziTervezett, kiadandoMennyiseg: keziKiadando },
        currentUser?.name || ""
      );
      setCsomag(updated);
      setKeziAnyagId(""); setKeziTervezett(""); setKeziKiadando("");
    } catch (err) {
      setKeziHiba(err.message || "A tétel hozzáadása sikertelen.");
    }
  }

  function handleStatuszValtas(ujStatus) {
    setStatuszHiba("");
    try {
      const updated = setKivitelezesiCsomagStatus(csomag.id, ujStatus, currentUser?.name || "");
      setCsomag(updated);
    } catch (err) {
      setStatuszHiba(err.message || "A státuszváltás sikertelen.");
    }
  }

  function handleMennyisegValtoztatas(tetelId, mezo, ertek) {
    setMennyisegHiba("");
    try {
      const updated = updateKiviTetelMennyisegek(csomag.id, tetelId, { [mezo]: ertek }, currentUser?.name || "");
      setCsomag(updated);
    } catch (err) {
      setMennyisegHiba(err.message || "A mennyiség módosítása sikertelen.");
    }
  }

  function handleLathatosagValtas(tetelId, aktualisLathatosag) {
    setMennyisegHiba("");
    try {
      const uj = aktualisLathatosag === "KIADOTT_MENNYISEG" ? "NONE" : "KIADOTT_MENNYISEG";
      const updated = updateKiviTetelLathatosag(csomag.id, tetelId, uj, currentUser?.name || "");
      setCsomag(updated);
    } catch (err) {
      setMennyisegHiba(err.message || "A láthatóság módosítása sikertelen.");
    }
  }

  if (!csomag) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center" }}>
        <Package size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
        <p style={{ fontSize: 14, color: "#64748B", marginBottom: 4, fontFamily: FONT }}>
          Ehhez a projekthez még nincs Kivitelezési Csomag.
        </p>
        <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 18, fontFamily: FONT }}>
          {sajatAjanlatbol
            ? "A csomag az elfogadott ajánlat lefagyasztott pillanatképéből generálódik – a tételek és árak onnan másolódnak."
            : "A csomag üresen jön létre – a tételeket a projektvezető tölti fel kézzel."}
        </p>
        {hiba && (
          <p style={{ fontSize: 12, color: "#DC2626", fontWeight: 700, marginBottom: 12 }}>{hiba}</p>
        )}
        <button type="button" onClick={handleLetrehozas}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 9, border: "none", background: "#2563EB", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: FONT }}>
          <Plus size={16} /> Kivitelezési Csomag létrehozása
        </button>
      </div>
    );
  }

  const stCfg = getKivitelezesiCsomagStatusConfig(csomag.status);
  const tetelek = csomag.tetelek || [];

  // Fázis 5B P0-1 javítás – az anyagelszámolási mód itt dől el ténylegesen,
  // nem csak UI-mezőként jelenik meg: ez vezérli, hogy a PM/Admin lásson-e
  // anyagárat/anyaghasznot, és hogy a tételek csak mennyiségi elszámolásra
  // szolgálnak-e (ld. src/lib/workflowRules.js mód-helperek).
  const anyagMod = projekt?.anyagelszamolasiMod;
  const anyagCfg = getAnyagelszamolasiModConfig(anyagMod);
  const arakLathatok = anyagArakLathatokAModban(anyagMod);
  const anyagHasznotKellSzamolni = anyagHasznotKellSzamolniAModban(anyagMod);
  const csakMennyisegiElszamolas = csakMennyisegiElszamolasAModban(anyagMod);
  const anyagHaszon = calculateAnyagProfitByMod(csomag, anyagMod);

  return (
    <div style={{ padding: "20px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap", padding: "10px 14px", borderRadius: 10, background: anyagCfg.bg, border: `1.5px solid ${anyagCfg.color}40` }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, fontFamily: FONT }}>Anyagelszámolási mód</span>
        {hasAnyagelszamolasiMod(projekt) ? (
          <>
            <span style={{ fontSize: 13, fontWeight: 700, color: anyagCfg.color, fontFamily: FONT_HEADING }}>{anyagCfg.label}</span>
            <span style={{ fontSize: 12, color: "#64748B", fontFamily: FONT }}>{anyagCfg.desc}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: anyagHasznotKellSzamolni ? "#16A34A" : "#64748B", fontFamily: FONT, marginLeft: "auto" }}>
              Anyaghaszon: {anyagHaszon.toLocaleString("hu-HU")} Ft {!anyagHasznotKellSzamolni && "(rögzítve 0-ra ebben a módban)"}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", fontFamily: FONT }}>⚠ Admin ellenőrzés szükséges – nincs beállítva a projektnél</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ background: stCfg.bg, color: stCfg.szin, border: `1.5px solid ${stCfg.szin}40`, borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 700, fontFamily: FONT }}>
          {csomag.status}
        </span>
        <span style={{ fontSize: 12, color: "#64748B", fontFamily: FONT }}>Verzió: <strong>{csomag.version}</strong></span>
        <span style={{ fontSize: 12, color: "#64748B", fontFamily: FONT }}>
          Forrás: <strong>{csomag.forras === KIVITELEZESI_CSOMAG_FORRAS.AJANLATBOL ? "Elfogadott ajánlatból (automatikus)" : "Kézi létrehozás"}</strong>
        </span>
        {csomag.arPillanatkepDatum && (
          <span style={{ fontSize: 12, color: "#64748B", fontFamily: FONT }}>
            Ár-pillanatkép: <strong>{new Date(csomag.arPillanatkepDatum).toLocaleDateString("hu-HU")}</strong>
          </span>
        )}
        {letrehozva && (
          <span style={{ fontSize: 12, color: "#059669", fontWeight: 700, fontFamily: FONT }}>✅ Csomag létrehozva</span>
        )}
        {isPMvagyAdmin && kovetkezoStatus && (
          <button type="button" onClick={() => handleStatuszValtas(kovetkezoStatus)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: "1.5px solid #2563EB", background: "#fff", color: "#2563EB", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
            Tovább → {kovetkezoStatus}
          </button>
        )}
        {!kovetkezoStatus && (
          <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: FONT }}>A csomag elérte az utolsó státuszt.</span>
        )}
      </div>
      {statuszHiba && (
        <p style={{ fontSize: 12, color: "#DC2626", fontWeight: 700, margin: "0 0 14px" }}>{statuszHiba}</p>
      )}
      {szerkesztesTiltott && (
        <p style={{ fontSize: 12, color: "#64748B", fontStyle: "italic", margin: "0 0 14px", fontFamily: FONT }}>
          A csomag {csomag.status.toLowerCase()} állapotban van – a mennyiségek és tételek normál módon nem módosíthatók.
        </p>
      )}

      {keziTetelFelvitelEngedve && (
        <div style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: 16, marginBottom: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", margin: "0 0 4px", fontFamily: FONT_HEADING }}>
            Tétel hozzáadása anyagtörzsből
          </p>
          <p style={{ fontSize: 12, color: "#94A3B8", margin: "0 0 12px", fontFamily: FONT }}>
            A tétel kizárólag az anyagtörzsből választható – szabad szöveges anyagfelvitel nincs.
            A megnevezés, kategória, egység és árak a kiválasztás pillanatában rögzült pillanatképként kerülnek a csomagba.
          </p>
          <form onSubmit={handleKeziTetelHozzaadas} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#64748B", fontFamily: FONT, minWidth: 240 }}>
              ANYAG
              <select value={keziAnyagId} onChange={e => setKeziAnyagId(e.target.value)} style={inputStyle}>
                <option value="">— válassz anyagot —</option>
                {getAktivAnyagok().map(a => (
                  <option key={a.id} value={a.id}>
                    {(a.kulsoAzonosito ? `${a.kulsoAzonosito} – ` : "") + a.nev} ({a.egyseg})
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#64748B", fontFamily: FONT, width: 130 }}>
              TERVEZETT MENNYISÉG
              <input type="number" min="0" step="any" value={keziTervezett}
                onChange={e => setKeziTervezett(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#64748B", fontFamily: FONT, width: 130 }}>
              KIADANDÓ MENNYISÉG
              <input type="number" min="0" step="any" value={keziKiadando}
                onChange={e => setKeziKiadando(e.target.value)} style={inputStyle} />
            </label>
            <button type="submit"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 8, border: "none", background: "#2563EB", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
              <Plus size={14} /> Hozzáadás
            </button>
          </form>
          {keziHiba && (
            <p style={{ fontSize: 12, color: "#DC2626", fontWeight: 700, margin: "10px 0 0" }}>{keziHiba}</p>
          )}
        </div>
      )}

      {isPMvagyAdmin && !szerkesztesTiltott && (
        <AnyagszamitoPanel csomag={csomag} currentUser={currentUser} onCsomagFrissult={setCsomag} anyagelszamolasiMod={anyagMod} />
      )}

      {tetelek.length === 0 ? (
        <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: FONT }}>A csomagban még nincs tétel.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          {mennyisegHiba && (
            <p style={{ fontSize: 12, color: "#DC2626", fontWeight: 700, margin: "0 0 10px" }}>{mennyisegHiba}</p>
          )}
          {csakMennyisegiElszamolas && (
            <p style={{ fontSize: 12, color: "#7C3AED", fontWeight: 600, margin: "0 0 10px", fontFamily: FONT }}>
              ℹ️ Ebben a módban a fővállalkozó adja az anyagot – a tételek csak mennyiségi elszámolásra szolgálnak, ár és anyaghaszon nem jelenik meg.
            </p>
          )}
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT }}>
            <thead>
              <tr>
                <th style={th}>Cikkszám</th>
                <th style={th}>Megnevezés</th>
                <th style={th}>Kategória</th>
                <th style={th}>Egység</th>
                <th style={{ ...th, textAlign: "right" }}>Tervezett</th>
                <th style={{ ...th, textAlign: "right" }}>Kiadandó</th>
                <th style={{ ...th, textAlign: "right" }}>Kiadott</th>
                <th style={{ ...th, textAlign: "right" }}>Felhasznált</th>
                <th style={{ ...th, textAlign: "right" }}>Visszahozott</th>
                <th style={{ ...th, textAlign: "right" }}>Eltérés</th>
                <th style={{ ...th, textAlign: "center", width: 110 }}>Telepítő látja kiadott menny.</th>
                {arakLathatok && (
                  <>
                    <th style={{ ...th, textAlign: "right" }}>Eladási ár</th>
                    <th style={{ ...th, textAlign: "right" }}>Beszerzési ár</th>
                    <th style={{ ...th, textAlign: "right" }}>Anyaghaszon</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {tetelek.map(t => {
                const elteres = calcKiviTetelEltérés(t);
                const mennyisegCella = (mezo) => (
                  mennyisegSzerkesztheto ? (
                    <td style={{ ...td, textAlign: "right" }}>
                      <input type="number" min="0" step="any" value={t[mezo]}
                        onChange={e => handleMennyisegValtoztatas(t.id, mezo, e.target.value)}
                        style={mennyisegInputStyle} />
                    </td>
                  ) : (
                    <td style={{ ...td, textAlign: "right" }}>{t[mezo]}</td>
                  )
                );
                const eladasiAr = Number(t.egysegarPillanatkepEladasi) || 0;
                const beszerzesiAr = Number(t.egysegarPillanatkepBeszerzesi) || 0;
                const sorHaszon = anyagHasznotKellSzamolni
                  ? (eladasiAr - beszerzesiAr) * (Number(t.felhasznaltMennyiseg) || 0)
                  : 0;
                return (
                  <tr key={t.id}>
                    <td style={td}>{t.cikkszam || "—"}</td>
                    <td style={td}>{t.nev || "—"}</td>
                    <td style={td}>{t.kategoria || "—"}</td>
                    <td style={td}>{t.egyseg}</td>
                    {mennyisegCella("tervezettMennyiseg")}
                    {mennyisegCella("kiadandoMennyiseg")}
                    {mennyisegCella("kiadottMennyiseg")}
                    {mennyisegCella("felhasznaltMennyiseg")}
                    {mennyisegCella("visszahozottMennyiseg")}
                    <td style={{ ...td, textAlign: "center" }}>
                      {elteres === 0 ? (
                        <span style={{ background: "#DCFCE7", color: "#15803D", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>✓ Rendben</span>
                      ) : (
                        <span
                          style={{ background: "#FEE2E2", color: "#B91C1C", borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, display: "inline-block" }}
                          title={elteres > 0 ? "Hiányzó vagy el nem számolt anyag" : "Adathiba: több lett elszámolva mint kiadva"}>
                          ⚠ {elteres > 0 ? `+${elteres}` : elteres}
                        </span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {mennyisegSzerkesztheto ? (
                        <button type="button"
                          onClick={() => handleLathatosagValtas(t.id, t.telepitoLathatosag || "NONE")}
                          title={t.telepitoLathatosag === "KIADOTT_MENNYISEG" ? "Látható – kattints az elrejtéshez" : "Rejtett – kattints a megjelenítéshez"}
                          style={{ background: t.telepitoLathatosag === "KIADOTT_MENNYISEG" ? "#059669" : "#94A3B8", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                          {t.telepitoLathatosag === "KIADOTT_MENNYISEG" ? "✓ Látható" : "Rejtett"}
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: t.telepitoLathatosag === "KIADOTT_MENNYISEG" ? "#059669" : "#94A3B8", fontWeight: 700 }}>
                          {t.telepitoLathatosag === "KIADOTT_MENNYISEG" ? "✓ Látható" : "Rejtett"}
                        </span>
                      )}
                    </td>
                    {arakLathatok && (
                      <>
                        <td style={{ ...td, textAlign: "right" }}>{eladasiAr.toLocaleString("hu-HU")} Ft</td>
                        <td style={{ ...td, textAlign: "right" }}>{beszerzesiAr.toLocaleString("hu-HU")} Ft</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700, color: anyagHasznotKellSzamolni ? "#16A34A" : "#64748B" }}>
                          {sorHaszon.toLocaleString("hu-HU")} Ft
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
