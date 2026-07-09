# Release Candidate audit – v1.0.0 stabilitási felülvizsgálat

**Dátum:** 2026-07-09
**Cél:** nem új funkció, hanem az, hogy a CRM a napi munkában stabilan, megbízhatóan
használható legyen az első éles bevezetés előtt.

**Vizsgálati szempont – KIZÁRÓLAG 4 kategória:**
1. **Adatvesztést okozhat**
2. **Hibás adatot menthet**
3. **Megakadályozza a felhasználót egy feladat elvégzésében**
4. **Összeomláshoz vezethet**

UI finomítás, refaktor, technikai adósság – ha nem blokkolja a napi használatot –
szándékosan **nem** szerepel ebben az auditban.

**Módszer:** teljes kódbázis-átvizsgálás (két párhuzamos kutatási kör: ajánlatok/
számlák/fővállalkozók modul, illetve munkalap/projekt workflow + export/PWA modul),
minden találat fájl:sor szinten bizonyítva, majd a P0 tételek Playwright-tal
verifikáltan javítva.

---

## P0 – kötelező javítani az első éles használat előtt

**Mind a 6 tétel javítva ezen az auditon, commit: `claude/rc-audit-p0-fixes`.**

### P0-1. Munkatípus ID/név keveredés – elszámolási szabályok soha nem egyeztek

- **Kategória:** 2 (hibás adatot menthet)
- **Érintett fájlok:** `src/modules/fovallalkozok/FovallalkozoPage.jsx`,
  `src/modules/csapatok/CsapatokPage.jsx`, `src/modules/fovallalkozok/elszamolasiMotor.js`
- **A hiba:** a fővállalkozói/alvállalkozói díjtételek `munkatipus` mezője a
  hardcodeolt `ELSZAMOLASI_MUNKATIPUSOK` string-listából kapott értéket (pl.
  `"Napelem telepítés"`), miközben a projekten ténylegesen tárolt
  `penzugy.munkatipus` a `munkatipus.service.js` admin-szerkeszthető modul
  **ID-ja** volt (pl. `"mt_napelem_telepites"`). A két kódkészlet még névben sem
  egyezett pontosan. Emiatt `findEgyezoSzabalyok()` a pontos egyezést kereső
  szűrője **soha** nem talált találatot, a motor mindig az általános (vagy
  hiányában 0 Ft-os) szabályra esett vissza – csendben, figyelmeztetés nélkül.
  Minden munkatípusra szabott fővállalkozói/alvállalkozói díjtétel élesben
  soha nem lépett életbe.
- **Javítás:** mindkét szabály-szerkesztő form munkatípus-választója
  `getAktivMunkatipusok()`-ból tölti fel a listát (ID érték, olvasható név
  címke), a szabálykártyák pedig ID→név feloldással jelenítik meg a mentett
  értéket (visszamenőleg kompatibilis a régi, string-alapú rekordokkal is).
- **Verifikáció:** Playwright unit-szintű teszt – `findEgyezoSzabalyok()`
  valódi `getAktivMunkatipusok()` ID-val ténylegesen megtalálja a
  type-specifikus szabályt (korábban garantáltan nem találta volna).

### P0-2. Silent adatvesztés mentési hibánál (quota/sérülés) – cascade törlés/frissítés meg nem történt mentésre épült

- **Kategória:** 1 (adatvesztés)
- **Érintett fájlok:** `src/modules/projektek/projekt.service.js`
  (createProjekt, updateProjekt, deleteProjekt), `src/services/workorder.service.js`
  (updateWorkorder, deleteWorkorder)
