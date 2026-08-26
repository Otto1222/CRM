import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, X, Calculator, FileSpreadsheet, Upload } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../../lib/constants.js";
import { ft } from "../../lib/helpers.js";
import {
  loadFovallalkozok, createFovallalkozo, updateFovallalkozo, deleteFovallalkozo,
  getSzabalyokByFovallalkozo, createSzabaly, updateSzabaly, deleteSzabaly,
} from "./fovallalkozo.service.js";
import {
  ELSZAMOLASI_MODOK,
  calcSzabalyOsszeg, szabalyLeiras,
} from "./elszamolasiMotor.js";
import { getAktivMunkatipusok } from "../munkatipusok/munkatipus.service.js";
import {
  getKatalogusTetelek, groupKatalogusByKategoria,
  updateKatalogusTetel, deleteKatalogusTetel, seedGreenHomeDijtabla, seedWagnerSolarDijtabla,
} from "./dijtetelKatalogus.service.js";
import DijtablaImportPanel from "../../components/DijtablaImportPanel.jsx";
import TigSablonUploader from "../../components/TigSablonUploader.jsx";

const inp = {
  width: "100%", boxSizing: "border-box", padding: "8px 11px",
  border: `1.5px solid ${C.border}`, borderRadius: 8, fontSize: 13,
  fontFamily: "inherit", outline: "none",
};
const FL = ({ label, children, half, full }) => (
  <div style={{ gridColumn: full ? "span 2" : half ? "span 1" : "span 2" }}>
    <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3, textTransform: "uppercase", letterSpacing: .6 }}>
      {label}
    </label>
    {children}
  </div>
);

const ALAPMENNYISEG_OPCIOK = [
  { value: "",               label: "Darabszám (alapértelmezett)" },
  { value: "panel_db",       label: "Napelem db" },
  { value: "inverter_db",    label: "Inverter db" },
  { value: "akku_db",        label: "Akkumulátor db" },
  { value: "smart_meter_db", label: "Smart meter / energiamérő db" },
  { value: "tavKm",          label: "Távolság km" },
  { value: "fix",            label: "Fix díj" },
];

// ─── Sáv szerkesztő ───────────────────────────────────────────

function SavokSzerkeszto({ savok, onChange }) {
  function addSav() {
    const last = savok[savok.length - 1];
    const ujTol = last ? (Number(last.ig) + 1) : 1;
    onChange([...savok, { tol: ujTol, ig: "", osszeg: 0, perDb: false }]);
  }
  function removeSav(i) {
    onChange(savok.filter((_, idx) => idx !== i));
  }
  function updateSav(i, key, val) {
    onChange(savok.map((s, idx) => idx === i ? { ...s, [key]: val } : s));
  }

  return (
    <div>
      {savok.length === 0 && (
        <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic", margin: "4px 0 8px" }}>
          Nincs sáv – add hozzá az alábbi gombbal
        </p>
      )}
      {savok.map((sav, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: C.muted, minWidth: 20, textAlign: "right" }}>{i + 1}.</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
            <input
              type="number" min={0} placeholder="tól"
              value={sav.tol}
              onChange={e => updateSav(i, "tol", e.target.value)}
              style={{ ...inp, width: 72, textAlign: "center" }}
            />
            <span style={{ fontSize: 11, color: C.muted }}>db  –</span>
            <input
              type="number" min={0} placeholder="ig (üres=∞)"
              value={sav.ig}
              onChange={e => updateSav(i, "ig", e.target.value)}
              style={{ ...inp, width: 88, textAlign: "center" }}
            />
            <span style={{ fontSize: 11, color: C.muted }}>db  =</span>
            <input
              type="number" min={0} placeholder="összeg"
              value={sav.osszeg}
              onChange={e => updateSav(i, "osszeg", e.target.value)}
              style={{ ...inp, flex: 1, textAlign: "right" }}
            />
            <span style={{ fontSize: 11, color: C.muted }}>Ft</span>
            <label title="Ha be van pipálva, a fenti összeg Ft/db egységár, ami a TELJES darabszámra vetül (nem csak a sávba esőre). Kikapcsolva: az összeg egy fix, sávonkénti végösszeg."
              style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10.5, color: C.textSub, cursor: "pointer", whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={!!sav.perDb} onChange={e => updateSav(i, "perDb", e.target.checked)} />
              Ft/db
            </label>
          </div>
          <button onClick={() => removeSav(i)}
            style={{ padding: "4px 6px", background: C.dangerLight, color: C.danger, border: "none", borderRadius: 6, cursor: "pointer" }}>
            <X size={11} />
          </button>
        </div>
      ))}
      <button onClick={addSav}
        style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", border: `1.5px dashed ${C.border}`, borderRadius: 7, background: C.bg, cursor: "pointer", fontSize: 12, color: C.textSub, fontFamily: FONT, marginTop: 4 }}>
        <Plus size={12} /> Új sáv hozzáadása
      </button>
    </div>
  );
}

// ─── Tesztelő panel ───────────────────────────────────────────

