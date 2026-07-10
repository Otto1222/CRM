# CHANGELOG

Minden érdemi, éles kiadásra kerülő verzió változása ide kerül, a
kiadás dátumával. A formátum: **Added** (új), **Changed** (módosítva),
**Fixed** (hibajavítás), **Known issues** (ismert, még nem javított
korlátozás az adott verzióban).

A verziószámozás a `ROADMAP.md`-ben leírt kategóriákat követi:
- `x.y.Z` (pl. 1.0.**1**) – kizárólag hibajavítás
- `x.Y.0` (pl. 1.**1**.0) – kisebb, nem romboló fejlesztés
- `X.0.0` (pl. **2**.0.0) – nagy, architekturális változás

Minden bejegyzés a hozzá tartozó GitHub Release-re és (ha releváns) PR-ra
hivatkozik, hogy a részletek visszakereshetők legyenek.

---

## [1.0.0] - 2026-07-09

Az első éles kiadás. Részletek: `RELEASE_NOTES.md`, `docs/RC_AUDIT.md`.
GitHub Release: [v1.0.0](https://github.com/Otto1222/CRM/releases/tag/v1.0.0)

### Added
- Teljes projekt-, munkalap-, ügyfél-, csapat- és fővállalkozó-kezelés.
- Univerzális, szabály-alapú elszámolási motor (fővállalkozói bevétel +
  alvállalkozói bérszámítás).
- Számlák modul (kimenő/bejövő, PDF sablon).
- LMRA kockázatbecslés + telepítői aláírás-gyűjtés.
- Google Drive szinkronizáció + automatikus per-projekt mappastruktúra.
- Telepítő PWA (telepíthető, offline üzemmódban is használható).
- Biztonsági mentés rendszer (automatikus snapshot + egy kattintásos
  visszaállítás).

### Fixed (stabilizációs munka, PR #3 és PR #9)
- Adatvesztés-kockázatok: localStorage sérülés-/quota-védelem, ütközés-tűrő
  ID-generálás, cascade törlés, teljes backup-lefedettség, valódi
  Drive-szinkron állapotjelzés, oldal-szintű hibahatár.
- Biztonsági alapok: hardcoded jelszavak és demo-felhasználók eltávolítva,
  fail-closed bejelentkezés.
- "Belső munka" új projekt zsákutca javítva.
- Újrakiosztás modal csapat/assignee mezőkeveredés javítva.
- Munkatípus ID/név keveredés javítva (fővállalkozói/alvállalkozói
  elszámolási szabályok korábban soha nem léptek érvénybe).
- Silent adatvesztés mentési hibánál (quota/sérülés) megszüntetve projekt-
  és munkalap-műveleteknél.
- LMRA/aláírás mentés quota-védelem.
- `window.open()` null-check (popup-blokkolás miatti összeomlás javítva).

### Known issues
Lásd `RELEASE_NOTES.md` "Ismert korlátozások" szakasza (P1/P2 tételek,
részletesen: `docs/RC_AUDIT.md`).

---

## Korábbi fejlesztési napló (kiadás előtti belső verziószámozás)

Az alábbi bejegyzések a v1.0.0 éles kiadás **előtti**, belső fejlesztési
munkából származnak – a verziószámozásuk (2.x, 1.x) nem a fenti
kiadás-alapú sémát követte, ezért nem folytatódik tovább. Történeti
referenciaként megőrizve.

### [2.1.0] - 2026-05-28

#### Added – Projekt modul (src/modules/projektek/)
- `projekt.schema.js` – adatmodell v1.0, 13 státusz, típusok, getStatusConfig()
- `projekt.service.js` – CRUD, projektkód auto-gen (PRJ-2026-001), eseménynapló, munkalap-linkelés
- `ProjektekPage.jsx` – lista, szűrők, keresés, export (XLS/PDF)
- `ProjektDetail.jsx` – 9 fül: Áttekintés, Ajánlatok, Munkalapok, Költségek, Dokumentumok, Ütemezés, Számlázás, Kommunikáció, Napló
- `ProjektForm.jsx` – új/szerkesztés modal, teljes adatbevitel
- `ProjektTable.jsx` – export-ready táblázat, nyereség/haszon% mutatók
- `tabs/TabAttekintes.jsx` – összesítő, costEngine integrált pénzügyi adatok
- `tabs/TabMunkalapok.jsx` – munkalap hozzárendelés/leválasztás
- `tabs/TabKoltsegek.jsx` – costEngine alapú pénzügyi részletezés, kártérítések
- `tabs/TabNaplo.jsx` – eseménynapló + megjegyzések

#### Modified (minimális)
- `src/App.jsx` – Projektek menüpont + route
- `src/lib/store.jsx` – projektek collection hozzáadva

#### Architecture
- Projekt modul teljesen izolált: `src/modules/projektek/`
- Nem módosított: driveApi.js, TelepItoMunkalap.jsx, FelmeresTelepito.jsx, Login.jsx, minden meglévő UI

### [2.0.0] - 2026-05-28
- Reaktív state management (StoreProvider, useStore)
- Moduláris architektúra: costEngine, exportService, schema, backupService
- Sablon kezelő (Word-szerű szerkesztő)
- Felhasználókezelés: névmódosítás, új felhasználó hozzáadás

### [1.x] - korábbi fejlesztések
- EDI munkaszám, kártérítés, export, felmérési nézet, telepítő UI
