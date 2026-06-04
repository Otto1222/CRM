import { useMemo } from "react";
import { FONT, FONT_HEADING } from "../../../lib/constants.js";
import { ft } from "../../../lib/helpers.js";
import { loadAjanlatok } from "../../ajanla tok/ajanlat.service.js";
import { getAjanlatStatusConfig } from "../../ajanla tok/ajanlat.schema.js";
import { PROJEKT_FORRAS, getProjektTipus } from "../projekt.schema.js";

export default function TabAjanlatok({ projekt }) {
  const ajanlat = useMemo(() => {
    if (!projekt?.ajanlatId) return null;
    return loadAjanlatok().find(a => a.id === projekt.ajanlatId) || null;
  }, [projekt?.ajanlatId]);

  const forrásConfig = PROJEKT_FORRAS.find(f => f.id === projekt?.forrás);

  return (
    <div style={{ padding: "20px 0", fontFamily: FONT }}>
      {/* Projekt forrása + típusa */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        {forrásConfig && (
          <div style={{ background: forrásConfig.bg, border: `1.5px solid ${forrásConfig.color}40`, borderRadius: 10, padding: "10px 16px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: forrásConfig.color, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 2px" }}>Projekt forrása</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: forrásConfig.color, margin: 0 }}>{forrásConfig.label}</p>
          </div>
        )}
        {projekt?.forrás && (
          <div style={{ background: projekt.forrás === "fővállalkozói" ? C.accentLight : C.accentLight, border: `1.5px solid ${projekt.forrás === "fővállalkozói" ? C.accent : C.accentLight}`, borderRadius: 10, padding: "10px 16px" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: projekt.forrás === "fővállalkozói" ? C.accent : C.accent, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 2px" }}>Projekt típusa</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: projekt.forrás === "fővállalkozói" ? C.accent : C.accent, margin: 0 }}>{getProjektTipus(projekt.forrás)}</p>
          </div>
        )}
      </div>

      {/* Fővállalkozói extra adatok */}
      {projekt?.forrás === "fővállalkozói" && (projekt.fovKapcsolattarto || projekt.fovFizetesiHatarido || projekt.fovMegjegyzes) && (
        <div style={{ background: C.accentLight, border: "1.5px solid #C4B5FD", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
          <p style={{ fontFamily: FONT_HEADING, fontSize: 14, fontWeight: 800, color: C.accent, margin: "0 0 12px" }}>Fővállalkozói adatok</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {projekt.fovKapcsolattarto && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 2px" }}>Kapcsolattartó</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{projekt.fovKapcsolattarto}</p>
              </div>
            )}
            {projekt.fovFizetesiHatarido && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 2px" }}>Fizetési határidő</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{projekt.fovFizetesiHatarido}</p>
              </div>
            )}
            {projekt.fovMegjegyzes && (
              <div style={{ gridColumn: "span 2" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 2px" }}>Megjegyzés</p>
                <p style={{ fontSize: 14, color: C.text, margin: 0 }}>{projekt.fovMegjegyzes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Linked ajánlat */}
      {ajanlat ? (
        <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid #E2E8F0", background: C.bg, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontFamily: FONT_HEADING, fontSize: 15, fontWeight: 800, color: C.text, margin: 0 }}>Kapcsolódó ajánlat</p>
              <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>{ajanlat.ajanlatkod}</p>
            </div>
            {(() => {
              const cfg = getAjanlatStatusConfig(ajanlat.status);
              return <span style={{ background: cfg.bg, color: cfg.szin, borderRadius: 20, padding: "4px 12px", fontSize: 12, fontWeight: 700 }}>{ajanlat.status}</span>;
            })()}
          </div>
          <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 2px" }}>Ügyfél</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{ajanlat.clientNev || "—"}</p>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 2px" }}>Ajánlott összeg</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: C.success, margin: 0 }}>{ajanlat.osszeg ? ft(Number(ajanlat.osszeg)) : "—"}</p>
            </div>
            {ajanlat.ervenyesseg && (
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 2px" }}>Érvényesség</p>
                <p style={{ fontSize: 14, color: C.text, margin: 0 }}>{ajanlat.ervenyesseg}</p>
              </div>
            )}
            {ajanlat.megjegyzes && (
              <div style={{ gridColumn: "span 2" }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 2px" }}>Megjegyzés</p>
                <p style={{ fontSize: 14, color: C.text, margin: 0 }}>{ajanlat.megjegyzes}</p>
              </div>
            )}
          </div>
        </div>
      ) : projekt?.forrás === "saját_ügyfél" ? (
        <div style={{ background: C.warningLight, border: "1.5px solid #FCD34D", borderRadius: 10, padding: "14px 18px", color: C.warning, fontSize: 13 }}>
          ℹ️ Ez a projekt elfogadott árajánlatból jött létre, de az ajánlat hivatkozás nincs beállítva. Az ajánlatot az <strong>Árajánlatok</strong> modulban találod.
        </div>
      ) : !projekt?.forrás ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: C.muted }}>
          <p style={{ fontSize: 24, marginBottom: 12 }}>📋</p>
          <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 6px" }}>Nincs megadva projekt forrás</p>
          <p style={{ fontSize: 13, margin: 0 }}>Szerkeszd a projektet és add meg a forrását (Saját ügyfél / Fővállalkozói / Garanciális / Javítási).</p>
        </div>
      ) : (
        <div style={{ background: C.bg, border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "16px 20px", color: C.muted, fontSize: 13 }}>
          Ehhez a projekttípushoz ({forrásConfig?.label || projekt.forrás}) nem tartozik árajánlat.
        </div>
      )}
    </div>
  );
}
