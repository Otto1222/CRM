import { useState } from "react";
import { Plus, ExternalLink, FilePlus, Users, ChevronDown, X, Save, Package } from "lucide-react";
import { C, FONT, MUNKALAP_TIPUSOK } from "../../../lib/constants.js";
import { linkMunkalap, unlinkMunkalap } from "../projekt.service.js";
import { updateWorkorder, createWorkorder, nextWorkorderNumber } from "../../../services/workorder.service.js";
import { getAktivCsapatok } from "../../csapatok/csapat.service.js";
import { CSAPAT_KIOSZTASI_TIPUSOK } from "../../csapatok/csapat.schema.js";
import { formatMunkalapAzonosito } from "../../../lib/azonositoHelper.js";
import { assignAnyagokToMunkalap, getKivitelezesiCsomagByProjektId } from "../../kivitelezesi_csomag/kivitelezesiCsomag.service.js";
import KiviCsomagKiadasPicker from "../../../components/KiviCsomagKiadasPicker.jsx";
import AnyagKosarPicker from "../../../components/AnyagKosarPicker.jsx";

// Több munkalapos munkánál (javítás, pótmunka, több napos kivitelezés) egy
// későbbi munkalap kiosztásakor előfordulhat, hogy olyan anyag is kell, ami
// az eredeti, projekt-létrehozáskori listában nem szerepelt (ld. "plusz
// anyag" szekció lent) – ilyenkor a két kosarat (meglévő listából + plusz)
// anyagtorzsId szerint össze kell vonni, mennyiség-összegzéssel, mielőtt a
// kiadás mentődik – így egy véletlenül mindkét helyen kiválasztott anyag
// sem duplikálódik/vész el.
function mergeAnyagKosarak(a, b) {
  const map = new Map();
  for (const item of [...a, ...b]) {
    const menny = Number(item.mennyiseg) || 0;
    if (!item.anyagtorzsId || menny <= 0) continue;
    const meglevo = map.get(item.anyagtorzsId);
    if (meglevo) meglevo.mennyiseg += menny;
    else map.set(item.anyagtorzsId, { ...item, mennyiseg: menny });
  }
  return Array.from(map.values());
}

// ─── Csapat Kiosztás Panel (PM/Admin kezeli) ─────────────────

