import { useState } from "react";
import { C, FONT } from "../lib/constants";

// ─── Statikus metaadat (service fajlok alapjan karbantartott) ─────────────
// Backup: backupService.js MAIN_KEYS + PREFIX_GROUPS
const BACKUP_KULCSOK = new Set([
  "projektek","munkalapok","ugyfelek","beallitasok","karteritesek","sablonok",
  "ajanlatok","edi_sorszam_counter","edi_ajanlat_sorszam_counter","crm_schema_version",
]);
const BACKUP_PREFIXEK = [
  "vbf_","crm_vbf_","fotok_","crm_fotok_","felh_anyagok_","crm_felh_anyagok_",
  "karterites_","crm_karterites_",
];

// Drive sync: per-service driveSave() hivasok alapjan (kozelito lista)
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
      key,
      tipusNev,
      rekordszam,
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
  kapcsolatSor: (van) => ({
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
          <span style={{ fontSize: 12, color: C.muted }}>
            <strong>{snapshot.length}</strong> kulcs
          </span>
          <span style={{ fontSize: 12, color: C.muted }}>
            <strong>{osszesMeret.toFixed(1)} KB</strong> osszes meret
          </span>
          <span style={{ fontSize: 12, color: C.muted }}>
            Olvasva: {frissitve}
          </span>
        </div>
        <input
          value={szuro}
          onChange={e => setSzuro(e.target.value)}
          placeholder="Szuro (pl. projekt, vbf_...)"
          style={{
            padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 7,
            fontSize: 12, fontFamily: FONT, outline: "none", width: 200, marginLeft: "auto",
          }}
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
                  <span style={{
                    fontFamily: "monospace", fontSize: 12,
                    fontWeight: e.isFoKollekicio ? 700 : 400,
                    color: e.isFoKollekicio ? "#1D4ED8" : C.text,
                  }}>
                    {e.key}
                  </span>
                  {e.isFoKollekicio && (
                    <span style={{ marginLeft: 6, fontSize: 10, color: "#64748B", fontWeight: 400 }}>
                      (fo)
                    </span>
                  )}
                </td>
                <td style={S.td}>
                  <span style={{ color: e.tipusNev === "array" ? "#7C3AED" : C.muted }}>
                    {e.tipusNev}
                  </span>
                </td>
                <td style={{ ...S.td, textAlign: "right", fontWeight: e.rekordszam !== null ? 600 : 400 }}>
                  {e.rekordszam !== null ? e.rekordszam : "—"}
                </td>
                <td style={{ ...S.td, textAlign: "right" }}>
                  {parseFloat(e.mereteKb) > 100
                    ? <span style={{ color: "#DC2626", fontWeight: 700 }}>{e.mereteKb}</span>
                    : e.mereteKb
                  }
                </td>
                <td style={{ ...S.td, textAlign: "center" }}>
                  <span style={S.badge(e.isDriveSync)}>
                    {e.isDriveSync ? "igen" : "—"}
                  </span>
                </td>
                <td style={{ ...S.td, textAlign: "center" }}>
                  <span style={S.badge(e.isBackup)}>
                    {e.isBackup ? "igen" : "—"}
                  </span>
                </td>
              </tr>
            ))}
            {szurt.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...S.td, textAlign: "center", color: C.muted, padding: "24px" }}>
                  Nincs talalat a szurore: &quot;{szuro}&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 14, padding: "10px 14px", background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 8, fontSize: 11, color: "#92400E" }}>
        <strong>Drive sync</strong>: kozelito lista a per-service driveSave() hivasok alapjan. Prefixes kulcsok (vbf_*, fotok_* stb.) backup-ban vannak de Drive sync-bol kimaradnak.
      </div>
    </div>
  );
}

