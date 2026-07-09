# Production Checklist – éles indulás előtt

Ezt a listát **sorrendben** kövesd végig, mielőtt a csapat elkezdi valós
projektekre használni a rendszert. Minden lépésnél PASS/FAIL jelölhető,
hogy nyoma legyen, mi lett ellenőrizve.

Jelmagyarázat: ☐ = elvégzendő

---

## 1. Első admin felhasználó létrehozása

A rendszer **fail-closed**: konfigurált felhasználó nélkül senki nem tud
bejelentkezni, és nincs beépített "első admin létrehozása" képernyő – ezt
egyszeri alkalommal a böngésző DevTools konzoljából kell megtenni.

1. ☐ Nyisd meg az éles URL-t (pl. `https://<a-te-domained>.vercel.app`).
2. ☐ Nyisd meg a DevTools konzolt (F12 vagy jobbklikk → Vizsgálat → Console fül).
3. ☐ Illeszd be és futtasd le az alábbi kódot (előtte írd át a `password`
   és `username` értékét a valódi admin jelszóra/névre):

   ```js
   (async () => {
     const password = "IDE_AZ_ERŐS_JELSZÓ";
     const username = "admin";
     const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
     const passwordHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
     const user = {
       id: "u_" + crypto.randomUUID(),
       name: "Admin",
       username,
       role: "Admin",
       color: "#2563EB",
       initials: "AD",
       passwordHash,
       active: true,
       createdAt: new Date().toISOString(),
     };
     localStorage.setItem("crm_napelem_users", JSON.stringify([user]));
     console.log("✅ Admin felhasználó létrehozva:", username);
   })();
   ```

4. ☐ Töltsd újra az oldalt (F5), és jelentkezz be a megadott
   felhasználónévvel/jelszóval.
5. ☐ **Azonnal** hozz létre egy második, névre szóló admin (vagy a saját
   fióktokat) a Beállítások → Rendszer → **Felhasználók & Szerelő csapatok**
   → "Új felhasználó / Csapat" felületen, majd a fenti ideiglenes
   `admin` fiókot töröld vagy módosítsd névre szólóra – ne maradjon
   megosztott, generikus admin fiók éles használatban.
6. ☐ Ellenőrizd DevTools-ban (Application → Local Storage →
   `crm_napelem_users`), hogy **nincs** `defaultPassword` mező egyik
   rekordon sem (csak `passwordHash`).

**Elfogadás:** ☐ Sikeres bejelentkezés, ☐ névre szóló admin fiók létrehozva, ☐ nincs plaintext jelszó.

---

## 2. Google Drive beállítása

A rendszer a Google Drive-ot használja a localStorage-on túli, tartós
adattárolásra és fotó-tárolásra.

1. ☐ Ellenőrizd, hogy létezik-e a CRM gyökérmappa a Google Drive-on, és
   alatta a két almappa:
   - `01_Adatbazis` (JSON adatfájlok) – ennek Drive-mappa ID-ja meg kell,
     hogy egyezzen a `src/lib/driveApi.js`-ben lévő `DRIVE_DB_FOLDER_ID`
     értékkel.
   - `04_Fotok` (fotók, projekt-mappák) – ennek meg kell egyeznie a
     `DRIVE_MUNKA_FOLDER_ID` értékkel.
   - Ha ezek a mappák **még nem léteznek** (teljesen új Drive-fiókkal
     indulsz), hozd létre őket, majd a mappa ID-kat (az URL-ből
     `.../folders/<ID>`) írd be a `src/lib/driveApi.js` fájlba, és
     buildeld újra az alkalmazást.
2. ☐ Ellenőrizd, hogy az a Google-fiók, amivel az Apps Scriptet futtatod
   (lásd 3. pont), írási jogosultsággal rendelkezik ezekre a mappákra.

**Elfogadás:** ☐ Mindkét Drive mappa létezik és elérhető, ☐ a mappa ID-k egyeznek a kódban lévőkkel.

---

## 3. Apps Script URL konfigurálása

