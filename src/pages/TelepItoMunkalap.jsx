import { useState, useRef, useEffect, useMemo } from "react";
import {
  ArrowLeft, Camera, Save, AlertTriangle, CheckCircle2,
  X, FileText, Play, Phone, MapPin, Lock, Trash2, Hash, Shield, Users, BookOpen
} from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { getAktivAnyagok, TELEPITOI_KATEGORIAK } from "../lib/anyagtorzs";
import AlairasModal from "../components/AlairasModal";
import LmraTelepltoView from "../components/LmraTelepltoView";
import FelmeresTelepito from "./FelmeresTelepito";
import FelmeresFotok from "./FelmeresFotok";
import { updateItem, loadLocal, saveLocal } from "../lib/localDb";
import { driveSave, driveVbfSave } from "../lib/driveApi";
import { calcMunkalapElszamolas, saveMunkalapElszamolas } from "../services/workOrderFinancial.service.js";
import { getKivitelezesiCsomagByProjektId, updateFelhasznaltMennyisegFromMunkalap } from "../modules/kivitelezesi_csomag/kivitelezesiCsomag.service.js";
import {
  getJelenletByMunkalap,
  createJelenletBejegyzes,
  updateJelenletBejegyzes,
  deleteJelenletBejegyzes,
  buildJavasloltJelenlet,
  calcJelenletKoltseg,
} from "../services/jelenlet.service";
import { getCsapatTagok } from "../modules/csapatok/csapat.service";

// ─── Sorozatszámos tételek ────────────────────────────────────
const SERIAL_CATEGORIES = ["inverter","akkumulátor","akkumulator","okosmérő","okosmerő","okos mérő","optimalizáló","optimalizalo","napelem","panel"];

function requiresSerial(nev) {
  if (!nev) return false;
  const n = nev.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  return SERIAL_CATEGORIES.some(k => n.includes(k.normalize("NFD").replace(/[\u0300-\u036f]/g,"")));
}

// ─── Fotó kategóriák ──────────────────────────────────────────
const FOTO_KAT = [
  { id:"ac_box", nev:"AC box (fedéllel és fedél nélkül)", leiras:"3 fotó: Megkötött állapotban fedél nélkül, Fedéllel és nyitott ajtóval, Fedéllel csukott ajtóval." },
  { id:"akkumulator", nev:"Akkumulátor", leiras:"2 fotó: Elhelyezéséről, Bekötéséről" },
  { id:"akku_adattabla", nev:"Akkumulátor adattábla", leiras:"1 fotó: Olvasható adattábla+S/N" },
  { id:"csatl_pont", nev:"Csatlakozási/rákötési pont", leiras:"2 fotó: Megkötött állapotban fedél nélkül, fedéllel" },
  { id:"dc_box", nev:"DC box (fedéllel és fedél nélkül)", leiras:"3 fotó: Megkötött állapotban fedél nélkül, Fedéllel és nyitott ajtóval, Fedéllel csukott ajtóval." },
  { id:"eph_kotes", nev:"EPH kötés", leiras:"Min. 1 fotó: Tartószerkezeti rákötés" },
  { id:"egyeb_dok", nev:"Egyéb dokumentáció", leiras:"Nyilatkozatok, fővállalkozói dokumentumok" },
  { id:"elrendezes", nev:"Elrendezés+stringek", leiras:"1 fotó: rajzolt elrendezés, stringek, QR-kódos elrendezés" },
  { id:"figyelm_tabla", nev:"Figyelmeztető tábla", leiras:"1 Fotó: Napelemes rendszer figyelmeztető tábláról" },
  { id:"fusterzekelő", nev:"Füstérzékelő", leiras:"Egy fotó felhelyezett állapotban." },
  { id:"inverter", nev:"Inverter", leiras:"2 fotó: Szemből - bekötésekkel, védelmi berendezésekkel" },
  { id:"inv_adattabla", nev:"Inverter adattábla", leiras:"1 fotó: Olvasható adattábla" },
  { id:"inv_beallitas", nev:"Inverter beállítások", leiras:"Több fotó: Visszwatt, Smart mérő, akkumulátor, működési mód" },
  { id:"inv_mukodes", nev:"Inverter működéséről", leiras:"1 fotó: Rendszer élő termeléséről" },
  { id:"kabel_nyomvonal", nev:"Kábel nyomvonal (AC/DC)", leiras:"Kábelhossz függvényeként több fotó." },
  { id:"matricak", nev:"Matricák, feliratok", leiras:"min. 3 fotó: AC box, DC box, Csatlakozási pont" },
  { id:"meres_ellenorzes", nev:"Mérés ellenőrzése", leiras:"Fogyasztásmérés ellenőrzése." },
  { id:"merohelyrol", nev:"Mérőhelyről", leiras:"3 fotó: Teljesítményről, Mérőről, Teljes mérőhely" },
  { id:"napelemek", nev:"Napelemek", leiras:"Min. 2 fotó: 2 irányból. Minden panel számolható legyen!" },
  { id:"panel_sn", nev:"Napelem SN számok", leiras:"Összes napelem szériaszáma olvashatóan." },
  { id:"optimalizalo", nev:"Optimalizáló", leiras:"min. 1 fotó: Tigo/Huawei - tartószerkezetre rögzítve" },
  { id:"plant_letrehozas", nev:"Plant létrehozás", leiras:"1 fotó: Online állapotban a rendszer monitoringon." },
  { id:"palyazati_tabla", nev:"Pályázati tábla", leiras:"3 fotó: közelről, 1-2 méterről, utca másik feléről" },
  { id:"smart_mero", nev:"Smart mérő/mérés", leiras:"2 fotó: Mérés kialakítása, kommunikáció" },
  { id:"tartoszerkezet", nev:"Tartószerkezet", leiras:"Min. 2 fotó: 2 irányból." },
  { id:"teto_kivezetes", nev:"Tető kivezetés", leiras:"1 fotó: Kábelkivezetés a tetőre" },
  { id:"tuz_levalaszto", nev:"Tűzeseti leválasztó", leiras:"1 fotó: Megkötött tűzeseti leválasztó." },
  { id:"wifi_stick", nev:"Wifi Stick", leiras:"1 fotó: Olvasható adatokkal" },
  { id:"wifi_beallitas", nev:"Wifi beállítás", leiras:"1. fotó: Sikeres wifi beállításról" },
];

const FOTO_HIANY_OKOK_LIST = ["Nincs ilyen eszköz","Nem releváns a munkatípushoz","Nem látható"];

const VBF_TEMPLATE = {
  acFeszultseg: { L1:"", L2:"", L3:"" },
  kismegsInverter: { L1:"", L2:"", L3:"" },
  kismegsMero: { L1:"", L2:"", L3:"" },
  panelszam: { ST1:"", ST2:"", ST3:"", ST4:"", ST5:"", ST6:"" },
  dcFeszultseg: { ST1:"", ST2:"", ST3:"", ST4:"", ST5:"", ST6:"" },
  hurokellenallas: { L1:"", L2:"", L3:"" },
  smartMeter:"", akku:"", betapaltDC:"",
  panelTipus:"", panelVoc:"", panelVmp:"", panelImp:"", panelIsc:"", panelTelj:"",
  inverterNevleges:"", tuzMegszakito:"",
};

function getMunkalapAzonosito(m) {
  return (
    m?.dokumentumszam ||
    m?.munkalapSzam ||
    m?.munkalapszam ||
    m?.workorderNumber ||
    m?.ediSorszam ||
    m?.ugyszam ||
    m?.id ||
    "Munkalap"
  );
}

function VbfNumInput({ value, onCommit, unit, piros }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => { setLocal(value ?? ""); }, [value]);

  function handleBlur() {
    const v = local === "0" ? "" : local;
    onCommit(v);
  }

  return (
    <div style={{ display:"flex", alignItems:"center", gap:4, flex:1 }}>
      <input
        inputMode="decimal"
        value={local}
        onChange={e => setLocal(e.target.value.replace(/[^0-9.,]/g,""))}
        onBlur={handleBlur}
        placeholder="—"
        style={{ flex:1, padding:"8px 10px", border:`1.5px solid ${piros&&!local?"#EF4444":C.border}`, borderRadius:8, fontSize:15, fontFamily:FONT, color:C.text, outline:"none", background:piros&&!local?"#FEF2F2":"#F8FAFC", minWidth:0 }}
      />
      {unit && <span style={{ fontSize:12, color:C.muted, whiteSpace:"nowrap", flexShrink:0, minWidth:32 }}>{unit}</span>}
    </div>
  );
}