// ─── Kapcsolat sor komponens ──────────────────────────────────────────────
function KapcsolatSor({ cimke, van, szoveg, pirosaHa = false }) {
  const hiba = pirosaHa && !van;
  return (
    <div style={S.kapcsolatSor(van)}>
      <span style={{
        marginTop: 2, fontSize: 16, flexShrink: 0,
      }}>
        {hiba ? "🔴" : van ? "🟢" : "⚪"}
      </span>
      <div>
        <span style={{ fontWeight: 700, fontSize: 13, color: hiba ? "#991B1B" : C.text }}>
          {cimke}
        </span>
        {szoveg && (
          <span style={{ fontSize: 12, color: hiba ? "#DC2626" : C.muted, marginLeft: 8 }}>
            {szoveg}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Kapcsolati vizsgalat tab ─────────────────────────────────────────────
function KapcsolatokTab({ projektek }) {
  const [projektId, setProjektId] = useState("");

  const projekt = projektek.find(p => p.id === projektId) || null;

  const ajanlatok    = lsJson("ajanlatok");
  const csomagok     = lsJson("kivitelezesi_csomagok");
  const munkalapok   = lsJson("munkalapok");

  const ajanlatObj   = projekt ? ajanlatok.find(a => a.id === projekt.ajanlatId) : null;
  const kapcs_csom   = projekt ? csomagok.filter(c => c.projektId === projektId) : [];
  const kapcs_ml     = projekt ? munkalapok.filter(
    m => m.projektId === projektId || (projekt.munkalapIds || []).includes(m.id)
  ) : [];

  const vanPillanatkep = projekt
    ? (projekt.elfogadottAjanlatPillanatkep !== null && projekt.elfogadottAjanlatPillanatkep !== undefined)
    : false;

  const vanPenzugyi = projekt
    ? !!(projekt.anyagelszamolasiMod && projekt.anyagelszamolasiMod !== "NINCS_KIVALASZTVA")
    : false;

  return (
    <div style={{ padding: "20px 24px" }}>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>
          Projekt kivalasztasa
        </label>
        <select
          value={projektId}
          onChange={e => setProjektId(e.target.value)}
          style={{
            width: "100%", maxWidth: 480, padding: "9px 12px",
            border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13,
            fontFamily: FONT, outline: "none", background: "#fff",
          }}
        >
          <option value="">— Valassz projektet ({projektek.length} db) —</option>
          {projektek.map(p => (
            <option key={p.id} value={p.id}>
              {p.projektkod || p.id} — {p.status || "?"} — {p.ugyfelNev || "Nincs ügyfél"}
            </option>
          ))}
        </select>
      </div>

      {!projekt && (
        <div style={{ padding: "32px 0", textAlign: "center", color: C.muted, fontSize: 13 }}>
          Valassz ki egy projektet a kapcsolati vizsgalathoz.
        </div>
      )}

      {projekt && (
        <div>
          {/* Projekt alap adatok */}
          <div style={{
            background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "14px 18px", marginBottom: 20,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 10px" }}>
              Projekt alap adatai
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px", fontSize: 12 }}>
              {[
                ["ID", projekt.id],
                ["Projektkod", projekt.projektkod || "—"],
                ["Forras", projekt.forras || projekt.forrás || "—"],
                ["Statusz", projekt.status || "—"],
                ["Letrehozva", projekt.createdAt ? new Date(projekt.createdAt).toLocaleDateString("hu-HU") : "—"],
                ["Frissitve", projekt.updatedAt ? new Date(projekt.updatedAt).toLocaleDateString("hu-HU") : "—"],
                ["Verzio", projekt.version || "—"],
              ].map(([k, v]) => (
                <>
                  <span key={k + "_k"} style={{ fontWeight: 600, color: "#475569" }}>{k}:</span>
                  <span key={k + "_v"} style={{ fontFamily: "monospace", color: C.text, wordBreak: "break-all" }}>{String(v)}</span>
                </>
              ))}
            </div>
          </div>

          {/* Kapcsolati vizsgalat */}
          <div style={{
            background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10,
            padding: "16px 20px", marginBottom: 16,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 4px" }}>
              Kapcsolatok es mezok vizsgalata
            </p>

            <KapcsolatSor
              cimke="Ajanlat ID (ajanlatId)"
              van={!!projekt.ajanlatId}
              szoveg={projekt.ajanlatId
                ? (ajanlatObj ? `Talalt: ${ajanlatObj.ajanlatSzam || projekt.ajanlatId}` : `ID megvan, de az ajanlat nem talalhato: ${projekt.ajanlatId}`)
                : "Nincs beallitva"
              }
              pirosaHa={false}
            />

            <KapcsolatSor
              cimke="Elfogadott ajanlat pillanatkep"
              van={vanPillanatkep}
              szoveg={vanPillanatkep
                ? "Pillanatkep mentve (elfogadottAjanlatPillanatkep)"
                : "null – nincs pillanatkep (regi projekt vagy nem sajat_ajanlat forras)"
              }
              pirosaHa={false}
            />

            <KapcsolatSor
              cimke={`Kivitelezesi csomag (${kapcs_csom.length} db)`}
              van={kapcs_csom.length > 0}
              szoveg={kapcs_csom.length > 0
                ? kapcs_csom.map(c => `${c.id} (${c.statusz || "?"})`).join(", ")
                : "Nem talalhato – ha sajat_ajanlat forras, hiba lehet"
              }
              pirosaHa={(projekt.forras || projekt.forrás) === "sajat_ajanlat"}
            />

            <KapcsolatSor
              cimke={`Munkalapok (${kapcs_ml.length} db)`}
              van={kapcs_ml.length > 0}
              szoveg={kapcs_ml.length > 0
                ? kapcs_ml.map(m => `${m.azonosito || m.id} (${m.status || "?"})`).join(", ")
                : "Nincsenek kapcsolodo munkalapok"
              }
              pirosaHa={false}
            />

            <KapcsolatSor
              cimke="Penzugyi mod (anyagelszamolasiMod)"
              van={vanPenzugyi}
              szoveg={projekt.anyagelszamolasiMod
                ? `${projekt.anyagelszamolasiMod}${projekt.adminReviewRequired ? " — ADMIN REVIEW KELL" : ""}`
                : "Nincs kivalasztva"
              }
              pirosaHa={false}
            />

            <KapcsolatSor
              cimke={`Esemenynaplo (${(projekt.esemenynaplo || []).length} bejegyzes)`}
              van={(projekt.esemenynaplo || []).length > 0}
              szoveg={(projekt.esemenynaplo || []).length > 0
                ? `Utolso: ${projekt.esemenynaplo[projekt.esemenynaplo.length - 1]?.esemeny || "?"}`
                : "Ures esemenynaplo"
              }
              pirosaHa={false}
            />

            <KapcsolatSor
              cimke={`Megjegyzesek (${(projekt.megjegyzesek || []).length} db)`}
              van={(projekt.megjegyzesek || []).length > 0}
              szoveg={null}
              pirosaHa={false}
            />

            <KapcsolatSor
              cimke={`Munkalap ID lista (munkalapIds: ${(projekt.munkalapIds || []).length} db)`}
              van={(projekt.munkalapIds || []).length > 0}
              szoveg={(projekt.munkalapIds || []).length > 0
                ? `Osszekapcsolt IDs: ${(projekt.munkalapIds || []).slice(0, 3).join(", ")}${(projekt.munkalapIds || []).length > 3 ? " ..." : ""}`
                : "Ures tomb"
              }
              pirosaHa={false}
            />
          </div>

          {/* Kivitelezesi csomagok reszletesen */}
          {kapcs_csom.length > 0 && (
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: "14px 18px", marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 10px" }}>
                Kivitelezesi csomagok reszletei
              </p>
              {kapcs_csom.map(cs => (
                <div key={cs.id} style={{ marginBottom: 10, fontSize: 12, color: "#166534" }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{cs.id}</span>
                  {" — "}statusz: <strong>{cs.statusz || "?"}</strong>
                  {" — "}munkatipus: {cs.munkatipus || "?"}
                  {" — "}tételek: {(cs.tetelek || []).length} db
                  {" — "}ar: {cs.veglegesAr ?? cs.osszesAr ?? "?"}
                </div>
              ))}
            </div>
          )}

          {/* Munkalapok reszletesen */}
          {kapcs_ml.length > 0 && (
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "14px 18px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8", textTransform: "uppercase", letterSpacing: 0.7, margin: "0 0 10px" }}>
                Munkalapok reszletei
              </p>
              {kapcs_ml.map(ml => (
                <div key={ml.id} style={{ marginBottom: 8, fontSize: 12, color: "#1E40AF" }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 700 }}>{ml.azonosito || ml.id}</span>
                  {" — "}statusz: <strong>{ml.status || "?"}</strong>
                  {" — "}tipusa: {ml.munkaTipus || "?"}
                  {ml.lezarva ? " — LEZARVA" : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Arva rekordok tab ────────────────────────────────────────────────────
function ArvaRekordokTab() {
  const projektek  = lsJson("projektek");
  const munkalapok = lsJson("munkalapok");
  const csomagok   = lsJson("kivitelezesi_csomagok");

  const projektIds = new Set(projektek.map(p => p.id));

  const arvaMunkalapok = munkalapok.filter(m =>
    !m.projektId || !projektIds.has(m.projektId) || m.torolt || m.archiv
  );

  const arvaCsomagok = csomagok.filter(c =>
    !c.projektId || !projektIds.has(c.projektId)
  );

  const pirosBadge = { display:"inline-block", padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:"#FEE2E2", color:"#991B1B" };
  const zoldBadge  = { display:"inline-block", padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:"#DCFCE7", color:"#166534" };

  const thP = { ...S.th, color:"#991B1B" };
  const trP = { borderBottom:"1px solid #FECACA", background:"#FFF5F5" };

  return (
    <div style={{ padding:"20px 24px" }}>
      <div style={{ display:"flex", gap:12, marginBottom:24, flexWrap:"wrap" }}>
        <span style={arvaMunkalapok.length > 0 ? pirosBadge : zoldBadge}>
          Munkalapok: {arvaMunkalapok.length > 0 ? `${arvaMunkalapok.length} arva` : "OK"}
        </span>
        <span style={arvaCsomagok.length > 0 ? pirosBadge : zoldBadge}>
          Kivi csomagok: {arvaCsomagok.length > 0 ? `${arvaCsomagok.length} arva` : "OK"}
        </span>
      </div>

      {/* Arva munkalapok */}
      <div style={{ marginBottom:28 }}>
        <p style={{ fontSize:11, fontWeight:700, color: arvaMunkalapok.length > 0 ? "#991B1B" : "#166534", textTransform:"uppercase", letterSpacing:0.7, margin:"0 0 10px" }}>
          Árva munkalapok ({arvaMunkalapok.length} db)
        </p>
        {arvaMunkalapok.length === 0 ? (
          <div style={{ padding:"14px 16px", background:"#F0FDF4", border:"1px solid #86EFAC", borderRadius:8, fontSize:12, color:"#166534" }}>
            Nincs árva munkalap — minden munkalaphoz létező projekt tartozik.
          </div>
        ) : (
          <div style={{ overflowX:"auto", border:"1px solid #FECACA", borderRadius:10 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#FEF2F2", borderBottom:"2px solid #FECACA" }}>
                  <th style={thP}>Munkalap ID</th>
                  <th style={thP}>Státusz</th>
                  <th style={thP}>projektId</th>
                  <th style={{ ...thP, textAlign:"center" }}>torolt</th>
                  <th style={{ ...thP, textAlign:"center" }}>archiv</th>
                  <th style={thP}>Gyökérok</th>
                </tr>
              </thead>
              <tbody>
                {arvaMunkalapok.map(m => {
                  const ok = !m.projektId ? "Hiányzó projektId"
                    : !projektIds.has(m.projektId) ? "projektId nem létező projektre mutat"
                    : m.torolt ? "torolt===true"
                    : "archiv===true";
                  return (
                    <tr key={m.id} style={trP}>
                      <td style={{ ...S.td, fontFamily:"monospace", fontWeight:700, color:"#991B1B" }}>{m.id?.slice(-8) || "—"}</td>
                      <td style={S.td}>{m.status || "—"}</td>
                      <td style={{ ...S.td, fontFamily:"monospace", fontSize:11 }}>
                        {m.projektId || <em style={{ color:"#DC2626" }}>HIÁNYZIK</em>}
                      </td>
                      <td style={{ ...S.td, textAlign:"center" }}>{m.torolt ? "🔴 igen" : "—"}</td>
                      <td style={{ ...S.td, textAlign:"center" }}>{m.archiv ? "🔴 igen" : "—"}</td>
                      <td style={{ ...S.td, color:"#DC2626", fontSize:11 }}>{ok}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Arva kivi csomagok */}
      <div>
        <p style={{ fontSize:11, fontWeight:700, color: arvaCsomagok.length > 0 ? "#991B1B" : "#166534", textTransform:"uppercase", letterSpacing:0.7, margin:"0 0 10px" }}>
          Árva kivitelezési csomagok ({arvaCsomagok.length} db)
        </p>
        {arvaCsomagok.length === 0 ? (
          <div style={{ padding:"14px 16px", background:"#F0FDF4", border:"1px solid #86EFAC", borderRadius:8, fontSize:12, color:"#166534" }}>
            Nincs árva kivitelezési csomag.
          </div>
        ) : (
          <div style={{ overflowX:"auto", border:"1px solid #FECACA", borderRadius:10 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#FEF2F2", borderBottom:"2px solid #FECACA" }}>
                  <th style={thP}>Csomag ID</th>
                  <th style={thP}>Státusz</th>
                  <th style={thP}>projektId</th>
                  <th style={thP}>Gyökérok</th>
                </tr>
              </thead>
              <tbody>
                {arvaCsomagok.map(c => {
                  const ok = !c.projektId ? "Hiányzó projektId" : "projektId nem létező projektre mutat";
                  return (
                    <tr key={c.id} style={trP}>
                      <td style={{ ...S.td, fontFamily:"monospace", fontWeight:700, color:"#991B1B" }}>{c.id?.slice(-8) || "—"}</td>
                      <td style={S.td}>{c.statusz || "—"}</td>
                      <td style={{ ...S.td, fontFamily:"monospace", fontSize:11 }}>
                        {c.projektId || <em style={{ color:"#DC2626" }}>HIÁNYZIK</em>}
                      </td>
                      <td style={{ ...S.td, color:"#DC2626", fontSize:11 }}>{ok}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop:20, padding:"10px 14px", background:"#FFFBEB", border:"1px solid #FCD34D", borderRadius:8, fontSize:11, color:"#92400E" }}>
        <strong>Árva rekord</strong>: olyan munkalap vagy csomag, amelynek projektId-je hiányzik, nem létező projektre mutat, vagy torolt/archiv jelölésű. Nem törölhetők innen — a szűrők kizárják őket a számításokból.
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
      padding: "9px 20px", border: "none", cursor: "pointer", fontFamily: FONT,
      fontWeight: aktiv ? 700 : 400, fontSize: 13,
      color: aktiv ? "#1D4ED8" : C.muted,
      background: aktiv ? "#fff" : "transparent",
      borderBottom: aktiv ? "2px solid #2563EB" : "2px solid transparent",
    };
  }

  return (
    <div style={{ fontFamily: FONT, paddingBottom: 40 }}>
      {/* Figyelmeztetés */}
      <div style={{
        margin: "0 24px 20px", marginTop: 20,
        padding: "12px 16px", background: "#FFFBEB",
        border: "2px solid #F59E0B", borderRadius: 10,
        display: "flex", alignItems: "flex-start", gap: 12,
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
        <div>
          <p style={{ fontWeight: 800, fontSize: 13, color: "#92400E", margin: "0 0 3px" }}>
            Fejlesztoi debug nezet – csak olvaso mod
          </p>
          <p style={{ fontSize: 12, color: "#78350F", margin: 0, lineHeight: 1.5 }}>
            Semmilyen adatmodositas, torles, export, import vagy restore nem vegezhetö innen.
            Ez a panel csakis az Admin szerepkornek lathato.
            Az itt megjeleno adatok erzekenyek – kepernyo fotot ne keszits, ne oszd meg!
          </p>
        </div>
      </div>

      {/* Tabok */}
      <div style={{
        borderBottom: `1px solid ${C.border}`, display: "flex", gap: 2,
        background: "#F8FAFC", margin: "0 24px",
      }}>
        <button style={tabGombStil("kulcsok")} onClick={() => setTab("kulcsok")}>
          Összes localStorage kulcs ({snapshot.length})
        </button>
        <button style={tabGombStil("kapcsolatok")} onClick={() => setTab("kapcsolatok")}>
          Kapcsolati vizsgálat
        </button>
        <button style={tabGombStil("arva")} onClick={() => setTab("arva")}>
          Árva rekordok
        </button>
      </div>

      {tab === "kulcsok"     && <KulcsokTab snapshot={snapshot} frissitve={frissitve} />}
      {tab === "kapcsolatok" && <KapcsolatokTab projektek={projektek} />}
      {tab === "arva"        && <ArvaRekordokTab />}
    </div>
  );
}