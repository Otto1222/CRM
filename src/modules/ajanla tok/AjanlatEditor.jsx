import { useState, useMemo } from "react";
import { ArrowLeft, Save, Printer, Plus, Trash2, Search, ChevronDown, ChevronRight, Building2 } from "lucide-react";
import { FONT, FONT_HEADING } from "../../lib/constants.js";
import { ft } from "../../lib/helpers.js";
import { loadLocal } from "../../lib/localDb.js";
import { AJANLAT_SZAKASZOK, AJANLAT_STATUSZOK, getSzakaszForKategoria, calcTetel, calcAjanlatOsszesites, getAjanlatStatusConfig } from "./ajanlat.schema.js";
import { updateAjanlat, createAjanlat } from "./ajanlat.service.js";
import { getAktivAnyagtorzs } from "./anyagtorzs.service.js";
import { loadAjanlatSablonok, createAjanlatSablon } from "./ajanlat_sablon.service.js";
import { ANYAG_EGYSEGEK, AFA_KULCSOK } from "./anyagtorzs.schema.js";
import ProjektForm from "../projektek/ProjektForm.jsx";

const inp = { width: "100%", boxSizing: "border-box", padding: "7px 10px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", outline: "none", background: C.bg };
const inpSm = { ...inp, padding: "5px 7px", fontSize: 12 };

