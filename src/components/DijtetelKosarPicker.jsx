/**
 * DijtetelKosarPicker.jsx
 * "Tételes számolás" – a projekt létrehozásnál a kiválasztott fővállalkozó
 * díjtétel-katalógusából (ld. dijtetelKatalogus.*) tetszőleges tételeket és
 * mennyiségeket lehet a projekthez adni, ahelyett hogy egyetlen Munkatípus
 * legördülőt kellene kiválasztani.
 *
 * A kosár (value / onChange) a projekt penzugy.dijtablaTetelek mezőjébe
 * kerül, pillanatkép-elven (egységár rögzítve a hozzáadás pillanatában).
 *
 * A km-díjas tételek (kmDij=true) NEM egyenként kapnak km-sort – ha a
 * kosárban legalább egy ilyen tétel van, ÖSSZESEN egyszer kerül felszámolásra
 * a kiválasztott km-díj katalógustétel alapján (ld. kmMeta), a projekt
 * távolság-mezőjéből (oda-vissza).
 */
import { useMemo, useState } from "react";
import { Plus, Minus, Trash2, Search, Navigation } from "lucide-react";
import { C, FONT } from "../lib/constants";
import { getAktivKatalogusTetelek, groupKatalogusByKategoria } from "../modules/fovallalkozok/dijtetelKatalogus.service.js";
import { calcSavosOsszeg } from "../modules/fovallalkozok/elszamolasiMotor.js";

const ft = n => Number(n || 0).toLocaleString("hu-HU") + " Ft";

