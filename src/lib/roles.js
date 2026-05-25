/**
 * roles.js – Szerepkör alapú jogosultság kezelés
 */

// Melyik oldalak láthatók az adott szerepkörnek
export const ROLE_PAGES = {
  "Admin": ["dashboard","munkalapok","munkakiosztas","ugyfelek","arajanlatok","szerzodesek","csapat","naptar","beallitasok"],
  "Projektmenedzser": ["dashboard","munkalapok","munkakiosztas","ugyfelek","arajanlatok","szerzodesek","csapat","naptar","beallitasok"],
  "Iroda/Könyvelés": ["dashboard","munkalapok","ugyfelek","arajanlatok","szerzodesek","naptar","beallitasok"],
  "Telepítő": ["munkalapok"],
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