// ── Anyagtörzs kereső modal ────────────────────────────────────
function AnyagtorzsKereső({ anyagtorzs, filterKategoriak, onSelect, onClose }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    if (!q.trim()) {
      if (filterKategoriak?.length) {
        const inSec = anyagtorzs.filter(a => filterKategoriak.includes(a.kategoria));
        const rest  = anyagtorzs.filter(a => !filterKategoriak.includes(a.kategoria));
        return [...inSec, ...rest].slice(0, 60);
      }
      return anyagtorzs.slice(0, 60);
    }
    const lq = q.toLowerCase();
    return anyagtorzs.filter(a =>
      (a.megnevezes || "").toLowerCase().includes(lq) ||
      (a.cikkszam   || "").toLowerCase().includes(lq) ||
      (a.kategoria  || "").toLowerCase().includes(lq)
    ).slice(0, 60);
  }, [q, anyagtorzs, filterKategoriak]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)" }} onClick={onClose} />
      <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: 14, width: "100%", maxWidth: 580, maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,.25)", fontFamily: FONT }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #E2E8F0" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 14, color: C.text }}>Anyagtörzs keresés</p>
          {filterKategoriak?.length > 0 && (
            <p style={{ margin: "0 0 8px", fontSize: 11, color: C.muted }}>
              Elsődlegesen: {filterKategoriak.join(", ")}
            </p>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.bg, border: "1.5px solid #E2E8F0", borderRadius: 9, padding: "8px 12px" }}>
            <Search size={15} color={C.muted} />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)}
              placeholder="Keresés: megnevezés, cikkszám, kategória…"
              style={{ border: "none", outline: "none", fontSize: 13, fontFamily: FONT, background: "transparent", flex: 1 }} />
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 && (
            <p style={{ padding: "24px", textAlign: "center", color: C.muted, fontSize: 13 }}>Nincs találat</p>
          )}
          {filtered.map(a => (
            <button key={a.id} onClick={() => { onSelect(a); onClose(); }}
              style={{ width: "100%", padding: "10px 16px", border: "none", borderBottom: "1px solid #F1F5F9", background: "#fff", cursor: "pointer", textAlign: "left", fontFamily: FONT, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, color: C.text, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.megnevezes}</p>
                <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{a.cikkszam} · {a.kategoria} · {a.egyseg}</p>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: C.success }}>{ft(a.ajanlatiNetto)}</p>
                <p style={{ margin: 0, fontSize: 10, color: C.muted }}>/{a.egyseg}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Tételsor komponens ─────────────────────────────────────────
function TételRow({ t, idx, onUpdate, onDelete, onAnyagtorzsOpen }) {
  const { nettoOsszesen, brutto } = calcTetel(t);
  return (
    <tr style={{ borderBottom: "1px solid #F1F5F9", verticalAlign: "middle" }}>
      <td style={{ padding: "5px 6px", color: C.muted, fontSize: 11, width: 28, textAlign: "center" }}>{idx + 1}</td>
      <td style={{ padding: "4px 5px", minWidth: 200 }}>
        <div style={{ display: "flex", gap: 4 }}>
          <input value={t.megnevezes} onChange={e => onUpdate("megnevezes", e.target.value)}
            placeholder="Megnevezés…" style={{ ...inpSm, flex: 1 }} />
          <button type="button" onClick={onAnyagtorzsOpen} title="Választás anyagtörzsből"
            style={{ padding: "5px 7px", background: C.accentLight, border: "1.5px solid #BFDBFE", borderRadius: 7, cursor: "pointer", flexShrink: 0, color: C.accent }}>
            <Search size={12} />
          </button>
        </div>
      </td>
      <td style={{ padding: "4px 5px", width: 70 }}>
        <input type="number" min="0" step="0.01" value={t.mennyiseg}
          onChange={e => onUpdate("mennyiseg", e.target.value)}
          style={{ ...inpSm, textAlign: "right" }} />
      </td>
      <td style={{ padding: "4px 5px", width: 80 }}>
        <select value={t.egyseg} onChange={e => onUpdate("egyseg", e.target.value)} style={inpSm}>
          {ANYAG_EGYSEGEK.map(e => <option key={e}>{e}</option>)}
        </select>
      </td>
      <td style={{ padding: "4px 5px", width: 110 }}>
        <input type="number" min="0" value={t.nettoEgysegar}
          onChange={e => onUpdate("nettoEgysegar", e.target.value)}
          style={{ ...inpSm, textAlign: "right" }} />
      </td>
      <td style={{ padding: "4px 5px", width: 56 }}>
        <input type="number" min="0" max="100" value={t.kedvezmenyPct}
          onChange={e => onUpdate("kedvezmenyPct", e.target.value)}
          style={{ ...inpSm, textAlign: "right" }} />
      </td>
      <td style={{ padding: "4px 5px", width: 60 }}>
        <select value={t.afaKulcs} onChange={e => onUpdate("afaKulcs", Number(e.target.value))} style={inpSm}>
          {AFA_KULCSOK.map(k => <option key={k} value={k}>{k}%</option>)}
        </select>
      </td>
      <td style={{ padding: "4px 8px", width: 115, textAlign: "right" }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: C.text }}>{nettoOsszesen > 0 ? ft(nettoOsszesen) : "—"}</p>
        <p style={{ margin: 0, fontSize: 10, color: C.muted }}>br: {brutto > 0 ? ft(brutto) : "—"}</p>
      </td>
      <td style={{ padding: "4px 6px", width: 32 }}>
        <button type="button" onClick={onDelete}
          style={{ padding: "4px 6px", background: C.dangerLight, border: "none", borderRadius: 6, cursor: "pointer", color: C.danger }}>
          <Trash2 size={13} />
        </button>
      </td>
    </tr>
  );
}

// ── Szakasz panel ──────────────────────────────────────────────
function SzakaszPanel({ szakasz, tetelek, onAddTetel, onUpdateTetel, onDeleteTetel, onOpenAnyagtorzs }) {
  const [open, setOpen] = useState(false);
  const szTotal = useMemo(() => tetelek.reduce((s, t) => s + calcTetel(t).nettoOsszesen, 0), [tetelek]);

  function handleAdd() {
    onAddTetel();
    setOpen(true);
  }

  return (
    <div style={{ border: `1.5px solid ${szakasz.szin}30`, borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
      <div style={{ padding: "10px 16px", background: szakasz.bg, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" onClick={() => setOpen(o => !o)}
          style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: FONT, flex: 1, textAlign: "left", padding: 0 }}>
          {open
            ? <ChevronDown size={16} color={szakasz.szin} />
            : <ChevronRight size={16} color={szakasz.szin} />}
          <span style={{ fontWeight: 700, fontSize: 14, color: szakasz.szin }}>{szakasz.label}</span>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>
            {tetelek.length > 0 ? `${tetelek.length} tétel` : "üres"}
          </span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {szTotal > 0 && (
            <span style={{ fontWeight: 800, fontSize: 15, color: szakasz.szin }}>{ft(szTotal)}</span>
          )}
          <button type="button" onClick={handleAdd}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "#fff", color: szakasz.szin, border: `1.5px solid ${szakasz.szin}70`, borderRadius: 8, cursor: "pointer", fontFamily: FONT, fontWeight: 700, fontSize: 12 }}>
            <Plus size={13} /> Tétel
          </button>
        </div>
      </div>

      {open && (
        <div style={{ background: "#fff" }}>
          {tetelek.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.bg, borderBottom: "1px solid #E2E8F0" }}>
                    {["#", "Megnevezés", "Menny.", "Egység", "Nettó egységár", "Ked.%", "ÁFA", "Nettó össz.", ""].map(h => (
                      <th key={h} style={{ padding: "7px 6px", textAlign: "left", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tetelek.map((t, idx) => (
                    <TételRow key={t.id} t={t} idx={idx}
                      onUpdate={(k, v) => onUpdateTetel(t.id, k, v)}
                      onDelete={() => onDeleteTetel(t.id)}
                      onAnyagtorzsOpen={() => onOpenAnyagtorzs(t.id, szakasz.kategoriak)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ padding: "14px 20px", color: C.muted, fontSize: 13, margin: 0 }}>
              Még nincs tétel ebben a szakaszban. Kattints a <strong>+ Tétel</strong> gombra.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── PDF generálás ─────────────────────────────────────────────
function printAjanlat(ajanlat, anyagtorzs) {
  const beallitasok = loadLocal("beallitasok") || {};
  const cegNev     = beallitasok.cegNev     || "CRM Napelem";
  const cegCim     = beallitasok.cegCim     || "";
  const cegTel     = beallitasok.cegTel     || "";
  const cegEmail   = beallitasok.cegEmail   || "";
  const cegAdoszam = beallitasok.cegAdoszam || "";
  const ossz = calcAjanlatOsszesites(ajanlat.tetelek || [], anyagtorzs);

  const tetelek = ajanlat.tetelek || [];
  let sorok = "";
  let sorszam = 0;

  AJANLAT_SZAKASZOK.forEach(sz => {
    const szT = tetelek.filter(t => (t.szakasz || getSzakaszForKategoria(t.kategoria || "")) === sz.id);
    if (!szT.length) return;
    const szTotal = szT.reduce((s, t) => s + calcTetel(t).nettoOsszesen, 0);
    sorok += `<tr><td colspan="8" style="background:${sz.bg};color:${sz.szin};font-weight:800;font-size:9.5pt;padding:6pt 8pt;border-top:1pt solid ${sz.szin}50">${sz.label}</td></tr>`;
    szT.forEach(t => {
      sorszam++;
      const { nettoOsszesen, brutto } = calcTetel(t);
      sorok += `<tr>
        <td>${sorszam}</td>
        <td>${t.megnevezes || ""}</td>
        <td style="text-align:center">${t.mennyiseg || 0} ${t.egyseg || ""}</td>
        <td style="text-align:right">${ft(Number(t.nettoEgysegar) || 0)}</td>
        <td style="text-align:center">${t.kedvezmenyPct || 0}%</td>
        <td style="text-align:center">${t.afaKulcs || 27}%</td>
        <td style="text-align:right;font-weight:600">${ft(nettoOsszesen)}</td>
        <td style="text-align:right">${ft(brutto)}</td>
      </tr>`;
    });
    sorok += `<tr style="background:${sz.bg}"><td colspan="6" style="text-align:right;font-size:9pt;font-weight:700;color:${sz.szin};padding:4pt 8pt">${sz.label} részösszeg:</td><td style="text-align:right;font-weight:800;color:${sz.szin};padding:4pt 8pt">${ft(szTotal)}</td><td></td></tr>`;
  });

  if (!sorok) sorok = '<tr><td colspan="8" style="text-align:center;color:#94A3B8;padding:16pt">Nincsenek tételsorok</td></tr>';

  const html = `<!DOCTYPE html>
<html lang="hu">
<head>
<meta charset="UTF-8">
<title>Ajánlat – ${ajanlat.ajanlatkod}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#1a1a2e}
  .page{max-width:210mm;margin:0 auto;padding:15mm 18mm}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24pt;padding-bottom:12pt;border-bottom:2pt solid #2563EB}
  .ceg-nev{font-size:18pt;font-weight:800;color:#2563EB;margin-bottom:4pt}
  .ceg-info{font-size:9pt;color:#475569;line-height:1.6}
  .ajanlat-cim{text-align:right}
  .ajanlat-szam{font-size:14pt;font-weight:800;color:#0F172A}
  .ajanlat-datum{font-size:9pt;color:#64748B;margin-top:4pt}
  .ketto-blokk{display:flex;gap:24pt;margin-bottom:20pt}
  .blokk{flex:1;background:#F8FAFC;border-radius:6pt;padding:10pt 14pt}
  .blokk-cim{font-size:8pt;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.5pt;margin-bottom:6pt}
  .blokk-ertek{font-size:11pt;font-weight:600;color:#0F172A;line-height:1.7}
  table{width:100%;border-collapse:collapse;font-size:9.5pt;margin-bottom:16pt}
  thead tr{background:#2563EB;color:#fff}
  thead th{padding:7pt 8pt;text-align:left;font-weight:700;font-size:8.5pt}
  tbody tr:nth-child(even){background:#F8FAFC}
  tbody tr td{padding:6pt 8pt;border-bottom:.5pt solid #E2E8F0;vertical-align:top}
  .osszesites{display:flex;justify-content:flex-end;margin-top:12pt}
  .osszesites-tabla{min-width:260pt}
  .ossz-sor{display:flex;justify-content:space-between;padding:4pt 0;border-bottom:.5pt solid #E2E8F0;font-size:10pt}
  .ossz-sor.vegosszeg{border-top:2pt solid #2563EB;border-bottom:none;padding-top:8pt;margin-top:4pt;font-size:13pt;font-weight:800;color:#2563EB}
  .felt-blokk{background:#F0F9FF;border-left:3pt solid #2563EB;padding:10pt 14pt;margin-bottom:16pt;font-size:9.5pt;line-height:1.7}
  .elfogad{border:1.5pt solid #CBD5E1;border-radius:6pt;padding:14pt;margin-top:20pt}
  .elfogad-cim{font-size:10pt;font-weight:700;margin-bottom:10pt}
  .alairassor{display:flex;gap:24pt;margin-top:16pt}
  .alairas-blokk{flex:1;border-top:1pt solid #94A3B8;padding-top:6pt;font-size:8.5pt;color:#64748B;text-align:center}
  .statusz-badge{display:inline-block;padding:2pt 8pt;border-radius:10pt;font-size:8pt;font-weight:700;background:#ECFDF5;color:#059669;border:1pt solid #86EFAC}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="ceg-nev">${cegNev}</div>
      <div class="ceg-info">
        ${cegCim ? cegCim + "<br>" : ""}
        ${cegTel ? "Tel: " + cegTel + "<br>" : ""}
        ${cegEmail ? cegEmail + "<br>" : ""}
        ${cegAdoszam ? "Adószám: " + cegAdoszam : ""}
      </div>
    </div>
    <div class="ajanlat-cim">
      <div class="ajanlat-szam">ÁRAJÁNLAT</div>
      <div class="ajanlat-szam" style="font-size:12pt;color:#64748B">${ajanlat.ajanlatkod}</div>
      <div class="ajanlat-datum">Dátum: ${ajanlat.datum || "—"}</div>
      <div class="ajanlat-datum">Érvényes: ${ajanlat.ervenyesseg || "—"}</div>
      <div style="margin-top:6pt"><span class="statusz-badge">${ajanlat.status}</span></div>
    </div>
  </div>
  <div class="ketto-blokk">
    <div class="blokk">
      <div class="blokk-cim">Megrendelő adatai</div>
      <div class="blokk-ertek">
        <strong>${ajanlat.clientNev || "—"}</strong><br>
        ${ajanlat.clientCim ? ajanlat.clientCim + "<br>" : ""}
        ${ajanlat.kapcsolattarto ? "Kapcsolattartó: " + ajanlat.kapcsolattarto + "<br>" : ""}
        ${ajanlat.clientTel ? "Tel: " + ajanlat.clientTel + "<br>" : ""}
        ${ajanlat.clientEmail ? ajanlat.clientEmail : ""}
      </div>
    </div>
    <div class="blokk">
      <div class="blokk-cim">Ajánlat tárgya</div>
      <div class="blokk-ertek">
        <strong>${ajanlat.nev || "—"}</strong><br>
        Fizetési feltételek:<br>${ajanlat.fizetesifelteletek || "—"}
      </div>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:28pt">#</th>
        <th>Megnevezés</th>
        <th style="width:60pt;text-align:center">Menny.</th>
        <th style="width:75pt;text-align:right">Egységár</th>
        <th style="width:36pt;text-align:center">Ked.%</th>
        <th style="width:36pt;text-align:center">ÁFA</th>
        <th style="width:80pt;text-align:right">Nettó</th>
        <th style="width:80pt;text-align:right">Bruttó</th>
      </tr>
    </thead>
    <tbody>${sorok}</tbody>
  </table>
  <div class="osszesites">
    <div class="osszesites-tabla">
      <div class="ossz-sor"><span>Nettó anyagköltség:</span><span>${ft(ossz.nettoAnyag)}</span></div>
      <div class="ossz-sor"><span>Nettó munkadíj:</span><span>${ft(ossz.nettoMunka)}</span></div>
      ${ossz.nettoEgyeb > 0 ? `<div class="ossz-sor"><span>Egyéb:</span><span>${ft(ossz.nettoEgyeb)}</span></div>` : ""}
      <div class="ossz-sor" style="font-weight:600"><span>Teljes nettó:</span><span>${ft(ossz.nettoOsszes)}</span></div>
      <div class="ossz-sor"><span>ÁFA:</span><span>${ft(ossz.osszesAfa)}</span></div>
      <div class="ossz-sor vegosszeg"><span>Bruttó végösszeg:</span><span>${ft(ossz.brutto)}</span></div>
    </div>
  </div>
  ${ajanlat.fizetesifelteletek || ajanlat.megjegyzes ? `
  <div class="felt-blokk">
    ${ajanlat.fizetesifelteletek ? "<strong>Fizetési feltételek:</strong> " + ajanlat.fizetesifelteletek + "<br>" : ""}
    ${ajanlat.megjegyzes ? "<strong>Megjegyzés:</strong> " + ajanlat.megjegyzes : ""}
  </div>` : ""}
  <div class="elfogad">
    <div class="elfogad-cim">Ajánlat elfogadása</div>
    <p style="font-size:9.5pt;color:#475569;line-height:1.7">
      Az ajánlatban szereplő árak nettó árak, az érvényesség időpontjáig érvényesek.
      Az ajánlat elfogadásával megrendelő tudomásul veszi a megadott feltételeket.
    </p>
    <div class="alairassor">
      <div class="alairas-blokk">Dátum: ___________________<br>Megrendelő aláírása</div>
      <div class="alairas-blokk">Dátum: ___________________<br>Ajánlatadó aláírása</div>
    </div>
  </div>
</div>
<script>window.onload=function(){window.focus();window.print();};</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) { win.document.write(html); win.document.close(); }
}

// ── Fő AjanlatEditor komponens ─────────────────────────────────
export default function AjanlatEditor({ ajanlat, onClose, onSaved, currentUser }) {
  const isNew      = !ajanlat?.id;
  const anyagtorzs = getAktivAnyagtorzs();
  const sablonok   = loadAjanlatSablonok();
  const today      = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    nev:                ajanlat?.nev                || "",
    clientId:           ajanlat?.clientId           || "",
    clientNev:          ajanlat?.clientNev          || "",
    clientCim:          ajanlat?.clientCim          || "",
    kapcsolattarto:     ajanlat?.kapcsolattarto     || "",
    clientTel:          ajanlat?.clientTel          || "",
    clientEmail:        ajanlat?.clientEmail        || "",
    datum:              ajanlat?.datum              || today,
    ervenyesseg:        ajanlat?.ervenyesseg        || "",
    fizetesifelteletek: ajanlat?.fizetesifelteletek || "30 napos átutalás a számla kézhezvételétől",
    megjegyzes:         ajanlat?.megjegyzes         || "",
    status:             ajanlat?.status             || "Piszkozat",
    tetelek:            ajanlat?.tetelek            || [],
  });

  const [saving, setSaving]                       = useState(false);
  const [hiba, setHiba]                           = useState("");
  const [anyagtorzsKeresoId, setAnyagtorzsKeresoId] = useState(null);
  const [anyagtorzsKeresoKat, setAnyagtorzsKeresoKat] = useState([]);
  const [showSablonPicker, setShowSablonPicker]   = useState(false);
  const [showSablonMent, setShowSablonMent]       = useState(false);
  const [sablonNev, setSablonNev]                 = useState("");
  const [showProjektForm, setShowProjektForm]     = useState(false);
  const ugyfelek = loadLocal("ugyfelek") || [];

  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); if (hiba) setHiba(""); }

  function handleUgyfélValaszt(e) {
    const u = ugyfelek.find(x => x.id === e.target.value);
    if (!u) { setForm(p => ({ ...p, clientId: "" })); return; }
    setForm(p => ({ ...p, clientId: u.id, clientNev: u.name || "", clientCim: u.address || "", clientTel: u.phone || "", clientEmail: u.email || "" }));
  }

  // ── Tételek kezelése ────────────────────────────────────────
  function addTetel(szakaszId) {
    const newT = {
      id: crypto.randomUUID(),
      szakasz: szakaszId,
      kategoria: "",
      anyagtorzsId: null,
      megnevezes: "",
      mennyiseg: 1,
      egyseg: "db",
      nettoEgysegar: 0,
      kedvezmenyPct: 0,
      afaKulcs: 27,
    };
    setForm(p => ({ ...p, tetelek: [...p.tetelek, newT] }));
  }

  function updateTetelById(id, key, val) {
    setForm(p => ({ ...p, tetelek: p.tetelek.map(t => t.id === id ? { ...t, [key]: val } : t) }));
  }

  function deleteTetelById(id) {
    setForm(p => ({ ...p, tetelek: p.tetelek.filter(t => t.id !== id) }));
  }

  function handleAnyagtorzsSelect(at) {
    if (!anyagtorzsKeresoId) return;
    setForm(p => ({
      ...p,
      tetelek: p.tetelek.map(t => t.id === anyagtorzsKeresoId
        ? { ...t, anyagtorzsId: at.id, megnevezes: at.megnevezes, egyseg: at.egyseg, nettoEgysegar: at.ajanlatiNetto, afaKulcs: at.afaKulcs, kategoria: at.kategoria }
        : t),
    }));
    setAnyagtorzsKeresoId(null);
    setAnyagtorzsKeresoKat([]);
  }

  function handleSablonBetolt(sablon) {
    const ujTetelek = (sablon.tetelek || []).map(t => ({ ...t, id: crypto.randomUUID() }));
    setForm(p => ({ ...p, tetelek: [...p.tetelek, ...ujTetelek], sablonId: sablon.id }));
    setShowSablonPicker(false);
  }

  // ── Mentés ──────────────────────────────────────────────────
  function handleSave() {
    if (!form.nev?.trim())       { setHiba("Az ajánlat megnevezése kötelező."); return; }
    if (!form.clientNev?.trim()) { setHiba("Az ügyfél neve kötelező."); return; }
    setSaving(true);
    const ossz = calcAjanlatOsszesites(form.tetelek, anyagtorzs);
    const data = { ...form, osszeg: ossz.brutto };
    let saved;
    try {
      if (isNew) { saved = createAjanlat(data, currentUser); }
      else       { updateAjanlat(ajanlat.id, data); saved = { ...ajanlat, ...data }; }
      onSaved?.(saved);
      onClose?.();
    } catch { setHiba("Mentési hiba. Próbáld újra."); }
    finally  { setSaving(false); }
  }

  const ossz = useMemo(() => calcAjanlatOsszesites(form.tetelek, anyagtorzs), [form.tetelek, anyagtorzs]);
  const cfg  = getAjanlatStatusConfig(form.status);

  function getTételekForSzakasz(szId) {
    return form.tetelek.filter(t => (t.szakasz || getSzakaszForKategoria(t.kategoria || "")) === szId);
  }

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: FONT }}>

      {/* ── Sticky fejléc sáv ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button type="button" onClick={onClose}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: FONT, fontWeight: 600, color: C.muted, fontSize: 13 }}>
            <ArrowLeft size={15} /> Vissza
          </button>
          <div>
            <p style={{ margin: 0, fontFamily: FONT_HEADING, fontSize: 16, fontWeight: 800, color: C.text }}>
              {isNew ? "Új árajánlat" : (ajanlat?.ajanlatkod || "Szerkesztés")}
            </p>
            {!isNew && <p style={{ margin: 0, fontSize: 11, color: C.muted }}>{form.clientNev}</p>}
          </div>
          <span style={{ background: cfg.bg, color: cfg.szin, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>{form.status}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {form.tetelek.length > 0 && (
            <button type="button" onClick={() => { setSablonNev(form.nev || ""); setShowSablonMent(true); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "1.5px solid #C4B5FD", borderRadius: 8, background: C.accentLight, cursor: "pointer", fontFamily: FONT, fontWeight: 600, color: C.accent, fontSize: 12 }}>
              <Save size={13} /> Sablon
            </button>
          )}
          {sablonok.length > 0 && (
            <button type="button" onClick={() => setShowSablonPicker(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: FONT, fontWeight: 600, color: C.textSub, fontSize: 12 }}>
              <ChevronDown size={13} /> Sablon betöltése
            </button>
          )}
          {!isNew && (
            <button type="button" onClick={() => printAjanlat({ ...ajanlat, ...form }, anyagtorzs)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", border: "1.5px solid #E2E8F0", borderRadius: 9, background: "#fff", cursor: "pointer", fontFamily: FONT, fontWeight: 600, color: C.textSub, fontSize: 13 }}>
              <Printer size={14} /> PDF
            </button>
          )}
          {!isNew && form.status === "Elfogadva" && !ajanlat?.projektId && (
            <button type="button" onClick={() => setShowProjektForm(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: C.successLight, color: C.success, border: "1.5px solid #86EFAC", borderRadius: 9, cursor: "pointer", fontFamily: FONT, fontWeight: 700, fontSize: 13 }}>
              <Building2 size={14} /> Projekt
            </button>
          )}
          <button type="button" onClick={handleSave} disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: C.accent, color: "#fff", border: "none", borderRadius: 9, cursor: saving ? "default" : "pointer", fontFamily: FONT, fontWeight: 700, fontSize: 13, opacity: saving ? 0.7 : 1 }}>
            <Save size={14} /> {saving ? "Mentés…" : "Mentés"}
          </button>
        </div>
      </div>

      <div style={{ padding: "20px 24px", maxWidth: 1280, margin: "0 auto" }}>
        {hiba && (
          <div style={{ background: C.dangerLight, border: "1.5px solid #FECACA", borderRadius: 9, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.danger, fontWeight: 600 }}>{hiba}</div>
        )}

        {/* ── FEJLÉC ── */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: "20px 24px", marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 14px" }}>Ajánlat fejléc</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px 16px" }}>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.7 }}>Ajánlat tárgya / megnevezése *</label>
              <input value={form.nev} onChange={e => upd("nev", e.target.value)}
                placeholder="pl. 10 kWp napelem rendszer telepítése"
                style={{ ...inp, border: "2px solid #2563EB", fontWeight: 600, fontSize: 14 }} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.7 }}>Ügyfél kiválasztása (opcionális)</label>
              <select value={form.clientId} onChange={handleUgyfélValaszt} style={inp}>
                <option value="">— Válassz a listából —</option>
                {ugyfelek.map(u => <option key={u.id} value={u.id}>{u.name}{u.address ? ` – ${u.address}` : ""}</option>)}
              </select>
            </div>
            {[
              { k: "clientNev",      label: "Megrendelő neve *",  placeholder: "Kovács János" },
              { k: "clientCim",      label: "Cím",                placeholder: "Budapest, Kossuth u. 1." },
              { k: "kapcsolattarto", label: "Kapcsolattartó",     placeholder: "Kapcsolattartó neve" },
              { k: "clientEmail",    label: "E-mail",             placeholder: "email@example.com" },
              { k: "clientTel",      label: "Telefon",            placeholder: "+36..." },
            ].map(f => (
              <div key={f.k}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.7 }}>{f.label}</label>
                <input value={form[f.k]} onChange={e => upd(f.k, e.target.value)} placeholder={f.placeholder} style={inp} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.7 }}>Ajánlat dátuma</label>
              <input type="date" value={form.datum} onChange={e => upd("datum", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.7 }}>Érvényesség</label>
              <input type="date" value={form.ervenyesseg} onChange={e => upd("ervenyesseg", e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.7 }}>Státusz</label>
              <select value={form.status} onChange={e => upd("status", e.target.value)} style={inp}>
                {AJANLAT_STATUSZOK.map(s => <option key={s.id}>{s.id}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.7 }}>Fizetési feltételek</label>
              <input value={form.fizetesifelteletek} onChange={e => upd("fizetesifelteletek", e.target.value)} placeholder="pl. 30 napos átutalás…" style={inp} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.7 }}>Megjegyzés</label>
              <textarea value={form.megjegyzes} onChange={e => upd("megjegyzes", e.target.value)} placeholder="Egyéb megjegyzések…" rows={2} style={{ ...inp, resize: "vertical" }} />
            </div>
          </div>
        </div>

        {/* ── TÉTELSOROK SZAKASZOK SZERINT ── */}
        <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 12px" }}>
          Tételsorok szakaszok szerint — kattints egy szakaszra a megnyitáshoz, majd nyomj <strong>+ Tétel</strong> gombot
        </p>
        {AJANLAT_SZAKASZOK.map(sz => (
          <SzakaszPanel
            key={sz.id}
            szakasz={sz}
            tetelek={getTételekForSzakasz(sz.id)}
            onAddTetel={() => addTetel(sz.id)}
            onUpdateTetel={updateTetelById}
            onDeleteTetel={deleteTetelById}
            onOpenAnyagtorzs={(id, kat) => { setAnyagtorzsKeresoId(id); setAnyagtorzsKeresoKat(kat); }}
          />
        ))}

        {/* ── ÖSSZESÍTÉS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start", marginTop: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: "16px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 10px" }}>Megoszlás szakaszok szerint</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {AJANLAT_SZAKASZOK.filter(sz => (ossz.szakaszTotalok?.[sz.id] || 0) > 0).map(sz => (
                <div key={sz.id} style={{ background: sz.bg, borderRadius: 10, padding: "8px 12px", border: `1px solid ${sz.szin}40`, flex: "1 1 120px" }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: sz.szin, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 2px" }}>{sz.label}</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>{ft(ossz.szakaszTotalok[sz.id])}</p>
                </div>
              ))}
              {!AJANLAT_SZAKASZOK.some(sz => (ossz.szakaszTotalok?.[sz.id] || 0) > 0) && (
                <p style={{ color: C.muted, fontSize: 13, margin: 0 }}>Még nincsenek tételek.</p>
              )}
            </div>
            {ossz.haszon !== 0 && (
              <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                <div style={{ background: ossz.haszon >= 0 ? C.successLight : C.dangerLight, borderRadius: 10, padding: "10px 14px", border: `1px solid ${ossz.haszon >= 0 ? C.success : C.danger}`, flex: 1 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: ossz.haszon >= 0 ? C.success : C.danger, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 3px" }}>Becsült haszon</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: ossz.haszon >= 0 ? C.success : C.danger, margin: 0 }}>{ft(ossz.haszon)}</p>
                </div>
                <div style={{ background: C.bg, borderRadius: 10, padding: "10px 14px", border: "1px solid #E2E8F0", flex: 1 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 3px" }}>Fedezet</p>
                  <p style={{ fontSize: 16, fontWeight: 800, color: C.text, margin: 0 }}>{ossz.fedezetPct}%</p>
                </div>
              </div>
            )}
          </div>
          <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #E2E8F0", padding: "16px 20px" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 10px" }}>Végösszeg</p>
            {[
              { label: "Nettó anyag",    value: ossz.nettoAnyag,  muted: true },
              { label: "Nettó munkadíj", value: ossz.nettoMunka,  muted: true },
              { label: "Teljes nettó",   value: ossz.nettoOsszes, bold: true  },
              { label: "ÁFA",            value: ossz.osszesAfa,   muted: true },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #F1F5F9" }}>
                <span style={{ fontSize: 12, color: r.muted ? C.muted : C.text, fontWeight: r.bold ? 700 : 400 }}>{r.label}</span>
                <span style={{ fontSize: 12, fontWeight: r.bold ? 700 : 400, color: r.muted ? C.muted : C.text }}>{ft(r.value)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 4px", borderTop: "2px solid #2563EB", marginTop: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Bruttó végösszeg</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: C.accent }}>{ft(ossz.brutto)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Anyagtörzs kereső ── */}
      {anyagtorzsKeresoId !== null && (
        <AnyagtorzsKereső
          anyagtorzs={anyagtorzs}
          filterKategoriak={anyagtorzsKeresoKat}
          onSelect={handleAnyagtorzsSelect}
          onClose={() => { setAnyagtorzsKeresoId(null); setAnyagtorzsKeresoKat([]); }}
        />
      )}

      {/* ── Sablon betöltése ── */}
      {showSablonPicker && (
        <div style={{ position: "fixed", inset: 0, zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)" }} onClick={() => setShowSablonPicker(false)} />
          <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: 14, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,.25)", fontFamily: FONT }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ fontFamily: FONT_HEADING, fontSize: 16, fontWeight: 800, margin: 0 }}>Sablon betöltése</p>
              <button onClick={() => setShowSablonPicker(false)} style={{ border: "none", background: "none", cursor: "pointer", color: C.muted, fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 8, maxHeight: "60vh", overflowY: "auto" }}>
              {sablonok.map(s => (
                <button key={s.id} onClick={() => handleSablonBetolt(s)}
                  style={{ width: "100%", padding: "10px 14px", border: "none", borderRadius: 8, background: "#fff", cursor: "pointer", textAlign: "left", fontFamily: FONT, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: C.text, fontSize: 14 }}>{s.nev}</p>
                    {s.leiras && <p style={{ margin: 0, fontSize: 12, color: C.muted }}>{s.leiras}</p>}
                  </div>
                  <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{(s.tetelek || []).length} tétel</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Sablon mentése ── */}
      {showSablonMent && (
        <div style={{ position: "fixed", inset: 0, zIndex: 4000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)" }} onClick={() => setShowSablonMent(false)} />
          <div style={{ position: "relative", zIndex: 1, background: "#fff", borderRadius: 14, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,.25)", fontFamily: FONT }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #E2E8F0" }}>
              <p style={{ fontFamily: FONT_HEADING, fontSize: 16, fontWeight: 800, margin: 0 }}>Mentés sablonként</p>
              <p style={{ fontSize: 12, color: C.muted, margin: "4px 0 0" }}>A jelenlegi {form.tetelek.length} tételsor lesz elmentve.</p>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.7 }}>Sablon neve *</label>
                <input autoFocus value={sablonNev} onChange={e => setSablonNev(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && sablonNev.trim()) { createAjanlatSablon({ nev: sablonNev.trim(), leiras: "", tetelek: form.tetelek }); setShowSablonMent(false); } }}
                  placeholder="pl. 10 kWp standard csomag"
                  style={{ ...inp, boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => setShowSablonMent(false)}
                  style={{ flex: 1, padding: "10px", border: "1.5px solid #E2E8F0", borderRadius: 9, background: "#fff", cursor: "pointer", fontFamily: FONT, fontWeight: 600 }}>Mégse</button>
                <button type="button" disabled={!sablonNev.trim()}
                  onClick={() => { createAjanlatSablon({ nev: sablonNev.trim(), leiras: "", tetelek: form.tetelek }); setShowSablonMent(false); }}
                  style={{ flex: 2, padding: "10px", background: sablonNev.trim() ? C.accent : C.border, color: sablonNev.trim() ? "#fff" : C.muted, border: "none", borderRadius: 9, cursor: sablonNev.trim() ? "pointer" : "default", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>
                  Sablon mentése
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Projekt létrehozása ── */}
      {showProjektForm && (
        <ProjektForm
          projekt={null}
          ajanlatElofolt={{ ...ajanlat, ...form, osszeg: ossz.brutto }}
          onClose={() => setShowProjektForm(false)}
          onSaved={saved => {
            updateAjanlat(ajanlat.id, { projektId: saved.id });
            setShowProjektForm(false);
            onClose?.();
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
