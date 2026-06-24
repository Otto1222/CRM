import { useState } from "react";
import { C, FONT } from "../lib/constants";

// ─── Statikus metaadat ────────────────────────────────────────────────────
const BACKUP_KULCSOK = new Set([
  "projektek","munkalapok","ugyfelek","beallitasok","karteritesek","sablonok",
  "ajanlatok","edi_sorszam_counter","edi_ajanlat_sorszam_counter","crm_schema_version",
]);
const BACKUP_PREFIXEK = [
  "vbf_","crm_vbf_","fotok_","crm_fotok_","felh_anyagok_","crm_felh_anyagok_",
  "karterites_","crm_karterites_",
];
const DRIVE_SYNC_KULCSOK = new Set([
  "projektek","munkalapok","ugyfelek","beallitasok","karteritesek","sablonok",
  "ajanlatok","kivitelezesi_csomagok","fovallalkozok","elszamolasi_szabalyok",
  "csapatok","csapat_tagok","szamlak","anyag_ar_verziok",
  "edi_projekt_sorszam_counter","edi_sorszam_counter","edi_ajanlat_sorszam_counter",
]);
const FO_KOLLEKCIO_KULCSOK = [
  "ajanlatok","projektek","munkalapok","kivitelezesi_csomagok",
  "fovallalkozok","elszamolasi_szabalyok","anyag_ar_verziok",
  "csapatok","csapat_tagok","karteritesek","szamlak",
];
const ERZEKENY_MEZOK = ["email","telefon","cim","adoszam","bankszamla","iranyitoszam","nev"];

// ─── Erzekeny mezo maszkolasa ─────────────────────────────────────────────
function maszkolObj(obj, melyseg = 0) {
  if (melyseg > 5 || obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.slice(0, 3).map(item => maszkolObj(item, melyseg + 1));
  if (typeof obj === "object") {
    const eredmeny = {};
    for (const [k, v] of Object.entries(obj)) {
      const erzekeny = ERZEKENY_MEZOK.some(m => k.toLowerCase().includes(m));
      if (erzekeny && typeof v === "string" && v.length > 0) {
        eredmeny[k] = "●●●●●";
      } else if (typeof v === "object" && v !== null) {
        eredmeny[k] = maszkolObj(v, melyseg + 1);
      } else {
        eredmeny[k] = v;
      }
    }
    return eredmeny;
  }
  return obj;
}

// ─── localStorage olvasas ─────────────────────────────────────────────────
function readSnapshot() {
  const entries = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const raw = localStorage.getItem(key);
    let parsed = undefined;
    let tipusNev = "string";
    let rekordszam = null;
    try { parsed = JSON.parse(raw); } catch { parsed = undefined; }
    if (Array.isArray(parsed)) {
      tipusNev = "array";
      rekordszam = parsed.length;
    } else if (parsed !== null && parsed !== undefined && typeof parsed === "object") {
      tipusNev = "object";
    } else if (typeof parsed === "number") {
      tipusNev = "szam";
    } else if (parsed === null) {
      tipusNev = "null";
    }
    const isBackupPrefix = BACKUP_PREFIXEK.some(p => key.startsWith(p));
    entries.push({
      key, tipusNev, rekordszam,
      mereteKb: ((raw?.length || 0) / 1024).toFixed(1),
      isBackup: BACKUP_KULCSOK.has(key) || isBackupPrefix,
      isDriveSync: DRIVE_SYNC_KULCSOK.has(key),
      isFoKollekicio: FO_KOLLEKCIO_KULCSOK.includes(key),
    });
  }
  entries.sort((a, b) => {
    const ai = FO_KOLLEKCIO_KULCSOK.indexOf(a.key);
    const bi = FO_KOLLEKCIO_KULCSOK.indexOf(b.key);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.key.localeCompare(b.key);
  });
  return entries;
}

function lsJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

// ─── Stilusok ─────────────────────────────────────────────────────────────
const S = {
  badge: (ok) => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11,
    fontWeight: 700, background: ok ? "#DCFCE7" : "#F1F5F9",
    color: ok ? "#166534" : "#94A3B8",
  }),
  badgePiros: {
    display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11,
    fontWeight: 700, background: "#FEE2E2", color: "#991B1B",
  },
  sor: (kiemel) => ({
    borderBottom: `1px solid ${C.border}`,
    background: kiemel ? "#FFFBEB" : "transparent",
  }),
  td: { padding: "7px 10px", fontSize: 12, verticalAlign: "middle" },
  th: { padding: "7px 10px", fontSize: 11, fontWeight: 700, color: "#64748B", textAlign: "left" },
  kapcsolatSor: () => ({
    display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 0",
    borderBottom: `1px solid ${C.border}`,
  }),
};

// ─── Kulcsok tab ──────────────────────────────────────────────────────────
function KulcsokTab({ snapshot, frissitve }) {
  const [szuro, setSzuro] = useState("");
  const szurt = szuro
    ? snapshot.filter(e => e.key.toLowerCase().includes(szuro.toLowerCase()))
    : snapshot;
  const osszesMeret = snapshot.reduce((s, e) => s + parseFloat(e.mereteKb), 0);

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.muted }}><strong>{snapshot.length}</strong> kulcs</span>
          <span style={{ fontSize: 12, color: C.muted }}><strong>{osszesMeret.toFixed(1)} KB</strong> osszes meret</span>
          <span style={{ fontSize: 12, color: C.muted }}>Olvasva: {frissitve}</span>
        </div>
        <input
          value={szuro}
          onChange={e => setSzuro(e.target.value)}
          placeholder="Szuro (pl. projekt, vbf_...)"
          style={{ padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, fontFamily: FONT, outline: "none", width: 200, marginLeft: "auto" }}
        />
      </div>
      <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: `2px solid ${C.border}` }}>
              <th style={S.th}>Kulcs neve</th>
              <th style={S.th}>Tipus</th>
              <th style={{ ...S.th, textAlign: "right" }}>Rekord</th>
              <th style={{ ...S.th, textAlign: "right" }}>Meret (KB)</th>
              <th style={{ ...S.th, textAlign: "center" }}>Drive sync</th>
              <th style={{ ...S.th, textAlign: "center" }}>Backup</th>
            </tr>
          </thead>
          <tbody>
            {szurt.map(e => (
              <tr key={e.key} style={S.sor(e.isFoKollekicio)}>
                <td style={S.td}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: e.isFoKollekicio ? 700 : 400, color: e.isFoKollekicio ? "#1D4ED8" : C.text }}>
                    {e.key}
                  </span>
                  {e.isFoKollekicio && <span style={{ marginLeft: 6, fontSize: 10, color: "#64748B", fontWeight: 400 }}>(fo)</span>}
                </td>
                <td style={S.td}><span style={{ color: e.tipusNev === "array" ? "#7C3AED" : C.muted }}>{e.tipusNev}</span></td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: e.rekordszam !== null ? 600 : 400 }}>
                  {e.rekordszam !== null ? e.rekordszam : "—"}
                </td>
                <td style={{ ...S.td, textAlign: "right" }}>
                  {parseFloat(e.mereteKb) > 100
                    ? <span style={{ color: "#DC2626", fontWeight: 700 }}>{e.mereteKb}</span>
                    : e.mereteKb}
                </td>
                <td style={{ ...S.td, textAlign: "center" }}><span style={S.badge(e.isDriveSync)}>{e.isDriveSync ? "igen" : "—"}</span></td>
                <td style={{ ...S.td, textAlign: "center" }}><span style={S.badge(e.isBackup)}>{e.isBackup ? "igen" : "—"}</span></td>
              </tr>
            ))}
            {szurt.length === 0 && (
              <tr><td colSpan={6} style={{ ...S.td, textAlign: "center", color: C.muted, padding: "24px" }}>Nincs talalat: &quot;{szuro}&quot;</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 14, padding: "10px 14px", background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, fontSize: 11, color: "#92400E" }}>
        <strong>Drive sync</strong>: kozelito lista a per-service driveSave() hivasok alapjan.
      </div>
    </div>
  );
}

