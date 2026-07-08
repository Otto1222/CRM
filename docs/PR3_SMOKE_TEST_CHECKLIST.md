# PR #3 – Kézi smoke teszt checklista

**PR:** `claude/merge-main-into-dls` → `main`
**Cél:** a main ág (P0-001/002, export/report javítások, TabMunkalapok inline form) és a
`claude/data-loss-stabilization` ág (A1–A10, B1, D1–D6) automatikus merge-jének futásidejű
ellenőrzése. A build sikeres volta nem garantálja a szemantikai helyességet – ezt a
checklistát végig kell futtatni, mielőtt a PR mergelhető.

**Szabály:** amíg ez a checklista nincs teljesen lefuttatva és minden sor PASS, a PR
draft állapotban marad, **nem kerül `main`-be**.

Kitöltés: minden sornál PASS vagy FAIL, FAIL esetén rövid megjegyzés (mi történt a
várttal szemben).

---

## 1. Login / jogosultság

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 1.1 | Nyisd meg az appot kijelentkezett állapotban | A Login oldal jelenik meg, nincs automatikus belépés | ☐ |
| 1.2 | Jelentkezz be érvényes Admin felhasználóval és helyes jelszóval | Sikeres belépés, Dashboard betöltődik | ☐ |
| 1.3 | Jelentkezz be érvényes felhasználónévvel, de hibás jelszóval | "Hibás jelszó!" üzenet, nem lép be | ☐ |
| 1.4 | Jelentkezz be nem létező felhasználónévvel | "Nem található ilyen felhasználó!" üzenet | ☐ |
| 1.5 | Admin szerepkörrel ellenőrizd a Sidebar-t | Minden menüpont látszik (dashboard, ugyfelek, projektek, munkalapok, naptar, szamlak, karteritesek, riportok, csapat, munkalap_sablonok, beallitasok) | ☐ |
| 1.6 | Jelentkezz be Telepítő szerepkörű userrel | Csak a Munkalapok (saját munkalapok) menüpont érhető el | ☐ |
| 1.7 | Kattints Kijelentkezésre | Visszakerülsz a Login oldalra, user state törlődik, oldal frissítés után is kijelentkezett állapot marad | ☐ |

## 2. Projektek oldal

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 2.1 | Nyisd meg a Projektek oldalt | A meglévő projektek listája betöltődik hiba nélkül | ☐ |
| 2.2 | Hozz létre egy új projektet kötelező mezők nélkül | Validációs hiba jelenik meg, a mentés nem történik meg | ☐ |
| 2.3 | Hozz létre egy új projektet minden kötelező mezővel | A projekt létrejön, megjelenik a listában, projektkód (E.D.I.XXX) automatikusan generálódik | ☐ |
| 2.4 | Szerkessz egy meglévő projektet (pl. státusz váltás) | A módosítás mentődik, a lista/detail nézet frissül | ☐ |
| 2.5 | Törölj egy olyan projektet, amelyhez van hozzárendelt munkalap | A projekt törlődik, a hozzá tartozó munkalap(ok) `projektId`/`projektKod` mezője nullázódik (cascade törlés), a munkalap maga nem vész el | ☐ |
| 2.6 | Használd a keresést/szűrést | A találati lista helyesen szűkül | ☐ |

## 3. Munkalapok oldal

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 3.1 | Nyisd meg a Munkalapok oldalt | A lista betöltődik hiba nélkül | ☐ |
| 3.2 | Hozz létre új munkalapot egy projektből kiindulva | A projekt adatai (ügyfél, cím stb.) elő vannak töltve | ☐ |
| 3.3 | Nyiss meg egy munkalapot, módosítsd, mentsd el | A módosítás megjelenik a listában/detail nézetben | ☐ |
| 3.4 | Zárj le egy munkalapot (státuszváltás "Kész"-re) | A kapcsolódó projekt státusza automatikusan frissül, ha minden munkalap kész | ☐ |
| 3.5 | Törölj egy munkalapot, ami szerepel egy projekt `munkalapIds` tömbjében | A munkalap törlődik, és eltűnik a szülő projekt `munkalapIds` listájából (unlinkMunkalap) | ☐ |

