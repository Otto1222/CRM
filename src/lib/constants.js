// ─── E.D.I. SOLUTIONS – DESIGN SYSTEM ───────────────────────
// Színek forrása: E.D.I. Arculati Kézikönyv
// Light Sea Green: #18ACA0 | Mosque: #075E56
// Venetian Red: #E30613   | Dark Red: #861001
// Black 90%: #3C3C3B      | Black: #1D1D1B
export const C = {
  // Sidebar
  sidebar:       "#075E56",           // Mosque
  sidebarBorder: "rgba(255,255,255,0.09)",
  sidebarText:   "rgba(255,255,255,0.58)",
  sidebarActive: "#18ACA0",           // Light Sea Green

  // Primary actions (Mosque)
  accent:        "#075E56",
  accentHover:   "#054f49",
  accentLight:   "#E6F4F3",
  accentDark:    "#075E56",           // Mosque (megtartva – meglévő hivatkozásokhoz)

  // Secondary / success (Light Sea Green)
  success:       "#18ACA0",
  successLight:  "#D4F1EF",

  // Alert (Venetian Red)
  danger:        "#E30613",
  dangerDark:    "#861001",           // Dark Red (megtartva – meglévő hivatkozásokhoz)
  dangerHover:   "#C1000F",
  dangerLight:   "#FDEAEB",

  // Warning (semleges amber)
  warning:       "#D97706",
  warningLight:  "#FFFBEB",

  // Neutrals
  bg:            "#F2F5F4",
  card:          "#FFFFFF",
  text:          "#1D1D1B",           // Black
  textSub:       "#3C3C3B",           // Black 90%
  muted:         "#707070",
  border:        "#DDE3E1",
  borderHover:   "#C6C6C6",
};

export const FONT         = "'Montserrat', 'Open Sans', sans-serif";
export const FONT_HEADING = "'Montserrat', 'Open Sans', sans-serif";

// ─── FELHASZNÁLÓK ─────────────────────────────────────────────
export const USERS = [
  { id:"u1", name:"Bakonyi Patrik", email:"bakonyi.patrik@szakiflow.hu", role:"Adminisztrátor", color:"#075E56", initials:"BP" },
  { id:"u2", name:"Kovács Géza",    email:"kovacs.geza@szakiflow.hu",    role:"Klímaszerelő",   color:"#18ACA0", initials:"KG" },
  { id:"u3", name:"Nagy Béla",      email:"nagy.bela@szakiflow.hu",      role:"Klímaszerelő",   color:"#075E56", initials:"NB" },
  { id:"u4", name:"Varga Réka",     email:"varga.reka@szakiflow.hu",     role:"Irodavezető",    color:"#D97706", initials:"VR" },
];

// ─── STÁTUSZ CONFIG ───────────────────────────────────────────
// Munkalap státuszok – spec 5. pont szerint
export const STATUS_CFG = {
  "Létrehozva":           { bg:"#F2F5F4", text:"#3C3C3B", dot:"#707070" },
  "Kiosztva csapatnak":   { bg:"#EEF8F7", text:"#075E56", dot:"#18ACA0" },
  "Felmérés":             { bg:"#E6F4F3", text:"#075E56", dot:"#18ACA0" },
  "Befejezett Felmérés":  { bg:"#D4F1EF", text:"#054f49", dot:"#18ACA0" },
  "Kiosztásra vár":       { bg:"#EEF8F7", text:"#075E56", dot:"#075E56" },
  "Kivitelezésre vár":    { bg:"#E6F4F3", text:"#075E56", dot:"#18ACA0" },
  "Megkezdésre Vár":      { bg:"#E6F4F3", text:"#075E56", dot:"#18ACA0" },
  "Folyamatban":          { bg:"#FFF7ED", text:"#B45309", dot:"#D97706" },
  "Kivitelezés":          { bg:"#FFF7ED", text:"#B45309", dot:"#D97706" },
  "Helyszínen lezárva":   { bg:"#FFFBEB", text:"#D97706", dot:"#D97706" },
  "Ellenőrzés alatt":     { bg:"#FFFBEB", text:"#B45309", dot:"#D97706" },
  "Jóváhagyva":           { bg:"#D4F1EF", text:"#054f49", dot:"#18ACA0" },
  "Számlázásra kész":     { bg:"#D4F1EF", text:"#054f49", dot:"#18ACA0" },
  "Számlázva":            { bg:"#D4F1EF", text:"#054f49", dot:"#075E56" },
  "Lezárva":              { bg:"#D4F1EF", text:"#054f49", dot:"#075E56" },
  "Ütemezett":            { bg:"#FFFBEB", text:"#D97706", dot:"#D97706" },
  "Kész":                 { bg:"#D4F1EF", text:"#054f49", dot:"#18ACA0" },
  "Befejezett":           { bg:"#D4F1EF", text:"#054f49", dot:"#18ACA0" },
  "Meghiúsult":           { bg:"#FDEAEB", text:"#E30613", dot:"#E30613" },
};

export const ALL_STATUSES = ["Összes","Folyamatban","Ütemezett","Kész","Meghiúsult"];

// Munkalap típusok (spec 4. pont)
export const MUNKALAP_TIPUSOK = [
  "Felmérés",
  "Első kivitelezés",
  "Javítás",
  "Befejezés",
  "Garanciális munka",
  "Hibajavítás",
  "Pótmunkavégzés",
  "Karbantartás",
  "Egyéb",
];

// Munkalap státuszok – spec 5. pont (teljes sorrend)
export const WORKFLOW_STATUSES = [
  "Létrehozva",
  "Kiosztva csapatnak",
  "Folyamatban",
  "Helyszínen lezárva",
  "Ellenőrzés alatt",
  "Jóváhagyva",
  "Számlázásra kész",
  "Lezárva",
  // Extra
  "Felmérés",
  "Befejezett Felmérés",
  "Kiosztásra vár",
  "Kivitelezésre vár",
  "Számlázva",
  "Meghiúsult",
];


// ─── NAVIGÁCIÓ ────────────────────────────────────────────────
export const NAV_PAGES = [
  { id:"dashboard",   label:"Irányítópult" },
  { id:"munkalapok",  label:"Munkalapok"   },
  { id:"ugyfelek",    label:"Ügyfelek"     },
  { id:"arajanlatok", label:"Árajánlatok"  },
  { id:"szerzodesek", label:"Szerződések"  },
  { id:"csapat",      label:"Csapat"       },
  { id:"naptar",      label:"Naptár"       },
  { id:"beallitasok", label:"Beállítások"  },
];