// ─── Kapcsolat sor komponens ──────────────────────────────────────────────
function KapcsolatSor({ cimke, van, szoveg, pirosaHa = false }) {
  const hiba = pirosaHa && !van;
  return (
    <div style={S.kapcsolatSor(van)}>
      <span style={{ marginTop: 2, fontSize: 16, flexShrink: 0 }}>{hiba ? "🔴" : van ? "🟢" : "⚪"}</span>
      <div>
        <span style={{ fontWeight: 700, fontSize: 13, color: hiba ? "#991B1B" : C.text }}>{cimke}</span>
        {szoveg && <span style={{ fontSize: 12, color: hiba ? "#DC2626" : C.muted, marginLeft: 8 }}>{szoveg}</span>}
      </div>
    </div>
  );
}

// ─── Kapcsolati vizsgalat tab ─────────────────────────────────────────────
function KapcsolatokTab({ projektek }) {
  const [projektId, setProjektId] = useState("");
  const projekt     = projektek.find(p => p.id === projektId) || null;
  const ajanlatok   = lsJson("ajanlatok");
  const csomagok    = lsJson("kivitelezesi_csomagok");
  const munkalapok  = lsJson("munkalapok");
  const ajanlatObj  = projekt ? ajanlatok.find(a => a.id === projekt.ajanlatId) : null;
  const kapcs_csom  = projekt ? csomagok.filter(c => c.projektId === projektId) : [];
  const kapcs_ml    = projekt ? munkalapok.filter(
    m => m.projektId === projektId || (projekt.munkalapIds || []).includes(m.id)
  ) : [];
  const vanPillanatkep = projekt ? (projekt.elfogadottAjanlatPillanatkep != null) : false;
  const vanPenzugyi = projekt ? !!(projekt.anyagelszamolasiMod && projekt.anyagelszamolasiMod !== "NINCS_KIVALASZTVA") : false;

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>
          Projekt kivalasztasa
        </label>
        <select value={projektId} onChange={e => setProjektId(e.target.value)}
          style={{ width: "100%", maxWidth: 480, padding: "9px 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: FONT, outline: "none", background: "#fff" }}>
          <option value="">— Valassz projektet ({projektek.length} db) —</option>
          {projektek.map(p => (
            <option key={p.id} value={p.id}>{p.projektkod || p.id} — {p.status || "?"} — {p.ugyfelNev || "Nincs ügyfél"}</option>
          ))}
        </select>
      </div>
      {!projekt && <div style={{ padding: "32px 0", textAlign: "center", color: C.muted, fontSize: 13 }}>Valassz ki egy projektet.</div>}
      {projekt && (
        <div>
          <div style={{ background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 10px" }}>Projekt alap adatai</p>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", fontSize: 12 }}>
              {[
                ["ID", projekt.id], ["Projektkod", projekt.projektkod || "—"],
                ["Forras", projekt.forras || projekt.forrás || "—"], ["Statusz", projekt.status || "—"],
                ["Letrehozva", projekt.createdAt ? new Date(projekt.createdAt).toLocaleDateString("hu-HU") : "—"],
                ["Frissitve", projekt.updatedAt ? new Date(projekt.updatedAt).toLocaleDateString("hu-HU") : "—"],
                ["Verzio", projekt.version || "—"],
              ].map(([k, v]) => (
                <><span key={k+"_k"} style={{ fontWeight: 600, color: "#475569" }}>{k}:</span><span key={k+"_v"} style={{ fontFamily: "monospace", color: C.text, wordBreak: "break-all" }}>{String(v)}</span></>
              ))}
            </div>
          </div>
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 4px" }}>Kapcsolatok es mezok</p>
            <KapcsolatSor cimke="Ajanlat ID" van={!!projekt.ajanlatId}
              szoveg={projekt.ajanlatId ? (ajanlatObj ? `Talalt: ${ajanlatObj.ajanlatSzam || projekt.ajanlatId}` : `Nem talalhato: ${projekt.ajanlatId}`) : "Nincs beallitva"} />
            <KapcsolatSor cimke="Pillanatkep" van={vanPillanatkep}
              szoveg={vanPillanatkep ? "elfogadottAjanlatPillanatkep mentve" : "null – nincs pillanatkep"} />
            <KapcsolatSor cimke={`Kivitelezesi csomag (${kapcs_csom.length} db)`} van={kapcs_csom.length > 0}
              szoveg={kapcs_csom.length > 0 ? kapcs_csom.map(c => `${c.id} (${c.statusz || "?"})`).join(", ") : "Nem talalhato"}
              pirosaHa={(projekt.forras || projekt.forrás) === "sajat_ajanlat"} />
            <KapcsolatSor cimke={`Munkalapok (${kapcs_ml.length} db)`} van={kapcs_ml.length > 0}
              szoveg={kapcs_ml.length > 0 ? kapcs_ml.map(m => `${m.azonosito || m.id} (${m.status || "?"})`).join(", ") : "Nincsenek"} />
            <KapcsolatSor cimke="Penzugyi mod" van={vanPenzugyi}
              szoveg={projekt.anyagelszamolasiMod ? `${projekt.anyagelszamolasiMod}${projekt.adminReviewRequired ? " — ADMIN REVIEW" : ""}` : "Nincs kivalasztva"} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Arva rekordok segéd ──────────────────────────────────────────────────
const CRM_ML_TYPES = ["vbf", "photos", "state", "felmeres_fotok"];

function extractMunkalapIdFromCrmMl(key) {
  const withoutPrefix = key.slice("crm_ml_".length);
  for (const typ of CRM_ML_TYPES) {
    if (withoutPrefix.endsWith("_" + typ)) {
      return { id: withoutPrefix.slice(0, withoutPrefix.length - typ.length - 1), tipus: typ };
    }
  }
  return { id: withoutPrefix, tipus: "ismeretlen" };
}

function scanArvaPerMunkalapKulcsok(munkalapIds) {
  const arva = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith("crm_ml_")) {
      const { id, tipus } = extractMunkalapIdFromCrmMl(key);
      if (!munkalapIds.has(id)) arva.push({ key, munkalapId: id, tipus, kategoria: "crm_ml_" });
    } else if (key.startsWith("lmra_rec_")) {
      const id = key.slice("lmra_rec_".length);
      if (!munkalapIds.has(id)) arva.push({ key, munkalapId: id, tipus: "lmra_rec", kategoria: "lmra_rec_" });
    } else if (key.startsWith("lmra_") && !key.startsWith("lmra_rec_")) {
      const id = key.slice("lmra_".length);
      if (!munkalapIds.has(id)) arva.push({ key, munkalapId: id, tipus: "lmra_legacy", kategoria: "lmra_" });
    }
  }
  return arva;
}

function scanArvaNaptarEsemenyek(munkalapIds, projektIds) {
  try {
    const esemenyek = JSON.parse(localStorage.getItem("naptar_esemenyek") || "[]");
    return esemenyek.filter(ev => {
      const mlId   = ev.munkalapId || ev.ref?.munkalapId;
      const projId = ev.projektId  || ev.ref?.projektId;
      if (!mlId && !projId) return false;
      if (mlId   && !munkalapIds.has(mlId))  return true;
      if (projId && !projektIds.has(projId)) return true;
      return false;
    });
  } catch { return []; }
}

// ─── Arva rekordok tab ────────────────────────────────────────────────────
function ArvaRekordokTab() {
  const projektek  = lsJson("projektek");
  const munkalapok = lsJson("munkalapok");
  const csomagok   = lsJson("kivitelezesi_csomagok");
  const projektIds  = new Set(projektek.map(p => p.id));
  const munkalapIds = new Set(munkalapok.map(m => m.id));

  const arvaMunkalapok      = munkalapok.filter(m => !m.projektId || !projektIds.has(m.projektId) || m.torolt || m.archiv);
  const arvaCsomagok        = csomagok.filter(c => !c.projektId || !projektIds.has(c.projektId));
  const arvaPerMlKulcsok    = scanArvaPerMunkalapKulcsok(munkalapIds);
  const arvaNaptarEsemenyek = scanArvaNaptarEsemenyek(munkalapIds, projektIds);

  const pirosBadge = { display:"inline-block", padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:"#FEE2E2", color:"#991B1B" };
  const zoldBadge  = { display:"inline-block", padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:"#DCFCE7", color:"#166534" };
  const thP = { ...S.th, color:"#991B1B" };
  const trP = { borderBottom:"1px solid #FECACA", background:"#FFF5F5" };

  function ArvaTabla({ cim, sorok, fejlec, sorRender, uresUzenet }) {
    return (
      <div style={{ marginBottom:28 }}>
        <p style={{ fontSize:11, fontWeight:700, color: sorok.length > 0 ? "#991B1B" : "#166534", textTransform:"uppercase", letterSpacing:0.7, margin:"0 0 10px" }}>
          {cim} ({sorok.length} db)
        </p>
        {sorok.length === 0 ? (
          <div style={{ padding:"14px 16px", background:"#F0FDF4", border:"1px solid #86EFAC", borderRadius:8, fontSize:12, color:"#166534" }}>{uresUzenet}</div>
        ) : (
          <div style={{ overflowX:"auto", border:"1px solid #FECACA", borderRadius:10 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#FEF2F2", borderBottom:"2px solid #FECACA" }}>
                  {fejlec.map(f => <th key={f} style={thP}>{f}</th>)}
                </tr>
              </thead>
              <tbody>{sorok.map(sorRender)}</tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding:"20px 24px" }}>
      <div style={{ display:"flex", gap:10, marginBottom:24, flexWrap:"wrap" }}>
        <span style={arvaMunkalapok.length > 0 ? pirosBadge : zoldBadge}>Munkalapok: {arvaMunkalapok.length > 0 ? `${arvaMunkalapok.length} árva` : "OK"}</span>
        <span style={arvaCsomagok.length > 0 ? pirosBadge : zoldBadge}>Kivi csomagok: {arvaCsomagok.length > 0 ? `${arvaCsomagok.length} árva` : "OK"}</span>
        <span style={arvaPerMlKulcsok.length > 0 ? pirosBadge : zoldBadge}>Per-ML kulcsok: {arvaPerMlKulcsok.length > 0 ? `${arvaPerMlKulcsok.length} árva` : "OK"}</span>
        <span style={arvaNaptarEsemenyek.length > 0 ? pirosBadge : zoldBadge}>Naptár esemény: {arvaNaptarEsemenyek.length > 0 ? `${arvaNaptarEsemenyek.length} árva` : "OK"}</span>
      </div>
      <ArvaTabla cim="Árva munkalapok" sorok={arvaMunkalapok} fejlec={["Munkalap ID","Státusz","projektId","torolt","archiv","Gyökérok"]}
        uresUzenet="Nincs árva munkalap."
        sorRender={m => {
          const ok = !m.projektId ? "Hiányzó projektId" : !projektIds.has(m.projektId) ? "projektId nem létező projektre mutat" : m.torolt ? "torolt===true" : "archiv===true";
          return (
            <tr key={m.id} style={trP}>
              <td style={{ ...S.td, fontFamily:"monospace", fontWeight:700, color:"#991B1B" }}>{m.id?.slice(-8)||"—"}</td>
              <td style={S.td}>{m.status||"—"}</td>
              <td style={{ ...S.td, fontFamily:"monospace", fontSize:11 }}>{m.projektId || <em style={{ color:"#DC2626" }}>HIÁNYZIK</em>}</td>
              <td style={{ ...S.td, textAlign:"center" }}>{m.torolt ? "🔴 igen" : "—"}</td>
              <td style={{ ...S.td, textAlign:"center" }}>{m.archiv ? "🔴 igen" : "—"}</td>
              <td style={{ ...S.td, color:"#DC2626", fontSize:11 }}>{ok}</td>
            </tr>
          );
        }}
      />
      <ArvaTabla cim="Árva kivitelezési csomagok" sorok={arvaCsomagok} fejlec={["Csomag ID","Státusz","projektId","Gyökérok"]}
        uresUzenet="Nincs árva kivitelezési csomag."
        sorRender={c => {
          const ok = !c.projektId ? "Hiányzó projektId" : "projektId nem létező projektre mutat";
          return (
            <tr key={c.id} style={trP}>
              <td style={{ ...S.td, fontFamily:"monospace", fontWeight:700, color:"#991B1B" }}>{c.id?.slice(-8)||"—"}</td>
              <td style={S.td}>{c.statusz||"—"}</td>
              <td style={{ ...S.td, fontFamily:"monospace", fontSize:11 }}>{c.projektId || <em style={{ color:"#DC2626" }}>HIÁNYZIK</em>}</td>
              <td style={{ ...S.td, color:"#DC2626", fontSize:11 }}>{ok}</td>
            </tr>
          );
        }}
      />
      <ArvaTabla cim="Per-munkalap kulcsok árva munkalaphoz" sorok={arvaPerMlKulcsok} fejlec={["localStorage kulcs","Típus","Munkalap ID","Megjegyzés"]}
        uresUzenet="Nincs árva per-munkalap kulcs (crm_ml_*, lmra_rec_*)."
        sorRender={r => (
          <tr key={r.key} style={trP}>
            <td style={{ ...S.td, fontFamily:"monospace", fontSize:11, color:"#991B1B" }}>{r.key}</td>
            <td style={{ ...S.td, fontSize:11 }}>{r.tipus}</td>
            <td style={{ ...S.td, fontFamily:"monospace", fontSize:11 }}>{r.munkalapId}</td>
            <td style={{ ...S.td, color:"#DC2626", fontSize:11 }}>Munkalap nem található</td>
          </tr>
        )}
      />
      <ArvaTabla cim="Árva kézi naptár események" sorok={arvaNaptarEsemenyek} fejlec={["Esemény ID","Cím","Hivatkozott ID","Gyökérok"]}
        uresUzenet="Nincs árva naptár esemény."
        sorRender={ev => {
          const mlId   = ev.munkalapId || ev.ref?.munkalapId;
          const projId = ev.projektId  || ev.ref?.projektId;
          const ok = mlId && !munkalapIds.has(mlId) ? "munkalapId nem létező munkalapra mutat" : "projektId nem létező projektre mutat";
          return (
            <tr key={ev.id} style={trP}>
              <td style={{ ...S.td, fontFamily:"monospace", fontSize:11, color:"#991B1B" }}>{ev.id?.slice(-8)||"—"}</td>
              <td style={S.td}>{ev.title||ev.cim||"—"}</td>
              <td style={{ ...S.td, fontFamily:"monospace", fontSize:11 }}>{mlId||projId||"—"}</td>
              <td style={{ ...S.td, color:"#DC2626", fontSize:11 }}>{ok}</td>
            </tr>
          );
        }}
      />
      <div style={{ marginTop:8, padding:"10px 14px", background:"#FFFBEB", border:"1px solid #FCD34D", borderRadius:8, fontSize:11, color:"#92400E" }}>
        <strong>Árva rekord</strong>: hiányzó vagy érvénytelen hivatkozás. Csak olvasható — törléshez: Beállítások / Teljes tesztadat törlés.
      </div>
    </div>
  );
}

// ─── Projekt adatfolyam – segéd komponensek ───────────────────────────────
const ALLAPOT_SZIN = {
  zold:   { bg:"#F0FDF4", border:"#86EFAC", fejlecBg:"#DCFCE7", fejlecSzin:"#166534", ikon:"🟢" },
  sarga:  { bg:"#FFFBEB", border:"#FCD34D", fejlecBg:"#FEF3C7", fejlecSzin:"#92400E", ikon:"🟡" },
  piros:  { bg:"#FEF2F2", border:"#FECACA", fejlecBg:"#FEE2E2", fejlecSzin:"#991B1B", ikon:"🔴" },
  szurke: { bg:"#F8FAFC", border:"#CBD5E1", fejlecBg:"#F1F5F9", fejlecSzin:"#64748B", ikon:"⚪" },
};

function AdatfolyamBlokk({ betu, cim, allapot, fajlok, children }) {
  const sz = ALLAPOT_SZIN[allapot] || ALLAPOT_SZIN.szurke;
  return (
    <div style={{ border:`1.5px solid ${sz.border}`, borderRadius:12, background:sz.bg, overflow:"hidden" }}>
      <div style={{ padding:"10px 16px", background:sz.fejlecBg, borderBottom:`1px solid ${sz.border}`, display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontWeight:800, fontSize:15, color:sz.fejlecSzin }}>{sz.ikon}</span>
        <span style={{ fontWeight:800, fontSize:13, color:sz.fejlecSzin }}>{betu})</span>
        <span style={{ fontWeight:700, fontSize:13, color:sz.fejlecSzin }}>{cim}</span>
      </div>
      <div style={{ padding:"12px 16px" }}>
        {children}
        {fajlok && fajlok.length > 0 && (
          <div style={{ marginTop:10, paddingTop:8, borderTop:"1px dashed #CBD5E1" }}>
            <span style={{ fontSize:10, color:"#94A3B8", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>Érintett fájlok: </span>
            {fajlok.map((f, i) => (
              <span key={f} style={{ fontSize:10, color:"#64748B", fontFamily:"monospace" }}>{i > 0 ? ", " : ""}{f}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AdatSor({ cimke, ertek, allapot }) {
  const szin = allapot === "hiba" ? "#DC2626" : allapot === "figyelem" ? "#B45309" : allapot === "ok" ? "#166534" : "#475569";
  return (
    <div style={{ display:"flex", gap:8, padding:"3px 0", fontSize:12, alignItems:"flex-start" }}>
      <span style={{ color:"#64748B", fontWeight:600, minWidth:175, flexShrink:0 }}>{cimke}:</span>
      <span style={{ color:szin, wordBreak:"break-word", fontFamily: typeof ertek === "string" && ertek.startsWith("crm_") ? "monospace" : "inherit" }}>{ertek}</span>
    </div>
  );
}

function UzenetSor({ szoveg, tipus }) {
  const t = {
    hiba:     { bg:"#FEE2E2", border:"#FECACA", szin:"#991B1B", cimke:"Hiba" },
    figyelem: { bg:"#FEF3C7", border:"#FCD34D", szin:"#92400E", cimke:"Figyelem" },
    info:     { bg:"#EFF6FF", border:"#BFDBFE", szin:"#1E40AF", cimke:"Info" },
  }[tipus] || { bg:"#F8FAFC", border:"#CBD5E1", szin:"#475569", cimke:"" };
  return (
    <div style={{ padding:"6px 10px", marginTop:6, background:t.bg, border:`1px solid ${t.border}`, borderRadius:6, fontSize:11, color:t.szin, lineHeight:1.5 }}>
      <strong>{t.cimke}: </strong>{szoveg}
    </div>
  );
}

function Nyil() {
  return <div style={{ textAlign:"center", fontSize:22, color:"#94A3B8", lineHeight:1, padding:"6px 0", userSelect:"none" }}>↓</div>;
}

// ─── Projekt adatfolyam tab ───────────────────────────────────────────────
const REJTETT_STATUSOK = new Set(["Meghiúsult","Archivált","Lezárva","Számlázva","Befejezett","Befejezett Felmérés"]);

function ProjektAdatfolyamTab() {
  const [projektId, setProjektId] = useState("");

  const projektek            = lsJson("projektek");
  const ajanlatok            = lsJson("ajanlatok");
  const csomagok             = lsJson("kivitelezesi_csomagok");
  const munkalapok           = lsJson("munkalapok");
  const elszamolasiSzabalyok = lsJson("elszamolasi_szabalyok");

  const projekt = projektek.find(p => p.id === projektId) || null;

  const projektSelect = (
    <div style={{ marginBottom: projekt ? 20 : 0 }}>
      <label style={{ fontSize:11, fontWeight:700, color:"#64748B", display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:0.7 }}>
        Projekt kiválasztása
      </label>
      <select value={projektId} onChange={e => setProjektId(e.target.value)}
        style={{ width:"100%", maxWidth:520, padding:"9px 12px", border:`1.5px solid ${C.border}`, borderRadius:8, fontSize:13, fontFamily:FONT, outline:"none", background:"#fff" }}>
        <option value="">— Válassz projektet ({projektek.length} db) —</option>
        {projektek.map(p => (
          <option key={p.id} value={p.id}>
            {p.projektkod || p.id} — {p.status || "?"} — {p.ugyfelNev || "Nincs ügyfél"}
          </option>
        ))}
      </select>
    </div>
  );

  if (!projekt) {
    return (
      <div style={{ padding:"20px 24px" }}>
        {projektSelect}
        <div style={{ padding:"40px 0", textAlign:"center", color:C.muted, fontSize:13 }}>
          Válassz ki egy projektet az adatfolyam megtekintéséhez.
        </div>
      </div>
    );
  }

  // ── Adatok összegyűjtése ──────────────────────────────────────────────
  const forras      = projekt.forras || projekt.forrás || "";
  const sajatAj     = forras === "sajat_ajanlat";
  const foVall      = forras === "fovallalkozoi";

  // A) Ajánlat
  const ajanlat        = projekt.ajanlatId ? ajanlatok.find(a => a.id === projekt.ajanlatId) : null;
  const vanPillanatkep = projekt.elfogadottAjanlatPillanatkep != null;
  const ajanlatTetelek = ajanlat?.tetelek?.length ?? 0;
  const ajanlatOsszeg  = projekt.elfogadottAjanlatPillanatkep?.osszeg
    ?? ajanlat?.osszeg ?? ajanlat?.vegosszeg ?? ajanlat?.brutto ?? null;

  let ajanlatAllapot;
  if (!sajatAj) {
    ajanlatAllapot = "szurke";
  } else if (!projekt.ajanlatId || !ajanlat) {
    ajanlatAllapot = "piros";
  } else if (!vanPillanatkep) {
    ajanlatAllapot = "sarga";
  } else {
    ajanlatAllapot = "zold";
  }

  // B) Projekt
  const vanAnyagMod    = !!(projekt.anyagelszamolasiMod && projekt.anyagelszamolasiMod !== "NINCS_KIVALASZTVA");
  const vanStatus      = !!projekt.status;
  const projektAllapot = !vanStatus ? "piros" : !vanAnyagMod ? "sarga" : "zold";

  const csapatNev = projekt.csapatNev || projekt.csapat || projekt.csapatId || null;

  // C) Kivitelezési csomag
  const projCsomagok  = csomagok.filter(c => c.projektId === projektId);
  const osszesTetelek = projCsomagok.reduce((s, c) => s + (c.tetelek?.length || 0), 0);

  const csomagOsszesitett = projCsomagok.reduce((acc, c) => {
    (c.tetelek || []).forEach(t => {
      acc.tervezett   += (t.tervMennyiseg   || t.mennyiseg           || 0);
      acc.kiadando    += (t.kiadandoMennyiseg  || 0);
      acc.kiadott     += (t.kiadottMennyiseg   || 0);
      acc.felhasznalt += (t.felhasznaltMennyiseg|| 0);
      const egysegar   = t.egysegar || t.nettoBeszerzesiAr || t.listaAr || 0;
      const menny      = t.tervMennyiseg || t.mennyiseg || 0;
      acc.anyagKoltseg += egysegar * menny;
    });
    return acc;
  }, { tervezett:0, kiadando:0, kiadott:0, felhasznalt:0, anyagKoltseg:0 });

  const csomagForras = projCsomagok.length > 0
    ? (projCsomagok[0].forras || projCsomagok[0].letrehozasMod || projCsomagok[0].tipus || "—")
    : "—";

  let csomagAllapot;
  if (projCsomagok.length === 0) csomagAllapot = "piros";
  else if (osszesTetelek === 0)  csomagAllapot = "sarga";
  else                           csomagAllapot = "zold";

  // D) Munkalapok
  const projMls = munkalapok.filter(
    m => m.projektId === projektId || (projekt.munkalapIds || []).includes(m.id)
  );
  const munkalapIdsSet  = new Set(munkalapok.map(m => m.id));
  const mlIdsNotFound   = (projekt.munkalapIds || []).filter(id => !munkalapIdsSet.has(id));
  const vanToroltArchiv = projMls.some(m => m.torolt || m.archiv);

  let munkalapAllapot;
  if (projMls.length === 0)   munkalapAllapot = "sarga";
  else if (vanToroltArchiv || mlIdsNotFound.length > 0) munkalapAllapot = "sarga";
  else                        munkalapAllapot = "zold";

  const statusOsszesito = projMls.reduce((acc, m) => {
    const st = m.status || "Ismeretlen";
    acc[st] = (acc[st] || 0) + 1;
    return acc;
  }, {});

  // E) Telepítő láthatóság
  const telepitoLathato    = projMls.filter(m => !m.torolt && !m.archiv && !REJTETT_STATUSOK.has(m.status));
  const telepitoNemLathato = projMls.filter(m =>  m.torolt ||  m.archiv ||  REJTETT_STATUSOK.has(m.status));
  const nemRendelt          = telepitoLathato.filter(m => !m.szerelo && !m.csapat && !m.csapatId && !m.csapatNev);

  let telepitoAllapot;
  if (projMls.length === 0)              telepitoAllapot = "sarga";
  else if (telepitoLathato.length === 0) telepitoAllapot = "piros";
  else if (telepitoNemLathato.length > 0 || nemRendelt.length > 0) telepitoAllapot = "sarga";
  else                                   telepitoAllapot = "zold";

  // F) Pénzügy
  const penzugy       = projekt.penzugy || {};
  const csapatLetszam = penzugy.csapatLetszam || penzugy.letszam;
  const munkanapokSzam= penzugy.munkanapok;
  const napiDij       = penzugy.napiDij;

  let bevetelForras = "ismeretlen";
  let bevetelMegjegyzes = null;
  if (sajatAj) {
    bevetelForras = "Saját ajánlat";
    if (!ajanlat)          bevetelMegjegyzes = "Ajánlat rekord nem található";
    else if (!vanPillanatkep) bevetelMegjegyzes = "elfogadottAjanlatPillanatkep hiányzik";
  } else if (foVall) {
    bevetelForras = "Fővállalkozói elszámolás";
    const szabaly = elszamolasiSzabalyok.find(sz => sz.id === (projekt.elszamolasiSzabalyId || projekt.elszamolasSzabalyId));
    if (!szabaly) bevetelMegjegyzes = "Elszámolási szabály nem található";
    else bevetelMegjegyzes = `Szabály: ${szabaly.nev || szabaly.id}`;
  } else if (forras) {
    bevetelForras = `Egyéb (${forras})`;
  }

  const vanBevetel    = bevetelForras !== "ismeretlen";
  const vanAnyag      = csomagOsszesitett.anyagKoltseg > 0 || !!(projekt.penzugy?.anyagKoltsegOverride);
  const vanCsapatKolt = !!(csapatLetszam && munkanapokSzam);

  let penzugyAllapot;
  if (!vanBevetel)                          penzugyAllapot = "piros";
  else if (!vanAnyag || !vanCsapatKolt)     penzugyAllapot = "sarga";
  else                                      penzugyAllapot = "zold";

  const szazalek = (r, o) => o > 0 ? ` (${Math.round((r/o)*100)}%)` : "";

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div style={{ padding:"20px 24px" }}>
      {projektSelect}

      <div style={{ maxWidth:680 }}>

        {/* A) Ajánlat */}
        <AdatfolyamBlokk betu="A" cim="Ajánlat" allapot={ajanlatAllapot}
          fajlok={["AjanlatEditor.jsx","ajanlat.service.js","ProjektForm.jsx"]}>
          <AdatSor cimke="Projekt forrás (forras)" ertek={forras || "nincs"} allapot={forras ? "ok" : "figyelem"} />
          <AdatSor cimke="ajanlatId" ertek={projekt.ajanlatId || "—"} allapot={projekt.ajanlatId ? "ok" : sajatAj ? "hiba" : null} />
          {projekt.ajanlatId && (
            <AdatSor cimke="Ajánlat rekord" ertek={ajanlat ? (ajanlat.ajanlatSzam || ajanlat.id) : "NEM TALÁLHATÓ"} allapot={ajanlat ? "ok" : "hiba"} />
          )}
          {ajanlat && <AdatSor cimke="Ajánlat státusz" ertek={ajanlat.statusz || ajanlat.allapot || "—"} />}
          {ajanlat && <AdatSor cimke="Ajánlat tételek" ertek={`${ajanlatTetelek} db`} allapot={ajanlatTetelek > 0 ? "ok" : "figyelem"} />}
          {ajanlat && ajanlatOsszeg != null && (
            <AdatSor cimke="Ajánlat összege" ertek={`${Number(ajanlatOsszeg).toLocaleString("hu-HU")} Ft`} allapot="ok" />
          )}
          <AdatSor cimke="elfogadottAjanlatPillanatkep" ertek={vanPillanatkep ? "megvan" : "null"} allapot={vanPillanatkep ? "ok" : sajatAj ? "figyelem" : null} />

          {!sajatAj && <UzenetSor szoveg={`Forrás: "${forras||"nincs"}" — nem saját ajánlat alapú projekt, ajánlat blokk nem kritikus.`} tipus="info" />}
          {sajatAj && !projekt.ajanlatId && <UzenetSor szoveg="Hiba: ajanlatId hiányzik — saját ajánlat forrású projektnél kötelező." tipus="hiba" />}
          {sajatAj && projekt.ajanlatId && !ajanlat && <UzenetSor szoveg="Hiba: az ajanlatId létező ajánlatra nem mutat — az ajánlat törlődhetett." tipus="hiba" />}
          {sajatAj && ajanlat && !vanPillanatkep && <UzenetSor szoveg="Figyelem: nincs elfogadottAjanlatPillanatkep — a pénzügyi számítás hiányos lehet." tipus="figyelem" />}
        </AdatfolyamBlokk>

        <Nyil />

        {/* B) Projekt */}
        <AdatfolyamBlokk betu="B" cim="Projekt" allapot={projektAllapot}
          fajlok={["projekt.service.js","ProjektForm.jsx","ProjektekPage.jsx"]}>
          <AdatSor cimke="ID" ertek={projekt.id} />
          <AdatSor cimke="Projektkód" ertek={projekt.projektkod || "—"} allapot={projekt.projektkod ? "ok" : "figyelem"} />
          <AdatSor cimke="Státusz" ertek={projekt.status || "—"} allapot={vanStatus ? "ok" : "hiba"} />
          <AdatSor cimke="Forrás" ertek={forras || "—"} allapot={forras ? "ok" : "figyelem"} />
          <AdatSor cimke="anyagelszamolasiMod" ertek={projekt.anyagelszamolasiMod || "—"} allapot={vanAnyagMod ? "ok" : "figyelem"} />
          <AdatSor cimke="Csapat" ertek={csapatNev || "—"} allapot={csapatNev ? "ok" : "figyelem"} />
          <AdatSor cimke="munkalapIds" ertek={`${(projekt.munkalapIds || []).length} db`} />
          <AdatSor cimke="adminReviewRequired" ertek={projekt.adminReviewRequired ? "igen" : "nem"} allapot={projekt.adminReviewRequired ? "figyelem" : null} />

          {!vanAnyagMod && <UzenetSor szoveg="Figyelem: projekt pénzügyi módban nincs anyagelszámolási mód — pénzügyi számítás nem indítható." tipus="figyelem" />}
          {projekt.adminReviewRequired && <UzenetSor szoveg="Figyelem: adminReviewRequired=true — pénzügyi jóváhagyásra vár." tipus="figyelem" />}
        </AdatfolyamBlokk>

        <Nyil />

        {/* C) Kivitelezési csomag */}
        <AdatfolyamBlokk betu="C" cim="Kivitelezési csomag" allapot={csomagAllapot}
          fajlok={["kivitelezesiCsomag.service.js","kivitelezesiCsomag.schema.js","TabKivitelezesiCsomag.jsx","anyagSzamito.service.js"]}>
          <AdatSor cimke="Csomagok száma" ertek={`${projCsomagok.length} db`} allapot={projCsomagok.length > 0 ? "ok" : "hiba"} />
          {projCsomagok.map(cs => (
            <AdatSor key={cs.id} cimke={`  ${cs.id?.slice(-8)||"?"}`} ertek={`${cs.statusz||"?"} — ${cs.tetelek?.length||0} tétel${cs.munkatipus ? ` — ${cs.munkatipus}` : ""}`} allapot={(cs.tetelek?.length||0) > 0 ? "ok" : "figyelem"} />
          ))}
          <AdatSor cimke="Összes tétel" ertek={`${osszesTetelek} db`} allapot={osszesTetelek > 0 ? "ok" : projCsomagok.length > 0 ? "figyelem" : "hiba"} />
          <AdatSor cimke="Csomag forrás" ertek={csomagForras} />
          <AdatSor cimke="Tervezett menny." ertek={csomagOsszesitett.tervezett.toFixed(2)} />
          <AdatSor cimke="Kiadandó menny." ertek={`${csomagOsszesitett.kiadando.toFixed(2)}${szazalek(csomagOsszesitett.kiadando, csomagOsszesitett.tervezett)}`} />
          <AdatSor cimke="Kiadott menny." ertek={`${csomagOsszesitett.kiadott.toFixed(2)}${szazalek(csomagOsszesitett.kiadott, csomagOsszesitett.tervezett)}`} />
          <AdatSor cimke="Felhasznált menny." ertek={`${csomagOsszesitett.felhasznalt.toFixed(2)}${szazalek(csomagOsszesitett.felhasznalt, csomagOsszesitett.tervezett)}`} />
          <AdatSor cimke="Becsült anyagköltség" ertek={csomagOsszesitett.anyagKoltseg > 0 ? `${Math.round(csomagOsszesitett.anyagKoltseg).toLocaleString("hu-HU")} Ft` : "0 Ft (egységár hiányzik?)"} allapot={csomagOsszesitett.anyagKoltseg > 0 ? "ok" : "figyelem"} />

          {projCsomagok.length === 0 && <UzenetSor szoveg="Hiba: kivitelezési csomag nincs a projekthez." tipus="hiba" />}
          {projCsomagok.length > 0 && osszesTetelek === 0 && <UzenetSor szoveg="Figyelem: csomag létezik, de 0 tétel van benne." tipus="figyelem" />}
        </AdatfolyamBlokk>

        <Nyil />

        {/* D) Munkalapok */}
        <AdatfolyamBlokk betu="D" cim="Munkalapok" allapot={munkalapAllapot}
          fajlok={["UjMunkalap.jsx","MunkalapPage.jsx","workflowRules.js"]}>
          <AdatSor cimke="Munkalapok száma" ertek={`${projMls.length} db`} allapot={projMls.length > 0 ? "ok" : "figyelem"} />
          {Object.entries(statusOsszesito).map(([st, db]) => (
            <AdatSor key={st} cimke={`  Státusz: ${st}`} ertek={`${db} db`}
              allapot={REJTETT_STATUSOK.has(st) ? "figyelem" : "ok"} />
          ))}
          <AdatSor cimke="munkalapIds listában" ertek={`${(projekt.munkalapIds||[]).length} ID — ${mlIdsNotFound.length > 0 ? `${mlIdsNotFound.length} nem található` : "mind megvan"}`}
            allapot={mlIdsNotFound.length > 0 ? "figyelem" : "ok"} />
          <AdatSor cimke="Törölt/archivált" ertek={`${projMls.filter(m=>m.torolt||m.archiv).length} db`} allapot={vanToroltArchiv ? "figyelem" : null} />
          {projMls.slice(0, 5).map(ml => (
            <AdatSor key={ml.id} cimke={`  ${ml.azonosito||ml.id?.slice(-8)||"?"}`}
              ertek={`${ml.status||"?"} — ${ml.munkaTipus||"?"} — szerelő: ${ml.szerelo||ml.csapatNev||"nincs"}`}
              allapot={ml.torolt||ml.archiv ? "figyelem" : null} />
          ))}
          {projMls.length > 5 && <div style={{ fontSize:11, color:C.muted, paddingLeft:8, paddingTop:2 }}>...és még {projMls.length-5} munkalap</div>}

          {projMls.length === 0 && <UzenetSor szoveg="Figyelem: nincs munkalap ehhez a projekthez." tipus="figyelem" />}
          {mlIdsNotFound.length > 0 && <UzenetSor szoveg={`Figyelem: projekt.munkalapIds-ben ${mlIdsNotFound.length} olyan ID van, amelyhez nincs munkalap rekord.`} tipus="figyelem" />}
        </AdatfolyamBlokk>

        <Nyil />

        {/* E) Telepítő */}
        <AdatfolyamBlokk betu="E" cim="Telepítő láthatóság" allapot={telepitoAllapot}
          fajlok={["TelepItoMunkalap.jsx","KivCsomagFelhasznalasTab.jsx","workflowRules.js"]}>
          <AdatSor cimke="Látható munkalapok" ertek={`${telepitoLathato.length} db`} allapot={telepitoLathato.length > 0 ? "ok" : "hiba"} />
          <AdatSor cimke="Rejtett munkalapok" ertek={`${telepitoNemLathato.length} db`} allapot={telepitoNemLathato.length > 0 ? "figyelem" : "ok"} />
          <AdatSor cimke="Nem rendelt munkalapok" ertek={`${nemRendelt.length} db (látható, de szerelő nincs)`} allapot={nemRendelt.length > 0 ? "figyelem" : "ok"} />
          {telepitoNemLathato.map(ml => (
            <AdatSor key={ml.id} cimke={`  ${ml.azonosito||ml.id?.slice(-8)||"?"}`}
              ertek={ml.torolt ? "torolt=true" : ml.archiv ? "archiv=true" : `státusz rejtett: ${ml.status||"?"}`}
              allapot="figyelem" />
          ))}
          <AdatSor cimke="Projektre mutat" ertek="igen (kiválasztott projekt)" allapot="ok" />
          <AdatSor cimke="Projekt létezik" ertek="igen" allapot="ok" />

          {telepitoLathato.length === 0 && projMls.length > 0 && (
            <UzenetSor szoveg="Hiba: a munkalap státusza/törlöttsége miatt a telepítő nem látja a munkalapokat." tipus="hiba" />
          )}
          {telepitoLathato.length === 0 && projMls.length === 0 && (
            <UzenetSor szoveg="Figyelem: nincs munkalap, amit a telepítő láthatna." tipus="figyelem" />
          )}
          {nemRendelt.length > 0 && (
            <UzenetSor szoveg={`Figyelem: ${nemRendelt.length} látható munkalapnak nincs hozzárendelt szerelője/csapata.`} tipus="figyelem" />
          )}
          {projCsomagok.length === 0 && telepitoLathato.length > 0 && (
            <UzenetSor szoveg="Hiba: munkalap.projektId megvan, de kivitelezési csomag nincs — a telepítő nem találja a kiadandó anyagokat." tipus="hiba" />
          )}
        </AdatfolyamBlokk>

        <Nyil />

        {/* F) Pénzügy */}
        <AdatfolyamBlokk betu="F" cim="Pénzügy" allapot={penzugyAllapot}
          fajlok={["TabPenzugy.jsx","financialCalculation.service.js","settlementCalculator.js","elszamolasiMotor.js"]}>
          <AdatSor cimke="Bevétel forrása" ertek={bevetelForras} allapot={vanBevetel ? "ok" : "hiba"} />
          {bevetelMegjegyzes && <AdatSor cimke="Bevétel megjegyzés" ertek={bevetelMegjegyzes} allapot={bevetelMegjegyzes.startsWith("Szabály:") ? "ok" : "figyelem"} />}
          {sajatAj && ajanlatOsszeg != null && (
            <AdatSor cimke="Bevétel összege" ertek={`${Number(ajanlatOsszeg).toLocaleString("hu-HU")} Ft`} allapot="ok" />
          )}
          <AdatSor cimke="Anyagköltség forrása" ertek={projCsomagok.length > 0 ? "Kivitelezési csomag tételek" : "—"} allapot={projCsomagok.length > 0 ? "ok" : "figyelem"} />
          <AdatSor cimke="Becsült anyagköltség" ertek={vanAnyag ? `${Math.round(csomagOsszesitett.anyagKoltseg).toLocaleString("hu-HU")} Ft` : "0 Ft"} allapot={vanAnyag ? "ok" : "figyelem"} />
          {penzugy.anyagKoltsegOverride != null && (
            <AdatSor cimke="Kézi anyagköltség override" ertek={`${Number(penzugy.anyagKoltsegOverride).toLocaleString("hu-HU")} Ft`} allapot="figyelem" />
          )}
          <AdatSor cimke="Csapatköltség forrása" ertek="projekt.penzugy (csapatLetszam × munkanapok × napiDij)" />
          <AdatSor cimke="Csapatlétszám" ertek={csapatLetszam != null ? String(csapatLetszam) : "—"} allapot={csapatLetszam ? "ok" : "figyelem"} />
          <AdatSor cimke="Munkanapok" ertek={munkanapokSzam != null ? String(munkanapokSzam) : "—"} allapot={munkanapokSzam ? "ok" : "figyelem"} />
          <AdatSor cimke="Napi díj" ertek={napiDij != null ? `${Number(napiDij).toLocaleString("hu-HU")} Ft` : "— (beállításokból)"} />
          {csapatLetszam && munkanapokSzam && napiDij && (
            <AdatSor cimke="Becsült csapatköltség" ertek={`${(csapatLetszam * munkanapokSzam * napiDij).toLocaleString("hu-HU")} Ft`} allapot="ok" />
          )}

          {!vanBevetel && <UzenetSor szoveg="Hiba: bevétel forrás ismeretlen — a pénzügyi számítás nem tud elindulni." tipus="hiba" />}
          {vanBevetel && !vanAnyag && <UzenetSor szoveg="Figyelem: anyagköltség 0 Ft — nincs tétel a csomagban, vagy egységárak hiányoznak." tipus="figyelem" />}
          {!csapatLetszam && <UzenetSor szoveg="Figyelem: projekt pénzügyben nincs csapatlétszám — csapatköltség 0 Ft." tipus="figyelem" />}
          {!munkanapokSzam && <UzenetSor szoveg="Figyelem: projekt pénzügyben nincs munkanap — csapatköltség 0 Ft." tipus="figyelem" />}
        </AdatfolyamBlokk>

      </div>

      <div style={{ marginTop:20, padding:"10px 14px", background:"#FFFBEB", border:"1px solid #FCD34D", borderRadius:8, fontSize:11, color:"#92400E" }}>
        <strong>Csak olvasható nézet.</strong> Semmilyen adat nem módosul. Az összegek becsültek (egységár × tervmennyiség).
      </div>
    </div>
  );
}

// ─── Fo komponens ─────────────────────────────────────────────────────────
export default function AdatTerkepDebug() {
  const [tab, setTab] = useState("kulcsok");
  const [snapshot]   = useState(readSnapshot);
  const [frissitve]  = useState(() => new Date().toLocaleTimeString("hu-HU"));

  const projektek = (() => {
    try { return JSON.parse(localStorage.getItem("projektek") || "[]"); } catch { return []; }
  })();

  function tabGombStil(id) {
    const aktiv = tab === id;
    return {
      padding: "9px 18px", border: "none", cursor: "pointer", fontFamily: FONT,
      fontWeight: aktiv ? 700 : 400, fontSize: 13,
      color: aktiv ? "#1D4ED8" : C.muted,
      background: aktiv ? "#fff" : "transparent",
      borderBottom: aktiv ? "2px solid #2563EB" : "2px solid transparent",
      whiteSpace: "nowrap",
    };
  }

  return (
    <div style={{ fontFamily: FONT, paddingBottom: 40 }}>
      <div style={{ margin: "0 24px 20px", marginTop: 20, padding: "12px 16px", background: "#FFFBEB", border: "2px solid #F59E0B", borderRadius: 10, display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
        <div>
          <p style={{ fontWeight: 800, fontSize: 13, color: "#92400E", margin: "0 0 3px" }}>Fejlesztoi debug nezet – csak olvaso mod</p>
          <p style={{ fontSize: 12, color: "#78350F", margin: 0, lineHeight: 1.5 }}>
            Semmilyen adatmodositas, torles, export, import vagy restore nem vegezhetö innen. Csakis Admin szerepkornek lathato.
          </p>
        </div>
      </div>

      <div style={{ borderBottom: `1px solid ${C.border}`, display: "flex", gap: 0, background: "#F8FAFC", margin: "0 24px", overflowX: "auto" }}>
        <button style={tabGombStil("kulcsok")} onClick={() => setTab("kulcsok")}>localStorage kulcsok ({snapshot.length})</button>
        <button style={tabGombStil("kapcsolatok")} onClick={() => setTab("kapcsolatok")}>Kapcsolati vizsgálat</button>
        <button style={tabGombStil("arva")} onClick={() => setTab("arva")}>Árva rekordok</button>
        <button style={tabGombStil("adatfolyam")} onClick={() => setTab("adatfolyam")}>Projekt adatfolyam</button>
      </div>

      {tab === "kulcsok"     && <KulcsokTab snapshot={snapshot} frissitve={frissitve} />}
      {tab === "kapcsolatok" && <KapcsolatokTab projektek={projektek} />}
      {tab === "arva"        && <ArvaRekordokTab />}
      {tab === "adatfolyam"  && <ProjektAdatfolyamTab />}
    </div>
  );
}