- **A hiba:** `saveProjektek()`/`saveWorkorders()` (mindkettő a `localDb.saveLocal()`-t
  hívja, ami quota túllépés vagy sérült kulcs esetén `false`-t ad vissza és
  hibasávot jelez) visszatérési értékét a hívó CRUD-függvények nem ellenőrizték.
  Ennek két káros következménye volt:
  - `createProjekt`/`updateProjekt` a "mentett" objektumot adta vissza sikerként,
    a hívó (`ProjektForm.jsx`) bezárta a formot úgy, mintha a mentés megtörtént
    volna, miközben a régi állapot maradt tárolva.
  - **Súlyosabb:** `deleteProjekt`/`deleteWorkorder` a cascade-takarítást
    (gyerek munkalapok projekt-kapcsolatának nullázása, pénzügyi rekord és
    kivitelezési csomag törlése, illetve naptár-esemény törlés + projekt-unlink)
    **feltétel nélkül lefuttatta**, akkor is, ha maga a törlés nem sikerült –
    azaz a "megmaradó" szülő rekord elveszítette a hozzá tartozó adatokat és
    kapcsolatokat, holott ő maga továbbra is ott állt a listában.
- **Javítás:** mind az 5 függvény ellenőrzi a mentés eredményét, mielőtt bármilyen
  másodlagos műveletet (cascade, visszaadás sikerként) végrehajtana.
  `createProjekt`/`updateProjekt` hibán dob (a `ProjektForm.jsx` már meglévő
  try/catch-e kezeli), `updateWorkorder`/`deleteWorkorder`/`deleteProjekt`
  early-return-nel véd (mert több hívójük nincs try/catch-csel védve). A
  másodlagos, nem-kritikus szinkron hívások (`projektWorkflow.js`,
  `projectWorkorder.service.js`, `workorder.service.js` belső `updateProjekt`
  hívása) try/catch-be kerültek, hogy egy mellékes szinkron hiba ne akassza el
  a már sikeresen elmentett fő műveletet.
- **Verifikáció:** Playwright regressziós teszt – projekt létrehozás (2.3) és
  cascade törlés (2.5) továbbra is helyesen működik a védelem hozzáadása után.

### P0-3. LMRA/aláírás mentés – nincs quota-védelem, jogilag releváns adat veszhet el

- **Kategória:** 1 (adatvesztés)
- **Érintett fájlok:** `src/lib/lmraData.service.js` (saveLmraRec, saveSignature,
  closeLmra), `src/components/LmraTelepltoView.jsx` (handleSign)
- **A hiba:** `saveLmraRec()` közvetlen `localStorage.setItem()`-et hívott
  try/catch védelem **nélkül** – ellentétben a többi mentési úttal
  (`localDb.saveLocal()`), ahol ez a védelem már megvan. Mivel az LMRA
  rekordok aláírás-képeket (base64 PNG) halmoznak fel, egy `QuotaExceededError`
  a telepítő kattintásában elkapatlanul landolt: az aláírás a UI-n
  "megtörténtnek" tűnt, de nem mentődött el, visszajelzés nélkül.
- **Javítás:** `saveLmraRec()` try/catch-be került (a `localDb.js` mintáját
  követve: hibasáv-esemény + `false` visszatérés), `saveSignature`/`closeLmra`
  ez alapján `null`/`{error}`-t ad vissza sikertelen mentésnél, a
  `LmraTelepltoView.jsx handleSign` pedig explicit `alert`-tel figyelmezteti a
  telepítőt, ha az aláírás mentése nem sikerült.

### P0-4. `window.open()` null-check hiánya – összeomlás popup-blokkolt böngészőben

- **Kategória:** 4 (összeomlás) + 3 (feladat-blokkolás – nem lehet exportálni/nyomtatni)
- **Érintett fájlok:** `src/lib/exportService.js`, `src/lib/export.js`,
  `src/lib/reportService.js`
- **A hiba:** mindhárom helyen `window.open("", "_blank")` visszatérési értékét
  azonnal `.document.write(...)`-ra hívták null-ellenőrzés nélkül. Ha a böngésző
  popup-blokkolója (pl. Safari alapértelmezetten, vagy vállalati házirend)
  megakadályozza az ablak megnyitását, `window.open` `null`-t ad, a következő
  sor `TypeError: Cannot read properties of null` kivétellel összeomlik – a PDF
  export/nyomtatás funkció haszálhatatlanná válik ezekben a böngészőkben.
