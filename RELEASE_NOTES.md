# CRM Napelem – Release Notes

## v1.0.0 – Első éles kiadás (2026-07-09)

Ez az első kiadás, amit valós projektekre szánunk. A cél nem a tökéletes,
minden funkciót tartalmazó rendszer volt, hanem egy **stabil, megbízható**
alap, amire biztonságosan lehet napi munkát építeni.

---

## Új funkciók / a rendszer jelenlegi képességei

A CRM egy React + Vite alapú, kizárólag böngészőben futó (nincs klasszikus
backend szerver) SPA, ami localStorage-ot használ elsődleges adattárolóként,
Google Drive-val (Apps Script webhookon keresztül) szinkronizálva.

### Felhasználókezelés és jogosultság
- Bejelentkezés felhasználónév + jelszó alapján (SHA-256 hash), 4 szerepkör:
  Admin, Projektmenedzser, Iroda/Könyvelés, Telepítő.
- Admin felhasználókezelő felület (Beállítások → Rendszer → Felhasználók &
  Szerelő csapatok): új felhasználó létrehozása, jelszó módosítás, törlés.
- Szerepkör-alapú menü-szűrés (Telepítő csak a saját munkalapjait látja).

### Ügyfelek
- Teljes CRUD: új ügyfél, szerkesztés, törlés, keresés, státuszkezelés.

### Projektek
- Teljes CRUD, 8 munkafolyamat-státusz, 3 forrás-típus (saját ajánlat,
  fővállalkozói munka, belső munka), automatikus projektkód-generálás.
- Projekt-fülek: Áttekintés, Munkalapok, Pénzügy, Kivitelezési Csomag,
  Dokumentumok, Kártérítések, Napló.
- Cascade törlés: projekt törlésekor a kapcsolódó munkalapok, pénzügyi
  rekord és kivitelezési csomag konzisztensen kezelve (lásd lent, P0 fix).

### Munkalapok
- Teljes CRUD, felmérés, VBF jegyzőkönyv, LMRA kockázatbecslés + aláírás,
  fotó dokumentáció, projektből előtöltött inline létrehozás.
- Csapat-kiosztás és újrakiosztás felület.

### Csapatok és Fővállalkozók
- Csapatok (saját szerelőcsapatok) és Fővállalkozók teljes CRUD-ja.
- Munkatípus-specifikus elszámolási szabályok (fix / darabszám / sávos /
  km-alapú / fix kiszállási díj).

### Elszámolási motor és Pénzügy
- Univerzális, szabály-alapú elszámolási motor fővállalkozói bevételhez és
  alvállalkozói (csapat) bérszámításhoz.
- Projekt-szintű pénzügyi részletezés, kártérítés-kezelés.

### Számlák
- Kimenő/bejövő számlák listája, PDF sablon, PEASE API integrációs stub
  (env-változó nélkül nem aktív – lásd Ismert korlátozások).

### Telepítő PWA
- Telepíthető webalkalmazás (manifest + service worker), offline üzemmód
  (localStorage-alapú adatok mindig elérhetők offline is), telepítési banner.

### Google Drive szinkronizáció
- Automatikus szinkron bejelentkezéskor (Drive → helyi), minden mentésnél
  automatikus Drive-mentés, kézi "Drive teljes mentés" gomb.
- Automatikus per-projekt Drive mappastruktúra (4 almappa) és fotó-feltöltés.

### Biztonsági mentés
- Automatikus helyi snapshot minden kritikus művelet (projekt létrehozás/
  törlés, munkalap mentés) előtt, max 10 db, egy kattintásos visszaállítás.
- A snapshot **minden** kollekciót lefed (lásd lent, korábbi hiányosság
  javítva).

---

## Fontos hibajavítások ebben a kiadásban

Ez a kiadás két nagy stabilizációs munka eredménye:

### 1. Adatvesztés-stabilizáció (korábbi `data-loss-stabilization` munka)
- localStorage sérülés- és quota-védelem minden fő mentési útvonalon.
- Ütközés-tűrő ID-generálás (`crypto.randomUUID()`), sorszámozók.
- Cascade törlés: projekt/munkalap törlésekor a kapcsolódó rekordok nem
  maradnak árván.
- Backup teljes lefedettsége minden localStorage-kollekcióra.
- Valódi Drive-szinkron állapot-visszajelzés (nincs hamis "sikeres" jelzés).
- Oldal-szintű hibahatár (Error Boundary): egy JS-hiba egy oldalon nem
  viszi le az egész alkalmazást.

### 2. Biztonsági alapok (P0-001/002)
- Hardcoded demo-felhasználók és plaintext jelszó-tárolás eltávolítva.
- A rendszer "fail-closed": konfigurált felhasználó nélkül senki nem tud
  automatikusan bejelentkezni.

### 3. Merge-integráció (PR #3) – 2 hiba javítva
- **"Belső munka" új projekt zsákutca**: az anyagelszámolási mód automatikus
  beállítása mostantól általánosan lefut, akkor is, ha a projekt-forrás
  előre be van állítva (nem csak kézi kattintáskor).
