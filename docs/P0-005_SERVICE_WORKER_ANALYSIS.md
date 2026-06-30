# P0-005 – Service Worker fehér oldal hiba

**Dátum:** 2026-06-30
**Hatókör:** KIZÁRÓLAG `public/sw.js` (a service worker). Nem érinti az
ErrorBoundary-t, a session kezelést, a pénzügyi modulokat, az auth rendszert
vagy az adatmodellt.
**Commit:** `fix(sw): resolve response reuse and deployment cache issue`

---

## 1. Mi volt a hiba?

Deploy után visszatérő, egymással összefüggő tünetek:

- **Fehér oldal** új verzió kiadása után (néha csak hard refresh / cache törlés oldotta meg).
- **Beragadt cache:** a böngésző a régi alkalmazás-shell-t szolgálta ki.
- Konzol hiba: **`Uncaught (in promise) TypeError: Failed to execute 'clone' on 'Response': Response body is already used`** (forrás: `sw.js`).
- **Régi JS bundle** betöltése az új helyett.
- **HTML/JS verzióütközés:** a HTML egy régi, tartalom-hash-elt JS fájlra hivatkozott, ami az új deploy után már nem létezett → a `<script>` 404-elt → üres `#root`.

## 2. Mi okozta?

Két különálló, de együtt ható hiba:

### (a) Response dupla felhasználása → "Response body is already used"
A `fetch` handler így cache-elt:

```js
fetch(request).then(response => {
  if (response.ok) {
    caches.open(CACHE_NAME).then(c => c.put(request, response.clone())); // ← itt a baj
  }
  return response;
});
```

A `response.clone()` a `caches.open(...).then(...)` **callbackjében** futott, ami egy
külön mikrotaszk – **későbbi** időpontban, mint a `return response`. Mire a clone
ténylegesen lefutott, a böngésző már elkezdte **olvasni (streamelni) az eredeti
response body-t** a lap felé. Egy `Response` body-ja viszont csak addig klónozható,
amíg el nem kezdték olvasni → `clone()` kivételt dobott. A cache-be írás így
elhasalt (a hiba aszinkron promise-ban keletkezett), és a hibás/hiányos kezelés
hozzájárult a megbízhatatlan cache-állapothoz.

### (b) A HTML (navigáció) is cache-be került
A "minden más → network-first, cache fallback" ág a **navigációs (HTML) választ is
elmentette**, az offline fallback pedig a cache-elt `/index.html`-t adta vissza.
Mivel a Vite assetek **tartalom-hash-elt** fájlnevűek (`index-AbC123.js`), egy új
deploy után az **új index.html új hash-ekre** hivatkozik. Ha viszont a SW egy
**régi, cache-elt index.html-t** szolgált ki (offline/flaky hálózat, vagy a
beragadt cache miatt), az **már nem létező** asset-fájlokra mutatott → 404 →
fehér oldal. A `CACHE_VERSION` ráadásul statikus `'v1'` volt, így az `activate`
sosem purge-olta a régi cache-t → a beragadt állapot tartós lett.

## 3. Mi változott?

Csak `public/sw.js`. A cache-**stratégia nem változott** (navigáció→network-first,
hashed asset→cache-first, egyéb GET→network-first), csak a hiba javításához
szükséges mértékben lett megerősítve:

1. **Szinkron klónozás, egy helyen.** A `response.clone()` mostantól **szinkron**
   módon, a `fetch().then()` belsejében történik (mielőtt a body olvasása elindul),
   és a kész másolat megy a `putInCache(request, clone)` helperbe. → soha nem fogy
   el kétszer a body.
2. **A HTML-t SOHA nem cache-eljük.** A navigációs kérés (`request.mode === 'navigate'`)
   külön ág: mindig hálózat, és csak offline esetben az **install-kor előre
   cache-elt** `/index.html` a tartalék. Így nem maradhat „beragadt", elavult HTML.
3. **Sérült választ nem cache-elünk.** Új `isCacheable()` guard: csak
   `ok && status === 200 && type === 'basic'` válasz kerül cache-be – kizárva a
   hibás (nem-ok), részleges (`206` Range) és nem-basic (opaque/cors) válaszokat.
4. **Biztonságos fallback.** Hálózati hiba esetén, ha nincs cache-talált, explicit
   `Response.error()` tér vissza `undefined` helyett.