function KalkulacioTesztelo({ szabaly }) {
  const [db, setDb] = useState(10);
  const [km, setKm] = useState(50);
  const [nap, setNap] = useState(1);

  if (!szabaly?.mod) return null;
  const needsDb    = ["darab", "savos"].includes(szabaly.mod);
  const needsKm    = ["km", "fix_kiszallas"].includes(szabaly.mod);
  const needsNap   = szabaly.mod === "nap";
  const aktAlap    = szabaly.alapMennyiseg || "";
  const dbInputKey = aktAlap && aktAlap !== "tavKm" && aktAlap !== "fix" ? aktAlap : "darabszam";
  const dbLabel    = ALAPMENNYISEG_OPCIOK.find(o => o.value === aktAlap)?.label || "Darabszám";
  const testInput  = { darabszam: db, tavKm: km, munkanapok: nap, [dbInputKey]: db };
  const eredmeny   = calcSzabalyOsszeg(szabaly, testInput);

  return (
    <div style={{ background: C.successLight, border: `1px solid ${C.success}`, borderRadius: 10, padding: "12px 14px", marginTop: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#065F46", margin: "0 0 8px", display: "flex", alignItems: "center", gap: 5 }}>
        <Calculator size={13} /> Tesztelő – próba input
      </p>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {needsDb && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
            {dbLabel}:
            <input type="number" min={0} value={db} onChange={e => setDb(Number(e.target.value))}
              style={{ ...inp, width: 72, padding: "5px 8px" }} />
          </label>
        )}
        {needsKm && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
            Egyirányú km:
            <input type="number" min={0} value={km} onChange={e => setKm(Number(e.target.value))}
              style={{ ...inp, width: 80, padding: "5px 8px" }} />
          </label>
        )}
        {needsNap && (
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#374151" }}>
            Munkanapok:
            <input type="number" min={0} value={nap} onChange={e => setNap(Number(e.target.value))}
              style={{ ...inp, width: 70, padding: "5px 8px" }} />
          </label>
        )}
        <span style={{ fontSize: 16, fontWeight: 800, color: eredmeny > 0 ? C.success : C.muted, marginLeft: 8 }}>
          = {ft(eredmeny)}
        </span>
        {szabaly.mod === "savos" && (() => {
          const s = (szabaly.savok || []).find(sv => {
            const tol = Number(sv.tol) || 0;
            const ig  = sv.ig !== "" && sv.ig !== null ? Number(sv.ig) : Infinity;
            return db >= tol && db <= ig;
          });
          return s
            ? <span style={{ fontSize: 11, color: C.success }}>(sáv: {s.tol}–{s.ig || "∞"} db)</span>
            : <span style={{ fontSize: 11, color: C.danger }}>(nincs egyező sáv!)</span>;
        })()}
        {szabaly.mod === "fix" && <span style={{ fontSize: 11, color: C.muted }}>(fix összeg, inputtól független)</span>}
        {szabaly.mod === "fix_kiszallas" && <span style={{ fontSize: 11, color: C.muted }}>(fix, km-tól független)</span>}
      </div>
    </div>
  );
}

// ─── Díjtétel form ────────────────────────────────────────────

