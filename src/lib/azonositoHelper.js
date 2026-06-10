// ─── Emberi olvasható azonosítók ──────────────────────────────
// Sehol ne jelenjen meg technikai ID (ml_xxx / prj_xxx) a felületen.
// Mindig ezt a két helper-t használd, ne m.id / p.id-t.

export function formatProjektAzonosito(projekt) {
  if (!projekt) return "—";
  return projekt.projektkod || "Projektkód hiányzik";
}

export function formatMunkalapAzonosito(munkalap) {
  if (!munkalap) return "—";
  return (
    munkalap.munkalapSzam ||
    munkalap.dokumentumszam ||
    munkalap.ediSorszam ||
    "Munkalapszám hiányzik"
  );
}