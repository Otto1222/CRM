import { useRef } from "react";
import { Printer, X } from "lucide-react";
import { FONT, FONT_HEADING } from "../lib/constants";

const loadLocal = id => {
  try { const r = localStorage.getItem(id); return r ? JSON.parse(r) : null; } catch { return null; }
};

const FOTO_KAT = [
  { id:"csatl_pont",    nev:"Csatlakozási pont" },
  { id:"inverter_fal",  nev:"Inverter fal, elhelyezés" },
  { id:"akku_fal",      nev:"Akkumulátor elhelyezése" },
  { id:"teto_tipus",    nev:"Tető típusa" },
  { id:"padlas",        nev:"Padlás" },
  { id:"villamharitor", nev:"Villámhárító" },
  { id:"mero_kismeg",   nev:"Mérőóra és kismegszakító" },
];

const SZOVEGES_MEZOK = [
  { k:"csatlakozasiPont",   label:"Csatlakozási pont" },
  { k:"csatlPontAllapota",  label:"Csatl. pont állapota" },
  { k:"acKabelHossz",       label:"AC kábel terv. hossz (m)" },
  { k:"acVedelem",          label:"AC védelem típus" },
  { k:"kommKabelHossz",     label:"Komm. kábel terv. hossza (m)" },
  { k:"inverterFal",        label:"Inverter fal, elhelyezés" },
  { k:"akkuFal",            label:"Akkumulátor fal, elhelyezés" },
  { k:"akkuKabelHossz",     label:"Akku kábel terv. hossz (m)" },
  { k:"tetoTipus",          label:"Tető típus" },
  { k:"tetoszerkezetTipus", label:"Tetőszerkezet típus" },
  { k:"padlas",             label:"Padlás állapota" },
  { k:"villamharitor",      label:"Villámhárító" },
  { k:"tartoszerkezetTipus",label:"Tartószerkezet típus" },
  { k:"potcserep",          label:"Pótcserép" },
  { k:"dcKabelHossz",       label:"DC kábel terv. hossz (m)" },
  { k:"dcKabelNyomvonal",   label:"DC kábel további nyomvonal" },
  { k:"dcVedelem",          label:"DC védelem típus" },
  { k:"tuzKapcsolo",        label:"Tűzeseti kapcsoló szükséges" },
  { k:"panelElrendezes",    label:"Panel elrendezés információk" },
  { k:"felhordoEszkoz",     label:"Felhordó eszköz" },
  { k:"engedelyeztetes",    label:"Engedélyeztetés állapota" },
  { k:"visszwatt",          label:"Visszwatt védelem" },
  { k:"megkozelithetoseg",  label:"Ingatlan megközelíthetősége" },
];

const NYILATKOZAT = `Az ügyféllel a felmérési lapon szereplő valamennyi műszaki és kivitelezési pont részletesen egyeztetésre került, beleértve az eszközök és napelemek elhelyezését, az AC és DC kábelnyomvonalak kialakítását, valamint a csatlakozási pont korszerűsítésének módját és annak megfelelő kivitelezését.

Felhívjuk a figyelmet, hogy az előzetes egyeztetés nélküli módosítások vagy eltérések a kivitelezés során többletköltséget és határidő módosulást vonhatnak maguk után.`;

