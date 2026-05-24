export const SAMPLE_DATA = {
  munkalapok: [
    { id:"SZA0001", title:"Samsung klíma szerviz – Budapest",        clientId:"c2", status:"Folyamatban", date:"2026-05-10", time:"09:00", assigneeId:"u3", description:"Éves szerviz és gáztöltés elvégzése.", items:[{ name:"Szerviz díj", qty:1, unit:"db", net:45000, vat:27 },{ name:"Hűtőközeg R32", qty:2, unit:"kg", net:8500, vat:27 }] },
    { id:"SZA0002", title:"Gree készülék telepítés – Békéscsaba",    clientId:"c1", status:"Ütemezett",   date:"2026-04-30", time:"10:00", assigneeId:"u2", description:"3,5 kW-os Gree Comfort X telepítése nappaliba, max. 3 m csőhossz.", items:[{ name:"Gree XCB1001 készülék", qty:1, unit:"db", net:299900, vat:27 },{ name:"Munkadíj", qty:1, unit:"db", net:80000, vat:27 }] },
    { id:"SZA0003", title:"LG Multi-split telepítés – Debrecen",     clientId:"c3", status:"Kész",        date:"2026-04-20", time:"08:00", assigneeId:"u1", description:"3 beltéri + 1 kültéri egység telepítése.", items:[{ name:"LG Multi-split szett", qty:1, unit:"db", net:580000, vat:27 },{ name:"Csővezeték csomag", qty:1, unit:"db", net:35000, vat:27 },{ name:"Munkadíj", qty:3, unit:"nap", net:65000, vat:27 }] },
    { id:"SZA0004", title:"Daikin fali klíma – Győr",                clientId:"c4", status:"Meghiúsult", date:"2026-05-05", time:"14:00", assigneeId:"u2", description:"Ügyfél lemondta a munkát anyagi okok miatt.", items:[] },
    { id:"SZA0005", title:"Mitsubishi kazán csere – Pécs",           clientId:"c5", status:"Kész",        date:"2026-04-12", time:"07:00", assigneeId:"u3", description:"Régi gázkazán cseréje Mitsubishi Ecodan hőszivattyúra.", items:[{ name:"Mitsubishi Ecodan 11kW", qty:1, unit:"db", net:1290000, vat:27 },{ name:"Szerelési díj", qty:2, unit:"nap", net:75000, vat:27 }] },
    { id:"SZA0006", title:"Panasonic szerviz – Miskolc",             clientId:"c2", status:"Ütemezett",   date:"2026-05-22", time:"11:00", assigneeId:"u2", description:"Szezonális karbantartás elvégzése.", items:[{ name:"Karbantartás díj", qty:1, unit:"db", net:38000, vat:27 }] },
  ],
  ugyfelek: [
    { id:"c1", name:"Kovács Szilvia",  phone:"+36505551122", email:"kovacsszilvia@fmail.com",  address:"Kossuth Lajos utca 44., Békéscsaba", type:"Magánszemély" },
    { id:"c2", name:"Tóth András",     phone:"+36301234567", email:"toth.andras@gmail.com",     address:"Váci út 12., Budapest",              type:"Magánszemély" },
    { id:"c3", name:"Fekete Kft.",     phone:"+36204567890", email:"iroda@fekete.hu",           address:"Piac utca 5., Debrecen",             type:"Vállalkozás"  },
    { id:"c4", name:"Mészáros Péter",  phone:"+36709876543", email:"meszaros.p@freemail.hu",    address:"Baross út 18., Győr",                type:"Magánszemély" },
    { id:"c5", name:"Déli-Klíma Bt.",  phone:"+36621112233", email:"info@deliklima.hu",         address:"Rákóczi út 7., Pécs",                type:"Vállalkozás"  },
  ],
  arajanlatok: [],
  szerzodesek: [],
};
