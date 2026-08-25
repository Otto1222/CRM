import { useState, useMemo, useEffect, useRef } from "react";
import { X, Save, Navigation, TrendingUp } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../lib/constants.js";
import { getUsers } from "../../lib/crmUsers.js";
import { loadLocal, saveLocal } from "../../lib/localDb.js";
import {
  PROJEKT_FORRAS, getProjektTipus,
  ANYAGELSZAMOLAS_NINCS_KIVALASZTVA, ANYAGELSZAMOLASI_MODOK,
  hasAnyagelszamolasiMod, validateAnyagelszamolasiModStatusValtas,
} from "./projekt.schema.js";
import { migrateProjektForrasFromRekord, validateProjektForrás, FORRAS_ELLENORZES_SZUKSEGES, getAutoAnyagelszamolasiMod } from "../../lib/workflowRules.js";
import { createAjanlatPillanatkep } from "../ajanlatok/ajanlat.schema.js";
import { getAktivFovallalkozok, findSzabaly } from "../fovallalkozok/fovallalkozo.service.js";
import { getAktivCsapatok } from "../csapatok/csapat.service.js";
import { autoFillPenzugy } from "../../services/workOrderFinancial.service.js";
import { calcProjektElszamolas, buildInput } from "../../services/settlementCalculator.js";
import { getAktivMunkatipusok } from "../munkatipusok/munkatipus.service.js";
import { createProjekt, updateProjekt, validateProjektDatum } from "./projekt.service.js";
import { createInitialWorkorderForProject } from "../../services/projectWorkorder.service.js";
import { driveCreateProjektFolder } from "../../lib/driveApi.js";
import {
  shouldCreateInitialWorkorder,
  getInitialWorkorderTypeByProjectStatus,
} from "./projectRules.js";
import AddressSearch from "../../components/AddressSearch.jsx";
import { calcRoundTripKm } from "../../lib/geoService.js";
import TetelesExcelImportPanel from "../../components/TetelesExcelImportPanel.jsx";
import DijtetelKosarPicker from "../../components/DijtetelKosarPicker.jsx";
import { calcKmDijOsszeg } from "../fovallalkozok/elszamolasiMotor.js";
import { becsulMuszakiAdatokKosarbol, becsulMuszakiAdatokAjanlatFoTetelekbol } from "../../lib/dijtablaMuszakiAdatokBecsles.js";
const Field = ({ label, children, half }) => (
  <div style={{ gridColumn: half ? "span 1" : "span 2" }}>
    <label
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: C.muted,
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
  border: `1.5px solid ${C.border}`,
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
  const initialForrás = projekt
    ? migrateProjektForrasFromRekord(projekt)
    : (ajanlatElofolt ? "sajat_ajanlat" : "");
  // Ha a form induláskor már ismert forrással nyílik (pl. a Projektek oldal
  // "Belső munka" / "Saját ajánlat" gombjairól, projekt.id nélkül), az
  // egyértelműen levezethető anyagelszámolási mód ugyanúgy auto-beállítódik,
  // mint amikor a felhasználó a form belsejében kattint a forrás-gombra –
  // különben új projekt esetén a mentés zsákutcába futna (kötelező mező,
  // amit a UI ennél a forrásnál nem is ajánl fel kiválasztásra).
  const initialAutoMod = isNew ? getAutoAnyagelszamolasiMod(initialForrás) : null;
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
    forrás: initialForrás,
    anyagelszamolasiMod: projekt?.anyagelszamolasiMod || initialAutoMod || ANYAGELSZAMOLAS_NINCS_KIVALASZTVA,
    adminReviewRequired: projekt?.adminReviewRequired || false,
    projektTipus: projekt?.projektTipus || (ajanlatElofolt ? "Saját projekt" : ""),
    ajanlatId: projekt?.ajanlatId || ajanlatElofolt?.id || null,
    elfogadottAjanlatPillanatkep: projekt?.elfogadottAjanlatPillanatkep || null,
    // P0-007: "Saját munka" két alfajtája – csak forrás==="sajat_ajanlat" esetén értelmezett.
    sajatMunkaTipus: projekt?.sajatMunkaTipus || (ajanlatElofolt ? "ajanlat" : ""),
    elfogadottExcelPillanatkep: projekt?.elfogadottExcelPillanatkep || null,
    fovKapcsolattarto: projekt?.fovKapcsolattarto || "",
    fovFizetesiHatarido: projekt?.fovFizetesiHatarido || "",
    fovMegjegyzes: projekt?.fovMegjegyzes || "",
    finanszirozasCimke: projekt?.finanszirozasCimke || "",
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
    penzugy: {
      ...(projekt?.penzugy || {
        fovallalkoziId: "",
        munkatipus: "",
        elszamolasiSzabalyId: "",
        tavKm:       0,
        tavKmForras: "",
        tavKmNaplo:  "",
        csapatLetszam: 1,
        munkanapok: 1,
        darabszam: 1,
        felultBevitel: null,
        keziCsapatBer: null,
        keziUtikoltség: null,
        keziAnyagkoltség: null,
        keziKartérités: null,
        emelőgepKoltseg:       0,
        daruKoltseg:           0,
        szallasKoltseg:        0,
        bereltEszkozKoltseg:   0,
        irodaAdminKoltseg:     0,
        egyebKoltseg:          0,
        szerelesiAnyagKoltseg: 0,
        szerszamKoltseg:       0,
        dijtablaTetelek:     [],
        dijtablaKmTetelId:   "",
        dijtablaKmKod:       "",
        dijtablaKmDijFtKm:   0,
        dijtablaKmKuszobKm:  0,
      }),
      panel_db:       projekt?.penzugy?.panel_db       ?? projekt?.napelemDb     ?? 0,
      akku_db:        projekt?.penzugy?.akku_db        ?? projekt?.akkumulatorDb ?? 0,
      smart_meter_db: projekt?.penzugy?.smart_meter_db ?? projekt?.smartMeterDb  ?? 0,
      inverter_db:    projekt?.penzugy?.inverter_db    ?? projekt?.inverterDb    ?? 0,
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
  // P0-008: a form eddig ~20 mezőt mutatott egyszerre, a legtöbb csak
  // adminisztratív részlet, nem az árbecsléshez szükséges. "További adatok"
  // mögé kerül: Csapat, Ütemezés, fővállalkozói ügyfél/kapcsolattartó
  // részletek – becsukva indul, bármikor kinyitható/utólag is kitölthető.
  const [reszletekOpen, setReszletekOpen] = useState(false);
  // P0-010: fővállalkozói munkánál az ügyfél/telepítési adatok (név, cím,
  // elérhetőség) MINDIG elsődlegesek – korábban a "További adatok" mögé
  // voltak rejtve, ami miatt a telepítési cím (és vele az automatikus
  // km-számítás alapja) csendben kimaradt a projekt létrehozás elsődleges
  // nézetéből. A saját munka / ajánlatos flow ugyfélOpen-mechanizmusa
  // változatlan marad.
  const ugyfelMezokLathatok =
    form.forrás === "sajat_ajanlat" ? (ugyfélOpen || !form.ajanlatId)
    : true;
  // P0-013 (revízió): a felhasználó egyértelműen jelezte, hogy az Ügyfél
  // neve / Kapcsolattartó / Telefonszám / E-mail / Ügyfél lakcíme mezőket
  // ténylegesen minden fővállalkozói projektnél kitölti – ezek tehát ismét
  // elsődlegesen láthatók, NEM a "További adatok" mögött. Csak azokat a
  // mezőket rejtettük el / töröltük, amikhez tényleg nincs referencia
  // máshol a rendszerben (ld. FV kapcsolattartó, Fizetési határidő,
  // Megbízó cég neve, Státusz/finanszírozás).
  const softUgyfelMezokLathatok = ugyfelMezokLathatok;
  // P0-007: "Saját munka" almenettől függően más a kötelező feltétel –
  // ajánlat-alfajtánál ajánlat kiválasztása, Excel-alfajtánál sikeres import.
  // Tétel-kosár a díjtétel-katalógusból (ld. DijtetelKosarPicker) – ha van
  // legalább egy kiválasztott tétel, ez adja a fővállalkozói bevételt, és a
  // régi, munkatípus-alapú legördülő a "További adatok" mögé kerül (nem
  // kötelező többé), hogy a projekt létrehozás elsődleges nézete egyszerű
  // maradjon akkor is, ha a fővállalkozónak sok tétele van a díjtáblájában.
  const vanDijtablaKosar = form.forrás === "fovallalkozoi_munka" && (form.penzugy.dijtablaTetelek?.length > 0);
  // P0-012: saját munkánál a Műszaki adatok NEM kér kézi bevitelt akkor sem,
  // ha a mérvadó forrás egy elfogadott ajánlat vagy egy elfogadott tételes
  // Excel – mindkettő már tartalmazza ugyanezeket a mennyiségeket, csak
  // más-más alakban (ld. lenti useEffect-ek). A kosárral (fővállalkozói),
  // az ajánlattal és az Excellel egyaránt EGYETLEN forrás a mérvadó – nincs
  // külön "melyiket vegyem figyelembe" döntés, azt vesszük, amelyik a
  // projekt forrásához (forrás/sajatMunkaTipus) tartozik.
  const vanAjanlatMuszakiForras = form.forrás === "sajat_ajanlat" && form.sajatMunkaTipus === "ajanlat" && !!form.ajanlatId;
  const vanExcelMuszakiForras   = form.forrás === "sajat_ajanlat" && form.sajatMunkaTipus === "tetelesExcel" && !!form.elfogadottExcelPillanatkep;
  const vanAutoMuszakiForras    = vanDijtablaKosar || vanAjanlatMuszakiForras || vanExcelMuszakiForras;

  const formBlocked = isNew && form.forrás === "sajat_ajanlat" && (
    !form.sajatMunkaTipus ||
    (form.sajatMunkaTipus === "ajanlat" && !form.ajanlatId) ||
    (form.sajatMunkaTipus === "tetelesExcel" && !form.elfogadottExcelPillanatkep)
  );

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

  // P0-010: ha csak egyetlen aktív csapat van, azt automatikusan kiválasztjuk
  // új fővállalkozói projektnél – a km-számításhoz enélkül is kellene csapat,
  // felesleges rákattintani, ha nincs is választási lehetőség.
  useEffect(() => {
    if (!isNew || form.forrás !== "fovallalkozoi_munka") return;
    if (form.csapatId || csapatok.length !== 1) return;
    const cs = csapatok[0];
    setForm(p => ({ ...p, csapatId: cs.id, csapatNev: cs.nev }));
  }, [isNew, form.forrás, form.csapatId, csapatok]);

  // P0-011: amíg van tétel-kosár, a "Műszaki adatok" (napelem/inverter/akku/
  // smart meter db, EV töltő) a kosárból származik – nem kell kétszer
  // beírni ugyanazt a mennyiséget. Csak akkor írjuk felül, ha van legalább
  // 1 tétel a kosárban; ha a PM kiüríti a kosarat, a korábban beírt/becsült
  // értékek nem törlődnek automatikusan (kézzel maradnak módosíthatók).
  useEffect(() => {
    if (form.forrás !== "fovallalkozoi_munka") return;
    const tetelek = form.penzugy.dijtablaTetelek || [];
    if (tetelek.length === 0) return;
    const becsult = becsulMuszakiAdatokKosarbol(tetelek);
    setForm(p => ({
      ...p,
      napelemDb:     becsult.napelemDb,
      inverterDb:    becsult.inverterDb,
      akkumulatorDb: becsult.akkumulatorDb,
      smartMeterDb:  becsult.smartMeterDb,
      autoTolto:     becsult.autoTolto || p.autoTolto,
      penzugy: { ...p.penzugy, darabszam: becsult.napelemDb || p.penzugy.darabszam },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.forrás, form.penzugy.dijtablaTetelek]);

  // P0-012: saját munkánál, elfogadott ajánlat alapú alfajtánál a Műszaki
  // adatok az ajánlat fő tételeinek mennyiségeiből származnak – közvetlen
  // megfeleltetés (ld. becsulMuszakiAdatokAjanlatFoTetelekbol), nem becslés.
  useEffect(() => {
    if (form.forrás !== "sajat_ajanlat" || form.sajatMunkaTipus !== "ajanlat" || !form.ajanlatId) return;
    const a = elfogadottAjanlatok.find(x => x.id === form.ajanlatId);
    if (!a?.fo_tetelek) return;
    const becsult = becsulMuszakiAdatokAjanlatFoTetelekbol(a.fo_tetelek);
    setForm(p => ({
      ...p,
      napelemDb:     becsult.napelemDb,
      inverterDb:    becsult.inverterDb,
      akkumulatorDb: becsult.akkumulatorDb,
      smartMeterDb:  becsult.smartMeterDb,
      penzugy: { ...p.penzugy, darabszam: becsult.napelemDb || p.penzugy.darabszam },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.forrás, form.sajatMunkaTipus, form.ajanlatId]);

  // P0-012: saját munkánál, elfogadott tételes Excel alapú alfajtánál a
  // Műszaki adatok ugyanazzal a kategória/megnevezés-alapú becsléssel
  // származtatható, mint a fővállalkozói kosárnál (az Excel-sorok alakja
  // hasonló: nev, kategoria, mennyiseg, egyseg – ld. tetelesExcelImport.js).
  useEffect(() => {
    if (form.forrás !== "sajat_ajanlat" || form.sajatMunkaTipus !== "tetelesExcel" || !form.elfogadottExcelPillanatkep) return;
    const becsult = becsulMuszakiAdatokKosarbol(form.elfogadottExcelPillanatkep.tetelek || []);
    setForm(p => ({
      ...p,
      napelemDb:     becsult.napelemDb,
      inverterDb:    becsult.inverterDb,
      akkumulatorDb: becsult.akkumulatorDb,
      smartMeterDb:  becsult.smartMeterDb,
      autoTolto:     becsult.autoTolto || p.autoTolto,
      penzugy: { ...p.penzugy, darabszam: becsult.napelemDb || p.penzugy.darabszam },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.forrás, form.sajatMunkaTipus, form.elfogadottExcelPillanatkep]);

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
    const fv = fovallalkozok.find(f => f.id === fvId);
    // Fővállalkozó-váltáskor a tétel-kosár érvényét veszti (más fővállalkozó
    // katalógusára hivatkozna) – üresen indul, a PM újraválogatja az új
    // fővállalkozó díjtáblájából.
    setForm(p => ({
      ...p,
      // P0-011: a "Megbízó cég neve" a legtöbb esetben ugyanaz, mint a
      // kiválasztott (billing-célú) fővállalkozó – auto-kitöltjük, de csak
      // ha a mező még üres, hogy egy kézzel beírt eltérő nevet ne írjunk felül.
      megbizoCeg: p.megbizoCeg?.trim() ? p.megbizoCeg : (fv?.nev || p.megbizoCeg),
      penzugy: {
        ...filled,
        fovallalkoziId: fvId,
        elszamolasiSzabalyId: sz?.id || "",
        dijtablaTetelek:    fvId === p.penzugy?.fovallalkoziId ? p.penzugy?.dijtablaTetelek || [] : [],
        dijtablaKmTetelId:  fvId === p.penzugy?.fovallalkoziId ? p.penzugy?.dijtablaKmTetelId : "",
        dijtablaKmKod:      fvId === p.penzugy?.fovallalkoziId ? p.penzugy?.dijtablaKmKod : "",
        dijtablaKmDijFtKm:  fvId === p.penzugy?.fovallalkoziId ? p.penzugy?.dijtablaKmDijFtKm : 0,
        dijtablaKmKuszobKm: fvId === p.penzugy?.fovallalkoziId ? p.penzugy?.dijtablaKmKuszobKm : 0,
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
  // P0-009: tétel-kosár a díjtétel-katalógusból (ld. DijtetelKosarPicker) –
  // a kiválasztott tételek pillanatképe a penzugy.dijtablaTetelek mezőbe kerül,
  // a km-díj tétel Ft/km rátája pedig penzugy.dijtablaKmDijFtKm-be fagyasztva.
  function updateDijtablaKosar(ujKosar) {
    setForm(p => ({ ...p, penzugy: { ...p.penzugy, dijtablaTetelek: ujKosar } }));
    if (hiba) setHiba("");
  }
  function updateKmMeta(meta) {
    setForm(p => ({
      ...p,
      penzugy: {
        ...p.penzugy,
        dijtablaKmTetelId:  meta?.kmTetelId || "",
        dijtablaKmKod:      meta?.kod || "",
        dijtablaKmDijFtKm:  Number(meta?.ftKm) || 0,
        dijtablaKmKuszobKm: Number(meta?.kuszobKm) || 0,
      },
    }));
  }
  function beillesztesSzerzodesesOsszegbe() {
    const tetelek = form.penzugy.dijtablaTetelek || [];
    const tetelekOsszesen = tetelek.reduce((s, t) => s + (Number(t.osszesen) || 0), 0);
    const kellKm = tetelek.some(t => t.kmDij) && Number(form.penzugy.dijtablaKmDijFtKm) > 0;
    const kmOsszeg = kellKm
      ? calcKmDijOsszeg(form.penzugy.tavKm, form.penzugy.dijtablaKmKuszobKm, form.penzugy.dijtablaKmDijFtKm).osszeg
      : 0;
    upd("elfogadottAjanlat", tetelekOsszesen + kmOsszeg);
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

  function handleExcelImport(pillanatkep) {
    setForm(p => ({
      ...p,
      elfogadottExcelPillanatkep: pillanatkep,
      elfogadottAjanlat: pillanatkep?.osszesito?.netto_osszeg || (pillanatkep ? p.elfogadottAjanlat : 0),
    }));
    if (pillanatkep && hiba) setHiba("");
  }

  async function handleSave() {
    if (isNew && form.forrás === "sajat_ajanlat" && form.sajatMunkaTipus === "ajanlat" && !form.ajanlatId) {
      setHiba("Először válassz elfogadott ajánlatot a folytatáshoz.");
      return;
    }
    if (isNew && form.forrás === "sajat_ajanlat" && form.sajatMunkaTipus === "tetelesExcel" && !form.elfogadottExcelPillanatkep) {
      setHiba("Először importáld az elfogadott tételes Excelt a folytatáshoz.");
      return;
    }
    if (isNew && form.forrás === "sajat_ajanlat" && !form.sajatMunkaTipus) {
      setHiba("Válaszd ki, hogy a Saját munka ajánlat vagy elfogadott tételes Excel alapján indul.");
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
    const datumV = validateProjektDatum(form);
    if (!datumV.ok) { setHiba(datumV.error); return; }
    let valasztottAjanlat = null;
    if (form.forrás === "sajat_ajanlat" && form.sajatMunkaTipus === "ajanlat") {
      valasztottAjanlat = elfogadottAjanlatok.find(a => a.id === form.ajanlatId) || null;
      if (isNew && !valasztottAjanlat) {
        setHiba("A kiválasztott ajánlat már nem érhető el (közben megváltozott a státusza, vagy már köthették más projekthez). Válassz egy másik elfogadott ajánlatot.");
        return;
      }
    }
    if (isNew && form.forrás === "sajat_ajanlat" && form.sajatMunkaTipus === "tetelesExcel" && !form.elfogadottExcelPillanatkep) {
      setHiba("Az importált tételes Excel elveszett – importáld újra a folytatáshoz.");
      return;
    }
    setSaving(true);
    try {
      // P0-013 kiegészítés: "Ügyfél neve" fővállalkozói munkánál el van
      // rejtve a "További adatok" mögé (nem kötelező), de sok más dokumentum
      // (munkalap, TIG, PDF-export, naptár) erre a mezőre hivatkozik – ha
      // véletlenül üresen marad, azokon is üresen jelenne meg. Ezért, ha
      // nincs kitöltve, automatikusan a Megbízó cég nevéből (ami már eddig
      // is a fővállalkozó nevéből töltődik) vagy a projekt nevéből esik
      // vissza – SOHA nem marad üresen, kézi kitöltés nélkül is.
      const clientNevVegleges = form.forrás === "fovallalkozoi_munka" && !form.clientNev?.trim()
        ? (form.megbizoCeg?.trim() || form.nev?.trim() || form.clientNev)
        : form.clientNev;
      // Kosár-alapú fővállalkozói munkánál a "Napelem darabszám" mezőt nem
      // lehet kézzel megadni (ld. fent) – ehelyett itt, mentéskor számoljuk
      // ki a kosár "panel" egységű tételeinek mennyiség-összegéből, hogy a
      // Riportok / TIG-dokumentumok / installer-nézet ne maradjon üresen.
      const napelemDbVegleges = vanDijtablaKosar
        ? (form.penzugy.dijtablaTetelek || [])
            .filter(t => t.egyseg === "panel")
            .reduce((s, t) => s + (Number(t.mennyiseg) || 0), 0)
        : form.napelemDb;
      const data = {
        ...form,
        clientNev: clientNevVegleges,
        napelemDb: napelemDbVegleges,
        elfogadottAjanlat: Number(form.elfogadottAjanlat) || 0,
        projektTipus: getProjektTipus(form.forrás),
        // Backward compat boolean mezők szinkronban az db értékekkel
        akkumulator: (form.akkumulatorDb || 0) > 0,
        okosmerő:    (form.smartMeterDb  || 0) > 0,
        penzugy: {
          ...form.penzugy,
          darabszam: napelemDbVegleges || form.penzugy?.darabszam || 1,
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
            id: `ugy_${crypto.randomUUID()}`,
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
            borderBottom: `1px solid ${C.border}`,
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
              ? (form.forrás === "sajat_ajanlat" ? "Új projekt – Saját munka"
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
              color: C.muted,
            }}
          >
            <X size={22} />
          </button>
        </div>
        <div style={{ padding: "20px 24px" }}>
          {hiba && (
            <div
              style={{
                background: C.dangerLight,
                border: `1.5px solid ${C.dangerLight}`,
                borderRadius: 9,
                padding: "9px 12px",
                marginBottom: 14,
                fontSize: 13,
                color: C.danger,
                fontWeight: 600,
              }}
            >
              {hiba}
            </div>
          )}
          {/* ── Projekt forrása (kötelező) ── */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
              Projekt forrása *
            </p>

            {/* Bizonytalan forrás figyelmeztetés – adminnak kézzel kell besorolni */}
            {form.forrás === FORRAS_ELLENORZES_SZUKSEGES && (
              <div style={{ background:C.dangerLight, border:`2px solid ${C.danger}`, borderRadius:10, padding:"12px 16px", marginBottom:12, fontSize:13, color:C.dangerDark }}>
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
                        setForm(p => ({ ...p, forrás: f.id, clientNev: "E.D.I. Solutions Kft.", clientId: "", clientCim: "", clientTel: "", clientEmail: "", ajanlatId: null, ...(isNew ? { anyagelszamolasiMod: getAutoAnyagelszamolasiMod(f.id), adminReviewRequired: false } : {}) }));
                      } else if (f.id === "sajat_ajanlat") {
                        setForm(p => ({
                          ...p,
                          forrás: f.id,
                          clientNev: p.clientNev === "E.D.I. Solutions Kft." ? "" : p.clientNev,
                          // Az anyagelszámolási mód auto-levezetése getAutoAnyagelszamolasiMod()-ból jön
                          // (lásd workflowRules.js) – ugyanaz a leképezés fut le itt és a form induló
                          // állapotában is, ha a forrás előre be van állítva.
                          ...(isNew ? { anyagelszamolasiMod: getAutoAnyagelszamolasiMod(f.id), adminReviewRequired: false } : {}),
                        }));
                      } else {
                        upd("forrás", f.id);
                      }
                      if (hiba) setHiba("");
                    }}
                    title={f.desc}
                    style={{ padding: "8px 16px", borderRadius: 9, border: `2px solid ${active ? f.color : C.border}`, background: active ? f.bg : "#fff", color: active ? f.color : C.muted, fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: FONT, transition: "all .15s" }}>
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* sajat_ajanlat ("Saját munka"): melyik forrás a mérvadó – ajánlat vagy tételes Excel */}
            {form.forrás === "sajat_ajanlat" && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, margin: "0 0 8px" }}>
                  Saját munka típusa *
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                  {[
                    { id: "ajanlat",      label: "Ajánlat alapján" },
                    { id: "tetelesExcel", label: "Elfogadott tételes Excel alapján" },
                  ].map(t => {
                    const active = form.sajatMunkaTipus === t.id;
                    return (
                      <button key={t.id} type="button"
                        onClick={() => {
                          setForm(p => ({
                            ...p,
                            sajatMunkaTipus: t.id,
                            // Váltáskor a másik alfajta adatai törlődnek, hogy ne maradjon
                            // félrevezető, be nem mentett maradék állapot a formban.
                            ajanlatId: t.id === "ajanlat" ? p.ajanlatId : null,
                            elfogadottExcelPillanatkep: t.id === "tetelesExcel" ? p.elfogadottExcelPillanatkep : null,
                          }));
                          if (hiba) setHiba("");
                        }}
                        style={{ padding: "7px 14px", borderRadius: 8, border: `1.5px solid ${active ? C.accent : C.border}`, background: active ? C.accentLight : "#fff", color: active ? C.accent : C.muted, fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                {form.sajatMunkaTipus === "ajanlat" && (
                  <div style={{ background: C.accentLight, border: `1.5px solid ${C.accentLight}`, borderRadius: 10, padding: "12px 14px" }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: C.accent, margin: "0 0 8px" }}>
                      📋 Elfogadott ajánlat kiválasztása *
                    </p>
                    {elfogadottAjanlatok.length === 0 ? (
                      <p style={{ fontSize: 12, color: C.danger, margin: 0, fontWeight: 600 }}>
                        Nincs elfogadott ajánlat. Menj az <strong>Ajánlatok</strong> oldalra, módosítsd az ajánlat státuszát "Elfogadva"-ra, majd onnan hozd létre a projektet.
                      </p>
                    ) : (
                      <>
                        <select value={form.ajanlatId || ""} onChange={e => handleAjanlatSelect(e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", border: `1.5px solid ${form.ajanlatId ? C.accent : C.border}`, borderRadius: 9, fontSize: 14, fontFamily: FONT, outline: "none", background: "#fff" }}>
                          <option value="">— Válassz elfogadott ajánlatot —</option>
                          {elfogadottAjanlatok.map(a => (
                            <option key={a.id} value={a.id}>
                              {a.ajanlatkod} · {a.clientNev} · {a.osszeg ? a.osszeg.toLocaleString("hu-HU") + " Ft" : "—"} ({a.nev || "Nincs megnevezés"})
                            </option>
                          ))}
                        </select>
                        {form.ajanlatId && <p style={{ fontSize: 11, color: C.success, margin: "4px 0 0", fontWeight: 600 }}>✅ Ügyfél adatok automatikusan betöltve az ajánlatból</p>}
                        {!form.ajanlatId && <p style={{ fontSize: 12, color: C.accent, margin: "6px 0 0", fontWeight: 600 }}>⬇ Válassz ajánlatot a folytatáshoz – az adatok automatikusan kitöltődnek.</p>}
                      </>
                    )}
                  </div>
                )}

                {form.sajatMunkaTipus === "tetelesExcel" && (
                  <div>
                    <TetelesExcelImportPanel
                      value={form.elfogadottExcelPillanatkep}
                      onChange={handleExcelImport}
                      disabled={!isNew}
                    />
                    {form.elfogadottExcelPillanatkep && (
                      <p style={{ fontSize: 11, color: C.success, margin: "8px 0 0", fontWeight: 600 }}>
                        ✅ A Kivitelezési Csomag tételei a projekt létrehozásakor ebből az importból generálódnak.
                      </p>
                    )}
                  </div>
                )}

                {!form.sajatMunkaTipus && (
                  <p style={{ fontSize: 12, color: C.accent, margin: 0, fontWeight: 600 }}>
                    ⬆ Válassz típust a folytatáshoz.
                  </p>
                )}
              </div>
            )}

            {/* fovallalkozoi_munka: külső munkaszám kötelező */}
            {form.forrás === "fovallalkozoi_munka" && (
              <div style={{ marginTop: 12, background: C.accentLight, border: `1.5px solid ${C.accentLight}`, borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ fontSize: 12, color: C.accent, margin: "0 0 6px", fontWeight: 700 }}>
                  🤝 Fővállalkozói munka – kötelező mezők:
                </p>
                <p style={{ fontSize: 12, color: C.accent, margin: 0 }}>
                  Külső munkaszám (fent) · Fővállalkozó · Elszámolási szabály / díjtábla-tételek (Pénzügyi konfiguráció) ·
                  Projektvezető · Kivitelező csapat
                </p>
                <p style={{ fontSize: 11.5, color: C.accent, margin: "6px 0 0", opacity: .85 }}>
                  Minden más ügyfél-adat (kapcsolattartó, telefon, e-mail…) csak akkor kell, ha a "További adatok" alatt
                  fontos – nem befolyásolja a költséget.
                </p>
              </div>
            )}

            {/* belso_munka: tájékoztató */}
            {form.forrás === "belso_munka" && (
              <div style={{ marginTop: 12, background: C.successLight, border: "1.5px solid #86EFAC", borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ fontSize: 12, color: C.success, margin: 0, fontWeight: 600 }}>
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
            <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 8 }}>
              Anyagelszámolási mód *
            </p>

            {/* Migrált / admin ellenőrzést igénylő projekt – kötelező figyelmeztetés */}
            {(form.anyagelszamolasiMod === ANYAGELSZAMOLAS_NINCS_KIVALASZTVA || form.adminReviewRequired) && (
              <div style={{ background:C.dangerLight, border:`2px solid ${C.danger}`, borderRadius:10, padding:"12px 16px", marginBottom:12, fontSize:13, color:C.dangerDark, fontWeight:700 }}>
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
                    style={{ padding: "8px 16px", borderRadius: 9, border: `2px solid ${active ? m.color : C.border}`, background: active ? m.bg : "#fff", color: active ? m.color : C.muted, fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: FONT, transition: "all .15s" }}>
                    {m.label}
                  </button>
                );
              })}
            </div>
            {hasAnyagelszamolasiMod(form) && (
              <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
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
                style={{ ...inp, border: `2px solid ${C.accent}`, fontWeight: 600 }}
              />
            </Field>
            {form.forrás === "fovallalkozoi_munka" && (
            <Field label="Külső / fővállalkozói azonosító *" half>
              <input
                value={form.kulsoAzonosito}
                onChange={e => upd("kulsoAzonosito", e.target.value)}
                placeholder="pl. FŐV-2026-145"
                style={{ ...inp, border: `2px solid ${C.accent}` }}
              />
            </Field>
            )}
            {/* P0-011: fővállalkozói munkánál a Munkatípus legördülő MÁR NEM
                elsődleges bemenet (a tétel-kosár írja le, milyen munka
                lesz) – a "További adatok" mögé kerül, opcionális
                felülírásként (ld. lent), a régi szabály-motoros fővállalkozók
                számára, akikhez még nincs díjtétel-katalógus feltöltve. */}
            {form.forrás !== "fovallalkozoi_munka" && (
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
            )}
            {/* "Státusz" szabad legördülő törölve – a projekt státusza a
                munkalapok tényleges előrehaladásából, automatikusan
                számolódik (syncProjektFromWorkorders), nem szabad kézzel
                bárhonnan átállítható legyen (ld. a session korábbi,
                "a státusz sehol ne legyen szabadon állítható" elve). Új
                projekt mindig "Létrehozva" státusszal indul (ld. a form
                kezdőállapota), szerkesztésnél a meglévő érték megmarad,
                módosítani csak a megfelelő munkafolyamat-lépéseken keresztül
                lehet (Munkalapok oldal). */}

            {/* P0-008: egyetlen, mindig látható kapcsoló a nem-alapvető
                mezőkhöz (Csapat, Ütemezés, fővállalkozói ügyfél/kapcsolattartó
                részletek) – a form kezdőnézete így csak a becsléshez/mentéshez
                ténylegesen szükséges mezőket mutatja. */}
            <div style={{ gridColumn: "span 2", borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <button type="button" onClick={() => setReszletekOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", fontSize: 12, color: C.accent, fontWeight: 700, padding: "6px 12px", fontFamily: "inherit" }}>
                {reszletekOpen ? "▼" : "▶"} További adatok (ügyfél, csapat, ütemezés, fővállalkozói részletek…)
              </button>
            </div>

            {form.forrás !== "belso_munka" && (<>
            {/* P0-013: fővállalkozói munkánál a "puha" ügyfél-adminisztráció
                (kapcsolattartó, telefon, email, lakcím stb.) NEM kell a
                költségszámításhoz – csak a Telepítési cím (km-hez) és a
                Kivitelező csapat (km + csapatbérhez). A régen mindig
                megjelenő ~9 extra mező a "További adatok" mögé került, hogy
                a projekt létrehozás elsődleges nézete tényleg csak a
                ténylegesen szükséges mezőket mutassa. */}
            <div style={{ gridColumn: "span 2", borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: softUgyfelMezokLathatok ? 10 : 0 }}>
                Ügyfél adatok
                {!softUgyfelMezokLathatok && form.clientNev && <span style={{ fontWeight: 500, color: "#374151", marginLeft: 8, textTransform: "none", fontSize: 12 }}>· {form.clientNev}</span>}
              </p>
              {form.forrás === "sajat_ajanlat" && form.ajanlatId && (
                <button type="button" onClick={() => setUgyfélOpen(o => !o)}
                  style={{ fontSize: 11, color: C.accent, background: "none", border: "none", cursor: "pointer", fontWeight: 700, paddingBottom: 10 }}>
                  {ugyfélOpen ? "▲ Összecsuk" : "▼ Megnyit"}
                </button>
              )}
            </div>
            {softUgyfelMezokLathatok && <>
            <Field label="Ügyfél kiválasztása (opcionális)">
              <select value={form.clientId} onChange={handleUgyfél} style={inp}>
                <option value="">— Válassz a listából —</option>
                {ugyfelek.map(u => (
                  <option key={u.id} value={u.id}>{u.name}{u.address ? ` – ${u.address}` : ""}</option>
                ))}
              </select>
              {form.clientId && <p style={{ fontSize: 10, color: C.success, marginTop: 3 }}>✅ Adatok automatikusan betöltve</p>}
            </Field>
            <Field label={form.forrás === "sajat_ajanlat" ? "Ügyfél neve *" : "Ügyfél neve (opcionális)"} half>
              <input value={form.clientNev} onChange={e => upd("clientNev", e.target.value)} placeholder="Kovács János" style={inp} />
            </Field>
            {/* Megbízó cég neve: manuális input törölve (alig 3 fájlban
                használt mező volt) – marad az automatikus kitöltés a
                kiválasztott fővállalkozó nevéből (ld. handleFovallalkozo),
                csak nincs hozzá saját szerkesztő mező a form-on. */}
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
            </>}
            {/* Telepítési cím – MINDIG látható (nem csak a "puha" mezőkkel
                együtt), mert ez adja az automatikus km-számítás alapját. */}
            {ugyfelMezokLathatok && (
            <Field label="Telepítési cím">
              <AddressSearch
                value={form.telepitesiCim}
                onChange={v => upd("telepitesiCim", v)}
                onSelect={r => upd("telepitesiCim", r.display_name.split(",").slice(0,3).join(",").trim())}
                placeholder="Ha eltér a lakcímtől"
                style={inp}
              />
              {form.clientCim && form.telepitesiCim && form.clientCim === form.telepitesiCim && (
                <p style={{ fontSize: 10, color: C.success, marginTop: 3, fontWeight: 600 }}>✓ Azonos az ügyfél lakcímével</p>
              )}
            </Field>
            )}
            {/* Kivitelező csapat, Telepítés dátuma, Egyéb megjegyzés –
                mindhárom mindig látható fővállalkozói munkánál: a csapat és
                a dátum a km/csapatbér-számításhoz kell, a megjegyzés pedig
                általánosan hasznos, alacsony súrlódású szabad szöveg. A
                "Telepítés dátuma" UGYANAZT a form.tervezettKezdes mezőt írja,
                mint az Ütemezés blokk "Tervezett kezdés" mezője – szándékosan
                csak EGY helyen (itt) szerkeszthető, hogy ne tűnjön két külön
                dátumnak (ld. lent, az Ütemezésnél csak "Tervezett befejezés"
                maradt). A "Státusz (finanszírozás)" a "További adatok" mögé
                került – ritkábban kell, nem elsődleges. */}
            {form.forrás === "fovallalkozoi_munka" && (<>
            <Field label="Kivitelező csapat (a km- és csapatbér-számításhoz)" half>
              <select value={form.csapatId} onChange={handleCsapat} style={inp}>
                <option value="">— Válassz csapatot —</option>
                {csapatok.map(cs => (
                  <option key={cs.id} value={cs.id}>
                    {cs.nev}{cs.telephely ? ` (${cs.telephely})` : ""}
                  </option>
                ))}
              </select>
              {csapatok.length === 0 && (
                <p style={{ fontSize: 10, color: C.warning, marginTop: 3 }}>⚠️ Még nincs létrehozva csapat — előbb add hozzá a Csapat menüben</p>
              )}
            </Field>
            <Field label="Telepítés dátuma" half>
              <input type="date" value={form.tervezettKezdes} onChange={e => upd("tervezettKezdes", e.target.value)}
                min={new Date().toISOString().slice(0,10)} style={inp} />
            </Field>
            <Field label="Egyéb megjegyzés (opcionális)">
              <input value={form.fovMegjegyzes} onChange={e => upd("fovMegjegyzes", e.target.value)}
                placeholder="Bármilyen egyéb tudnivaló a telepítéshez…" style={inp} />
            </Field>
            {/* Státusz (finanszírozás): mező törölve a form-ról (alig 1
                fájlban használt) – a projekt.finanszirozasCimke séma-mező
                megmarad (régi projekteknél megjelenik, ha be volt írva),
                csak nincs hozzá szerkesztő a létrehozás/szerkesztés form-on. */}
            </>)}
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
            {!reszletekOpen && (form.projektvezetoNev || form.csapatNev) && (
              <div style={{ gridColumn: "span 2", fontSize: 12, color: C.muted }}>
                Csapat: {[form.projektvezetoNev, form.csapatNev].filter(Boolean).join(" · ")}
              </div>
            )}
            {/* Munkatípus törölve fővállalkozói munkánál – a klasszikus
                szabály-motor "általános" (munkatípus nélküli) szabályokkal
                is működik, ha egy fővállalkozónak csak EGY, mindenre
                érvényes díja van; ha valaha munkatípusonként eltérő díjra
                lenne szükség, azt a fővállalkozó Excel-katalógusával vagy
                explicit munkatípusos szabállyal kell megoldani, nem ezzel
                a mezővel. Nem szükséges projektenként kitölteni. */}
            {/* Projektvezető – fővállalkozói munkánál mindig elsődlegesen
                látható és kötelező (a validáció is megköveteli, ld. lent). */}
            {form.forrás === "fovallalkozoi_munka" && (
            <Field label="Projektvezető *" half>
              <select value={form.projektvezetoId} onChange={handlePM} style={inp}>
                <option value="">— Válassz —</option>
                {pmList.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
            )}
            {reszletekOpen && (<>
            {form.forrás !== "fovallalkozoi_munka" && (<>
            <div style={{ gridColumn: "span 2", borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
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
                <p style={{ fontSize: 10, color: C.warning, marginTop: 3 }}>⚠️ Még nincs létrehozva csapat — előbb add hozzá a Csapat menüben</p>
              )}
            </Field>
            </>)}
            </>)}
            {/* Műszaki adatok – belső munkánál (garancia/javítás) irreleváns.
                P0-012: EGYETLEN forrás a mérvadó, nincs kétszeri/kézi
                döntés – fővállalkozói munkánál a tétel-kosárból, saját
                munkánál az elfogadott ajánlat fő tételeiből vagy az
                elfogadott tételes Excelből származik automatikusan (ld.
                fenti useEffect-ek), csak egy összefoglalót mutatunk a
                mezők helyett. A kézi mezők (lent, "További adatok" alatt)
                csak a fennmaradó, valóban ismeretlen esetekben jelennek
                meg – onnan bármikor felülírható, ha a becslés pontatlan. */}
            {vanAutoMuszakiForras && (
              <div style={{ gridColumn: "span 2", fontSize: 12, color: C.muted }}>
                Műszaki adatok ({vanDijtablaKosar ? "a tétel-kosárból" : vanAjanlatMuszakiForras ? "az ajánlatból" : "az importált Excelből"}): {[
                  form.napelemDb     ? `${form.napelemDb} panel` : null,
                  form.inverterDb    ? `${form.inverterDb} inverter` : null,
                  form.akkumulatorDb ? `${form.akkumulatorDb} akku` : null,
                  form.smartMeterDb  ? `${form.smartMeterDb} smart meter` : null,
                  form.autoTolto     ? "EV töltő" : null,
                ].filter(Boolean).join(" · ") || "—"}
                {!vanDijtablaKosar && <span style={{ marginLeft: 6 }}>(felülírható lent a "További adatok" alatt)</span>}
              </div>
            )}
            {/* Kosár-alapú fővállalkozói munkánál (Wagner-Solar, Green Home)
                ezek a mezők NEM jelennek meg kézi bevitelre – a panelszám a
                kosár "panel" egységű tételeiből mentéskor automatikusan
                számolódik (ld. lent, a mentés előtti "data" összeállításnál),
                az inverter/akku/smart meter/EV töltő pedig a kosárban saját,
                önálló tételként (pl. B06, C09) van díjazva, nincs rá külön
                darabszám-mezőre szükség. */}
            {reszletekOpen && form.forrás !== "belso_munka" && !vanDijtablaKosar && (<>
            <div style={{ gridColumn: "span 2", borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
                Műszaki adatok {vanAutoMuszakiForras && "(auto-számítva – itt felülírható)"}
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
              <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer", fontSize:14, fontWeight:500, color:C.textSub, userSelect:"none", paddingTop:4 }}>
                <div onClick={() => upd("autoTolto", !form.autoTolto)}
                  style={{ width:44, height:24, borderRadius:12, position:"relative", cursor:"pointer", background:form.autoTolto?C.accent:C.border, transition:"background .2s" }}>
                  <div style={{ position:"absolute", top:3, left:form.autoTolto?23:3, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s", boxShadow:"0 1px 3px rgba(0,0,0,.2)" }}/>
                </div>
                <span style={{ color:form.autoTolto?C.success:C.muted, fontWeight:700 }}>{form.autoTolto?"Van":"Nincs"}</span>
              </label>
            </Field>
            </>)}
            {/* Fővállalkozói munkánál a "Tervezett befejezés" elsődlegesen
                látható (a felhasználó ezt ténylegesen kitölti), a "Tervezett
                kezdés" viszont ugyanaz a mező, mint a fentebbi "Telepítés
                dátuma" (form.tervezettKezdes) – itt nem duplikáljuk. */}
            {form.forrás === "fovallalkozoi_munka" && (
            <Field label="Tervezett befejezés" half>
              <input type="date" value={form.tervezettBefejezes} onChange={e => upd("tervezettBefejezes", e.target.value)} style={inp} />
            </Field>
            )}
            {form.forrás !== "fovallalkozoi_munka" && (<>
            {!reszletekOpen && (form.tervezettKezdes || form.tervezettBefejezes) && (
              <div style={{ gridColumn: "span 2", fontSize: 12, color: C.muted }}>
                Ütemezés: {form.tervezettKezdes || "?"} → {form.tervezettBefejezes || "?"}
              </div>
            )}
            {reszletekOpen && (<>
            <div style={{ gridColumn: "span 2", borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
                Ütemezés
              </p>
            </div>
            <Field label="Tervezett kezdés" half>
              <input type="date" value={form.tervezettKezdes} onChange={e => upd("tervezettKezdes", e.target.value)} min={new Date().toISOString().slice(0,10)} style={inp} />
            </Field>
            <Field label="Tervezett befejezés" half>
              <input type="date" value={form.tervezettBefejezes} onChange={e => upd("tervezettBefejezes", e.target.value)} style={inp} />
            </Field>
            </>)}
            </>)}
            {/* Pénzügyi konfiguráció – csak fővállalkozói munkánál releváns */}
            {form.forrás === "fovallalkozoi_munka" && (<>
            <div style={{ gridColumn: "span 2", borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
                💰 Pénzügyi konfiguráció
              </p>
            </div>
            <Field label={form.forrás === "fovallalkozoi_munka" ? "Fővállalkozó *" : "Fővállalkozó"} half>
              <select value={form.penzugy.fovallalkoziId} onChange={e => handleFovallalkozo(e.target.value)} style={{ ...inp, ...(form.forrás === "fovallalkozoi_munka" ? { border: `2px solid ${C.accent}` } : {}) }}>
                <option value="">— Válassz fővállalkozót —</option>
                {fovallalkozok.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.nev}
                  </option>
                ))}
              </select>
              {!vanDijtablaKosar && form.penzugy.elszamolasiSzabalyId && <p style={{ fontSize: 10, color: C.success, marginTop: 3 }}>✅ Elszámolási szabály automatikusan betöltve</p>}
              {!vanDijtablaKosar && form.penzugy.fovallalkoziId && !form.penzugy.elszamolasiSzabalyId && <p style={{ fontSize: 10, color: C.warning, marginTop: 3 }}>⚠️ Nincs aktív szabály ehhez a munkatípushoz – válassz tételeket lent a díjtáblából, vagy állíts be szabályt (Beállítások → Fővállalkozók)</p>}
            </Field>

            {/* P0-009: tétel-kosár a fővállalkozó díjtétel-katalógusából – ez a
                "tételes számolás", ami leváltja az egyetlen Munkatípus-választást. */}
            {form.penzugy.fovallalkoziId && (
            <Field label="Tételek a díjtáblából (tételes számolás)">
              <DijtetelKosarPicker
                tulajdonosId={form.penzugy.fovallalkoziId}
                value={form.penzugy.dijtablaTetelek || []}
                onChange={updateDijtablaKosar}
                tavKm={form.penzugy.tavKm}
                kmMeta={{ kmTetelId: form.penzugy.dijtablaKmTetelId, ftKm: form.penzugy.dijtablaKmDijFtKm, kuszobKm: form.penzugy.dijtablaKmKuszobKm }}
                onKmMetaChange={updateKmMeta}
              />
              {vanDijtablaKosar && (
                <button type="button" onClick={beillesztesSzerzodesesOsszegbe}
                  style={{ marginTop: 8, padding: "6px 12px", background: C.accentLight, color: C.accent, border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12, fontFamily: FONT }}>
                  ⬇ Kosár összegének beillesztése a Szerződéses összegbe
                </button>
              )}
            </Field>
            )}

            {/* "FV kapcsolattartó" és "Fizetési határidő" mezők törölve –
                sehol máshol a rendszerben nem volt rájuk hivatkozás
                (fovKapcsolattarto / fovFizetesiHatarido), tisztán
                begyűjtött, sehol meg nem jelenő adat volt. A "Fővállalkozói
                megjegyzés" (fovMegjegyzes) fentebb, "Egyéb megjegyzés"
                néven elsődlegesen szerkeszthető, azt nem érintettük. */}
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
                  style={{ ...inp, flex: 1, borderColor: form.penzugy.tavKmForras === "kezi" ? C.warning : C.border }}
                />
                <button type="button" onClick={handleKmAutoCalc} disabled={kmCalc}
                  title="Automatikus km-számítás a csapat telephely → telepítési cím alapján (OSRM)"
                  style={{ padding: "0 10px", background: kmCalc ? C.muted : C.accent, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 600, fontFamily: FONT }}>
                  <Navigation size={13}/>{kmCalc ? "…" : "Auto"}
                </button>
              </div>
              {form.penzugy.tavKmForras === "auto" && (() => {
                const cs = csapatok.find(c => c.id === form.csapatId);
                return <p style={{ fontSize: 10, color: C.success, marginTop: 3, fontWeight: 600 }}>✓ Auto számított · {cs?.telephely || "?"} → {form.telepitesiCim || form.clientCim || "?"}</p>;
              })()}
              {form.penzugy.tavKmForras === "kezi" && <p style={{ fontSize: 10, color: C.warning, marginTop: 3, fontWeight: 700 }}>⚠ Kézzel felülírva – indoklás szükséges</p>}
              {!form.penzugy.tavKmForras && <p style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>Nincs számítva – mentés előtt adj meg értéket vagy kattints Auto-ra</p>}
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
            {/* Munkanapok száma – fővállalkozói munkánál elsődlegesen
                látható, mert ha ez alapértéken (1) marad egy több napos
                munkánál, a "Ft/nap" csapatbér-szabály CSENDBEN alulszámolja
                a csapat bérét. A "Csapatlétszám" viszont csak a ritkán
                használt "Ft/nap/fő" módnál számít – az marad rejtve,
                alapértéken (1) biztonságos. */}
            {form.forrás === "fovallalkozoi_munka" && (
            <Field label="Munkanapok száma (a csapatbér-számításhoz, ha a csapat napidíjas)" half>
              <input type="number" value={form.penzugy.munkanapok || 1} onChange={e => updPenz("munkanapok", e.target.value)} placeholder="1" style={inp} />
            </Field>
            )}
            {reszletekOpen && (<>
            <Field label="Csapatlétszám (fő)" half>
              <input type="number" value={form.penzugy.csapatLetszam || 1} onChange={e => updPenz("csapatLetszam", e.target.value)} placeholder="1" style={inp} />
            </Field>
            {form.forrás !== "fovallalkozoi_munka" && (
            <Field label="Munkanapok száma" half>
              <input type="number" value={form.penzugy.munkanapok || 1} onChange={e => updPenz("munkanapok", e.target.value)} placeholder="1" style={inp} />
            </Field>
            )}
            </>)}
            {/* P0-008: az "Elszámolási mennyiségek" blokk (panel/akku/smart meter/
                inverter db) törölve – duplikálta a fenti "Műszaki adatok" mezőket,
                anélkül hogy szinkronban lett volna velük. A díjszámítás
                (calcProjektElszamolas → buildInput) már eleve a "Műszaki adatok"
                mezőkből (napelemDb/inverterDb/akkumulatorDb/smartMeterDb) esik
                vissza, ha a penzugy.*_db mezők üresek – tehát ez a blokk soha
                nem volt szükséges a helyes számításhoz, csak felesleges,
                összezavaró dupla adatbevitelt jelentett. */}
            <div style={{ gridColumn: "span 2", marginTop: 4 }}>
              <button type="button" onClick={() => setExtraCostOpen(o => !o)}
                style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 8, cursor: "pointer", fontSize: 12, color: C.accent, fontWeight: 700, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}>
                {extraCostOpen ? "▼" : "▶"} Részletes költségek (szerelési kellék, szerszám, emelőgép…)
              </button>
            </div>
            {extraCostOpen && (<>
            <Field label="Szerelési kellék (kábel, csatorna, csavar stb.) (Ft)" half>
              <input type="number" value={form.penzugy.szerelesiAnyagKoltseg || ""} onChange={e => updPenz("szerelesiAnyagKoltseg", e.target.value)} placeholder="0" style={inp} />
            </Field>
            <Field label="Szerszám / eszköz vásárlás (Ft)" half>
              <input type="number" value={form.penzugy.szerszamKoltseg || ""} onChange={e => updPenz("szerszamKoltseg", e.target.value)} placeholder="0" style={inp} />
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
            <Field label="Gépbérlés / állvány / eszközbérlés (Ft)" half>
              <input type="number" value={form.penzugy.bereltEszkozKoltseg || ""} onChange={e => updPenz("bereltEszkozKoltseg", e.target.value)} placeholder="0" style={inp} />
            </Field>
            <Field label="Iroda / Admin (Ft)" half>
              <input type="number" value={form.penzugy.irodaAdminKoltseg || ""} onChange={e => updPenz("irodaAdminKoltseg", e.target.value)} placeholder="0" style={inp} />
            </Field>
            <Field label="Egyéb (autó szerviz, tankolás, organizáció stb.) (Ft)" half>
              <input type="number" value={form.penzugy.egyebKoltseg || ""} onChange={e => updPenz("egyebKoltseg", e.target.value)} placeholder="0" style={inp} />
            </Field>
            </>)}
            <Field label="Szerződéses összeg *" half>
              <input type="number" value={form.elfogadottAjanlat} onChange={e => upd("elfogadottAjanlat", e.target.value)} placeholder="0" style={{ ...inp, border: `2px solid ${C.accent}`, fontWeight: 600 }} />
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
                        <TrendingUp size={15} color={C.success}/>
                        <span style={{ fontSize:12, fontWeight:700, color:C.success, textTransform:"uppercase", letterSpacing:.5 }}>Várható fővállalkozói bevétel</span>
                      </div>
                      {kalk.beveteliTetelek.map((t, i) => (
                        <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#374151", marginBottom:3 }}>
                          <span>{t.megnevezes}</span>
                          <span style={{ fontWeight:700, color:C.success }}>{t.autoNetto.toLocaleString("hu-HU")} Ft</span>
                        </div>
                      ))}
                      {kalk.beveteliTetelek.length > 1 && (
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:800, color:C.success, borderTop:"1px solid #86EFAC", paddingTop:6, marginTop:4 }}>
                          <span>Összesen</span>
                          <span>{kalk.autoBevitel.toLocaleString("hu-HU")} Ft</span>
                        </div>
                      )}
                      {kalk.autoBevitel === 0 && kalk.beveteliTetelek.some(t=>t.hiany) && (
                        <p style={{ fontSize:11, color:C.warning, margin:"4px 0 0" }}>⚠️ A sávos szabály nem találja a darabszám tartományát – ellenőrizd a szabályokat.</p>
                      )}
                      {kalk.beveteliTetelek.length === 0 && (
                        <p style={{ fontSize:11, color:C.warning, margin:0 }}>Nincs aktív szabály ehhez a munkatípushoz – add meg a Beállítások → Fővállalkozók menüben.</p>
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
        <div style={{ padding: "14px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 18px", borderRadius: 9, border: `1.5px solid ${C.border}`, background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: FONT }}>
            Mégse
          </button>
          <button type="button" onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 22px", background: saving ? C.muted : C.accent, color: "#fff", border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 14, fontFamily: FONT }}>
            <Save size={15} />
            {saving ? "Mentés…" : isNew ? "Projekt létrehozása" : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}