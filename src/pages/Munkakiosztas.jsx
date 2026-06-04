import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  Upload, Play, Download, RefreshCw, AlertCircle,
  CheckCircle2, Clock, MapPin, Users, FileSpreadsheet,
  ChevronDown, ChevronUp, Loader2, Save, Tag,
} from "lucide-react";
import { C, FONT, FONT_HEADING, STATUS_CFG } from "../lib/constants";
import { getSettings } from "../lib/munkakiosztasSettings";
import { kioszt } from "../lib/munkakiosztasAlgo";
import { addItem, loadLocal } from "../lib/localDb";
import Card from "../components/Card";

// ─── Felmérési státuszok (Munkakiosztáshoz) ───────────────────
const KIOSZT_STATUSZOK = [
  { id: "Megkezdésre Vár",  szin: "#38BDF8", bg: "#F0F9FF" },
  { id: "Felmérés",         szin: "#0EA5E9", bg: C.accentLight },
  { id: "Kivitelezés",      szin: C.warning, bg: C.warningLight },
  { id: "Folyamatban",      szin: C.accent, bg: C.accentLight },
  { id: "Ütemezett",        szin: C.warning, bg: C.warningLight },
];

// ─── Segéd: Badge ─────────────────────────────────────────────
function Badge({ label, color }) {
  return (
    <span style={{ display:"inline-block", background: color + "20", color, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>
      {label}
    </span>
  );
}

// ─── Segéd: Stat kártya ───────────────────────────────────────
function Stat({ label, value, icon: Icon, color }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 18px", display:"flex", alignItems:"center", gap:14 }}>
      <div style={{ width:40, height:40, borderRadius:10, background: color+"18", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize:20, fontWeight:800, color:C.text, fontFamily:FONT_HEADING }}>{value}</div>
        <div style={{ fontSize:11, color:C.muted, textTransform:"uppercase", letterSpacing:.8, fontWeight:600 }}>{label}</div>
      </div>
    </div>
  );
}

export default function Munkakiosztas() {
  const [excelSorok,    setExcelSorok]    = useState([]);   // nyers Excel sorok
  const [excelFejlec,   setExcelFejlec]   = useState([]);   // fejlécek
  const [kiosztottSorok,setKiosztottSorok]= useState(null); // kiosztás eredmény
  const [loading,       setLoading]       = useState(false);
  const [progress,      setProgress]      = useState({ szoveg:"", szazalek:0 });
  const [hibak,         setHibak]         = useState([]);
  const [dragOver,      setDragOver]      = useState(false);
  const [expandedDays,  setExpandedDays]  = useState({});
  const [statusMap,     setStatusMap]     = useState({}); // { [_id]: statusId }
  const [mentveDb,      setMentveDb]      = useState(0);  // mentett munkalapok száma
  const [mentesFolyamat,setMentesFolyamat]= useState(false);
  const fileRef = useRef();

  const settings = getSettings();

  // ─── Státusz beállítás egy munkához ─────────────────────────
  function setStatus(id, st) {
    setStatusMap(prev => ({ ...prev, [id]: st }));
  }
  function getStatus(id) {
    return statusMap[id] || "Felmérés";
  }

  // ─── Excel beolvasás ────────────────────────────────────────
  function parseExcel(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const wb   = XLSX.read(e.target.result, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (rows.length < 2) { setHibak(["A fájl üres vagy hibás!"]); return; }

        const fejlec = rows[0].map(f => String(f));
        const adatSorok = rows.slice(1).filter(r => r.some(c => c !== ""));
        setExcelFejlec(fejlec);
        setExcelSorok(adatSorok);
        setKiosztottSorok(null);
        setHibak([]);
      } catch (err) {
        setHibak(["Fájl olvasási hiba: " + err.message]);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleFile(file) {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setHibak(["Csak .xlsx, .xls vagy .csv fájl fogadható el!"]);
      return;
    }
    parseExcel(file);
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  // ─── Sorok előkészítése algoritmushoz ────────────────────────
  function prepMunkak() {
    const { excelOszlopok } = settings;
    const cimIdx  = excelFejlec.findIndex(f => f.trim() === excelOszlopok.cim.trim());
    const tipIdx  = excelFejlec.findIndex(f => f.trim() === excelOszlopok.munkatipus.trim());

    const hibakList = [];
    if (cimIdx === -1) hibakList.push(`"${excelOszlopok.cim}" oszlop nem található! Ellenőrizd a Beállításokban az oszlopnevet.`);
    if (tipIdx === -1) hibakList.push(`"${excelOszlopok.munkatipus}" oszlop nem található! Ellenőrizd a Beállításokban az oszlopnevet.`);
    if (hibakList.length) { setHibak(hibakList); return null; }

    return excelSorok.map((sor, i) => ({
      _id:       `m_${i}`,
      cim:       String(sor[cimIdx] || "").trim(),
      munkatipus:String(sor[tipIdx] || "").trim(),
      // összes többi oszlop megmarad
      egyeb: Object.fromEntries(
        excelFejlec.map((f, fi) => [f, sor[fi]])
          .filter(([f]) => f !== excelOszlopok.cim && f !== excelOszlopok.munkatipus)
      ),
    })).filter(m => m.cim);
  }

  // ─── Kiosztás indítása ───────────────────────────────────────
  async function handleKioszt() {
    const munkak = prepMunkak();
    if (!munkak) return;
    if (munkak.length === 0) { setHibak(["Nincsenek kiosztható munkák!"]); return; }

    setLoading(true); setHibak([]); setKiosztottSorok(null);
    try {
      const eredmeny = await kioszt(munkak, settings, (szoveg, szazalek) => {
        setProgress({ szoveg, szazalek });
      });
      setKiosztottSorok(eredmeny);
    } catch (err) {
      setHibak(["Kiosztási hiba: " + err.message]);
    } finally {
      setLoading(false);
      setProgress({ szoveg:"", szazalek:0 });
    }
  }

  // ─── Excel export ────────────────────────────────────────────
  function handleExport() {
    if (!kiosztottSorok) return;
    const exportData = kiosztottSorok.map(s => ({
      "Dátum":        s.datumFormatted,
      "Csapat":       s.csapatNev,
      "Cím":          s.cim,
      "Munka típusa": s.munkatipus,
      "Távolság (km)":s.tavolsag ?? "",
      ...s.egyeb,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kiosztás");
    XLSX.writeFile(wb, `munkakiosztas_${new Date().toISOString().split("T")[0]}.xlsx`);
  }

  // ─── Munkalapok mentése a CRM rendszerbe ────────────────────
  async function handleMunkalapokMentese() {
    if (!kiosztottSorok) return;
    setMentesFolyamat(true);
    const csapatok = settings.csapatok || [];
    let mentett = 0;
    const meglevo = loadLocal("munkalapok") || [];
    const meglevoIdk = new Set(meglevo.map(m => m.id));

    for (const sor of kiosztottSorok) {
      if (sor.csapatNev === "—") continue; // kiosztás nélküli skip
      const ugyszam = sor.egyeb?.["Ügyszám"] || sor.egyeb?.["ugyszam"] || sor.egyeb?.["Munkaszám"] || "";
      const id = ugyszam || ("ML_" + sor._id);
      if (meglevoIdk.has(id)) continue; // már létező skip

      const csapat = csapatok.find(c => c.nev === sor.csapatNev);
      const ml = {
        id,
        ugyszam: id,
        status:            getStatus(sor._id),
        statusSzin:        KIOSZT_STATUSZOK.find(s => s.id === getStatus(sor._id))?.szin || "#38BDF8",
        cimke:             sor.egyeb?.["Cimke"] || sor.egyeb?.["cimke"] || "Junior Vital",
        cimkeSzin:         C.accent,
        projektMegnevezes: sor.egyeb?.["Projekt"] || sor.egyeb?.["projekt"] || "",
        feladat:           sor.munkatipus || "",
        description:       sor.munkatipus || "",
        date:              sor.datum || "",
        ertekesito:        sor.egyeb?.["Értékesítő"] || "",
        // Csapat
        assigneeId:        csapat?.id || "",
        assigneeNev:       sor.csapatNev,
        csapatNev:         sor.csapatNev,
        // Ügyfél szabad szövegként
        clientId:          null,
        clientNev:         sor.egyeb?.["Ügyfél neve"] || sor.egyeb?.["Név"] || "",
        clientCim:         sor.cim || "",
        clientTel:         sor.egyeb?.["Telefon"] || "",
        anyagok:           [],
        felmeres:          {},
        items:             [],
        files:             [],
        createdAt:         new Date().toISOString(),
        // Munkakiosztásból jött flag
        forrasKiosztas:    true,
        tavolsag:          sor.tavolsag,
      };
      addItem("munkalapok", ml);
      mentett++;
    }
    setMentveDb(mentett);
    setMentesFolyamat(false);
    // crm-db-updated esemény (ha más tab is hallgatja)
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "munkalapok" } }));
    setTimeout(() => setMentveDb(0), 4000);
  }

  // ─── Csoportosítás dátum + csapat szerint ────────────────────
  function csoportosit(sorok) {
    const csoportok = {};
    sorok.forEach(s => {
      const k = `${s.datum}__${s.csapatNev}`;
      if (!csoportok[k]) csoportok[k] = { datum: s.datumFormatted, csapat: s.csapatNev, csapatSzin: s.csapatSzin || C.muted, munkak: [] };
      csoportok[k].munkak.push(s);
    });
    return Object.values(csoportok);
  }

  // ─── Statisztikák ────────────────────────────────────────────
  const statok = kiosztottSorok ? {
    osszes:     kiosztottSorok.length,
    kiosztott:  kiosztottSorok.filter(s => s.csapatNev !== "—").length,
    hiany:      kiosztottSorok.filter(s => s.csapatNev === "—").length,
    napok:      new Set(kiosztottSorok.filter(s => s.datum && s.datum !== "Nincs kiosztva").map(s => s.datum)).size,
  } : null;

  // ─── UI ──────────────────────────────────────────────────────
  return (
    <div style={{ padding:"28px 32px", fontFamily:FONT }}>

      {/* Fejléc */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
        <div>
          <h2 style={{ fontFamily:FONT_HEADING, fontSize:22, fontWeight:800, color:C.text, marginBottom:4 }}>Munkakiosztás</h2>
          <p style={{ fontSize:13, color:C.muted }}>Excel import → automatikus csapat kiosztás távolság alapján</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          {kiosztottSorok && (
            <>
              <button onClick={handleExport} style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 16px", background:C.success, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:FONT }}>
                <Download size={15} /> Excel export
              </button>
              <button onClick={handleMunkalapokMentese} disabled={mentesFolyamat} style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 16px", background: mentesFolyamat ? C.muted : C.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:FONT }}>
                {mentesFolyamat ? <Loader2 size={15} style={{ animation:"spin 1s linear infinite" }}/> : <Save size={15}/>}
                {mentveDb > 0 ? `${mentveDb} munkalap mentve ✓` : "Mentés CRM-be"}
              </button>
            </>
          )}
          {excelSorok.length > 0 && !loading && (
            <button onClick={handleKioszt} style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 18px", background:C.accent, color:"#fff", border:"none", borderRadius:10, cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:FONT }}>
              <Play size={15} /> Kiosztás indítása
            </button>
          )}
        </div>
      </div>

      {/* Hibaüzenetek */}
      {hibak.length > 0 && (
        <div style={{ background:C.dangerLight, border:`1px solid #FECACA`, borderRadius:12, padding:"12px 16px", marginBottom:20 }}>
          {hibak.map((h, i) => <p key={i} style={{ fontSize:13, color:C.danger, display:"flex", alignItems:"center", gap:8 }}><AlertCircle size={14} />{h}</p>)}
        </div>
      )}

      {/* Progress */}
      {loading && (
        <Card style={{ padding:24, marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:12 }}>
            <Loader2 size={20} color={C.accent} style={{ animation:"spin 1s linear infinite" }} />
            <span style={{ fontSize:14, fontWeight:600, color:C.text }}>{progress.szoveg}</span>
            <span style={{ fontSize:14, color:C.muted, marginLeft:"auto" }}>{Math.round(progress.szazalek)}%</span>
          </div>
          <div style={{ background:C.bg, borderRadius:8, height:8, overflow:"hidden" }}>
            <div style={{ width:`${progress.szazalek}%`, height:"100%", background:C.accent, borderRadius:8, transition:"width .3s" }} />
          </div>
        </Card>
      )}

      <div style={{ display:"grid", gridTemplateColumns: kiosztottSorok ? "1fr" : "400px 1fr", gap:20 }}>

        {/* ── Bal: Upload + Nyers adatok ── */}
        {!kiosztottSorok && (
          <div>
            {/* Drag & Drop zóna */}
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onClick={() => fileRef.current?.click()}
              style={{ border:`2px dashed ${dragOver ? C.accent : C.border}`, borderRadius:14, padding:"32px 24px", textAlign:"center", cursor:"pointer", background:dragOver ? C.accentLight : "#fff", transition:"all .15s", marginBottom:16 }}
            >
              <FileSpreadsheet size={36} color={dragOver ? C.accent : C.muted} style={{ display:"block", margin:"0 auto 12px" }} />
              <p style={{ fontWeight:700, color:C.text, fontSize:15, marginBottom:6 }}>Excel fájl betöltése</p>
              <p style={{ fontSize:12, color:C.muted }}>Húzd ide a fájlt, vagy kattints a kiválasztáshoz</p>
              <p style={{ fontSize:11, color:C.muted, marginTop:4 }}>.xlsx · .xls · .csv</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={e => handleFile(e.target.files[0])} />
            </div>

            {/* Várható oszlopok tájékoztató */}
            <Card style={{ padding:"14px 16px" }}>
              <p style={{ fontSize:12, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.8, marginBottom:10 }}>Várt Excel oszlopok</p>
              {[settings.excelOszlopok.cim, settings.excelOszlopok.munkatipus, settings.excelOszlopok.megjegyzes].map(o => (
                <div key={o} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:C.accent, flexShrink:0 }} />
                  <span style={{ fontSize:13, color:C.text, fontWeight:600 }}>{o}</span>
                </div>
              ))}
              <p style={{ fontSize:11, color:C.muted, marginTop:8 }}>Az oszlopneveket a Beállítások → Munkakiosztás részen módosíthatod.</p>
            </Card>
          </div>
        )}

        {/* ── Jobb: Nyers adatok táblázat ── */}
        {!kiosztottSorok && excelSorok.length > 0 && (
          <Card>
            <div style={{ padding:"14px 20px 10px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontWeight:700, fontSize:14, color:C.text }}>Beolvasott adatok — {excelSorok.length} sor</span>
              <button onClick={() => { setExcelSorok([]); setExcelFejlec([]); }} style={{ border:"none", background:"none", color:C.muted, cursor:"pointer", fontSize:12, fontFamily:FONT }}>
                <RefreshCw size={14} /> Törlés
              </button>
            </div>
            <div style={{ overflowX:"auto", maxHeight:460, overflowY:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead style={{ position:"sticky", top:0, background:"#fff", zIndex:1 }}>
                  <tr style={{ borderBottom:`2px solid ${C.border}` }}>
                    <th style={{ padding:"10px 12px", textAlign:"left", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.7, width:40 }}>#</th>
                    {excelFejlec.map(f => (
                      <th key={f} style={{ padding:"10px 12px", textAlign:"left", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:.7 }}>{f}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {excelSorok.map((sor, i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background = C.bg}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding:"10px 12px", color:C.muted, fontSize:12 }}>{i + 1}</td>
                      {sor.map((cell, ci) => (
                        <td key={ci} style={{ padding:"10px 12px", color:C.text }}>{String(cell)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* ── Kiosztás eredmény ── */}
      {kiosztottSorok && (
        <div>
          {/* Statisztikák */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:24 }}>
            <Stat label="Összes munka" value={statok.osszes}    icon={FileSpreadsheet} color={C.accent} />
            <Stat label="Kiosztott"    value={statok.kiosztott} icon={CheckCircle2}    color={C.success} />
            <Stat label="Kiosztás nélkül" value={statok.hiany} icon={AlertCircle}     color={statok.hiany > 0 ? C.danger : C.muted} />
            <Stat label="Munkanapok"   value={statok.napok}     icon={Clock}           color={C.accent} />
          </div>

          {/* Vissza gomb */}
          <button onClick={() => setKiosztottSorok(null)} style={{ display:"flex", alignItems:"center", gap:6, color:C.accent, border:"none", background:"none", cursor:"pointer", fontSize:13, fontWeight:600, fontFamily:FONT, marginBottom:20 }}>
            ← Vissza / Új kiosztás
          </button>

          {/* Csoportosított táblák */}
          {csoportosit(kiosztottSorok).map(csoport => {
            const key   = `${csoport.datum}__${csoport.csapat}`;
            const open  = expandedDays[key] !== false;
            return (
              <Card key={key} style={{ marginBottom:12, overflow:"hidden" }}>
                <button
                  onClick={() => setExpandedDays(p => ({ ...p, [key]: !open }))}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"14px 20px", border:"none", background:"none", cursor:"pointer", textAlign:"left", fontFamily:FONT }}
                >
                  <div style={{ width:12, height:12, borderRadius:"50%", background: csoport.csapatSzin, flexShrink:0 }} />
                  <span style={{ fontWeight:700, fontSize:14, color:C.text, flex:1 }}>{csoport.datum}</span>
                  <span style={{ fontSize:13, fontWeight:600, color: csoport.csapatSzin }}>{csoport.csapat}</span>
                  <span style={{ fontSize:12, color:C.muted, marginLeft:8 }}>{csoport.munkak.length} munka</span>
                  {open ? <ChevronUp size={16} color={C.muted} /> : <ChevronDown size={16} color={C.muted} />}
                </button>

                {open && (
                  <div style={{ borderTop:`1px solid ${C.border}` }}>
                    {csoport.munkak.map((m, i) => {
                      const st = getStatus(m._id);
                      const stCfg = KIOSZT_STATUSZOK.find(s => s.id === st) || KIOSZT_STATUSZOK[0];
                      return (
                        <div key={m._id} style={{ padding:"12px 20px", borderBottom: i < csoport.munkak.length-1 ? `1px solid ${C.border}` : "none" }}>
                          <div style={{ display:"flex", alignItems:"flex-start", gap:14 }}>
                            <div style={{ width:24, height:24, borderRadius:"50%", background: csoport.csapatSzin + "20", color: csoport.csapatSzin, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, flexShrink:0, marginTop:2 }}>
                              {i + 1}
                            </div>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontWeight:600, fontSize:14, color:C.text }}>{m.cim}</div>
                              <div style={{ display:"flex", gap:10, marginTop:6, flexWrap:"wrap", alignItems:"center" }}>
                                <Badge label={m.munkatipus} color={C.accent} />
                                {m.tavolsag && <span style={{ fontSize:12, color:C.muted, display:"flex", alignItems:"center", gap:4 }}><MapPin size={12} />{m.tavolsag} km</span>}
                                {Object.entries(m.egyeb || {}).filter(([,v]) => v).slice(0,3).map(([k, v]) => (
                                  <span key={k} style={{ fontSize:12, color:C.muted }}>{k}: {v}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* ── Státusz selector ── */}
                          <div style={{ marginTop:10, marginLeft:38, display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                            <Tag size={12} color={C.muted} style={{ flexShrink:0 }}/>
                            {KIOSZT_STATUSZOK.map(s => (
                              <button
                                key={s.id}
                                onClick={() => setStatus(m._id, s.id)}
                                style={{
                                  padding:"4px 12px",
                                  borderRadius:20,
                                  border:`1.5px solid ${st === s.id ? s.szin : C.border}`,
                                  background: st === s.id ? s.bg : "#fff",
                                  color: st === s.id ? s.szin : C.muted,
                                  fontSize:11, fontWeight: st === s.id ? 700 : 400,
                                  cursor:"pointer", fontFamily:FONT,
                                  transition:"all .12s",
                                  // Felmérés kiemelés
                                  boxShadow: s.id === "Felmérés" && st === s.id ? `0 0 0 2px ${s.szin}40` : "none",
                                }}
                              >
                                {s.id}
                                {s.id === "Felmérés" && " 📸"}
                              </button>
                            ))}
                          </div>

                          {/* Felmérés info */}
                          {st === "Felmérés" && (
                            <div style={{ marginTop:8, marginLeft:38, padding:"7px 12px", background:C.accentLight, borderRadius:8, fontSize:12, color:C.accent, display:"flex", alignItems:"center", gap:6 }}>
                              📸 A telepítő előbb felmérési fotókat tölt fel, mielőtt kivitelezésre kerül sor.
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Üres állapot */}
      {!kiosztottSorok && excelSorok.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 0" }}>
          <FileSpreadsheet size={48} color={C.muted} style={{ opacity:.2, display:"block", margin:"0 auto 16px" }} />
          <p style={{ fontWeight:700, color:C.text, fontSize:16, marginBottom:8 }}>Tölts be egy Excel fájlt a kezdéshez</p>
          <p style={{ color:C.muted, fontSize:13 }}>A rendszer automatikusan kiosztja a munkákat a csapatokra távolság és kapacitás alapján</p>
        </div>
      )}
    </div>
  );
}
