# PR #3 – Kézi smoke teszt checklista

**PR:** `claude/merge-main-into-dls` → `main`
**Cél:** a main ág (P0-001/002, export/report javítások, TabMunkalapok inline form) és a
`claude/data-loss-stabilization` ág (A1–A10, B1, D1–D6) automatikus merge-jének futásidejű
ellenőrzése. A build sikeres volta nem garantálja a szemantikai helyességet – ezt a
checklistát végig kell futtatni, mielőtt a PR mergelhető.

**Szabály:** amíg ez a checklista nincs teljesen lefuttatva és minden sor PASS, a PR
draft állapotban marad, **nem kerül `main`-be**.

## Végrehajtás módja (2026-07-08)

A checklistát Playwright-automatizált böngészővel futtattuk le a `claude/merge-main-into-dls`
branch helyi dev build-jén (`vite dev`, localhost:3000), seedelt teszt-adatokkal (valós
SHA-256 jelszó-hash-elt teszt userekkel, valódi UI-interakciókkal: kattintás, form
kitöltés, mentés, majd a localStorage tényleges tartalmának ellenőrzésével).

**Környezeti korlát:** ebben a helyi dev környezetben nincs `VITE_APPS_SCRIPT_URL`
(Drive Apps Script) konfigurálva. Minden Drive-hálózati tételt (7.3, 8.5, 8.6, 9.4, 9.5,
13.4, 13.5, 14.3–14.7) **nem lehetett éles Drive-kapcsolattal tesztelni** – ezek staging
környezetben, valódi Drive konfigurációval futtatandók manuálisan újra.

**2 db valódi, megerősített hibát találtunk** (2.3 és 6.2) – lásd a táblázatokban és az
összegzésben a részleteket. **A PR emiatt draft marad, nincs engedélyezve a merge.**

Jelmagyarázat: ✅ PASS · ❌ FAIL (valódi hiba) · ⏭️ NEM TESZTELT (staging/Drive szükséges,
vagy időhiány miatt kimaradt) · ⚠️ RÉSZLEGES (a teszt-szkript hibája miatt nem
egyértelmű, manuális visszaellenőrzés ajánlott)

---

## 1. Login / jogosultság

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 1.1 | Nyisd meg az appot kijelentkezett állapotban | A Login oldal jelenik meg, nincs automatikus belépés | ✅ PASS |
| 1.2 | Jelentkezz be érvényes Admin felhasználóval és helyes jelszóval | Sikeres belépés, Dashboard betöltődik | ✅ PASS |
| 1.3 | Jelentkezz be érvényes felhasználónévvel, de hibás jelszóval | "Hibás jelszó!" üzenet, nem lép be | ✅ PASS |
| 1.4 | Jelentkezz be nem létező felhasználónévvel | "Nem található ilyen felhasználó!" üzenet | ✅ PASS |
| 1.5 | Admin szerepkörrel ellenőrizd a Sidebar-t | Minden menüpont látszik | ✅ PASS |
| 1.6 | Jelentkezz be Telepítő szerepkörű userrel | Csak a Munkalapok (saját munkalapok) menüpont érhető el, nincs pénzügyi/admin menü | ✅ PASS |
| 1.7 | Kattints Kijelentkezésre | Visszakerülsz a Login oldalra, user state törlődik | ✅ PASS |

**Szakasz eredménye: ✅ PASS (7/7)**

## 2. Projektek oldal

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 2.1 | Nyisd meg a Projektek oldalt | A meglévő projektek listája betöltődik hiba nélkül | ✅ PASS |
| 2.2 | Hozz létre egy új projektet kötelező mezők nélkül | Validációs hiba jelenik meg, a mentés nem történik meg | ✅ PASS |
| 2.3 | Hozz létre egy új "Belső munka" projektet Név + Munkatípus kitöltésével | A projekt létrejön | ❌ **FAIL – valódi hiba, lásd lent** |
| 2.4 | Szerkessz egy meglévő projektet (megnyitás) | A módosítás mentődik, a lista/detail nézet frissül | ✅ PASS |
| 2.5 | Törölj egy olyan projektet, amelyhez van hozzárendelt munkalap | A projekt törlődik, a hozzá tartozó munkalap `projektId`/`projektKod` mezője nullázódik (cascade törlés), a munkalap maga nem vész el | ✅ PASS |
| 2.6 | Használd a keresést/szűrést | A találati lista helyesen szűkül | ✅ PASS |

