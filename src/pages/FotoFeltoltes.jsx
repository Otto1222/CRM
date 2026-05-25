import { useState, useRef, useEffect } from "react";
import { Camera, X, Check, ChevronDown, ChevronUp, Upload } from "lucide-react";
import { C, FONT, FONT_HEADING } from "../lib/constants";
import { savePhoto, loadAllPhotos } from "../lib/munkalapDb";

const FOTO_KATEGORIAK = [
  { id:"ac_box",        nev:"AC box (fedéllel és fedél nélkül)", leiras:"3 fotó: Megkötött állapotban fedél nélkül, Fedéllel és nyitott ajtóval, Fedéllel csukott ajtóval.", minDb:3 },
  { id:"akkumulator",   nev:"Akkumulátor",             leiras:"2 fotó: Elhelyezéséről, Bekötéséről",                    minDb:2 },
  { id:"akku_adattabla",nev:"Akkumulátor adattábla",   leiras:"1 fotó: Olvasható adattábla+S/N",                        minDb:1 },
  { id:"csatl_pont",    nev:"Csatlakozási/rákötési pont",leiras:"2 fotó: Megkötött állapotban fedél nélkül, fedéllel",  minDb:2 },
  { id:"dc_box",        nev:"DC box (fedéllel és fedél nélkül)", leiras:"3 fotó: Megkötött állapotban fedél nélkül, Fedéllel és nyitott ajtóval, Fedéllel csukott ajtóval.", minDb:3 },
  { id:"eph_kotes",     nev:"EPH kötés",                leiras:"Min. 1 fotó: Tartószerkezeti rákötés (több sor esetén több fotó!)", minDb:1 },
  { id:"egyeb_dok",     nev:"Egyéb dokumentáció",       leiras:"Nyilatkozatok, fővállalkozói dokumentumok",              minDb:0 },
  { id:"elrendezes_str",nev:"Elrendezés+stringek",      leiras:"1 fotó: rajzolt elrendezés, rajzolt stringek, optimalizáló esetén QR-kódos címke elrendezéssel", minDb:1 },
  { id:"figyelmezto",   nev:"Figyelmeztető tábla",      leiras:"1 Fotó: Napelemes rendszer figyelmeztető tábláról",    minDb:1 },
  { id:"fusterzekelő",  nev:"Füstérzékelő",             leiras:"Egy fotó a füstérzékelőről felhelyezett állapotban.",  minDb:1 },
  { id:"inverter",      nev:"Inverter",                 leiras:"2 fotó: Szemből - látható bekötésekkel (pl. string mennyiség, eph), szemből - védelmi berendezésekkel együtt", minDb:2 },
  { id:"inv_adattabla", nev:"Inverter adattábla",       leiras:"1 fotó: Olvasható adattábla",                          minDb:1 },
  { id:"inv_beallitas", nev:"Inverter beállítások",     leiras:"Több fotó is lehet: Visszwatt, Smart mérő, akkumulátor, működési mód", minDb:1 },
  { id:"inv_mukodes",   nev:"Inverter működéséről",     leiras:"1 fotó: Rendszer élő termeléséről (telefonnal local csatlakozással, vagy kijelzőről)", minDb:1 },
  { id:"kabel_nyomv",   nev:"Kábel nyomvonal (AC/DC)", leiras:"Kábelhossz függvényeként több fotó is lehet.",          minDb:1 },
  { id:"matricak",      nev:"Matricák, feliratok",      leiras:"min. 3 fotó: AC box címkézve, DC box címkézve, Csatlakozási pont címkézve", minDb:3 },
  { id:"meres_ell",     nev:"Mérés ellenőrzése",        leiras:"Az ingatlan fogyasztásmérésének ellenőrzése. (CT sorrendek, fázis sorrendek) - Fotókkal dokumentálva.", minDb:1 },
  { id:"merohelyrol",   nev:"Mérőhelyről",              leiras:"3 fotó: Rendelkezésre álló teljesítményről (közeli), Mérőről (olvasható azonosítóval), Teljes mérőhely", minDb:3 },
  { id:"napelemek",     nev:"Napelemek",                leiras:"Min. 2 fotó: 2 irányból készített fotók, Több különálló mező esetén több fotó! Fő szempont, hogy minden panel számolható legyen!", minDb:2 },
  { id:"panel_sn",      nev:"Napelem SN számok",        leiras:"Összes napelem szériaszáma olvashatóan fotózva.",       minDb:1 },
  { id:"optimalizalo",  nev:"Optimalizáló",             leiras:"min. 1 fotó: Tigo Optimalizáló esetén minden optimalizálóról panelra rögzítve, Huawei esetén pedig tartószerkezetre rögzített állapotban!", minDb:1 },
  { id:"plant_letre",   nev:"Plant létrehozás",         leiras:"1 fotó: Online állapotban látható a rendszer monitoringon keresztül.", minDb:1 },
  { id:"palyazati",     nev:"Pályázati tábla",          leiras:"3 fotó: közvetlen közelről (rögzítések jól látható módon), 1-2 méterről, utca másik feléről (takarásmentes, jól látható)", minDb:3 },
  { id:"smart_mero",    nev:"Smart mérő/mérés",         leiras:"2 fotó: Mérés kialakítása (megfelelő irányokban), kommunikáció", minDb:2 },
  { id:"tartoszerkezet",nev:"Tartószerkezet",           leiras:"Min. 2 fotó: 2 irányból készített fotók, Több különálló mező esetén több fotó! Fő szempont, hogy a teljes szerkezet ellenőrizhető legyen.", minDb:2 },
  { id:"teto_kivez",    nev:"Tető kivezetés",           leiras:"1 fotó: Kábelkivezetés a tetőre (pl. szellőzőcserépen keresztül)", minDb:1 },
  { id:"tuzeseti_lev",  nev:"Tűzeseti leválasztó",      leiras:"1 fotó: Megkötött tűzeseti leválasztó.",               minDb:1 },
  { id:"wifi_stick",    nev:"Wifi Stick",               leiras:"1 fotó: Olvasható adatokkal",                          minDb:1 },
  { id:"wifi_beall",    nev:"Wifi beállítás",           leiras:"1. fotó: Sikeres wifi beállításról",                   minDb:1 },
];

