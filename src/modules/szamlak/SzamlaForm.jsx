import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { FONT } from "../../lib/constants";
import { loadLocal } from "../../lib/localDb";
import { getAktivFovallalkozok } from "../fovallalkozok/fovallalkozo.service";
import {
  SZAMLA_STATUSZOK_KIMENO, SZAMLA_STATUSZOK_BEJOVO, AFA_KULCSOK,
} from "./szamla.schema";
import { createSzamla, updateSzamla } from "./szamla.service";

const inp = {
  width: "100%", boxSizing: "border-box", padding: "9px 12px",
  border: "1.5px solid #E2E8F0", borderRadius: 9,
  fontSize: 13, fontFamily: "inherit", outline: "none", background: "#FAFAFA",
};
const Field = ({ label, children, half }) => (
  <div style={{ gridColumn: half ? "span 1" : "span 2" }}>
    <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block",
      marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.7 }}>
      {label}
    </label>
    {children}
  </div>
);

export default function SzamlaForm({ szamla, onClose, onSaved, currentUser }) {
  const isNew      = !szamla?.id;
  const ugyfelek   = loadLocal("ugyfelek") || [];
  const projektek  = loadLocal("projektek") || [];
  const fovallalkozok = getAktivFovallalkozok();

  const [form, setForm] = useState({
    tipus:            szamla?.tipus            || "kimeno",
    szamlaszam:       szamla?.szamlaszam       || "",
    kiallitasDatuma:  szamla?.kiallitasDatuma  || new Date().toISOString().slice(0, 10),
    teljesitesDatuma: szamla?.teljesitesDatuma || "",
    fizetesiHatarido: szamla?.fizetesiHatarido || "",
    ugyfelId:         szamla?.ugyfelId         || "",
    ugyfelNev:        szamla?.ugyfelNev        || "",
    ugyfelCim:        szamla?.ugyfelCim        || "",
    ugyfelAdoszam:    szamla?.ugyfelAdoszam    || "",
    szallitoId:       szamla?.szallitoId       || "",
    szallitoNev:      szamla?.szallitoNev      || "",
    szallitoAdoszam:  szamla?.szallitoAdoszam  || "",
    projektId:        szamla?.projektId        || "",
    projektKod:       szamla?.projektKod       || "",
    projektNev:       szamla?.projektNev       || "",
    nettoOsszeg:      szamla?.nettoOsszeg      || 0,
    afaKulcs:         szamla?.afaKulcs         ?? 27,
    afaOsszeg:        szamla?.afaOsszeg        || 0,
    bruttoOsszeg:     szamla?.bruttoOsszeg     || 0,
    fizetettOsszeg:   szamla?.fizetettOsszeg   || 0,
    fizetettDatum:    szamla?.fizetettDatum     || "",
    status:           szamla?.status            || "Kiállítva",
    megjegyzes:       szamla?.megjegyzes        || "",
  });
  const [hiba, setHiba] = useState("");
  const [saving, setSaving] = useState(false);

  const statusLista = form.tipus === "bejovo" ? SZAMLA_STATUSZOK_BEJOVO : SZAMLA_STATUSZOK_KIMENO;

  // ÁFA és bruttó auto-számítás
  useEffect(() => {
    const netto = Number(form.nettoOsszeg) || 0;
    const afa   = Math.round(netto * form.afaKulcs / 100);
    setForm(p => ({ ...p, afaOsszeg: afa, bruttoOsszeg: netto + afa }));
  }, [form.nettoOsszeg, form.afaKulcs]);

  function upd(k, v) {
    setForm(p => ({ ...p, [k]: v }));
    if (hiba) setHiba("");
  }

  function handleUgyfel(id) {
    const u = ugyfelek.find(x => x.id === id);
    setForm(p => ({
      ...p, ugyfelId: id,
      ugyfelNev:    u?.name    || "",
      ugyfelCim:    u?.address || "",
      ugyfelAdoszam:u?.adoszam || "",
    }));
  }

  function handleProjekt(id) {
    const p2 = projektek.find(x => x.id === id);
    setForm(p => ({
      ...p, projektId: id,
      projektKod: p2?.projektkod || "",
      projektNev: p2?.nev        || "",
      // Auto-töltés ügyfél adatokból ha még nincs megadva
      ugyfelId:  p.ugyfelId  || p2?.clientId  || "",
      ugyfelNev: p.ugyfelNev || p2?.clientNev || "",
      ugyfelCim: p.ugyfelCim || p2?.clientCim || "",
    }));
  }

  function handleFovallalkozo(id) {
    const fv = fovallalkozok.find(x => x.id === id);
    setForm(p => ({
      ...p, szallitoId: id,
      szallitoNev:    fv?.nev    || "",
      szallitoAdoszam:fv?.adoszam|| "",
    }));
  }

  async function handleSave() {
    if (!form.szamlaszam.trim()) { setHiba("A számlaszám kötelező!"); return; }
    if (!form.kiallitasDatuma)   { setHiba("A kiállítás dátuma kötelező!"); return; }
    if (form.bruttoOsszeg <= 0)  { setHiba("Az összeg nem lehet 0!"); return; }

    setSaving(true);
    try {
      let saved;
      if (isNew) {
        saved = createSzamla(form, currentUser?.name || "");
      } else {
        saved = updateSzamla(szamla.id, form);
      }
      onSaved?.(saved);
      onClose?.();
    } catch (e) {
      setHiba("Mentés sikertelen: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  const isBejovo = form.tipus === "bejovo";

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose?.()}
      style={{
        position: "fixed", inset: 0, zIndex: 2000,
        background: "rgba(0,0,0,.55)", display: "flex",
        alignItems: "flex-start", justifyContent: "center",
        padding: "20px 16px", overflowY: "auto",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 640,
        boxShadow: "0 20px 60px rgba(0,0,0,.25)", fontFamily: FONT,
      }}>
        {/* Fejléc */}
        <div style={{
          padding: "18px 24px 14px", borderBottom: "1px solid #E2E8F0",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0F172A", margin: 0 }}>
            {isNew ? "Új számla" : "Számla szerkesztése"}
          </h2>
          <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#94A3B8" }}>
            <X size={22} />
          </button>
        </div>

        <div style={{ padding: "20px 24px 24px" }}>
          {hiba && (
            <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 10,
              padding: "10px 14px", marginBottom: 16, fontSize: 13, color: "#DC2626" }}>
              ⚠️ {hiba}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            {/* Típus */}
            <Field label="Típus">
              <div style={{ display: "flex", gap: 8 }}>
                {["kimeno", "bejovo"].map(t => (
                  <button key={t} onClick={() => {
                    upd("tipus", t);
                    upd("status", t === "bejovo" ? "Befogadva" : "Kiállítva");
                  }} style={{
                    flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer",
                    border: `2px solid ${form.tipus === t ? "#2563EB" : "#E2E8F0"}`,
                    background: form.tipus === t ? "#EFF6FF" : "#fff",
                    color: form.tipus === t ? "#2563EB" : "#64748B",
                    fontWeight: form.tipus === t ? 700 : 400, fontSize: 13, fontFamily: FONT,
                  }}>
                    {t === "kimeno" ? "📤 Kimenő" : "📥 Bejövő"}
                  </button>
                ))}
              </div>
            </Field>

            {/* Státusz */}
            <Field label="Státusz" half>
              <select value={form.status} onChange={e => upd("status", e.target.value)} style={inp}>
                {statusLista.map(s => <option key={s.id}>{s.id}</option>)}
              </select>
            </Field>

            {/* Számlaszám */}
            <Field label="Számlaszám *" half>
              <input value={form.szamlaszam} onChange={e => upd("szamlaszam", e.target.value)}
                placeholder="pl. 2024-001" style={inp} />
            </Field>

            {/* Projekt */}
            <Field label="Projekt kapcsolat">
              <select value={form.projektId} onChange={e => handleProjekt(e.target.value)} style={inp}>
                <option value="">— Projekt nélkül —</option>
                {projektek.map(p => (
                  <option key={p.id} value={p.id}>{p.projektkod} – {p.nev}</option>
                ))}
              </select>
            </Field>

            {/* Ügyfél / Szállító */}
            {!isBejovo ? (
              <Field label="Ügyfél">
                <select value={form.ugyfelId} onChange={e => handleUgyfel(e.target.value)} style={inp}>
                  <option value="">— Ügyfél kiválasztása —</option>
                  {ugyfelek.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                {form.ugyfelNev && !form.ugyfelId && (
                  <input value={form.ugyfelNev} onChange={e => upd("ugyfelNev", e.target.value)}
                    placeholder="Ügyfél neve" style={{ ...inp, marginTop: 6 }} />
                )}
              </Field>
            ) : (
              <Field label="Szállító (fővállalkozó)">
                <select value={form.szallitoId} onChange={e => handleFovallalkozo(e.target.value)} style={inp}>
                  <option value="">— Szállító kiválasztása —</option>
                  {fovallalkozok.map(f => (
                    <option key={f.id} value={f.id}>{f.nev}</option>
                  ))}
                </select>
              </Field>
            )}

            {/* Ügyfél adószám (ha manuális) */}
            {!isBejovo && (
              <Field label="Ügyfél adószám" half>
                <input value={form.ugyfelAdoszam} onChange={e => upd("ugyfelAdoszam", e.target.value)}
                  placeholder="12345678-1-01" style={inp} />
              </Field>
            )}

            {/* Dátumok */}
            <Field label="Kiállítás dátuma *" half>
              <input type="date" value={form.kiallitasDatuma}
                onChange={e => upd("kiallitasDatuma", e.target.value)} style={inp} />
            </Field>
            <Field label="Teljesítés dátuma" half>
              <input type="date" value={form.teljesitesDatuma}
                onChange={e => upd("teljesitesDatuma", e.target.value)} style={inp} />
            </Field>
            <Field label="Fizetési határidő" half>
              <input type="date" value={form.fizetesiHatarido}
                onChange={e => upd("fizetesiHatarido", e.target.value)} style={inp} />
            </Field>

            {/* Összegek */}
            <Field label="Nettó összeg (Ft) *" half>
              <input type="number" value={form.nettoOsszeg || ""}
                onChange={e => upd("nettoOsszeg", Number(e.target.value))}
                placeholder="0" min="0" style={inp} />
            </Field>
            <Field label="ÁFA kulcs" half>
              <select value={form.afaKulcs} onChange={e => upd("afaKulcs", Number(e.target.value))} style={inp}>
                {AFA_KULCSOK.map(k => <option key={k} value={k}>{k}%</option>)}
              </select>
            </Field>

            {/* Bruttó (readonly, auto) */}
            <Field label="Bruttó összeg (auto)">
              <div style={{
                padding: "9px 12px", borderRadius: 9, background: "#F1F5F9",
                fontSize: 15, fontWeight: 700, color: "#0F172A",
                border: "1.5px solid #E2E8F0",
              }}>
                {new Intl.NumberFormat("hu-HU", { style: "currency", currency: "HUF", maximumFractionDigits: 0 }).format(form.bruttoOsszeg || 0)}
              </div>
            </Field>

            {/* Fizetett összeg */}
            {form.status === "Fizetve" && (
              <>
                <Field label="Befizetve (Ft)" half>
                  <input type="number" value={form.fizetettOsszeg || ""}
                    onChange={e => upd("fizetettOsszeg", Number(e.target.value))}
                    placeholder={form.bruttoOsszeg} min="0" style={inp} />
                </Field>
                <Field label="Fizetés dátuma" half>
                  <input type="date" value={form.fizetettDatum}
                    onChange={e => upd("fizetettDatum", e.target.value)} style={inp} />
                </Field>
              </>
            )}

            {/* Megjegyzés */}
            <Field label="Megjegyzés">
              <textarea value={form.megjegyzes} onChange={e => upd("megjegyzes", e.target.value)}
                rows={3} placeholder="Opcionális megjegyzés…"
                style={{ ...inp, resize: "vertical" }} />
            </Field>
          </div>

          {/* Gombok */}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button onClick={onClose} style={{
              padding: "10px 20px", borderRadius: 10, border: "1.5px solid #E2E8F0",
              background: "#fff", color: "#475569", cursor: "pointer",
              fontWeight: 600, fontSize: 14, fontFamily: FONT,
            }}>
              Mégsem
            </button>
            <button onClick={handleSave} disabled={saving} style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "10px 22px", borderRadius: 10, border: "none",
              background: saving ? "#94A3B8" : "#2563EB", color: "#fff",
              cursor: saving ? "wait" : "pointer",
              fontWeight: 700, fontSize: 14, fontFamily: FONT,
            }}>
              <Save size={15} /> {saving ? "Mentés…" : isNew ? "Létrehozás" : "Mentés"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