function SzabalyForm({ szabaly, tulajdonosId, onSave, onClose }) {
  const isNew = !szabaly?.id;
  // P0 fix: a munkatípus-választónak a projekten ténylegesen tárolt
  // munkatípus ID-kkal kell megegyeznie (ProjektForm.jsx a getAktivMunkatipusok()
  // ID-jét menti a penzugy.munkatipus mezőbe), különben findEgyezoSzabalyok()
  // (elszamolasiMotor.js) soha nem talál pontos egyezést, és a munkatípusra
  // szabott díjtétel csendben sosem lép életbe.
  const munkatipusok = getAktivMunkatipusok();

  const [f, setF] = useState({
    tulajdonosId,
    profilNev:     szabaly?.profilNev     || "",
    megnevezes:    szabaly?.megnevezes    || "",
    alapMennyiseg: szabaly?.alapMennyiseg || "",
    munkatipus:    szabaly?.munkatipus    || "",
    aktiv:         szabaly?.aktiv         ?? true,
    mod:           szabaly?.mod           || "fix",
    fixOsszeg:     szabaly?.fixOsszeg     || 0,
    darabEgysegAr: szabaly?.darabEgysegAr || 0,
    savok:         szabaly?.savok         || [],
    kmDijFtKm:     szabaly?.kmDijFtKm     || 0,
    kmKuszobKm:    szabaly?.kmKuszobKm    || 0,
    kiszallasiDij: szabaly?.kiszallasiDij || 0,
    napiDij:       szabaly?.napiDij       || 0,
    megjegyzes:    szabaly?.megjegyzes    || "",
  });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));

  const modInfo = ELSZAMOLASI_MODOK.find(m => m.id === f.mod);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2100, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 580, padding: "24px", fontFamily: FONT, maxHeight: "92vh", overflowY: "auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h3 style={{ fontFamily: FONT_HEADING, fontSize: 16, fontWeight: 800, margin: 0 }}>
            {isNew ? "Új díjtétel" : "Díjtétel szerkesztése"}
          </h3>
          <button onClick={onClose} style={{ padding: "4px 8px", border: "none", background: "none", cursor: "pointer", color: C.muted }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 14px" }}>

          {/* Profil neve */}
          <FL label="Profil neve (csoportosításhoz, opcionális)">
            <input value={f.profilNev} onChange={e => u("profilNev", e.target.value)}
              placeholder="pl. Green-Home Napelemes 2026" style={inp} />
          </FL>

          {/* Díjtétel neve */}
          <FL label="Díjtétel neve (opcionális)">
            <input value={f.megnevezes} onChange={e => u("megnevezes", e.target.value)}
              placeholder="pl. Akkumulátor szerelési díj" style={inp} />
          </FL>

          {/* Mennyiségi alap */}
          <FL label="Mennyiségi alap">
            <select value={f.alapMennyiseg} onChange={e => u("alapMennyiseg", e.target.value)} style={inp}>
              {ALAPMENNYISEG_OPCIOK.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 0" }}>
              Darab / sávos módnál: melyik projektmezőből vegye a mennyiséget
            </p>
          </FL>

          {/* Munkatípus */}
          <FL label="Munkatípus">
            <select value={f.munkatipus} onChange={e => u("munkatipus", e.target.value)} style={inp}>
              <option value="">— Minden munkatípusra (általános) —</option>
              {munkatipusok.map(t => (
                <option key={t.id} value={t.id}>{t.nev}</option>
              ))}
            </select>
          </FL>

          {/* Aktív toggle */}
          <FL label="Állapot" half>
            <label style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={f.aktiv} onChange={e => u("aktiv", e.target.checked)}
                style={{ width: 16, height: 16, accentColor: C.accent }} />
              <span style={{ fontSize: 13, color: f.aktiv ? C.success : C.muted, fontWeight: 600 }}>
                {f.aktiv ? "Aktív" : "Inaktív"}
              </span>
            </label>
          </FL>

          {/* Elszámolási mód */}
          <FL label="Elszámolási mód">
            <select value={f.mod} onChange={e => u("mod", e.target.value)} style={{ ...inp, fontWeight: 600 }}>
              {ELSZAMOLASI_MODOK.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            {modInfo?.hint && (
              <p style={{ fontSize: 11, color: C.muted, margin: "4px 0 0" }}>{modInfo.hint}</p>
            )}
          </FL>

          {/* Mód-specifikus mezők */}
          {f.mod === "fix" && (
            <FL label="Fix összeg (Ft)" half>
              <input type="number" min={0} value={f.fixOsszeg}
                onChange={e => u("fixOsszeg", Number(e.target.value))} style={inp} />
            </FL>
          )}

          {f.mod === "darab" && (
            <FL label="Egységár (Ft / db)" half>
              <input type="number" min={0} value={f.darabEgysegAr}
                onChange={e => u("darabEgysegAr", Number(e.target.value))} style={inp} />
            </FL>
          )}

          {f.mod === "km" && (<>
            <FL label="Km-díj (Ft / km)" half>
              <input type="number" min={0} value={f.kmDijFtKm}
                onChange={e => u("kmDijFtKm", Number(e.target.value))} style={inp} />
            </FL>
            <FL label="Küszöb km (ez alatt nem jár)" half>
              <input type="number" min={0} value={f.kmKuszobKm}
                onChange={e => u("kmKuszobKm", Number(e.target.value))} placeholder="0" style={inp} />
            </FL>
          </>)}

          {f.mod === "fix_kiszallas" && (
            <FL label="Fix kiszállási díj (Ft)" half>
              <input type="number" min={0} value={f.kiszallasiDij}
                onChange={e => u("kiszallasiDij", Number(e.target.value))} style={inp} />
            </FL>
          )}

          {f.mod === "nap" && (
            <FL label="Napidíj (Ft / nap)" half>
              <input type="number" min={0} value={f.napiDij}
                onChange={e => u("napiDij", Number(e.target.value))} style={inp} />
            </FL>
          )}

          {/* Sávos szerkesztő */}
          {f.mod === "savos" && (
            <FL label="Sávos díjazás – korlátlan sáv (darabszám tól–ig = összeg)">
              <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 9, padding: "12px 14px", marginTop: 4 }}>
                <SavokSzerkeszto savok={f.savok} onChange={v => u("savok", v)} />
              </div>
              <p style={{ fontSize: 11, color: C.muted, margin: "5px 0 0" }}>
                Az „ig" mező üresen hagyható → az a sáv a legfelső korlát nélküli sávot jelenti (∞).
              </p>
            </FL>
          )}

          {/* Megjegyzés */}
          <FL label="Megjegyzés (opcionális)">
            <input value={f.megjegyzes} onChange={e => u("megjegyzes", e.target.value)}
              placeholder="pl. Szezonális megállapodás, stb." style={inp} />
          </FL>
        </div>

        {/* Tesztelő */}
        <KalkulacioTesztelo szabaly={f} />

        {/* Gombok */}
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose}
            style={{ padding: "8px 16px", border: `1.5px solid ${C.border}`, borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: FONT }}>
            Mégse
          </button>
          <button onClick={() => onSave(f)}
            style={{ padding: "8px 20px", background: C.accent, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontFamily: FONT }}>
            {isNew ? "Létrehozás" : "Mentés"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Díjtétel kártya ──────────────────────────────────────────

function SzabalyKartya({ sz, onEdit, onDelete, onToggle }) {
  const modInfo  = ELSZAMOLASI_MODOK.find(m => m.id === sz.mod);
  const leiras   = szabalyLeiras(sz);
  // sz.munkatipus mostantól munkatípus ID (lásd P0 fix) – a kártyán a
  // megjelenítéshez feloldjuk a nevet; régi, még nem szerkesztett szabályoknál
  // ez egy korábbi szöveges érték lehet, azt változatlanul kiírjuk (fallback).
  const munkatipusNev = sz.munkatipus
    ? (getAktivMunkatipusok().find(t => t.id === sz.munkatipus)?.nev || sz.munkatipus)
    : "";
  const savokDb  = sz.mod === "savos" ? (sz.savok?.length || 0) : null;
  const alapInfo = sz.alapMennyiseg
    ? ALAPMENNYISEG_OPCIOK.find(o => o.value === sz.alapMennyiseg)
    : null;

  return (
    <div style={{
      background: sz.aktiv ? C.bg : C.bg,
      border: `1px solid ${sz.aktiv ? C.border : C.border}`,
      borderLeft: `3px solid ${sz.aktiv ? C.accent : C.muted}`,
      borderRadius: 9, padding: "10px 14px", marginBottom: 6,
      display: "flex", alignItems: "flex-start", gap: 10,
      opacity: sz.aktiv ? 1 : 0.65,
    }}>
      <div style={{ flex: 1 }}>
        {sz.megnevezes && (
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 3 }}>
            {sz.megnevezes}
          </div>
        )}
        <div style={{ display: "flex", gap: 7, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontWeight: sz.megnevezes ? 500 : 700, fontSize: 12, color: sz.megnevezes ? C.muted : C.text }}>
            {munkatipusNev || "Általános (minden típusra)"}
          </span>
          <span style={{ fontSize: 11, background: C.accentLight, color: C.accent, padding: "1px 8px", borderRadius: 20, fontWeight: 700 }}>
            {modInfo?.label || sz.mod}
          </span>
          {alapInfo && (
            <span style={{ fontSize: 11, background: C.accentLight, color: C.accent, padding: "1px 8px", borderRadius: 20, fontWeight: 600 }}>
              {alapInfo.label}
            </span>
          )}
          {!sz.aktiv && <span style={{ fontSize: 10, background: C.bg, color: C.muted, padding: "1px 7px", borderRadius: 20 }}>Inaktív</span>}
        </div>
        <div style={{ fontSize: 12, color: C.textSub, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, color: C.success }}>{leiras}</span>
          {savokDb !== null && <span>{savokDb} sáv</span>}
          {sz.megjegyzes && <span style={{ color: C.muted }}>{sz.megjegyzes}</span>}
        </div>
        {sz.mod === "savos" && (sz.savok || []).length > 0 && (
          <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(sz.savok || []).map((s, i) => (
              <span key={i} style={{ fontSize: 10, background: C.accentLight, color: C.accent, padding: "2px 7px", borderRadius: 20, fontWeight: 600 }}>
                {s.tol}–{s.ig || "∞"} db: {Number(s.osszeg || 0).toLocaleString("hu-HU")} Ft{s.perDb ? "/db" : ""}
              </span>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
        <button onClick={onToggle} title={sz.aktiv ? "Inaktiválás" : "Aktiválás"}
          style={{ padding: "4px 8px", background: sz.aktiv ? C.warningLight : C.successLight, color: sz.aktiv ? C.warning : C.success, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: FONT }}>
          {sz.aktiv ? "Inakt." : "Aktív"}
        </button>
        <button onClick={onEdit}
          style={{ padding: "4px 8px", background: C.accentLight, color: C.accent, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11 }}>
          <Pencil size={11} />
        </button>
        <button onClick={onDelete}
          style={{ padding: "4px 7px", background: C.dangerLight, color: C.danger, border: "none", borderRadius: 6, cursor: "pointer" }}>
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

// ─── Díjtétel-katalógus (tételes díjtábla) szekció ─────────────

function DijtablaKatalogusSzekcio({ fv, katalogus, onRefresh }) {
  const [importOpen, setImportOpen] = useState(false);
  const csoportok = groupKatalogusByKategoria(katalogus);
  const aktivDb = katalogus.filter(t => t.aktiv !== false).length;

  return (
    <div style={{ marginTop: 18, borderTop: `1px solid ${C.bg}`, paddingTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Díjtétel-katalógus (tételes díjtábla)</span>
          <span style={{ fontSize: 12, color: C.muted, marginLeft: 6 }}>
            ({aktivDb} aktív tétel — ez tölti fel a projekt létrehozásnál a "Tételek a díjtáblából" kosarat)
          </span>
        </div>
        <button onClick={() => setImportOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: katalogus.length > 0 ? "#fff" : C.accent, color: katalogus.length > 0 ? C.accent : "#fff", border: `1.5px solid ${C.accent}`, borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: FONT }}>
          <Upload size={12} /> {katalogus.length > 0 ? "Díjtábla frissítése" : "Díjtábla import"}
        </button>
      </div>

      {katalogus.length === 0 ? (
        <div style={{ background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 9, padding: "14px", textAlign: "center" }}>
          <FileSpreadsheet size={20} color={C.muted} style={{ display: "block", margin: "0 auto 6px" }} />
          <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
            Még nincs feltöltve tételes díjtábla. Az "Új díjtétel" fentebb a régi, munkatípus-alapú szabály-motort szerkeszti –
            a valódi, soronkénti díjtáblához (pl. Green Home ártábla) itt tölts fel egy Excelt.
          </p>
        </div>
      ) : (
        <div style={{ border: `1px solid ${C.border}`, borderRadius: 9, overflow: "hidden" }}>
          {/* Fix oszlopszélességű grid – korábban flex+feltételes "+km" jelvény
              volt, ami rács nélkül minden sort máshova tolt el vízszintesen,
              ha az adott tételnek épp nem volt km-díja. A jelvény-oszlop
              mostantól MINDIG lefoglalt helyet kap (üres, ha nincs km-díj),
              így minden sor pontosan egy oszlopsorba rendeződik. */}
          <div style={{ display: "grid", gridTemplateColumns: "46px 1fr 52px 96px 46px 62px 30px", gap: 8, alignItems: "center", padding: "5px 12px", background: C.bg, fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: .4 }}>
            <span>Kód</span><span>Megnevezés</span><span>Egys.</span><span style={{ textAlign: "right" }}>Ár</span><span /><span /><span />
          </div>
          {csoportok.map(g => (
            <div key={g.kategoria}>
              <div style={{ background: C.bg, padding: "5px 12px", fontSize: 11, fontWeight: 700, color: C.textSub, borderTop: `1px solid ${C.border}` }}>
                {g.kategoria}
              </div>
              {g.tetelek.map(t => (
                <div key={t.id} style={{ borderTop: `1px solid ${C.bg}`, opacity: t.aktiv === false ? 0.5 : 1 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "46px 1fr 52px 96px 46px 62px 30px", gap: 8, alignItems: "center", padding: "6px 12px" }}>
                    <span style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.kod || "—"}</span>
                    <span style={{ fontSize: 12.5, color: C.text, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.megnevezes}>{t.megnevezes}</span>
                    <span style={{ fontSize: 11, color: C.muted }}>{t.egyseg}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{ft(t.ar)}</span>
                    <span style={{ display: "flex", justifyContent: "center" }}>
                      <button onClick={() => { updateKatalogusTetel(t.id, { kmDij: !t.kmDij }); onRefresh(); }}
                        title={t.kmDij ? "Km-díj is jár érte – kattints a kikapcsoláshoz" : "Nincs km-díj – kattints a bekapcsoláshoz"}
                        style={{ fontSize: 10, background: t.kmDij ? C.accentLight : C.bg, color: t.kmDij ? C.accent : C.muted, padding: "1px 6px", borderRadius: 20, fontWeight: 700, whiteSpace: "nowrap", border: "none", cursor: "pointer" }}>
                        +km
                      </button>
                    </span>
                    <button onClick={() => { updateKatalogusTetel(t.id, { aktiv: t.aktiv === false }); onRefresh(); }}
                      title={t.aktiv === false ? "Aktiválás" : "Inaktiválás"}
                      style={{ padding: "3px 7px", background: t.aktiv === false ? C.successLight : C.warningLight, color: t.aktiv === false ? C.success : C.warning, border: "none", borderRadius: 6, cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: FONT, whiteSpace: "nowrap" }}>
                      {t.aktiv === false ? "Aktivál" : "Inakt."}
                    </button>
                    <button onClick={() => { if (window.confirm("Törlöd ezt a díjtétel-katalógus tételt?")) { deleteKatalogusTetel(t.id); onRefresh(); } }}
                      style={{ padding: "3px 6px", background: C.dangerLight, color: C.danger, border: "none", borderRadius: 6, cursor: "pointer", display: "flex", justifyContent: "center" }}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                  {/* Csak "km" egységű tételeknél értelmezett: ez a sor adja a
                      Ft/km díjat, a küszöb pedig azt, hogy a teljes oda-vissza
                      távolságból mennyi felett kell csak fizetni (pl. Wagner-
                      Solar: 50 km felett). Enélkül a projekt-létrehozásnál a
                      "Kiszállási díj" doboz nem tudja kiszámolni a fizetendő
                      részt – ld. calcKmDijOsszeg. */}
                  {t.egyseg === "km" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px 6px 12px" }}>
                      <span style={{ fontSize: 10.5, color: C.muted }}>Küszöb (km, ez felett a rész oda-vissza számolódik):</span>
                      <input type="number" min={0} value={t.kmKuszobKm || 0}
                        onChange={e => { updateKatalogusTetel(t.id, { kmKuszobKm: Number(e.target.value) || 0 }); onRefresh(); }}
                        style={{ width: 56, padding: "2px 6px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, fontFamily: FONT }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {importOpen && (
        <DijtablaImportPanel
          tulajdonosId={fv.id}
          meglevoDb={aktivDb}
          onClose={() => setImportOpen(false)}
          onImported={() => { setImportOpen(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

// ─── Fővállalkozó sor ─────────────────────────────────────────

function FvSor({ fv, onUpdate, onDelete }) {
  const [open,      setOpen]      = useState(false);
  const [editFv,    setEditFv]    = useState(false);
  const [ujSz,      setUjSz]      = useState(false);
  const [szerkSz,   setSzerkSz]   = useState(null);
  const [fvForm,    setFvForm]    = useState({ nev: fv.nev, rovidites: fv.rovidites || "", megjegyzes: fv.megjegyzes || "" });
  const [szabalyok, setSzabalyok] = useState(() => getSzabalyokByFovallalkozo(fv.id));
  const [katalogus, setKatalogus] = useState(() => getKatalogusTetelek(fv.id));

  function refresh() { setSzabalyok(getSzabalyokByFovallalkozo(fv.id)); setKatalogus(getKatalogusTetelek(fv.id)); }

  function handleSzSave(data) {
    if (szerkSz?.id) updateSzabaly(szerkSz.id, data);
    else createSzabaly({ ...data, tulajdonosId: fv.id });
    refresh();
    setSzerkSz(null);
    setUjSz(false);
  }

  const aktivSzabaly = szabalyok.filter(s => s.aktiv !== false).length;
  const aktivKatalogusTetel = katalogus.filter(t => t.aktiv !== false).length;

  // Csoportosítás profilNev szerint; névtelenek a végére kerülnek
  function groupByProfil(lista) {
    const groups = {};
    lista.forEach(sz => {
      const key = sz.profilNev?.trim() || "";
      if (!groups[key]) groups[key] = [];
      groups[key].push(sz);
    });
    const named  = Object.keys(groups).filter(k => k !== "").sort();
    const result = named.map(k => ({ profilNev: k, tetelek: groups[k] }));
    if (groups[""]) result.push({ profilNev: "", tetelek: groups[""] });
    return result;
  }

  const profilCsoportok = groupByProfil(szabalyok);

  return (
    <div style={{ background: "#fff", border: `1.5px solid ${open ? C.accent : C.border}`, borderRadius: 12, marginBottom: 10, overflow: "hidden", opacity: fv.aktiv ? 1 : .6 }}>

      {/* Fejléc */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer" }}
        onClick={() => setOpen(o => !o)}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{fv.nev}</span>
            {fv.rovidites && (
              <span style={{ fontSize: 11, background: C.accentLight, color: C.accent, padding: "2px 9px", borderRadius: 20, fontWeight: 700 }}>
                [{fv.rovidites}]
              </span>
            )}
            <span style={{ fontSize: 11, background: fv.aktiv ? C.successLight : C.bg, color: fv.aktiv ? C.success : C.muted, padding: "2px 9px", borderRadius: 20, fontWeight: 600 }}>
              {fv.aktiv ? "Aktív" : "Inaktív"}
            </span>
            <span style={{ fontSize: 12, color: C.muted }} title="Kézi, munkatípus-alapú szabály / Díjtétel-katalógus tétel – a kettő két különböző elszámolási mechanizmus, ld. lentebb.">
              {aktivSzabaly} kézi szabály · {aktivKatalogusTetel} katalógus-tétel
            </span>
          </div>
          {fv.megjegyzes && (
            <p style={{ fontSize: 11, color: C.muted, margin: "2px 0 0" }}>{fv.megjegyzes}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          <button onClick={() => onUpdate(fv.id, { aktiv: !fv.aktiv })}
            style={{ padding: "5px 10px", border: `1px solid ${C.border}`, borderRadius: 7, background: "#fff", cursor: "pointer", fontSize: 11, fontFamily: FONT }}>
            {fv.aktiv ? "Inaktivál" : "Aktivál"}
          </button>
          <button onClick={() => setEditFv(true)}
            style={{ padding: "5px 10px", border: "none", background: C.accentLight, color: C.accent, borderRadius: 7, cursor: "pointer", fontSize: 11, fontFamily: FONT }}>
            Szerkeszt
          </button>
          <button onClick={() => onDelete(fv.id)}
            style={{ padding: "5px 8px", border: "none", background: C.dangerLight, color: C.danger, borderRadius: 7, cursor: "pointer" }}>
            <Trash2 size={13} />
          </button>
        </div>
        {open ? <ChevronUp size={16} color={C.muted} /> : <ChevronDown size={16} color={C.muted} />}
      </div>

      {/* FV szerkesztő */}
      {editFv && (
        <div style={{ borderTop: `1px solid ${C.bg}`, padding: "14px 18px", background: C.bg, display: "grid", gridTemplateColumns: "2fr 0.7fr 2fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3 }}>Név</label>
            <input value={fvForm.nev} onChange={e => setFvForm(p => ({ ...p, nev: e.target.value }))} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3 }}>Rövidítés (max 4)</label>
            <input value={fvForm.rovidites} onChange={e => setFvForm(p => ({ ...p, rovidites: e.target.value.toUpperCase().slice(0, 4) }))} maxLength={4} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3 }}>Megjegyzés</label>
            <input value={fvForm.megjegyzes} onChange={e => setFvForm(p => ({ ...p, megjegyzes: e.target.value }))} style={inp} />
          </div>
          <div style={{ gridColumn: "span 3", display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setEditFv(false)}
              style={{ padding: "7px 14px", border: `1.5px solid ${C.border}`, borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: FONT }}>
              Mégse
            </button>
            <button type="button" onClick={() => { onUpdate(fv.id, fvForm); setEditFv(false); }}
              style={{ padding: "7px 14px", background: C.success, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontFamily: FONT }}>
              Mentés
            </button>
          </div>
        </div>
      )}

      {/* Díjtételek – profilNev szerint csoportosítva */}
      {open && (
        <div style={{ borderTop: `1px solid ${C.bg}`, padding: "14px 18px" }}>
          {katalogus.length > 0 && szabalyok.length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: C.warningLight, border: `1px solid ${C.warning}40`, borderRadius: 9, padding: "9px 12px", marginBottom: 12, fontSize: 12, color: C.warning }}>
              <span>⚠</span>
              <span>
                Ennél a fővállalkozónál van feltöltött <strong>díjtétel-katalógus</strong> (lentebb) – új projektnél a bevétel
                onnan, a "tételek a díjtáblából" kosárból számolódik. Az alábbi kézi szabályok csak akkor érvényesülnek,
                ha egy adott projektnél senki nem választ tételt a kosárból – ezért, hogy ne legyen kétértelmű, melyik
                számít, célszerű vagy törölni ezeket, vagy inaktiválni.
              </span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>Elszámolási szabályok (kézi, munkatípus-alapú)</span>
              <span style={{ fontSize: 12, color: C.muted, marginLeft: 6 }}>
                ({szabalyok.length} db — egy szabály = egy munkatípus + egy számítási mód)
              </span>
            </div>
            <button onClick={() => setUjSz(true)}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 14px", background: C.accent, color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 12, fontFamily: FONT }}>
              <Plus size={12} /> Új díjtétel
            </button>
          </div>

          {szabalyok.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: C.muted }}>
              <p style={{ fontSize: 13, fontWeight: 600 }}>Még nincs díjtétel</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Add hozzá az „Új díjtétel" gombbal</p>
            </div>
          ) : (
            <div style={{ opacity: katalogus.length > 0 ? 0.55 : 1 }}>
            {profilCsoportok.map(({ profilNev, tetelek }) => (
              <div key={profilNev || "__nincs__"} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {profilNev ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, background: C.accentLight, padding: "3px 10px", borderRadius: 20, border: `1px solid ${C.accentLight}` }}>
                      {profilNev}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, fontStyle: "italic" }}>
                      Profil nélküli / régi szabályok
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: C.muted }}>({tetelek.length} tétel)</span>
                </div>
                {tetelek.map(sz => (
                  <SzabalyKartya
                    key={sz.id}
                    sz={sz}
                    onEdit={() => setSzerkSz(sz)}
                    onDelete={() => { if (window.confirm("Törlöd ezt a díjtételt?")) { deleteSzabaly(sz.id); refresh(); } }}
                    onToggle={() => { updateSzabaly(sz.id, { aktiv: !sz.aktiv }); refresh(); }}
                  />
                ))}
              </div>
            ))}
            </div>
          )}

          {/* Súgó */}
          <div style={{ marginTop: 12, padding: "10px 14px", background: C.accentLight, border: `1px solid ${C.accentLight}`, borderRadius: 9, fontSize: 12, color: C.accentHover }}>
            <strong>Több díjtétel is lehet ugyanahhoz a munkatípushoz</strong> – pl. egy sávos díj + egy fix kiszállási díj.
            Mindkettő összeadódik a projekt kalkulációban.
            Ha van pontos munkatípus egyezés, az általános díjtételek nem lépnek életbe.
            Profilnévvel csoportosítsd a díjtételeket (pl. évenként, munkafázis szerint).
            Ha ehhez a fővállalkozóhoz lent fel van töltve tételes díjtábla, a projekt létrehozásnál elsődlegesen
            az adja a számolást – ezek a szabályok csak azoknál a projekteknél kellenek, ahol nincs tétel-kosár.
          </div>

          <DijtablaKatalogusSzekcio fv={fv} katalogus={katalogus} onRefresh={refresh} />

          <TigSablonUploader fovallalkozo={fv} onUpdate={onUpdate} />
        </div>
      )}

      {(ujSz || szerkSz) && (
        <SzabalyForm
          szabaly={szerkSz}
          tulajdonosId={fv.id}
          onSave={handleSzSave}
          onClose={() => { setUjSz(false); setSzerkSz(null); }}
        />
      )}
    </div>
  );
}

// ─── Fő oldal ─────────────────────────────────────────────────

export default function FovallalkozoPage({ userRole }) {
  const [fvk,    setFvk]    = useState(() => loadFovallalkozok());
  const [ujOpen, setUjOpen] = useState(false);
  const [ujForm, setUjForm] = useState({ nev: "", rovidites: "", megjegyzes: "" });

  // Egyszeri, idempotens seed: a feltöltött Green Home / Wagner-Solar
  // díjtáblák automatikusan bekerülnek fővállalkozóként, a Fővállalkozók
  // oldal első megnyitásakor. Ld. dijtetelKatalogus.service.js.
  useEffect(() => {
    const ghUj      = seedGreenHomeDijtabla();
    const wagnerUj  = seedWagnerSolarDijtabla();
    if (ghUj || wagnerUj) setFvk(loadFovallalkozok());
  }, []);

  useEffect(() => {
    const fn = e => {
      if (["fovallalkozok", "elszamolasi_szabalyok"].includes(e.detail?.collection)) {
        setFvk(loadFovallalkozok());
      }
    };
    window.addEventListener("crm-db-updated", fn);
    return () => window.removeEventListener("crm-db-updated", fn);
  }, []);

  function handleCreate() {
    if (!ujForm.nev.trim()) return;
    createFovallalkozo(ujForm);
    setFvk(loadFovallalkozok());
    setUjOpen(false);
    setUjForm({ nev: "", rovidites: "", megjegyzes: "" });
  }

  const isAdmin = ["Admin", "Projektmenedzser"].includes(userRole);

  return (
    <div style={{ padding: "24px 28px", fontFamily: FONT, maxWidth: 920 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: FONT_HEADING, fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>
            Fővállalkozók & Díjtételek
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            Szabályalapú elszámolási motor – profilonként csoportosított díjtételek
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setUjOpen(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 18px", background: C.accent, color: "#fff", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, fontFamily: FONT }}>
            <Plus size={15} /> Új fővállalkozó
          </button>
        )}
      </div>

      {/* Mód leírás */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {ELSZAMOLASI_MODOK.map(m => (
          <span key={m.id} style={{ fontSize: 11, background: C.bg, color: C.textSub, padding: "4px 10px", borderRadius: 20, fontWeight: 600 }}>
            {m.label}
          </span>
        ))}
      </div>

      {fvk.length === 0 && !ujOpen && (
        <div style={{ textAlign: "center", padding: "60px 0", color: C.muted }}>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Még nincs fővállalkozó</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Az „Új fővállalkozó" gombbal hozd létre az elsőt</p>
        </div>
      )}

      {fvk.map(fv => (
        <FvSor key={fv.id} fv={fv}
          onUpdate={(id, u) => { updateFovallalkozo(id, u); setFvk(loadFovallalkozok()); }}
          onDelete={id => { if (window.confirm("Törlöd ezt a fővállalkozót?")) { deleteFovallalkozo(id); setFvk(loadFovallalkozok()); } }}
        />
      ))}

      {/* Új FV form */}
      {ujOpen && (
        <div style={{ background: C.accentLight, border: "2px solid #93C5FD", borderRadius: 12, padding: "18px", marginTop: 12 }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Új fővállalkozó adatai</p>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 0.7fr 2fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3 }}>Név *</label>
              <input value={ujForm.nev} onChange={e => setUjForm(p => ({ ...p, nev: e.target.value }))} placeholder="pl. Green-Home Kft." style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3 }}>Rövidítés</label>
              <input value={ujForm.rovidites} onChange={e => setUjForm(p => ({ ...p, rovidites: e.target.value.toUpperCase().slice(0, 4) }))} maxLength={4} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 10, fontWeight: 700, color: C.muted, display: "block", marginBottom: 3 }}>Megjegyzés</label>
              <input value={ujForm.megjegyzes} onChange={e => setUjForm(p => ({ ...p, megjegyzes: e.target.value }))} style={inp} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => setUjOpen(false)}
              style={{ padding: "8px 16px", border: `1.5px solid ${C.border}`, borderRadius: 8, background: "#fff", cursor: "pointer", fontFamily: FONT }}>
              Mégse
            </button>
            <button type="button" onClick={handleCreate} disabled={!ujForm.nev.trim()}
              style={{ padding: "8px 18px", background: ujForm.nev.trim() ? C.accent : C.border, color: "#fff", border: "none", borderRadius: 8, cursor: ujForm.nev.trim() ? "pointer" : "default", fontWeight: 700, fontFamily: FONT }}>
              Létrehozás
            </button>
          </div>
        </div>
      )}
    </div>
  );
}