## 4. TabMunkalapok inline form ⚠️ (mergeben érintett fájl)

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 4.1 | Nyiss meg egy projektet, lépj a "Munkalapok" fülre | A fül betöltődik, a projekthez tartozó munkalapok listázva vannak | ☐ |
| 4.2 | Nyisd meg az inline új munkalap formot, tölts ki hiányosan | Validációs hiba jelenik meg, nem menthető hiányos adattal | ☐ |
| 4.3 | Tölts ki minden kötelező mezőt, mentsd el | Az új munkalap megjelenik a fülön, a projekt `munkalapIds` bővül | ☐ |
| 4.4 | Válassz le egy meglévő munkalapot a projektről (ha van ilyen funkció) | A munkalap eltűnik a fül listájából, a kapcsolat megszűnik, de a munkalap rekord megmarad | ☐ |
| 4.5 | Frissítsd az oldalt (F5) | A fülön mutatott adatok konzisztensek maradnak (nincs adatvesztés/duplikáció) | ☐ |

## 5. AdminPanel

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 5.1 | Admin userrel nyisd meg Beállítások → Felhasználókezelés | A meglévő felhasználók listája megjelenik | ☐ |
| 5.2 | Adj hozzá új felhasználót jelszóval | A felhasználó létrejön, be tud jelentkezni az új jelszóval | ☐ |
| 5.3 | Nézd meg a localStorage `crm_napelem_users` kulcsot DevTools-ban az 5.2 után | **Nincs `defaultPassword` mező, csak `passwordHash`** (P0-001 regressziós ellenőrzés) | ☐ |
| 5.4 | Módosíts egy meglévő felhasználó jelszavát | A régi jelszóval már nem lehet belépni, az újjal igen | ☐ |
| 5.5 | Inaktiválj/törölj egy felhasználót | A felhasználó nem tud többé bejelentkezni, illetve eltűnik a listából | ☐ |

## 6. Újrakiosztás modal ⚠️ (mergeben érintett fájl)

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 6.1 | Nyisd meg a Munkakiosztás oldalt, indíts újrakiosztást egy munkalapra/csapatra | A modal megnyílik, az elérhető csapatok/munkalapok helyesen listázva vannak | ☐ |
| 6.2 | Válassz másik csapatot, mentsd el | A munkalap `csapatId`/`csapatNev` frissül, a UI azonnal (reload nélkül) tükrözi a változást | ☐ |
| 6.3 | Nyisd meg a modalt, majd kattints Mégse | Semmilyen adat nem módosul | ☐ |
| 6.4 | Zárd be a modalt X gombbal/háttérre kattintva | Ugyanúgy nem módosul adat, mint Mégse esetén | ☐ |

## 7. Backup létrehozás

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 7.1 | Nyisd meg a Backup kezelő oldalt, kattints "Mentés most" | Helyi mentés készül, visszajelzés jelenik meg (✅ üzenet) | ☐ |
| 7.2 | Ellenőrizd az új backup megjelenését a listában | A legfrissebb mentés a lista tetején, helyes időbélyeggel és "Legfrissebb" jelöléssel | ☐ |
| 7.3 | Ha Drive konfigurálva van (`VITE_APPS_SCRIPT_URL`) | Drive mentés + visszaellenőrzés sikeres üzenet jelenik meg | ☐ |
| 7.4 | Hozz létre 11. mentést egymás után | A legrégebbi (11.) automatikusan törlődik, max 10 marad | ☐ |

