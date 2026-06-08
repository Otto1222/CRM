import { useState, useEffect } from "react";
import { Package, Plus } from "lucide-react";
import { FONT, FONT_HEADING } from "../../../lib/constants.js";
import {
  getKivitelezesiCsomagByProjektId,
  createKivitelezesiCsomagForProjekt,
} from "../../kivitelezesi_csomag/kivitelezesiCsomag.service.js";
import {
  getKivitelezesiCsomagStatusConfig,
  calcKiviTetelEltérés,
  KIVITELEZESI_CSOMAG_FORRAS,
} from "../../kivitelezesi_csomag/kivitelezesiCsomag.schema.js";

const th = { textAlign: "left", padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "1.5px solid #E2E8F0" };
const td = { padding: "8px 10px", fontSize: 13, color: "#0F172A", borderBottom: "1px solid #F1F5F9" };

export default function TabKivitelezesiCsomag({ projekt, currentUser }) {
  const [csomag, setCsomag] = useState(() => getKivitelezesiCsomagByProjektId(projekt.id));
  const [hiba, setHiba]     = useState("");
  const [letrehozva, setLetrehozva] = useState(false);

  useEffect(() => {
    setCsomag(getKivitelezesiCsomagByProjektId(projekt.id));
  }, [projekt.id]);

  const sajatAjanlatbol = projekt.forrás === "sajat_ajanlat" && !!projekt.elfogadottAjanlatPillanatkep;

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

  return (
    <div style={{ padding: "20px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
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
      </div>

      {tetelek.length === 0 ? (
        <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: FONT }}>A csomagban még nincs tétel.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
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
              </tr>
            </thead>
            <tbody>
              {tetelek.map(t => {
                const elteres = calcKiviTetelEltérés(t);
                return (
                  <tr key={t.id}>
                    <td style={td}>{t.cikkszam || "—"}</td>
                    <td style={td}>{t.nev || "—"}</td>
                    <td style={td}>{t.kategoria || "—"}</td>
                    <td style={td}>{t.egyseg}</td>
                    <td style={{ ...td, textAlign: "right" }}>{t.tervezettMennyiseg}</td>
                    <td style={{ ...td, textAlign: "right" }}>{t.kiadandoMennyiseg}</td>
                    <td style={{ ...td, textAlign: "right" }}>{t.kiadottMennyiseg}</td>
                    <td style={{ ...td, textAlign: "right" }}>{t.felhasznaltMennyiseg}</td>
                    <td style={{ ...td, textAlign: "right" }}>{t.visszahozottMennyiseg}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700, color: elteres !== 0 ? "#DC2626" : "#16A34A" }}>{elteres}</td>
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