function VbfTextInput({ value, onCommit, piros }) {
  const [local, setLocal] = useState(value ?? "");
  useEffect(() => { setLocal(value ?? ""); }, [value]);
  return (
    <input
      value={local}
      onChange={e=>setLocal(e.target.value)}
      onBlur={()=>onCommit(local)}
      placeholder="pl. Risen Energy 425W"
      style={{ width:"100%", padding:"8px 10px", border:`1.5px solid ${piros&&!local?"#EF4444":C.border}`, borderRadius:8, fontSize:14, fontFamily:FONT, color:C.text, outline:"none", background:piros&&!local?"#FEF2F2":"#F8FAFC" }}
    />
  );
}

function MeroSor({ label, value, onCommit, unit, piros }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
      <span style={{ width:40, fontSize:13, color:C.textSub, flexShrink:0, fontWeight:600 }}>{label}</span>
      <VbfNumInput value={value} onCommit={onCommit} unit={unit} piros={piros}/>
    </div>
  );
}

function MeroSzakasz({ title, children }) {
  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginBottom:14 }}>
      {title && <p style={{ fontSize:13, fontWeight:700, color:C.textSub, marginBottom:12, borderBottom:`1px solid ${C.border}`, paddingBottom:8 }}>{title}</p>}
      {children}
    </div>
  );
}

function FotoKartya({ kat, photos, onChange, hianyOk, onHianyOkChange }) {
  const ref = useRef();
  const nincsKep = photos.length === 0;

  function handleFiles(files) {
    const arr = Array.from(files).map((f,i) => {
      const ext = f.name.split(".").pop();
      const safe = kat.nev.replace(/[^a-zA-Z0-9]/g,"_").replace(/_+/g,"_");
      return { originalName:f.name, name:`${safe}_${photos.length+i+1}.${ext}`, size:f.size, type:f.type, url:URL.createObjectURL(f), fileObj:f };
    });
    onChange([...photos, ...arr]);
  }

  return (
    <div style={{
      background:"#fff",
      border:`1.5px solid ${nincsKep&&!hianyOk?"#FCA5A5":nincsKep&&hianyOk?"#86EFAC":C.border}`,
      borderRadius:12, padding:"14px 16px", marginBottom:12
    }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12 }}>
        <div style={{ flex:1 }}>
          <p style={{ fontWeight:700, fontSize:15, color:C.text, marginBottom:2 }}>{kat.nev}</p>
          <p style={{ fontSize:12, color:C.muted, lineHeight:1.5 }}>{kat.leiras}</p>
        </div>
        <button onClick={()=>ref.current?.click()} style={{ width:48, height:48, flexShrink:0, background:"#EFF6FF", border:`1.5px solid #93C5FD`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          <Camera size={22} color="#D97706"/>
        </button>
      </div>

      <input ref={ref} type="file" multiple accept="image/*,.pdf" style={{ display:"none" }} onChange={e=>handleFiles(e.target.files)}/>

      {photos.length > 0 && (
        <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color:C.success, fontWeight:600, alignSelf:"center" }}>✓ {photos.length} db feltöltve</span>
          {photos.map((p,i)=>(
            <div key={i} style={{ position:"relative" }}>
              {p.url&&p.type?.startsWith("image")
                ? <img src={p.url} style={{ width:56,height:56,objectFit:"cover",borderRadius:8,border:`1px solid ${C.border}` }}/>
                : <div style={{ width:56,height:56,background:C.bg,borderRadius:8,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center" }}><FileText size={18} color={C.muted}/></div>}
              <button onClick={()=>onChange(photos.filter((_,j)=>j!==i))} style={{ position:"absolute",top:-4,right:-4,width:18,height:18,background:C.danger,border:"none",borderRadius:"50%",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                <X size={10} color="#fff"/>
              </button>
            </div>
          ))}
        </div>
      )}

      {nincsKep && (
        <div style={{ marginTop:10 }}>
          <p style={{ fontSize:11, fontWeight:700, color: hianyOk?"#059669":"#DC2626", marginBottom:6, textTransform:"uppercase", letterSpacing:.6 }}>
            {hianyOk ? "✓ Indoklás megadva" : "⚠️ Kötelező magyarázat – nincs fotó"}
          </p>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {FOTO_HIANY_OKOK_LIST.map(ok => (
              <button
                key={ok}
                onClick={()=>onHianyOkChange(hianyOk===ok ? null : ok)}
                style={{
                  padding:"6px 12px",
                  borderRadius:20,
                  fontSize:12,
                  fontWeight:600,
                  cursor:"pointer",
                  fontFamily:FONT,
                  background: hianyOk===ok ? "#DCFCE7" : "#F8FAFC",
                  color: hianyOk===ok ? "#059669" : "#64748B",
                  border: `1.5px solid ${hianyOk===ok ? "#86EFAC" : "#E2E8F0"}`,
                }}
              >
                {ok}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * BeepitesiVisszaigazolas – Spec: telepítő csak beépítve/nem szükséges jelöl
 * A projekt szintről örökölt elemek megjelennek, nem szerkeszthető a db/típus.
 */
const BEEPITESI_ALLAPOTOK = [
  { id: "beepitve",     label: "Beépítve",              szin: "#059669", bg: "#ECFDF5" },
  { id: "nem_kellett",  label: "Nem volt szükséges",     szin: "#D97706", bg: "#FFFBEB" },
  { id: "nem_epult_be", label: "Nem került beépítésre",  szin: "#DC2626", bg: "#FEF2F2" },
];

function BeepitesiVisszaigazolas({ munkalap, projekt }) {
  const LS_KEY = `beepites_${munkalap.id}`;
  const [allapotok, setAllapotok] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
  });
  const [megjegyzesek, setMegjegyzesek] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`${LS_KEY}_mj`) || "{}"); } catch { return {}; }
  });
  const [mentve, setMentve] = useState(false);

  // Projekt szintű elemek – csak ezeket mutatjuk
  const ELEMEK = [
    { key: "napelem",    label: "Napelem panel",        db: projekt?.napelemDb,    tipusMezo: "napelemTipus" },
    { key: "inverter",   label: "Inverter",             db: projekt?.inverterDb,   tipusMezo: "inverterTipus" },
    { key: "akku",       label: "Akkumulátor",          db: projekt?.akkumulatorDb,tipusMezo: "akkumulatorTipus" },
    { key: "smartmeter", label: "Smart Meter",          db: projekt?.smartMeterDb, tipusMezo: null },
    { key: "evtolto",    label: "EV töltő",             db: projekt?.evToltoDb,    tipusMezo: null },
    { key: "tartoszerk", label: "Tartószerkezet",       db: null,                  tipusMezo: "tartoszerkezetTipus" },
  ].filter(e => e.db > 0 || (e.db === null && projekt?.[e.tipusMezo || ""]));

  function setAllapot(key, val) {
    const uj = { ...allapotok, [key]: val };
    setAllapotok(uj);
    localStorage.setItem(LS_KEY, JSON.stringify(uj));
    setMentve(false);
  }

  function setMegjegyzes(key, val) {
    const uj = { ...megjegyzesek, [key]: val };
    setMegjegyzesek(uj);
    localStorage.setItem(`${LS_KEY}_mj`, JSON.stringify(uj));
    setMentve(false);
  }

  function handleMent() {
    // Ellenőrzés: eltérésnél kötelező a megjegyzés
    const hianyzik = ELEMEK.filter(e => {
      const al = allapotok[e.key];
      return (al === "nem_kellett" || al === "nem_epult_be") && !megjegyzesek[e.key]?.trim();
    });
    if (hianyzik.length > 0) {
      alert(`Kötelező megjegyzés: ${hianyzik.map(e => e.label).join(", ")}`);
      return;
    }
    updateItem("munkalapok", munkalap.id, { beepitesiVisszaigazolas: allapotok, beepitesiMegjegyzesek: megjegyzesek });
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "munkalapok" } }));
    setMentve(true);
    setTimeout(() => setMentve(false), 2500);
  }

  if (ELEMEK.length === 0) {
    return (
      <div style={{ background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 12, color: C.muted }}>
        ℹ️ A projektben nincs rögzített szerelési elem. Az adminisztráció adja meg a projekten.
      </div>
    );
  }

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: C.text, margin: "0 0 12px" }}>
        ✅ Beépítési visszaigazolás
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ELEMEK.map(e => {
          const al = allapotok[e.key];
          const alCfg = BEEPITESI_ALLAPOTOK.find(a => a.id === al);
          const kell_mj = al === "nem_kellett" || al === "nem_epult_be";
          return (
            <div key={e.key} style={{ background: alCfg?.bg || "#F8FAFC", border: `1px solid ${alCfg?.szin || C.border}30`, borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: kell_mj ? 8 : 0 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{e.label}</span>
                  {e.db > 0 && <span style={{ fontSize: 11, color: C.muted, marginLeft: 6 }}>{e.db} db · {projekt?.[e.tipusMezo || ""] || ""}</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {BEEPITESI_ALLAPOTOK.map(a => (
                  <button key={a.id} onClick={() => setAllapot(e.key, a.id)}
                    style={{ padding: "6px 12px", borderRadius: 20, border: `2px solid ${al === a.id ? a.szin : "#E2E8F0"}`,
                      background: al === a.id ? a.bg : "#fff", color: al === a.id ? a.szin : C.muted,
                      cursor: "pointer", fontSize: 12, fontWeight: al === a.id ? 700 : 400, fontFamily: FONT }}>
                    {a.label}
                  </button>
                ))}
              </div>
              {kell_mj && (
                <textarea value={megjegyzesek[e.key] || ""} onChange={e2 => setMegjegyzes(e.key, e2.target.value)}
                  placeholder="Kötelező: miért tért el a tervtől?"
                  rows={2}
                  style={{ width: "100%", boxSizing: "border-box", marginTop: 8, padding: "8px 10px",
                    border: `1.5px solid ${!megjegyzesek[e.key]?.trim() ? "#DC2626" : C.border}`,
                    borderRadius: 8, fontSize: 12, fontFamily: FONT, resize: "none", outline: "none" }} />
              )}
            </div>
          );
        })}
      </div>
      <button onClick={handleMent}
        style={{ marginTop: 12, width: "100%", padding: "11px", borderRadius: 10, border: "none",
          background: mentve ? "#059669" : C.accent, color: "#fff", fontWeight: 700, fontSize: 14,
          cursor: "pointer", fontFamily: FONT }}>
        {mentve ? "✓ Mentve" : "Visszaigazolás mentése"}
      </button>
    </div>
  );
}

