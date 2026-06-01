import { useState } from "react";
import { X, Save } from "lucide-react";
import { FONT, FONT_HEADING } from "../../lib/constants.js";
import { getUsers } from "../../lib/crmUsers.js";
import { loadLocal } from "../../lib/localDb.js";
import { PROJEKT_STATUSZOK } from "./projekt.schema.js";
import { getAktivFovallalkozok, findSzabaly } from "../fovallalkozok/fovallalkozo.service.js";
import { autoFillPenzugy } from "../../services/financialCalculation.service.js";
import { getAktivMunkatipusok } from "../munkatipusok/munkatipus.service.js";
import { createProjekt, updateProjekt } from "./projekt.service.js";
import { createInitialWorkorderForProject } from "../../services/projectWorkorder.service.js";
import {
  validateProjectBeforeSave,
  shouldCreateInitialWorkorder,
  getInitialWorkorderTypeByProjectStatus,
} from "./projectRules.js";
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
  const csapatok = users.filter(u => u.role === "Telepítő");
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
    clientCim: projekt?.clientCim || "",
    clientTel: projekt?.clientTel || "",
    clientEmail: projekt?.clientEmail || "",
    kapcsolattarto: projekt?.kapcsolattarto || "",
    telepitesiCim: projekt?.telepitesiCim || "",
    napelemDb: projekt?.napelemDb || 0,
    inverterDb: projekt?.inverterDb || 0,
    akkumulator: projekt?.akkumulator || false,
    okosmerő: projekt?.okosmerő || false,
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
      emelőgepKoltseg: 0,
      egyebKoltseg: 0,
    },
    megjegyzes: "",
  });
  const [saving, setSaving] = useState(false);
  const [hiba, setHiba] = useState("");
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
    const u = users.find(x => x.id === e.target.value);
    setForm(p => ({
      ...p,
      csapatId: u?.id || "",
      csapatNev: u?.name || "",
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
        penzugy: form.penzugy,
      };
      delete data.megjegyzes;
      let saved;
      if (isNew) {
        saved = createProjekt(data, currentUser?.name || "");
        if (shouldCreateInitialWorkorder(saved.status)) {
          const tipus = getInitialWorkorderTypeByProjectStatus(saved.status);
          createInitialWorkorderForProject(saved, {
            tipus,
            status: "Kiosztásra vár",
            user: currentUser?.name || "",
          });
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
        background: "rgba(0,0,0,.6)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "20px 16px",
        overflowY: "auto",
      }}
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div
        style={{
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
              <input value={form.clientCim} onChange={e => upd("clientCim", e.target.value)} placeholder="Város, utca, hsz." style={inp} />
            </Field>
            <Field label="Telepítési cím">
              <input value={form.telepitesiCim} onChange={e => upd("telepitesiCim", e.target.value)} placeholder="Ha eltér a lakcímtől" style={inp} />
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
                <option value="">— Válassz —</option>
                {csapatok.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
            <div style={{ gridColumn: "span 2", borderTop: "1px solid #E2E8F0", paddingTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
                Műszaki adatok
              </p>
            </div>
            <Field label="Napelem darabszám" half>
              <input type="number" min="0" value={form.napelemDb} onChange={e => upd("napelemDb", Number(e.target.value))} placeholder="0" style={inp} />
            </Field>
            <Field label="Inverter darabszám" half>
              <input type="number" min="0" value={form.inverterDb} onChange={e => upd("inverterDb", Number(e.target.value))} placeholder="0" style={inp} />
            </Field>
            <div style={{ gridColumn: "span 2", display: "flex", gap: 16, flexWrap: "wrap" }}>
              {[
                { key: "akkumulator", label: "Akkumulátor" },
                { key: "okosmerő",    label: "Okosmérő" },
                { key: "autoTolto",   label: "Elektromos autótöltő" },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, fontWeight: 500, color: "#334155", userSelect: "none" }}>
                  <div
                    onClick={() => upd(key, !form[key])}
                    style={{
                      width: 44, height: 24, borderRadius: 12, position: "relative", cursor: "pointer",
                      background: form[key] ? "#2563EB" : "#CBD5E1", transition: "background .2s",
                    }}
                  >
                    <div style={{
                      position: "absolute", top: 3, left: form[key] ? 23 : 3, width: 18, height: 18,
                      borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                    }} />
                  </div>
                  {label}: <span style={{ color: form[key] ? "#059669" : "#94A3B8", fontWeight: 700 }}>{form[key] ? "Van" : "Nincs"}</span>
                </label>
              ))}
            </div>
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
            <Field label="Darabszám (pl. panel db)" half>
              <input type="number" value={form.penzugy.darabszam || 1} onChange={e => updPenz("darabszam", e.target.value)} placeholder="1" style={inp} />
            </Field>
            <Field label="Távolság (km, oda)" half>
              <input type="number" value={form.penzugy.tavKm || ""} onChange={e => updPenz("tavKm", e.target.value)} placeholder="0" style={inp} />
            </Field>
            <Field label="Csapatlétszám (fő)" half>
              <input type="number" value={form.penzugy.csapatLetszam || 1} onChange={e => updPenz("csapatLetszam", e.target.value)} placeholder="1" style={inp} />
            </Field>
            <Field label="Munkanapok száma" half>
              <input type="number" value={form.penzugy.munkanapok || 1} onChange={e => updPenz("munkanapok", e.target.value)} placeholder="1" style={inp} />
            </Field>
            <Field label="Emelőgép költség (Ft)" half>
              <input type="number" value={form.penzugy.emelőgepKoltseg || ""} onChange={e => updPenz("emelőgepKoltseg", e.target.value)} placeholder="0" style={inp} />
            </Field>
            <Field label="Egyéb költség (Ft)" half>
              <input type="number" value={form.penzugy.egyebKoltseg || ""} onChange={e => updPenz("egyebKoltseg", e.target.value)} placeholder="0" style={inp} />
            </Field>
            <Field label="Elfogadott ajánlat (Ft)" half>
              <input type="number" value={form.elfogadottAjanlat} onChange={e => upd("elfogadottAjanlat", e.target.value)} placeholder="0" style={inp} />
            </Field>
          </div>
        </div>
        <div style={{ padding: "14px 24px", borderTop: "1px solid #E2E8F0", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", borderRadius: 9, border: "1.5px solid #E2E8F0", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
            Mégse
          </button>
          <button onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 22px", background: saving ? "#94A3B8" : "#2563EB", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>
            <Save size={15} />
            {saving ? "Mentés…" : isNew ? "Projekt létrehozása" : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}