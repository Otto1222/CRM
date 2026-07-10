# Hibajegy sablon – hogyan jelentsünk hibát

Ez a sablon segít abban, hogy egy hibajelentés elsőre elég információt
tartalmazzon a kivizsgáláshoz – így nem kell utólag visszakérdezni, és a
hiba gyorsabban javítható.

## Hova küldjük?

Nyiss egy új **GitHub Issue**-t a repóban:
[github.com/Otto1222/CRM/issues/new](https://github.com/Otto1222/CRM/issues/new)

Ha van hozzá GitHub-hozzáférésed, ezt a sablont választva (Issue Templates
között **"Hibajegy"** néven) a mezők automatikusan megjelennek. Ha nincs
GitHub-hozzáférésed, másold ki ezt a fájlt, töltsd ki, és küldd el az
adminnak/fejlesztőnek.

---

## A sablon

```markdown
### Rövid összefoglaló
(1 mondatban, mi a probléma – pl. "Nem tudok új projektet menteni Fővállalkozói forrásnál")

### Súlyosság (válassz egyet)
- [ ] Kritikus – adatvesztés történt VAGY nem tudok dolgozni, nincs megkerülő út
- [ ] Magas – hibás adat mentődött, vagy egy funkció nem működik, de van megkerülő út
- [ ] Közepes – zavaró, de nem akadályoz a munkában
- [ ] Alacsony – kozmetikai / apróság

### Adatvesztés történt?
- [ ] Igen – **ha igen, ezt emeld ki elsőként**, és írd le pontosan mi veszett el
- [ ] Nem, de aggódom, hogy megtörténhetett
- [ ] Nem

### Érintett terület / oldal
(pl. Projektek → Új projekt form, vagy Munkalapok → Újrakiosztás modal)

### Mit csináltál – reprodukálási lépések
1. Bejelentkeztem mint ... (szerepkör)
2. Rákattintottam erre: ...
3. Ezt töltöttem ki: ...
4. Erre a gombra kattintottam: ...
5. Ekkor történt a hiba

### Mit vártál, hogy történjen?


### Mi történt valójában?


### Screenshot / képernyőkép
Csatolj képernyőképet vagy videót a hibáról. Windows-on: `Win + Shift + S`
(kijelölt terület mentése), majd húzd be a képet ide vagy a GitHub Issue
mezőjébe (drag & drop működik).

Ha van rajta hibaüzenet a képernyőn, mindenképp legyen benne a screenshoten.

### Böngésző konzol hibaüzenet (ha van)
Nyomj **F12**-t (fejlesztői eszközök), kattints a **Console** fülre, és ha
piros hibaüzenetet látsz, másold be ide (jelöld ki, jobb klikk → Copy):

```
(ide másold a konzol hibát, ha van)
```

### Böngésző / eszköz
- Böngésző + verzió: (pl. Chrome 128, Safari 17)
- Eszköz: (pl. Windows laptop, iPhone, Android telefon)
- Bejelentkezett szerepkör: (Admin / Projektmenedzser / Iroda-Könyvelés / Telepítő)

### Mikor történt?
(dátum + kb. időpont – ez segít a Drive-szinkron naplóban visszakeresni)

### Mindig reprodukálható, vagy csak néha fordul elő?
- [ ] Mindig, ha megismétlem a fenti lépéseket
- [ ] Csak néha / nem tudom megbízhatóan reprodukálni
```

---

## Miért fontosak ezek a mezők?

- **Reprodukálási lépések** nélkül a hiba gyakran nem javítható, mert nem
  lehet előidézni.
- **Screenshot** sokszor többet mond, mint egy leírás – különösen
  validációs hibáknál, form-oknál.
- **Konzol hiba** (F12 → Console) az összeomlás-jellegű hibáknál (fehér
  oldal, "Váratlan hiba történt") szinte mindig megmutatja a pontos okot.
- **Súlyosság** és **adatvesztés** mező segít eldönteni, hogy azonnali
  (P0, hotfix) vagy a következő heti release-ben (P1/P2) javítandó-e –
  lásd `ROADMAP.md`.

## Kritikus hiba (adatvesztés / nem lehet dolgozni) esetén

Ha **adatvesztés** történt, vagy egy alapvető funkció (bejelentkezés,
projekt/munkalap mentés) egyáltalán nem működik:

1. **Ne próbálkozz tovább** ismételt mentésekkel – ha sérült/tele van a
   tárhely, egy újabb mentés ronthat a helyzeten.
2. Készíts azonnal képernyőképet a hibáról és a konzol hibáról (ha van).
3. Jelöld a hibajegyet **"Kritikus"**-nak, és ha van rá mód, azonnal
   jelezd szóban/chat-en is az adminnak, ne csak a hibajegyen keresztül.