export default function FelmeresJegyzokonyv({ m, onClose }) {
  const printRef = useRef();

  // Adatok betöltése
  const katFotok  = loadLocal(`crm_ml_${m.id}_felm_kat`)  || {};
  const fotoNotes = loadLocal(`crm_ml_${m.id}_felm_notes`) || {};
  const adatok    = loadLocal(`crm_ml_${m.id}_felm_adat`)  || {};
  const alairas   = loadLocal(`crm_ml_${m.id}_felm_alairas`);
  const nyilatkozat = adatok.nyilatkozat || false;
  const datum = adatok.felmeresIdopont || m.felmeres?.felmeresIdopont || new Date().toISOString().slice(0, 10);

  function handlePrint() {
    const w = window.open("", "_blank");
    const html = printRef.current.innerHTML;
    w.document.write(`<!DOCTYPE html><html lang="hu"><head>
<meta charset="UTF-8">
<title>Felmérési Jegyzőkönyv – ${m.id}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; padding: 20mm; }
  h1 { font-size: 18pt; font-weight: bold; text-align: center; margin-bottom: 4mm; }
  h2 { font-size: 13pt; font-weight: bold; margin: 6mm 0 3mm; border-bottom: 1pt solid #888; padding-bottom: 2mm; }
  h3 { font-size: 11pt; font-weight: bold; margin: 4mm 0 2mm; color: #333; }
  .header-box { border: 1pt solid #ccc; border-radius: 4pt; padding: 4mm 6mm; margin-bottom: 6mm; background: #f8f8f8; }
  .row { display: flex; gap: 8mm; margin-bottom: 2mm; }
  .row label { font-weight: bold; min-width: 40mm; color: #555; font-size: 10pt; }
  .row span { flex: 1; }
  .mező-sor { margin-bottom: 3mm; padding: 2mm 3mm; background: #fafafa; border-left: 2pt solid #ddd; }
  .mező-label { font-size: 9pt; color: #666; font-weight: bold; }
  .mező-ertek { font-size: 11pt; color: #111; min-height: 6mm; }
  .foto-grid { display: flex; flex-wrap: wrap; gap: 4mm; margin-top: 3mm; }
  .foto-item { text-align: center; }
  .foto-item img { width: 45mm; height: 35mm; object-fit: cover; border: 0.5pt solid #ccc; border-radius: 2pt; }
  .foto-item p { font-size: 8pt; color: #666; margin-top: 1mm; }
  .nyilatkozat-box { border: 1.5pt solid #333; border-radius: 4pt; padding: 4mm 6mm; margin: 6mm 0; background: #f9f9f9; }
  .nyilatkozat-check { display: flex; gap: 4mm; align-items: flex-start; margin-bottom: 3mm; }
  .check-box { width: 6mm; height: 6mm; border: 1.5pt solid #333; border-radius: 2pt; flex-shrink: 0; margin-top: 1mm; display: flex; align-items: center; justify-content: center; background: ${nyilatkozat?"#22C55E":"#fff"}; }
  .nyilatkozat-szoveg { font-size: 10pt; line-height: 1.6; }
  .alairas-box { margin-top: 6mm; }
  .alairas-img { border: 1pt solid #ccc; border-radius: 4pt; max-width: 80mm; max-height: 30mm; }
  .alairas-datum { font-size: 9pt; color: #666; margin-top: 2mm; }
  .aláírás-vonal { border-top: 1pt solid #333; width: 80mm; margin-top: 15mm; }
  .aláírás-label { font-size: 9pt; color: #555; margin-top: 2mm; }
  .ures-sor { height: 4mm; }
  @media print { body { padding: 10mm; } }
</style>
</head><body>
<h1>☀️ Felmérési Jegyzőkönyv</h1>
<div style="text-align:center;margin-bottom:6mm;font-size:10pt;color:#555;">
  Projekt kód: <strong>${m.id}</strong> &nbsp;|&nbsp; Dátum: <strong>${datum}</strong>
</div>

<div class="header-box">
  <div class="row"><label>Ügyfél neve:</label><span>${m.clientNev || "—"}</span></div>
  <div class="row"><label>Ügyfél cím:</label><span>${m.clientCim || "—"}</span></div>
  <div class="row"><label>Telefonszám:</label><span>${m.clientTel || "—"}</span></div>
  <div class="row"><label>Csapat:</label><span>${m.assigneeNev || "—"}</span></div>
  <div class="row"><label>Projekt:</label><span>${m.projektMegnevezes || m.feladat || "—"}</span></div>
</div>

<h2>1. Fotós felmérési kategóriák</h2>
${FOTO_KAT.map(kat => {
  const photos = katFotok[kat.id] || [];
  const note = fotoNotes[kat.id] || "";
  const hasFoto = photos.length > 0;
  const hasNote = note.trim().length > 0;
  return `
<h3>${kat.nev}</h3>
${hasNote ? `<div class="mező-sor"><div class="mező-label">Megjegyzés</div><div class="mező-ertek">${note}</div></div>` : ""}
${hasFoto ? `<div class="foto-grid">${photos.map((p, i) => `<div class="foto-item"><img src="${p.base64}" alt=""/><p>${kat.nev} – ${i+1}. kép</p></div>`).join("")}</div>` : `<p style="font-size:9pt;color:#aaa;font-style:italic;">Nincs feltöltve fotó</p>`}
`;
}).join("")}

<h2>2. Szöveges felmérési adatok</h2>
<table style="width:100%;border-collapse:collapse;font-size:10pt;">
${SZOVEGES_MEZOK.map(mező => {
  const ertek = adatok[mező.k] || m.felmeres?.[mező.k] || "";
  return `<tr style="border-bottom:0.5pt solid #eee;">
    <td style="padding:2mm 3mm;font-weight:bold;color:#555;width:55mm;vertical-align:top;">${mező.label}</td>
    <td style="padding:2mm 3mm;min-height:7mm;">${ertek || '<span style="color:#bbb;font-style:italic;">—</span>'}</td>
  </tr>`;
}).join("")}
</table>

<h2>3. Nyilatkozat és aláírás</h2>
<div class="nyilatkozat-box">
  <div class="nyilatkozat-check">
    <div class="check-box">${nyilatkozat ? '<span style="color:#fff;font-size:14pt;font-weight:bold;">✓</span>' : ""}</div>
    <p class="nyilatkozat-szoveg">${NYILATKOZAT.replace(/\n/g, "<br>")}</p>
  </div>
</div>

<div class="alairas-box">
${alairas ? `
  <p style="font-size:10pt;font-weight:bold;margin-bottom:3mm;">Ügyfél aláírása:</p>
  <img class="alairas-img" src="${alairas}" alt="Aláírás"/>
  <p class="alairas-datum">Rögzítve: ${datum}</p>
` : `
  <div class="aláírás-vonal"></div>
  <p class="aláírás-label">Ügyfél aláírása</p>
  <p style="font-size:9pt;color:#aaa;margin-top:2mm;font-style:italic;">Digitális aláírás nem elérhető</p>
`}
</div>

<div style="margin-top:12mm;display:flex;justify-content:space-between;">
  <div style="text-align:center;">
    <div class="aláírás-vonal" style="margin:0 auto;"></div>
    <p class="aláírás-label">Felmérést végző személy</p>
    <p style="font-size:9pt;color:#666;">${m.assigneeNev || "—"}</p>
  </div>
  <div style="text-align:center;">
    <div class="aláírás-vonal" style="margin:0 auto;"></div>
    <p class="aláírás-label">Ügyfél</p>
    <p style="font-size:9pt;color:#666;">${m.clientNev || "—"}</p>
  </div>
</div>

<div style="margin-top:10mm;text-align:center;font-size:8pt;color:#aaa;border-top:0.5pt solid #ddd;padding-top:4mm;">
  CRM Napelem rendszer | Generálva: ${new Date().toLocaleString("hu-HU")} | ${m.id}
</div>
</body></html>`);
    w.document.close();
    w.onload = () => { w.print(); };
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.65)",
      display: "flex", alignItems: "flex-start", justifyContent: "center",
      padding: "20px 16px", overflowY: "auto",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 720,
        boxShadow: "0 24px 60px rgba(0,0,0,.3)", overflow: "hidden", fontFamily: FONT,
      }}>
        {/* Fejléc */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC",
        }}>
          <div>
            <h2 style={{ fontFamily: FONT_HEADING, fontSize: 18, fontWeight: 800, margin: 0, color: "#0F172A" }}>
              📋 Felmérési Jegyzőkönyv
            </h2>
            <p style={{ fontSize: 13, color: "#64748B", margin: "3px 0 0" }}>
              {m.id} · {m.clientNev || "—"} · {adatok.felmeresIdopont || "—"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={handlePrint} style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "9px 18px", background: "#2563EB", color: "#fff",
              border: "none", borderRadius: 10, cursor: "pointer",
              fontWeight: 700, fontSize: 14, fontFamily: FONT,
            }}>
              <Printer size={16} /> PDF / Nyomtatás
            </button>
            <button onClick={onClose} style={{
              border: "none", background: "none", cursor: "pointer",
              color: "#64748B", padding: 4, display: "flex", alignItems: "center",
            }}>
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Előnézet */}
        <div ref={printRef} style={{ padding: "24px", maxHeight: "70vh", overflowY: "auto" }}>
          {/* Fejlécadatok */}
          <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "14px 16px", marginBottom: 20, border: "1px solid #E2E8F0" }}>
            {[
              ["Ügyfél neve", m.clientNev], ["Ügyfél cím", m.clientCim],
              ["Projekt kód", m.id], ["Csapat", m.assigneeNev], ["Dátum", datum],
            ].map(([l, v]) => v ? (
              <div key={l} style={{ display: "flex", gap: 12, marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B", minWidth: 110 }}>{l}</span>
                <span style={{ fontSize: 13, color: "#0F172A" }}>{v}</span>
              </div>
            ) : null)}
          </div>

          {/* Fotók */}
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 12, borderBottom: "2px solid #E2E8F0", paddingBottom: 6 }}>
            📸 Fotós felmérési kategóriák
          </h3>
          {FOTO_KAT.map(kat => {
            const photos = katFotok[kat.id] || [];
            const note = fotoNotes[kat.id] || "";
            return (
              <div key={kat.id} style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#2563EB", marginBottom: 4 }}>{kat.nev}</p>
                {note && <p style={{ fontSize: 12, color: "#475569", marginBottom: 6, padding: "4px 8px", background: "#F8FAFC", borderRadius: 6 }}>{note}</p>}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {photos.length > 0 ? photos.map((p, i) => (
                    <img key={i} src={p.base64} alt="" style={{ width: 90, height: 70, objectFit: "cover", borderRadius: 8, border: "1px solid #E2E8F0" }} />
                  )) : <p style={{ fontSize: 11, color: "#CBD5E1", fontStyle: "italic" }}>Nincs fotó feltöltve</p>}
                </div>
              </div>
            );
          })}

          {/* Szöveges adatok */}
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "20px 0 12px", borderBottom: "2px solid #E2E8F0", paddingBottom: 6 }}>
            📋 Szöveges felmérési adatok
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {SZOVEGES_MEZOK.map(mező => {
              const ertek = adatok[mező.k] || m.felmeres?.[mező.k];
              return ertek ? (
                <div key={mező.k} style={{ background: "#F8FAFC", borderRadius: 8, padding: "8px 10px", border: "1px solid #E2E8F0" }}>
                  <p style={{ fontSize: 10, color: "#64748B", fontWeight: 700, marginBottom: 2 }}>{mező.label}</p>
                  <p style={{ fontSize: 13, color: "#0F172A" }}>{ertek}</p>
                </div>
              ) : null;
            })}
          </div>

          {/* Nyilatkozat */}
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", margin: "20px 0 12px", borderBottom: "2px solid #E2E8F0", paddingBottom: 6 }}>
            📝 Nyilatkozat
          </h3>
          <div style={{ border: `2px solid ${nyilatkozat ? "#22C55E" : "#E2E8F0"}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
              <div style={{
                width: 22, height: 22, borderRadius: 5, border: `2px solid ${nyilatkozat ? "#22C55E" : "#CBD5E1"}`,
                background: nyilatkozat ? "#22C55E" : "#fff", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                {nyilatkozat && <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>✓</span>}
              </div>
              <p style={{ fontSize: 12, color: nyilatkozat ? "#166534" : "#64748B", fontWeight: nyilatkozat ? 600 : 400 }}>
                {nyilatkozat ? "✅ Aláírva" : "⬜ Még nem fogadta el"}
              </p>
            </div>
            <p style={{ fontSize: 11, color: "#475569", lineHeight: 1.6 }}>{NYILATKOZAT}</p>
          </div>

          {/* Aláírás */}
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F172A", marginBottom: 12, borderBottom: "2px solid #E2E8F0", paddingBottom: 6 }}>
            ✍️ Ügyfél aláírása
          </h3>
          {alairas ? (
            <div>
              <img src={alairas} alt="Aláírás" style={{ border: "1px solid #E2E8F0", borderRadius: 8, maxHeight: 100, maxWidth: 300 }} />
              <p style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>Rögzítve: {datum}</p>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: "#CBD5E1", fontStyle: "italic" }}>Nincs digitális aláírás rögzítve</p>
          )}
        </div>

        {/* Lábléc */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #E2E8F0", background: "#F8FAFC", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "9px 20px", borderRadius: 9, border: "1.5px solid #E2E8F0", background: "#fff", color: "#475569", fontWeight: 600, fontSize: 14, cursor: "pointer", fontFamily: FONT }}>
            Bezárás
          </button>
          <button onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 22px", background: "#2563EB", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>
            <Printer size={16} /> PDF mentés / Nyomtatás
          </button>
        </div>
      </div>
    </div>
  );
}