/**
 * KivCsomagFelhasznalasTab – Telepítő anyagfelhasználás rögzítése
 * kizárólag a Kivitelezési Csomag tételeiből (Fázis 6A-1).
 * Nem az anyagtörzsből választ – nincs ár, nincs kiadott mennyiség látható.
 * Per-munkalap izolált upsert: több munkalapos projekt esetén
 * az egyik munkalap nem írja felül a másikat.
 */
function KivCsomagFelhasznalasTab({ munkalapId, projektId, onSave }) {
  const csomag = useMemo(() => getKivitelezesiCsomagByProjektId(projektId), [projektId]);
  const [felhasznalasok, setFelhasznalasok] = useState(() => {
    const init = {};
    if (csomag) {
      (csomag.tetelek || []).forEach(t => {
        const mlAdat = (t.munkalapFelhasznalas || []).find(f => f.munkalapId === munkalapId);
        init[t.id] = {
          menny:      mlAdat ? (mlAdat.menny || 0) : 0,
          megjegyzes: mlAdat ? (mlAdat.megjegyzes || "") : "",
        };
      });
    }
    return init;
  });
  const [mentve, setMentve] = useState(false);

  if (!csomag) {
    return (
      <div style={{ padding: "32px 16px", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: C.muted, marginBottom: 8 }}>
          A projekthez nincs Kivitelezési Csomag rögzítve.
        </p>
        <p style={{ fontSize: 12, color: "#94A3B8" }}>
          Az anyagfelhasználás rögzítéséhez a Projektmenedzsernek létre kell hoznia a Kivitelezési Csomagot.
        </p>
      </div>
    );
  }

  const tetelek = csomag.tetelek || [];

  function updMenny(tetelId, v) {
    setFelhasznalasok(p => ({ ...p, [tetelId]: { ...p[tetelId], menny: Number(v) || 0 } }));
    setMentve(false);
  }

  function updMegjegyzes(tetelId, v) {
    setFelhasznalasok(p => ({ ...p, [tetelId]: { ...p[tetelId], megjegyzes: v } }));
    setMentve(false);
  }

  function handleMent() {
    const lista = tetelek.map(t => ({
      tetelId:    t.id,
      menny:      felhasznalasok[t.id] ? (felhasznalasok[t.id].menny || 0) : 0,
      megjegyzes: felhasznalasok[t.id] ? (felhasznalasok[t.id].megjegyzes || "") : "",
    }));
    updateFelhasznaltMennyisegFromMunkalap(csomag.id, munkalapId, lista, "");
    onSave(lista);
    setMentve(true);
    setTimeout(() => setMentve(false), 2500);
  }

  return (
    <div style={{ padding: 16, background: "#F1F5F9", minHeight: "60vh" }}>
      <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#1D4ED8" }}>
        Rögzítsd a ténylegesen felhasznált anyagmennyiségeket.
        Az anyaglistát a Projektmenedzser állítja össze a Kivitelezési Csomagban.
      </div>
      {tetelek.length === 0 ? (
        <p style={{ textAlign: "center", color: C.muted, padding: "24px 0", fontSize: 13 }}>
          A Kivitelezési Csomagban még nincs tétel.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          {tetelek.map(t => {
            const v = felhasznalasok[t.id] || { menny: 0, megjegyzes: "" };
            return (
              <div key={t.id} style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>{t.nev}</span>
                  {t.kategoria && (
                    <span style={{ fontSize: 11, color: C.muted, background: "#F1F5F9", padding: "2px 8px", borderRadius: 20 }}>{t.kategoria}</span>
                  )}
                </div>
                {t.telepitoLathatosag === "KIADOTT_MENNYISEG" && (
                  <div style={{ fontSize: 11, color: "#2563EB", background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 6, padding: "3px 8px", marginBottom: 5, display: "inline-block" }}>
                    Kiadott mennyiség: <strong>{t.kiadottMennyiseg || 0} {t.egyseg}</strong>
                  </div>
                )}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", minWidth: 100 }}>Felhasznált</span>
                  <input type="number" min="0" step="any" value={v.menny}
                    onChange={e => updMenny(t.id, e.target.value)}
                    style={{ width: 72, padding: "6px 8px", border: "1.5px solid #E2E8F0", borderRadius: 7, fontSize: 14, textAlign: "center", fontFamily: FONT, outline: "none" }} />
                  <span style={{ fontSize: 12, color: C.muted }}>{t.egyseg}</span>
                </div>
                <input type="text" value={v.megjegyzes} onChange={e => updMegjegyzes(t.id, e.target.value)}
                  placeholder="Megjegyzés (opcionális)"
                  style={{ width: "100%", boxSizing: "border-box", padding: "6px 10px", border: "1px solid #E2E8F0", borderRadius: 7, fontSize: 12, fontFamily: FONT, outline: "none", color: C.text, background: "#F8FAFC" }} />
              </div>
            );
          })}
        </div>
      )}
      <button onClick={handleMent}
        style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none",
          background: mentve ? "#059669" : C.accent, color: "#fff", fontWeight: 700, fontSize: 16,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontFamily: FONT }}>
        <Save size={18} />{mentve ? "Mentve \u2713" : "Anyagfelhasználás mentése"}
      </button>
    </div>
  );
}

