// ─── DESIGN TOKENS ───────────────────────────────────────────
export const C = {
  sidebar:      "#0D1B2A",
  sidebarBorder:"rgba(255,255,255,0.06)",
  sidebarText:  "#94A3B8",
  sidebarActive:"#1E4D8C",
  accent:       "#2563EB",
  accentHover:  "#1D4ED8",
  accentLight:  "#EFF6FF",
  success:      "#059669",
  successLight: "#ECFDF5",
  warning:      "#D97706",
  warningLight: "#FFFBEB",
  danger:       "#DC2626",
  dangerLight:  "#FEF2F2",
  bg:           "#F8FAFC",
  card:         "#FFFFFF",
  text:         "#0F172A",
  textSub:      "#475569",
  muted:        "#94A3B8",
  border:       "#E2E8F0",
  borderHover:  "#CBD5E1",
};

export const FONT         = "'DM Sans', sans-serif";
export const FONT_HEADING = "'Sora', sans-serif";

// ─── FELHASZNÁLÓK ─────────────────────────────────────────────
export const USERS = [
  { id:"u1", name:"Bakonyi Patrik", email:"bakonyi.patrik@szakiflow.hu", role:"Adminisztrátor", color:"#2563EB", initials:"BP" },
  { id:"u2", name:"Kovács Géza",    email:"kovacs.geza@szakiflow.hu",    role:"Klímaszerelő",   color:"#059669", initials:"KG" },
  { id:"u3", name:"Nagy Béla",      email:"nagy.bela@szakiflow.hu",      role:"Klímaszerelő",   color:"#9333EA", initials:"NB" },
  { id:"u4", name:"Varga Réka",     email:"varga.reka@szakiflow.hu",     role:"Irodavezető",    color:"#D97706", initials:"VR" },
];

// ─── STÁTUSZ CONFIG ───────────────────────────────────────────
export const STATUS_CFG = {
  // ── Felmérési fázis ──────────────────────────────────────────
  "Felmérés":               { bg:"#F0F9FF", text:"#0EA5E9", dot:"#0EA5E9" },
  "Befejezett Felmérés":    { bg:"#F0FDF4", text:"#16A34A", dot:"#22C55E" },
  // ── Kivitelezési workflow (spec szerinti) ────────────────────
  "Kiosztásra vár":         { bg:"#F5F3FF", text:"#7C3AED", dot:"#7C3AED" },
  "Kivitelezésre vár":      { bg:"#F0F9FF", text:"#38BDF8", dot:"#38BDF8" },
  "Megkezdésre Vár":        { bg:"#F0F9FF", text:"#38BDF8", dot:"#38BDF8" },
  "Folyamatban":            { bg:"#EFF6FF", text:"#2563EB", dot:"#2563EB" },
  "Kivitelezés":            { bg:"#FFF7ED", text:"#EA580C", dot:"#EA580C" },
  "Ellenőrzés alatt":       { bg:"#FFF7ED", text:"#D97706", dot:"#D97706" },
  "Lezárva":                { bg:"#ECFDF5", text:"#059669", dot:"#059669" },
  "Számlázva":              { bg:"#F0FDF4", text:"#15803D", dot:"#15803D" },
  // ── Egyéb ───────────────────────────────────────────────────
  "Ütemezett":              { bg:"#FFFBEB", text:"#D97706", dot:"#D97706" },
  "Kész":                   { bg:"#ECFDF5", text:"#059669", dot:"#059669" },
  "Befejezett":             { bg:"#ECFDF5", text:"#059669", dot:"#059669" },
  "Meghiúsult":             { bg:"#FEF2F2", text:"#DC2626", dot:"#DC2626" },
};

// Munkalap típusok (spec 4. pont)
export const MUNKALAP_TIPUSOK = [
  "Felmérés",
  "Első kivitelezés",
  "Javítás",
  "Befejezés",
  "Garanciális munka",
  "Hibajavítás",
  "Pótmunkavégzés",
  "Egyéb",
];

// Workflow státuszok sorrendben (spec 5. pont)
export const WORKFLOW_STATUSES = [
  "Felmérés",
  "Befejezett Felmérés",
  "Kiosztásra vár",
  "Kivitelezésre vár",
  "Folyamatban",
  "Ellenőrzés alatt",
  "Lezárva",
  "Számlázva",
  "Meghiúsult",
];

export const ALL_STATUSES = ["Összes","Folyamatban","Ütemezett","Kész","Meghiúsult"];

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