- **Javítás:** mindhárom helyen null-check + felhasználóbarát `alert`, a
  kódbázisban már helyesen működő `lmraData.service.js:exportLmraPdfWindow`
  mintáját követve.
- **Verifikáció:** Playwright teszt szimulált popup-blokkolással (`window.open`
  felülírva `null`-t visszaadóra) – a rendszer alert-et mutat, nem omlik össze.

### P0-5. Új munkalap modal az Error Boundary-n kívül – teljes app-összeomlás kockázata

- **Kategória:** 4 (összeomlás)
- **Érintett fájl:** `src/App.jsx`
- **A hiba:** a "Belső munka"/"Fővállalkozói" kivitelezés stabilizációs munka
  (D1 fix) bevezette a lap-szintű `PageErrorBoundary`-t, ami egy oldalon
  bekövetkező JS-hibát elszigetel (a többi navigáció, sidebar működik tovább).
  Az `UjMunkalap` (Új munkalap) modal viszont ezen a boundary-n **kívül** volt
  renderelve – egy ottani hiba a legkülső, `main.jsx`-ben lévő boundary-t érte
  volna el, ami az **egész alkalmazást** (sidebar, navigáció, minden más
  megnyitott oldal) fehér hibaoldalra cserélte volna.
- **Javítás:** az `UjMunkalap` modal saját `PageErrorBoundary`-be került.

### P0-6. *(Már javítva a korábbi PR #3-ban, itt csak visszaigazolva)* Belső munka projekt zsákutca + Újrakiosztás modal mezőkeveredés

Lásd `docs/PR3_SMOKE_TEST_CHECKLIST.md` – ezt a két hibát a `main`-be már
mergelt PR #3 javította, ennek az auditnak a keretében **regressziós teszttel
megerősítettük**, hogy a P0-1–P0-5 javítások nem törték meg őket.

---

## P1 – javítandó, de már használható a rendszer

Ezek valós hibák, de alacsonyabb gyakoriságúak, szűkebb hatókörűek, vagy
konfigurálatlan/ritkán használt funkciókat érintenek – nem gátolják a napi
munkát azonnal, de mielőbb sorra kerülendők.

| # | Hiba | Kategória | Fájl | Leírás |
|---|---|---|---|---|
| P1-1 | Fővállalkozó törlése cascade nélkül | 1 | `fovallalkozo.service.js:63-66` | A hozzá tartozó `elszamolasi_szabalyok` rekordok árván maradnak; aktív projekt/számla `fovallalkoziId`/`szallitoId` mezője dangling ID-t tartalmazhat törlés után, figyelmeztetés nélkül. |
| P1-2 | PEASE import validáció nélkül | 2 | `szamla.service.js:19-38`, `SzamlakPage.jsx:93-98` | `createSzamla()` nincs kötelező mező ellenőrzés; PEASE import közvetlenül hívja, megkerülve a kézi űrlap validációját (szamlaszám, dátum, összeg). Csak akkor releváns, ha a PEASE integráció konfigurálva van. |
| P1-3 | AjanlatEditor nincs minimum-tétel ellenőrzés | 2/3 | `AjanlatEditor.jsx:259-268` | 0 Ft-os, tétel nélküli ajánlat menthető és kinyomtatható ügyfélnek. |
| P1-4 | SzamlaForm "Fizetve" 0 Ft befizetett összeggel | 2 | `SzamlaForm.jsx:282-288` | `fizetettOsszeg` konzisztencia nincs ellenőrizve "Fizetve" státuszváltáskor. |
| P1-5 | SzamlakPage `reload()` szűretlen event listener + rekurzió-kockázat | 4 | `SzamlakPage.jsx:52-68` | A `crm-db-updated` handler nem szűr kollekcióra, és `updateSzamla` maga is ezt az eseményt váltja ki `reload()` közben – nagy, elhanyagolt (sok lekésett) számlaállománynál láncreakció-szerű, redundáns újraszámolást okozhat. Reális (néhány tucat számlás) méretnél valószínűleg csak lassulás, nem tényleges összeomlás. |
| P1-6 | UjrakiosztasModal "sikeres" UI valódi mentési hiba esetén is | 1 (UX) | `UjrakiosztasModal.jsx` | `updateItem()` quota-hiba esetén csendben a régi listát adja vissza, de a modal ettől függetlenül "sikeres"-ként zárja be magát. A globális hibasáv (`crm-storage-error`) ugyan megjelenik valahol az alkalmazásban, de a modal saját visszajelzése félrevezető. Javasolt hosszú távú megoldás: a modal `updateWorkorder()`-en menjen át közvetlen `updateItem()` helyett. |
| P1-7 | Legacy hardcoded csapatlista az Újrakiosztás modalban | 2 | `UjrakiosztasModal.jsx:44-45`, `munkakiosztasSettings.js` | Már GitHub issue #8-ban rögzítve a PR #3 munkából – nem ennek az auditnak az új felfedezése, csak megerősítve továbbra is nyitott. |
| P1-8 | Service worker `/assets/` ág nincs `.catch()`-elve | 4 | `public/sw.js:86-98` | Offline + még nem cache-elt (pl. új deploy utáni lazy chunk) asset kérésnél kezeletlen "Failed to fetch dynamically imported module" hiba törhet egy dinamikusan importált route/komponenst. A 3. ág (108. sor) helyesen kezeli ugyanezt cache-fallback-kel – a minta ismert, csak nincs alkalmazva mindenhol. |

