import { useState, useEffect } from "react";
import {
  Plus, Search, Download, RefreshCw, Printer,
  TrendingUp, TrendingDown, Clock, AlertCircle, CheckCircle2, Pencil, Trash2,
} from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../lib/constants";
import { loadLocal } from "../../lib/localDb";
import {
  loadSzamlak, deleteSzamla, updateSzamla, getSzamlaOsszesito, szurSzamlak, createSzamla,
} from "./szamla.service";
import { getStatusConfig, isKesedelmes, SZAMLA_STATUSZOK_KIMENO, SZAMLA_STATUSZOK_BEJOVO } from "./szamla.schema";
import { peaseConfigured, peaseSzamlaImport } from "./pease.api";
import { printSzamla, printSzamlaRiport } from "./SzamlaPdfSablon";
import SzamlaForm from "./SzamlaForm";

function ft(n) {
  return new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(n || 0);
}

function OsszCard({ cim, ertek, szin, ikon }) {
  return (
    <div style={{
      background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "14px 18px", flex: 1, minWidth: 140,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {ikon}
        <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7 }}>
          {cim}
        </span>
      </div>
      <p style={{ fontSize: 18, fontWeight: 800, color: szin || "#0F172A", margin: 0 }}>{ertek}</p>
    </div>
  );
}

