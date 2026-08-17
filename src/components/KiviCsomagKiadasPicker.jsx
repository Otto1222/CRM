/**
 * KiviCsomagKiadasPicker.jsx
 * "Mit vigyen a csapat?" – munkakiosztáskor (Új munkalap létrehozásakor) a
 * projekt Kivitelezési Csomagjának MÁR MEGADOTT tételes anyaglistájából
 * választható ki, mennyit visz az adott csapat.
 *
 * Fontos: ez NEM az anyagtörzsből választ (ld. AnyagKosarPicker, amit a
 * Kivitelezési Csomag fülön a tételes lista összeállítására használunk) –
 * a munka kiosztása mindig a projekthez már felvitt, kész anyaglistával
 * együtt történik, nem itt vesz fel új anyagfajtát a PM.
 */
import { useMemo, useState } from "react";
import { Plus, Minus, Trash2, Search } from "lucide-react";
import { C, FONT } from "../lib/constants";

export default function KiviCsomagKiadasPicker({ tetelek, value, onChange }) {
  const [kereses, setKereses] = useState("");
  const kosar = value || [];
  const lista = tetelek || [];

  const szurt = useMemo(() => {
    const q = kereses.trim().toLowerCase();
    if (!q) return lista;
    return lista.filter(t =>
      t.nev?.toLowerCase().includes(q) ||
      t.kategoria?.toLowerCase().includes(q)
    );
  }, [lista, kereses]);

  const csoportok = useMemo(() => {
    const map = new Map();
    for (const t of szurt) {
      const kat = t.kategoria || "Egyéb";
      if (!map.has(kat)) map.set(kat, []);
      map.get(kat).push(t);
    }
    return Array.from(map.entries())
      .map(([kat, tetelek]) => ({ kat, tetelek }))
      .sort((a, b) => a.kat.localeCompare(b.kat, "hu"));
  }, [szurt]);

  function mar(tetelId) {
    return (lista.find(t => t.id === tetelId)?.munkalapKiadas || [])
      .reduce((s, k) => s + (Number(k.menny) || 0), 0);
  }

  function addTetel(t) {
    const meglevo = kosar.find(k => k.tetelId === t.id);
    if (meglevo) {
      onChange(kosar.map(k => k.tetelId === t.id ? { ...k, mennyiseg: k.mennyiseg + 1 } : k));
      return;
    }
    onChange([...kosar, {
      tetelId:      t.id,
      anyagtorzsId: t.anyagtorzs_id,
      nev:          t.nev,
      kategoria:    t.kategoria || "",
      egyseg:       t.egyseg || "db",
      mennyiseg:    1,
    }]);
  }

  function updMennyiseg(tetelId, mennyiseg) {
    const m = Math.max(0, Number(mennyiseg) || 0);
    onChange(kosar.map(k => k.tetelId === tetelId ? { ...k, mennyiseg: m } : k));
  }

  function removeTetel(tetelId) {
    onChange(kosar.filter(k => k.tetelId !== tetelId));
  }

  if (lista.length === 0) {
    return (
      <div style={{ background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
          Ehhez a projekthez még nincs megadva a tételes anyaglista. Vedd fel a{" "}
          <b>Kivitelezési Csomag</b> fülön, utána itt kiosztható lesz a csapatnak, mit vigyen.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <Search size={14} color={C.muted} style={{ position: "absolute", left: 10, top: 10 }} />
        <input
          value={kereses}
          onChange={e => setKereses(e.target.value)}
          placeholder="Keresés a projekt anyaglistájában…"
          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px 8px 32px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: FONT, outline: "none" }}
        />
      </div>

      <div style={{ maxHeight: 240, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 9, marginBottom: 12 }}>
        {csoportok.length === 0 && (
          <p style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: 14, margin: 0 }}>Nincs találat.</p>
        )}
        {csoportok.map(g => (
          <div key={g.kat}>
            <div style={{ background: C.bg, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: C.textSub, position: "sticky", top: 0 }}>
              {g.kat}
            </div>
            {g.tetelek.map(t => {
              const kosarban = kosar.find(k => k.tetelId === t.id);
              const eddigKiadva = mar(t.id);
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderTop: `1px solid ${C.bg}` }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: C.text, fontWeight: 500 }}>
                    {t.nev} <span style={{ color: C.muted, fontSize: 11 }}>({t.egyseg})</span>
                    <div style={{ fontSize: 10.5, color: C.muted }}>
                      Tervezett: {t.tervezettMennyiseg ?? 0} {t.egyseg} · Eddig kiadva: {eddigKiadva} {t.egyseg}
                    </div>
                  </div>
                  <button type="button" onClick={() => addTetel(t)}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", background: kosarban ? C.successLight : C.accentLight, color: kosarban ? C.success : C.accent, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: FONT, flexShrink: 0 }}>
                    <Plus size={11} /> {kosarban ? `${kosarban.mennyiseg} db hozzáadva` : "Hozzáad"}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {kosar.length > 0 && (
        <div style={{ background: "#fff", border: `1.5px solid ${C.accent}`, borderRadius: 10, padding: "10px 12px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>
            Ez a csapat ennyit visz ({kosar.length})
          </p>
          {kosar.map(k => (
            <div key={k.tetelId} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ flex: 1, fontSize: 12.5, color: C.text }}>{k.nev}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button type="button" onClick={() => updMennyiseg(k.tetelId, k.mennyiseg - 1)}
                  style={{ width: 22, height: 22, border: `1px solid ${C.border}`, background: "#fff", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Minus size={11} />
                </button>
                <input type="number" min={0} value={k.mennyiseg}
                  onChange={e => updMennyiseg(k.tetelId, e.target.value)}
                  style={{ width: 48, textAlign: "center", padding: "3px 4px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: FONT }} />
                <button type="button" onClick={() => updMennyiseg(k.tetelId, k.mennyiseg + 1)}
                  style={{ width: 22, height: 22, border: `1px solid ${C.border}`, background: "#fff", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={11} />
                </button>
                <span style={{ fontSize: 10, color: C.muted, width: 30 }}>{k.egyseg}</span>
              </div>
              <button type="button" onClick={() => removeTetel(k.tetelId)}
                style={{ border: "none", background: C.dangerLight, color: C.danger, borderRadius: 6, padding: "3px 6px", cursor: "pointer" }}>
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