---

## P2 – ráér későbbi verzióban

| # | Hiba | Kategória | Fájl | Leírás |
|---|---|---|---|---|
| P2-1 | KarteritesekTab `projektkod` copy-paste hiba | 2 (kozmetikai) | `KarteritesekTab.jsx:160` | `m.projektkod \|\| m.projektkod \|\| ""` – mindkét ág ugyanazt a nem létező mezőt olvassa (helyesen `projektKod` nagy K-val). A `projektId` maga helyesen mentődik, csak a megjelenítendő projektkód marad üres a kártérítési tételen. Triviális, egysoros javítás, alacsony hatás. |
| P2-2 | `normalizeWorkorder()` törékeny object-spread sorrend | 2 (elméleti) | `workorder.service.js:96-132` | A `...data` spread a kereszttöltés-számítás UTÁN jön, ami elméletileg felülírhatná a számított fallback-et, ha egy jövőbeli hívó csak az egyik mezőt tölti ki explicit üres értékkel. Jelenleg nincs élő hívó, amely ezt kiváltaná (a P0-1 auditban minden aktív hívó ellenőrizve lett). |
| P2-3 | ADV-2: max 10 backup snapshot | 1 (tervezett korlát) | `backupService.js` | Szándékos, dokumentált korlátozás – ha 10-nél több módosítás történik két mentés között, a régebbi állapot nem állítható vissza helyi snapshot-ból (Drive-ról igen, ha konfigurált). |
| P2-4 | P0-SEC-3/P0-SEC-4 (korábbi AUDIT_000): nincs szerver oldali auth, Apps Script token nélkül nyitott | 1 (biztonsági, nem napi-használati) | `appsscript/Code.gs`, `src/lib/roles.js` | Architekturális korlát (nincs backend). Kis, megbízható csapatnál (5-10 fő) nem blokkolja a napi munkát, de dokumentált kockázat marad – lásd a P0-004 tervdokumentumot a jövőbeli megoldáshoz. |

---

## Összefoglaló

- **P0 tételek:** 6 – **mind javítva** ezen az auditon (4 új + 2 korábban, PR #3-ban javított, itt regressziósan visszaigazolt).
- **P1 tételek:** 8 – dokumentálva, nem blokkolják a napi használatot, de mielőbb sorra kerülendők.
- **P2 tételek:** 4 – ráérnek egy későbbi verzióban.

A P0 javítások Playwright-tal regressziósan tesztelve (munkatípus-egyezés unit
szinten, projekt create/delete cascade, window.open null-check), build hiba
nélkül lefordul.
