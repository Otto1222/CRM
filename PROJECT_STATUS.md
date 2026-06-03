# PROJECT_STATUS.md – CRM Napelem ERP
_Utolsó frissítés: 2026-06-03 (v8) – Biztonsági javítások, Riportok KÉSZ, Munkakiosztás routing, code splitting_

## Fejlesztési sorrend és jelenlegi állapot

| # | Modul | Állapot | Megjegyzés |
|---|---|---|---|
| 1 | Auth | ✅ KÉSZ | SHA-256 hash, session persistence, egyszeri jelszó panel, alapjlszó warning |
| 2 | Dashboard Shell | ✅ KÉSZ (alap) | Pénzügyi összesítő munkalapok alapján |
| 3 | Ügyfelek | ✅ KÉSZ | Teljes CRUD: add/edit/delete, státusz, megjegyzés, projekt szám |
| 4 | Projektek | ✅ KÉSZ | CRUD, 14 státusz, műszaki mezők, ügyfél dropdown |
| 5 | Csapatok | ✅ KÉSZ | Teljes CRUD: név, telephely, tagok, kapacitás, szín, hétvége toggle |
| 6 | Munkalapok | ✅ KÉSZ | CRUD, felmérés, VBF, fotók, projektből létrehozás (pre-fill) |
| 7 | Telepítő App (PWA) | ✅ KÉSZ | PWA manifest, SW (cache-first assets, network-first egyéb), offline mód |
| 8 | Google Drive | ✅ KÉSZ | driveApi + Apps Script webhook + auto per-projekt mappa (4 almappa) |
| 9 | Fővállalkozók | ✅ KÉSZ | Teljes CRUD, elszámolási szabályok |
| 10 | Elszámolási motor | ✅ KÉSZ | costEngine, settlementRule, per-fővállalkozó szabályok |
| 11 | Költség modul | ✅ KÉSZ | TabKoltsegek ProjektDetailban, kártérítés kezelés |
| 12 | Számlák | ✅ KÉSZ | Kimenő+bejövő lista, PEASE API stub, PDF sablon, riport |
| 13 | Riportok | ✅ KÉSZ | Fővállalkozó elszámolás, csapat teljesítmény, havi bontás grafikon, CSV export |
| 14 | Munkakiosztás | ✅ KÉSZ | Admin/PM szerepkörnek elérhető, Sidebar menüpont, routing |

---

## Részletes állapot

### ✅ 1. Auth
- Login képernyő: felhasználó lista kattintásra, szerepkör alapján
- crmUsers.js: felhasználók localStorage-ban kezelve
- roles.js: canSeePrice(), telepítő láthatóság stb.
- AdminPanel.jsx: felhasználókezelés

### ✅ 2. Dashboard
- Pénzügyi összesítő: bevétel, eredmény, kártérítések
- Munkalap státusz szűrők
- Kártérítés kezelés (elfogad/elutasít)

### ✅ 3. Ügyfelek
- Lista nézettel, kereséssel
- Teljes CRUD: új ügyfél, szerkesztés, törlés
- Mezők: Név, Típus, Telefon, E-mail, Cím, Státusz, Megjegyzés
- Projekt szám kijelzés
- localStorage["ugyfelek"]

### ✅ 4. Projektek
- CRUD megvan (ProjektForm, ProjektekPage, ProjektDetail, 10 tab)
- Státuszok (14 db, terv szerint): Felmérésre vár, Felmérve, Ajánlat kiküldve, Elbukott Projekt, Elfogadva, Kivitelezésre vár, Kivitelezés alatt, Elkészült, Ellenőrzésre vár, Hiánypótlás, Ellenőrizve minden rendben, Leszámlázva, Kifizetve, Lezárva
- Műszaki mezők: napelem db, inverter db, akkumulátor (toggle), okosmérő (toggle), elektromos autótöltő (toggle)
- Ügyfél kiválasztás: dropdown listából (clientId kapcsolat), adatok auto-betöltése; manuális szöveg is marad fallbackként
- localStorage["projektek"]

### ✅ 5. Csapatok
- Teljes CRUD: CsapatokPage, CsapatForm modal, törlés megerősítéssel
- Mezők: csapat neve, indulási telephely, csapattagok (multi-select), kapacitás (db/nap), szín, hétvégén is dolgozik
- Csapattag kártyák expandálható tag-listával
- ProjektForm csapat dropdown frissítve: valós csapat-entitásokat mutat (nem user-listát)
- localStorage["csapatok"]
- munkakiosztasAlgo.js: külső algoritmus megvan

### ✅ 6. Munkalapok
- Teljes CRUD, lista, detail nézet
- Típusok: Felmérés, Első kivitelezés, Javítás, Befejezés, Garanciális, stb.
- FelmeresFotok, TelepItoMunkalap, VbfJegyzokonyv megvannak
- Aláírás rögzítés (ügyfél + telepítő)
- Projekt kapcsolat: projektId mező, munkakiosztásban link

