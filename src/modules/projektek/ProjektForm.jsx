import { useState, useMemo, useEffect, useRef } from "react";
import { X, Save, Navigation, TrendingUp } from "lucide-react";
import { FONT, FONT_HEADING } from "../../lib/constants.js";
import { getUsers } from "../../lib/crmUsers.js";
import { loadLocal, saveLocal } from "../../lib/localDb.js";
import {
  PROJEKT_STATUSZOK, PROJEKT_FORRAS, getProjektTipus,
  ANYAGELSZAMOLAS_NINCS_KIVALASZTVA, ANYAGELSZAMOLASI_MODOK,
  hasAnyagelszamolasiMod, validateAnyagelszamolasiModStatusValtas,
} from "./projekt.schema.js";
import { migrateProjektForrasFromRekord, validateProjektForrás, FORRAS_ELLENORZES_SZUKSEGES } from "../../lib/workflowRules.js";
import { createAjanlatPillanatkep } from "../ajanlatok/ajanlat.schema.js";
import { getAktivFovallalkozok, findSzabaly } from "../fovallalkozok/fovallalkozo.service.js";
import { getAktivCsapatok } from "../csapatok/csapat.service.js";
import { autoFillPenzugy } from "../../services/workOrderFinancial.service.js";
import { calcProjektElszamolas, buildInput } from "../../services/settlementCalculator.js";
import { getAktivMunkatipusok } from "../munkatipusok/munkatipus.service.js";
import { createProjekt, updateProjekt } from "./projekt.service.js";
import { createInitialWorkorderForProject } from "../../services/projectWorkorder.service.js";
import { driveCreateProjektFolder } from "../../lib/driveApi.js";
import {
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
export default function ProjektForm({ projekt, ajanlatElofolt, onClose, onSaved, currentUser }) {
  const isNew = !projekt?.id;
  const users = getUsers();
  const csapatok = getAktivCsapatok();
  const fovallalkozok = getAktivFovallalkozok();
  const munkatipusok = getAktivMunkatipusok();
  const pmList = users.filter(u => ["Admin", "Projektmenedzser"].includes(u.role));
  const ugyfelek = loadLocal("ugyfelek") || [];

  // Elfogadott ajánlatok (saját ügyfél flow ajanlat-selectorhoz)
  const elfogadottAjanlatok = useMemo(() => {
    try {
      const all = loadLocal("ajanlatok") || [];
      const projektek = loadLocal("projektek") || [];
      const linkedIds = new Set(projektek.map(p => p.ajanlatId).filter(Boolean));
      return all.filter(a =>
        a.status === "Elfogadva" &&
        (!a.projektId || a.projektId === projekt?.id) &&
        (!linkedIds.has(a.id) || a.id === projekt?.ajanlatId)
      );
    } catch { return []; }
  }, [projekt?.id, projekt?.ajanlatId]);
  const [form, setForm] = useState({
    nev: projekt?.nev || ajanlatElofolt?.nev || "",
    kulsoAzonosito: projekt?.kulsoAzonosito || "",
    tipus: projekt?.tipus || "Napelem telepítés",
    status: projekt?.status || "Létrehozva",
    clientId: projekt?.clientId || ajanlatElofolt?.clientId || "",
    clientNev: projekt?.clientNev || ajanlatElofolt?.clientNev || "",
    megbizoCeg: projekt?.megbizoCeg || "",
    clientCim: projekt?.clientCim || ajanlatElofolt?.clientCim || "",
    clientTel: projekt?.clientTel || ajanlatElofolt?.clientTel || "",
    clientEmail: projekt?.clientEmail || ajanlatElofolt?.clientEmail || "",
    kapcsolattarto: projekt?.kapcsolattarto || "",
    telepitesiCim: projekt?.telepitesiCim || ajanlatElofolt?.clientCim || "",
    forrás: projekt
      ? migrateProjektForrasFromRekord(projekt)
      : (ajanlatElofolt ? "sajat_ajanlat" : ""),
    anyagelszamolasiMod: projekt?.anyagelszamolasiMod || ANYAGELSZAMOLAS_NINCS_KIVALASZTVA,
    adminReviewRequired: projekt?.adminReviewRequired || false,
    projektTipus: projekt?.projektTipus || (ajanlatElofolt ? "Saját projekt" : ""),
    ajanlatId: projekt?.ajanlatId || ajanlatElofolt?.id || null,
    elfogadottAjanlatPillanatkep: projekt?.elfogadottAjanlatPillanatkep || null,
    fovKapcsolattarto: projekt?.fovKapcsolattarto || "",
    fovFizetesiHatarido: projekt?.fovFizetesiHatarido || "",
    fovMegjegyzes: projekt?.fovMegjegyzes || "",
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
    elfogadottAjanlat: projekt?.elfogadottAjanlat || ajanlatElofolt?.osszeg || 0,
    penzugy: projekt?.penzugy || {
      fovallalkoziId: "",
      munkatipus: "",
      elszamolasiSzabalyId: "",
      tavKm:       projekt?.penzugy?.tavKm        ?? 0,
      tavKmForras: projekt?.penzugy?.tavKmForras  || "",
      tavKmNaplo:  projekt?.penzugy?.tavKmNaplo   || "",
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
  const kmDebounceRef = useRef(null);
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);
  const [ugyfélOpen, setUgyfélOpen] = useState(true);
  const [extraCostOpen, setExtraCostOpen] = useState(false);
  const formBlocked = isNew && form.forrás === "sajat_ajanlat" && !form.ajanlatId;

  async function runKmAutoCalc(cim, csapatId, silent = false) {
    const cs = csapatok.find(c => c.id === csapatId);
    if (!cim?.trim() || !cs?.telephely) {
      if (!silent) setHiba("A km auto-számításhoz szükséges: telepítési cím ÉS kivitelező csapat (indulási telephely).");
      return;
    }
    setKmCalc(true);
    const res = await calcRoundTripKm(cs.telephely, cim);
    setKmCalc(false);
    if (!res) {
      if (!silent) setHiba("Km kiszámítás sikertelen – ellenőrizd a cím helyesírást.");
      return;
    }
    setForm(p => ({
      ...p,
      penzugy: { ...p.penzugy, tavKm: res.oda, tavKmForras: "auto", tavKmNaplo: "" },
    }));
    if (!silent) setHiba("");
  }

  async function handleKmAutoCalc() {
    await runKmAutoCalc(form.telepitesiCim || form.clientCim, form.csapatId, false);
  }

  // Auto-trigger: csapatId vagy cím változásakor automatikusan futtatja az OSRM számítást,
  // de csak ha nincs kézi felülírás (tavKmForras !== "kezi")
  useEffect(() => {
    if (form.forrás !== "fovallalkozoi_munka") return;
    const cim = form.telepitesiCim || form.clientCim;
    if (!cim?.trim() || !form.csapatId) return;
    if (kmDebounceRef.current) clearTimeout(kmDebounceRef.current);
    kmDebounceRef.current = setTimeout(() => {
      const f = formRef.current;
      if (f.penzugy?.tavKmForras === "kezi") return;
      runKmAutoCalc(f.telepitesiCim || f.clientCim, f.csapatId, true);
    }, 1200);
    return () => clearTimeout(kmDebounceRef.current);
  }, [form.csapatId, form.telepitesiCim, form.clientCim, form.forrás]);
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
  function handleAjanlatSelect(ajanlatId) {
    const a = elfogadottAjanlatok.find(x => x.id === ajanlatId);
    if (!a) {
      setForm(p => ({ ...p, ajanlatId: null }));
      return;
    }
    setForm(p => ({
      ...p,
      ajanlatId: a.id,
      nev: p.nev || a.nev || "",
      clientId: a.clientId || p.clientId,
      clientNev: a.clientNev || p.clientNev || "",
      clientCim: a.clientCim || p.clientCim || "",
      clientTel: a.clientTel || p.clientTel || "",
      clientEmail: a.clientEmail || p.clientEmail || "",
      telepitesiCim: p.telepitesiCim || a.clientCim || "",
      elfogadottAjanlat: a.osszeg || p.elfogadottAjanlat || 0,
    }));
    if (isNew) setUgyfélOpen(false);
    if (hiba) setHiba("");
  }

  async function handleSave() {
    if (isNew && form.forrás === "sajat_ajanlat" && !form.ajanlatId) {
      setHiba("Először válassz elfogadott ajánlatot a folytatáshoz.");
      return;
    }
    if (!form.nev?.trim()) {
      setHiba("A projekt neve kötelező.");
      return;
    }
    if (form.forrás === FORRAS_ELLENORZES_SZUKSEGES) {
      setHiba("A projekt forrása még nincs meghatározva. Válassz egyet a három forrás közül, mielőtt mentesz.");
      return;
    }
    // D1: anyagelszámolási mód – kötelező új projekt létrehozásakor (nincs automatikus default)
    if (isNew && !hasAnyagelszamolasiMod(form)) {
      setHiba("Az anyagelszámolási mód kiválasztása kötelező új projekt létrehozásakor.");
      return;
    }
    // D1: aktív / kivitelezési státuszba csak kiválasztott anyagelszámolási móddal léphet a projekt
    const anyagModValidacio = validateAnyagelszamolasiModStatusValtas(form, form.status);
    if (!anyagModValidacio.ok) {
      setHiba(anyagModValidacio.message);
      return;
    }
    const validation = validateProjektForrás(form);
    if (!validation.ok) {
      setHiba(validation.message);
      return;
    }
    if (form.forrás === "fovallalkozoi_munka" &&
        form.penzugy?.tavKmForras === "kezi" &&
        !form.penzugy?.tavKmNaplo?.trim()) {
      setHiba("Kézzel módosított km esetén az indoklás kitöltése kötelező (Km napló mező).");
      return;
    }
    // Fázis 4A: saját munka csak elfogadott ajánlatból jöhet létre – mentéskor
    // újra ellenőrizzük, hogy a kiválasztott ajánlat még mindig elérhető és
    // elfogadott (közben módosulhatott a státusza, vagy más projekthez köthették).
    let valasztottAjanlat = null;
    if (form.forrás === "sajat_ajanlat") {
      valasztottAjanlat = elfogadottAjanlatok.find(a => a.id === form.ajanlatId) || null;
      if (isNew && !valasztottAjanlat) {
        setHiba("A kiválasztott ajánlat már nem érhető el (közben megváltozott a státusza, vagy már köthették más projekthez). Válassz egy másik elfogadott ajánlatot.");
        return;
      }
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        elfogadottAjanlat: Number(form.elfogadottAjanlat) || 0,
        projektTipus: getProjektTipus(form.forrás),
        // Backward compat boolean mezők szinkronban az db értékekkel
        akkumulator: (form.akkumulatorDb || 0) > 0,
        okosmerő:    (form.smartMeterDb  || 0) > 0,
        penzugy: {
          ...form.penzugy,
          darabszam: form.napelemDb || form.penzugy?.darabszam || 1,
        },
      };
      delete data.megjegyzes;
      // Fázis 4A: az immutábilis pillanatkép kizárólag itt, a projekt
      // létrehozásának pillanatában készül – mély másolat (deep clone),
      // semmilyen referenciát nem oszt meg az élő ajánlattal vagy az
      // anyagtörzzsel, ezért későbbi módosításuk nem érheti el.
      if (isNew && form.forrás === "sajat_ajanlat" && valasztottAjanlat) {
        data.elfogadottAjanlatPillanatkep = createAjanlatPillanatkep(valasztottAjanlat);
      }
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
            {isNew
              ? (form.forrás === "sajat_ajanlat" ? "Új projekt – Saját ajánlat"
                : form.forrás === "fovallalkozoi_munka" ? "Új projekt – Fővállalkozói munka"
                : form.forrás === "belso_munka" ? "Új projekt – Belső munka"
                : "Új projekt")
              : "Projekt szerkesztése"}
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
          {/* ── Projekt forrása (kötelező) ── */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
              Projekt forrása *
            </p>

            {/* Bizonytalan forrás figyelmeztetés – adminnak kézzel kell besorolni */}
            {form.forrás === FORRAS_ELLENORZES_SZUKSEGES && (
              <div style={{ background:"#FEF2F2", border:"2px solid #DC2626", borderRadius:10, padding:"12px 16px", marginBottom:12, fontSize:13, color:"#991B1B" }}>
                <div style={{ fontWeight:800, marginBottom:6 }}>⚠ Kézi ellenőrzés szükséges!</div>
                <div style={{ lineHeight:1.65 }}>
                  Ez a projekt régi <strong>{projekt?.forrásElotti || "garanciális/javítási"}</strong> besorolásból érkezett,
                  de az automatikus migráció nem tudta biztosan meghatározni az új forrást.
                  Van rögzített ügyfélnév (<strong>{form.clientNev}</strong>), de nincs strukturált CRM ügyfél- vagy ajánlathivatkozás.
                  <br />
                  <strong>Kérlek válaszd ki kézzel a megfelelő forrást az alábbi gombok közül, majd mentsd a projektet!</strong>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {PROJEKT_FORRAS.map(f => {
                const active = form.forrás === f.id;
                return (
                  <button key={f.id} type="button"
                    onClick={() => {
                      if (f.id === "belso_munka") {
                        setForm(p => ({ ...p, forrás: f.id, clientNev: "E.D.I. Solutions Kft.", clientId: "", clientCim: "", clientTel: "", clientEmail: "", ajanlatId: null, ...(isNew ? { anyagelszamolasiMod: "FOVALLALKOZO_HOZOTT_ANYAG", adminReviewRequired: false } : {}) }));
                      } else if (f.id === "sajat_ajanlat") {
                        setForm(p => ({
                          ...p,
                          forrás: f.id,
                          clientNev: p.clientNev === "E.D.I. Solutions Kft." ? "" : p.clientNev,
                          // Fázis 4A: saját munkánál (elfogadott ajánlatból) az anyagelszámolási
                          // mód egyértelmű – mi vesszük az anyagot, mi adjuk el – ezért itt
                          // (és csak itt) automatikusan beállítható, admin-felülvizsgálat nélkül.
                          ...(isNew ? { anyagelszamolasiMod: "SAJAT_ANYAG_PROFIT", adminReviewRequired: false } : {}),
                        }));
                      } else {
                        upd("forrás", f.id);
                      }
                      if (hiba) setHiba("");
                    }}
                    title={f.desc}
                    style={{ padding: "8px 16px", borderRadius: 9, border: `2px solid ${active ? f.color : "#E2E8F0"}`, background: active ? f.bg : "#fff", color: active ? f.color : "#64748B", fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: FONT, transition: "all .15s" }}>
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* sajat_ajanlat: elfogadott ajánlat kiválasztása */}
            {form.forrás === "sajat_ajanlat" && (
              <div style={{ marginTop: 12, background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 10, padding: "12px 14px" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#1D4ED8", margin: "0 0 8px" }}>
                  📋 Elfogadott ajánlat kiválasztása *
                </p>
                {elfogadottAjanlatok.length === 0 ? (
                  <p style={{ fontSize: 12, color: "#DC2626", margin: 0, fontWeight: 600 }}>
                    Nincs elfogadott ajánlat. Menj az <strong>Ajánlatok</strong> oldalra, módosítsd az ajánlat státuszát "Elfogadva"-ra, majd onnan hozd létre a projektet.
                  </p>
                ) : (
                  <>
                    <select value={form.ajanlatId || ""} onChange={e => handleAjanlatSelect(e.target.value)}
                      style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${form.ajanlatId ? "#2563EB" : "#E2E8F0"}`, borderRadius: 9, fontSize: 14, fontFamily: FONT, outline: "none", background: "#fff" }}>
                      <option value="">— Válassz elfogadott ajánlatot —</option>
                      {elfogadottAjanlatok.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.ajanlatkod} · {a.clientNev} · {a.osszeg ? a.osszeg.toLocaleString("hu-HU") + " Ft" : "—"} ({a.nev || "Nincs megnevezés"})
                        </option>
                      ))}
                    </select>
                    {form.ajanlatId && <p style={{ fontSize: 11, color: "#059669", margin: "4px 0 0", fontWeight: 600 }}>✅ Ügyfél adatok automatikusan betöltve az ajánlatból</p>}
                    {!form.ajanlatId && <p style={{ fontSize: 12, color: "#1D4ED8", margin: "6px 0 0", fontWeight: 600 }}>⬇ Válassz ajánlatot a folytatáshoz – az adatok automatikusan kitöltődnek.</p>}
                  </>
                )}
              </div>
            )}

            {/* fovallalkozoi_munka: külső munkaszám kötelező */}
            {form.forrás === "fovallalkozoi_munka" && (
              <div style={{ marginTop: 12, background: "#F5F3FF", border: "1.5px solid #DDD6FE", borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ fontSize: 12, color: "#7C3AED", margin: "0 0 6px", fontWeight: 700 }}>
                  🤝 Fővállalkozói munka – kötelező mezők:
                </p>
                <p style={{ fontSize: 12, color: "#7C3AED", margin: 0 }}>
                  Külső munkaszám (fent) · Fővállalkozó · Elszámolási szabály (Pénzügyi konfiguráció)
                </p>
              </div>
            )}

            {/* belso_munka: tájékoztató */}
            {form.forrás === "belso_munka" && (
              <div style={{ marginTop: 12, background: "#ECFDF5", border: "1.5px solid #86EFAC", borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ fontSize: 12, color: "#166534", margin: 0, fontWeight: 600 }}>
                  🏢 Belső munka – garancia, javítás, karbantartás. Megrendelő: <strong>E.D.I. Solutions Kft.</strong> (automatikus). Nincs ügyfél, nincs ajánlat.
                </p>
              </div>
            )}
          </div>

          {/* ── Anyagelszámolási mód (kötelező – D1) ──
               Saját ajánlatnál auto: SAJAT_ANYAG_PROFIT (rejtett)
               Belső munkánál auto: FOVALLALKOZO_HOZOTT_ANYAG (rejtett)
               Fővállalkozóinál kötelező választás (megjelenik)
               Admin ellenőrzés szükséges esetén mindig látható */}
          {(form.forrás === "fovallalkozoi_munka" || !form.forrás || form.adminReviewRequired) && !formBlocked && (
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
              Anyagelszámolási mód *
            </p>

            {/* Migrált / admin ellenőrzést igénylő projekt – kötelező figyelmeztetés */}
            {(form.anyagelszamolasiMod === ANYAGELSZAMOLAS_NINCS_KIVALASZTVA || form.adminReviewRequired) && (
              <div style={{ background:"#FEF2F2", border:"2px solid #DC2626", borderRadius:10, padding:"12px 16px", marginBottom:12, fontSize:13, color:"#991B1B", fontWeight:700 }}>
                ⚠ Admin ellenőrzés szükséges: az anyagelszámolási mód nincs beállítva.
                <div style={{ fontWeight:500, fontSize:12, marginTop:4, lineHeight:1.5 }}>
                  Válaszd ki az alábbi módok közül a megfelelőt – e nélkül a projekt nem léphet kivitelezési / aktív státuszba.
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {ANYAGELSZAMOLASI_MODOK.map(m => {
                const active = form.anyagelszamolasiMod === m.id;
                return (
                  <button key={m.id} type="button"
                    onClick={() => {
                      setForm(p => ({ ...p, anyagelszamolasiMod: m.id, adminReviewRequired: false }));
                      if (hiba) setHiba("");
                    }}
                    title={m.desc}
                    style={{ padding: "8px 16px", borderRadius: 9, border: `2px solid ${active ? m.color : "#E2E8F0"}`, background: active ? m.bg : "#fff", color: active ? m.color : "#64748B", fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: FONT, transition: "all .15s" }}>
                    {m.label}
                  </button>
                );
              })}
            </div>
            {hasAnyagelszamolasiMod(form) && (
              <p style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>
                {ANYAGELSZAMOLASI_MODOK.find(m => m.id === form.anyagelszamolasiMod)?.desc}
              </p>
            )}
          </div>
          )}

          {!formBlocked && <div
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
            {form.forrás === "fovallalkozoi_munka" && (
            <Field label="Külső / fővállalkozói azonosító *" half>
              <input
                value={form.kulsoAzonosito}
                onChange={e => upd("kulsoAzonosito", e.target.value)}
                placeholder="pl. FŐV-2026-145"
                style={{ ...inp, border: "2px solid #7C3AED" }}
              />
            </Field>
            )}
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
            {form.forrás !== "belso_munka" && (<>
            <div style={{ gridColumn: "span 2", borderTop: "1px solid #E2E8F0", paddingTop: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: form.forrás === "sajat_ajanlat" && form.ajanlatId ? 0 : 10 }}>
                Ügyfél adatok
                {!ugyfélOpen && form.clientNev && <span style={{ fontWeight: 500, color: "#374151", marginLeft: 8, textTransform: "none", fontSize: 12 }}>· {form.clientNev}</span>}
              </p>
              {form.forrás === "sajat_ajanlat" && form.ajanlatId && (
                <button type="button" onClick={() => setUgyfélOpen(o => !o)}
                  style={{ fontSize: 11, color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontWeight: 700, paddingBottom: 10 }}>
                  {ugyfélOpen ? "▲ Összecsuk" : "▼ Megnyit"}
                </button>
              )}
            </div>
            {(ugyfélOpen || form.forrás !== "sajat_ajanlat" || !form.ajanlatId) && <>
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
            {form.forrás === "fovallalkozoi_munka" && (
            <Field label="Megbízó cég neve" half>
              <input value={form.megbizoCeg || ""} onChange={e => upd("megbizoCeg", e.target.value)} placeholder="pl. Green-Home Kft." style={inp} />
            </Field>
            )}
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
              {form.clientCim && form.telepitesiCim && form.clientCim === form.telepitesiCim && (
                <p style={{ fontSize: 10, color: "#059669", marginTop: 3, fontWeight: 600 }}>✓ Azonos az ügyfél lakcímével</p>
              )}
            </Field>
            </>}
            </>)}
            {/* Belső munkánál nincs ügyfél section, de telepítési cím kell */}
            {form.forrás === "belso_munka" && (
            <Field label="Helyszín / telepítési cím">
              <AddressSearch
                value={form.telepitesiCim}
                onChange={v => upd("telepitesiCim", v)}
                onSelect={r => upd("telepitesiCim", r.display_name.split(",").slice(0,3).join(",").trim())}
                placeholder="Hol kell elvégezni a munkát?"
                style={inp}
              />
            </Field>
            )}
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
            {/* Műszaki adatok – belső munkánál (garancia/javítás) irreleváns */}
            {form.forrás !== "belso_munka" && (<>
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
            </>)}
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
            {/* Pénzügyi konfiguráció – csak fővállalkozói munkánál releváns */}
            {form.forrás === "fovallalkozoi_munka" && (<>
            <div style={{ gridColumn: "span 2", borderTop: "1px solid #E2E8F0", paddingTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
                💰 Pénzügyi konfiguráció
              </p>
            </div>
            <Field label={form.forrás === "fovallalkozoi_munka" ? "Fővállalkozó *" : "Fővállalkozó"} half>
              <select value={form.penzugy.fovallalkoziId} onChange={e => handleFovallalkozo(e.target.value)} style={{ ...inp, ...(form.forrás === "fovallalkozoi_munka" ? { border: "2px solid #7C3AED" } : {}) }}>
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
            {/* Fővállalkozói extra mezők */}
            {form.forrás === "fovallalkozoi_munka" && <>
              <Field label="FV kapcsolattartó" half>
                <input value={form.fovKapcsolattarto} onChange={e => upd("fovKapcsolattarto", e.target.value)} placeholder="Kapcsolattartó neve" style={inp} />
              </Field>
              <Field label="Fizetési határidő" half>
                <input type="date" value={form.fovFizetesiHatarido} onChange={e => upd("fovFizetesiHatarido", e.target.value)} style={inp} />
              </Field>
              <Field label="Fővállalkozói megjegyzés">
                <input value={form.fovMegjegyzes} onChange={e => upd("fovMegjegyzes", e.target.value)} placeholder="Egyéb instrukciók, feltételek…" style={inp} />
              </Field>
            </>}
            <Field label="Elszámolási db (auto: panel db)" half>
              <input type="number" value={form.penzugy.darabszam || form.napelemDb || 1} onChange={e => updPenz("darabszam", e.target.value)} placeholder="1" style={inp} />
              <p style={{ fontSize: 10, color: "#64748B", marginTop: 3 }}>Szinkronizálva a Műszaki adatok panel db-vel</p>
            </Field>
            <Field label="Távolság (km, oda)" half>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="number"
                  value={form.penzugy.tavKm || ""}
                  onChange={e => {
                    const val = e.target.value;
                    setForm(p => ({
                      ...p,
                      penzugy: {
                        ...p.penzugy,
                        tavKm: val === "" ? 0 : Number(val),
                        tavKmForras: "kezi",
                      },
                    }));
                  }}
                  placeholder="0"
                  style={{ ...inp, flex: 1, borderColor: form.penzugy.tavKmForras === "kezi" ? "#F59E0B" : "#E2E8F0" }}
                />
                <button type="button" onClick={handleKmAutoCalc} disabled={kmCalc}
                  title="Automatikus km-számítás a csapat telephely → telepítési cím alapján (OSRM)"
                  style={{ padding: "0 10px", background: kmCalc ? "#94A3B8" : "#2563EB", color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, fontFamily: FONT }}>
                  <Navigation size={13}/>{kmCalc ? "…" : "Auto"}
                </button>
              </div>
              {form.penzugy.tavKmForras === "auto" && (() => {
                const cs = csapatok.find(c => c.id === form.csapatId);
                return <p style={{ fontSize: 10, color: "#059669", marginTop: 3, fontWeight: 600 }}>✓ Auto számított · {cs?.telephely || "?"} → {form.telepitesiCim || form.clientCim || "?"}</p>;
              })()}
              {form.penzugy.tavKmForras === "kezi" && <p style={{ fontSize: 10, color: "#D97706", marginTop: 3, fontWeight: 700 }}>⚠ Kézzel felülírva – indoklás szükséges</p>}
              {!form.penzugy.tavKmForras && <p style={{ fontSize: 10, color: "#94A3B8", marginTop: 3 }}>Nincs számítva – mentés előtt adj meg értéket vagy kattints Auto-ra</p>}
            </Field>
            {form.penzugy.tavKmForras === "kezi" && (
            <Field label="Km felülírás indoka *" half>
              <input
                value={form.penzugy.tavKmNaplo || ""}
                onChange={e => {
                  const v = e.target.value;
                  setForm(p => ({ ...p, penzugy: { ...p.penzugy, tavKmNaplo: v } }));
                }}
                placeholder="pl. valós útvonal eltér, kerülő, torlódás…"
                style={{ ...inp, borderColor: !form.penzugy.tavKmNaplo?.trim() ? "#FCA5A5" : "#86EFAC" }}
              />
            </Field>
            )}
            <Field label="Csapatlétszám (fő)" half>
              <input type="number" value={form.penzugy.csapatLetszam || 1} onChange={e => updPenz("csapatLetszam", e.target.value)} placeholder="1" style={inp} />
            </Field>
            <Field label="Munkanapok száma" half>
              <input type="number" value={form.penzugy.munkanapok || 1} onChange={e => updPenz("munkanapok", e.target.value)} placeholder="1" style={inp} />
            </Field>
            <div style={{ gridColumn: "span 2", marginTop: 4 }}>
              <button type="button" onClick={() => setExtraCostOpen(o => !o)}
                style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: 8, cursor: "pointer", fontSize: 12, color: "#7C3AED", fontWeight: 700, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                {extraCostOpen ? "▼" : "▶"} Részletes költségek (emelőgép, daru, szállás…)
              </button>
            </div>
            {extraCostOpen && (<>
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
            </>)}
            <Field label="Szerződéses összeg *" half>
              <input type="number" value={form.elfogadottAjanlat} onChange={e => upd("elfogadottAjanlat", e.target.value)} placeholder="0" style={{ ...inp, border: "2px solid #2563EB", fontWeight: 600 }} />
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
            </>)}
          </div>}
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