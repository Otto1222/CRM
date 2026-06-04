import { useState, useMemo } from "react";
import { X, Save, Navigation, TrendingUp } from "lucide-react";
import { FONT, FONT_HEADING } from "../../lib/constants.js";
import { getUsers } from "../../lib/crmUsers.js";
import { loadLocal, saveLocal } from "../../lib/localDb.js";
import { PROJEKT_STATUSZOK } from "./projekt.schema.js";
import { getAktivFovallalkozok, findSzabaly } from "../fovallalkozok/fovallalkozo.service.js";
import { getAktivCsapatok } from "../csapatok/csapat.service.js";
import { autoFillPenzugy } from "../../services/financialCalculation.service.js";
import { calcProjektElszamolas, buildInput } from "../../services/settlementCalculator.js";
import { getAktivMunkatipusok } from "../munkatipusok/munkatipus.service.js";
import { createProjekt, updateProjekt } from "./projekt.service.js";
import { createInitialWorkorderForProject } from "../../services/projectWorkorder.service.js";
import { driveCreateProjektFolder } from "../../lib/driveApi.js";
import {
  validateProjectBeforeSave,
  shouldCreateInitialWorkorder,
  getInitialWorkorderTypeByProjectStatus,
} from "./projectRules.js";
import AddressSearch from "../../components/AddressSearch.jsx";
import { calcRoundTripKm } from "../../lib/geoService.js";
const Field = ({ label, children, half }) => (
  <div style={{ gridColumn: half ? "span 1" : "span 2" }}>
    <label
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: "#64748B",
        display: "block",
        marginBottom: 4,
        textTransform: "uppercase",
        letterSpacing: 0.7,
      }}
    >
      {label}
    </label>
    {children}
  </div>
);
const inp = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  border: "1.5px solid #E2E8F0",
  borderRadius: 9,
  fontSize: 14,
  fontFamily: "inherit",
  outline: "none",
  background: "#FAFAFA",
};
export default function ProjektForm({ projekt, onClose, onSaved, currentUser }) {
  const isNew = !projekt?.id;
  const users = getUsers();
  const csapatok = getAktivCsapatok();
  const fovallalkozok = getAktivFovallalkozok();
  const munkatipusok = getAktivMunkatipusok();
  const pmList = users.filter(u => ["Admin", "Projektmenedzser"].includes(u.role));
  const ugyfelek = loadLocal("ugyfelek") || [];
  const [form, setForm] = useState({
    nev: projekt?.nev || "",
    kulsoAzonosito: projekt?.kulsoAzonosito || "",
    tipus: projekt?.tipus || "Napelem telepítés",
    status: projekt?.status || "Felmérésre vár",
    clientId: projekt?.clientId || "",
    clientNev: projekt?.clientNev || "",
    megbizoCeg: projekt?.megbizoCeg || "",
    clientCim: projekt?.clientCim || "",
    clientTel: projekt?.clientTel || "",
    clientEmail: projekt?.clientEmail || "",
    kapcsolattarto: projekt?.kapcsolattarto || "",
    telepitesiCim: projekt?.telepitesiCim || "",
    napelemDb:     projekt?.napelemDb     || 0,
    inverterDb:    projekt?.inverterDb    || 0,
    akkumulatorDb: projekt?.akkumulatorDb ?? (projekt?.akkumulator ? 1 : 0),
    smartMeterDb:  projekt?.smartMeterDb  ?? (projekt?.okosmerő   ? 1 : 0),
    autoTolto: projekt?.autoTolto || false,
    projektvezetoId: projekt?.projektvezetoId || "",
    projektvezetoNev: projekt?.projektvezetoNev || "",
    csapatId: projekt?.csapatId || "",
    csapatNev: projekt?.csapatNev || "",
    tervezettKezdes: projekt?.tervezettKezdes || "",
    tervezettBefejezes: projekt?.tervezettBefejezes || "",
    elfogadottAjanlat: projekt?.elfogadottAjanlat || 0,
    penzugy: projekt?.penzugy || {
      fovallalkoziId: "",
      munkatipus: "",
      elszamolasiSzabalyId: "",
      tavKm: 0,
      csapatLetszam: 1,
      munkanapok: 1,
      darabszam: 1,
      felultBevitel: null,
      keziCsapatBer: null,
      keziUtikoltség: null,
      keziAnyagkoltség: null,
      keziKartérités: null,
      emelőgepKoltseg:     projekt?.penzugy?.emelőgepKoltseg     || 0,
      daruKoltseg:         projekt?.penzugy?.daruKoltseg         || 0,
      szallasKoltseg:      projekt?.penzugy?.szallasKoltseg      || 0,
      bereltEszkozKoltseg: projekt?.penzugy?.bereltEszkozKoltseg || 0,
      irodaAdminKoltseg:   projekt?.penzugy?.irodaAdminKoltseg   || 0,
      egyebKoltseg:        projekt?.penzugy?.egyebKoltseg        || 0,
    },
    megjegyzes: "",
  });
  const [saving, setSaving] = useState(false);
  const [hiba, setHiba] = useState("");
  const [kmCalc, setKmCalc] = useState(false);

  async function handleKmAutoCalc() {
    const cim = form.telepitesiCim || form.clientCim;
    const cs   = csapatok.find(c => c.id === form.csapatId);
    if (!cim || !cs?.telephely) {
      setHiba("A km auto-számításhoz szükséges: telepítési cím ÉS kivitelező csapat (indulási telephely).");
      return;
    }
    setKmCalc(true);
    const res = await calcRoundTripKm(cs.telephely, cim);
    setKmCalc(false);
    if (!res) {
      setHiba("Km kiszámítás sikertelen – ellenőrizd a cím helyesírást.");
      return;
    }
    updPenz("tavKm", res.oda);
    setHiba("");
  }
  function upd(k, v) {
    setForm(p => ({ ...p, [k]: v }));
    if (hiba) setHiba("");
  }
  function handleUgyfél(e) {
    const u = ugyfelek.find(x => x.id === e.target.value);
    if (!u) {
      setForm(p => ({ ...p, clientId: "", clientNev: "", clientCim: "", clientTel: "", clientEmail: "" }));
      return;
    }
    setForm(p => ({
      ...p,
      clientId: u.id,
      clientNev: u.name || "",
      clientCim: u.address || "",
      clientTel: u.phone || "",
      clientEmail: u.email || "",
    }));
    if (hiba) setHiba("");
  }
  function handleCsapat(e) {
    const cs = csapatok.find(x => x.id === e.target.value);
    setForm(p => ({
      ...p,
      csapatId: cs?.id || "",
      csapatNev: cs?.nev || "",
    }));
    if (hiba) setHiba("");
  }
  function handlePM(e) {
    const u = users.find(x => x.id === e.target.value);
    setForm(p => ({
      ...p,
      projektvezetoId: u?.id || "",
      projektvezetoNev: u?.name || "",
    }));
    if (hiba) setHiba("");
  }
  function handleFovallalkozo(fvId) {
    const filled = autoFillPenzugy(fvId, form.penzugy?.munkatipus || "", form.penzugy);
    const sz = findSzabaly(fvId, form.penzugy?.munkatipus || "");
    setForm(p => ({
      ...p,
      penzugy: {
        ...filled,
        fovallalkoziId: fvId,
        elszamolasiSzabalyId: sz?.id || "",
      },
    }));
  }
  function handleMunkatipus(mtId) {
    const filled = autoFillPenzugy(form.penzugy?.fovallalkoziId || "", mtId, form.penzugy);
    const sz = findSzabaly(form.penzugy?.fovallalkoziId || "", mtId);
    setForm(p => ({
      ...p,
      tipus: mtId,
      penzugy: {
        ...filled,
        munkatipus: mtId,
        elszamolasiSzabalyId: sz?.id || "",
      },
    }));
    if (hiba) setHiba("");
  }
  function updPenz(k, v) {
    setForm(p => ({
      ...p,
      penzugy: {
        ...p.penzugy,
        [k]: v === "" ? null : isNaN(Number(v)) ? v : Number(v),
      },
    }));
  }
  async function handleSave() {
    const validation = validateProjectBeforeSave(form);
    if (!validation.ok) {
      setHiba(validation.message);
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        elfogadottAjanlat: Number(form.elfogadottAjanlat) || 0,
        // Backward compat boolean mezők szinkronban az db értékekkel
        akkumulator: (form.akkumulatorDb || 0) > 0,
        okosmerő:    (form.smartMeterDb  || 0) > 0,
        penzugy: {
          ...form.penzugy,
          darabszam: form.napelemDb || form.penzugy?.darabszam || 1,
        },
      };
      delete data.megjegyzes;
      let saved;
      if (isNew) {
        saved = createProjekt({ ...data, driveProjektMappa: "kérve" }, currentUser?.name || "");
        if (shouldCreateInitialWorkorder(saved.status)) {
          const tipus = getInitialWorkorderTypeByProjectStatus(saved.status);
          createInitialWorkorderForProject(saved, {
            tipus,
            status: "Kiosztásra vár",
            user: currentUser?.name || "",
          });
        }
        // Fire-and-forget: Drive mappa létrehozás (no-cors, nem blokkolja a mentést)
        driveCreateProjektFolder(saved).catch(() => {});

        // Auto-ügyfél: ha van ügyfélnév de nincs kiválasztva létező ügyfél → létrehozzuk
        if (!data.clientId && data.clientNev?.trim()) {
          const fv = fovallalkozok.find(f => f.id === (data.penzugy?.fovallalkoziId || ""));
          const forras = fv?.rovidites || (fv ? (fv.nev||"").slice(0,4).toUpperCase() : "Saját");
          const newU = {
            id: `ugy_${Date.now()}`,
            name: data.clientNev,
            phone: data.clientTel || "",
            email: data.clientEmail || "",
            address: data.clientCim || "",
            type: "Magánszemély",
            status: "Aktív",
            forrás: forras,
            fovallalkozoId: fv?.id || "",
            fovallalkozoNev: fv?.nev || "",
            fovallalkozoRovid: fv?.rovidites || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          const uList = loadLocal("ugyfelek") || [];
          saveLocal("ugyfelek", [...uList, newU]);
          updateProjekt(saved.id, { clientId: newU.id }, "");
          window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "ugyfelek" } }));
        } else if (data.clientId && data.penzugy?.fovallalkoziId) {
          // Meglévő ügyfélnél forrás beállítása ha még nincs
          const fv = fovallalkozok.find(f => f.id === data.penzugy.fovallalkoziId);
          const uList = loadLocal("ugyfelek") || [];
          const ugy = uList.find(u => u.id === data.clientId);
          if (ugy && !ugy.forrás) {
            const forras = fv?.rovidites || (fv ? (fv.nev||"").slice(0,4).toUpperCase() : "Saját");
            saveLocal("ugyfelek", uList.map(u => u.id === data.clientId ? {
              ...u, forrás: forras, fovallalkozoId: fv?.id||"", fovallalkozoNev: fv?.nev||"",
              fovallalkozoRovid: fv?.rovidites||"", updatedAt: new Date().toISOString()
            } : u));
            window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "ugyfelek" } }));
          }
        }
      } else {
        saved = updateProjekt(projekt.id, data, currentUser?.name || "");
      }
      onSaved?.(saved);
      onClose?.();
    } catch (err) {
      console.error("[ProjektForm save]", err);
      setHiba("Mentés közben hiba történt. Ellenőrizd az adatokat.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "20px 16px",
        overflowY: "auto",
      }}
    >
      {/* Backdrop: testvér elem, nem szülő – így a modal belsejéből drag-select nem zárja be */}
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 0 }}
        onClick={onClose}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          background: "#fff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 680,
          boxShadow: "0 24px 60px rgba(0,0,0,.25)",
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 24px",
            borderBottom: "1px solid #E2E8F0",
          }}
        >
          <h2
            style={{
              fontFamily: FONT_HEADING,
              fontSize: 18,
              fontWeight: 800,
              margin: 0,
            }}
          >
            {isNew ? "Új projekt" : "Projekt szerkesztése"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#94A3B8",
            }}
          >
            <X size={22} />
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {hiba && (
            <div
              style={{
                background: "#FEF2F2",
                border: "1.5px solid #FECACA",
                borderRadius: 9,
                padding: "9px 12px",
                marginBottom: 14,
                fontSize: 13,
                color: "#DC2626",
                fontWeight: 600,
              }}
            >
              {hiba}
            </div>
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px 16px",
            }}
          >
            <Field label="Projekt neve *">
              <input
                value={form.nev}
                onChange={e => upd("nev", e.target.value)}
                placeholder="pl. Kovács ház napelem"
                style={{ ...inp, border: "2px solid #2563EB", fontWeight: 600 }}
              />
            </Field>
            <Field label="Külső / fővállalkozói azonosító" half>
              <input
                value={form.kulsoAzonosito}
                onChange={e => upd("kulsoAzonosito", e.target.value)}
                placeholder="pl. FŐV-2026-145"
                style={inp}
              />
            </Field>
            <Field label="Munkatípus *" half>
              <select value={form.tipus} onChange={e => handleMunkatipus(e.target.value)} style={inp}>
                <option value="">— Válassz munkatípust —</option>
                {munkatipusok.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nev}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Státusz *" half>
              <select value={form.status} onChange={e => upd("status", e.target.value)} style={inp}>
                {PROJEKT_STATUSZOK.map(s => (
                  <option key={s.id}>{s.id}</option>
                ))}
              </select>
            </Field>
            <div style={{ gridColumn: "span 2", borderTop: "1px solid #E2E8F0", paddingTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
                Ügyfél adatok
              </p>
            </div>
            <Field label="Ügyfél kiválasztása (opcionális)">
              <select value={form.clientId} onChange={handleUgyfél} style={inp}>
                <option value="">— Válassz a listából —</option>
                {ugyfelek.map(u => (
                  <option key={u.id} value={u.id}>{u.name}{u.address ? ` – ${u.address}` : ""}</option>
                ))}
              </select>
              {form.clientId && <p style={{ fontSize: 10, color: "#059669", marginTop: 3 }}>✅ Adatok automatikusan betöltve</p>}
            </Field>
            <Field label="Ügyfél neve *" half>
              <input value={form.clientNev} onChange={e => upd("clientNev", e.target.value)} placeholder="Kovács János" style={inp} />
            </Field>
            <Field label="Megbízó cég neve" half>
              <input value={form.megbizoCeg || ""} onChange={e => upd("megbizoCeg", e.target.value)} placeholder="pl. Green-Home Kft." style={inp} />
            </Field>
            <Field label="Kapcsolattartó" half>
              <input value={form.kapcsolattarto} onChange={e => upd("kapcsolattarto", e.target.value)} placeholder="Kapcsolattartó neve" style={inp} />
            </Field>
            <Field label="Telefonszám" half>
              <input value={form.clientTel} onChange={e => upd("clientTel", e.target.value)} placeholder="+36..." style={inp} />
            </Field>
            <Field label="E-mail" half>
              <input value={form.clientEmail} onChange={e => upd("clientEmail", e.target.value)} placeholder="email@example.com" style={inp} />
            </Field>
            <Field label="Ügyfél lakcíme">
              <AddressSearch
                value={form.clientCim}
                onChange={v => upd("clientCim", v)}
                onSelect={r => {
                  upd("clientCim", r.display_name.split(",").slice(0,3).join(",").trim());
                  if (!form.telepitesiCim) upd("telepitesiCim", r.display_name.split(",").slice(0,3).join(",").trim());
                }}
                placeholder="Város, utca, hsz. – gépelj a kereséshez"
                style={inp}
              />
            </Field>
            <Field label="Telepítési cím">
              <AddressSearch
                value={form.telepitesiCim}
                onChange={v => upd("telepitesiCim", v)}
                onSelect={r => upd("telepitesiCim", r.display_name.split(",").slice(0,3).join(",").trim())}
                placeholder="Ha eltér a lakcímtől"
                style={inp}
              />
            </Field>
            <div style={{ gridColumn: "span 2", borderTop: "1px solid #E2E8F0", paddingTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
                Csapat
              </p>
            </div>
            <Field label="Projektvezető" half>
              <select value={form.projektvezetoId} onChange={handlePM} style={inp}>
                <option value="">— Válassz —</option>
                {pmList.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kivitelező csapat" half>
              <select value={form.csapatId} onChange={handleCsapat} style={inp}>
                <option value="">— Válassz csapatot —</option>
                {csapatok.map(cs => (
                  <option key={cs.id} value={cs.id}>
                    {cs.nev}{cs.telephely ? ` (${cs.telephely})` : ""}
                  </option>
                ))}
              </select>
              {csapatok.length === 0 && (
                <p style={{ fontSize: 10, color: "#D97706", marginTop: 3 }}>⚠️ Még nincs létrehozva csapat — előbb add hozzá a Csapat menüben</p>
              )}
            </Field>
            <div style={{ gridColumn: "span 2", borderTop: "1px solid #E2E8F0", paddingTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
                Műszaki adatok
              </p>
            </div>
            <Field label="Napelem darabszám" half>
              <input type="number" min="0" value={form.napelemDb} onChange={e => {
                const n = Number(e.target.value);
                setForm(p => ({ ...p, napelemDb: n, penzugy: { ...p.penzugy, darabszam: n } }));
                if (hiba) setHiba("");
              }} placeholder="0" style={inp} />
            </Field>
            <Field label="Inverter darabszám" half>
              <input type="number" min="0" value={form.inverterDb} onChange={e => upd("inverterDb", Number(e.target.value))} placeholder="0" style={inp} />
            </Field>
            <Field label="Akkumulátor db" half>
              <input type="number" min="0" value={form.akkumulatorDb} onChange={e => upd("akkumulatorDb", Number(e.target.value))} placeholder="0" style={inp} />
            </Field>
            <Field label="Smart meter db" half>
              <input type="number" min="0" value={form.smartMeterDb} onChange={e => upd("smartMeterDb", Number(e.target.value))} placeholder="0" style={inp} />
            </Field>
            <Field label="Elektromos autótöltő" half>
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14, fontWeight:500, color:"#334155", userSelect:"none", paddingTop:4 }}>
                <div onClick={() => upd("autoTolto", !form.autoTolto)}
                  style={{ width:44, height:24, borderRadius:12, position:"relative", cursor:"pointer", background:form.autoTolto?"#2563EB":"#CBD5E1", transition:"background .2s" }}>
                  <div style={{ position:"absolute", top:3, left:form.autoTolto?23:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }}/>
                </div>
                <span style={{ color:form.autoTolto?"#059669":"#94A3B8", fontWeight:700 }}>{form.autoTolto?"Van":"Nincs"}</span>
              </label>
            </Field>
            <div style={{ gridColumn: "span 2", borderTop: "1px solid #E2E8F0", paddingTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
                Ütemezés
              </p>
            </div>
            <Field label="Tervezett kezdés" half>
              <input type="date" value={form.tervezettKezdes} onChange={e => upd("tervezettKezdes", e.target.value)} style={inp} />
            </Field>
            <Field label="Tervezett befejezés" half>
              <input type="date" value={form.tervezettBefejezes} onChange={e => upd("tervezettBefejezes", e.target.value)} style={inp} />
            </Field>
            <div style={{ gridColumn: "span 2", borderTop: "1px solid #E2E8F0", paddingTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
                💰 Pénzügyi konfiguráció
              </p>
            </div>
            <Field label="Fővállalkozó" half>
              <select value={form.penzugy.fovallalkoziId} onChange={e => handleFovallalkozo(e.target.value)} style={inp}>
                <option value="">— Válassz fővállalkozót —</option>
                {fovallalkozok.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nev}
                  </option>
                ))}
              </select>
              {form.penzugy.elszamolasiSzabalyId && <p style={{ fontSize: 10, color: "#059669", marginTop: 3 }}>✅ Elszámolási szabály automatikusan betöltve</p>}
              {form.penzugy.fovallalkoziId && !form.penzugy.elszamolasiSzabalyId && <p style={{ fontSize: 10, color: "#D97706", marginTop: 3 }}>⚠️ Nincs aktív szabály ehhez a munkatípushoz</p>}
            </Field>
            <Field label="Elszámolási db (auto: panel db)" half>
              <input type="number" value={form.penzugy.darabszam || form.napelemDb || 1} onChange={e => updPenz("darabszam", e.target.value)} placeholder="1" style={inp} />
              <p style={{ fontSize: 10, color: "#64748B", marginTop: 3 }}>Szinkronizálva a Műszaki adatok panel db-vel</p>
            </Field>
            <Field label="Távolság (km, oda)" half>
              <div style={{ display: "flex", gap: 6 }}>
                <input type="number" value={form.penzugy.tavKm || ""} onChange={e => updPenz("tavKm", e.target.value)} placeholder="0" style={{ ...inp, flex: 1 }} />
                <button type="button" onClick={handleKmAutoCalc} disabled={kmCalc}
                  title="Automatikus km-számítás a csapat telephely → telepítési cím alapján (OSRM)"
                  style={{ padding: "0 10px", background: kmCalc ? "#94A3B8" : "#2563EB", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, fontFamily: FONT }}>
                  <Navigation size={13}/>{kmCalc ? "…" : "Auto"}
                </button>
              </div>
              <p style={{ fontSize: 10, color: "#64748B", marginTop: 3 }}>Oda km – az elszámolás oda-vissza számolja</p>
            </Field>
            <Field label="Csapatlétszám (fő)" half>
              <input type="number" value={form.penzugy.csapatLetszam || 1} onChange={e => updPenz("csapatLetszam", e.target.value)} placeholder="1" style={inp} />
            </Field>
            <Field label="Munkanapok száma" half>
              <input type="number" value={form.penzugy.munkanapok || 1} onChange={e => updPenz("munkanapok", e.target.value)} placeholder="1" style={inp} />
            </Field>
            <Field label="Emelőgép (Ft)" half>
              <input type="number" value={form.penzugy.emelőgepKoltseg || ""} onChange={e => updPenz("emelőgepKoltseg", e.target.value)} placeholder="0" style={inp} />
            </Field>
            <Field label="Daru / Teheremelő (Ft)" half>
              <input type="number" value={form.penzugy.daruKoltseg || ""} onChange={e => updPenz("daruKoltseg", e.target.value)} placeholder="0" style={inp} />
            </Field>
            <Field label="Szállás (Ft)" half>
              <input type="number" value={form.penzugy.szallasKoltseg || ""} onChange={e => updPenz("szallasKoltseg", e.target.value)} placeholder="0" style={inp} />
            </Field>
            <Field label="Bérelt eszközök (Ft)" half>
              <input type="number" value={form.penzugy.bereltEszkozKoltseg || ""} onChange={e => updPenz("bereltEszkozKoltseg", e.target.value)} placeholder="0" style={inp} />
            </Field>
            <Field label="Iroda / Admin (Ft)" half>
              <input type="number" value={form.penzugy.irodaAdminKoltseg || ""} onChange={e => updPenz("irodaAdminKoltseg", e.target.value)} placeholder="0" style={inp} />
            </Field>
            <Field label="Egyéb költség (Ft)" half>
              <input type="number" value={form.penzugy.egyebKoltseg || ""} onChange={e => updPenz("egyebKoltseg", e.target.value)} placeholder="0" style={inp} />
            </Field>
            <Field label="Elfogadott ajánlat (Ft)" half>
              <input type="number" value={form.elfogadottAjanlat} onChange={e => upd("elfogadottAjanlat", e.target.value)} placeholder="0" style={inp} />
            </Field>

            {/* Várható bevétel preview */}
            {form.penzugy.fovallalkoziId && (() => {
              try {
                const mockProj = {
                  id: "_preview",
                  penzugy: { ...form.penzugy, darabszam: form.napelemDb || form.penzugy.darabszam || 1 },
                  napelemDb:     form.napelemDb     || 0,
                  inverterDb:    form.inverterDb     || 0,
                  akkumulatorDb: form.akkumulatorDb  || 0,
                  smartMeterDb:  form.smartMeterDb   || 0,
                  munkalapIds:   [],
                };
                const kalk = calcProjektElszamolas(mockProj, []);
                if (kalk.autoBevitel > 0 || kalk.beveteliTetelek.length > 0) {
                  return (
                    <div style={{ gridColumn:"span 2", background:"#F0FDF4", border:"1.5px solid #86EFAC", borderRadius:10, padding:"12px 16px", marginTop:4 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:8 }}>
                        <TrendingUp size={15} color="#059669"/>
                        <span style={{ fontSize:12, fontWeight:700, color:"#166534", textTransform:"uppercase", letterSpacing:.5 }}>Várható fővállalkozói bevétel</span>
                      </div>
                      {kalk.beveteliTetelek.map((t, i) => (
                        <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#374151", marginBottom:3 }}>
                          <span>{t.megnevezes}</span>
                          <span style={{ fontWeight:700, color:"#059669" }}>{t.autoNetto.toLocaleString("hu-HU")} Ft</span>
                        </div>
                      ))}
                      {kalk.beveteliTetelek.length > 1 && (
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:800, color:"#059669", borderTop:"1px solid #86EFAC", paddingTop:6, marginTop:4 }}>
                          <span>Összesen</span>
                          <span>{kalk.autoBevitel.toLocaleString("hu-HU")} Ft</span>
                        </div>
                      )}
                      {kalk.autoBevitel === 0 && kalk.beveteliTetelek.some(t=>t.hiany) && (
                        <p style={{ fontSize:11, color:"#D97706", margin:"4px 0 0" }}>⚠️ A sávos szabály nem találja a darabszám tartományát – ellenőrizd a szabályokat.</p>
                      )}
                      {kalk.beveteliTetelek.length === 0 && (
                        <p style={{ fontSize:11, color:"#D97706", margin:0 }}>Nincs aktív szabály ehhez a munkatípushoz – add meg a Beállítások → Fővállalkozók menüben.</p>
                      )}
                    </div>
                  );
                }
                return null;
              } catch { return null; }
            })()}
          </div>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid #E2E8F0", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
            Mégse
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 22px", background: saving ? "#94A3B8" : "#2563EB", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>
            <Save size={15} />
            {saving ? "Mentés…" : isNew ? "Projekt létrehozása" : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}