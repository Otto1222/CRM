import { C, FONT } from "../../../lib/constants.js";
import { calcEsmentProjektPenzugy } from "../../../services/workOrderFinancial.service.js";
import { ft } from "../../../lib/helpers.js";
import { getStatusConfig, getAnyagelszamolasiModConfig, hasAnyagelszamolasiMod } from "../projekt.schema.js";
import { formatProjectType } from "../../../lib/projectTypeFormatter.js";
import { PROJEKT_STATUSZOK } from "../../../lib/workflowRules.js";
import {
  getKivitelezesiCsomagByProjektId,
} from "../../kivitelezesi_csomag/kivitelezesiCsomag.service.js";
import {
  KIVITELEZESI_CSOMAG_STATUSZOK,
  getKivitelezesiCsomagStatusConfig,
} from "../../kivitelezesi_csomag/kivitelezesiCsomag.schema.js";
import { getPenzugyi } from "../../penzugy/penzugyi.service.js";
import {
  ELSZAMOLAS_STATUSZOK, SZAMLAZAS_STATUSZOK, TIG_STATUSZOK,
  getElszamolasConfig, getSzamlazasConfig, getTigConfig,
} from "../../../lib/penzugyiRules.js";

// ─── Projekt életút csík ────────────────────────────────────────────────
// Egyetlen pillantásra megmutatja mind az 5, egymástól független
// állapotgépet (Projekt / Kivitelezési Csomag / Elszámolás / Számlázás /
// TIG) – ezek külön adatot mérnek (fizikai munka ≠ elszámolás ≠ számlázás
// ≠ TIG papírmunka), ezért szándékosan NEM egy közös mezőbe olvasztva
// jelennek meg, csak egymás mellett, összehasonlíthatóan. Tisztán
// megjelenítési réteg – nem ír semmilyen adatot, a részletek és a váltás
// változatlanul a Kivitelezési Csomag / Pénzügy fülön történik.
function eletutSav({ label, statusId, lista, cfg, hianyzikSzoveg }) {
  if (!statusId) {
    return { label, ures: true, szoveg: hianyzikSzoveg };
  }
  const idx = lista.findIndex(s => s.id === statusId);
  return {
    label,
    statusId,
    szin: cfg.szin,
    bg: cfg.bg,
    lepes: idx >= 0 ? `${idx + 1}. / ${lista.length} lépés` : null,
  };
}

function EletutKartya({ sav }) {
  return (
    <div style={{ flex: "1 1 160px", minWidth: 150, background: sav.ures ? C.bg : sav.bg, border: `1.5px solid ${sav.ures ? C.border : sav.szin + "55"}`, borderRadius: 10, padding: "10px 12px" }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .6, margin: "0 0 6px" }}>{sav.label}</p>
      {sav.ures ? (
        <span style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>{sav.szoveg}</span>
      ) : (
        <>
          <span style={{ display: "inline-block", background: sav.szin, color: "#fff", borderRadius: 20, padding: "3px 10px", fontSize: 12, fontWeight: 700 }}>{sav.statusId}</span>
          {sav.lepes && <p style={{ fontSize: 10, color: C.muted, margin: "5px 0 0" }}>{sav.lepes}</p>}
        </>
      )}
    </div>
  );
}

function ProjektEletutCsik({ projekt }) {
  const csomag   = getKivitelezesiCsomagByProjektId(projekt.id);
  const penzugyi = getPenzugyi(projekt.id);

  const savok = [
    eletutSav({ label: "Projekt",            statusId: projekt.status,             lista: PROJEKT_STATUSZOK,            cfg: getStatusConfig(projekt.status) }),
    eletutSav({ label: "Kivitelezési csomag", statusId: csomag?.status,             lista: KIVITELEZESI_CSOMAG_STATUSZOK, cfg: csomag ? getKivitelezesiCsomagStatusConfig(csomag.status) : null, hianyzikSzoveg: "Még nincs csomag" }),
    eletutSav({ label: "Elszámolás",          statusId: penzugyi?.elszamolasStatusz, lista: ELSZAMOLAS_STATUSZOK,        cfg: penzugyi ? getElszamolasConfig(penzugyi.elszamolasStatusz) : null, hianyzikSzoveg: "Nincs pénzügyi rekord" }),
    eletutSav({ label: "Számlázás",           statusId: penzugyi?.szamlazasStatusz,  lista: SZAMLAZAS_STATUSZOK,         cfg: penzugyi ? getSzamlazasConfig(penzugyi.szamlazasStatusz) : null, hianyzikSzoveg: "Nincs pénzügyi rekord" }),
    eletutSav({ label: "TIG",                 statusId: penzugyi?.tigStatusz,        lista: TIG_STATUSZOK,               cfg: penzugyi ? getTigConfig(penzugyi.tigStatusz) : null, hianyzikSzoveg: "Nincs pénzügyi rekord" }),
  ];

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
      {savok.map(sav => <EletutKartya key={sav.label} sav={sav} />)}
    </div>
  );
}

function fmtDatum(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("hu-HU");
}

function Row({ label, value, bold }) {
  if (!value) return null;
  return (
    <div style={{ display:"flex", gap:12, padding:"8px 0", borderBottom:`1px solid ${C.bg}` }}>
      <span style={{ fontSize:12, color:C.muted, fontWeight:600, minWidth:160 }}>{label}</span>
      <span style={{ fontSize:13, color:C.text, fontWeight: bold?700:400 }}>{value}</span>
    </div>
  );
}

