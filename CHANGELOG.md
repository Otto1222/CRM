# CHANGELOG

## [2.1.0] - 2026-05-28

### Added – Projekt modul (src/modules/projektek/)
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

### Modified (minimális)
- `src/App.jsx` – Projektek menüpont + route
- `src/lib/store.jsx` – projektek collection hozzáadva

### Architecture
- Projekt modul teljesen izolált: `src/modules/projektek/`
- Nem módosított: driveApi.js, TelepItoMunkalap.jsx, FelmeresTelepito.jsx, Login.jsx, minden meglévő UI

## [2.0.0] - 2026-05-28
- Reaktív state management (StoreProvider, useStore)
- Moduláris architektúra: costEngine, exportService, schema, backupService
- Sablon kezelő (Word-szerű szerkesztő)
- Felhasználókezelés: névmódosítás, új felhasználó hozzáadás

## [1.x] - korábbi fejlesztések
- EDI munkaszám, kártérítés, export, felmérési nézet, telepítő UI
