import { useState } from "react";
import { CheckCircle2, XCircle, Wifi, WifiOff, RefreshCw, AlertTriangle, Loader2, Clock, Shield, HardDrive } from "lucide-react";
import { drivePing, driveAvailable } from "../lib/driveApi";
import { SYNC_COLLECTIONS, getSyncLog, syncAllToDrive } from "../lib/dataSync.service";
import { hasDefaultPasswords } from "../lib/crmUsers";
import { getLocalStorageSizeMB } from "../lib/localDb";
import { C, FONT, FONT_HEADING } from "../lib/constants";

const COLLECTION_LABELS = {
  projektek:             "Projektek",
  munkalapok:            "Munkalapok",
  ugyfelek:              "Ügyfelek",
  beallitasok:           "Beállítások",
  munkatipusok:          "Munkatípusok",
  fovallalkozok:         "Fővállalkozók",
  elszamolasi_szabalyok: "Elszámolási szabályok",
  karteritesek:          "Kártérítések",
  sablonok:              "Sablonok",
  csapatok:              "Csapatok",
  crm_napelem_users:     "CRM Felhasználók",
  szamlak:               "Számlák",
};

export default function DriveStatusPanel() {
  const [pingResult,  setPingResult]  = useState(null);
  const [pingLoading, setPingLoading] = useState(false);
  const [syncResult,  setSyncResult]  = useState(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncLog,     setSyncLog]     = useState(() => getSyncLog());
  const [defaultPw]                   = useState(() => hasDefaultPasswords());
  const [storageMB]                   = useState(() => getLocalStorageSizeMB());

  const available = driveAvailable();
  const storagePercent = Math.min(100, Math.round((storageMB / 5) * 100));

  async function handlePing() {
    setPingLoading(true);
    setPingResult(null);
    const res = await drivePing();
    setPingResult(res);
    setPingLoading(false);
  }

  async function handleSyncAll() {
    setSyncLoading(true);
    setSyncResult(null);
    try {
      const res = await syncAllToDrive();
      setSyncResult(res);
      setSyncLog(getSyncLog());
    } catch (e) {
      setSyncResult({ allOk: false, error: e.message });
    }
    setSyncLoading(false);
  }

  if (!available) {
    return (
      <div style={{ padding: "28px", fontFamily: FONT, maxWidth: 800 }}>
        <div style={{ background: "#FFFBEB", border: "1.5px solid #FCD34D", borderRadius: 12, padding: "16px 20px" }}>
          <p style={{ fontWeight: 700, color: "#92400E", margin: "0 0 6px", fontSize: 15 }}>
            ⚠️ Drive szinkron nem konfigurált
          </p>
          <p style={{ fontSize: 13, color: "#92400E", margin: 0, lineHeight: 1.6 }}>
            A <code>VITE_APPS_SCRIPT_URL</code> környezeti változó nincs beállítva.
            Vercel → Settings → Environment Variables → add VITE_APPS_SCRIPT_URL.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", fontFamily: FONT, maxWidth: 820 }}>
      <h2 style={{ fontFamily: FONT_HEADING, fontSize: 20, fontWeight: 800, color: C.text, margin: "0 0 4px" }}>
        ☁️ Google Drive szinkron állapot
      </h2>
      <p style={{ fontSize: 13, color: C.muted, margin: "0 0 22px" }}>
        Kapcsolat ellenőrzés, kollekciónkénti mentési napló, visszaellenőrzés
      </p>

      {/* ── Alapértelmezett jelszó figyelmeztetés ── */}
      {defaultPw && (
        <div style={{ background: "#FEF2F2", border: "2px solid #F87171", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontWeight: 700, color: "#DC2626", margin: "0 0 4px", fontSize: 14 }}>
              ⛔ Éles teszt előtt kötelező: jelszócsere szükséges!
            </p>
            <p style={{ fontSize: 13, color: "#991B1B", margin: 0, lineHeight: 1.6 }}>
              Egy vagy több felhasználó még az alapértelmezett jelszót használja.
              Menj a <strong>Beállítások → Felhasználók</strong> menübe és változtasd meg az összes jelszót!
            </p>
          </div>
        </div>
      )}

      {/* ── Drive kapcsolat teszt ── */}
      <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "18px 20px", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: pingResult ? 12 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Wifi size={18} color="#0891B2" />
            <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Drive kapcsolat teszt</span>
          </div>
          <button
            onClick={handlePing}
            disabled={pingLoading}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: pingLoading ? "#E2E8F0" : "#0891B2", color: "#fff", border: "none", borderRadius: 9, cursor: pingLoading ? "default" : "pointer", fontWeight: 700, fontSize: 13, fontFamily: FONT }}
          >
            {pingLoading ? <Loader2 size={13} /> : <Wifi size={13} />}
            {pingLoading ? "Tesztelés…" : "Kapcsolat teszt"}
          </button>
        </div>

        {pingResult && (
          <div style={{ padding: "10px 14px", borderRadius: 9, background: pingResult.ok ? "#F0FDF4" : "#FEF2F2", border: `1px solid ${pingResult.ok ? "#86EFAC" : "#FECACA"}`, fontSize: 13, color: pingResult.ok ? "#166534" : "#DC2626", fontWeight: 600 }}>
            {pingResult.ok
              ? `✅ Drive kapcsolat OK – válaszidő: ${pingResult.latencyMs ?? "?"}ms`
              : `❌ Drive kapcsolat HIBA: ${pingResult.error || "Ismeretlen hiba"}`}
          </div>
        )}
      </div>

      {/* ── Kollekciók szinkron naplója ── */}
      <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
        <div style={{ padding: "13px 18px", borderBottom: `1px solid ${C.border}`, background: "#F8FAFC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Kollekciók szinkron naplója</span>
          <span style={{ fontSize: 11, color: C.muted }}>Utolsó szinkron időpontja</span>
        </div>

        {SYNC_COLLECTIONS.map((col, i) => {
          const log        = syncLog[col];
          const lastOk     = log?.ok;
          const lastSuccess = log?.lastSuccess ? new Date(log.lastSuccess).toLocaleString("hu-HU") : null;
          const syncRes    = syncResult?.results?.[col];
          const rowBg      = syncRes?.driveSaved === false ? "#FFF5F5" : undefined;

          return (
            <div key={col} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 18px", borderBottom: i < SYNC_COLLECTIONS.length - 1 ? `1px solid ${C.border}` : "none", background: rowBg }}>
              <div style={{ width: 20, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                {log === undefined
                  ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#CBD5E1" }} />
                  : lastOk
                    ? <CheckCircle2 size={15} color="#22C55E" />
                    : <XCircle size={15} color="#EF4444" />}
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>
                {COLLECTION_LABELS[col] || col}
              </span>
              <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>
                {lastSuccess
                  ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={10} />{lastSuccess}</span>
                  : "Még nem szinkronizált"}
              </span>
              {log?.error && !log.ok && (
                <span style={{ fontSize: 11, color: "#EF4444", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.error}>
                  {log.error}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Mentés és visszaellenőrzés ── */}
      <div style={{ background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: syncResult ? 12 : 0 }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: 15, color: C.text, margin: "0 0 3px" }}>
              Teljes Drive mentés
            </p>
            <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.5 }}>
              Az összes kollekciót menti Drive-ra. A napló frissül mentés után.
            </p>
          </div>
          <button
            onClick={handleSyncAll}
            disabled={syncLoading}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 18px", background: syncLoading ? "#E2E8F0" : "#059669", color: "#fff", border: "none", borderRadius: 10, cursor: syncLoading ? "default" : "pointer", fontWeight: 700, fontSize: 13, fontFamily: FONT, flexShrink: 0 }}
          >
            {syncLoading ? <Loader2 size={14} /> : <RefreshCw size={14} />}
            {syncLoading ? "Szinkronizálás…" : "Összes mentése Drive-ra"}
          </button>
        </div>

        {syncResult && (
          <div>
            <div style={{ padding: "10px 14px", borderRadius: 9, background: syncResult.allOk ? "#F0FDF4" : "#FFFBEB", border: `1px solid ${syncResult.allOk ? "#86EFAC" : "#FCD34D"}`, fontSize: 13, color: syncResult.allOk ? "#166534" : "#92400E", fontWeight: 600 }}>
              {syncResult.allOk
                ? "✅ Összes kollekció sikeresen mentve Google Drive-ra"
                : "⚠️ Egy vagy több kollekció mentése sikertelen – ellenőrizd a kapcsolatot"}
            </div>

            {syncResult.results && !syncResult.allOk && (
              <div style={{ marginTop: 10 }}>
                {Object.entries(syncResult.results)
                  .filter(([, r]) => !r.driveSaved)
                  .map(([col, r]) => (
                    <div key={col} style={{ fontSize: 12, color: "#DC2626", padding: "3px 0", display: "flex", gap: 8 }}>
                      <XCircle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span><strong>{COLLECTION_LABELS[col] || col}:</strong> {r.driveError || "Ismeretlen hiba"}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── localStorage tárhely ── */}
      <div style={{ background: "#fff", border: `1.5px solid ${storagePercent >= 80 ? "#FCD34D" : C.border}`, borderRadius: 14, padding: "16px 20px", marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <HardDrive size={16} color={storagePercent >= 80 ? "#D97706" : "#64748B"} />
          <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>Helyi tárhely (localStorage)</span>
          <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: storagePercent >= 80 ? "#D97706" : C.muted }}>
            {storageMB} MB / ~5 MB ({storagePercent}%)
          </span>
        </div>
        <div style={{ height: 8, background: "#F1F5F9", borderRadius: 6, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${storagePercent}%`, background: storagePercent >= 80 ? "#F59E0B" : storagePercent >= 60 ? "#3B82F6" : "#22C55E", borderRadius: 6, transition: "width 0.4s" }} />
        </div>
        {storagePercent >= 80 && (
          <p style={{ fontSize: 12, color: "#D97706", margin: "8px 0 0", fontWeight: 600 }}>
            ⚠️ A tárhely {storagePercent}%-a tele van — végezz Drive mentést és tisztítsd meg a régi adatokat!
          </p>
        )}
      </div>

      {/* ── Info szöveg ── */}
      <div style={{ marginTop: 16, padding: "12px 16px", background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 12 }}>
        <p style={{ fontSize: 12, color: C.muted, margin: 0, lineHeight: 1.7 }}>
          <strong>Visszaolvasásos ellenőrzés (verified):</strong> A Biztonsági mentések → „Mentés most" gombnál érhető el.
          Menti az adatot Drive-ra, majd visszaolvassa és összehasonlítja – csak akkor jelez sikerest, ha az adatok egyeznek.
        </p>
      </div>
    </div>
  );
}
