/**
 * dijtablaMuszakiAdatokBecsles.js
 * P0-011: amikor a fővállalkozói projekt tétel-kosárral (díjtábla-alapú
 * tételekkel) rendelkezik, a "Műszaki adatok" (napelem/inverter/akku/smart
 * meter db, EV töltő) mezők NEM kérnek külön kézi bevitelt – a kosárból
 * származtatjuk, hogy a PM-nek ne kelljen ugyanazt a mennyiséget kétszer
 * (egyszer a kosárban, egyszer itt) beírnia.
 *
 * A becslés két, egymástól független jelből dolgozik, hogy bármelyik
 * fővállalkozó saját, tetszőleges díjtáblájával is működjön:
 *   - egység = "panel" → megbízható, szerkezeti jel a napelem darabszámhoz
 *     (ez a díjtábla-import egyik kötelező mezője, nem szabad szöveg)
 *   - a kategória + megnevezés szövegében szereplő magyar szakkifejezések
 *     (inverter, akkumulátor, smart meter/okosmérő, EV/autó töltő) – ez már
 *     csak becslés, ezért a UI-n mindig szerkeszthető marad felülírásként.
 */
export function becsulMuszakiAdatokKosarbol(tetelek = []) {
  let napelemDb = 0, inverterDb = 0, akkumulatorDb = 0, smartMeterDb = 0, autoTolto = false;
  for (const t of (tetelek || [])) {
    const mennyiseg = Number(t.mennyiseg) || 0;
    if (!mennyiseg) continue;
    if (t.egyseg === "panel") napelemDb += mennyiseg;
    const szoveg = `${t.kategoria || ""} ${t.nev || ""}`.toLowerCase();
    if (/invert/.test(szoveg))                          inverterDb    += mennyiseg;
    if (/akku/.test(szoveg))                             akkumulatorDb += mennyiseg;
    if (/smart\s*meter|okosmér/.test(szoveg))            smartMeterDb  += mennyiseg;
    if (/ev\s*t[öo]lt|autó\s*t[öo]lt|elektromos\s*aut[oó]/.test(szoveg)) autoTolto = true;
  }
  return { napelemDb, inverterDb, akkumulatorDb, smartMeterDb, autoTolto };
}