export default function TabAttekintes({ projekt, munkalapok }) {
  const pillanatkep = projekt.elfogadottAjanlatPillanatkep || null;
  const mls     = (munkalapok||[]).filter(m => m.projektId === projekt.id || projekt.munkalapIds?.includes(m.id));
  const kalk    = projekt.penzugy?.fovallalkoziId ? calcEsmentProjektPenzugy(projekt) : null;
  const anyagCfg = getAnyagelszamolasiModConfig(projekt.anyagelszamolasiMod);
  const aktiv   = mls.filter(m=>!["Lezárva","Számlázva","Ellenőrzés alatt"].includes(m.status)).length;

  return (
    <div style={{ padding:"20px 0" }}>
      <ProjektEletutCsik projekt={projekt} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))", gap:16 }}>
      <div>
        <p style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.7, marginBottom:12 }}>Projekt adatok</p>
        <div style={{ background:"#fff", borderRadius:12, padding:"14px 16px", border:`1px solid ${C.border}` }}>
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
          <div style={{ marginTop:8, padding:"10px 12px", borderRadius:9, background: anyagCfg.bg, border:`1.5px solid ${anyagCfg.color}40` }}>
            <p style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.6, margin:"0 0 4px" }}>Anyagelszámolási mód</p>
            {hasAnyagelszamolasiMod(projekt) ? (
              <>
                <span style={{ fontSize:13, fontWeight:700, color: anyagCfg.color }}>{anyagCfg.label}</span>
                {anyagCfg.desc && <p style={{ fontSize:11, color:C.muted, margin:"3px 0 0", lineHeight:1.4 }}>{anyagCfg.desc}</p>}
              </>
            ) : (
              <span style={{ fontSize:13, fontWeight:700, color:C.danger }}>⚠ Admin ellenőrzés szükséges – nincs beállítva</span>
            )}
          </div>
        </div>
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px" }}>
          <p style={{ fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.7, marginBottom:8 }}>Ütemezés</p>
          <Row label="Terv. kezdés"     value={projekt.tervezettKezdes}/>
          <Row label="Terv. befejezés"  value={projekt.tervezettBefejezes}/>
          <Row label="Valós kezdés"     value={projekt.valoKezdes}/>
          <Row label="Valós befejezés"  value={projekt.valoBefejezes}/>
          <Row label="Ledolgozott óra"  value={projekt.elvegzettMunkaora ? projekt.elvegzettMunkaora + " óra" : null}/>
        </div>

        {/* ── Fázis 4A: az elfogadott ajánlat lefagyasztott pillanatképe ── */}
        {pillanatkep && (
          <div style={{ background:"#FAF5FF", border:"1px solid #E9D5FF", borderRadius:12, padding:"14px 16px" }}>
            <p style={{ fontSize:11, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:.7, marginBottom:8 }}>
              📋 Elfogadott ajánlat (lefagyasztott pillanatkép)
            </p>
            <Row label="Ajánlat kódja"      value={pillanatkep.ajanlatkod} bold/>
            <Row label="Ajánlat dátuma"     value={fmtDatum(pillanatkep.ajanlatDatuma)}/>
            <Row label="Ajánlat státusza (akkor)" value={pillanatkep.ajanlatStatusza}/>
            <Row label="Nettó összeg"       value={pillanatkep.osszesito?.netto_osszeg ? ft(pillanatkep.osszesito.netto_osszeg) : null}/>
            <Row label="Bruttó összeg"      value={pillanatkep.osszesito?.brutto_osszeg ? ft(pillanatkep.osszesito.brutto_osszeg) : null} bold/>
            <Row label="Pillanatkép készült" value={fmtDatum(pillanatkep.keszult)}/>
            <p style={{ fontSize:11, color:C.accent, marginTop:8, lineHeight:1.5 }}>
              Ez az adat a projekt létrehozásakor rögzült és változatlan marad – az ajánlat
              vagy az anyagárak későbbi módosítása nem írja felül.
            </p>
          </div>
        )}

        {/* ── Pénzügy összefoglaló – részletek a Pénzügy tabon ── */}
        {kalk && (
          <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 12, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.success, textTransform: "uppercase", letterSpacing: .7, marginBottom: 8 }}>
              💰 Kalkulált bevétel – {kalk.fovallalkoNev}
            </p>
            <Row label="Nettó bevétel (terv)"  value={kalk.nettoBevitel > 0 ? ft(kalk.nettoBevitel) : null} bold />
            <Row label="Várható haszon"         value={kalk.nettoBevitel > 0 ? ft(kalk.haszon) : null} />
            <Row label="Haszonkulcs"             value={kalk.haszonPct !== null ? kalk.haszonPct + "%" : null} />
            {kalk.hianyosTetelek?.length > 0 && (
              <p style={{ fontSize: 11, color: C.warning, marginTop: 6 }}>⚠️ Hiányos konfig: {kalk.hianyosTetelek.join(", ")}</p>
            )}
          </div>
        )}

        <div style={{ background:C.accentLight, border:`1px solid ${C.accentLight}`, borderRadius:12, padding:"14px 16px" }}>
          <p style={{ fontSize:11, fontWeight:700, color:C.accent, textTransform:"uppercase", letterSpacing:.7, marginBottom:8 }}>Munkalapok</p>
          <Row label="Összesen"   value={mls.length + " db"}/>
          <Row label="Aktív"      value={aktiv > 0 ? aktiv + " db" : null}/>
          <Row label="Lezárt"     value={(mls.length - aktiv) + " db"}/>
        </div>
      </div>
      </div>
    </div>
  );
}