export default function TelepItoMunkalap({ m, data, onBack, currentUser }) {
  const client = data.ugyfelek?.find(u=>u.id===m.clientId);
  const clientNev = m.clientNev||client?.name||"";
  const clientCim = m.clientCim||client?.address||"";
  const clientTel = m.clientTel||client?.phone||"";
  const munkalapAzonosito = getMunkalapAzonosito(m);

  const isLezartStatus = (ml) =>
    ml.lezarva ||
    ml.status==="Befejezett" ||
    ml.status==="Ellenőrzés alatt" ||
    ml.status==="Lezárva" ||
    ml.status==="Számlázva";

  const [lezart, setLezart] = useState(() => isLezartStatus(m));

  useEffect(() => {
    if (isLezartStatus(m)) setLezart(true);
  }, [m.lezarva, m.status]);

  const [megkezdve, setMegkezdve] = useState(m.megkezdve||false);
  const [activeTab, setActiveTab] = useState(0);
  const [figy, setFigy] = useState(false);
  const [showAlairas, setShowAlairas] = useState(false);
  const [showLmra, setShowLmra] = useState(false);
  const [progress, setProgress] = useState(null);
  const [progressMsg, setProgressMsg] = useState("");
  const [megjegyzes, setMegjegyzes] = useState(m.megjegyzes||"");

  const proj = data.projektek?.find(p => p.id === m.projektId);

  // Napi jelenlét
  const todayStr = new Date().toISOString().slice(0, 10);
  const [jelenletNaplok, setJelenletNaplok] = useState(() => getJelenletByMunkalap(m.id));
  const [jelenletDatum, setJelenletDatum] = useState(m.datum || todayStr);

  // Napi jelenlét napló frissítése
  function refreshJelenlet() { setJelenletNaplok(getJelenletByMunkalap(m.id)); }

  // Javasolt jelenlét inicializálása a kiosztott csapatokból (ha még nincs)
  const javasloltJelenlet = useMemo(() => {
    const existing = getJelenletByMunkalap(m.id);
    if (existing.length > 0) return [];
    return buildJavasloltJelenlet(m, jelenletDatum);
  }, [m.id, jelenletDatum]);

  function initJelenletFromJavaslat() {
    if (javasloltJelenlet.length === 0) return;
    for (const bej of javasloltJelenlet) {
      createJelenletBejegyzes(bej);
    }
    refreshJelenlet();
  }

  const [vbf, setVbf] = useState(()=>loadLocal(`vbf_${m.id}`)||VBF_TEMPLATE);
  const [fotok,setFotok] = useState(()=>loadLocal(`fotok_${m.id}`)||Object.fromEntries(FOTO_KAT.map(k=>[k.id,[]])));
  const [fotoHianyOkok, setFotoHianyOkok] = useState(()=>{
    const saved = loadLocal(`foto_hiany_${m.id}`);
    return saved || {};
  });

  useEffect(()=>{
    const toSave = Object.fromEntries(Object.entries(fotok).map(([k,v])=>[k,v.map(f=>({name:f.name,size:f.size,type:f.type,originalName:f.originalName}))]));
    saveLocal(`fotok_${m.id}`,toSave);
  },[fotok,m.id]);

  useEffect(()=>{ saveLocal(`foto_hiany_${m.id}`,fotoHianyOkok); },[fotoHianyOkok,m.id]);

  function updVbf(section, field, val) {
    const nv = field ? {...vbf,[section]:{...vbf[section],[field]:val}} : {...vbf,[section]:val};
    setVbf(nv);
    saveLocal(`vbf_${m.id}`,nv);
    window.dispatchEvent(new CustomEvent("crm-db-updated",{detail:{collection:`vbf_${m.id}`}}));
  }

  function checkVbfHianyos() {
    return Object.values(vbf).flatMap(v=>typeof v==="object"?Object.values(v):[v]).some(v=>v===""||v===null||v===undefined);
  }

  function handleMegkezdes() {
    // LMRA szükséges-e? Mindig megnyitjuk az LMRA nézetet (ha már lezárva, azonnal megkezdés)
    setShowLmra(true);
  }

  // Fire-and-forget Drive sync – nem blokkolja a UI-t
  function syncMunkalapokToDrive() {
    const osszesMl = loadLocal("munkalapok") || [];
    driveSave("munkalapok", { munkalapok: osszesMl })
      .then(res => { if (!res.ok && !res.offline) console.warn("[TelepIto Drive]", res.error); })
      .catch(e => console.warn("[TelepIto Drive]", e));
  }

  function doMegkezdes() {
    const ts = new Date().toISOString();
    const ujStatus = ["Kivitelezésre vár","Megkezdésre Vár","Ütemezett","Kiosztásra vár","Létrehozva","Kiosztva csapatnak"].includes(m.status) ? "Folyamatban" : m.status;
    updateItem("munkalapok", m.id, { megkezdve: true, megkezdesIdopont: ts, status: ujStatus, statusSzin: "#2563EB" });
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "munkalapok" } }));
    syncMunkalapokToDrive(); // státusz: Folyamatban → Drive-ra
    setMegkezdve(true);
    setShowLmra(false);
    setActiveTab(3);
  }

  function handleLmraComplete(lmraAdat) {
    updateItem("munkalapok", m.id, { lmraLezarva: true, lmraLezarvaAt: new Date().toISOString() });
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "munkalapok" } }));
    syncMunkalapokToDrive(); // LMRA lezárva → Drive-ra
  }

  function handleBefejezesKezdete() {
    if (checkVbfHianyos()) {
      setFigy(true);
      alert("⚠️ Lezárás sikertelen!\n\nA VBF Jegyzőkönyv nincs teljesen kitöltve.\nHagyd üresen a nem releváns mezőket – azok nem blokkolják a lezárást.");
      return;
    }

    setFigy(false);

    const osszesFoto = Object.values(fotok).reduce((s,a)=>s+(a.length||0),0);
    if (osszesFoto===0) {
      alert("⚠️ Lezárás sikertelen!\n\nNincs feltöltve egyetlen fotó sem.\nTölts fel legalább 1 fotót.");
      return;
    }

    if (!megjegyzes||megjegyzes.trim().length===0) {
      alert("⚠️ Lezárás sikertelen!\n\nA megjegyzés mező kötelező.\nÍrd le a munkavégzés összefoglalóját az Ellenőrzés fülön.");
      setActiveTab(megkezdve?6:2);
      return;
    }

    const hianyosKat = FOTO_KAT.filter(k=>(fotok[k.id]||[]).length===0);
    const missing = hianyosKat.filter(k=>!fotoHianyOkok[k.id]);
    if (missing.length>0) {
      alert("⚠️ Lezárás sikertelen!\n\nHiányzó indoklás a következő kategóriáknál:\n"+missing.map(k=>"• "+k.nev).join("\n")+"\n\nA Fotók fülön válassz magyarázatot minden fotó nélküli kategóriához!");
      setActiveTab(megkezdve?5:2);
      return;
    }

    setShowAlairas(true);
  }

  async function handleBefejezes(alairasData) {
    setShowAlairas(false);

    if (alairasData) {
      updateItem("munkalapok",m.id,{alairas:{dataUrl:alairasData.alairasDataUrl,datum:alairasData.alairasDatum,szoveg:alairasData.szoveg}});
    }

    const steps=[
      {msg:"Adatok ellenőrzése…", pct:10},
      {msg:"VBF mentése…", pct:25},
      {msg:"Megjegyzés mentése…", pct:35},
      {msg:"Anyagok mentése…", pct:45},
      {msg:"Fotók előkészítése…", pct:55},
      {msg:"Drive mappa létrehozása…", pct:65},
      {msg:"Fotók feltöltése…", pct:80},
      {msg:"Munkalap lezárása…", pct:92},
      {msg:"Kész!", pct:100},
    ];

    for (const step of steps) {
      setProgress(step.pct);
      setProgressMsg(step.msg);
      await new Promise(r=>setTimeout(r,400));
      if (step.pct===80) await uploadFotokToDrive();
    }

    const ts = new Date().toISOString();

    // Anyagköltség – Kivitelezési Csomag az elsődleges forrás (Fázis 6A-1)
    const kivCsomag = proj && proj.id ? getKivitelezesiCsomagByProjektId(proj.id) : null;
    let anyagkoltsegeTotal = 0;
    if (kivCsomag) {
      const tenyTetelek = (kivCsomag.tetelek || []).filter(t => (Number(t.felhasznaltMennyiseg) || 0) > 0);
      anyagkoltsegeTotal = tenyTetelek.reduce((s, t) =>
        s + (Number(t.egysegarPillanatkepBeszerzesi) || 0) * (Number(t.felhasznaltMennyiseg) || 0), 0);
    }
    if (anyagkoltsegeTotal === 0) {
      // Backward compat: régi felh_anyagok_{id} localStorage adat
      const felhasznaltAnyagok = loadLocal("felh_anyagok_" + m.id) || [];
      anyagkoltsegeTotal = felhasznaltAnyagok.reduce(
        (s, t) => s + (Number(t.menny) || 0) * (Number(t.egysegAr) || Number(t.netto_egysegar) || 0), 0
      );
    }

    const updates = {
      status:              "Ellenőrzés alatt",
      statusSzin:          "#D97706",
      befejezesIdopont:    ts,
      lezarva:             true,
      megjegyzes:          megjegyzes.trim(),
      anyagkoltsegeTotal,  // csak az anyagköltség kerül be, nincs km/panel/profit
    };

    updateItem("munkalapok",m.id,updates);

    try {
      const osszesMl = loadLocal("munkalapok")||[];
      await driveSave("munkalapok",{munkalapok:osszesMl});
    } catch(e) {
      console.warn("[Drive sync]",e);
    }

    window.dispatchEvent(new CustomEvent("crm-db-updated",{detail:{collection:"munkalapok",action:"update",id:m.id}}));

    setLezart(true);
    await new Promise(r=>setTimeout(r,800));
    setProgress(null);
    await new Promise(r=>setTimeout(r,200));
    onBack(true);
  }

  async function uploadFotokToDrive() {
    const scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
    if (!scriptUrl) return;

    try {
      await fetch(scriptUrl,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"createMunkalapFolder",munkalapId:m.id})});
      const osszesFoto=Object.entries(fotok).flatMap(([,photos])=>photos.filter(p=>p.fileObj||p.file||(p.url?.startsWith("blob:"))));
      let n=0;

      for (const foto of osszesFoto) {
        try {
          let b64="";
          const src=foto.fileObj||foto.file;

          if(src){
            b64=await new Promise(res=>{
              const r=new FileReader();
              r.onload=e=>res(e.target.result.split(",")[1]);
              r.onerror=()=>res("");
              r.readAsDataURL(src);
            });
          } else if(foto.url?.startsWith("blob:")){
            try {
              const resp=await fetch(foto.url);
              const blob=await resp.blob();
              b64=await new Promise(res=>{
                const r=new FileReader();
                r.onload=e=>res(e.target.result.split(",")[1]);
                r.onerror=()=>res("");
                r.readAsDataURL(blob);
              });
            } catch {}
          }

          if(!b64) continue;

          await fetch(scriptUrl,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"saveFoto",munkalapId:m.id,fotoNev:foto.name,fotoBase64:b64,mimeType:foto.type||"image/jpeg"})});
          n++;
          setProgressMsg(`Fotók feltöltése… (${n}/${osszesFoto.length})`);
        } catch {}
      }

      await fetch(scriptUrl,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"saveJson",fileName:`vbf_${m.id}.json`,content:vbf})});
    } catch(e) {
      console.warn("[Drive upload]",e);
    }
  }

  async function handleVbfMentes() {
    saveLocal(`vbf_${m.id}`, vbf);
    updateItem("munkalapok", m.id, { vbf });
    window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "munkalapok" } }));
    setProgress(30);
    setProgressMsg("VBF mentése Drive-ra…");
    // VBF külön fájlba Drive-ra + teljes munkalapok lista szinkron
    try {
      await driveVbfSave(m.id, vbf);
      syncMunkalapokToDrive();
    } catch(e) {
      console.warn("[VBF Drive sync]", e);
    }
    setProgress(100);
    setProgressMsg("VBF mentve ✓");
    await new Promise(r => setTimeout(r, 1200));
    setProgress(null);
  }

  if (m.status==="Felmérés"&&!lezart) return <FelmeresTelepito m={m} data={data} onBack={onBack}/>;

  if (lezart) return (
    <div style={{ minHeight:"100vh",background:"#F1F5F9",fontFamily:FONT }}>
      <div style={{ background:"#2C4A6E",padding:"44px 16px 16px" }}>
        <button onClick={onBack} style={{ border:"none",background:"none",color:"#94A3B8",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13,fontFamily:FONT,fontWeight:600 }}>
          <ArrowLeft size={18}/> Feladatok
        </button>
        <p style={{ fontWeight:800,fontSize:16,color:"#fff",marginTop:8 }}>{munkalapAzonosito}</p>
        <p style={{ fontWeight:700,fontSize:15,color:"#fff" }}>{clientNev}</p>
        <p style={{ fontSize:12,color:"#94A3B8" }}>{clientCim}</p>
      </div>
      <div style={{ padding:24,textAlign:"center" }}>
        <Lock size={48} color={C.muted} style={{ opacity:.3,display:"block",margin:"0 auto 16px" }}/>
        <p style={{ fontWeight:700,fontSize:18,color:C.text,marginBottom:8 }}>
          {m.status==="Lezárva"||m.status==="Számlázva" ? `Munka ${m.status}` : "Munka lezárva – Ellenőrzés alatt"}
        </p>
        <p style={{ fontSize:14,color:C.muted,marginBottom:8 }}>Befejezve: {m.befejezesIdopont?new Date(m.befejezesIdopont).toLocaleString("hu-HU"):"—"}</p>
        {m.megjegyzes&&<div style={{ background:"#F8FAFC",border:`1px solid ${C.border}`,borderRadius:10,padding:"12px 16px",margin:"0 auto",maxWidth:400,textAlign:"left" }}><p style={{ fontSize:12,color:C.muted,marginBottom:4 }}>Megjegyzés:</p><p style={{ fontSize:14,color:C.text }}>{m.megjegyzes}</p></div>}
        <p style={{ fontSize:13,color:C.muted,marginTop:16 }}>Módosítás csak Admin / Projektmenedzser fiókból lehetséges.</p>
      </div>
    </div>
  );

  if (progress!==null) return (
    <div style={{ minHeight:"100vh",background:"#F1F5F9",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,fontFamily:FONT }}>
      <div style={{ background:"#fff",borderRadius:20,padding:32,width:"100%",maxWidth:400,textAlign:"center",boxShadow:"0 8px 32px rgba(0,0,0,.1)" }}>
        <div style={{ width:72,height:72,borderRadius:"50%",background:progress===100?C.success:"#EFF6FF",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px" }}>
          {progress===100?<CheckCircle2 size={36} color="#fff"/>:<Save size={32} color={C.accent}/>}
        </div>
        <p style={{ fontSize:17,fontWeight:700,color:C.text,marginBottom:8 }}>{progressMsg}</p>
        <p style={{ fontSize:28,fontWeight:800,color:progress===100?C.success:C.accent,marginBottom:20 }}>{progress}%</p>
        <div style={{ background:C.bg,borderRadius:10,height:12,overflow:"hidden" }}>
          <div style={{ width:`${progress}%`,height:"100%",background:progress===100?C.success:C.accent,borderRadius:10,transition:"width 0.4s ease" }}/>
        </div>
        {progress===100&&<p style={{ fontSize:14,color:C.muted,marginTop:16 }}>Visszatérés a feladatokhoz…</p>}
      </div>
    </div>
  );

  const TABS_BEFORE=[{icon:"📄"},{icon:"📦"},{icon:"📋"}];
  const TABS_AFTER=[{icon:"📄"},{icon:"📦"},{icon:"📋"},{icon:"⚙️"},{icon:"📐"},{icon:"📷"},{icon:"✅"}];
  const TABS = megkezdve?TABS_AFTER:TABS_BEFORE;

  const Header=()=>(
    <div style={{ background:"#2C4A6E" }}>
      <div style={{ display:"flex",alignItems:"center",gap:10,padding:"44px 16px 8px" }}>
        <button onClick={onBack} style={{ border:"none",background:"none",color:"#94A3B8",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13,fontFamily:FONT,fontWeight:600 }}>
          <ArrowLeft size={18}/> Feladatok
        </button>
        <span style={{ fontWeight:800,fontSize:14,color:"#fff",flex:1 }}>{munkalapAzonosito}</span>
        <button onClick={()=>window.open("/installer-guide.html","_blank")} title="Telepítői útmutató" style={{ border:"none",background:"rgba(255,255,255,0.12)",color:"#fff",cursor:"pointer",borderRadius:8,padding:"5px 8px",display:"flex",alignItems:"center",gap:5,fontSize:12,fontWeight:600,fontFamily:FONT }}>
          <BookOpen size={15}/> Útmutató
        </button>
        {m.cimke&&<span style={{ background:m.cimkeSzin||C.accent,color:"#fff",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700 }}>{m.cimke}</span>}
      </div>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 16px 14px" }}>
        <div>
          <p style={{ fontWeight:700,fontSize:16,color:"#fff" }}>{clientNev}</p>
          <p style={{ fontSize:12,color:"#94A3B8" }}>{clientCim}</p>
        </div>
        <div style={{ display:"flex",gap:12 }}>
          {clientTel&&<a href={`tel:${clientTel}`} style={{ color:"#4ADE80" }}><Phone size={22}/></a>}
          {clientCim&&<a href={`https://maps.google.com/?q=${encodeURIComponent(clientCim)}`} target="_blank" rel="noreferrer" style={{ color:"#60A5FA" }}><MapPin size={22}/></a>}
        </div>
      </div>
    </div>
  );

  const TabSav=()=>(
    <div style={{ display:"flex",background:"#2C4A6E",overflowX:"auto" }}>
      {TABS.map((t,i)=>(
        <button key={i} onClick={()=>setActiveTab(i)} style={{ flex:1,padding:"12px 4px",border:"none",background:"transparent",color:activeTab===i?"#fff":"#94A3B8",cursor:"pointer",borderBottom:activeTab===i?"3px solid #fff":"3px solid transparent",fontSize:20,minWidth:44 }}>
          {t.icon}
        </button>
      ))}
    </div>
  );

  const InfoTab=()=>{
    const FR=({label,value})=>value?(<div><p style={{ fontSize:12,color:"#64748B",paddingTop:8,marginBottom:3 }}>{label}</p><div style={{ background:"#E8EDF5",borderRadius:6,padding:"9px 12px",fontSize:14,color:C.text }}>{value}</div></div>):null;

    const kiosztasok = m.csapatKiosztasok || [];

    return (
      <div style={{ padding:"0 16px 16px",background:"#F1F5F9" }}>
        <FR label="Projekt megnevezés" value={m.projektMegnevezes}/>
        <FR label="Feladat" value={m.feladat}/>
        <FR label="Kapcsolattartó" value={clientNev}/>
        <FR label="Telefonszám" value={clientTel}/>
        <FR label="Értékesítő" value={m.ertekesito}/>
        {m.megkezdesIdopont&&<div style={{ marginTop:12,padding:"10px 14px",background:"#EFF6FF",border:`1px solid #BFDBFE`,borderRadius:10,fontSize:13,color:C.accent }}>▶️ Megkezdve: <b>{new Date(m.megkezdesIdopont).toLocaleString("hu-HU")}</b></div>}

        {/* Kiosztott csapatok */}
        {kiosztasok.length > 0 && (
          <div style={{ marginTop:14, background:"#fff", border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
            <div style={{ padding:"10px 14px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:7 }}>
              <Users size={14} color="#2563EB"/>
              <span style={{ fontSize:12, fontWeight:700, color:"#1D4ED8" }}>Kiosztott csapatok ({kiosztasok.length})</span>
            </div>
            {kiosztasok.map(k => {
              const tagok = getCsapatTagok(k.csapatId).filter(t => t.aktiv !== false);
              return (
                <div key={k.id || k.csapatId} style={{ padding:"10px 14px", borderBottom:`1px solid #F1F5F9` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom: tagok.length ? 6 : 0 }}>
                    <span style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>{k.csapatNev || k.csapatId}</span>
                    <span style={{ fontSize:10, fontWeight:700, background: k.tipus==="focsapat"?"#EFF6FF":"#F0FDF4", color: k.tipus==="focsapat"?"#1D4ED8":"#059669", padding:"1px 7px", borderRadius:20 }}>
                      {k.tipus==="focsapat" ? "Főcsapat" : "Segítő"}
                    </span>
                    {k.datumTol && <span style={{ fontSize:11, color:C.muted }}>{k.datumTol}{k.datumIg ? ` – ${k.datumIg}` : ""}</span>}
                  </div>
                  {tagok.length > 0 && (
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                      {tagok.map(tag => (
                        <span key={tag.id} style={{ fontSize:11, background:"#F8FAFC", border:`1px solid ${C.border}`, color:C.text, padding:"2px 8px", borderRadius:20 }}>
                          {tag.nev} <span style={{ color:C.muted }}>({tag.szerep || "—"})</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {k.megjegyzes && <p style={{ fontSize:11, color:C.muted, margin:"4px 0 0", fontStyle:"italic" }}>{k.megjegyzes}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* Ha nincs kiosztás de van csapatNev */}
        {kiosztasok.length === 0 && m.csapatNev && (
          <div style={{ marginTop:10, padding:"8px 12px", background:"#F8FAFC", border:`1px solid ${C.border}`, borderRadius:9, fontSize:12, color:C.text }}>
            👷 Csapat: <strong>{m.csapatNev}</strong>
          </div>
        )}

        {!megkezdve ? (
          <div style={{ marginTop: 20 }}>
            <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 10, padding: "10px 14px", marginBottom: 12, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#92400E" }}>
              <Shield size={16} color="#D97706" />
              <span><b>LMRA szükséges</b> – minden csapattag aláírja a kockázatbecslést a munkakezdés előtt</span>
            </div>
            <button onClick={handleMegkezdes} style={{ width:"100%",padding:"15px",borderRadius:12,border:"none",background:"#22C55E",color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:FONT }}>
              <Shield size={18}/> LMRA + Megkezdés →
            </button>
          </div>
        ) : (
          <div>
            <div style={{ marginTop:12,padding:"10px 14px",background:"#ECFDF5",border:`1px solid #A7F3D0`,borderRadius:10,fontSize:13,color:C.success,fontWeight:600 }}>✅ Munka folyamatban</div>
            {(() => {
              const lmraRec = loadLocal(`lmra_rec_${m.id}`);
              if (lmraRec && ["alairva","exportalva"].includes(lmraRec.status)) {
                return (
                  <div style={{ marginTop:8,padding:"8px 12px",background:"#F0FDF4",border:"1px solid #86EFAC",borderRadius:9,fontSize:12,color:"#166534" }}>
                    🛡️ LMRA aláírva · {(lmraRec.resztvevok||[]).filter(r=>r.signed).map(r=>r.nev).join(", ")}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )}
      </div>
    );
  };

  const AnyagokTab=()=>(
    <div style={{ background:"#F1F5F9" }}>
      <div style={{ background:"#FFF7ED", border:"1px solid #FED7AA", borderRadius:8, padding:"10px 14px", margin:"12px 16px 4px", fontSize:12, color:"#92400E" }}>
        📋 <strong>Tájékoztató anyaglista</strong> – régi rendszer. A tényleges anyagfelhasználást a <strong>⚙️ Anyagfelhasználás</strong> lapon rögzítsd a Kivitelezési Csomag alapján.
      </div>
      {(m.anyagok||[]).length===0&&<div style={{ padding:"32px 16px",textAlign:"center",color:C.muted }}><p>Nincsenek anyagok</p></div>}
      {(m.anyagok||[]).map((a,i)=>(
        <div key={i} style={{ padding:"13px 16px",borderBottom:"1px solid #D1D9E6",display:"flex",justifyContent:"space-between" }}>
          <p style={{ fontWeight:600,fontSize:14,color:C.text,flex:1,paddingRight:16 }}>{a.nev}</p>
          <p style={{ fontWeight:700,fontSize:14,color:C.text,whiteSpace:"nowrap" }}>{a.menny} {a.egyseg}</p>
        </div>
      ))}
    </div>
  );

  const FelmeresTab=()=>{
    const f=m.felmeres||{};
    const mezok=[["Csatlakozási pont",f.csatlakozasiPont],["AC védelem",f.acVedelem],["Inverter fal",f.inverterFal],["Akkumulátor fal",f.akkuFal],["Tető típus",f.tetoTipus],["Tartószerkezet",f.tartoszerkezetTipus],["DC kábel hossz",f.dcKabelHossz],["DC védelem",f.dcVedelem],["Panel elrendezés",f.panelElrendezes],["Megközelíthetőség",f.megkozelithetoseg]].filter(([,v])=>v!==undefined&&v!=="");
    return (
      <div style={{ background:"#F1F5F9" }}>
        {mezok.length===0&&<div style={{ padding:"32px 16px",textAlign:"center",color:C.muted }}><p>Nincs felmérés adat</p></div>}
        {mezok.map(([label,value])=>(
          <div key={label} style={{ padding:"0 16px" }}>
            <p style={{ fontSize:12,color:"#64748B",paddingTop:8,marginBottom:3 }}>{label}</p>
            <div style={{ background:"#E8EDF5",borderRadius:6,padding:"9px 12px",fontSize:14,color:C.text }}>{String(value)}</div>
          </div>
        ))}
      </div>
    );
  };

  const VbfTab=()=>(
    <div style={{ padding:"16px",background:"#F1F5F9" }}>
      {figy&&<div style={{ background:"#FEF2F2",border:`1px solid #FECACA`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:C.danger,display:"flex",alignItems:"center",gap:8 }}>
        <AlertTriangle size={16}/>Hiányos VBF mezők – töltsd ki vagy hagyd üresen ha nem releváns
      </div>}
      <div style={{ background:"#EFF6FF",border:`1px solid #BFDBFE`,borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#1D4ED8" }}>
        💡 Üres mező = nem releváns. Ha nulla az érték, hagyd üresen.
      </div>
      <MeroSzakasz title="AC feszültség">{["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.acFeszultseg[l]} onCommit={v=>updVbf("acFeszultseg",l,v)} unit="V" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="Kismegszakító – Inverternél">{["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.kismegsInverter[l]} onCommit={v=>updVbf("kismegsInverter",l,v)} unit="A" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="Kismegszakító – Mérőhelynél">{["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.kismegsMero[l]} onCommit={v=>updVbf("kismegsMero",l,v)} unit="A" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="Panelszám">{["ST1","ST2","ST3","ST4","ST5","ST6"].map(s=><MeroSor key={s} label={s} value={vbf.panelszam[s]} onCommit={v=>updVbf("panelszam",s,v)} unit="db" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="DC feszültség">{["ST1","ST2","ST3","ST4","ST5","ST6"].map(s=><MeroSor key={s} label={s} value={vbf.dcFeszultseg[s]} onCommit={v=>updVbf("dcFeszultseg",s,v)} unit="V" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="Hurokellenállás">{["L1","L2","L3"].map(l=><MeroSor key={l} label={l} value={vbf.hurokellenallas[l]} onCommit={v=>updVbf("hurokellenallas",l,v)} unit="MΩ" piros={figy}/>)}</MeroSzakasz>
      <MeroSzakasz title="Smart meter & AKKU">
        <MeroSor label="SM" value={vbf.smartMeter} onCommit={v=>updVbf("smartMeter",null,v)} unit="db" piros={figy}/>
        <MeroSor label="AKKU" value={vbf.akku} onCommit={v=>updVbf("akku",null,v)} unit="db" piros={figy}/>
      </MeroSzakasz>
      <MeroSzakasz title="Betáplált DC teljesítmény">
        <MeroSor label="DC" value={vbf.betapaltDC} onCommit={v=>updVbf("betapaltDC",null,v)} unit="Wp" piros={figy}/>
      </MeroSzakasz>
      <MeroSzakasz title="Panel pontos adatok">
        <div style={{ marginBottom:12 }}>
          <p style={{ fontSize:13,color:C.muted,marginBottom:6 }}>Napelem Típusa <span style={{ fontSize:11,color:"#2563EB" }}>(szöveg)</span></p>
          <VbfTextInput value={vbf.panelTipus} onCommit={v=>updVbf("panelTipus",null,v)} piros={figy}/>
        </div>
        <MeroSor label="Voc" value={vbf.panelVoc} onCommit={v=>updVbf("panelVoc",null,v)} unit="V" piros={figy}/>
        <MeroSor label="Vmp" value={vbf.panelVmp} onCommit={v=>updVbf("panelVmp",null,v)} unit="V" piros={figy}/>
        <MeroSor label="Imp" value={vbf.panelImp} onCommit={v=>updVbf("panelImp",null,v)} unit="A" piros={figy}/>
        <MeroSor label="Isc" value={vbf.panelIsc} onCommit={v=>updVbf("panelIsc",null,v)} unit="A" piros={figy}/>
        <MeroSor label="Telj." value={vbf.panelTelj} onCommit={v=>updVbf("panelTelj",null,v)} unit="Wp" piros={figy}/>
      </MeroSzakasz>
      <MeroSzakasz title="Inverter pontos adatok">
        <MeroSor label="kVA" value={vbf.inverterNevleges} onCommit={v=>updVbf("inverterNevleges",null,v)} unit="kVA" piros={figy}/>
      </MeroSzakasz>
      <MeroSzakasz title="Tűzeseti adatok">
        <MeroSor label="A" value={vbf.tuzMegszakito} onCommit={v=>updVbf("tuzMegszakito",null,v)} unit="A" piros={figy}/>
      </MeroSzakasz>
      <button onClick={handleVbfMentes} style={{ width:"100%",padding:"14px",borderRadius:12,border:"none",background:C.accent,color:"#fff",fontWeight:700,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:FONT,marginTop:8,marginBottom:32 }}>
        <Save size={18}/>VBF mentése
      </button>
    </div>
  );

  const FotokTab=()=>(
    <div style={{ padding:"16px",background:"#F1F5F9" }}>
      <p style={{ fontSize:13,color:C.muted,marginBottom:16,lineHeight:1.6 }}>
        Minden kategóriába töltsd fel a fotókat. Ha nincs fotó, kötelező magyarázatot választani!
      </p>
      {FOTO_KAT.map(kat=>(
        <FotoKartya
          key={kat.id}
          kat={kat}
          photos={fotok[kat.id]||[]}
          onChange={v=>setFotok(p=>({...p,[kat.id]:v}))}
          hianyOk={fotoHianyOkok[kat.id]||null}
          onHianyOkChange={v=>setFotoHianyOkok(p=>({...p,[kat.id]:v}))}
        />
      ))}
    </div>
  );

  const ell_vbfOk = !checkVbfHianyos();
  const ell_osszesFoto = Object.values(fotok).reduce((s,a)=>s+(a.length||0),0);
  const ell_hianyosKat = FOTO_KAT.filter(k=>(fotok[k.id]||[]).length===0);
  const ell_mindenKatOk = ell_hianyosKat.every(k=>fotoHianyOkok[k.id]);
  const ell_megjegyzesMegvan = megjegyzes.trim().length > 0;
  const lezarhatoE = ell_vbfOk && ell_osszesFoto>0 && ell_megjegyzesMegvan && (ell_mindenKatOk||ell_hianyosKat.length===0);

  return (
    <div style={{ minHeight:"100vh",background:"#F1F5F9",fontFamily:FONT }}>
      <Header/>
      <TabSav/>
      {activeTab===0&&<InfoTab/>}
      {activeTab===1&&<AnyagokTab/>}
      {activeTab===2&&<FelmeresTab/>}
      {megkezdve&&activeTab===3&&<KivCsomagFelhasznalasTab munkalapId={m.id} projektId={m.projektId} onSave={()=>{}}/>}
      {megkezdve&&activeTab===4&&<VbfTab/>}
      {megkezdve&&activeTab===5&&<FotokTab/>}
      {megkezdve&&activeTab===6&&(
        <div style={{ padding:"16px",background:"#F1F5F9",paddingBottom:80 }}>
          <div style={{ background:"#fff",border:`1.5px solid ${!ell_megjegyzesMegvan?"#FCA5A5":C.border}`,borderRadius:12,padding:16,marginBottom:16 }}>
            <p style={{ fontSize:14,fontWeight:700,color:C.text,marginBottom:4 }}>
              📝 Megjegyzés / munkavégzés összefoglalója
              <span style={{ color:"#DC2626",marginLeft:6,fontSize:12 }}>*kötelező</span>
            </p>
            <p style={{ fontSize:12,color:C.muted,marginBottom:10 }}>Írd le a telepítés menetét, észrevételeket, problémákat.</p>
            <textarea
              value={megjegyzes}
              onChange={e=>setMegjegyzes(e.target.value)}
              onBlur={()=>{
                if (megjegyzes.trim().length>0) {
                  updateItem("munkalapok", m.id, { megjegyzes: megjegyzes.trim() });
                  window.dispatchEvent(new CustomEvent("crm-db-updated", { detail: { collection: "munkalapok" } }));
                  syncMunkalapokToDrive();
                }
              }}
              placeholder="Pl. A telepítés rendben megtörtént. Az inverter a garázs falán lett elhelyezve..."
              rows={5}
              style={{ width:"100%",padding:"10px 12px",border:`1.5px solid ${!ell_megjegyzesMegvan?"#EF4444":C.border}`,borderRadius:9,fontSize:14,fontFamily:FONT,color:C.text,outline:"none",background:"#F8FAFC",resize:"vertical",boxSizing:"border-box" }}
            />
            {ell_megjegyzesMegvan && <span style={{ fontSize:11,color:C.success }}>✓ Megjegyzés megadva</span>}
          </div>

          <div style={{ background:"#fff",border:`1px solid ${C.border}`,borderRadius:12,padding:16,marginBottom:16 }}>
            <p style={{ fontSize:15,fontWeight:700,color:C.text,marginBottom:12 }}>✅ Munka ellenőrzése</p>
            {[
              {label:"VBF Jegyzőkönyv",ok:ell_vbfOk,info:"A VBF fülön töltsd ki"},
              {label:`Fotók (${ell_osszesFoto} db)`,ok:ell_osszesFoto>0,info:"Min. 1 fotó szükséges"},
              {label:"Megjegyzés megadva",ok:ell_megjegyzesMegvan,info:"Legalább egy karakter"},
              {label:"Fotó nélküli kategóriák indokolva",ok:ell_mindenKatOk||ell_hianyosKat.length===0,info:`${ell_hianyosKat.filter(k=>!fotoHianyOkok[k.id]).length} kategória indoklás hiányzik`},
            ].map(item=>(
              <div key={item.label} style={{ display:"flex",alignItems:"flex-start",gap:10,padding:"10px 0",borderBottom:`1px solid ${C.border}` }}>
                {item.ok?<CheckCircle2 size={20} color={C.success} style={{flexShrink:0,marginTop:2}}/>:<AlertTriangle size={20} color="#D97706" style={{flexShrink:0,marginTop:2}}/>}
                <div>
                  <p style={{ fontSize:14,color:item.ok?C.success:"#D97706",fontWeight:item.ok?600:500,margin:0 }}>{item.label}</p>
                  {!item.ok&&<p style={{ fontSize:11,color:"#94A3B8",margin:"2px 0 0" }}>{item.info}</p>}
                </div>
              </div>
            ))}
          </div>

          {/* Napi jelenlét napló */}
          <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:16, marginBottom:16 }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, flexWrap:"wrap", gap:8 }}>
              <p style={{ fontSize:13, fontWeight:700, color:"#0F172A", margin:0 }}>👥 Napi jelenlét napló</p>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <label style={{ fontSize:11, color:C.muted }}>Dátum:</label>
                <input type="date" value={jelenletDatum} onChange={e => setJelenletDatum(e.target.value)}
                  style={{ padding:"5px 8px", border:`1.5px solid ${C.border}`, borderRadius:7, fontSize:12, fontFamily:FONT, outline:"none" }}/>
              </div>
            </div>

            {jelenletNaplok.length === 0 && javasloltJelenlet.length > 0 && (
              <div style={{ background:"#EFF6FF", border:"1px solid #BFDBFE", borderRadius:9, padding:"10px 14px", marginBottom:12 }}>
                <p style={{ fontSize:12, color:"#1D4ED8", margin:"0 0 8px", fontWeight:600 }}>
                  {javasloltJelenlet.length} csapattag importálható a kiosztott csapatokból
                </p>
                <button onClick={initJelenletFromJavaslat}
                  style={{ padding:"7px 14px", background:C.accent, color:"#fff", border:"none", borderRadius:7, cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:FONT }}>
                  Csapattagok betöltése →
                </button>
              </div>
            )}

            {jelenletNaplok.length === 0 ? (
              <div style={{ textAlign:"center", padding:"16px 0", color:C.muted, fontSize:12 }}>
                <p>Nincs rögzített jelenlét.</p>
                <p style={{ fontSize:11 }}>A jelenlét a csapattagok béralapú költségszámításhoz szükséges.</p>
              </div>
            ) : (
              <div>
                {jelenletNaplok.map(bej => (
                  <div key={bej.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px", border:`1px solid ${C.border}`, borderRadius:9, marginBottom:6, background: bej.jelen ? "#fff" : "#F8FAFC", opacity: bej.jelen ? 1 : .6 }}>
                    {/* Jelen toggle */}
                    <div onClick={() => { updateJelenletBejegyzes(bej.id, { jelen: !bej.jelen }); refreshJelenlet(); }}
                      style={{ width:34, height:18, borderRadius:9, position:"relative", cursor:"pointer", flexShrink:0,
                        background: bej.jelen ? "#059669" : "#CBD5E1", transition:"background .2s" }}>
                      <div style={{ position:"absolute", top:1, left: bej.jelen ? 17 : 1, width:16, height:16, borderRadius:"50%", background:"#fff", transition:"left .2s" }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontWeight:700, fontSize:13, color: bej.jelen ? C.text : C.muted }}>
                        {bej.nev}
                        {bej.ideiglenes && <span style={{ fontSize:10, background:"#FFF7ED", color:"#C2410C", padding:"1px 5px", borderRadius:20, marginLeft:5 }}>Ideiglenes</span>}
                      </p>
                      <div style={{ display:"flex", gap:6, marginTop:1 }}>
                        {bej.csapatNev && <span style={{ fontSize:10, color:C.muted }}>{bej.csapatNev}</span>}
                        {bej.szerep    && <span style={{ fontSize:10, color:C.muted }}>{bej.szerep}</span>}
                      </div>
                    </div>
                    {/* Óra vagy napi bér */}
                    <div style={{ display:"flex", alignItems:"center", gap:4, flexShrink:0 }}>
                      {bej.napiBer > 0 ? (
                        <span style={{ fontSize:11, color:"#059669", fontWeight:600 }}>
                          {Number(bej.napiBer).toLocaleString("hu-HU")} Ft
                        </span>
                      ) : (
                        <div style={{ display:"flex", alignItems:"center", gap:3 }}>
                          <input type="number" min="0" value={bej.orak || 8}
                            onChange={e => { updateJelenletBejegyzes(bej.id, { orak: Number(e.target.value) }); refreshJelenlet(); }}
                            style={{ width:44, padding:"4px 6px", border:`1.5px solid ${C.border}`, borderRadius:6, fontSize:12, fontFamily:FONT, textAlign:"center" }}/>
                          <span style={{ fontSize:10, color:C.muted }}>h</span>
                        </div>
                      )}
                    </div>
                    <button onClick={() => { deleteJelenletBejegyzes(bej.id); refreshJelenlet(); }}
                      style={{ padding:"3px 5px", background:"#FEF2F2", border:"none", borderRadius:5, cursor:"pointer", color:"#DC2626", flexShrink:0 }}>
                      <X size={11}/>
                    </button>
                  </div>
                ))}
                <div style={{ textAlign:"right", fontSize:12, color:"#059669", fontWeight:700, marginTop:8, paddingTop:8, borderTop:`1px solid ${C.border}` }}>
                  Összes bérköltség: {jelenletNaplok.filter(j=>j.jelen).reduce((s,j) => s + (j.koltseg || calcJelenletKoltseg(j)), 0).toLocaleString("hu-HU")} Ft
                </div>
              </div>
            )}
          </div>

          {/* Beépítési visszaigazolás – csak projekt szintről örökölt elemek */}
          <BeepitesiVisszaigazolas munkalap={m} projekt={proj} />

          <button
            onClick={handleBefejezesKezdete}
            disabled={!lezarhatoE}
            style={{
              width:"100%",
              padding:"15px",
              borderRadius:12,
              border:"none",
              background:lezarhatoE?"#22C55E":"#CBD5E1",
              color:"#fff",
              fontWeight:700,
              fontSize:16,
              cursor:lezarhatoE?"pointer":"not-allowed",
              fontFamily:FONT,
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              gap:8
            }}
          >
            {lezarhatoE?"✅ Munka befejezése és lezárása":"🔒 Hiányos dokumentáció"}
          </button>

          {!lezarhatoE&&<p style={{ fontSize:12,color:"#DC2626",textAlign:"center",marginTop:8,fontWeight:600 }}>Piros jelölésű feltételek teljesítése szükséges.</p>}
        </div>
      )}

      {showAlairas&&<AlairasModal m={m} userRole="Telepítő" onClose={()=>setShowAlairas(false)} onSave={handleBefejezes}/>}
      {showLmra&&<LmraTelepltoView munkalap={m} currentUser={currentUser} onClose={() => { setShowLmra(false); doMegkezdes(); }} onComplete={handleLmraComplete} />}
    </div>
  );
}