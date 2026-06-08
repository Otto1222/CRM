import { useState, useMemo } from "react";
import { ArrowLeft, Save, Printer, Plus, Trash2, ChevronDown, ChevronRight, Info, Package } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../lib/constants";
import { ft } from "../../lib/helpers";
import { loadLocal } from "../../lib/localDb";
import {
  FO_TETELEK, AJANLAT_STATUSZOK, makeFoTetelek, DEFAULT_KIVI_KALKULATOR,
  computeFoTetelek, computeKiviOsszeg,
  CEGES_ALAP_ANYAG_HASZON_PCT, calcEladasiAr, calcHaszonFt, alacsonyAnyagHaszon,
} from "./ajanlat.schema";
import { createAjanlat, updateAjanlat } from "./ajanlat.service";
import { printAjanlat } from "./ajanlatPrint";

const INP = {
  width: "100%", boxSizing: "border-box", padding: "9px 12px",
  border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 14,
  fontFamily: FONT, outline: "none", background: "#FAFAF9", color: C.text,
};

const INP_SM = { ...INP, padding: "6px 9px", fontSize: 13 };

function Label({ children, required }) {
  return (
    <label style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: 0.8, display: "block", marginBottom: 5 }}>
      {children}{required && <span style={{ color: C.danger }}> *</span>}
    </label>
  );
}

function TabBtn({ active, label, step, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 20px", border: "none", background: "transparent", cursor: "pointer",
      fontFamily: FONT, fontWeight: 700, fontSize: 13,
      color: active ? C.accent : C.muted,
      borderBottom: `2.5px solid ${active ? C.accent : "transparent"}`,
      transition: "all .15s",
    }}>
      <span style={{ fontSize: 11, background: active ? C.accentLight : "#F1F5F9", color: active ? C.accent : C.muted, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, marginRight: 6, fontWeight: 800 }}>{step}</span>
      {label}
    </button>
  );
}

// Anyagtörzs betöltése kategóriánként
function loadAnyagtorzs(kategoria) {
  try {
    const all = JSON.parse(localStorage.getItem("anyagtorzs") || "[]");
    return all.filter(t => t.aktiv !== false && (!t.kategoria || t.kategoria === kategoria));
  } catch { return []; }
}

// fo_tetelek backward compat merge: régi rekordok megkapják az új mezőket
//
// Ajánlat V2 – profitlogika migráció (Fázis 3A, idempotens, transform-on-read):
//   haszonPct               = 30, ha hiányzik
//   beszerzesiArPillanatkep = marad null, ha a régi tételen nem létezett ilyen mező
//                             (régi ajánlatoknál sosem volt beszerzési ár tárolva –
//                             nincs mit pillanatképezni, a "ha van" feltétel itt hamis)
//   eladasiAr               = a meglévő netto_egysegar marad (ez a fogalmilag
//                             ugyanaz – ld. schema megjegyzés); ha 0 lenne ÉS
//                             van pillanatkép, a képlettel számolva pótlódik
//   haszonFt                = számolt, csak ha van pillanatkép – egyébként 0
function mergeFoTetelek(saved) {
  return saved.map(t => {
    const def = FO_TETELEK.find(f => f.id === t.id);
    const merged = {
      anyagtorzs_id:    null,
      tipus:            "",
      mennyiseg:        "",
      egyseg:           "db",
      netto_egysegar:   0,
      ugyfel_leiras:    def?.ugyfel_leiras_default || "",
      belso_megjegyzes: "",
      ...t,
    };
    const haszonPct = merged.haszonPct ?? CEGES_ALAP_ANYAG_HASZON_PCT;
    const beszerzesiArPillanatkep = merged.beszerzesiArPillanatkep ?? null;
    let eladasiAr = Number(merged.netto_egysegar) || 0;
    if (!eladasiAr && beszerzesiArPillanatkep != null) {
      eladasiAr = calcEladasiAr(beszerzesiArPillanatkep, haszonPct);
    }
    return {
      ...merged,
      haszonPct,
      beszerzesiArPillanatkep,
      netto_egysegar: eladasiAr,
      haszonFt: merged.haszonFt ?? (
        beszerzesiArPillanatkep != null ? calcHaszonFt(eladasiAr, beszerzesiArPillanatkep, merged.mennyiseg) : 0
      ),
    };
  });
}