1. ☐ Nyisd meg a [script.google.com](https://script.google.com) oldalt
   (vagy egy erre dedikált Google Sheet-ből Extensions → Apps Script),
   és hozz létre egy új projektet.
2. ☐ Másold be az `appsscript/Code.gs` teljes tartalmát ebbe a projektbe.
3. ☐ **Deploy → New deployment** → típus: **Web app**.
   - "Execute as": a te fiókod (aminek van hozzáférése a Drive mappákhoz).
   - "Who has access": *Anyone* (a frontend nem tud Google-bejelentkezést
     küldeni, ezért ennek nyitottnak kell lennie – lásd
     `docs/RC_AUDIT.md` P2-4 pontja a biztonsági következményekről).
4. ☐ Másold ki a kapott Web App URL-t (`https://script.google.com/macros/s/.../exec`).
5. ☐ A deployment platformon (Vercel – lásd `vercel.json`) állítsd be
   environment variable-ként: `VITE_APPS_SCRIPT_URL = <a fenti URL>`.
6. ☐ Indíts újra egy buildet/deploy-t, hogy az env változó bekerüljön a
   frontend bundle-be.
7. ☐ Jelentkezz be a friss deploy-on, és ellenőrizd a TopBar "Drive"
   státuszjelzőjét – zöld/kapcsolódott állapotot kell mutatnia.
8. ☐ Beállítások → Rendszer → **Drive szinkron állapot** oldalon futtass
   kapcsolat-tesztet ("ping") – sikeres válasz szükséges.

**Elfogadás:** ☐ Web App deployolva, ☐ `VITE_APPS_SCRIPT_URL` beállítva, ☐ kapcsolat-teszt sikeres.

---

## 4. Első backup készítése

1. ☐ Jelentkezz be adminként.
2. ☐ Navigálj: Beállítások → Rendszer → **Biztonsági mentések**.
3. ☐ Kattints **"Mentés most"**.
4. ☐ Ellenőrizd, hogy megjelenik-e sikeres visszajelzés, és (ha a 3. pont
   már kész) a Drive mentés + visszaellenőrzés is sikeresnek jelződik.
5. ☐ Ellenőrizd, hogy az új mentés megjelenik a listában, "Legfrissebb"
   jelöléssel.

**Elfogadás:** ☐ Backup létrejött helyileg, ☐ (ha Drive konfigurált) Drive-ra is felkerült.

---

## 5. Első projekt létrehozása

1. ☐ Navigálj a Projektek oldalra.
2. ☐ Hozz létre egy **valódi** (nem teszt) első projektet – válaszd a
   megfelelő forrást (Saját ajánlat / Fővállalkozói munka / Belső munka),
   töltsd ki a kötelező mezőket (Név, Munkatípus, illetve a forrásnak
   megfelelő egyéb kötelező adatok).
3. ☐ Ellenőrizd, hogy a projekt megjelenik a listában, helyes
   projektkóddal (E.D.I.XXX formátum).
4. ☐ Ha fővállalkozói vagy alvállalkozói (csapat) munkatípus-specifikus
   elszámolási szabályt állítottál be korábban, nyisd meg a projekt
   Pénzügy fülét, és ellenőrizd, hogy a **helyes** (nem az "Általános")
   szabály érvényesül – ez a P0-1 javítás (munkatípus ID-egyezés)
   közvetlen ellenőrzése éles adaton.

**Elfogadás:** ☐ Projekt létrejött, ☐ helyes projektkód, ☐ (ha releváns) helyes elszámolási szabály érvényesül.

---

## 6. Első munkalap létrehozása

1. ☐ Nyisd meg az 5. pontban létrehozott projektet → **Munkalapok** fül.
2. ☐ Kattints **"Új munkalap"**, töltsd ki az adatokat, majd
   **"Munkalap létrehozása"**.
3. ☐ Ellenőrizd, hogy a munkalap megjelenik a fülön, és a projekt
   munkalap-száma nő.
4. ☐ Nyisd meg a munkalapot ("Megnyit"), rendelj hozzá csapatot, és
   ellenőrizd, hogy a csapat neve helyesen jelenik meg a munkalap
   kártyáján (ez a korábbi csapat/assignee mezőkeveredés javításának
   éles ellenőrzése).
5. ☐ Ha a csapat Telepítő tagja be tud jelentkezni, ellenőrizd, hogy
   "Saját munkalapok" nézetben látja-e az új munkalapot.

**Elfogadás:** ☐ Munkalap létrejött, ☐ csapat-kiosztás helyesen jelenik meg, ☐ (ha releváns) Telepítő látja.

---

## 7. Backup/restore ellenőrzése

Ezt a lépést **valós adaton, óvatosan** végezd – a visszaállítás felülírja
az azt megelőző állapotot (a rendszer automatikusan ment egy
"Visszaállítás előtti állapot" biztonsági mentést, de mindig legyen friss
Drive-mentés is előtte).

1. ☐ Készíts egy friss backupot (lásd 4. pont).
2. ☐ Módosíts egy mezőt egy meglévő (nem kritikus) rekordon – pl. az
   5. pontban létrehozott projekt megjegyzés mezőjét.
3. ☐ Navigálj vissza a Biztonsági mentések oldalra, válaszd ki a
   **módosítás előtti** mentést, kattints **"Visszaállítás"**.
4. ☐ Erősítsd meg a megerősítő ablakban.
5. ☐ Várd meg az automatikus oldal-újratöltést (~1.5 mp).
6. ☐ Ellenőrizd, hogy a módosítás **eltűnt** (a visszaállított állapot
   érvényesül).
7. ☐ Jelentkezz ki, majd be újra – ellenőrizd, hogy a visszaállított
   állapot **megmaradt** (nem írta felül egy régebbi Drive-állapot).
8. ☐ (Ha Drive konfigurált) DevTools Network fülön ellenőrizd, hogy a
   restore után kiment egy Drive-mentés hívás is.

**Elfogadás:** ☐ Restore sikeres, ☐ állapot helyesen visszaállt, ☐ újra-bejelentkezés után is stabil marad.

---

## Összefoglaló – éles indulás engedélyezve, ha:

- ☐ 1. Admin felhasználó létrehozva, névre szóló fiók
- ☐ 2. Google Drive mappák ellenőrizve
- ☐ 3. Apps Script URL konfigurálva és tesztelve
- ☐ 4. Első backup sikeres
- ☐ 5. Első projekt létrehozva
- ☐ 6. Első munkalap létrehozva, csapat-kiosztás helyes
- ☐ 7. Backup/restore ciklus ellenőrizve

**Ha a Drive-integráció (2-3. pont) egyelőre kimarad**, a rendszer akkor is
használható lokálisan (localStorage-alapú működés, a 9.1/9.2/13.x tesztek
szerint), de **napi rendszeres kézi Drive-mentés vagy a Drive-integráció
mielőbbi bekötése erősen javasolt** az adatvesztés elkerülése érdekében,
mivel localStorage-only üzemmódban a böngésző-adatok törlése (vagy más
gép/böngésző használata) helyrehozhatatlan adatvesztéshez vezethet.