export default function SzamlakPage({ currentUser }) {
  const [szamlak, setSzamlak]   = useState([]);
  const [tipus, setTipus]       = useState("kimeno");   // "kimeno" | "bejovo"
  const [statusSzuro, setStatusSzuro] = useState("");
  const [q, setQ]               = useState("");
  const [from, setFrom]         = useState("");
  const [to, setTo]             = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editSzamla, setEditSzamla] = useState(null);
  const [torlesId, setTorlesId] = useState(null);
  const [peaseSync, setPeaseSync] = useState({ loading: false, msg: "" });
  const [importLista, setImportLista] = useState(null);   // PEASE import preview

  const beallitasok = loadLocal("beallitasok") || {};

  function reload() {
    const list = loadSzamlak();
    // késedelmes státusz auto-frissítés
    list.forEach(s => {
      if (isKesedelmes(s) && s.status !== "Késedelmes" && s.status !== "Fizetve" && s.status !== "Sztornózva") {
        updateSzamla(s.id, { status: "Késedelmes" });
      }
    });
    setSzamlak(loadSzamlak());
  }

  useEffect(() => {
    reload();
    const h = () => reload();
    window.addEventListener("crm-db-updated", h);
    return () => window.removeEventListener("crm-db-updated", h);
  }, []);

  const szurt = szurSzamlak(szamlak, { tipus, status: statusSzuro, from, to, q });
  const ossz  = getSzamlaOsszesito(szamlak);
  const isPM  = ["Admin", "Projektmenedzser", "Iroda/Könyvelés"].includes(currentUser?.role);

  const statusLista = tipus === "bejovo" ? SZAMLA_STATUSZOK_BEJOVO : SZAMLA_STATUSZOK_KIMENO;

  async function handlePeaseSync() {
    setPeaseSync({ loading: true, msg: "PEASE lekérdezés…" });
    try {
      const res = await peaseSzamlaImport({ from: from || undefined, to: to || undefined });
      if (!res.ok) {
        setPeaseSync({ loading: false, msg: res.reason || res.error || "Hiba" });
        return;
      }
      // Megmutatjuk az import előnézetet
      setImportLista(res.szamlak);
      setPeaseSync({ loading: false, msg: `${res.db} számla betöltve – jóváhagyás szükséges` });
    } catch (e) {
      setPeaseSync({ loading: false, msg: "PEASE kapcsolat hiba: " + e.message });
    }
    setTimeout(() => setPeaseSync(p => ({ ...p, msg: "" })), 5000);
  }

  function handleImportJovahagyvas(szamlaObj) {
    const existing = szamlak.find(s => s.peaseId && s.peaseId === szamlaObj.peaseId);
    if (existing) return;
    createSzamla(szamlaObj, "PEASE import");
    reload();
  }

  const canEdit = isPM;

  return (
    <div style={{ padding: "24px 28px", fontFamily: FONT }}>

      {/* Fejléc */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 24, fontWeight: 800, color: "#0F172A", margin: "0 0 4px" }}>
            🧾 Számlák
          </h1>
          <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
            {szamlak.filter(s => s.tipus === "kimeno").length} kimenő ·{" "}
            {szamlak.filter(s => s.tipus === "bejovo").length} bejövő ·{" "}
            {szamlak.filter(s => isKesedelmes(s)).length > 0 && (
              <span style={{ color: "#DC2626", fontWeight: 700 }}>
                {szamlak.filter(s => isKesedelmes(s)).length} késedelmes!
              </span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => printSzamlaRiport(szurt, {
              from, to, cim: "Számlák összesítő riport",
            })}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: 9, border: "1.5px solid #E2E8F0",
              background: "#F1F5F9", color: "#475569", cursor: "pointer",
              fontWeight: 600, fontSize: 13, fontFamily: FONT,
            }}
          >
            <Printer size={14} /> PDF riport
          </button>
          {peaseConfigured() && (
            <button
              onClick={handlePeaseSync}
              disabled={peaseSync.loading}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "9px 14px", borderRadius: 9, border: "1.5px solid #6366F1",
                background: "#EEF2FF", color: "#4338CA", cursor: "pointer",
                fontWeight: 700, fontSize: 13, fontFamily: FONT,
              }}
            >
              {peaseSync.loading
                ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
                : <RefreshCw size={14} />
              }
              PEASE szinkron
            </button>
          )}
          {canEdit && (
            <button
              onClick={() => { setEditSzamla(null); setFormOpen(true); }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "9px 18px", borderRadius: 10, border: "none",
                background: "#2563EB", color: "#fff", cursor: "pointer",
                fontWeight: 700, fontSize: 14, fontFamily: FONT,
              }}
            >
              <Plus size={15} /> Új számla
            </button>
          )}
        </div>
      </div>

      {/* PEASE szinkron üzenet */}
      {peaseSync.msg && (
        <div style={{ background: "#EEF2FF", border: "1.5px solid #C7D2FE", borderRadius: 10,
          padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#4338CA", fontWeight: 600 }}>
          🔄 {peaseSync.msg}
        </div>
      )}

      {/* Összesítő kártyák */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <OsszCard cim="Kimenő – összes"  ertek={ft(ossz.kimenoOssz)}    szin="#2563EB" ikon={<TrendingUp size={16} color="#2563EB"/>} />
        <OsszCard cim="Kimenő – befizetve" ertek={ft(ossz.kimenoFizetve)} szin="#059669" ikon={<CheckCircle2 size={16} color="#059669"/>} />
        <OsszCard cim="Kimenő – nyitott"  ertek={ft(ossz.kimenoNyitott)} szin={ossz.kimenoNyitott > 0 ? "#D97706" : "#059669"} ikon={<Clock size={16} color="#D97706"/>} />
        {ossz.kimenoKeses > 0 && (
          <OsszCard cim="Késedelmes"  ertek={`${ossz.kimenoKeses} db`} szin="#DC2626" ikon={<AlertCircle size={16} color="#DC2626"/>} />
        )}
        <OsszCard cim="Bejövő – összes"  ertek={ft(ossz.bejovOssz)}    szin="#7C3AED" ikon={<TrendingDown size={16} color="#7C3AED"/>} />
        <OsszCard cim="Bejövő – nyitott" ertek={ft(ossz.bejovNyitott)} szin={ossz.bejovNyitott > 0 ? "#D97706" : "#059669"} ikon={<Clock size={16} color="#D97706"/>} />
      </div>

      {/* Szűrők */}
      <div style={{
        background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12,
        padding: "14px 16px", marginBottom: 16,
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
      }}>
        {/* Típus tab */}
        <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 8, padding: 3, gap: 2 }}>
          {[["kimeno", "📤 Kimenő"], ["bejovo", "📥 Bejövő"]].map(([t, label]) => (
            <button key={t} onClick={() => { setTipus(t); setStatusSzuro(""); }} style={{
              padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
              fontFamily: FONT, fontWeight: 600, fontSize: 13,
              background: tipus === t ? "#fff" : "transparent",
              color: tipus === t ? "#0F172A" : "#64748B",
              boxShadow: tipus === t ? "0 1px 4px rgba(0,0,0,.1)" : "none",
            }}>
              {label}
            </button>
          ))}
        </div>

        {/* Státusz szűrő */}
        <select value={statusSzuro} onChange={e => setStatusSzuro(e.target.value)} style={{
          padding: "7px 12px", borderRadius: 9, border: "1.5px solid #E2E8F0",
          fontSize: 13, fontFamily: FONT, outline: "none", background: "#fff",
        }}>
          <option value="">Minden státusz</option>
          {statusLista.map(s => <option key={s.id}>{s.id}</option>)}
        </select>

        {/* Időszak */}
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{
          padding: "7px 10px", borderRadius: 9, border: "1.5px solid #E2E8F0", fontSize: 13, fontFamily: FONT, outline: "none",
        }} title="Kezdő dátum" />
        <span style={{ color: "#94A3B8", fontSize: 13 }}>–</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{
          padding: "7px 10px", borderRadius: 9, border: "1.5px solid #E2E8F0", fontSize: 13, fontFamily: FONT, outline: "none",
        }} title="Záró dátum" />

        {/* Keresés */}
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <Search size={14} color="#94A3B8" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Számlaszám, ügyfél, projekt…"
            style={{
              width: "100%", padding: "7px 12px 7px 30px", borderRadius: 9,
              border: "1.5px solid #E2E8F0", fontSize: 13, fontFamily: FONT, outline: "none",
            }} />
        </div>

        <span style={{ fontSize: 12, color: "#94A3B8", whiteSpace: "nowrap" }}>
          {szurt.length} találat
        </span>
      </div>

      {/* PEASE import előnézet */}
      {importLista && (
        <div style={{ background: "#EEF2FF", border: "1.5px solid #C7D2FE", borderRadius: 12,
          padding: "16px", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: "#4338CA", margin: 0 }}>
              📥 PEASE import – {importLista.length} számla importálható
            </p>
            <button onClick={() => setImportLista(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "#64748B" }}>
              ✕
            </button>
          </div>
          {importLista.slice(0, 5).map((s, i) => (
            <div key={i} style={{ background: "#fff", borderRadius: 9, padding: "10px 14px",
              marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{s.szamlaszam || s.peaseId}</p>
                <p style={{ fontSize: 11, color: "#64748B", margin: "2px 0 0" }}>
                  {s.ugyfelNev} · {s.kiallitasDatuma} · {new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(s.bruttoOsszeg || 0)}
                </p>
              </div>
              <button onClick={() => handleImportJovahagyvas(s)} style={{
                padding: "6px 14px", borderRadius: 8, border: "none",
                background: szamlak.find(x => x.peaseId === s.peaseId) ? "#F1F5F9" : "#2563EB",
                color: szamlak.find(x => x.peaseId === s.peaseId) ? "#94A3B8" : "#fff",
                cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: FONT,
              }}>
                {szamlak.find(x => x.peaseId === s.peaseId) ? "✓ Importálva" : "Importálás"}
              </button>
            </div>
          ))}
          {importLista.length > 5 && (
            <p style={{ fontSize: 12, color: "#6366F1", textAlign: "center", marginTop: 8 }}>
              + {importLista.length - 5} további számla
            </p>
          )}
        </div>
      )}

      {/* Táblázat */}
      {szurt.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#94A3B8" }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>🧾</p>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Nincs számla</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>
            {szamlak.length === 0 ? "Adj hozzá egy új számlát a + gombbal." : "Nincs találat a szűrőkre."}
          </p>
        </div>
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Számlaszám", "Partner", "Projekt", "Kiállítva", "Határidő", "Státusz", "Bruttó", ""].map(h => (
                  <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 11,
                    fontWeight: 700, color: "#64748B", textTransform: "uppercase",
                    letterSpacing: 0.5, borderBottom: `1px solid ${C.border}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {szurt
                .sort((a, b) => (b.kiallitasDatuma || "").localeCompare(a.kiallitasDatuma || ""))
                .map(s => {
                  const stCfg  = getStatusConfig(s.status, s.tipus);
                  const keses  = isKesedelmes(s);
                  const partner = s.tipus === "bejovo" ? s.szallitoNev : s.ugyfelNev;

                  return (
                    <tr key={s.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "11px 14px" }}>
                        <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{s.szamlaszam || "—"}</p>
                        {s.peaseSzinkron && (
                          <span style={{ fontSize: 10, color: "#6366F1" }}>PEASE</span>
                        )}
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 13, color: "#0F172A" }}>
                        {partner || "—"}
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#64748B" }}>
                        {s.projektKod || "—"}
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 12, color: "#64748B" }}>
                        {s.kiallitasDatuma || "—"}
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: 12,
                        color: keses ? "#DC2626" : "#64748B",
                        fontWeight: keses ? 700 : 400 }}>
                        {s.fizetesiHatarido || "—"}
                        {keses && " ⚠️"}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{
                          background: stCfg.bg, color: stCfg.szin,
                          borderRadius: 20, padding: "3px 10px",
                          fontSize: 11, fontWeight: 700,
                        }}>
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: "11px 14px", fontWeight: 700, fontSize: 13, color: "#0F172A" }}>
                        {new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(s.bruttoOsszeg || 0)}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            onClick={() => printSzamla(s, beallitasok)}
                            title="PDF nyomtatás"
                            style={{ border: "none", background: "#F1F5F9", borderRadius: 7, padding: "6px 8px", cursor: "pointer" }}
                          >
                            <Printer size={13} color="#475569" />
                          </button>
                          {canEdit && (
                            <>
                              <button onClick={() => { setEditSzamla(s); setFormOpen(true); }}
                                title="Szerkesztés"
                                style={{ border: "none", background: "#EFF6FF", borderRadius: 7, padding: "6px 8px", cursor: "pointer" }}>
                                <Pencil size={13} color="#2563EB" />
                              </button>
                              <button onClick={() => setTorlesId(s.id)}
                                title="Törlés"
                                style={{ border: "none", background: "#FEF2F2", borderRadius: 7, padding: "6px 8px", cursor: "pointer" }}>
                                <Trash2 size={13} color="#DC2626" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {/* Törlés megerősítés */}
      {torlesId && (
        <div onClick={() => setTorlesId(null)} style={{
          position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "#fff", borderRadius: 14, padding: "24px 28px", maxWidth: 380,
            boxShadow: "0 20px 60px rgba(0,0,0,.25)", fontFamily: FONT,
          }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>🗑️ Számla törlése</p>
            <p style={{ fontSize: 14, color: "#64748B", marginBottom: 20 }}>
              Biztosan törlöd? Ez a művelet nem visszavonható.
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setTorlesId(null)} style={{
                padding: "9px 18px", borderRadius: 9, border: "1.5px solid #E2E8F0",
                background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT,
              }}>Mégsem</button>
              <button onClick={() => { deleteSzamla(torlesId); setTorlesId(null); }} style={{
                padding: "9px 18px", borderRadius: 9, border: "none",
                background: "#DC2626", color: "#fff", cursor: "pointer",
                fontWeight: 700, fontSize: 13, fontFamily: FONT,
              }}>Törlés</button>
            </div>
          </div>
        </div>
      )}

      {/* Számla form modal */}
      {formOpen && (
        <SzamlaForm
          szamla={editSzamla}
          currentUser={currentUser}
          onClose={() => { setFormOpen(false); setEditSzamla(null); }}
          onSaved={() => { reload(); setFormOpen(false); setEditSzamla(null); }}
        />
      )}
    </div>
  );
}
