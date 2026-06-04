import { useRef } from "react";
import { Printer, X } from "lucide-react";
import { FONT, FONT_HEADING } from "../lib/constants";

const load = id => { try { const r=localStorage.getItem(id); return r?JSON.parse(r):null; } catch { return null; } };

const NYILATKOZAT = `Az ügyféllel a felmérési lapon szereplő valamennyi műszaki és kivitelezési pont részletesen egyeztetésre került, beleértve az eszközök és napelemek elhelyezését, az AC és DC kábelnyomvonalak kialakítását, valamint a csatlakozási pont korszerűsítésének módját és annak megfelelő kivitelezését.

Felhívjuk a figyelmet, hogy az előzetes egyeztetés nélküli módosítások vagy eltérések a kivitelezés során többletköltséget és határidő módosulást vonhatnak maguk után.`;

export default function FelmeresJegyzokonyv({ m, onClose }) {
  const adatok   = load(`crm_ml_${m.id}_felm_adat`) || {};
  const alairas  = load(`crm_ml_${m.id}_felm_alairas`);
  const nyilatkozat = adatok.nyilatkozat || m.felmeres?.nyilatkozat || false;

  // Dátum: mentés ideje, vagy mai dátum
  const datum = adatok.felmeresIdopont
    || m.felmeres?.felmeresIdopont
    || new Date().toISOString().slice(0, 10);
  const datumHu = new Date(datum).toLocaleDateString("hu-HU", {
    year:"numeric", month:"long", day:"numeric"
  });

  // Csapat: a munkalaphoz rendelt csapat neve
  const csapatNev = m.assigneeNev || m.csapatNev || "—";

  function handlePrint() {
    const w = window.open("", "_blank");
    w.document.write(`<!DOCTYPE html><html lang="hu"><head>
<meta charset="UTF-8">
<title>Felmérési Nyilatkozat – ${m.id}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: Arial, sans-serif;
    font-size: 11pt;
    color: #111;
    padding: 25mm 20mm 20mm;
    max-width: 210mm;
  }
  .fejlec {
    text-align: center;
    margin-bottom: 10mm;
    padding-bottom: 5mm;
    border-bottom: 2pt solid #1E3A5F;
  }
  .cim { font-size: 18pt; font-weight: bold; color: #1E3A5F; margin-bottom: 3mm; }
  .alcim { font-size: 10pt; color: #64748B; }
  .projekt-kod { font-size: 9pt; color: #94A3B8; margin-top: 2mm; }
  .info-sor {
    display: flex;
    justify-content: space-between;
    margin: 8mm 0;
    padding: 4mm 6mm;
    background: #F8FAFC;
    border-radius: 3pt;
    border: 0.5pt solid #E2E8F0;
  }
  .info-sor div { text-align: center; }
  .info-sor .label { font-size: 9pt; color: #64748B; font-weight: bold; margin-bottom: 1mm; }
  .info-sor .ertek { font-size: 11pt; color: #1E3A5F; font-weight: bold; }
  .nyilatkozat-box {
    border: 1.5pt solid #1E3A5F;
    border-radius: 4pt;
    padding: 6mm;
    margin: 8mm 0;
  }
  .nyilatkozat-cim {
    font-size: 12pt;
    font-weight: bold;
    color: #1E3A5F;
    margin-bottom: 4mm;
  }
  .check-sor {
    display: flex;
    gap: 3mm;
    align-items: flex-start;
    margin-bottom: 4mm;
  }
  .check-box {
    width: 6mm;
    height: 6mm;
    border: 1.5pt solid ${nyilatkozat ? "#22C55E" : "#1E3A5F"};
    border-radius: 1.5pt;
    background: ${nyilatkozat ? "#22C55E" : "#fff"};
    flex-shrink: 0;
    margin-top: 0.5mm;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .check-pipas { color: white; font-size: 10pt; font-weight: bold; }
  .nyilatkozat-szoveg { font-size: 10pt; line-height: 1.7; color: #111; }
  .alairas-szekció {
    margin-top: 8mm;
    display: flex;
    justify-content: space-between;
    gap: 10mm;
  }
  .alairas-blokk { flex: 1; }
  .alairas-cim { font-size: 10pt; font-weight: bold; color: #1E3A5F; margin-bottom: 3mm; }
  .alairas-kep {
    border: 1pt solid #CBD5E1;
    border-radius: 3pt;
    height: 28mm;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2mm;
    background: #FAFAFA;
  }
  .alairas-kep img { max-height: 26mm; max-width: 100%; object-fit: contain; }
  .alairas-vonal {
    border-top: 1pt solid #333;
    margin-top: 20mm;
    padding-top: 2mm;
  }
  .alairas-nev { font-size: 9pt; color: #64748B; }
  .labléc {
    margin-top: 12mm;
    padding-top: 3mm;
    border-top: 0.5pt solid #E2E8F0;
    text-align: center;
    font-size: 8pt;
    color: #94A3B8;
  }
  @media print {
    body { padding: 15mm 15mm 10mm; }
  }
</style>
</head><body>

<div class="fejlec">
  <div class="cim">☀️ Felmérési Nyilatkozat</div>
  <div class="alcim">Napelemes rendszer – előzetes felmérési egyeztetés</div>
  <div class="projekt-kod">Projekt kód: <strong>${m.id}</strong></div>
</div>

<div class="info-sor">
  <div>
    <div class="label">Ügyfél neve</div>
    <div class="ertek">${m.clientNev || "—"}</div>
  </div>
  <div>
    <div class="label">Felmérés dátuma</div>
    <div class="ertek">${datumHu}</div>
  </div>
  <div>
    <div class="label">Felmérést végezte</div>
    <div class="ertek">${csapatNev}</div>
  </div>
</div>

<div class="nyilatkozat-box">
  <div class="nyilatkozat-cim">Nyilatkozat</div>
  <div class="check-sor">
    <div class="check-box">
      ${nyilatkozat ? '<span class="check-pipas">✓</span>' : ""}
    </div>
    <p class="nyilatkozat-szoveg">${NYILATKOZAT.replace(/\n/g, "<br>")}</p>
  </div>
</div>

<div class="alairas-szekció">
  <div class="alairas-blokk">
    <div class="alairas-cim">Ügyfél aláírása</div>
    ${alairas
      ? `<div class="alairas-kep"><img src="${alairas}" alt="Aláírás"/></div>`
      : `<div class="alairas-vonal"></div>`
    }
    <div class="alairas-nev">${m.clientNev || "Ügyfél"}</div>
  </div>
  <div class="alairas-blokk">
    <div class="alairas-cim">Felmérést végző</div>
    <div class="alairas-vonal"></div>
    <div class="alairas-nev">${csapatNev}</div>
  </div>
</div>

<div class="labléc">
  Kelt: ${datumHu} &nbsp;|&nbsp; Projekt: ${m.id} &nbsp;|&nbsp; CRM Napelem rendszer
</div>

</body></html>`);
    w.document.close();
    w.onload = () => w.print();
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:2000, background:"rgba(0,0,0,.65)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:"20px 16px",
    }}>
      <div style={{
        background:"#fff", borderRadius:16, width:"100%", maxWidth:480,
        boxShadow:"0 24px 60px rgba(0,0,0,.3)", overflow:"hidden", fontFamily:FONT,
      }}>
        {/* Fejléc */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"1px solid #E2E8F0", background:"#F8FAFC" }}>
          <div>
            <h2 style={{ fontSize:16, fontWeight:800, margin:0, color:"#0F172A" }}>📋 Felmérési Nyilatkozat</h2>
            <p style={{ fontSize:12, color:"#64748B", margin:"2px 0 0" }}>{m.id} · {m.clientNev}</p>
          </div>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:"#64748B" }}>
            <X size={22}/>
          </button>
        </div>

        {/* Előnézet */}
        <div style={{ padding:"20px" }}>
          {/* Info sor */}
          <div style={{ display:"flex", gap:12, marginBottom:16 }}>
            {[["📅 Dátum", datumHu], ["👷 Csapat", csapatNev]].map(([l,v]) => (
              <div key={l} style={{ flex:1, background:"#F8FAFC", borderRadius:10, padding:"10px 12px", border:"1px solid #E2E8F0" }}>
                <p style={{ fontSize:10, fontWeight:700, color:"#64748B", marginBottom:3 }}>{l}</p>
                <p style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{v}</p>
              </div>
            ))}
          </div>

          {/* Nyilatkozat */}
          <div style={{ border:`2px solid ${nyilatkozat?"#22C55E":"#E2E8F0"}`, borderRadius:12, padding:"14px", marginBottom:14 }}>
            <div style={{ display:"flex", gap:10, marginBottom:8 }}>
              <div style={{ width:22, height:22, borderRadius:5, border:`2px solid ${nyilatkozat?"#22C55E":"#CBD5E1"}`, background:nyilatkozat?"#22C55E":"#fff", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                {nyilatkozat && <span style={{ color:"#fff", fontSize:14, fontWeight:800 }}>✓</span>}
              </div>
              <p style={{ fontSize:12, color:nyilatkozat?"#166534":"#94A3B8", fontWeight:600 }}>
                {nyilatkozat ? "✅ Nyilatkozat elfogadva" : "⬜ Nem fogadta el"}
              </p>
            </div>
            <p style={{ fontSize:11, color:"#475569", lineHeight:1.6 }}>{NYILATKOZAT}</p>
          </div>

          {/* Aláírás */}
          <div style={{ border:"1px solid #E2E8F0", borderRadius:12, padding:"12px", marginBottom:16 }}>
            <p style={{ fontSize:12, fontWeight:700, color:"#0F172A", marginBottom:8 }}>✍️ Ügyfél aláírása</p>
            {alairas
              ? <img src={alairas} alt="Aláírás" style={{ border:"1px solid #E2E8F0", borderRadius:8, maxHeight:80, maxWidth:"100%" }}/>
              : <p style={{ fontSize:12, color:"#CBD5E1", fontStyle:"italic" }}>Nincs rögzítve</p>
            }
          </div>
        </div>

        {/* Lábléc */}
        <div style={{ padding:"12px 20px", borderTop:"1px solid #E2E8F0", background:"#F8FAFC", display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose} style={{ padding:"9px 16px", borderRadius:9, border:"1.5px solid #E2E8F0", background:"#fff", color:"#475569", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:FONT }}>
            Bezárás
          </button>
          <button onClick={handlePrint} style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 20px", background:"#1E3A5F", color:"#fff", border:"none", borderRadius:9, cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:FONT }}>
            <Printer size={16}/> PDF mentés
          </button>
        </div>
      </div>
    </div>
  );
}