function FotoKategoria({ kat, photos, onChange, munkalapId }) {
  const [open, setOpen]   = useState(false);
  const [drag, setDrag]   = useState(false);
  const fileRef           = useRef();
  const ok = kat.minDb === 0 || photos.length >= kat.minDb;
  const hiany = kat.minDb > 0 && photos.length < kat.minDb;

  function handleFiles(files) {
    const arr = Array.from(files).map(f => {
      // Fájl elnevezése a kategória nevével
      const ext = f.name.split(".").pop();
      const nev = `${kat.nev}_${photos.length + 1}.${ext}`;
      return {
        id:       `${Date.now()}_${Math.random()}`,
        origName: f.name,
        name:     nev,
        katNev:   kat.nev,
        type:     f.type,
        size:     f.size,
        url:      URL.createObjectURL(f),
        uploadedAt: new Date().toISOString(),
      };
    });
    const newPhotos = [...photos, ...arr];
    onChange(newPhotos);
    savePhoto(munkalapId, kat.id, newPhotos);
  }

  function delPhoto(id) {
    const newPhotos = photos.filter(p => p.id !== id);
    onChange(newPhotos);
    savePhoto(munkalapId, kat.id, newPhotos);
  }

  return (
    <div style={{ marginBottom:10, borderRadius:12, overflow:"hidden", border:`1.5px solid ${hiany?"#FCA5A5":ok&&photos.length>0?"#86EFAC":C.border}` }}>
      <button onClick={() => setOpen(p=>!p)} style={{ width:"100%", display:"flex", alignItems:"center", gap:12, padding:"13px 16px", background: ok&&photos.length>0?"#F0FDF4":hiany?"#FEF2F2":"#F8FAFC", border:"none", cursor:"pointer", fontFamily:FONT }}>
        <div style={{ width:36, height:36, borderRadius:9, background: ok&&photos.length>0?"#22C55E":hiany?"#EF4444":"#E2E8F0", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Camera size={18} color="#fff"/>
        </div>
        <div style={{ flex:1, textAlign:"left" }}>
          <p style={{ fontWeight:700, fontSize:14, color:C.text }}>{kat.nev}</p>
          <p style={{ fontSize:11, color:C.muted, marginTop:1 }}>
            Munkalapon feltöltve: {photos.length} db
            {kat.minDb > 0 && ` (min. ${kat.minDb} db szükséges)`}
          </p>
        </div>
        {open ? <ChevronUp size={16} color={C.muted}/> : <ChevronDown size={16} color={C.muted}/>}
      </button>

      {open && (
        <div style={{ padding:"12px 16px", background:"#fff", borderTop:`1px solid ${C.border}` }}>
          <p style={{ fontSize:12, color:C.textSub, marginBottom:12, lineHeight:1.6 }}>{kat.leiras}</p>

          {/* Feltöltött képek */}
          {photos.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:12 }}>
              {photos.map(p => (
                <div key={p.id} style={{ position:"relative", width:90, height:90 }}>
                  <img src={p.url} alt={p.name} style={{ width:90, height:90, objectFit:"cover", borderRadius:8, border:`1px solid ${C.border}` }} onError={e=>e.target.style.display="none"}/>
                  <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,0.6)", borderRadius:"0 0 8px 8px", padding:"3px 4px" }}>
                    <p style={{ fontSize:9, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.name}</p>
                  </div>
                  <button onClick={()=>delPhoto(p.id)} style={{ position:"absolute", top:2, right:2, width:20, height:20, borderRadius:"50%", background:"rgba(220,38,38,0.9)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <X size={12} color="#fff"/>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Feltöltés gomb */}
          <div
            onDrop={e=>{e.preventDefault();setDrag(false);handleFiles(e.dataTransfer.files);}}
            onDragOver={e=>{e.preventDefault();setDrag(true);}}
            onDragLeave={()=>setDrag(false)}
            onClick={()=>fileRef.current?.click()}
            style={{ border:`2px dashed ${drag?C.accent:C.border}`, borderRadius:10, padding:"16px 12px", textAlign:"center", cursor:"pointer", background:drag?C.accentLight:"#F8FAFC" }}
          >
            <Camera size={24} color={drag?C.accent:C.muted} style={{ display:"block", margin:"0 auto 6px" }}/>
            <p style={{ fontSize:13, fontWeight:600, color:drag?C.accent:C.textSub }}>
              {photos.length === 0 ? "Fotó hozzáadása" : "További fotók"}
            </p>
            <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>Koppints a kamera megnyitásához</p>
            <input ref={fileRef} type="file" multiple accept="image/*" capture="environment" style={{ display:"none" }} onChange={e=>handleFiles(e.target.files)}/>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FotoFeltoltes({ munkalapId }) {
  const [allPhotos, setAllPhotos] = useState(() => loadAllPhotos(munkalapId));

  const osszes = FOTO_KATEGORIAK.filter(k=>k.minDb>0).length;
  const kész   = FOTO_KATEGORIAK.filter(k=>k.minDb>0 && (allPhotos[k.id]||[]).length>=k.minDb).length;
  const szazalek = Math.round((kész/osszes)*100);

  function handleChange(katId, photos) {
    setAllPhotos(prev => ({ ...prev, [katId]: photos }));
  }

  return (
    <div style={{ padding:"12px 16px", fontFamily:FONT, paddingBottom:24 }}>
      {/* Progress */}
      <div style={{ background:"#fff", borderRadius:12, padding:"14px 16px", marginBottom:16, border:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
          <span style={{ fontWeight:700, fontSize:15, color:C.text }}>Fotó dokumentáció</span>
          <span style={{ fontSize:13, color:C.muted }}>{kész}/{osszes} kategória</span>
        </div>
        <div style={{ background:C.bg, borderRadius:8, height:8, overflow:"hidden" }}>
          <div style={{ width:`${szazalek}%`, height:"100%", background:szazalek===100?C.success:C.accent, borderRadius:8, transition:"width .3s" }}/>
        </div>
        <p style={{ fontSize:11, color:C.muted, marginTop:6 }}>A feltöltött fotók neve automatikusan a kategória neve alapján kerül elnevezésre.</p>
      </div>

      {FOTO_KATEGORIAK.map(kat => (
        <FotoKategoria
          key={kat.id}
          kat={kat}
          photos={allPhotos[kat.id] || []}
          onChange={photos => handleChange(kat.id, photos)}
          munkalapId={munkalapId}
        />
      ))}
    </div>
  );
}
