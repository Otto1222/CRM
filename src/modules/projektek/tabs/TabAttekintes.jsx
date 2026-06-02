import { C, FONT } from "../../../lib/constants.js";
import { calcProjektPenzugy } from "../../../lib/costEngine.js";
import { ft } from "../../../lib/helpers.js";
import { getStatusConfig } from "../projekt.schema.js";
import { formatProjectType } from "../../../lib/projectTypeFormatter.js";

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
  const mls     = (munkalapok||[]).filter(m => m.projektId === projekt.id || projekt.munkalapIds?.includes(m.id));
  const penz    = calcProjektPenzugy(mls);
  const stCfg   = getStatusConfig(projekt.status);
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

        <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:12, padding:"14px 16px" }}>
          <p style={{ fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:.7, marginBottom:8 }}>Pénzügy</p>
          {[
            ["Elfogadott ajánlat", projekt.elfogadottAjanlat > 0 ? ft(projekt.elfogadottAjanlat) : null, true],
            ["Bevétel (számlázott)", penz.bevetal > 0 ? ft(penz.bevetal) : null],
            ["Összes költség",      penz.osszesKolts > 0 ? ft(penz.osszesKolts) : null],
            ["Eredmény",            penz.bevetal > 0 ? ft(penz.eredmeny) : null, true],
            ["Haszon %",            penz.haszonPct !== null && penz.bevetal > 0 ? penz.haszonPct + "%" : null],
          ].map(([l,v,b]) => v ? <Row key={l} label={l} value={v} bold={b}/> : null)}
          {penz.bevetal === 0 && <p style={{ fontSize:12, color:"#94A3B8", fontStyle:"italic" }}>Még nincs számlázott bevétel</p>}
        </div>

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