export default function AjanlatEditor({ ajanlat, onBack, onSaved, currentUser }) {
  const isNew = !ajanlat?.id;
  const ugyfelek = useMemo(() => loadLocal("ugyfelek") || [], []);

  const [tab, setTab]   = useState(0);
  const [hiba, setHiba] = useState("");
  const [exp, setExp]   = useState(new Set());

  const [form, setForm] = useState(() => ({
    nev:          ajanlat?.nev         || "",
    clientId:     ajanlat?.clientId    || "",
    clientNev:    ajanlat?.clientNev   || "",
    clientTel:    ajanlat?.clientTel   || "",
    clientEmail:  ajanlat?.clientEmail || "",
    clientCim:    ajanlat?.clientCim   || "",
    ervenyesseg:  ajanlat?.ervenyesseg || "",
    megjegyzes:   ajanlat?.megjegyzes  || "",
    status:       ajanlat?.status      || "Piszkozat",
    afa_szazalek: ajanlat?.afa_szazalek ?? 27,
    fo_tetelek:   ajanlat?.fo_tetelek?.length
                    ? mergeFoTetelek(ajanlat.fo_tetelek)
                    : makeFoTetelek(),
    reszlet_tetelek: ajanlat?.reszlet_tetelek || [],
    kivi_kalkulator: { ...DEFAULT_KIVI_KALKULATOR, ...(ajanlat?.kivi_kalkulator || {}) },
  }));

  const computed = useMemo(() => {
    const fo = computeFoTetelek(form.fo_tetelek, form.reszlet_tetelek, form.kivi_kalkulator);
    const netto = fo.filter(t => t.aktiv).reduce((s, t) => s + t.netto_osszeg, 0);
    const afa   = netto * (Number(form.afa_szazalek) || 0) / 100;
    return { fo, netto, afa, brutto: netto + afa };
  }, [form]);

  // Ajánlat V2 – profitlogika (Fázis 3A): belső profit-összesítő.
  // Csak az anyagtörzsből választott (beszerzési ár pillanatképpel rendelkező)
  // tételeknek van ismert költségbázisuk – a "teljes ajánlat profit" ezért az
  // anyaghaszon és a kivitelezés-munkadíj (kivi_beuzem, kivi:true) összege.
  // Az egyéb összesített kategóriáknak (ügyintézés, villanyszerelés, védelmi
  // eszközök) nincs nyilvántartott beszerzési költségük, így az árbevételükben
  // szerepelnek, de a profitszámításban nem – ez tudatos egyszerűsítés.
  const profitOsszesito = useMemo(() => {
    const aktivak = computed.fo.filter(t => t.aktiv);
    let beszerzesOssz = 0, eladasOssz = 0, anyagHaszonFt = 0;
    aktivak.forEach(t => {
      if (t.beszerzesiArPillanatkep != null) {
        const db = Number(t.mennyiseg) || 0;
        beszerzesOssz += t.beszerzesiArPillanatkep * db;
        eladasOssz    += (Number(t.netto_egysegar) || 0) * db;
        anyagHaszonFt += t.haszonFt || 0;
      }
    });
    const munkadijOsszeg   = aktivak.find(t => FO_TETELEK.find(f => f.id === t.id)?.kivi)?.netto_osszeg || 0;
    const anyagHaszonPct   = beszerzesOssz > 0 ? (anyagHaszonFt / beszerzesOssz) * 100 : 0;
    const teljesProfitFt   = anyagHaszonFt + munkadijOsszeg;
    const teljesArbevetel  = computed.netto;
    const teljesProfitPct  = teljesArbevetel > 0 ? (teljesProfitFt / teljesArbevetel) * 100 : 0;
    return { beszerzesOssz, eladasOssz, anyagHaszonFt, anyagHaszonPct, munkadijOsszeg, teljesProfitFt, teljesProfitPct };
  }, [computed]);

  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); if (hiba) setHiba(""); }

  function updFo(id, field, val) {
    setForm(p => ({ ...p, fo_tetelek: p.fo_tetelek.map(t => t.id === id ? { ...t, [field]: val } : t) }));
  }
  function updFoFields(id, fields) {
    setForm(p => ({ ...p, fo_tetelek: p.fo_tetelek.map(t => t.id === id ? { ...t, ...fields } : t) }));
  }

  function toggleAktiv(id, checked) {
    updFo(id, "aktiv", checked);
    if (checked) setExp(prev => new Set([...prev, id]));
  }

  function updKivi(field, val) {
    setForm(p => ({ ...p, kivi_kalkulator: { ...p.kivi_kalkulator, [field]: val } }));
  }

  function addReszlet(fotetel) {
    const item = { id: crypto.randomUUID(), fotetel, nev: "", mennyiseg: 1, egyseg: "db", netto_egysegar: 0, netto_osszeg: 0 };
    setForm(p => ({ ...p, reszlet_tetelek: [...p.reszlet_tetelek, item] }));
  }
  function updReszlet(id, field, val) {
    setForm(p => ({
      ...p,
      reszlet_tetelek: p.reszlet_tetelek.map(t => {
        if (t.id !== id) return t;
        const u = { ...t, [field]: val };
        if (field === "netto_egysegar" || field === "mennyiseg")
          u.netto_osszeg = (Number(u.mennyiseg) || 0) * (Number(u.netto_egysegar) || 0);
        return u;
      }),
    }));
  }
  function delReszlet(id) {
    setForm(p => ({ ...p, reszlet_tetelek: p.reszlet_tetelek.filter(t => t.id !== id) }));
  }

  function handleUgyfélValaszt(ugyfélId) {
    const u = ugyfelek.find(x => x.id === ugyfélId);
    if (!u) { upd("clientId", ""); return; }
    setForm(p => ({ ...p, clientId: u.id, clientNev: u.name || "", clientCim: u.address || "", clientTel: u.phone || "", clientEmail: u.email || "" }));
    if (hiba) setHiba("");
  }

  function handleAnyagtorzsValaszt(foTetelId, anyagtorzsId, items) {
    const item = items.find(t => t.id === anyagtorzsId);
    if (!item) { updFo(foTetelId, "anyagtorzs_id", ""); return; }
    const def = FO_TETELEK.find(f => f.id === foTetelId);
    // Ajánlat V2 – profitlogika (Fázis 3A): kiválasztáskor pillanatkép készül
    // a beszerzési árról és a haszonkulcsról – ez később már nem változik,
    // még akkor sem, ha az anyagtörzsben módosul az ár.
    const beszerzesiAr = Number(item.netto_egysegar) || 0;
    const haszonPct    = item.alapHaszonkulcsPct ?? CEGES_ALAP_ANYAG_HASZON_PCT;
    const eladasiAr    = item.javasoltEladasiAr ?? calcEladasiAr(beszerzesiAr, haszonPct);
    updFoFields(foTetelId, {
      anyagtorzs_id:  item.id,
      tipus:          item.tipus || "",
      egyseg:         item.egyseg || "db",
      netto_egysegar: eladasiAr,
      ugyfel_leiras:  item.ugyfel_leiras || def?.ugyfel_leiras_default || "",
      beszerzesiArPillanatkep: beszerzesiAr,
      haszonPct:               haszonPct,
    });
  }

  function handleSave() {
    if (!form.nev?.trim())       { setHiba("Az ajánlat megnevezése kötelező."); setTab(0); return; }
    if (!form.clientNev?.trim()) { setHiba("Az ügyfél neve kötelező."); setTab(0); return; }
    const saveData = { ...form, fo_tetelek: computed.fo, osszeg: computed.netto };
    if (isNew) createAjanlat(saveData, currentUser);
    else updateAjanlat(ajanlat.id, saveData);
    onSaved();
  }

  function handlePrint() {
    const snap = {
      ...ajanlat, ...form,
      fo_tetelek: computed.fo,
      osszeg: computed.netto,
      ajanlatkod: ajanlat?.ajanlatkod || "—",
      keszitette: currentUser?.name || "",
    };
    printAjanlat(snap);
  }

  function toggleExp(id) {
    setExp(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  // ─── TAB 0: Fejléc ────────────────────────────────────────────────────────

  function renderFejlec() {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
        <div style={{ gridColumn: "span 2" }}>
          <Label required>Ajánlat megnevezése</Label>
          <input value={form.nev} onChange={e => upd("nev", e.target.value)}
            placeholder="pl. Kovács ház 10 kWp napelem rendszer"
            style={{ ...INP, border: `2px solid ${C.accent}`, fontWeight: 600 }} />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <Label>Ügyfél kiválasztása (opcionális)</Label>
          <select value={form.clientId} onChange={e => handleUgyfélValaszt(e.target.value)} style={INP}>
            <option value="">— Válassz a nyilvántartásból —</option>
            {ugyfelek.map(u => <option key={u.id} value={u.id}>{u.name}{u.address ? ` – ${u.address}` : ""}</option>)}
          </select>
        </div>
        <div>
          <Label required>Ügyfél neve</Label>
          <input value={form.clientNev} onChange={e => upd("clientNev", e.target.value)} placeholder="Kovács János" style={INP} />
        </div>
        <div>
          <Label>Telefon</Label>
          <input value={form.clientTel} onChange={e => upd("clientTel", e.target.value)} placeholder="+36 30 ..." style={INP} />
        </div>
        <div>
          <Label>E-mail</Label>
          <input value={form.clientEmail} onChange={e => upd("clientEmail", e.target.value)} placeholder="email@example.com" style={INP} />
        </div>
        <div>
          <Label>Érvényesség</Label>
          <input type="date" value={form.ervenyesseg} onChange={e => upd("ervenyesseg", e.target.value)} style={INP} />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <Label>Cím</Label>
          <input value={form.clientCim} onChange={e => upd("clientCim", e.target.value)} placeholder="6724 Szeged, Példa utca 1." style={INP} />
        </div>
        <div>
          <Label>Státusz</Label>
          <select value={form.status} onChange={e => upd("status", e.target.value)} style={INP}>
            {AJANLAT_STATUSZOK.map(s => <option key={s.id}>{s.id}</option>)}
          </select>
        </div>
        <div>
          <Label>ÁFA (%)</Label>
          <input type="number" value={form.afa_szazalek} onChange={e => upd("afa_szazalek", e.target.value)} min={0} max={100} style={INP} />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <Label>Megjegyzés (ügyfélnek jelenik meg)</Label>
          <textarea value={form.megjegyzes} onChange={e => upd("megjegyzes", e.target.value)}
            placeholder="pl. Az ajánlat tartalmazza a helyszíni felmérést és az üzembe helyezési dokumentációt."
            rows={3} style={{ ...INP, resize: "vertical" }} />
        </div>
      </div>
    );
  }

  // ─── TAB 1: Tételek ───────────────────────────────────────────────────────

  function renderTermekPanel(def, foTetel) {
    const anyagtorzsItems = loadAnyagtorzs(def.id);
    const db = Number(foTetel.mennyiseg) || 0;
    const ar = Number(foTetel.netto_egysegar) || 0;
    const autoOssz = db > 0 && ar > 0;

    return (
      <div style={{ borderTop: `1px solid ${C.border}`, background: "#F7FBFB", padding: "14px 16px" }}>
        {/* Anyagtörzs */}
        {anyagtorzsItems.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <Label>Kiválasztás anyagtörzsből</Label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Package size={15} color={C.accent} style={{ flexShrink: 0 }} />
              <select
                value={foTetel.anyagtorzs_id || ""}
                onChange={e => handleAnyagtorzsValaszt(def.id, e.target.value, anyagtorzsItems)}
                style={{ ...INP, flex: 1 }}>
                <option value="">— Kézi megadás —</option>
                {anyagtorzsItems.map(t => (
                  <option key={t.id} value={t.id}>{t.tipus}{t.netto_egysegar ? ` – ${t.netto_egysegar.toLocaleString("hu-HU")} Ft/${t.egyseg || "db"}` : ""}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {/* Típus */}
          <div style={{ gridColumn: "span 2" }}>
            <Label>Típus / terméknév</Label>
            <input value={foTetel.tipus || ""} onChange={e => updFo(def.id, "tipus", e.target.value)}
              placeholder="pl. Jinko 54HL4M-BDV-510W n-type bifacial glass-glass"
              style={INP} />
          </div>

          {/* Mennyiség + egység */}
          <div>
            <Label>Mennyiség</Label>
            <input type="number" value={foTetel.mennyiseg ?? ""} min={0}
              onChange={e => updFo(def.id, "mennyiseg", e.target.value)}
              placeholder="0" style={INP} />
          </div>
          <div>
            <Label>Egység</Label>
            <select value={foTetel.egyseg || "db"} onChange={e => updFo(def.id, "egyseg", e.target.value)} style={INP}>
              {["db", "készlet", "m", "m²", "csomag"].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>

          {/* Egységár */}
          <div>
            <Label>Nettó egységár</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input type="number" value={foTetel.netto_egysegar || ""} min={0}
                onChange={e => updFo(def.id, "netto_egysegar", Number(e.target.value) || 0)}
                placeholder="0" style={{ ...INP, flex: 1 }} />
              <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>Ft/{foTetel.egyseg || "db"}</span>
            </div>
          </div>

          {/* Összeg */}
          <div>
            {autoOssz ? (
              <div style={{ background: C.accentLight, border: `1px solid ${C.border}`, borderRadius: 9, padding: "9px 12px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {db} {foTetel.egyseg || "db"} × {(ar).toLocaleString("hu-HU")} Ft
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.accentDark }}>= {ft(db * ar)}</div>
              </div>
            ) : (
              <div>
                <Label>Nettó összeg (közvetlen)</Label>
                <input type="number" value={foTetel.netto_osszeg || ""} min={0}
                  onChange={e => updFo(def.id, "netto_osszeg", Number(e.target.value) || 0)}
                  placeholder="0" style={{ ...INP, fontWeight: 600 }} />
              </div>
            )}
          </div>
        </div>

        {/* Ajánlat V2 – profitlogika (Fázis 3A): csak anyagtörzsből választott
            tételeknél van ismert beszerzési-ár pillanatkép – ekkor a PM
            szerkesztheti a haszonkulcsot, ami újraszámolja az eladási árat. */}
        {foTetel.beszerzesiArPillanatkep != null && (
          <div style={{ marginTop: 10, background: "#FFFFFF", border: `1px solid ${C.border}`, borderRadius: 9, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>
              Anyag haszon (belső, nem jelenik meg az ügyfélnek)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <Label>Beszerzési ár (pillanatkép)</Label>
                <div style={{ ...INP, background: "#F3F4F6", color: C.muted, display: "flex", alignItems: "center" }}>
                  {ft(foTetel.beszerzesiArPillanatkep)}
                </div>
              </div>
              <div>
                <Label>Haszonkulcs (%)</Label>
                <input type="number" value={foTetel.haszonPct ?? ""} min={0}
                  onChange={e => {
                    const pct = Number(e.target.value) || 0;
                    updFoFields(def.id, {
                      haszonPct:      pct,
                      netto_egysegar: calcEladasiAr(foTetel.beszerzesiArPillanatkep, pct),
                    });
                  }}
                  placeholder="30" style={INP} />
              </div>
              <div>
                <Label>Anyag haszon (összesen)</Label>
                <div style={{ ...INP, background: C.accentLight, color: C.accentDark, fontWeight: 700, display: "flex", alignItems: "center" }}>
                  {ft(foTetel.haszonFt || 0)}
                </div>
              </div>
            </div>
            {alacsonyAnyagHaszon(foTetel.haszonPct) && (
              <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: "#B45309", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 7, padding: "7px 10px" }}>
                ⚠ 30% alatti anyag haszon
              </div>
            )}
          </div>
        )}

        {/* Ügyfélnek látható leírás */}
        <div style={{ marginTop: 10 }}>
          <Label>Ügyfélnek látható leírás (PDF-ben jelenik meg)</Label>
          <textarea value={foTetel.ugyfel_leiras || ""} rows={2}
            onChange={e => updFo(def.id, "ugyfel_leiras", e.target.value)}
            placeholder="pl. Nagy hatásfokú, üveg-üveg kivitelű napelemek."
            style={{ ...INP, resize: "vertical" }} />
        </div>

        {/* Belső megjegyzés */}
        <div style={{ marginTop: 8 }}>
          <Label>Belső megjegyzés (nem jelenik meg az ügyfélnek)</Label>
          <textarea value={foTetel.belso_megjegyzes || ""} rows={2}
            onChange={e => updFo(def.id, "belso_megjegyzes", e.target.value)}
            placeholder="pl. szállítási idő, gyártói info, alternatívák..."
            style={{ ...INP, resize: "vertical", background: "#FFFBEB", borderColor: "#FDE68A" }} />
        </div>
      </div>
    );
  }

  function renderOsszetettPanel(def, foTetel, reszletek) {
    return (
      <div style={{ borderTop: `1px solid ${C.border}`, background: "#F7FBFB", padding: "14px 16px" }}>
        {/* Ügyfélnek látható szöveg */}
        <div style={{ marginBottom: 14 }}>
          <Label>Ügyfélnek látható szöveg (PDF-ben jelenik meg)</Label>
          <textarea value={foTetel.ugyfel_leiras || ""} rows={2}
            onChange={e => updFo(def.id, "ugyfel_leiras", e.target.value)}
            style={{ ...INP, resize: "vertical" }} />
        </div>

        {/* Belső tételes bontás */}
        <p style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
          Belső tételes kalkuláció (nem jelenik meg az ügyfélnek)
        </p>
        {reszletek.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginBottom: 8 }}>
            <thead>
              <tr style={{ background: "#E8F4F4" }}>
                {["Megnevezés", "Menny.", "Egység", "Nettó egységár", "Összeg", ""].map(h => (
                  <th key={h} style={{ padding: "6px 8px", textAlign: h === "Összeg" || h === "Nettó egységár" ? "right" : "left", fontSize: 10, fontWeight: 700, color: C.textSub, whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reszletek.map(t => (
                <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "5px 8px" }}>
                    <input value={t.nev} onChange={e => updReszlet(t.id, "nev", e.target.value)}
                      placeholder="pl. AC T1+T2 túlfeszültség" style={{ ...INP_SM }} />
                  </td>
                  <td style={{ padding: "5px 8px", width: 70 }}>
                    <input type="number" value={t.mennyiseg} onChange={e => updReszlet(t.id, "mennyiseg", e.target.value)}
                      min={0} style={{ ...INP_SM, textAlign: "center" }} />
                  </td>
                  <td style={{ padding: "5px 8px", width: 70 }}>
                    <select value={t.egyseg} onChange={e => updReszlet(t.id, "egyseg", e.target.value)} style={INP_SM}>
                      {["db", "m", "m²", "csomag", "óra"].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "5px 8px", width: 120 }}>
                    <input type="number" value={t.netto_egysegar} onChange={e => updReszlet(t.id, "netto_egysegar", e.target.value)}
                      min={0} placeholder="0" style={{ ...INP_SM, textAlign: "right" }} />
                  </td>
                  <td style={{ padding: "5px 8px", width: 110, textAlign: "right", fontWeight: 600, color: C.accentDark, whiteSpace: "nowrap" }}>
                    {t.netto_osszeg > 0 ? ft(t.netto_osszeg) : "—"}
                  </td>
                  <td style={{ padding: "5px 8px", width: 32 }}>
                    <button onClick={() => delReszlet(t.id)} style={{ border: "none", background: "#FEF2F2", borderRadius: 6, cursor: "pointer", padding: "4px 6px", color: C.danger }}>
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => addReszlet(def.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: C.accentLight, color: C.accent, border: `1.5px dashed ${C.accent}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT }}>
            <Plus size={13} /> Tétel hozzáadása
          </button>
          {reszletek.length > 0 && (
            <span style={{ fontWeight: 700, color: C.accentDark, fontSize: 13 }}>
              Részösszeg: {ft(reszletek.reduce((s, t) => s + (t.netto_osszeg || 0), 0))}
            </span>
          )}
        </div>
      </div>
    );
  }

  function renderKiviPanel(foTetel) {
    const def = FO_TETELEK.find(f => f.id === "kivi_beuzem");
    return (
      <div style={{ borderTop: `1px solid ${C.border}`, background: "#F7FBFB", padding: "14px 16px" }}>
        {/* Ügyfélnek látható szöveg */}
        <div style={{ marginBottom: 14 }}>
          <Label>Ügyfélnek látható szöveg (PDF-ben jelenik meg)</Label>
          <textarea value={foTetel.ugyfel_leiras || def?.ugyfel_leiras_default || ""} rows={2}
            onChange={e => updFo("kivi_beuzem", "ugyfel_leiras", e.target.value)}
            style={{ ...INP, resize: "vertical" }} />
        </div>

        {/* Kalkulált / Kézi toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[["Kalkulált", false], ["Kézi megadás", true]].map(([lbl, val]) => (
            <button key={lbl} onClick={() => updKivi("kezi", val)} style={{
              padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 600,
              background: form.kivi_kalkulator.kezi === val ? C.accent : "#fff",
              color: form.kivi_kalkulator.kezi === val ? "#fff" : C.muted,
              border: `1.5px solid ${form.kivi_kalkulator.kezi === val ? C.accent : C.border}`,
            }}>{lbl}</button>
          ))}
        </div>

        {!form.kivi_kalkulator.kezi ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "Panel darab", field: "panel_db", suffix: "db" },
              { label: "Telepítési díj / panel", field: "telepitesi_dij_per_panel", suffix: "Ft/db" },
              { label: "Kiszállási díj", field: "kiszallasi_dij", suffix: "Ft" },
              { label: "Emelőgép díj", field: "emelőgep_dij", suffix: "Ft" },
              { label: "Többlet munkanapok", field: "tobblet_napok", suffix: "nap" },
              { label: "Napi díj", field: "napi_dij", suffix: "Ft/nap" },
            ].map(({ label, field, suffix }) => (
              <div key={field}>
                <Label>{label}</Label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input type="number" value={form.kivi_kalkulator[field] ?? ""} min={0}
                    onChange={e => updKivi(field, Number(e.target.value) || 0)}
                    style={{ ...INP, flex: 1 }} />
                  <span style={{ fontSize: 11, color: C.muted, whiteSpace: "nowrap" }}>{suffix}</span>
                </div>
              </div>
            ))}
            <div style={{ gridColumn: "span 2", background: C.accentLight, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px" }}>
              <div style={{ fontSize: 11, color: C.muted }}>
                {form.kivi_kalkulator.panel_db} panel × {(form.kivi_kalkulator.telepitesi_dij_per_panel || 0).toLocaleString("hu-HU")} Ft
                + {ft(form.kivi_kalkulator.kiszallasi_dij)} kiszállás
                + {ft(form.kivi_kalkulator.emelőgep_dij)} emelőgép
                + {form.kivi_kalkulator.tobblet_napok} nap × {(form.kivi_kalkulator.napi_dij || 0).toLocaleString("hu-HU")} Ft
              </div>
              <p style={{ fontWeight: 700, fontSize: 14, color: C.accentDark, marginTop: 4 }}>
                = {ft(computeKiviOsszeg(form.kivi_kalkulator) || 0)}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <Label>Kivitelezés összege (nettó)</Label>
            <input type="number" value={foTetel.netto_osszeg || ""} min={0}
              onChange={e => updFo("kivi_beuzem", "netto_osszeg", Number(e.target.value) || 0)}
              placeholder="0" style={{ ...INP, maxWidth: 220, fontWeight: 600 }} />
          </div>
        )}
      </div>
    );
  }

  function renderTetelek() {
    return (
      <div>
        <div style={{ background: C.accentLight, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: C.accentDark, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Info size={14} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>
            A <strong>termékes soroknál</strong> add meg a típust, mennyiséget és egységárat.
            A <strong>4 összesített sornál</strong> (Védelmi eszközök, Villanyszerelési anyagok, Ügyintézés, Kivitelezés) belső tételes kalkuláció áll rendelkezésre – az ügyfél csak az összegzett értéket és a leírást látja.
          </span>
        </div>

        {FO_TETELEK.map(def => {
          const foTetel = form.fo_tetelek.find(t => t.id === def.id)
            || { id: def.id, aktiv: false, netto_osszeg: 0, ugyfel_leiras: def.ugyfel_leiras_default || "" };
          const cFo  = computed.fo.find(t => t.id === def.id);
          const ossz = cFo?.netto_osszeg || 0;
          const isExp = exp.has(def.id);
          const reszletek = form.reszlet_tetelek.filter(t => t.fotetel === def.id);

          // Típus + mennyiség összefoglaló a header sorban
          let headerSub = null;
          if (def.termek && (foTetel.tipus || foTetel.mennyiseg)) {
            const parts = [];
            if (foTetel.tipus) parts.push(foTetel.tipus);
            if (foTetel.mennyiseg) parts.push(`${foTetel.mennyiseg} ${foTetel.egyseg || "db"}`);
            headerSub = parts.join(", ");
          } else if (def.osszetett && reszletek.length > 0) {
            headerSub = `${reszletek.length} belső tétel`;
          }

          const borderColor = foTetel.aktiv
            ? (def.termek ? C.border : (def.osszetett ? "#C4B5FD" : C.border))
            : "#EEF0F3";

          return (
            <div key={def.id} style={{
              border: `1.5px solid ${borderColor}`,
              borderRadius: 10, marginBottom: 8,
              background: foTetel.aktiv ? "#fff" : "#FAFAF9",
              overflow: "hidden",
            }}>
              {/* Header sor */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", cursor: "pointer" }}
                onClick={() => toggleExp(def.id)}>
                <input type="checkbox" checked={foTetel.aktiv}
                  onClick={e => e.stopPropagation()}
                  onChange={e => toggleAktiv(def.id, e.target.checked)}
                  style={{ width: 17, height: 17, accentColor: C.accent, cursor: "pointer", flexShrink: 0 }} />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: foTetel.aktiv ? C.text : C.muted }}>
                    {def.label}
                    {def.osszetett && (
                      <span style={{ marginLeft: 8, fontSize: 10, background: "#EDE9FE", color: "#7C3AED", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>
                        összetett
                      </span>
                    )}
                  </div>
                  {headerSub && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {headerSub}
                    </div>
                  )}
                </div>

                {/* Összeg */}
                <div style={{ textAlign: "right", minWidth: 120, flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: ossz > 0 ? C.accent : C.muted, whiteSpace: "nowrap" }}>
                    {ossz > 0 ? ft(ossz) : "—"}
                  </span>
                  {(def.osszetett || (def.termek && Number(foTetel.mennyiseg) > 0 && Number(foTetel.netto_egysegar) > 0)) && (
                    <div style={{ fontSize: 10, color: C.muted }}>auto</div>
                  )}
                </div>

                {/* Expand */}
                <button onClick={e => { e.stopPropagation(); toggleExp(def.id); }}
                  style={{ border: "none", background: "transparent", cursor: "pointer", color: C.muted, padding: 4, display: "flex", flexShrink: 0 }}>
                  {isExp ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              </div>

              {/* Panel */}
              {isExp && def.termek  && renderTermekPanel(def, foTetel)}
              {isExp && def.osszetett && renderOsszetettPanel(def, foTetel, reszletek)}
              {isExp && def.kivi    && renderKiviPanel(foTetel)}
            </div>
          );
        })}

        {/* Ajánlat V2 – profitlogika (Fázis 3A): belső profit összesítő – nem PDF tartalom */}
        <div style={{ marginTop: 18, border: `1.5px dashed ${C.border}`, borderRadius: 10, padding: "14px 16px", background: "#FAFAF9" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <Info size={13} />
            Profit összesítő (belső – nem jelenik meg az ügyfélnek / PDF-ben)
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: C.muted }}>Összes beszerzési ár</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{ft(profitOsszesito.beszerzesOssz)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.muted }}>Összes eladási ár</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{ft(profitOsszesito.eladasOssz)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.muted }}>Anyag haszon</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.accentDark }}>
                {ft(profitOsszesito.anyagHaszonFt)} <span style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>({profitOsszesito.anyagHaszonPct.toFixed(1)}%)</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: C.muted }}>Munkadíj összeg (kivitelezés)</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{ft(profitOsszesito.munkadijOsszeg)}</div>
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <div style={{ fontSize: 10, color: C.muted }}>Teljes ajánlat profit (anyag haszon + munkadíj)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>
                {ft(profitOsszesito.teljesProfitFt)} <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>({profitOsszesito.teljesProfitPct.toFixed(1)}% az ajánlat nettó összegéből)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── TAB 2: Összefoglaló ──────────────────────────────────────────────────

  function renderOsszefoglaló() {
    const aktivTetelek = computed.fo.filter(t => t.aktiv && t.netto_osszeg > 0);

    function getTipusTartalom(t) {
      const def = FO_TETELEK.find(f => f.id === t.id);
      if (def?.termek) {
        const parts = [];
        if (t.tipus) parts.push(t.tipus);
        if (t.mennyiseg) parts.push(`${t.mennyiseg} ${t.egyseg || "db"}`);
        return parts.join(", ");
      }
      return null; // composite items show ugyfel_leiras in the leírás column
    }

    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            Így látja az ügyfél az ajánlatot. Belső kalkuláció nem jelenik meg.
          </p>
          {!isNew && (
            <button onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: C.accentDark, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: FONT, fontWeight: 700, fontSize: 13 }}>
              <Printer size={15} /> PDF nyomtatás
            </button>
          )}
        </div>

        {/* Fejléc preview */}
        <div style={{ border: `2px solid ${C.border}`, borderTop: `4px solid ${C.accentDark}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ background: C.accentDark, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontFamily: FONT_HEADING, fontWeight: 800, fontSize: 20, color: "#fff", letterSpacing: 3 }}>E.D.I.</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", letterSpacing: 2, textTransform: "uppercase" }}>Solutions Kft.</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, color: "rgba(255,255,255,0.75)" }}>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>ÁRAJÁNLAT</div>
              {ajanlat?.ajanlatkod && <div style={{ color: C.accent, fontWeight: 700 }}>{ajanlat.ajanlatkod}</div>}
            </div>
          </div>
          <div style={{ padding: "14px 18px", background: "#fff" }}>
            <p style={{ fontWeight: 700, color: C.text, margin: "0 0 2px" }}>{form.clientNev || "—"}</p>
            {form.clientCim && <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{form.clientCim}</p>}
          </div>
        </div>

        {/* Tétel táblázat */}
        <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
              <thead>
                <tr style={{ background: C.accentDark }}>
                  {["#", "Megnevezés", "Típus / tartalom", "Nettó összeg"].map((h, i) => (
                    <th key={h} style={{
                      padding: "10px 14px", color: "#fff", fontSize: 11, fontWeight: 700,
                      textAlign: i === 3 ? "right" : "left",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {aktivTetelek.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: "24px", textAlign: "center", color: C.muted, fontSize: 13 }}>Jelöld be a tételeket a Kalkulátor fülön</td></tr>
                ) : (
                  aktivTetelek.map((t, i) => {
                    const def = FO_TETELEK.find(f => f.id === t.id);
                    const tipusTartalom = getTipusTartalom(t);
                    const leiras = t.ugyfel_leiras || "";

                    return (
                      <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : "#F7FBFB", verticalAlign: "top" }}>
                        <td style={{ padding: "10px 14px", color: C.muted, fontSize: 12, whiteSpace: "nowrap" }}>{i + 1}.</td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{t.label}</div>
                          {!def?.termek && leiras && (
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{leiras}</div>
                          )}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          {def?.termek ? (
                            <>
                              {tipusTartalom && <div style={{ fontSize: 13, color: C.text }}>{tipusTartalom}</div>}
                              {leiras && <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{leiras}</div>}
                            </>
                          ) : null}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, fontSize: 14, color: C.text, whiteSpace: "nowrap" }}>
                          {ft(t.netto_osszeg)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Összesítő */}
          <div style={{ borderTop: `2px solid ${C.border}`, padding: "12px 14px", background: "#F7FBFB" }}>
            {[
              { label: "Összesen nettó:", val: computed.netto, bold: false },
              { label: `ÁFA (${form.afa_szazalek}%):`, val: computed.afa, bold: false },
              { label: "Összesen bruttó:", val: computed.brutto, bold: true },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "flex-end", gap: 32, marginBottom: r.bold ? 0 : 4 }}>
                <span style={{ fontSize: r.bold ? 15 : 13, fontWeight: r.bold ? 800 : 500, color: r.bold ? C.accentDark : C.textSub }}>{r.label}</span>
                <span style={{ fontSize: r.bold ? 16 : 13, fontWeight: r.bold ? 800 : 600, color: r.bold ? C.accentDark : C.text, minWidth: 130, textAlign: "right" }}>{ft(r.val)}</span>
              </div>
            ))}
          </div>
        </div>

        {form.megjegyzes && (
          <div style={{ border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.accent}`, borderRadius: 6, padding: "10px 14px", fontSize: 13, color: C.textSub }}>
            <strong style={{ color: C.accentDark }}>Megjegyzés:</strong> {form.megjegyzes}
          </div>
        )}
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "20px max(16px, min(28px, 3vw))", fontFamily: FONT }}>

      {/* Fejléc */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 9, cursor: "pointer", color: C.textSub, fontFamily: FONT, fontWeight: 600, fontSize: 13 }}>
          <ArrowLeft size={14} /> Vissza
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 800, color: C.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {isNew ? "Új árajánlat" : `Ajánlat szerkesztése – ${ajanlat?.ajanlatkod}`}
          </h1>
        </div>
        <div style={{ background: C.accentLight, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "8px 16px", textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.7 }}>Bruttó összeg</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.accentDark }}>{ft(computed.brutto)}</div>
        </div>
        <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: FONT, fontWeight: 700, fontSize: 14, boxShadow: `0 4px 14px rgba(24,172,160,.3)`, flexShrink: 0 }}>
          <Save size={15} /> {isNew ? "Létrehozás" : "Mentés"}
        </button>
      </div>

      {hiba && (
        <div style={{ background: C.dangerLight, border: `1.5px solid #FECACA`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.danger, fontWeight: 600, marginBottom: 14 }}>
          ⚠ {hiba}
        </div>
      )}

      <div style={{ background: "#fff", borderRadius: 14, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ borderBottom: `2px solid ${C.border}`, display: "flex", padding: "0 14px", overflowX: "auto" }}>
          <TabBtn active={tab === 0} step={1} label="Fejléc és ügyfél"   onClick={() => setTab(0)} />
          <TabBtn active={tab === 1} step={2} label="Tételek kalkulátor" onClick={() => setTab(1)} />
          <TabBtn active={tab === 2} step={3} label="Összefoglaló / PDF" onClick={() => setTab(2)} />
        </div>
        <div style={{ padding: 24, maxHeight: "calc(100vh - 260px)", overflowY: "auto" }}>
          {tab === 0 && renderFejlec()}
          {tab === 1 && renderTetelek()}
          {tab === 2 && renderOsszefoglaló()}
        </div>
      </div>
    </div>
  );
}
