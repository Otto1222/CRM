import { FONT } from "../../../lib/constants.js";
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

export default function TabAttekintes({ projekt }) {
  const stCfg = getStatusConfig(projekt.status);

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

      <div>
        <p style={{ fontSize:11, fontWeight:700, color:"#64748B", textTransform:"uppercase", letterSpacing:.7, marginBottom:12 }}>Státusz</p>
        <div style={{ background: stCfg.bg, border:`1.5px solid ${stCfg.szin}40`, borderRadius:12, padding:"14px 16px" }}>
          <span style={{ background: stCfg.szin, color:"#fff", borderRadius:20, padding:"4px 14px", fontSize:13, fontWeight:700 }}>{projekt.status}</span>
        </div>
      </div>
    </div>
  );
}