import { useState, useEffect } from "react";
import { C } from "../lib/constants";
import { loadLocal } from "../lib/localDb";
import { CheckCircle2, AlertTriangle, Camera } from "lucide-react";

const FOTO_KAT = [
  { id:"ac_box",          nev:"AC box" },
  { id:"akkumulator",     nev:"Akkumulátor" },
  { id:"akku_adattabla",  nev:"Akku adattábla" },
  { id:"csatl_pont",      nev:"Csatlakozási pont" },
  { id:"dc_box",          nev:"DC box" },
  { id:"eph_kotes",       nev:"EPH kötés" },
  { id:"egyeb_dok",       nev:"Egyéb dok." },
  { id:"elrendezes",      nev:"Elrendezés+stringek" },
  { id:"figyelm_tabla",   nev:"Figyelmeztető tábla" },
  { id:"fusterzekelő",    nev:"Füstérzékelő" },
  { id:"inverter",        nev:"Inverter" },
  { id:"inv_adattabla",   nev:"Inverter adattábla" },
  { id:"inv_beallitas",   nev:"Inverter beállítások" },
  { id:"inv_mukodes",     nev:"Inverter működés" },
  { id:"kabel_nyomvonal", nev:"Kábel nyomvonal" },
  { id:"matricak",        nev:"Matricák" },
  { id:"meres_ellenorzes",nev:"Mérés ellenőrzése" },
  { id:"merohelyrol",     nev:"Mérőhelyről" },
  { id:"napelemek",       nev:"Napelemek" },
  { id:"panel_sn",        nev:"Napelem SN" },
  { id:"optimalizalo",    nev:"Optimalizáló" },
  { id:"plant_letrehozas",nev:"Plant létrehozás" },
  { id:"palyazati_tabla", nev:"Pályázati tábla" },
  { id:"smart_mero",      nev:"Smart mérő" },
  { id:"tartoszerkezet",  nev:"Tartószerkezet" },
  { id:"teto_kivezetes",  nev:"Tető kivezetés" },
  { id:"tuz_levalaszto",  nev:"Tűzeseti leválasztó" },
  { id:"wifi_stick",      nev:"Wifi Stick" },
  { id:"wifi_beallitas",  nev:"Wifi beállítás" },
];

export default function FotokAdminCard({ munkalapId }) {
  const [fotok, setFotok] = useState(() => loadLocal(`fotok_${munkalapId}`));

  useEffect(() => {
    function refresh() { setFotok(loadLocal(`fotok_${munkalapId}`)); }
    window.addEventListener("crm-db-updated", refresh);
    refresh();
    return () => window.removeEventListener("crm-db-updated", refresh);
  }, [munkalapId]);

  if (!fotok) return (
    <div style={{ background:"#F8FAFC", border:`1px solid ${C.border}`, borderRadius:12, padding:"14px 16px", marginTop:16 }}>
      <p style={{ fontSize:13, fontWeight:700, color:C.muted }}>📷 Fotók — még nem töltöttek fel képeket</p>
    </div>
  );

  const osszes    = Object.values(fotok).reduce((s,a) => s+(a.length||0), 0);
  const kitoltott = FOTO_KAT.filter(k => (fotok[k.id]||[]).length > 0).length;
  const total     = FOTO_KAT.length;
  const pct       = Math.round(kitoltott/total*100);

  return (
    <div style={{ background:"#fff", border:`1px solid ${C.border}`, borderRadius:12, padding:"16px 20px", marginTop:16 }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, paddingBottom:10, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <Camera size={18} color={C.accent}/>
          <span style={{ fontWeight:700, fontSize:14, color:C.text }}>📷 Feltöltött fotók</span>
        </div>
        <div style={{ textAlign:"right" }}>
          <span style={{ fontSize:13, fontWeight:700, color: pct===100?C.success:C.warning }}>
            {kitoltott}/{total} kategória
          </span>
          <span style={{ fontSize:12, color:C.muted, marginLeft:6 }}>({osszes} db)</span>
        </div>
      </div>

      <div style={{ background:"#F1F5F9", borderRadius:8, height:8, marginBottom:14, overflow:"hidden" }}>
        <div style={{ width:`${pct}%`, height:"100%", background: pct===100?C.success:C.accent, borderRadius:8, transition:"width .3s" }}/>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5 }}>
        {FOTO_KAT.map(kat => {
          const db  = (fotok[kat.id]||[]).length;
          const van = db > 0;
          return (
            <div key={kat.id} style={{ display:"flex", alignItems:"center", gap:5, background: van?"#F0FDF4":"#FEF2F2", borderRadius:8, padding:"5px 9px", border:`1px solid ${van?"#A7F3D0":"#FECACA"}` }}>
              {van ? <CheckCircle2 size={11} color={C.success} style={{ flexShrink:0 }}/> : <AlertTriangle size={11} color={C.danger} style={{ flexShrink:0 }}/>}
              <span style={{ fontSize:11, color:C.text, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{kat.nev}</span>
              <span style={{ fontSize:12, fontWeight:700, color: van?C.success:C.danger, flexShrink:0 }}>{db}db</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
