# PROJECT_STATUS.md – CRM Napelem ERP
_Utolsó frissítés: 2026-06-01 (v3) – Csapatok CRUD modul kész_

## Fejlesztési sorrend és jelenlegi állapot

| # | Modul | Állapot | Megjegyzés |
|---|---|---|---|
| 1 | Auth | ✅ KÉSZ | Kattintásos bejelentkezés, szerepkör-alapú láthatóság |
| 2 | Dashboard Shell | ✅ KÉSZ (alap) | Pénzügyi összesítő munkalapok alapján; projekt-centrikus átírás később |
| 3 | Ügyfelek | ✅ KÉSZ | Teljes CRUD: add/edit/delete, státusz, megjegyzés, projekt szám |
| 4 | Projektek | ✅ KÉSZ | CRUD, 14 státusz (terv szerint), műszaki mezők, ügyfél dropdown |
| 5 | Csapatok | ✅ KÉSZ | Teljes CRUD: név, telephely, tagok, kapacitás, szín, hétvége toggle |
| 6 | Munkalapok | ✅ NAGYRÉSZT KÉSZ | CRUD, felmérés, telepítő nézet, VBF, fotók megvannak |
| 7 | Telepítő App (PWA) | ⚠️ RÉSZLEGES | FelmeresTelepito, TelepItoMunkalap megvan; nincs PWA manifest/SW |
| 8 | Google Drive | ⚠️ RÉSZLEGES | driveApi + Apps Script webhook megvan; nincs auto projekt-mappa |
| 9 | Fővállalkozók | ✅ KÉSZ | Teljes CRUD, elszámolási szabályok |
| 10 | Elszámolási motor | ✅ KÉSZ | costEngine, settlementRule, per-fővállalkozó szabályok |
| 11 | Költség modul | ✅ NAGYRÉSZT KÉSZ | TabKoltsegek ProjektDetailban, kártérítés kezelés |
| 12 | Számlák | ❌ HIÁNYOS | ComingSoon |
| 13 | Riportok | ⚠️ RÉSZLEGES | Dashboard pénzügyi összesítő, TabRiport megvan; nincs dedikált oldal |

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

### ⚠️ 7. Telepítő App
- FelmeresTelepito.jsx, TelepItoMunkalap.jsx: szerepkör alapján látható
- Hiányzik: PWA manifest, service worker, offline mód
- Mobil optimalizálás javítandó

### ⚠️ 8. Google Drive
- driveApi.js + VITE_APPS_SCRIPT_URL webhook
- JSON szinkron: syncAllFromDrive, syncAllToDrive
- Fotó feltöltés: base64 → Apps Script → Drive
- Hiányzik: automatikus per-projekt mappa létrehozás

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

### ❌ 12. Számlák
- Nem implementált (ComingSoon)
- Tervezett: bejövő/kimenő számlák, fizetési határidő, állapot

### ⚠️ 13. Riportok
- Dashboard: havi bevétel összesítő munkalapokból
- TabRiport: projekt szintű PDF export
- reportService.js: projekt riport adatok
- Hiányzik: dedikált Riportok oldal, fővállalkozónkénti elszámolás, csapat teljesítmény

---

## Architektúra

- **Frontend**: React 18 + Vite, inline styles, custom routing (App.jsx page state)
- **Adatbázis**: localStorage (elsődleges) + Google Drive JSON (szinkron)
- **Drive sync**: Apps Script webhook (VITE_APPS_SCRIPT_URL)
- **Deployment**: Vercel (pre-built dist, ingyenes tier)
- **Repo**: https://github.com/Otto1222/CRM.git

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