- **Újrakiosztás modal mezőkeveredés**: a csapatváltás mostantól a helyes
  mezőket frissíti, a módosítás valóban látszik a projekt más nézetein is.

### 4. Release Candidate stabilitási audit (PR #9) – 6 P0 hiba javítva
- **Munkatípus ID/név keveredés**: a fővállalkozói/alvállalkozói
  munkatípus-specifikus elszámolási szabályok korábban *soha* nem léptek
  érvénybe egy belső azonosító-eltérés miatt – a pénzügyi motor csendben
  mindig az általános/0 Ft-os szabályra esett vissza. **Ez minden korábban
  létrehozott munkatípus-specifikus szabályt érint – lásd Ismert
  korlátozások.**
- Silent adatvesztés megszüntetve mentési hibánál (quota/sérülés): projekt
  és munkalap létrehozás/módosítás/törlés mostantól ellenőrzi a mentés
  sikerességét, mielőtt bármilyen kapcsolódó (cascade) műveletet végezne.
- LMRA/aláírás mentés quota-védelem – jogilag releváns telepítői aláírás
  többé nem veszhet el csendben.
- `window.open()` null-check – PDF export/nyomtatás nem omlik össze
  popup-blokkolt böngészőben.
- Új munkalap modal hibahatár-lefedettsége javítva.

---

## Ismert korlátozások (P1 – javítandó, de a rendszer használható)

- **Fővállalkozó törlése** nem törli a hozzá tartozó elszámolási
  szabályokat (árván maradnak, de nem okoznak hibás számítást).
- **PEASE számla-import** validáció nélkül fut – csak akkor releváns, ha a
  PEASE integráció env-változói konfigurálva vannak (alapból nincsenek).
- **Ajánlat-szerkesztő** nem ellenőrzi, hogy legalább egy tétel szerepel-e
  mentés előtt (0 Ft-os ajánlat elméletileg menthető/nyomtatható).
- **Számla "Fizetve" státusz** kitöltött befizetett összeg nélkül is
  menthető.
- **Számlák oldal** nagy, elhanyagolt (sok lekésett tételt tartalmazó)
  adatállománynál lassulhat (nem várt, tényleges összeomlás nem valószínű
  kisvállalati méretnél).
- **Újrakiosztás modal** a csapatlistát egy régi, kézzel karbantartott
  listából tölti be, nem a valódi Csapatok kollekcióból – lásd
  [GitHub #8](https://github.com/Otto1222/CRM/issues/8).
- Service worker offline cache-fallback nem teljes körű minden asset-típusra.

## Ismert korlátozások (P2 – ráér)

- Kártérítés-tab egy mezőben (`projektkod`) kozmetikai megjelenítési hiba
  (a mögöttes projekt-kapcsolat magát helyesen mentődik).
- Max 10 helyi backup snapshot (Drive-on, ha konfigurálva van, nincs ilyen
  korlát).
- **Nincs szerver oldali hitelesítés / jogosultság-ellenőrzés** – a rendszer
  architekturálisan tisztán frontend (nincs backend). Kis, megbízható
  csapatnál (5-10 fő) ez nem blokkolja a napi munkát, de fontos tudni: aki
  hozzáfér a böngésző DevTools-hoz, elméletileg megkerülheti a UI-szintű
  jogosultság-korlátokat. Lásd `docs/AUDIT_000_CURRENT_STATE.md` és
  `docs/P0-004_AUTH_ARCHITECTURE_DESIGN.md` a jövőbeli megoldási tervhez.
- Az Apps Script (Google Drive backend) nincs saját hitelesítéssel védve –
  aki ismeri a webhook URL-t, közvetlenül írhatna/törölhetne Drive adatot.
  Kis, megbízható csapatnál alacsony kockázat, de tudatosan vállalt
  kompromisszum ebben a kiadásban.

## Teendő a következő verzióban Munkatípus-specifikus szabályokkal kapcsolatban

Ha az élesítés előtt **már léteztek** munkatípus-specifikus fővállalkozói/
alvállalkozói elszámolási szabályok (nem "Általános" beállítással), azokat
**újra ki kell választani** a Fővállalkozók / Csapatok felületen a
javítás után, mert a korábbi (soha nem működő) érték nem íródik át
automatikusan. Ha csak "Általános" (minden munkatípusra érvényes) szabályok
vannak beállítva, nincs teendő.

---

## Első kiadás megjegyzései

- Ez a verzió **stabilitásra**, nem új funkciókra fókuszált. A cél egy
  megbízható alap, amire lehet építeni – nem a lehető legtöbb funkció.
- Éles használat előtt kövesd végig a `PRODUCTION_CHECKLIST.md`-t.
- A rendszer jelenleg kis, megbízható csapatoknak (5-10 fő) való, ahol a
  frontend-only jogosultsági modell elfogadható kockázat.
- Kérdés vagy probléma esetén az érintett hiba pontos leírását, az
  érintett oldalt/funkciót és a reprodukálás lépéseit érdemes rögzíteni –
  ez felgyorsítja a következő javítási kört.
