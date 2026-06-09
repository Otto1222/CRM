import { C, FONT } from "../../../lib/constants.js";
import { calcEsmentProjektPenzugy } from "../../../services/workOrderFinancial.service.js";
import { ft } from "../../../lib/helpers.js";
import { getStatusConfig, getAnyagelszamolasiModConfig, hasAnyagelszamolasiMod } from "../projekt.schema.js";
import { formatProjectType } from "../../../lib/projectTypeFormatter.js";

function fmtDatum(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("hu-HU");
}

function Row({ label, value, bold }) {
  if (!value) return null;
  return (
    <div style={{ display:"flex", gap:12, padding:"8px 0", borderBottom:"1px solid #F1F5F9" }}>
      <span style={{ fontSize:12, color:"#64748B", fontWeight:600, minWidth:160 }}>{label}</span>
      <span style={{ fontSize:13, color:"#0F172A", fontWeight: bold?700:400 }}>{value}</span>
    </div>
  );
}

export default function TabAttekintes({ projekt, munkalapok }) {
  const pillanatkep = projekt.elfogadottAjanlatPillanatkep || null;
  const mls     = (munkalapok||[]).filter(m => m.projektId === projekt.id || projekt.munkalapIds?.includes(m.id));
  const kalk    = projekt.penzugy?.fovallalkoziId ? calcEsmentProjektPenzugy(projekt) : null;
  const stCfg   = getStatusConfig(projekt.status);
  const anyagCfg = getAnyagelszamolasiModConfig(projekt.anyagelszamolasiMod);
  const aktiv   = mls.filter(m=>!["Lezárva","Számlázva","Ellenőrzés alatt"].includes(m.status)).length;

  return (
    <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:16, padding:"20px 0" }}>
      <div>
        <p style={{ fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:.7, marginBottom:12 }}>Projekt adatok</p>
        <div style={{ background:"#fff", borderRadius:12, padding:"14px 16px", border:"1px solid #E2E8F0" }}>
          <Row label="Projektkód"       value={projekt.projektkod} bold/>
          <Row label="Külső azonosító"  value={projekt.kulsoAzonosito}/>
          <Row label="Típus"            value={formatProjectType(projekt.tipus)}/>
          <Row label="Ügyfél neve"      value={projekt.clientNev}/>
          <Row label="Kapcsolattartó"   value={projekt.kapcsolattarto}/>
          <Row label="Telefonszám"      value={projekt.clientTel}/>
          <Row label="E-mail"           value={projekt.clientEmail}/>
          <Row label="Lakcím"           value={projekt.clientCim}/>
          <Row label="Telepítési cím"   value={projekt.telepitesiCim}/>
          <Row label="Projektvezető"    value={projekt.projektvezetoNev}/>
          <Row label="Csapat"           value={projekt.csapatNev}/>
          <div style={{ display:"flex", gap:12, padding:"8px 0" }}>
            <span style={{ fontSize:12, color:"#64748B", fontWeight:600, minWidth:160 }}>Anyagelszámolási mód</span>
            {hasAnyagelszamolasiMod(projekt) ? (
              <span style={{ fontSize:13, fontWeight:700, color: anyagCfg.color }}>{anyagCfg.label}</span>
            ) : (
              <span style={{ fontSize:12, fontWeight:700, color:"#DC2626" }}>⚠ Admin ellenőrzés szükséges – nincs beállítva</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ background: stCfg.bg, border:`1.5px solid ${stCfg.szin}40`, borderRadius:12, padding:"14px 16px" }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:.7, marginBottom:8 }}>Státusz</p>
          <span style={{ background: stCfg.szin, color:"#fff", borderRadius:20, padding:"4px 14px", fontSize:13, fontWeight:700 }}>{projekt.status}</span>
        </div>

        <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:12, padding:"14px 16px" }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:.7, marginBottom:8 }}>Ütemezés</p>
          <Row label="Terv. kezdés"     value={projekt.tervezettKezdes}/>
          <Row label="Terv. befejezés"  value={projekt.tervezettBefejezes}/>
          <Row label="Valós kezdés"     value={projekt.valoKezdes}/>
          <Row label="Valós befejezés"  value={projekt.valoBefejezes}/>
          <Row label="Ledolgozott óra"  value={projekt.elvegzettMunkaora ? projekt.elvegzettMunkaora + " óra" : null}/>
        </div>

        {/* ── Fázis 4A: az elfogadott ajánlat lefagyasztott pillanatképe ── */}
        {pillanatkep && (
          <div style={{ background:"#FAF5FF", border:"1px solid #E9D5FF", borderRadius:12, padding:"14px 16px" }}>
            <p style={{ fontSize:11, fontWeight:700, color:"#7C3AED", textTransform:"uppercase", letterSpacing:.7, marginBottom:8 }}>
              📋 Elfogadott ajánlat (lefagyasztott pillanatkép)
            </p>
            <Row label="Ajánlat kódja"      value={pillanatkep.ajanlatkod} bold/>
            <Row label="Ajánlat dátuma"     value={fmtDatum(pillanatkep.ajanlatDatuma)}/>
            <Row label="Ajánlat státusza (akkor)" value={pillanatkep.ajanlatStatusza}/>
            <Row label="Nettó összeg"       value={pillanatkep.osszesito?.netto_osszeg ? ft(pillanatkep.osszesito.netto_osszeg) : null}/>
            <Row label="Bruttó összeg"      value={pillanatkep.osszesito?.brutto_osszeg ? ft(pillanatkep.osszesito.brutto_osszeg) : null} bold/>
            <Row label="Pillanatkép készült" value={fmtDatum(pillanatkep.keszult)}/>
            <p style={{ fontSize:11, color:"#7C3AED", marginTop:8, lineHeight:1.5 }}>
              Ez az adat a projekt létrehozásakor rögzült és változatlan marad – az ajánlat
              vagy az anyagárak későbbi módosítása nem írja felül.
            </p>
          </div>
        )}

        {/* ── Pénzügy összefoglaló – részletek a Pénzügy tabon ── */}
        {kalk && (
          <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: .7, marginBottom: 8 }}>
              💰 Kalkulált bevétel – {kalk.fovallalkoNev}
            </p>
            <Row label="Nettó bevétel (terv)"  value={kalk.nettoBevitel > 0 ? ft(kalk.nettoBevitel) : null} bold />
            <Row label="Várható haszon"         value={kalk.nettoBevitel > 0 ? ft(kalk.haszon) : null} />
            <Row label="Haszonkulcs"             value={kalk.haszonPct !== null ? kalk.haszonPct + "%" : null} />
            {kalk.hianyosTetelek?.length > 0 && (
              <p style={{ fontSize: 11, color: "#D97706", marginTop: 6 }}>⚠️ Hiányos konfig: {kalk.hianyosTetelek.join(", ")}</p>
            )}
          </div>
        )}

        <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:12, padding:"14px 16px" }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#1D4ED8", textTransform:"uppercase", letterSpacing:.7, marginBottom:8 }}>Munkalapok</p>
          <Row label="Összesen"   value={mls.length + " db"}/>
          <Row label="Aktív"      value={aktiv > 0 ? aktiv + " db" : null}/>
          <Row label="Lezárt"     value={(mls.length - aktiv) + " db"}/>
        </div>
      </div>
    </div>
  );
}