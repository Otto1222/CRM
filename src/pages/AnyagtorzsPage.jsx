/**
 * AnyagtorzsPage.jsx – Egységes Anyagtörzs admin felület
 * Beállítások → Anyagtörzs
 *
 * Ugyanaz a localStorage["anyagtorzs"] adatforrás amit az Árajánlat is használ.
 */
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Save, Info, Upload } from "lucide-react";
import { C, FONT } from "../lib/constants";
import { ft } from "../lib/helpers";
import {
  loadAnyagtorzs, saveAnyagtorzs, createAnyag,
  updateAnyag, deleteAnyag, calcJavasoltEladasiAr,
  AJANLAT_KATEGORIAK, TELEPITOI_KATEGORIAK, FVK_SAJAT,
} from "../lib/anyagtorzs";
import { loadFovallalkozok } from "../modules/fovallalkozok/fovallalkozo.service.js";
import AnyagtorzsImportPanel from "../components/AnyagtorzsImportPanel.jsx";

const EGYSEGEK = ["db", "m", "m²", "m³", "kg", "kész", "csomag", "tekercs", "pár"];

function AnyagSor({ anyag, onEdit, onDelete, onToggle }) {
  const tKat = TELEPITOI_KATEGORIAK.find(k => k.id === anyag.telepitoi_kategoria)?.label || anyag.telepitoi_kategoria || "—";
  const aKat = AJANLAT_KATEGORIAK.find(k => k.id === anyag.kategoria)?.label || anyag.kategoria || "—";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      background: anyag.aktiv ? "#fff" : C.bg, borderBottom: `1px solid ${C.border}`,
      opacity: anyag.aktiv ? 1 : .5 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 600, fontSize: 13, color: C.text, margin: 0 }}>{anyag.nev}</p>
        <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0" }}>
          {tKat} · {anyag.egyseg}
          {anyag.netto_egysegar > 0 && <span style={{ color: C.success, marginLeft: 6, fontWeight: 600 }}>{ft(anyag.netto_egysegar)}/{anyag.egyseg}</span>}
          <span style={{ color: C.muted, marginLeft: 6 }}>· Ajánlat: {aKat}</span>
        </p>
      </div>
      <button onClick={() => onToggle(anyag)}
        style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20, border: "none",
          background: anyag.aktiv ? C.successLight : C.bg, color: anyag.aktiv ? C.success : C.muted, cursor: "pointer" }}>
        {anyag.aktiv ? "Aktív" : "Inaktív"}
      </button>
      <button onClick={() => onEdit(anyag)} style={{ padding: "5px 9px", background: C.accentLight, color: C.accent, border: "none", borderRadius: 7, cursor: "pointer" }}>
        <Pencil size={13} />
      </button>
      <button onClick={() => { if (window.confirm(`Törlöd: ${anyag.nev}?`)) onDelete(anyag.id); }}
        style={{ padding: "5px 9px", background: C.dangerLight, color: C.danger, border: "none", borderRadius: 7, cursor: "pointer" }}>
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function AnyagForm({ anyag, onSave, onClose }) {
  const isNew = !anyag?.id;
  const [form, setForm] = useState({
    nev:                  anyag?.nev || "",
    telepitoi_kategoria:  anyag?.telepitoi_kategoria || "kabel",
    kategoria:            anyag?.kategoria || "villanyszereles",
    egyseg:               anyag?.egyseg || "db",
    netto_egysegar:       anyag?.netto_egysegar || anyag?.egysegAr || 0,
    megjegyzes:           anyag?.megjegyzes || "",
    // ── V2 mezők (Fázis 2A) ──
    alapHaszonkulcsPct:   anyag?.alapHaszonkulcsPct ?? 30,
    javasoltEladasiAr:    anyag?.javasoltEladasiAr ?? calcJavasoltEladasiAr(anyag?.netto_egysegar || 0, anyag?.alapHaszonkulcsPct ?? 30),
    beszallito:           anyag?.beszallito || "",
    kulsoAzonosito:       anyag?.kulsoAzonosito || "",
    inaktiv:              anyag?.inaktiv ?? false,
  });
  const inp = { width: "100%", boxSizing: "border-box", padding: "9px 12px",
    border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13, fontFamily: FONT, outline: "none" };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 440, padding: 22, fontFamily: FONT, maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 16px", color: C.text }}>{isNew ? "Új anyag / termék" : "Szerkesztés"}</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Megnevezés *</label>
            <input value={form.nev} onChange={e => setForm(p => ({...p, nev: e.target.value}))} placeholder="pl. DC kábel 6 mm²" style={inp} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Egység</label>
              <select value={form.egyseg} onChange={e => setForm(p => ({...p, egyseg: e.target.value}))} style={inp}>
                {EGYSEGEK.map(e => <option key={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Nettó egységár (Ft)</label>
              <input type="number" min="0" value={form.netto_egysegar}
                onChange={e => setForm(p => ({...p, netto_egysegar: Number(e.target.value)}))}
                placeholder="0" style={inp} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Telepítői kategória</label>
            <select value={form.telepitoi_kategoria} onChange={e => setForm(p => ({...p, telepitoi_kategoria: e.target.value}))} style={inp}>
              {TELEPITOI_KATEGORIAK.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Árajánlat kategória (melyik főtételhez tartozik)</label>
            <select value={form.kategoria} onChange={e => setForm(p => ({...p, kategoria: e.target.value}))} style={inp}>
              {AJANLAT_KATEGORIAK.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          </div>

          {/* ── V2 mezők (Fázis 2A – Anyagtörzs V2 + árverziók) ── */}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 2 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .5, margin: "0 0 10px" }}>Árazás (V2)</p>
            <div style={{ background: C.warningLight, border: `1px solid ${C.warningLight}`, borderRadius: 8, padding: "8px 12px", fontSize: 11, color: C.warning, marginBottom: 12, lineHeight: 1.5 }}>
              Ármódosítás esetén a régi ár árverzióként mentésre kerül. Régi projektek és elfogadott ajánlatok árai nem változnak.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Alap haszonkulcs (%)</label>
                <input type="number" min="0" value={form.alapHaszonkulcsPct}
                  onChange={e => {
                    const pct = Number(e.target.value);
                    setForm(p => ({ ...p, alapHaszonkulcsPct: pct, javasoltEladasiAr: calcJavasoltEladasiAr(p.netto_egysegar, pct) }));
                  }} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Javasolt eladási ár (Ft)</label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input type="number" min="0" value={form.javasoltEladasiAr}
                    onChange={e => setForm(p => ({...p, javasoltEladasiAr: Number(e.target.value)}))} style={inp} />
                  <button type="button" title="Újraszámolás a beszerzési ár és a haszonkulcs alapján"
                    onClick={() => setForm(p => ({...p, javasoltEladasiAr: calcJavasoltEladasiAr(p.netto_egysegar, p.alapHaszonkulcsPct)}))}
                    style={{ flexShrink: 0, padding: "0 12px", border: `1.5px solid ${C.border}`, borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700, color: C.textSub, fontFamily: FONT }}>
                    Számol
                  </button>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Beszállító</label>
                <input value={form.beszallito} onChange={e => setForm(p => ({...p, beszallito: e.target.value}))} placeholder="pl. Solar Distri Kft." style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase" }}>Külső azonosító</label>
                <input value={form.kulsoAzonosito} onChange={e => setForm(p => ({...p, kulsoAzonosito: e.target.value}))} placeholder="cikkszám / SKU" style={inp} />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2, fontSize: 12, color: C.textSub, cursor: "pointer" }}>
              <input type="checkbox" checked={form.inaktiv} onChange={e => setForm(p => ({...p, inaktiv: e.target.checked}))} />
              Inaktív (V2 jelölő – a listában az „Aktív” kapcsoló marad az elsődleges állapotjelző)
            </label>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "10px", border: `1.5px solid ${C.border}`, borderRadius: 9, background: "#fff", cursor: "pointer", fontWeight: 600, fontFamily: FONT }}>Mégse</button>
          <button onClick={() => { if (!form.nev.trim()) return; onSave(form); }}
            style={{ flex: 2, padding: "10px", background: C.accent, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontFamily: FONT }}>
            {isNew ? "+ Hozzáadás" : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AnyagtorzsPage() {
  const [anyagok, setAnyagok] = useState(loadAnyagtorzs);
  const [editAnyag, setEditAnyag] = useState(null);
  const [ujOpen, setUjOpen]       = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [szuroKat, setSzuroKat]   = useState("mind");
  // Fővállalkozónkénti raktár-elkülönítés (ld. anyagtorzs.js FVK_SAJAT /
  // getAnyagokByTulajdonos) – "Saját munka" fül + egy-egy fül minden aktív
  // fővállalkozóhoz. Új anyag/import mindig az épp kiválasztott fülre kerül.
  const fovallalkozok = useMemo(() => loadFovallalkozok().filter(f => f.aktiv !== false), []);
  const [aktivTulajdonosId, setAktivTulajdonosId] = useState(FVK_SAJAT);
  const aktivFv = fovallalkozok.find(f => f.id === aktivTulajdonosId) || null;

  function reload() { setAnyagok(loadAnyagtorzs()); }

  function handleSave(form) {
    if (editAnyag?.id) updateAnyag(editAnyag.id, form);
    else               createAnyag({ ...form, tulajdonosId: aktivTulajdonosId });
    setEditAnyag(null); setUjOpen(false); reload();
  }

  const tulajdonosAnyagok = anyagok.filter(a => (a.tulajdonosId || FVK_SAJAT) === aktivTulajdonosId);

  // A "kellékanyag csoport" szűrő-fülek DINAMIKUSAN, a kiválasztott tulajdonos
  // tényleges anyagaiból épülnek fel (nem a fix TELEPITOI_KATEGORIAK 7 eleme) –
  // egy Excel-importnál a "telepitoi_kategoria" lehet a forrás cikkcsoport
  // szabad szövege is (pl. "Akkumulátorok"), nem csak a hét ismert id egyike
  // (ld. anyagtorzsExcelImport.js illesztKategoriak), ezért ezeknek is kell
  // saját, kattintható fülnek lennie, nem csak a "Mind" alatt látszódniuk.
  const kategoriaFulek = useMemo(() => {
    const map = new Map();
    tulajdonosAnyagok.forEach(a => {
      const kat = a.telepitoi_kategoria || "egyeb";
      if (!map.has(kat)) {
        map.set(kat, TELEPITOI_KATEGORIAK.find(k => k.id === kat)?.label || kat);
      }
    });
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "hu"));
  }, [tulajdonosAnyagok]);

  const szurt = szuroKat === "mind" ? tulajdonosAnyagok
    : tulajdonosAnyagok.filter(a => (a.telepitoi_kategoria || "egyeb") === szuroKat);

  return (
    <div style={{ padding: "16px", fontFamily: FONT, maxWidth: 620 }}>
      {/* Info banner */}
      <div style={{ background: C.accentLight, border: "1px solid #BAE6FD", borderRadius: 10, padding: "10px 14px", marginBottom: 16, display: "flex", gap: 8, fontSize: 12, color: "#0369A1" }}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Ez az <b>egyetlen</b> anyagtörzs az egész rendszerben. Ugyanebből dolgozik az <b>Árajánlat készítő</b>, a <b>Telepítő felület</b> és a <b>Projekt pénzügy</b>.</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 18, margin: 0, color: C.text }}>Anyagtörzs</h2>
          <p style={{ fontSize: 12, color: C.muted, margin: "2px 0 0" }}>{tulajdonosAnyagok.filter(a => a.aktiv).length} aktív · {tulajdonosAnyagok.length} összesen ({aktivFv?.nev || "Saját munka"})</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setImportOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: "#fff", color: C.accent, border: `1.5px solid ${C.accent}`, borderRadius: 9, cursor: "pointer", fontWeight: 700, fontFamily: FONT }}>
            <Upload size={14} /> Excel import
          </button>
          <button onClick={() => setUjOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: C.accent, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontFamily: FONT }}>
            <Plus size={14} /> Új anyag
          </button>
        </div>
      </div>

      {/* Fővállalkozónkénti fülek – "Saját munka" + minden aktív
          fővállalkozó saját, a többiétől független anyaglistája/készlete. */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}>
        {[{ id: FVK_SAJAT, nev: "Saját munka" }, ...fovallalkozok.map(f => ({ id: f.id, nev: f.nev }))].map(t => (
          <button key={t.id || "sajat"} onClick={() => { setAktivTulajdonosId(t.id); setSzuroKat("mind"); }}
            style={{ padding: "6px 13px", borderRadius: 20, border: `1.5px solid ${aktivTulajdonosId === t.id ? C.accent : C.border}`,
              background: aktivTulajdonosId === t.id ? C.accent : "#fff", color: aktivTulajdonosId === t.id ? "#fff" : C.textSub,
              cursor: "pointer", fontSize: 13, fontFamily: FONT, fontWeight: aktivTulajdonosId === t.id ? 700 : 500 }}>
            {t.nev}
          </button>
        ))}
      </div>

      {/* Szűrő – a kiválasztott tulajdonos tényleges kellékanyag-csoportjai */}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
        {[{ id: "mind", label: "Mind" }, ...kategoriaFulek].map(k => (
          <button key={k.id} onClick={() => setSzuroKat(k.id)}
            style={{ padding: "5px 11px", borderRadius: 20, border: `1.5px solid ${szuroKat === k.id ? C.accent : C.border}`,
              background: szuroKat === k.id ? C.accent : "#fff", color: szuroKat === k.id ? "#fff" : C.textSub,
              cursor: "pointer", fontSize: 12, fontFamily: FONT, fontWeight: szuroKat === k.id ? 700 : 400 }}>
            {k.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        {szurt.length === 0
          ? <p style={{ textAlign: "center", color: C.muted, padding: "28px 0", fontSize: 13 }}>Nincs anyag ebben a kategóriában</p>
          : szurt.map(a => (
            <AnyagSor key={a.id} anyag={a}
              onEdit={a => setEditAnyag(a)}
              onDelete={id => { deleteAnyag(id); reload(); }}
              onToggle={a => { updateAnyag(a.id, { aktiv: !a.aktiv }); reload(); }} />
          ))
        }
      </div>

      {(ujOpen || editAnyag) && (
        <AnyagForm anyag={editAnyag} onSave={handleSave}
          onClose={() => { setEditAnyag(null); setUjOpen(false); }} />
      )}

      {importOpen && (
        <AnyagtorzsImportPanel
          tulajdonosId={aktivTulajdonosId}
          tulajdonosNev={aktivFv?.nev || "Saját munka"}
          meglevoDb={tulajdonosAnyagok.length}
          onClose={() => setImportOpen(false)}
          onImported={() => { setImportOpen(false); reload(); }}
        />
      )}
    </div>
  );
}
