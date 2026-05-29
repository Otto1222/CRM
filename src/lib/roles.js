/**
 * roles.js – Szerepkör alapú jogosultság kezelés
 */

// Melyik oldalak láthatók az adott szerepkörnek
export const ROLE_PAGES = {
  // Admin/PM/Iroda: munkalapok a Projektek modulon belül érhető el
  "Admin":            ["dashboard","projektek","munkakiosztas","ugyfelek","arajanlatok","szerzodesek","naptar","beallitasok"],
  "Projektmenedzser": ["dashboard","projektek","munkakiosztas","ugyfelek","arajanlatok","szerzodesek","naptar","beallitasok"],
  "Iroda/Könyvelés":  ["dashboard","projektek","ugyfelek","arajanlatok","szerzodesek","naptar","beallitasok"],
  // Telepítő: közvetlen munkalap lista (ő projekteket nem kezel)
  "Telepítő":         ["munkalapok"],
};

// Jogosultság ellenőrzések
export function canSeePrice(role) {
  return ["Admin","Projektmenedzser","Iroda/Könyvelés"].includes(role);
}
export function canCreateMunkalap(role) {
  return ["Admin","Projektmenedzser","Iroda/Könyvelés"].includes(role);
}
export function canEditMunkalap(role) {
  return ["Admin","Projektmenedzser","Iroda/Könyvelés"].includes(role);
}
export function getHomePage(role) {
  return role === "Telepítő" ? "munkalapok" : "dashboard";
}
export function getAllowedPages(role) {
  return ROLE_PAGES[role] || ["munkalapok"];
}