function CsapatKiosztasPanel({ munkalap }) {
  const csapatok   = getAktivCsapatok();
  const [kiosztasok, setKiosztasok] = useState(munkalap.csapatKiosztasok || []);
  const [mentve, setMentve] = useState(false);

  const [ujCsapatId, setUjCsapatId] = useState("");
  const [ujTipus,    setUjTipus]    = useState("focsapat");
  const [ujDatumTol, setUjDatumTol] = useState("");
  const [ujDatumIg,  setUjDatumIg]  = useState("");
  const [ujMegjegyzes, setUjMegjegyzes] = useState("");

  function handleAdd() {
    if (!ujCsapatId) return;
    const cs = csapatok.find(c => c.id === ujCsapatId);
    const uj = {
      id:         `kio_${crypto.randomUUID()}`,
      csapatId:   ujCsapatId,
      csapatNev:  cs?.nev || "",
      csapatSzin: cs?.szin || C.accent,
      tipus:      ujTipus,
      datumTol:   ujDatumTol,
      datumIg:    ujDatumIg,
      megjegyzes: ujMegjegyzes,
    };
    const updated = [...kiosztasok, uj];
    setKiosztasok(updated);
    setUjCsapatId(""); setUjTipus("focsapat");
    setUjDatumTol(""); setUjDatumIg(""); setUjMegjegyzes("");
  }

  function handleRemove(id) {
    setKiosztasok(kiosztasok.filter(k => k.id !== id));
  }

  function handleSave() {
    updateWorkorder(munkalap.id, { csapatKiosztasok: kiosztasok });
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "munkalapok" } }));
    setMentve(true);
    setTimeout(() => setMentve(false), 2000);
  }

  const inpS = {
    padding: "7px 10px", border: `1.5px solid ${C.border}`, borderRadius: 8,
    fontSize: 12, fontFamily: FONT, outline: "none", background: "#fff",
  };

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.bg}` }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .7, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 5 }}>
        <Users size={12} /> Kiosztott csapatok ({kiosztasok.length} db)
      </p>

      {kiosztasok.map(k => (
        <div key={k.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: C.bg, border: `1px solid ${C.border}`, borderLeft: `3px solid ${k.csapatSzin || C.accent}`, borderRadius: 8, marginBottom: 5 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{k.csapatNev || k.csapatId}</span>
              <span style={{ fontSize: 10, fontWeight: 700, background: k.tipus === "focsapat" ? C.accentLight : "#F0FDF4", color: k.tipus === "focsapat" ? C.accent : C.success, padding: "1px 7px", borderRadius: 20 }}>
                {k.tipus === "focsapat" ? "Főcsapat" : "Segítő csapat"}
              </span>
              {k.datumTol && (
                <span style={{ fontSize: 10, color: C.muted }}>{k.datumTol}{k.datumIg ? ` – ${k.datumIg}` : ""}</span>
              )}
            </div>
            {k.megjegyzes && <p style={{ margin: "2px 0 0", fontSize: 11, color: C.muted, fontStyle: "italic" }}>{k.megjegyzes}</p>}
          </div>
          <button onClick={() => handleRemove(k.id)} style={{ padding: "3px 5px", background: C.dangerLight, color: C.danger, border: "none", borderRadius: 5, cursor: "pointer" }}>
            <X size={11} />
          </button>
        </div>
      ))}

      <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", borderRadius: 10, padding: "10px 12px", marginTop: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#065F46", margin: "0 0 8px" }}>Új csapat kiosztása</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
          <select value={ujCsapatId} onChange={e => setUjCsapatId(e.target.value)} style={{ ...inpS, gridColumn: "span 2" }}>
            <option value="">— Válassz csapatot —</option>
            {csapatok.map(cs => (
              <option key={cs.id} value={cs.id}>{cs.nev} {cs.tipus === "alvallalkozo" ? "(AV)" : "(Saját)"}</option>
            ))}
          </select>
          <select value={ujTipus} onChange={e => setUjTipus(e.target.value)} style={inpS}>
            {CSAPAT_KIOSZTASI_TIPUSOK.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <input type="date" value={ujDatumTol} onChange={e => setUjDatumTol(e.target.value)}
            placeholder="Dátumtól" style={inpS} title="Kezdő dátum" />
          <input type="date" value={ujDatumIg} onChange={e => setUjDatumIg(e.target.value)}
            placeholder="Dátumig" style={inpS} title="Befejező dátum" />
          <input value={ujMegjegyzes} onChange={e => setUjMegjegyzes(e.target.value)}
            placeholder="Megjegyzés (opcionális)" style={{ ...inpS, gridColumn: "span 2" }} />
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button onClick={handleAdd} disabled={!ujCsapatId}
            style={{ flex: 1, padding: "7px 12px", background: ujCsapatId ? C.success : C.border, color: "#fff", border: "none", borderRadius: 7, cursor: ujCsapatId ? "pointer" : "default", fontWeight: 700, fontSize: 12, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Plus size={11} /> Hozzáadás
          </button>
          <button onClick={handleSave}
            style={{ flex: 1, padding: "7px 12px", background: mentve ? C.success : C.accent, color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <Save size={11} /> {mentve ? "Mentve ✓" : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Gyors munkalap létrehozás (inline, projektből) ──────────

function UjMunkalapInlineForm({ projekt, onDone, onCancel, currentUser }) {
  const csapatok = getAktivCsapatok();
  const kiviCsomag = getKivitelezesiCsomagByProjektId(projekt.id);
  const [tipus, setTipus]         = useState("Első kivitelezés");
  const [datum, setDatum]         = useState("");
  const [csapatId, setCsapatId]   = useState(projekt.csapatId || "");
  const [csapatNev, setCsapatNev] = useState(projekt.csapatNev || "");
  const [megjegyzes, setMegjegyzes] = useState("");
  const [hiba, setHiba]           = useState("");
  const [mentve, setMentve]       = useState(false);
  const [anyagKosar, setAnyagKosar] = useState([]);
  const [showAnyagok, setShowAnyagok] = useState(false);
  const [pluszAnyagKosar, setPluszAnyagKosar] = useState([]);
  const [showPluszAnyagok, setShowPluszAnyagok] = useState(false);

  const inpS = {
    padding: "8px 10px", border: `1.5px solid ${C.border}`, borderRadius: 8,
    fontSize: 13, fontFamily: FONT, outline: "none", background: "#fff", width: "100%",
  };

  const preview = nextWorkorderNumber(projekt.projektkod || "ML", tipus);

  function handleCsapatChange(e) {
    const cs = csapatok.find(c => c.id === e.target.value);
    setCsapatId(e.target.value);
    setCsapatNev(cs?.nev || "");
  }

  function handleSave() {
    setHiba("");
    try {
      const munkalap = createWorkorder({
        projektId:     projekt.id,
        projektKod:    projekt.projektkod,
        tipus,
        munkalapTipus: tipus,
        datum,
        clientNev:     projekt.clientNev     || "",
        clientCim:     projekt.clientCim     || "",
        clientTel:     projekt.clientTel     || "",
        clientEmail:   projekt.clientEmail   || "",
        telepitesiCim: projekt.telepitesiCim || projekt.clientCim || "",
        csapatId,
        csapatNev,
        assigneeId:    csapatId,
        assigneeNev:   csapatNev,
        megjegyzes,
        status: "Létrehozva",
      }, currentUser?.name || "");
      linkMunkalap(projekt.id, munkalap.id);
      const teljesAnyagKosar = mergeAnyagKosarak(anyagKosar, pluszAnyagKosar);
      if (teljesAnyagKosar.length > 0) {
        assignAnyagokToMunkalap(projekt, munkalap.id, teljesAnyagKosar, csapatId, currentUser?.name || "");
      }
      setMentve(true);
      setTimeout(() => onDone(), 700);
    } catch (err) {
      setHiba(err.message || "Mentési hiba. Próbáld újra.");
    }
  }

  return (
    <div style={{ background: "#F0FDF4", border: "1.5px solid #86EFAC", borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#065F46", margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
          <FilePlus size={14} /> Új munkalap – {projekt.projektkod} · {projekt.clientNev || "—"}
        </p>
        <button onClick={onCancel} title="Mégsem" style={{ border: "none", background: "none", cursor: "pointer", color: C.muted, padding: 2 }}>
          <X size={15} />
        </button>
      </div>

      <p style={{ fontSize: 11, color: C.success, background: C.successLight, padding: "4px 10px", borderRadius: 7, marginBottom: 12, display: "inline-block" }}>
        Munkalapszám: <strong>{preview}</strong>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>
            Típus <span style={{ color: C.danger }}>*</span>
          </label>
          <select value={tipus} onChange={e => setTipus(e.target.value)} style={inpS}>
            {MUNKALAP_TIPUSOK.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>Tervezett dátum</label>
          <input type="date" value={datum} onChange={e => setDatum(e.target.value)} style={inpS} />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>Csapat</label>
          <select value={csapatId} onChange={handleCsapatChange} style={inpS}>
            <option value="">— Nincs csapat kiosztva —</option>
            {csapatok.map(cs => <option key={cs.id} value={cs.id}>{cs.nev} {cs.tipus === "alvallalkozo" ? "(AV)" : "(Saját)"}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: "block", marginBottom: 4 }}>Megjegyzés</label>
          <input value={megjegyzes} onChange={e => setMegjegyzes(e.target.value)} placeholder="Opcionális…" style={inpS} />
        </div>
      </div>

      <button type="button" onClick={() => setShowAnyagok(s => !s)}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: showAnyagok ? C.accentLight : "#fff", color: C.accent, border: `1.5px solid ${C.accent}`, borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: FONT, marginBottom: 10 }}>
        <Package size={13} /> Anyagok, amit a csapat visz {anyagKosar.length > 0 ? `(${anyagKosar.length})` : ""}
        <ChevronDown size={11} style={{ transform: showAnyagok ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {showAnyagok && (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: C.muted, margin: "0 0 10px" }}>
            A projekt tételes anyaglistájából add meg, mennyit visz magával ez a csapat – ez a Kivitelezési
            Csomag kiadott mennyiségébe kerül, a telepítő a beszerelés után validálja a felhasználást.
          </p>
          <KiviCsomagKiadasPicker tetelek={kiviCsomag?.tetelek || []} value={anyagKosar} onChange={setAnyagKosar} />
        </div>
      )}

      {/* Több munkalapos munkánál (javítás, pótmunka, több napos kivitelezés)
          előfordulhat, hogy olyan anyag is kell, ami a projekt eredeti,
          létrehozáskori listájában nem szerepelt – ez a teljes anyagtörzsből
          választható, és automatikusan bekerül a projekt tételes listájába is. */}
      <button type="button" onClick={() => setShowPluszAnyagok(s => !s)}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", background: showPluszAnyagok ? C.accentLight : "#fff", color: C.accent, border: `1.5px solid ${C.border}`, borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: FONT, marginBottom: 10 }}>
        <Plus size={13} /> Plusz anyag, ami nem volt az eredeti listán {pluszAnyagKosar.length > 0 ? `(${pluszAnyagKosar.length})` : ""}
        <ChevronDown size={11} style={{ transform: showPluszAnyagok ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {showPluszAnyagok && (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: C.muted, margin: "0 0 10px" }}>
            Javításhoz, pótmunkához vagy több napos kivitelezéshez szükséges, eredetileg nem tervezett anyag –
            ez automatikusan bekerül a projekt tételes anyaglistájába is (Kivitelezési Csomag), nemcsak ennek a
            munkalapnak a kiadásába.
          </p>
          <AnyagKosarPicker value={pluszAnyagKosar} onChange={setPluszAnyagKosar} />
        </div>
      )}

      <div style={{ fontSize: 11, color: C.textSub, background: C.bg, borderRadius: 7, padding: "6px 10px", marginBottom: 12 }}>
        Ügyfél: <strong>{projekt.clientNev || "—"}</strong>
        {(projekt.telepitesiCim || projekt.clientCim) && (
          <> · Helyszín: <strong>{projekt.telepitesiCim || projekt.clientCim}</strong></>
        )}
      </div>

      {hiba  && <p style={{ color: C.danger, fontSize: 12, marginBottom: 8 }}>⚠ {hiba}</p>}
      {mentve && <p style={{ color: C.success, fontSize: 12, marginBottom: 8 }}>✓ Munkalap létrehozva – lista frissül…</p>}

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={handleSave} disabled={mentve}
          style={{ flex: 1, padding: "9px 14px", background: mentve ? C.success : C.accent, color: "#fff", border: "none", borderRadius: 8, cursor: mentve ? "default" : "pointer", fontWeight: 700, fontSize: 13, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <Save size={13} /> {mentve ? "Létrehozva ✓" : "Munkalap létrehozása"}
        </button>
        <button onClick={onCancel}
          style={{ padding: "9px 16px", background: C.bg, color: C.muted, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT }}>
          Mégsem
        </button>
      </div>
    </div>
  );
}

// ─── Fő komponens ─────────────────────────────────────────────

export default function TabMunkalapok({ projekt, munkalapok, onNavigate, currentUser }) {
  const linked = (munkalapok || []).filter(
    (m) => m.projektId === projekt.id || projekt.munkalapIds?.includes(m.id)
  );

  const unlinked = (munkalapok || []).filter(
    (m) => !m.projektId && !projekt.munkalapIds?.includes(m.id)
  );

  const [showLink,    setShowLink]    = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedId,  setExpandedId]  = useState(null);

  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: C.text }}>
          Kapcsolódó munkalapok ({linked.length} db)
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          {!showNewForm && (
            <button onClick={() => { setShowNewForm(true); setShowLink(false); }}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: C.success, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT }}>
              <FilePlus size={14} /> Új munkalap
            </button>
          )}
          <button onClick={() => { setShowLink(s => !s); setShowNewForm(false); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: showLink ? C.bg : "#fff", color: C.accent, border: `1.5px solid ${C.accent}`, borderRadius: 9, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: FONT }}>
            <Plus size={14} /> Meglévő hozzárendelése
          </button>
        </div>
      </div>

      {showNewForm && (
        <UjMunkalapInlineForm
          projekt={projekt}
          currentUser={currentUser}
          onDone={() => setShowNewForm(false)}
          onCancel={() => setShowNewForm(false)}
        />
      )}

      {showLink && unlinked.length > 0 && (
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 10 }}>Szabad munkalapok (kattints a hozzárendeléshez):</p>
          {unlinked.slice(0, 20).map((m) => (
            <div key={m.id} onClick={() => { linkMunkalap(projekt.id, m.id); setShowLink(false); }}
              style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", borderRadius: 8, background: "#fff", border: `1px solid ${C.border}`, marginBottom: 6, cursor: "pointer" }}>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{formatMunkalapAzonosito(m)}</span>
              <span style={{ fontSize: 12, color: C.muted }}>{m.clientNev || "—"} · {m.status}</span>
            </div>
          ))}
        </div>
      )}

      {linked.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>
          <p>Még nincs hozzárendelt munkalap</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {linked.map((m) => {
            const kiosztasDb = (m.csapatKiosztasok || []).length;
            const isExpanded = expandedId === m.id;
            return (
              <div key={m.id} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: C.accent, fontSize: 13 }}>{formatMunkalapAzonosito(m)}</span>
                      <span style={{ fontSize: 11, background: C.bg, color: C.muted, padding: "2px 8px", borderRadius: 20, fontWeight: 600 }}>{m.status}</span>
                      {m.munkalapTipus && <span style={{ fontSize: 11, color: C.muted }}>{m.munkalapTipus}</span>}
                      {kiosztasDb > 0 && (
                        <span style={{ fontSize: 11, background: C.accentLight, color: C.accent, padding: "2px 8px", borderRadius: 20, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
                          <Users size={10} /> {kiosztasDb} csapat
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: C.muted, margin: "4px 0 0" }}>
                      {m.clientNev || "—"} · {m.assigneeNev || "—"} · {m.date || m.datum || "—"}
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setExpandedId(isExpanded ? null : m.id)}
                      title="Csapatok kiosztása"
                      style={{ padding: "6px 10px", background: isExpanded ? C.accentLight : C.bg, color: isExpanded ? C.accent : C.muted, border: `1.5px solid ${C.border}`, borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontFamily: FONT }}>
                      <Users size={13} />
                      Csapatok
                      <ChevronDown size={11} style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
                    </button>
                    {onNavigate && (
                      <button onClick={() => onNavigate(m)}
                        style={{ padding: "6px 10px", background: C.accentLight, color: C.accent, border: "none", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                        <ExternalLink size={13} /> Megnyit
                      </button>
                    )}
                    <button onClick={() => unlinkMunkalap(projekt.id, m.id)}
                      style={{ padding: "6px 10px", background: C.dangerLight, color: C.danger, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12 }}>
                      Leválaszt
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ padding: "0 16px 14px", borderTop: `1px solid ${C.bg}` }}>
                    <CsapatKiosztasPanel munkalap={m} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}