export default function DijtetelKosarPicker({ tulajdonosId, value, onChange, tavKm, kmMeta, onKmMetaChange }) {
  const [kereses, setKereses] = useState("");
  const katalogus = useMemo(() => tulajdonosId ? getAktivKatalogusTetelek(tulajdonosId) : [], [tulajdonosId]);
  const kosar = value || [];

  const kmTetelek = useMemo(() => katalogus.filter(t => t.egyseg === "km"), [katalogus]);
  const kellKmDij = kosar.some(t => t.kmDij);

  const szurt = useMemo(() => {
    const q = kereses.trim().toLowerCase();
    const alap = katalogus.filter(t => t.egyseg !== "km"); // a km-díj tételek nem "hozzáadható" sorok, hanem a kmMeta-t vezérlik
    if (!q) return alap;
    return alap.filter(t =>
      t.megnevezes?.toLowerCase().includes(q) ||
      t.kod?.toLowerCase().includes(q) ||
      t.kategoria?.toLowerCase().includes(q)
    );
  }, [katalogus, kereses]);

  const csoportok = useMemo(() => groupKatalogusByKategoria(szurt), [szurt]);

  function addTetel(kt) {
    const isSavos = kt.tipus === "savos";
    const meglevo = kosar.find(k => k.katalogusTetelId === kt.id);
    if (meglevo) {
      const m = meglevo.mennyiseg + 1;
      onChange(kosar.map(k => k.katalogusTetelId === kt.id
        ? { ...k, mennyiseg: m, osszesen: isSavos ? calcSavosOsszeg(k.savok, m) : Math.round(m * k.egysegar) }
        : k));
      return;
    }
    onChange([...kosar, {
      katalogusTetelId: kt.id,
      kod: kt.kod || "",
      kategoria: kt.kategoria || "",
      nev: kt.megnevezes,
      egyseg: kt.egyseg,
      egysegar: Number(kt.ar) || 0,
      tipus: isSavos ? "savos" : "flat",
      savok: isSavos ? (kt.savok || []) : [],
      mennyiseg: 1,
      osszesen: isSavos ? calcSavosOsszeg(kt.savok, 1) : (Number(kt.ar) || 0),
      kmDij: !!kt.kmDij,
    }]);
    // Ha ez az első km-díjas tétel a kosárban, alapértelmezetten beállítjuk az első elérhető km-díj tételt.
    if (kt.kmDij && !kmMeta?.kmTetelId && kmTetelek.length > 0) {
      const elso = kmTetelek[0];
      onKmMetaChange?.({ kmTetelId: elso.id, kod: elso.kod, nev: elso.megnevezes, ftKm: Number(elso.ar) || 0, kuszobKm: Number(elso.kmKuszobKm) || 0 });
    }
  }

  function updMennyiseg(katalogusTetelId, mennyiseg) {
    const m = Math.max(0, Number(mennyiseg) || 0);
    onChange(kosar.map(k => k.katalogusTetelId === katalogusTetelId
      ? { ...k, mennyiseg: m, osszesen: k.tipus === "savos" ? calcSavosOsszeg(k.savok, m) : Math.round(m * k.egysegar) }
      : k));
  }

  function removeTetel(katalogusTetelId) {
    onChange(kosar.filter(k => k.katalogusTetelId !== katalogusTetelId));
  }

  const tetelekOsszesen = kosar.reduce((s, k) => s + (Number(k.osszesen) || 0), 0);
  const kuszobKm  = Number(kmMeta?.kuszobKm) || 0;
  const effKm     = Math.max(0, (Number(tavKm) || 0) - kuszobKm);
  const odaVissza = effKm * 2;
  const kmOsszeg = kellKmDij ? Math.round(odaVissza * (Number(kmMeta?.ftKm) || 0)) : 0;
  const vegosszeg = tetelekOsszesen + kmOsszeg;

  if (!tulajdonosId) {
    return (
      <p style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>
        Előbb válassz fővállalkozót a tételek megjelenítéséhez.
      </p>
    );
  }

  if (katalogus.length === 0) {
    return (
      <div style={{ background: C.bg, border: `1px dashed ${C.border}`, borderRadius: 10, padding: "12px 14px" }}>
        <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
          Ehhez a fővállalkozóhoz még nincs feltöltve díjtétel-katalógus. Töltsd fel a <b>Fővállalkozók</b> oldalon
          (Díjtábla import), vagy add meg kézzel az alábbi Munkatípus / Elszámolási szabály mezőket.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Kereső */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <Search size={14} color={C.muted} style={{ position: "absolute", left: 10, top: 10 }} />
        <input
          value={kereses}
          onChange={e => setKereses(e.target.value)}
          placeholder="Keresés tétel neve, kódja vagy kategória szerint…"
          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px 8px 32px", border: `1.5px solid ${C.border}`, borderRadius: 9, fontSize: 13, fontFamily: FONT, outline: "none" }}
        />
      </div>

      {/* Katalógus – kategóriánként */}
      <div style={{ maxHeight: 260, overflowY: "auto", border: `1px solid ${C.border}`, borderRadius: 9, marginBottom: 12 }}>
        {csoportok.length === 0 && (
          <p style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: 14, margin: 0 }}>Nincs találat.</p>
        )}
        {csoportok.map(g => (
          <div key={g.kategoria}>
            <div style={{ background: C.bg, padding: "5px 10px", fontSize: 11, fontWeight: 700, color: C.textSub, position: "sticky", top: 0 }}>
              {g.kategoria}
            </div>
            {g.tetelek.map(kt => {
              const kosarban = kosar.find(k => k.katalogusTetelId === kt.id);
              return (
                <div key={kt.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderTop: `1px solid ${C.bg}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: C.text, fontWeight: 500 }}>
                      {kt.kod ? <span style={{ color: C.muted, fontWeight: 700 }}>{kt.kod}</span> : null} {kt.megnevezes}
                      {kt.kmDij && <span title="Km-díj számolható" style={{ marginLeft: 6, fontSize: 10, color: C.accent }}>＋km</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, minWidth: 90, textAlign: "right" }}>
                    {kt.tipus === "savos"
                      ? <span style={{ color: C.accent, fontWeight: 600 }}>sávos ár</span>
                      : `${ft(kt.ar)} / ${kt.egyseg}`}
                  </div>
                  <button type="button" onClick={() => addTetel(kt)}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 9px", background: kosarban ? C.successLight : C.accentLight, color: kosarban ? C.success : C.accent, border: "none", borderRadius: 7, cursor: "pointer", fontSize: 11, fontWeight: 700, fontFamily: FONT, flexShrink: 0 }}>
                    <Plus size={11} /> {kosarban ? `${kosarban.mennyiseg} db` : "Hozzáad"}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Kosár */}
      {kosar.length > 0 && (
        <div style={{ background: "#fff", border: `1.5px solid ${C.accent}`, borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 0.5, margin: "0 0 8px" }}>
            Kiválasztott tételek ({kosar.length})
          </p>
          {kosar.map(k => {
            const aktSav = k.tipus === "savos" ? (k.savok || []).find(s => {
              const tol = Number(s.tol) || 0;
              const ig  = (s.ig !== "" && s.ig !== null && s.ig !== undefined) ? Number(s.ig) : Infinity;
              return (Number(k.mennyiseg) || 0) >= tol && (Number(k.mennyiseg) || 0) <= ig;
            }) : null;
            return (
            <div key={k.katalogusTetelId} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ flex: 1, fontSize: 12.5, color: C.text }}>
                {k.kod ? `${k.kod} · ` : ""}{k.nev}
                {k.tipus === "savos" && (
                  <span style={{ marginLeft: 6, fontSize: 10.5, color: aktSav ? C.accent : C.warning }}>
                    {aktSav ? `(sáv: ${aktSav.tol}–${aktSav.ig || "∞"} db)` : "(nincs egyező sáv)"}
                  </span>
                )}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button type="button" onClick={() => updMennyiseg(k.katalogusTetelId, k.mennyiseg - 1)}
                  style={{ width: 22, height: 22, border: `1px solid ${C.border}`, background: "#fff", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Minus size={11} />
                </button>
                <input type="number" min={0} value={k.mennyiseg}
                  onChange={e => updMennyiseg(k.katalogusTetelId, e.target.value)}
                  style={{ width: 48, textAlign: "center", padding: "3px 4px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, fontFamily: FONT }} />
                <button type="button" onClick={() => updMennyiseg(k.katalogusTetelId, k.mennyiseg + 1)}
                  style={{ width: 22, height: 22, border: `1px solid ${C.border}`, background: "#fff", borderRadius: 6, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={11} />
                </button>
                <span style={{ fontSize: 10, color: C.muted, width: 30 }}>{k.egyseg}</span>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text, minWidth: 90, textAlign: "right" }}>{ft(k.osszesen)}</span>
              <button type="button" onClick={() => removeTetel(k.katalogusTetelId)}
                style={{ border: "none", background: C.dangerLight, color: C.danger, borderRadius: 6, padding: "3px 6px", cursor: "pointer" }}>
                <Trash2 size={11} />
              </button>
            </div>
            );
          })}

          {/* Km-díj sor – vagy a fővállalkozó katalógusából (L01/L02-szerű
              tétel), vagy ha ahhoz nincs km-egységű tétel feltöltve, egyedi
              Ft/km díjazással (kézzel megadva, egyszeri projektre). */}
          {kellKmDij && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.border}` }}>
              <Navigation size={13} color={C.accent} />
              <span style={{ flex: 1, fontSize: 12, color: C.textSub }}>
                Kiszállási díj ({kuszobKm > 0 ? `${kuszobKm} km felett, ` : ""}oda-vissza {odaVissza || 0} km × {ft(kmMeta?.ftKm)}/km)
              </span>
              {kmTetelek.length > 1 && (
                <select value={kmMeta?.kmTetelId || ""} onChange={e => {
                  const kt = kmTetelek.find(x => x.id === e.target.value);
                  if (kt) onKmMetaChange?.({ kmTetelId: kt.id, kod: kt.kod, nev: kt.megnevezes, ftKm: Number(kt.ar) || 0, kuszobKm: Number(kt.kmKuszobKm) || 0 });
                }} style={{ fontSize: 11, padding: "3px 6px", border: `1px solid ${C.border}`, borderRadius: 6, fontFamily: FONT }}>
                  {kmTetelek.map(kt => <option key={kt.id} value={kt.id}>{kt.megnevezes}</option>)}
                </select>
              )}
              {kmTetelek.length === 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: C.warning }}>
                  Egyedi Ft/km:
                  <input type="number" min={0} value={kmMeta?.ftKm || ""}
                    onChange={e => onKmMetaChange?.({ kmTetelId: "", kod: "", nev: "Egyedi km-díj", ftKm: Number(e.target.value) || 0, kuszobKm: kmMeta?.kuszobKm || 0 })}
                    placeholder="pl. 210"
                    style={{ width: 64, padding: "3px 6px", border: `1px solid ${C.warning}`, borderRadius: 6, fontSize: 11, fontFamily: FONT }} />
                </label>
              )}
              <span style={{ fontSize: 12.5, fontWeight: 700, color: C.text, minWidth: 90, textAlign: "right" }}>
                {!tavKm ? <span style={{ color: C.warning, fontWeight: 600 }}>nincs km megadva</span>
                  : !kmMeta?.ftKm ? <span style={{ color: C.warning, fontWeight: 600 }}>nincs km-díj megadva</span>
                  : ft(kmOsszeg)}
              </span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: `1.5px solid ${C.border}` }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>Végösszeg</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.accent }}>{ft(vegosszeg)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
