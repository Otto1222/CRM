import { useState, useEffect } from "react";
import { Package, Plus } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../../lib/constants.js";
import {
  getKivitelezesiCsomagByProjektId,
  createKivitelezesiCsomagForProjekt,
  addAnyagokBulkToKivitelezesiCsomag,
  setKivitelezesiCsomagStatus,
  updateKiviTetelMennyisegek,
  updateKiviTetelLathatosag,
  updateKiviTetelSorozatszamKoteles,
} from "../../kivitelezesi_csomag/kivitelezesiCsomag.service.js";
import AnyagKosarPicker from "../../../components/AnyagKosarPicker.jsx";
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

const th = { textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `1.5px solid ${C.border}` };
const td = { padding: "8px 10px", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.bg}` };
const inputStyle = { padding: "7px 10px", borderRadius: 7, border: `1.5px solid ${C.border}`, fontSize: 13, fontFamily: FONT, color: C.text };
const mennyisegInputStyle = { ...inputStyle, width: 64, padding: "4px 6px", textAlign: "right" };

// PM/Admin – ők kezelhetik a csomag státuszát, a mennyiségeket és az
// Anyagszámítási Motor előnézetének jóváhagyását (Fázis 4D / 5A).
const KIVITELEZESI_CSOMAG_KEZELO_SZEREPEK = ["Admin", "Projektmenedzser"];

export default function TabKivitelezesiCsomag({ projekt, currentUser }) {
  const [csomag, setCsomag] = useState(() => getKivitelezesiCsomagByProjektId(projekt.id));
  const [hiba, setHiba]     = useState("");
  const [letrehozva, setLetrehozva] = useState(false);

  // ── Tételes anyaglista összeállítása kosárral (Fázis 6B – fővállalkozói /
  // belső projekteknél a projekt létrehozása UTÁN, MIELŐTT bármelyik
  // munkalapot kiosztanák egy csapatnak) ──
  const [keziKosar, setKeziKosar] = useState([]);
  const [keziHiba, setKeziHiba]   = useState("");

  // ── Státusz- és mennyiségkezelés (Fázis 4D) ──
  const [statuszHiba, setStatuszHiba]   = useState("");
  const [mennyisegHiba, setMennyisegHiba] = useState("");

  useEffect(() => {
    setCsomag(getKivitelezesiCsomagByProjektId(projekt.id));
  }, [projekt.id]);

  const sajatAjanlatbol = projekt.forrás === "sajat_ajanlat" && !!projekt.elfogadottAjanlatPillanatkep;
  // P0-007: "Saját munka – elfogadott tételes Excel" alfajta – csak akkor
  // számít, ha nincs ajánlat-pillanatkép (a kettő kölcsönösen kizárja egymást).
  const sajatExcelbol = projekt.forrás === "sajat_ajanlat" && !sajatAjanlatbol && !!projekt.elfogadottExcelPillanatkep;
  // Kézi tételfelvitel csak a nem-automatikusan generált (fővállalkozói / belső,
  // azaz "kezi" forrású) csomagoknál jelenik meg – a saját ajánlatos/Excel-es
  // csomag tételei a pillanatképből származnak, ott PM kézi felvitelre nincs szükség.
  const keziTetelFelvitelEngedve = ![KIVITELEZESI_CSOMAG_FORRAS.AJANLATBOL, KIVITELEZESI_CSOMAG_FORRAS.EXCEL_IMPORT].includes(csomag?.forras);

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
        currentUser?.name || "",
        sajatExcelbol ? projekt.elfogadottExcelPillanatkep : null
      );
      setCsomag(uj);
      setLetrehozva(true);
    } catch (err) {
      setHiba(err.message || "A Kivitelezési Csomag létrehozása sikertelen.");
    }
  }

  function handleKeziKosarHozzaadas() {
    setKeziHiba("");
    if (keziKosar.length === 0) {
      setKeziHiba("Adj hozzá legalább egy anyagot a kosárhoz.");
      return;
    }
    try {
      const updated = addAnyagokBulkToKivitelezesiCsomag(
        csomag.id,
        keziKosar.map(k => ({ anyagtorzsId: k.anyagtorzsId, mennyiseg: k.mennyiseg })),
        currentUser?.name || ""
      );
      setCsomag(updated);
      setKeziKosar([]);
    } catch (err) {
      setKeziHiba(err.message || "A tételek hozzáadása sikertelen.");
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

  function handleSorozatszamValtas(tetelId, aktualis) {
    setMennyisegHiba("");
    try {
      const updated = updateKiviTetelSorozatszamKoteles(csomag.id, tetelId, !aktualis, currentUser?.name || "");
      setCsomag(updated);
    } catch (err) {
      setMennyisegHiba(err.message || "A sorozatszám-kötelezettség módosítása sikertelen.");
    }
  }

  if (!csomag) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center" }}>
        <Package size={40} color={C.border} style={{ marginBottom: 12 }} />
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 4, fontFamily: FONT }}>
          Ehhez a projekthez még nincs Kivitelezési Csomag.
        </p>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 18, fontFamily: FONT }}>
          {sajatAjanlatbol
            ? "A csomag az elfogadott ajánlat lefagyasztott pillanatképéből generálódik – a tételek és árak onnan másolódnak."
            : sajatExcelbol
            ? "A csomag az importált, elfogadott tételes Excel pillanatképéből generálódik – a tételek és árak onnan másolódnak."
            : "A csomag üresen jön létre – a tételeket a projektvezető tölti fel kézzel."}
        </p>
        {hiba && (
          <p style={{ fontSize: 12, color: C.danger, fontWeight: 700, marginBottom: 12 }}>{hiba}</p>
        )}
        <button type="button" onClick={handleLetrehozas}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 20px", borderRadius: 9, border: "none", background: C.accent, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: FONT }}>
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
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: FONT }}>Anyagelszámolási mód</span>
        {hasAnyagelszamolasiMod(projekt) ? (
          <>
            <span style={{ fontSize: 13, fontWeight: 700, color: anyagCfg.color, fontFamily: FONT_HEADING }}>{anyagCfg.label}</span>
            <span style={{ fontSize: 12, color: C.muted, fontFamily: FONT }}>{anyagCfg.desc}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: anyagHasznotKellSzamolni ? C.success : C.muted, fontFamily: FONT, marginLeft: "auto" }}>
              Anyaghaszon: {anyagHaszon.toLocaleString("hu-HU")} Ft {!anyagHasznotKellSzamolni && "(rögzítve 0-ra ebben a módban)"}
            </span>
          </>
        ) : (
          <span style={{ fontSize: 12, fontWeight: 700, color: C.danger, fontFamily: FONT }}>⚠ Admin ellenőrzés szükséges – nincs beállítva a projektnél</span>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ background: stCfg.bg, color: stCfg.szin, border: `1.5px solid ${stCfg.szin}40`, borderRadius: 20, padding: "4px 14px", fontSize: 13, fontWeight: 700, fontFamily: FONT }}>
          {csomag.status}
        </span>
        <span style={{ fontSize: 12, color: C.muted, fontFamily: FONT }}>Verzió: <strong>{csomag.version}</strong></span>
        <span style={{ fontSize: 12, color: C.muted, fontFamily: FONT }}>
          Forrás: <strong>
            {csomag.forras === KIVITELEZESI_CSOMAG_FORRAS.AJANLATBOL ? "Elfogadott ajánlatból (automatikus)"
              : csomag.forras === KIVITELEZESI_CSOMAG_FORRAS.EXCEL_IMPORT ? "Elfogadott tételes Excelből (automatikus)"
              : "Kézi létrehozás"}
          </strong>
        </span>
        {csomag.arPillanatkepDatum && (
          <span style={{ fontSize: 12, color: C.muted, fontFamily: FONT }}>
            Ár-pillanatkép: <strong>{new Date(csomag.arPillanatkepDatum).toLocaleDateString("hu-HU")}</strong>
          </span>
        )}
        {letrehozva && (
          <span style={{ fontSize: 12, color: C.success, fontWeight: 700, fontFamily: FONT }}>✅ Csomag létrehozva</span>
        )}
        {isPMvagyAdmin && kovetkezoStatus && (
          <button type="button" onClick={() => handleStatuszValtas(kovetkezoStatus)}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${C.accent}`, background: "#fff", color: C.accent, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: FONT }}>
            Tovább → {kovetkezoStatus}
          </button>
        )}
        {!kovetkezoStatus && (
          <span style={{ fontSize: 12, color: C.muted, fontFamily: FONT }}>A csomag elérte az utolsó státuszt.</span>
        )}
      </div>

      {/* P0-007: importált tételes Excel pillanatkép megjelenítése – az eredeti
          forrásfájl adatai (a tételek maguk a lenti táblázatban láthatók). */}
      {sajatExcelbol && projekt.elfogadottExcelPillanatkep && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, flexWrap: "wrap", padding: "8px 14px", borderRadius: 9, background: C.bg, border: `1px solid ${C.border}`, fontSize: 12, color: C.muted, fontFamily: FONT }}>
          <span>📄 Importált fájl: <strong style={{ color: C.text }}>{projekt.elfogadottExcelPillanatkep.fileName || "—"}</strong></span>
          <span>Import dátuma: <strong style={{ color: C.text }}>{new Date(projekt.elfogadottExcelPillanatkep.keszult).toLocaleString("hu-HU")}</strong></span>
          <span>Eredeti tételszám: <strong style={{ color: C.text }}>{projekt.elfogadottExcelPillanatkep.tetelek?.length || 0}</strong></span>
          <span>Eredeti összeg (nettó): <strong style={{ color: C.text }}>{(projekt.elfogadottExcelPillanatkep.osszesito?.netto_osszeg || 0).toLocaleString("hu-HU")} Ft</strong></span>
        </div>
      )}

      {statuszHiba && (
        <p style={{ fontSize: 12, color: C.danger, fontWeight: 700, margin: "0 0 14px" }}>{statuszHiba}</p>
      )}
      {szerkesztesTiltott && (
        <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic", margin: "0 0 14px", fontFamily: FONT }}>
          A csomag {csomag.status.toLowerCase()} állapotban van – a mennyiségek és tételek normál módon nem módosíthatók.
        </p>
      )}

      {keziTetelFelvitelEngedve && (
        <div style={{ background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, margin: "0 0 4px", fontFamily: FONT_HEADING }}>
            Tételes anyaglista összeállítása
          </p>
          <p style={{ fontSize: 12, color: C.muted, margin: "0 0 12px", fontFamily: FONT }}>
            Add meg tétel- és mennyiség-szinten, mi kell összesen a projekthez – ezt a listát a munkalapok
            kiosztásakor (Munkalapok fül) tudod majd csapatonként kiosztani. A tétel kizárólag az
            anyagtörzsből választható – szabad szöveges anyagfelvitel nincs, a megnevezés, kategória,
            egység és árak a kiválasztás pillanatában rögzült pillanatképként kerülnek a csomagba.
          </p>
          <AnyagKosarPicker value={keziKosar} onChange={setKeziKosar} />
          <button type="button" onClick={handleKeziKosarHozzaadas} disabled={keziKosar.length === 0}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, padding: "9px 16px", borderRadius: 8, border: "none", background: keziKosar.length === 0 ? C.border : C.accent, color: "#fff", fontWeight: 700, fontSize: 13, cursor: keziKosar.length === 0 ? "default" : "pointer", fontFamily: FONT }}>
            <Plus size={14} /> Hozzáadás a csomaghoz
          </button>
          {keziHiba && (
            <p style={{ fontSize: 12, color: C.danger, fontWeight: 700, margin: "10px 0 0" }}>{keziHiba}</p>
          )}
        </div>
      )}

      {isPMvagyAdmin && !szerkesztesTiltott && (
        <AnyagszamitoPanel csomag={csomag} currentUser={currentUser} onCsomagFrissult={setCsomag} anyagelszamolasiMod={anyagMod} />
      )}

      {tetelek.length === 0 ? (
        <p style={{ fontSize: 13, color: C.muted, fontFamily: FONT }}>A csomagban még nincs tétel.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          {mennyisegHiba && (
            <p style={{ fontSize: 12, color: C.danger, fontWeight: 700, margin: "0 0 10px" }}>{mennyisegHiba}</p>
          )}
          {csakMennyisegiElszamolas && (
            <p style={{ fontSize: 12, color: C.accent, fontWeight: 600, margin: "0 0 10px", fontFamily: FONT }}>
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
                <th style={{ ...th, textAlign: "center", width: 110 }}>Sorozatszám köteles</th>
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
                        <span style={{ background: C.successLight, color: C.success, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>✓ Rendben</span>
                      ) : (
                        <span
                          style={{ background: C.dangerLight, color: C.dangerHover, borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 700, display: "inline-block" }}
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
                          style={{ background: t.telepitoLathatosag === "KIADOTT_MENNYISEG" ? C.success : C.muted, color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                          {t.telepitoLathatosag === "KIADOTT_MENNYISEG" ? "✓ Látható" : "Rejtett"}
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: t.telepitoLathatosag === "KIADOTT_MENNYISEG" ? C.success : C.muted, fontWeight: 700 }}>
                          {t.telepitoLathatosag === "KIADOTT_MENNYISEG" ? "✓ Látható" : "Rejtett"}
                        </span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {mennyisegSzerkesztheto ? (
                        <button type="button"
                          onClick={() => handleSorozatszamValtas(t.id, !!t.sorozatszamKoteles)}
                          title={t.sorozatszamKoteles ? "Köteles – kattints a kikapcsoláshoz" : "Nem köteles – kattints a bekapcsoláshoz"}
                          style={{ background: t.sorozatszamKoteles ? C.warning : C.muted, color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
                          {t.sorozatszamKoteles ? "✓ Köteles" : "Nem köteles"}
                        </button>
                      ) : (
                        <span style={{ fontSize: 11, color: t.sorozatszamKoteles ? C.warning : C.muted, fontWeight: 700 }}>
                          {t.sorozatszamKoteles ? "✓ Köteles" : "Nem köteles"}
                        </span>
                      )}
                    </td>
                    {arakLathatok && (
                      <>
                        <td style={{ ...td, textAlign: "right" }}>{eladasiAr.toLocaleString("hu-HU")} Ft</td>
                        <td style={{ ...td, textAlign: "right" }}>{beszerzesiAr.toLocaleString("hu-HU")} Ft</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700, color: anyagHasznotKellSzamolni ? C.success : C.muted }}>
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