## 8. Restore működés

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 8.1 | Módosíts pár adatot (pl. projekt névet), majd válassz egy korábbi backupot és kattints "Visszaállítás" | Megerősítő dialógus jelenik meg a visszaállítás előtt | ☐ |
| 8.2 | Erősítsd meg a visszaállítást | "Visszaállítás előtti állapot" automatikus mentés jön létre, majd a kiválasztott backup adatai állnak vissza | ☐ |
| 8.3 | Figyeld a visszajelzést és az oldal viselkedését | Sikeres visszaállítás üzenet, majd ~1.5 mp után automatikus oldal-újratöltés | ☐ |
| 8.4 | Újratöltés után ellenőrizd az adatokat | A projekt/munkalap/stb. adatok a visszaállított állapotot tükrözik, nem a visszaállítás előttit | ☐ |
| 8.5 | Nyisd meg a Network fület (DevTools) restore közben/után | Látható kimenő Drive-szinkron hívás (Apps Script POST) a restore-t követően – a visszaállított állapot Drive-ra is felkerül | ☐ |
| 8.6 | Jelentkezz ki, majd be újra | A visszaállított állapot marad érvényben (a következő Drive-szinkron NEM írja felül régebbi Drive-állapottal) | ☐ |

## 9. Drive sync hiba kezelése

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 9.1 | Kapcsold offline-ra a böngészőt (DevTools → Network → Offline) | A UI-n megjelenik az "Nincs internetkapcsolat" piros sáv | ☐ |
| 9.2 | Módosíts egy rekordot (pl. ügyfél adat) offline állapotban | A helyi mentés sikeres (az adat megmarad), de figyelmeztető jelzés/esemény jelenik meg a Drive-mentés sikertelenségéről | ☐ |
| 9.3 | Kapcsold vissza online-ra | A piros sáv eltűnik, a rendszer újra tud Drive-ra menteni | ☐ |
| 9.4 | Ismételd meg a 9.2 lépést más oldalakon is (nem csak Projektek) | Ellenőrizendő, hogy a sync-hiba jelzés csak a Projektek oldalon jelenik-e meg, vagy globálisan is (ismert korlát – dokumentáld az eredményt akkor is, ha csak részleges) | ☐ |
| 9.5 | Szimulálj Apps Script hibát (pl. ideiglenesen érvénytelen `VITE_APPS_SCRIPT_URL`, ha tesztkörnyezetben módosítható) | A rendszer nem jelez hamis "sikeres mentés" állapotot (B1 fix regressziós ellenőrzése) | ☐ |

## 10. localStorage mentési hiba kezelése

| # | Tesztlépés | Elvárt eredmény | PASS/FAIL |
|---|---|---|---|
| 10.1 | DevTools Console-ban tölts fel mesterségesen nagy mennyiségű adatot localStorage-ba a quota közelébe (pl. nagy string ismételt `setItem`-mel egy teszt kulcs alá) | A feltöltés sikeres a limit eléréséig | ☐ |
| 10.2 | Quota közelében próbálj menteni egy valódi CRM rekordot (pl. új munkalap) | Ellenőrizendő: van-e felhasználói értesítés hiba esetén, vagy csak néma `console.warn` (A1/A2/A4 fix regressziós ellenőrzése) | ☐ |
| 10.3 | Nézd meg a böngésző konzolt a mentés közben/után | Nincs elkapatlan (uncaught) hiba, a warning/error logok érthetőek | ☐ |
| 10.4 | Töröld a teszt célból feltöltött mesterséges adatot | A localStorage visszaáll normál méretre, az app további használata zavartalan | ☐ |

---

## Összegzés

| Terület | Eredmény | Megjegyzés |
|---|---|---|
| 1. Login / jogosultság | ☐ PASS / ☐ FAIL | |
| 2. Projektek oldal | ☐ PASS / ☐ FAIL | |
| 3. Munkalapok oldal | ☐ PASS / ☐ FAIL | |
| 4. TabMunkalapok inline form | ☐ PASS / ☐ FAIL | |
| 5. AdminPanel | ☐ PASS / ☐ FAIL | |
| 6. Újrakiosztás modal | ☐ PASS / ☐ FAIL | |
| 7. Backup létrehozás | ☐ PASS / ☐ FAIL | |
| 8. Restore működés | ☐ PASS / ☐ FAIL | |
| 9. Drive sync hiba kezelése | ☐ PASS / ☐ FAIL | |
| 10. localStorage mentési hiba kezelése | ☐ PASS / ☐ FAIL | |

**Tesztelő:** _____________
**Dátum:** _____________
**Merge engedélyezve:** ☐ Igen / ☐ Nem
