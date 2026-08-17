/**
 * AnyagKosarPicker.jsx
 * "Mit vigyen a csapat?" – Peas-stílusú anyag-kosár: keresés + telepítői
 * kategória szerinti csoportosítás + darabszám. A munkakiosztásnál (új
 * munkalap létrehozásakor) használjuk, hogy a PM/diszpécser tétel- és
 * mennyiség-szinten megadhassa, milyen anyagot vigyen magával a csapat –
 * ez a Kivitelezési Csomag "kiadott mennyiség" adatába kerül (ld.
 * kivitelezesiCsomag.service.js – assignAnyagokToMunkalap).
 *
 * Csak UX-minta alapján (a felhasználó Peas-screenshotjai) – valós Peas
 * anyagtörzs-adat NEM került importálásra, a kosár a CRM saját
 * anyagtörzsét (lib/anyagtorzs.js) használja.
 */
import { useMemo, useState } from "react";
import { Plus, Minus, Trash2, Search } from "lucide-react";
import { C, FONT } from "../lib/constants";
import { getAktivAnyagok, TELEPITOI_KATEGORIAK } from "../lib/anyagtorzs.js";

const KAT_LABEL = Object.fromEntries(TELEPITOI_KATEGORIAK.map(k => [k.id, k.label]));

export default function AnyagKosarPicker({ value, onChange }) {
  const [kereses, setKereses] = useState("");
  const anyagok = useMemo(() => getAktivAnyagok(), []);
  const kosar = value || [];

  const szurt = useMemo(() => {
    const q = kereses.trim().toLowerCase();
    if (!q) return anyagok;
    return anyagok.filter(a =>
      a.nev?.toLowerCase().includes(q) ||
      a.kulsoAzonosito?.toLowerCase().includes(q) ||
      KAT_LABEL[a.telepitoi_kategoria]?.toLowerCase().includes(q)
    );
  }, [anyagok, kereses]);

  const csoportok = useMemo(() => {
    const map = new Map();
    for (const a of szurt) {
      const kat = a.telepitoi_kategoria || "egyeb";
      if (!map.has(kat)) map.set(kat, []);
      map.get(kat).push(a);
    }
    return Array.from(map.entries())
      .map(([kat, tetelek]) => ({ kat, label: KAT_LABEL[kat] || "Egyéb", tetelek }))
      .sort((a, b) => a.label.localeCompare(b.label, "hu"));
  }, [szurt]);

  function addAnyag(a) {
    const meglevo = kosar.find(k => k.anyagtorzsId === a.id);
    if (meglevo) {
      onChange(kosar.map(k => k.anyagtorzsId === a.id ? { ...k, mennyiseg: k.mennyiseg + 1 } : k));
      return;
    }
    onChange([...kosar, {
      anyagtorzsId: a.id,
      nev:          a.nev,
      kategoria:    a.telepitoi_kategoria || "",
      egyseg:       a.egyseg || "db",
      mennyiseg:    1,
    }]);
  }

  function updMennyiseg(anyagtorzsId, mennyiseg) {
    const m = Math.max(0, Number(mennyiseg) || 0);
    onChange(kosar.map(k => k.anyagtorzsId === anyagtorzsId ? { ...k, mennyiseg: m } : k));
  }

  function removeAnyag(anyagtorzsId) {
    onChange(kosar.filter(k => k.anyagtorzsId !== anyagtorzsId));
  }

  return (
    <div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <Search size={14} color={C.muted} style={{ position: "absolute", left: 10, top: 10 }} />
        <input
          value={kereses}
          onChange={e => setKereses(e.target.value)}
          placeholder="Keresés anyag neve vagy kategória szerint…"
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
              {g.label}
            </div>
            {g.tetelek.map(a => {
              const kosarban = kosar.find(k => k.anyagtorzsId === a.id);
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderTop: `1px solid ${C.bg}` }}>
                  <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: C.text, fontWeight: 500 }}>
                    {a.nev} <span style={{ color: C.muted, fontSize: 11 }}>({a.egyseg})</span>
                  </div>
                  <button type="button" onClick={() => addAnyag(a)}
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
            Kiválasztott anyagok ({kosar.length})
          </p>
          {kosar.map(k => (
            <div key={k.anyagtorzsId} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ flex: 1, fontSize: 12.5, color: C.text }}>{k.nev}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button type="button" onClick={() => updMennyiseg(k.anyagtorzsId, k.mennyiseg - 1)}
                  style={{ width: 22, height: 22, border: `1px solid ${C.border}`, background: "#fff", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Minus size={11} />
                </button>
                <input type="number" min={0} value={k.mennyiseg}
                  onChange={e => updMennyiseg(k.anyagtorzsId, e.target.value)}
                  style={{ width: 48, textAlign: "center", padding: "3px 4px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: FONT }} />
                <button type="button" onClick={() => updMennyiseg(k.anyagtorzsId, k.mennyiseg + 1)}
                  style={{ width: 22, height: 22, border: `1px solid ${C.border}`, background: "#fff", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={11} />
                </button>
                <span style={{ fontSize: 10, color: C.muted, width: 30 }}>{k.egyseg}</span>
              </div>
              <button type="button" onClick={() => removeAnyag(k.anyagtorzsId)}
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