### ✅ 7. Telepítő App (PWA)
- FelmeresTelepito.jsx, TelepItoMunkalap.jsx: szerepkör alapján látható
- `public/manifest.json`: app név, ikon, theme color (#1E3A5F), standalone display
- `public/sw.js`: service worker – Vite assets cache-first (immutable), egyéb network-first + cache fallback
- `public/icon.svg` + `icon-maskable.svg`: napelem + nap ikon
- `index.html`: manifest link, SW regisztráció, viewport-fit=cover, apple-mobile-web-app meta
- `PwaInstallBanner.jsx`: Android (beforeinstallprompt) + iOS (manuális instrukció) telepítési banner
- `App.jsx`: offline jelző (vörös sáv), PwaInstallBanner
- Offline működés: localStorage → minden adat offline elérhető; Drive szinkron offline szünetel (jelzett)

### ✅ 8. Google Drive
- driveApi.js + VITE_APPS_SCRIPT_URL webhook (no-cors)
- JSON szinkron: syncAllFromDrive, syncAllToDrive
- Fotó feltöltés: base64 → Apps Script → Drive
- Auto per-projekt mappa: Projektek/{projektkod} – {clientNev}/ + 4 almappa
- `appsscript/Code.gs`: teljes Apps Script (ping, saveJson, loadJson, saveFoto, createMunkalapFolder, createProjektFolder)
- `TabDokumentumok.jsx`: Drive mappa megnyitása, mappastruktúra, újralétrehozás gomb
- Munkalap fotók projekten belül: 02_Kivitelezés/{munkalapId}/

### ✅ 9. Fővállalkozók
- FovallalkozoPage: teljes CRUD
- fovallalkozo.service.js, fovallalkozo.schema.js
- Elszámolási szabályok: per-fővállalkozó, per-munkatípus

### ✅ 10. Elszámolási motor
- costEngine.js: bevétel, csapatbér, útiköltség, kártérítés számítás
- settlementRule.service.js: szabályok alkalmazása
- financialCalculation.service.js: autoFillPenzugy a ProjektFormban
- Sávos árak, fix + km alapú, anyagköltség módjai

### ✅ 11. Költség modul
- TabKoltsegek: projekt szintű pénzügyi részletezés
- Kártérítés kezelés (elfogad/elutasít/függőben)
- Profit számítás: bevétel − (csapatbér + útiköltség + anyag + kártérítés + egyéb)

### ✅ 12. Számlák
- `szamla.schema.js`: kimeno/bejovo típus, státuszok, isKesedelmes()
- `szamla.service.js`: CRUD, getSzamlaOsszesito(), szurSzamlak(), auto késedelmes jelzés
- `pease.api.js`: PEASE API stub (VITE_PEASE_API_URL + VITE_PEASE_API_KEY env) – peaseLekeresSzamlak, peaseSzamlaImport, peaseSzamlaTocrm konverzió
- `SzamlaPdfSablon.jsx`: ⭐ szabadon szerkeszthető – printSzamla() + printSzamlaRiport() (browser print)
- `SzamlaForm.jsx`: kimenő/bejövő, projekt+ügyfél+fővállalkozó kapcsolat, ÁFA auto-számítás
- `SzamlakPage.jsx`: összesítő kártyák, szűrők, PEASE szinkron+import preview, PDF riport
- Sidebar: Számlák menüpont (Receipt ikon)
- localDb + dataSync: szamlak kollekció Drive-ra szinkronizálva

### ✅ 13. Riportok
- `RiportokPage.jsx`: dedikált riportok oldal, Admin/PM/Iroda szerepkörnek
- Fővállalkozó elszámolás tab: összesítő + projekt részletek expandálható sorokkal
- Csapat teljesítmény tab: befejezett/aktív projektek, csapatbér összesítő
- Havi bontás tab: recharts BarChart + táblázatos nézet
- CSV export: minden tabhoz (pontosvesszős, UTF-8 BOM, Excel-kompatibilis)
- KPI kártyák: projektek db, nettó bevétel, haszon (margin %), telepített panel
- Évszűrő: bármely évre szűrhető

### ✅ 14. Munkakiosztás
- `Munkakiosztas.jsx`: XLSX import alapú munkakiosztás, algoritmus
- Sidebar menüpont (CalendarRange ikon), Admin/Projektmenedzser szerepkörnek
- App.jsx routing bekötve

---

## Architektúra

- **Frontend**: React 18 + Vite, inline styles, custom routing (App.jsx page state)
- **Adatbázis**: localStorage (elsődleges) + Google Drive JSON (szinkron)
- **Drive sync**: Apps Script webhook (VITE_APPS_SCRIPT_URL)
- **Deployment**: Vercel (pre-built dist, ingyenes tier)
- **Bundle**: code splitting – vendor-react, vendor-charts, vendor-office, vendor-icons külön chunk
- **Repo**: https://github.com/Otto1222/CRM.git

## Biztonsági állapot (v8)

| Téma | Állapot |
|---|---|
| Jelszó tárolás | ✅ SHA-256 hash, plain text soha nem kerül Drive-ra |
| Regisztrációs email | ✅ Jelszó NEM szerepel az emailben |
| Admin jelszó panel | ✅ Egyszeri megjelenítés, localStorage-ban NEM tárolódik |
| Session persistence | ✅ sessionStorage (tab bezárásig megőrzi, frissítés után is bent marad) |
| Alapértelmezett jelszavak | ⚠️ Manuálisan változtasd meg éles indítás előtt! |
| Rate limiting | ❌ Nincs (kis csapat, acceptable) |

## localStorage kulcsok

| Kulcs | Tartalom |
|---|---|
| projektek | Projekt rekordok |
| munkalapok | Munkalap rekordok |
| ugyfelek | Ügyfél rekordok |
| beallitasok | Rendszer beállítások |
| fovallalkozok | Fővállalkozó rekordok |
| munkatipusok | Munkatípus rekordok |
| elszamolasi_szabalyok | Elszámolási szabályok |
| karteritesek | Kártérítési tételek |
| sablonok | Dokumentum sablonok |
| edi_projekt_sorszam_counter | Projektkód számláló |
