/**
 * roles.js – Szerepkör alapú jogosultság kezelés
 */

export const ROLE_PAGES = {
  "Admin":            ["dashboard","projektek","munkalapok","ugyfelek","arajanlatok","szerzodesek","szamlak","naptar","riportok","beallitasok"],
  "Projektmenedzser": ["dashboard","projektek","munkalapok","ugyfelek","arajanlatok","szerzodesek","szamlak","naptar","riportok","beallitasok"],
  "Iroda/Könyvelés":  ["dashboard","projektek","munkalapok","ugyfelek","arajanlatok","szerzodesek","szamlak","naptar","riportok","beallitasok"],
  "Telepítő":         ["munkalapok"],
};

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
  return role==="Telepítő" ? "munkalapok" : "dashboard";
}
export function getAllowedPages(role) {
  return ROLE_PAGES[role] || ["munkalapok"];
}

// Fővállalkozó neve / rövidítése / ügyfél-forrás kizárólag nem-Telepítő számára látható
export function canSeeFovallalkozo(role) {
  return role !== "Telepítő";
}
