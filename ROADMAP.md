# Roadmap

Ez a dokumentum azt írja le, **mi jön a v1.0.0 éles kiadás után**, három,
egyre nagyobb kockázatú kategóriában. A cél: a napi használatot soha nem
veszélyeztetjük egy alsóbb kategóriás munkával – új funkció csak akkor
indul, ha a stabilitás nincs veszélyben.

**Alapszabály:** amíg P0-besorolású (adatvesztés / hibás adat / feladat-
blokkolás / összeomlás) hibajegy van nyitva, nem indul v1.1 vagy v2.0
munka – csak a hibajavítás.

---

## v1.0.1 – Hibajavítások

Kizárólag a `docs/RC_AUDIT.md`-ben már azonosított **P1** tételek, illetve
a `HIBAJEGY_SABLON.md` alapján bejelentett új hibák. Nincs új funkció.

| # | Tétel | Forrás |
|---|---|---|
| 1 | Fővállalkozó törlése nem törli a hozzá tartozó elszámolási szabályokat (árva rekordok) | RC_AUDIT P1-1 |
| 2 | PEASE számla-import validáció nélkül fut | RC_AUDIT P1-2 |
| 3 | AjánlatEditor nincs minimum-tétel ellenőrzés mentés előtt | RC_AUDIT P1-3 |
| 4 | SzámlaForm "Fizetve" státusz 0 Ft befizetett összeggel is menthető | RC_AUDIT P1-4 |
| 5 | SzámlákPage szűretlen `crm-db-updated` listener (lassulás-kockázat nagy adatnál) | RC_AUDIT P1-5 |
| 6 | Újrakiosztás modal `updateItem()` helyett menjen `updateWorkorder()`-en át (konzisztens hibajelzés) | RC_AUDIT P1-6 |
| 7 | Legacy hardcoded csapatlista az Újrakiosztás modalban → valódi Csapatok kollekció | [GitHub #8](https://github.com/Otto1222/CRM/issues/8), RC_AUDIT P1-7 |
| 8 | Service worker `/assets/` ág nincs `.catch()`-elve | RC_AUDIT P1-8 |
| 9 | KárterítésekTab `projektkod` mező copy-paste hiba (kozmetikai, triviális) | RC_AUDIT P2-1 |

Plusz: minden, ami a heti üzemeltetés során `HIBAJEGY_SABLON.md` szerint
bejelentésre kerül és P1/P2 besorolást kap.

---

## v1.1 – Kisebb fejlesztések

Nem romboló, meglévő funkciókra épülő bővítések – a jelenlegi architektúra
(frontend + localStorage + Drive) keretein belül maradnak.

- **Dedikált Riportok oldal** – jelenleg csak Dashboard-összesítő és
  projekt-szintű PDF export van, nincs önálló, szűrhető riport-felület
  (fővállalkozónkénti elszámolás, csapat-teljesítmény).
- **Munkakiosztás algoritmus UI befejezése** – az algoritmus megvan
  (`munkakiosztasAlgo.js`), a felület részlegesen kész.
- **KM-elszámolás automatizálása** – jelenleg kézi bevitel, a schema már
  előkészíti (`tavKmForras`, `tavKmNaplo`) egy útvonaltervező (pl. OSRM)
  integrációhoz.
- **Anyagtörzs árverzió workflow** – a rendszer megvan, a UI és a
  verzióváltási folyamat nincs teljesen kész.
- **PEASE integráció véglegesítése vagy tudatos eltávolítása** – jelenleg
  félkész, env nélkül nem működő gombok látszanak a Számlák oldalon; el
  kell dönteni, hogy bekötjük vagy elrejtjük/eltávolítjuk.
- **Duplikált modulok tisztázása** – `geo.js` vs `geoService.js`,
  `export.js` vs `exportService.js` – melyik aktív, melyik szüntethető meg.
- **`authApi.js` sorsának eldöntése** – jelenleg nem használt, MCP-alapú
  auth-kód a repóban; vagy integrálandó, vagy törlendő.

---

## v2.0 – Nagy architekturális változások

Ezek a tételek **valódi backendet** és/vagy jelentős újratervezést
igényelnek – csak akkor induljanak, ha v1.0.x és v1.1 már stabil, és van
kapacitás egy hosszabb, kockázatosabb munkára.

- **Valódi backend + adatbázis bevezetése** – a localStorage + Google
  Drive JSON páros kiváltása egy szerver oldali adatbázisra. Ez oldaná
  meg a legtöbb, jelenleg architekturálisan vállalt kockázatot (lásd
  `RELEASE_NOTES.md` "Ismert korlátozások (P2)").
- **Szerver oldali autentikáció és jogosultság-ellenőrzés** – a
  `docs/P0-004_AUTH_ARCHITECTURE_DESIGN.md` tervdokumentum már
  végiggondolta a réteges megközelítést (frontend guard → Apps Script
  token → data isolation); backend bevezetésével ez egyszerűbbé és
  ténylegesen biztonságossá válik (jelenleg a UI-szintű jogosultság
  DevTools-szal megkerülhető).
- **Apps Script védelme / kiváltása** – a jelenlegi nyitott,
  hitelesítés nélküli Apps Script webhook helyett egy védett API réteg.
- **Audit log** – ki, mikor, mit módosított – jelenleg nincs ilyen
  nyomkövetés, csak a projekt-szintű eseménynapló.
- **Multi-tenant képesség** – ha a rendszert több, egymástól független
  cég/csapat is használná, jelenleg ehhez nincs elkülönítés.

---

## Kiadási folyamat (javaslat)

Lásd bővebben a beszélgetésben adott indoklást is – itt a rövid,
követhető verzió:

1. **Folyamatos hibajegy-gyűjtés** a héten `HIBAJEGY_SABLON.md` szerint,
   GitHub Issues-ban.
2. **Heti triage** (pl. hétfő reggel): minden új hibajegy P0/P1/P2
   besorolást kap a `docs/RC_AUDIT.md`-ben bevezetett kategóriák szerint.
3. **P0 nem várja meg a heti ciklust** – azonnali hotfix branch, gyors
   review, azonnali `x.y.Z` patch-release (pl. 1.0.1 → 1.0.2).
4. **P1 tételek egy héten át gyűlnek**, majd **csütörtökön** összefésülve
   egy release branch-be (pl. `release/1.0.2`).
5. **Péntek délelőtt**: smoke teszt checklist lefuttatása a release
   branch-en (a `docs/PR3_SMOKE_TEST_CHECKLIST.md` mintájára).
6. **Péntek délután**: merge `main`-be, `CHANGELOG.md` bejegyzés, git tag
   + GitHub Release, deploy.
7. **Hétvégén nincs tervezett deploy** – csak P0 hotfix, ha elkerülhetetlen.
