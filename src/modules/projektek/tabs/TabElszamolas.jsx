import { useState, useEffect, useCallback } from "react";
import { Save, RefreshCw, AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { C, FONT } from "../../../lib/constants.js";
import { ft } from "../../../lib/helpers.js";
import {
  ELSZAMOLAS_STATUSZOK, SZAMLAZAS_STATUSZOK, TIG_STATUSZOK,
  getElszamolasConfig, getSzamlazasConfig, getTigConfig,
  ellenorzSzamlazhatosagas, ellenorzLezarhatosagas,
} from "../../../lib/penzugyiRules.js";
import { getPenzugyi, upsertPenzugyi, autoElszamolasElokeszites } from "../../penzugy/penzugyi.service.js";
import { PENZUGYI_SCHEMA } from "../../penzugy/penzugyi.schema.js";

// ─── Státuszpill választó ─────────────────────────────────────

function StatusPills({ label, items, value, onChange, disabled }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: .7, margin: "0 0 8px" }}>
        {label}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {items.map(s => {
          const active = value === s.id;
          return (
            <button key={s.id} type="button"
              disabled={disabled}
              onClick={() => !disabled && onChange(s.id)}
              style={{
                padding: "5px 14px", borderRadius: 20, border: `2px solid ${active ? s.szin : "transparent"}`,
                background: active ? s.bg : "#F1F5F9",
                color: active ? s.szin : "#64748B",
                fontWeight: active ? 700 : 500, fontSize: 12, cursor: disabled ? "default" : "pointer",
                fontFamily: FONT, transition: "all .12s",
                opacity: disabled && !active ? 0.5 : 1,
              }}>
              {s.id}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Összegező sor ────────────────────────────────────────────

function OsszesSor({ label, value, color, big, border }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: big ? "10px 0" : "7px 0",
      borderTop: border ? `2px solid ${color}50` : "1px solid #F1F5F9",
    }}>
      <span style={{ fontSize: big ? 14 : 12, color: "#475569", fontWeight: big ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: big ? 16 : 13, fontWeight: big ? 800 : 600, color }}>{ft(value)}</span>
    </div>
  );
}

// ─── Szerkeszthető költség sor ────────────────────────────────

function KoltsegSor({ label, value, onChange, disabled }) {
  const [edit, setEdit] = useState(false);
  const [val, setVal]   = useState(value);

  useEffect(() => { setVal(value); }, [value]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #F8FAFC" }}>
      <span style={{ fontSize: 12, color: "#374151", flex: 1 }}>{label}</span>
      {edit && !disabled ? (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="number" value={val} onChange={e => setVal(Number(e.target.value))}
            style={{ width: 110, padding: "4px 8px", border: "1.5px solid #2563EB", borderRadius: 6, fontSize: 13, fontFamily: FONT }} />
          <button onClick={() => { onChange(val); setEdit(false); }}
            style={{ padding: "3px 8px", background: "#059669", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>✓</button>
          <button onClick={() => { setVal(value); setEdit(false); }}
            style={{ padding: "3px 8px", background: "#F1F5F9", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12 }}>✕</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: value > 0 ? "#DC2626" : "#94A3B8" }}>{ft(value)}</span>
          {!disabled && (
            <button onClick={() => setEdit(true)}
              style={{ padding: "2px 7px", background: "#EFF6FF", color: "#2563EB", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 11 }}>
              Szerk.
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Fő Tab ───────────────────────────────────────────────────

export default function TabElszamolas({ projekt, munkalapok, currentUser }) {
  const isAdmin = ["Admin", "Projektmenedzser"].includes(currentUser?.role);
  const projektMunkalapok = (munkalapok || []).filter(
    m => m.projektId === projekt.id || (projekt.munkalapIds || []).includes(m.id)
  );

  const [rec, setRec] = useState(() => getPenzugyi(projekt.id) || { ...PENZUGYI_SCHEMA, projektId: projekt.id, projektForras: projekt.forrás });
  const [mentve, setMentve] = useState(false);
  const [hiba, setHiba]     = useState("");

  function reload() {
    const fresh = getPenzugyi(projekt.id);
    if (fresh) setRec(fresh);
  }

  useEffect(() => {
    reload();
    const handler = (e) => {
      if (!e.detail?.collection || e.detail.collection === "penzugyi") reload();
    };
    window.addEventListener("crm-db-updated", handler);
    return () => window.removeEventListener("crm-db-updated", handler);
  }, [projekt.id]);

  function updRec(field, value) {
    setRec(prev => ({ ...prev, [field]: value }));
    setMentve(false);
  }

  function updKoltseg(field, value) {
    setRec(prev => {
      const next = { ...prev, [field]: value };
      const ossz =
        (next.anyagKoltsegNetto        || 0) +
        (next.sajatCsapatKoltsegNetto  || 0) +
        (next.alvallalkozoKoltsegNetto || 0) +
        (next.kiszallasKoltsegNetto    || 0) +
        (next.emeloKoltsegNetto        || 0) +
        (next.egyebKoltsegNetto        || 0);
      return { ...next, osszesKoltsegNetto: ossz };
    });
    setMentve(false);
  }

  function handleAutoElokeszites() {
    const result = autoElszamolasElokeszites(projekt.id, projektMunkalapok, currentUser?.name || "admin");
    if (result) {
      setRec(result);
      setMentve(false);
    }
  }

  function handleMentes() {
    if (projekt.forrás === "belso_munka" && rec.szamlazasStatusz !== "Nem számlázható") {
      setHiba("Belső munka számlázási státusza nem változtatható.");
      return;
    }
    const saved = upsertPenzugyi({ ...rec, projektId: projekt.id }, currentUser?.name || "");
    setRec(saved);
    setMentve(true);
    setHiba("");
    setTimeout(() => setMentve(false), 3000);
  }

  // Kapuellenőrzések
  const szamlazhatosag = ellenorzSzamlazhatosagas(projekt, projektMunkalapok, rec);
  const lezarhatosag   = ellenorzLezarhatosagas(projekt, rec);

  const isBelso = projekt.forrás === "belso_munka";
  const profit  = rec.bevetelNetto - rec.osszesKoltsegNetto;
  const profitPct = rec.bevetelNetto > 0 ? Math.round((profit / rec.bevetelNetto) * 100) : null;

  const elszamolasOk = getElszamolasConfig(rec.elszamolasStatusz);
  const szamlazasOk  = getSzamlazasConfig(rec.szamlazasStatusz);
  const tigOk        = getTigConfig(rec.tigStatusz);

  const inp = {
    width: "100%", boxSizing: "border-box", padding: "8px 12px",
    border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13,
    fontFamily: FONT, outline: "none", background: isAdmin ? "#fff" : "#F8FAFC",
  };

  return (
    <div style={{ paddingTop: 16, fontFamily: FONT }}>

      {/* Belső munka figyelmeztetés */}
      {isBelso && (
        <div style={{ background: "#ECFDF5", border: "1.5px solid #86EFAC", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 13, color: "#166534", fontWeight: 600 }}>
          🏢 Belső munka – nincs bevétel, csak költségkövetés. Számlázható státuszba soha nem kerülhet.
        </div>
      )}

      {/* Státuszgépek */}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", margin: "0 0 14px" }}>Státuszok</p>

        <StatusPills
          label="Elszámolás"
          items={ELSZAMOLAS_STATUSZOK}
          value={rec.elszamolasStatusz}
          onChange={v => updRec("elszamolasStatusz", v)}
          disabled={!isAdmin}
        />
        <StatusPills
          label="Számlázás"
          items={isBelso ? SZAMLAZAS_STATUSZOK.filter(s => s.id === "Nem számlázható") : SZAMLAZAS_STATUSZOK}
          value={rec.szamlazasStatusz}
          onChange={v => updRec("szamlazasStatusz", v)}
          disabled={!isAdmin || isBelso}
        />
        <StatusPills
          label="TIG"
          items={TIG_STATUSZOK}
          value={rec.tigStatusz}
          onChange={v => updRec("tigStatusz", v)}
          disabled={!isAdmin}
        />

        {/* Megjegyzések */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 4 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", margin: "0 0 4px" }}>Elszámolás megjegyzés</p>
            <textarea rows={2} value={rec.elszamolasNotes} disabled={!isAdmin}
              onChange={e => updRec("elszamolasNotes", e.target.value)}
              style={{ ...inp, resize: "vertical" }} />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", margin: "0 0 4px" }}>TIG megjegyzés</p>
            <textarea rows={2} value={rec.tigNotes} disabled={!isAdmin}
              onChange={e => updRec("tigNotes", e.target.value)}
              style={{ ...inp, resize: "vertical" }} />
          </div>
        </div>
      </div>

      {/* Pénzügyi összefoglaló */}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", margin: 0 }}>
            {isBelso ? "Költségkövetés" : "Pénzügyi összesítő"}
          </p>
          {isAdmin && (
            <button onClick={handleAutoElokeszites}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: FONT }}>
              <RefreshCw size={12} /> Automatikus feltöltés
            </button>
          )}
        </div>

        {/* Bevétel (csak sajat/fov) */}
        {!isBelso && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", margin: "0 0 4px" }}>
              Nettó bevétel (Ft)
              {projekt.forrás === "sajat_ajanlat" ? " – elfogadott ajánlat alapján" : " – fővállalkozói elszámolás"}
            </p>
            <input type="number" value={rec.bevetelNetto} disabled={!isAdmin}
              onChange={e => updRec("bevetelNetto", Number(e.target.value))}
              style={inp} />
          </div>
        )}

        {/* Költségek */}
        <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: .6, margin: "10px 0 6px" }}>Költségek (nettó)</p>
        <KoltsegSor label="Anyagköltség"          value={rec.anyagKoltsegNetto}        onChange={v => updKoltseg("anyagKoltsegNetto", v)}        disabled={!isAdmin} />
        <KoltsegSor label="Saját csapat munkadíja" value={rec.sajatCsapatKoltsegNetto}  onChange={v => updKoltseg("sajatCsapatKoltsegNetto", v)}  disabled={!isAdmin} />
        <KoltsegSor label="Alvállalkozói díj"      value={rec.alvallalkozoKoltsegNetto} onChange={v => updKoltseg("alvallalkozoKoltsegNetto", v)} disabled={!isAdmin} />
        <KoltsegSor label="Kiszállás / km-díj"     value={rec.kiszallasKoltsegNetto}    onChange={v => updKoltseg("kiszallasKoltsegNetto", v)}    disabled={!isAdmin} />
        <KoltsegSor label="Emelőgép / daru"        value={rec.emeloKoltsegNetto}        onChange={v => updKoltseg("emeloKoltsegNetto", v)}        disabled={!isAdmin} />
        <KoltsegSor label="Egyéb"                  value={rec.egyebKoltsegNetto}        onChange={v => updKoltseg("egyebKoltsegNetto", v)}        disabled={!isAdmin} />

        <div style={{ marginTop: 8 }}>
          <OsszesSor label="Összes költség" value={rec.osszesKoltsegNetto} color="#DC2626" border />
          {!isBelso && <>
            <OsszesSor label="Nettó bevétel"  value={rec.bevetelNetto}       color="#059669" />
            <OsszesSor
              label={`Profit (fedezet${profitPct !== null ? ` ${profitPct}%` : ""})`}
              value={profit}
              color={profit >= 0 ? "#059669" : "#DC2626"}
              big border
            />
          </>}
        </div>
      </div>

      {/* Kapuellenőrzések */}
      {isAdmin && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          {/* Számlázható gate */}
          <div style={{ background: szamlazhatosag.ok ? "#ECFDF5" : "#FEF2F2", border: `1.5px solid ${szamlazhatosag.ok ? "#86EFAC" : "#FECACA"}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: szamlazhatosag.ok ? 0 : 8 }}>
              {szamlazhatosag.ok
                ? <CheckCircle2 size={15} color="#059669" />
                : <Lock size={15} color="#DC2626" />}
              <span style={{ fontWeight: 700, fontSize: 12, color: szamlazhatosag.ok ? "#166534" : "#991B1B" }}>
                Számlázható kapuk {szamlazhatosag.ok ? "✓" : "— zárva"}
              </span>
            </div>
            {!szamlazhatosag.ok && (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {szamlazhatosag.problems.map((p, i) => (
                  <li key={i} style={{ fontSize: 11, color: "#B91C1C", lineHeight: 1.6 }}>{p}</li>
                ))}
              </ul>
            )}
          </div>

          {/* Lezárt gate */}
          <div style={{ background: lezarhatosag.ok ? "#ECFDF5" : "#FFFBEB", border: `1.5px solid ${lezarhatosag.ok ? "#86EFAC" : "#FDE68A"}`, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: lezarhatosag.ok ? 0 : 8 }}>
              {lezarhatosag.ok
                ? <CheckCircle2 size={15} color="#059669" />
                : <AlertTriangle size={15} color="#D97706" />}
              <span style={{ fontWeight: 700, fontSize: 12, color: lezarhatosag.ok ? "#166534" : "#92400E" }}>
                Lezárási kapuk {lezarhatosag.ok ? "✓" : "— figyelem"}
              </span>
            </div>
            {!lezarhatosag.ok && (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {lezarhatosag.problems.map((p, i) => (
                  <li key={i} style={{ fontSize: 11, color: "#B45309", lineHeight: 1.6 }}>{p}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Mentés */}
      {isAdmin && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={handleMentes}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 22px", background: C.primary, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>
            <Save size={15} /> Mentés
          </button>
          {mentve && (
            <span style={{ fontSize: 13, color: "#059669", fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
              <CheckCircle2 size={14} /> Mentve
            </span>
          )}
          {hiba && (
            <span style={{ fontSize: 13, color: "#DC2626", fontWeight: 600 }}>{hiba}</span>
          )}
        </div>
      )}
      {!isAdmin && (
        <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>
          Csak Admin és Projektmenedzser szerkesztheti az elszámolási adatokat.
        </p>
      )}
    </div>
  );
}
