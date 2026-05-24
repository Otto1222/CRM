// ─── SZÁMÍTÁSOK ───────────────────────────────────────────────
export const ft = n =>
  new Intl.NumberFormat("hu-HU").format(Math.round(n)) + " Ft";

export function totals(items = []) {
  let netto = 0, afa = 0;
  items.forEach(i => {
    const n = (i.qty || 0) * (i.net || 0);
    netto += n;
    afa   += n * ((i.vat || 0) / 100);
  });
  return { netto, afa, brutto: netto + afa };
}

export function generateId(prefix, list) {
  const nums = list.map(i => parseInt(i.id.replace(prefix, ""), 10)).filter(Boolean);
  const next  = nums.length ? Math.max(...nums) + 1 : 1;
  return prefix + String(next).padStart(4, "0");
}

export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("hu-HU", { year:"numeric", month:"long", day:"numeric" });
}