**Szakasz eredménye: ❌ FAIL (5/6 PASS, 1 valódi hiba)**

### 🐞 2.3 – Hiba részletei

**Mit tapasztaltunk:** A Projektek oldalon a **"+ Belső munka"** gombbal nyitott új
projekt formon Név + Munkatípus kitöltése után mentéskor a rendszer elutasítja a
mentést: *"Az anyagelszámolási mód kiválasztása kötelező új projekt létrehozásakor."* –
de a form **nem ad lehetőséget ennek kiválasztására**, mert az anyagelszámolási mód
választó szekció csak `fovallalkozoi_munka` forrásnál (vagy ha `forrás` üres) jelenik
meg. "Belső munka" forrásnál a szekció rejtve marad, és az automatikus mód-beállítás,
ami a forráskód kommentje szerint elvárt lenne ("Belső munkánál auto:
FOVALLALKOZO_HOZOTT_ANYAG (rejtett)"), **nem fut le**, amikor a `forrás` mező a
`ProjektekPage`-ről érkező kezdő propon keresztül van előre beállítva.

**Eredmény:** a "Belső munka" gombbal új projektet indító felhasználó **zsákutcába
kerül** – nem tudja elmenteni a projektet a felületen, admin/DevTools beavatkozás
nélkül.

**Érintett fájlok:**
- `src/modules/projektek/ProjektekPage.jsx:161-164` – a "Belső munka" gomb
  `ujForrasInit = "belso_munka"`-t állít, és a `ProjektForm`-ot
  `projekt={{ forrás: "belso_munka", clientNev: "..." }}`-vel nyitja meg –
  `anyagelszamolasiMod` nincs beállítva ebben az objektumban.
- `src/modules/projektek/ProjektForm.jsx:94` – az induló `form` state
  `anyagelszamolasiMod: projekt?.anyagelszamolasiMod || ANYAGELSZAMOLAS_NINCS_KIVALASZTVA`
  – mivel a fenti prop nem tartalmazza, a NINCS_KIVALASZTVAértéken marad.
- `src/modules/projektek/ProjektForm.jsx:609` – a mód-választó szekció
  megjelenési feltétele `form.forrás === "fovallalkozoi_munka" || !form.forrás || form.adminReviewRequired`
  – ez **explicit kizárja** a "belso_munka" esetet, tehát a felhasználó nem is
  láthatja/választhatja ki kézzel.
- Összehasonlításképp: az automatikus beállítás **csak** akkor fut le, ha a
  felhasználó a form BELSEJÉBEN lévő forrás-gombra kattint
  (`ProjektForm.jsx:530-539`, `onClick` handlerek), nem akkor, ha a `forrás` már
  előre be van állítva a form megnyitásakor.

**Javasolt javítás:** egy `useEffect` (vagy a `form` induló state számítása) a
`ProjektForm.jsx`-ben, ami `isNew && form.forrás === "belso_munka" &&
form.anyagelszamolasiMod === ANYAGELSZAMOLAS_NINCS_KIVALASZTVA` esetén automatikusan
beállítja `anyagelszamolasiMod: "FOVALLALKOZO_HOZOTT_ANYAG"`-ra – ugyanazt a logikát
alkalmazva, mint amit a forrás-gombok `onClick`-je tesz kézi kattintáskor, csak a
komponens mount/prop-change idejére is kiterjesztve.

**Megjegyzés:** ez a hiba **nem a mostani merge által bevezetett regresszió** – a
`ProjektForm.jsx` és `ProjektekPage.jsx` csak a `data-loss-stabilization` ág oldaláról
érkezett a mergebe, a `main` nem módosította ezeket a fájlokat. A hiba tehát már a
`claude/data-loss-stabilization` ág önálló állapotában is jelen van, de mivel ezt a
PR-t most teszteljük végig, jelentjük.

---

## 3. Munkalapok oldal

**Fontos felfedezés a teszt közben:** Adminnak a "Munkalapok" **nem önálló
főmenüpont** (`src/components/Sidebar.jsx` `NAV_GROUPS`-ban nincs ilyen bejegyzés) –
csak a Telepítő szerepkör kapja "Saját munkalapok" néven (`Sidebar.jsx:101`). Admin a
munkalapokat kizárólag a Projektek → Munkalapok fülön (TabMunkalapok, ld. 4. szakasz)
és onnan a "Megnyit" gombbal éri el. A 3. szakaszt ezért a Telepítő "Saját munkalapok"
nézetén futtattuk (3.1, 3.3), a 3.4-et pedig kiegészítettük egy Admin oldali
megerősítéssel (3.4b) a teljes munkalap-detail nézeten.

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 3.1 | Munkalapok oldal (Telepítő: Saját munkalapok) betöltődik, csak a saját munkalap látszik | A hozzárendelt munkalap megjelenik | ✅ PASS |
| 3.3 | Munkalap megnyitása (Telepítő nézetben) | Detail nézet megjelenik | ✅ PASS |
| 3.4 | Munkalap státuszváltás "Kész"-re (Telepítő nézetben) | Nem elérhető | ⏭️ NEM TESZTELT – a "Kész" gomb nincs jelen a Telepítő egyszerűsített detail nézetén (feltehetően szándékos jogosultsági korlátozás, nem ellenőriztük a `roles.js`-ben expliciten) |
| 3.4b | Munkalap státuszváltás "Kész"-re (Admin, teljes detail nézet) | A localStorage-ban a `status` ténylegesen "Kész"-re vált | ✅ PASS |
| 3.5 | Munkalap törlése → a szülő projekt `munkalapIds`-éből is kikerül (unlinkMunkalap) | `pr.munkalapIds` már nem tartalmazza a törölt munkalap ID-ját | ✅ PASS |

**Szakasz eredménye: ✅ PASS a ténylegesen lefuttatott tételekre**

## 4. TabMunkalapok inline form ⚠️ (mergeben érintett fájl)

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 4.1 | Projekt Munkalapok fül betöltődik, kapcsolódó munkalapok listázva | A projekthez kötött munkalap megjelenik | ✅ PASS |
| 4.2 | Hiányos inline form mentése | Validáció blokkolja | ⏭️ NEM TESZTELT külön (a 4.3 sikeres útvonalát futtattuk, az explicit "üres mentés" esetet nem) |
| 4.3 | Inline form kitöltése + "Munkalap létrehozása" → új munkalap jön létre, projekt `munkalapIds` bővül | Sikeres visszajelzés, `munkalapIds` bővül | ✅ PASS |
| 4.4 | "Megnyit" gomb a teljes munkalap detail nézetre navigál | A megfelelő munkalap nyílik meg | ✅ PASS *(első próbálkozáskor tévesen a másik, újonnan létrehozott munkalapot nyitotta meg egy pontatlan tesztszelektor miatt – pontosított teszttel megerősítve helyesen működik)* |
| 4.5 | Oldal frissítés (F5) után konzisztens adatok | Nincs adatvesztés/duplikáció | ⏭️ NEM TESZTELT |

**Szakasz eredménye: ✅ PASS a lefuttatott tételekre**

## 5. AdminPanel

**Navigációs pontosítás:** az AdminPanel nem közvetlen Sidebar-elem, hanem
Beállítások → **Rendszer** oldal → **"Felhasználók & Szerelő csapatok"** kártya mögött
érhető el.

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 5.1 | Admin userrel eljutás a Felhasználók kezelése nézetre | A meglévő felhasználók listája megjelenik | ✅ PASS |
| 5.2 | Új felhasználó hozzáadása jelszóval ("Új felhasználó / Csapat" gomb) | A felhasználó bekerül a `crm_napelem_users` localStorage-ba | ✅ PASS |
| 5.3 | Az új felhasználónál nincs `defaultPassword` mező, csak `passwordHash` | P0-001 regresszió nem áll fenn | ✅ PASS |
| 5.4 | Meglévő felhasználó jelszavának módosítása | Régi jelszó elutasítva, új elfogadva | ⏭️ NEM TESZTELT |
| 5.5 | Felhasználó inaktiválása/törlése | Nem tud belépni / eltűnik a listából | ⏭️ NEM TESZTELT |

**Szakasz eredménye: ✅ PASS a lefuttatott tételekre**

## 6. Újrakiosztás modal ⚠️ (mergeben érintett fájl)

**Navigációs pontosítás:** a modal a munkalap teljes detail nézetéből (Projekt →
Munkalapok fül → "Megnyit") elérhető **"Újrakiosztás / Szerkesztés"** gombbal nyílik.

**Másik felfedezés:** a modal csapatlistája **nem** a `csapatok` kollekcióból (amit a
`CsapatokPage` admin CRUD kezel), hanem a `munkakiosztasSettings.js`
`DEFAULT_SETTINGS.csapatok` **különálló, legacy hardcoded listájából**
(`getSettings().csapatok`, `src/pages/UjrakiosztasModal.jsx:44-45`) töltődik be. Ez a
két adatforrás **nincs szinkronban** – a `CsapatokPage`-en létrehozott/szerkesztett
csapatok nem automatikusan jelennek meg újrakiosztási opcióként. Ezt külön, a hibáktól
elkülönítve jelentjük (nem blokkolja a checklistát, mert nem ennek a PR-nek a
tárgyköre, de érdemes külön ticketet nyitni rá).

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 6.1 | Újrakiosztás modal megnyílik, csapatok listázva | Modal megnyílik, csapatlista látszik | ✅ PASS |
| 6.2 | Csapatváltás mentése frissíti a munkalap csapat-adatait | A kiválasztott csapat ténylegesen bekerül a rekordba | ❌ **FAIL – valódi hiba, lásd lent** |
| 6.3 | Modal megnyitása, majd "Mégse" | Semmi nem módosul | ⏭️ NEM TESZTELT |
| 6.4 | Modal bezárása X gombbal | Ugyanúgy nem módosul, mint Mégse esetén | ⏭️ NEM TESZTELT |

**Szakasz eredménye: ❌ FAIL (1 valódi hiba)**

### 🐞 6.2 – Hiba részletei

**Mit tapasztaltunk:** a modalban egy másik csapat kiválasztása, dátum + indoklás
kitöltése, majd **"✅ Megerősítem az újrakiosztást"** megnyomása **ténylegesen
lefut** (a mentés sikeres, `ujrakiosztas` history bejegyzés is létrejön a rekordon:
`"ujCsapat":"Csapat2"`), **de a munkalap `csapatId`/`csapatNev` mezői változatlanul
maradnak** ("cs1"/"Alfa csapat"). Ehelyett a mentés az `assigneeId`/`assigneeNev`
mezőket írja felül a kiválasztott csapat adataira.

Ellenőrzött, teljes rekord mentés után (kivonat):
```json
{
  "csapatId": "cs1", "csapatNev": "Alfa csapat",      // ← VÁLTOZATLAN
  "assigneeId": "cs2", "assigneeNev": "Csapat2",        // ← ide írta a modal
  "ujrakiosztas": [{ "ujCsapat": "Csapat2", ... }]
}
```

**Miért probléma ez:** a `TabMunkalapok.jsx:318` és más helyek (pl. `ProjektForm.jsx`
csapat dropdown) a munkalap csapatát a **`csapatNev`** mezőből jelenítik meg, nem az
`assigneeNev`-ből. Így egy "sikeres" újrakiosztás után a UI más nézetei (pl. a projekt
Munkalapok füle) **továbbra is a régi csapatot mutatják**, miközben a rendszer azt
hiszi, hogy megtörtént az átkiosztás – ez pontosan az a fajta csendes, észrevétlen
adat-inkonzisztencia, amit a stabilizációs munka (A-sorozat) más helyeken kifejezetten
célzott kiküszöbölni.

**Érintett fájl:** `src/pages/UjrakiosztasModal.jsx:102-105`
```js
const updates = {
  date: datum,
  assigneeId: csapatId,      // ← csapatId kerül az assigneeId mezőbe
  assigneeNev: cs?.nev || "", // ← csapat neve kerül az assigneeNev mezőbe
  ...
};
```

**Javasolt javítás:** az `updates` objektumban a csapat-kiválasztás eredményét
`csapatId`/`csapatNev` mezőkbe kell írni (esetleg *mindkettőbe*, ha az `assigneeId`
mezőnek is van önálló, szándékos szerepe egyéni telepítő-hozzárendelésre – ezt
tisztázni kell a termékfelelőssel, mert jelenleg úgy tűnik, a "csapat" és az "egyéni
assignee" fogalma összemosódik ebben a komponensben).

---

## 7. Backup létrehozás

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 7.0 | Beállítások → Rendszer → Biztonsági mentések elérhető | Az oldal betöltődik | ✅ PASS |
| 7.1 | "Mentés most" helyi mentést készít, visszajelzést ad | Sikeres visszajelzés | ✅ PASS |
| 7.2 | Az új backup megjelenik a listában | `crm_backups` bővül | ✅ PASS |
| 7.3 | Drive mentés + visszaellenőrzés | – | ⏭️ NEM TESZTELT (nincs Drive konfiguráció ebben a környezetben) |
| 7.4 | 11. mentés → legrégebbi törlődik, max 10 marad | – | ⏭️ NEM TESZTELT |

**Szakasz eredménye: ✅ PASS a lefuttatott tételekre**

## 8. Restore működés

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 8.1 | Megerősítő dialógus visszaállítás előtt | `window.confirm` megjelenik | ✅ PASS *(automatikusan elfogadva a teszt során, a dialógus ténylegesen megjelent)* |
| 8.2 | Visszaállítás megerősítés után sikeres visszajelzést ad | "Visszaállítás sikeres!" üzenet | ✅ PASS |
| 8.3 | ~1.5 mp után automatikus oldal-újratöltés | Reload megtörténik | ✅ PASS *(a 8.4 ellenőrzése ezt implicit igazolja)* |
| 8.4 | Restore után az adatok a visszaállított állapotot tükrözik | A módosítás előtti (backup-beli) állapot áll vissza, nem a módosított | ✅ PASS |
| 8.5 | Restore után kimenő Drive-szinkron hívás | – | ⏭️ NEM TESZTELT (nincs Drive konfiguráció) |
| 8.6 | Kijelentkezés/belépés után a visszaállított állapot megmarad | – | ⏭️ NEM TESZTELT (Drive-hoz kötött forgatókönyv) |

**Szakasz eredménye: ✅ PASS a lefuttatott tételekre**

## 9. Drive sync hiba kezelése

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 9.1 | Offline állapotban megjelenik a "Nincs internetkapcsolat" piros sáv | Sáv látható, pontos szöveggel | ✅ PASS |
| 9.2 | Rekord módosítása offline állapotban, más oldalon (Ügyfelek) | Helyi mentés sikeres | ⚠️ RÉSZLEGES – a teszt-szkript nem tudta megbízhatóan elnavigálni az Ügyfelek oldalra offline szimuláció közben (valószínűleg a teszt saját navigációs időzítése, nem feltétlenül appon belüli hiba); a Dashboard nézet offline állapotban stabilan működött (ld. 9.1 screenshot), de az Ügyfelek oldal offline-viselkedését **manuálisan újra kell ellenőrizni** |
| 9.3 | Online visszakapcsolás után a piros sáv eltűnik | Sáv eltűnik | ✅ PASS |
| 9.4 | Sync-hiba jelzés más oldalakon is (nem csak Projektek) | – | ⏭️ NEM TESZTELT |
| 9.5 | Apps Script hiba szimuláció – nincs hamis "sikeres" állapot | – | ⏭️ NEM TESZTELT (Drive konfiguráció szükséges) |

**Szakasz eredménye: ✅ PASS / ⚠️ 1 tétel manuális visszaellenőrzést igényel**

## 10. localStorage mentési hiba kezelése

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 10.1 | Mesterséges feltöltés a quota közelébe | Sikeres a limitig, utána `QuotaExceededError` | ✅ PASS *(ténylegesen ~4,7 MB után dobott kivételt a böngésző)* |
| 10.2 | Quota-hibás állapotban valódi CRM mentés (`saveLocal`) | Egyértelmű felhasználói értesítés, nem néma `console.warn` | ✅ PASS *(a `saveLocal()` `false`-t adott vissza, ÉS a UI-n megjelent a storage-error banner – ez konkrétan igazolja az A1/A2/A4 fix működését)* |
| 10.3 | Böngésző konzol ellenőrzése | Nincs elkapatlan hiba | ⏭️ NEM TESZTELT külön (nem volt page-error esemény a teszt során, ami közvetett pozitív jel, de nem explicit ellenőrzött) |
| 10.4 | Teszt-adat törlése, normál működés visszaáll | – | ✅ PASS *(a teszt maga takarított, majd a 11. szakasz további sikeres műveletei megerősítik a helyreállást)* |

**Szakasz eredménye: ✅ PASS a lefuttatott tételekre – ez a legfontosabb megerősített eredmény az egész checklistából**

## 11. Több böngészőfül teszt (cross-tab szinkron)

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 11.1 | Két fül ugyanazon originon | Mindkét fülön ugyanaz az adat | ✅ PASS *(implicit, közös localStorage – lásd 11.4)* |
| 11.2 | Módosítás az egyik fülön | Sikeres mentés | ✅ PASS |
| 11.3 | `crm-db-updated` / BroadcastChannel értesítés valós időben a másik fülön | – | ⏭️ NEM TESZTELT megbízhatóan (a teszt időzítése miatt nem sikerült szinkron elkapni az eseményt – ez NEM azt jelenti, hogy nem működik, csak hogy ezzel a teszttel nem bizonyított) |
| 11.4 | A második fül localStorage állapota tükrözi az első fülön történt módosítást | A módosítás megjelenik | ✅ PASS |
| 11.5 | Mindkét fül F5 után konzisztens | – | ⏭️ NEM TESZTELT |

**Szakasz eredménye: ✅ PASS a lefuttatott tételekre, 11.3 külön manuális ellenőrzést igényel (két valódi böngészőablakkal, nem Playwright page-ekkel, mert a BroadcastChannel időzítése automatizálva nehezen determinisztikus)**

## 12. Nagy mennyiségű fotó feltöltése

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 12.1 | 10-15 nagyméretű fotó feltöltése egy munkalaphoz | – | ⏭️ **NEM TESZTELT** |
| 12.2 | `fotok_<munkalapId>` méret növekedés követése | – | ⏭️ **NEM TESZTELT** |
| 12.3 | Quota túllépés fotófeltöltésnél → egyértelmű hiba | – | ⏭️ **NEM TESZTELT** |
| 12.4 | Korábbi fotók nem sérülnek quota-hiba után | – | ⏭️ **NEM TESZTELT** |
| 12.5 | Fotó törlés után normál mentés helyreáll | – | ⏭️ **NEM TESZTELT** |

**Szakasz eredménye: ⏭️ TELJES EGÉSZÉBEN KIMARADT** – időkorlát miatt nem jutottunk el
idáig valós fájlfeltöltéssel. A 10. szakasz igazolta, hogy az általános
quota-hibakezelés (localStorage szinten) működik, de ez **nem helyettesíti** a
fotó-specifikus feltöltési útvonal (`driveApi.js:driveUploadFoto`, base64 konverzió)
tesztelését, ami más kódúton fut. **Ezt manuálisan, valós képfájlokkal kell
elvégezni merge előtt.**

## 13. Offline → Online round-trip szinkron

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 13.1 | Offline állapot jelzése | Piros sáv | ✅ PASS *(=9.1)* |
| 13.2 | Módosítás offline állapotban | Helyi mentés sikeres, nincs végzetes hiba | ⚠️ RÉSZLEGES *(=9.2, lásd ott)* |
| 13.3 | Online visszakapcsolás | Piros sáv eltűnik | ✅ PASS |
| 13.4 | Offline módosítás automatikusan/kézzel Drive-ra kerül online után | – | ⏭️ NEM TESZTELT (Drive konfiguráció szükséges) |
| 13.5 | Más eszközön/böngészőben látszik a szinkronizált módosítás | – | ⏭️ NEM TESZTELT (Drive konfiguráció szükséges) |

**Szakasz eredménye: ✅ PASS / ⚠️ a Drive-függő tételek staging környezetben tesztelendők**

## 14. Backup integritás (teljes törlés + restore)

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 14.1 | A backup snapshot tartalmazza a `csapatok`, `csapat_tagok`, `crm_napelem_users`, `szamlak`, `anyag_ar_verziok`, `kivitelezesi_csomagok` kulcsokat | Mind a 6 kulcs jelen van (az `otherLocalStorage` catch-all-on keresztül) | ✅ **PASS – kifejezetten megerősítve, mind a 6 kulcs benne van** |
| 14.2 | Teljes `localStorage.clear()` után a rendszer fail-closed | Login oldalra kerül, nincs jogosulatlan hozzáférés | ✅ PASS |
| 14.3 | Backup lista elérhető törlés után | – | ⏭️ NEM TESZTELT (lásd alább – architekturális korlát) |
| 14.4 | Visszaállítás sikeres | – | ⏭️ NEM TESZTELT |
| 14.5 | Minden kollekció hiánytalanul visszaáll (mind a 6 kritikus kulcs) | – | ⏭️ NEM TESZTELT ebben a formában – **de a 14.1 már bizonyította, hogy a snapshot tartalmazza ezeket, és a 8.4 bizonyította, hogy a restore mechanizmus általánosan működik** |
| 14.6 | Admin belépés működik restore után | – | ⏭️ NEM TESZTELT |
| 14.7 | Restore Drive-szinkront indít | – | ⏭️ NEM TESZTELT (Drive konfiguráció szükséges) |

**Megjegyzés 14.3–14.7-hez:** a teljes `localStorage.clear()` utáni forgatókönyv éles
környezetben úgy oldódik meg, hogy bejelentkezéskor a `syncAllFromDrive()` visszahozza
az adatokat Drive-ról – **ez a lépés Drive-kapcsolat nélkül ebben a tesztkörnyezetben
nem reprodukálható értelmesen** (a `crm_napelem_users` és így a login is csak Drive-ról
állna helyre). Ezt **Drive-kapcsolattal rendelkező staging környezetben kell manuálisan
végigvinni** merge előtt.

**Szakasz eredménye: ✅ PASS a lefuttatott (14.1, 14.2), kritikus tételekre; 14.3–14.7 staging tesztet igényel**

---

## Összegzés

| Terület | Eredmény | Megjegyzés |
|---|---|---|
| 1. Login / jogosultság | ✅ PASS | 7/7 |
| 2. Projektek oldal | ❌ **FAIL** | 2.3 – "Belső munka" új projekt zsákutca (anyagelszámolási mód) |
| 3. Munkalapok oldal | ✅ PASS | lefuttatott tételekre |
| 4. TabMunkalapok inline form | ✅ PASS | lefuttatott tételekre |
| 5. AdminPanel | ✅ PASS | lefuttatott tételekre |
| 6. Újrakiosztás modal | ❌ **FAIL** | 6.2 – csapatváltás rossz mezőbe ír (assigneeId/assigneeNev, nem csapatId/csapatNev) |
| 7. Backup létrehozás | ✅ PASS | Drive-tételek staging-et igényelnek |
| 8. Restore működés | ✅ PASS | Drive-tételek staging-et igényelnek |
| 9. Drive sync hiba kezelése | ✅ PASS / ⚠️ | 9.2 manuális visszaellenőrzést igényel |
| 10. localStorage mentési hiba kezelése | ✅ **PASS** | kritikus, jól megerősített eredmény |
| 11. Több böngészőfül teszt | ✅ PASS | 11.3 manuális visszaellenőrzést igényel |
| 12. Nagy mennyiségű fotó feltöltése | ⏭️ **KIMARADT** | teljes egészében manuálisan elvégzendő |
| 13. Offline → Online round-trip szinkron | ✅ PASS / ⚠️ | Drive-tételek staging-et igényelnek |
| 14. Backup integritás (teljes törlés + restore) | ✅ PASS (részleges) | kritikus tételek (14.1, 14.2) megerősítve; 14.3–14.7 staging-et igényel |

**Tesztelő:** Claude (automatizált Playwright smoke teszt)
**Dátum:** 2026-07-08
**Merge engedélyezve:** ❌ **Nem** – 2 valódi hiba (2.3, 6.2) javítása, valamint a Drive-függő
és a 12. szakasz manuális tesztjeinek elvégzése szükséges előbb.
