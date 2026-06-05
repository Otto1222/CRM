import { useState, useMemo } from "react";
import { ArrowLeft, Save, Printer, Plus, Trash2, ChevronDown, ChevronRight, Info } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../lib/constants";
import { ft } from "../../lib/helpers";
import { loadLocal } from "../../lib/localDb";
import {
  FO_TETELEK, AJANLAT_STATUSZOK, makeFoTetelek, DEFAULT_KIVI_KALKULATOR,
  computeFoTetelek, computeKiviOsszeg,
} from "./ajanlat.schema";
import { createAjanlat, updateAjanlat } from "./ajanlat.service";
import { printAjanlat } from "./ajanlatPrint";

const INP = {
  width: "100%", boxSizing: "border-box", padding: "9px 12px",
  border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 14,
  fontFamily: FONT, outline: "none", background: "#FAFAF9",
  color: C.text,
};

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

export default function AjanlatEditor({ ajanlat, onBack, onSaved, currentUser }) {
  const isNew = !ajanlat?.id;
  const ugyfelek = useMemo(() => loadLocal("ugyfelek") || [], []);

  const [tab, setTab]   = useState(0);
  const [hiba, setHiba] = useState("");
  const [exp, setExp]   = useState(new Set()); // expanded fotetel ids

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
                    ? ajanlat.fo_tetelek
                    : makeFoTetelek(),
    reszlet_tetelek: ajanlat?.reszlet_tetelek || [],
    kivi_kalkulator: { ...DEFAULT_KIVI_KALKULATOR, ...(ajanlat?.kivi_kalkulator || {}) },
  }));

  // Live computed values
  const computed = useMemo(() => {
    const fo = computeFoTetelek(form.fo_tetelek, form.reszlet_tetelek, form.kivi_kalkulator);
    const netto   = fo.filter(t => t.aktiv).reduce((s, t) => s + t.netto_osszeg, 0);
    const afa     = netto * (Number(form.afa_szazalek) || 0) / 100;
    return { fo, netto, afa, brutto: netto + afa };
  }, [form]);

  function upd(k, v)    { setForm(p => ({ ...p, [k]: v })); if (hiba) setHiba(""); }
  function updFo(id, field, val) {
    setForm(p => ({ ...p, fo_tetelek: p.fo_tetelek.map(t => t.id === id ? { ...t, [field]: val } : t) }));
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

  function handleSave() {
    if (!form.nev?.trim())       { setHiba("Az ajánlat megnevezése kötelező."); setTab(0); return; }
    if (!form.clientNev?.trim()) { setHiba("Az ügyfél neve kötelező."); setTab(0); return; }
    const saveData = {
      ...form,
      fo_tetelek: computed.fo,
      osszeg: computed.netto,
    };
    if (isNew) createAjanlat(saveData, currentUser);
    else updateAjanlat(ajanlat.id, saveData);
    onSaved();
  }

  function handlePrint() {
    const snap = {
      ...ajanlat,
      ...form,
      fo_tetelek: computed.fo,
      osszeg: computed.netto,
      ajanlatkod: ajanlat?.ajanlatkod || "—",
      keszitette: currentUser?.name || "",
    };
    printAjanlat(snap);
  }

  function toggleExp(id) {
    setExp(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  // ─── TAB 0: Fejléc ─────────────────────────────────────────────────────────

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
          <input type="number" value={form.afa_szazalek} onChange={e => upd("afa_szazalek", e.target.value)}
            min={0} max={100} style={INP} />
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

  // ─── TAB 1: Tételek ────────────────────────────────────────────────────────

  function renderTetelek() {
    return (
      <div>
        <div style={{ background: C.accentLight, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: C.accentDark, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <Info size={14} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>A <strong>Védelmi eszközök</strong> és <strong>Villanyszerelési anyagok</strong> soroknál a tételes lebontást töltsd ki – az ügyfél csak az összesített értéket látja. A többi sornál közvetlenül add meg a nettó összeget.</span>
        </div>

        {FO_TETELEK.map(def => {
          const foTetel = form.fo_tetelek.find(t => t.id === def.id) || { id: def.id, aktiv: false, netto_osszeg: 0 };
          const cFo = computed.fo.find(t => t.id === def.id);
          const ossz = cFo?.netto_osszeg || 0;
          const isExp = exp.has(def.id);
          const reszletek = form.reszlet_tetelek.filter(t => t.fotetel === def.id);

          return (
            <div key={def.id} style={{ border: `1.5px solid ${foTetel.aktiv ? C.border : "#EEF0F3"}`, borderRadius: 10, marginBottom: 8, background: foTetel.aktiv ? "#fff" : "#FAFAF9", overflow: "hidden" }}>
              {/* Fő sor */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px" }}>
                <input type="checkbox" checked={foTetel.aktiv} onChange={e => updFo(def.id, "aktiv", e.target.checked)}
                  style={{ width: 17, height: 17, accentColor: C.accent, cursor: "pointer", flexShrink: 0 }} />
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: foTetel.aktiv ? C.text : C.muted, fontFamily: FONT }}>
                  {def.label}
                </span>

                {/* Összeg / input */}
                {def.osszetett ? (
                  <span style={{ fontWeight: 700, fontSize: 14, color: ossz > 0 ? C.accent : C.muted, whiteSpace: "nowrap", minWidth: 120, textAlign: "right" }}>
                    {ossz > 0 ? ft(ossz) : "—"}
                    <span style={{ fontSize: 10, color: C.muted, marginLeft: 4 }}>(auto)</span>
                  </span>
                ) : def.kivi ? (
                  <span style={{ fontWeight: 700, fontSize: 14, color: ossz > 0 ? C.accent : C.muted, whiteSpace: "nowrap", minWidth: 120, textAlign: "right" }}>
                    {ossz > 0 ? ft(ossz) : "—"}
                  </span>
                ) : (
                  <input
                    type="number"
                    value={foTetel.netto_osszeg || ""}
                    onChange={e => updFo(def.id, "netto_osszeg", Number(e.target.value) || 0)}
                    placeholder="0"
                    disabled={!foTetel.aktiv}
                    style={{ ...INP, width: 140, textAlign: "right", fontWeight: 600, fontSize: 14, opacity: foTetel.aktiv ? 1 : 0.4 }}
                  />
                )}

                {/* Expand gomb */}
                {(def.osszetett || def.kivi) && (
                  <button onClick={() => toggleExp(def.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: C.muted, padding: 4, display: "flex" }}>
                    {isExp ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                )}
              </div>

              {/* Részletek panel */}
              {isExp && def.osszetett && (
                <div style={{ borderTop: `1px solid ${C.border}`, background: "#F7FBFB", padding: "12px 14px" }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: C.textSub, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
                    Tételes bontás (belső kalkuláció)
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
                                placeholder="pl. AC T1+T2 túlfesz" style={{ ...INP, padding: "5px 8px", fontSize: 13 }} />
                            </td>
                            <td style={{ padding: "5px 8px", width: 70 }}>
                              <input type="number" value={t.mennyiseg} onChange={e => updReszlet(t.id, "mennyiseg", e.target.value)}
                                min={0} style={{ ...INP, padding: "5px 8px", fontSize: 13, textAlign: "center" }} />
                            </td>
                            <td style={{ padding: "5px 8px", width: 70 }}>
                              <select value={t.egyseg} onChange={e => updReszlet(t.id, "egyseg", e.target.value)}
                                style={{ ...INP, padding: "5px 8px", fontSize: 13 }}>
                                {["db", "m", "m²", "csomag", "óra"].map(u => <option key={u}>{u}</option>)}
                              </select>
                            </td>
                            <td style={{ padding: "5px 8px", width: 120 }}>
                              <input type="number" value={t.netto_egysegar} onChange={e => updReszlet(t.id, "netto_egysegar", e.target.value)}
                                min={0} placeholder="0" style={{ ...INP, padding: "5px 8px", fontSize: 13, textAlign: "right" }} />
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
                  <button onClick={() => addReszlet(def.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: C.accentLight, color: C.accent, border: `1.5px dashed ${C.accent}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT }}>
                    <Plus size={13} /> Tétel hozzáadása
                  </button>
                  {reszletek.length > 0 && (
                    <p style={{ textAlign: "right", fontWeight: 700, color: C.accentDark, fontSize: 13, marginTop: 8 }}>
                      Részösszeg: {ft(reszletek.reduce((s, t) => s + (t.netto_osszeg || 0), 0))}
                    </p>
                  )}
                </div>
              )}

              {/* Kivitelezés kalkulátor */}
              {isExp && def.kivi && (
                <div style={{ borderTop: `1px solid ${C.border}`, background: "#F7FBFB", padding: "12px 14px" }}>
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
                          {form.kivi_kalkulator.panel_db} panel × {ft(form.kivi_kalkulator.telepitesi_dij_per_panel).replace(" Ft","")}&nbsp;Ft
                          + {ft(form.kivi_kalkulator.kiszallasi_dij)} kiszállás
                          + {ft(form.kivi_kalkulator.emelőgep_dij)} emelőgép
                          + {form.kivi_kalkulator.tobblet_napok} nap × {ft(form.kivi_kalkulator.napi_dij).replace(" Ft","")}&nbsp;Ft
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
                        placeholder="0" style={{ ...INP, maxWidth: 200, fontWeight: 600 }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ─── TAB 2: Összefoglaló ───────────────────────────────────────────────────

  function renderOsszefoglaló() {
    const aktivTetelek = computed.fo.filter(t => t.aktiv && t.netto_osszeg > 0);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            Így látja az ügyfél az ajánlatot. Részletes bontás nem jelenik meg.
          </p>
          {!isNew && (
            <button onClick={handlePrint} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 18px", background: C.accentDark, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: FONT, fontWeight: 700, fontSize: 13 }}>
              <Printer size={15} /> PDF nyomtatás
            </button>
          )}
        </div>

        {/* Ügyfél fejléc preview */}
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
            {form.clientCim   && <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{form.clientCim}</p>}
            {form.clientTel   && <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>{form.clientTel}</p>}
          </div>
        </div>

        {/* Tétel táblázat */}
        <div style={{ border: `1.5px solid ${C.border}`, borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: C.accentDark }}>
                <th style={{ padding: "10px 14px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 700 }}>#</th>
                <th style={{ padding: "10px 14px", textAlign: "left", color: "#fff", fontSize: 11, fontWeight: 700 }}>Megnevezés</th>
                <th style={{ padding: "10px 14px", textAlign: "right", color: "#fff", fontSize: 11, fontWeight: 700 }}>Nettó összeg</th>
              </tr>
            </thead>
            <tbody>
              {aktivTetelek.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: "24px", textAlign: "center", color: C.muted, fontSize: 13 }}>Jelöld be a tételeket a Kalkulátor fülön</td></tr>
              ) : (
                aktivTetelek.map((t, i) => (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? "#fff" : "#F7FBFB" }}>
                    <td style={{ padding: "10px 14px", color: C.muted, fontSize: 12 }}>{i + 1}.</td>
                    <td style={{ padding: "10px 14px", fontWeight: 500, fontSize: 14, color: C.text }}>{t.label}</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, fontSize: 14, color: C.text, whiteSpace: "nowrap" }}>{ft(t.netto_osszeg)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {/* Összesítő */}
          <div style={{ borderTop: `2px solid ${C.border}`, padding: "12px 14px", background: "#F7FBFB" }}>
            {[
              { label: "Összesen nettó:", val: computed.netto, bold: false },
              { label: `ÁFA (${form.afa_szazalek}%):`, val: computed.afa, bold: false },
              { label: "Összesen bruttó:", val: computed.brutto, bold: true },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "flex-end", gap: 32, marginBottom: r.bold ? 0 : 4 }}>
                <span style={{ fontSize: r.bold ? 15 : 13, fontWeight: r.bold ? 800 : 500, color: r.bold ? C.accentDark : C.textSub }}>{r.label}</span>
                <span style={{ fontSize: r.bold ? 16 : 13, fontWeight: r.bold ? 800 : 600, color: r.bold ? C.accentDark : C.text, minWidth: 120, textAlign: "right" }}>{ft(r.val)}</span>
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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: "20px max(16px, min(28px, 3vw))", fontFamily: FONT }}>

      {/* Fejléc */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "#fff", border: `1.5px solid ${C.border}`, borderRadius: 9, cursor: "pointer", color: C.textSub, fontFamily: FONT, fontWeight: 600, fontSize: 13 }}>
          <ArrowLeft size={14} /> Vissza
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 800, color: C.text, margin: 0 }}>
            {isNew ? "Új árajánlat" : `Ajánlat szerkesztése – ${ajanlat?.ajanlatkod}`}
          </h1>
        </div>
        {/* Live total */}
        <div style={{ background: C.accentLight, border: `1.5px solid ${C.border}`, borderRadius: 10, padding: "8px 16px", textAlign: "right" }}>
          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.7 }}>Bruttó összeg</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.accentDark }}>{ft(computed.brutto)}</div>
        </div>
        <button onClick={handleSave} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 20px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontFamily: FONT, fontWeight: 700, fontSize: 14, boxShadow: `0 4px 14px rgba(24,172,160,.3)` }}>
          <Save size={15} /> {isNew ? "Létrehozás" : "Mentés"}
        </button>
      </div>

      {/* Hiba */}
      {hiba && (
        <div style={{ background: C.dangerLight, border: `1.5px solid #FECACA`, borderRadius: 10, padding: "10px 14px", fontSize: 13, color: C.danger, fontWeight: 600, marginBottom: 14 }}>
          ⚠ {hiba}
        </div>
      )}

      {/* Tabek */}
      <div style={{ background: "#fff", borderRadius: 14, border: `1.5px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ borderBottom: `2px solid ${C.border}`, display: "flex", padding: "0 14px" }}>
          <TabBtn active={tab === 0} step={1} label="Fejléc és ügyfél"  onClick={() => setTab(0)} />
          <TabBtn active={tab === 1} step={2} label="Tételek kalkulátor" onClick={() => setTab(1)} />
          <TabBtn active={tab === 2} step={3} label="Összefoglaló / PDF"  onClick={() => setTab(2)} />
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