5. **`CACHE_VERSION` `v1` → `v2`.** A javítás kigördüléséhez: az új SW `activate`-je
   purge-olja a régi `crm-napelem-v1` cache-t.

## 4. Miért oldja meg?

- **"Response body is already used":** a klón már nem egy késleltetett mikrotaszkban
  készül, hanem szinkron, a body olvasása előtt → a kivétel megszűnik. (Live
  teszttel igazolva – lásd 5. pont.)
- **Deploy utáni fehér oldal / verzióütközés:** mivel a HTML-t soha nem cache-eljük,
  minden navigáció a **friss** index.html-t kapja a hálózatról, ami a **helyes,
  aktuális** asset-hash-ekre hivatkozik; az új hashű asset a cache-first ágon
  „miss" → hálózatról töltődik. Nincs régi-HTML ↔ új-asset (vagy fordított)
  ütközés.
- **Beragadt cache:** a `v2` verzióbump miatt az `activate` törli a régi cache-t;
  a HTML pedig eleve nem ragad be, mert nem cache-elt.
- **Sérült cache-bejegyzés:** az `isCacheable()` guard megakadályozza a hibás/
  részleges válaszok eltárolását.

## 5. Milyen edge case-eket vizsgáltál?

Build: `npm run build` → **exit 0**, a javított `sw.js` bekerült a `dist/`-be.

Élő, headless Chromium tesztek (perzisztens profil a SW életciklushoz):

| Scenárió | Eredmény |
|---|---|
| **Első telepítés** (cold, üres profil) | `#root` renderelt (288), `[SW] Regisztrálva`, **nincs** „already used", 0 Uncaught |
| **Meleg újratöltés** (warm, SW aktív) | `#root` renderelt, login megjelenik, **nincs** „already used", 0 Uncaught |
| **Deploy utáni frissítés** (régi SW aktív, ÚJ asset-hash-ű build) | `#root` renderelt (NEM fehér), az **ÚJ** bundle (`index-ByD3Jr8j.js`) töltött be, 0 Uncaught |
| **SW update / új verzió cache törlés nélkül** | a `v2` SW települ, `activate` purge-olja a régi cache-t; warm reload tiszta |
| **Hard refresh** | a navigáció network-first → mindig friss HTML; assetek hashből konzisztensek |

Kódszintű ellenőrzéssel (nem futtatott, mert headless környezetben a hálózat-
megszakítás CDP nélkül nem megbízható) átgondolt esetek:

- **Offline → online váltás:** offline navigációnál az install-kor előre cache-elt
  `/index.html` + a cache-first asseteket szolgálja ki; online visszatéréskor a
  network-first ágak újra a hálózatot használják. (A logika él, de a konkrét
  offline-kapcsoló nem lett headless-ben automatizálva.)
- **206 / opaque válasz:** az `isCacheable()` kizárja őket – nem kerülnek cache-be.

## 6. Milyen kockázat maradt?

- **`CACHE_VERSION` kézi bumpolás.** Továbbra is kézzel kell emelni, ha a SW-shell
  (precache lista) változik. Az asset/HTML kezelés viszont már **verziófüggetlenül
  helyes** (hash-elt assetek + nem-cache-elt HTML miatt), így egy elfelejtett bump
  most már nem okoz fehér oldalt – legfeljebb a régi cache marad lemezen
  (ártalmatlan). Javasolt jövőbeli lépés: build-időből generált verzió.
- **Offline → online átmenet** nincs end-to-end, automatizált teszttel lefedve
  ebben a környezetben (CDP-alapú hálózat-emuláció kellene); kódszinten áttekintve
  helyes, de éles eszközön érdemes manuálisan is ellenőrizni.
- **Első, javítatlan SW-vel rendelkező kliensek:** a már `v1`-et futtató eszközökön
  az `v2` a **következő** oldalbetöltéskor települ és veszi át az irányítást
  (`skipWaiting` + `clients.claim`); a legelső ilyen átmenet egy ciklust igényel,
  utána tiszta.

Egyéb (a P0-005 hatókörén KÍVÜL, nem ebben a commitban): a SW nem érinti az
ErrorBoundary-t, session kezelést, pénzügyi/auth/adatmodell rétegeket.
