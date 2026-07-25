import { describe, it, expect } from "vitest";
import {
  normalizeRole,
  toDisplayRole,
  getHomePage,
  getAllowedPages,
  canSeePrice,
  canSeeFovallalkozo,
  DB_ROLES,
} from "./roles";

describe("roles – szerepkör normalizálás", () => {
  it("a kisbetűs DB szerepköröket változatlanul adja vissza", () => {
    expect(normalizeRole("admin")).toBe("admin");
    expect(normalizeRole("projektmenedzser")).toBe("projektmenedzser");
    expect(normalizeRole("iroda")).toBe("iroda");
    expect(normalizeRole("telepito")).toBe("telepito");
  });

  it("a régi magyar UI-címkéket kanonikus DB kulccsá alakítja", () => {
    expect(normalizeRole("Admin")).toBe("admin");
    expect(normalizeRole("Projektmenedzser")).toBe("projektmenedzser");
    expect(normalizeRole("Iroda/Könyvelés")).toBe("iroda");
    expect(normalizeRole("Telepítő")).toBe("telepito");
  });

  it("kis-nagybetűtől és felesleges szóköztől függetlenül normalizál", () => {
    expect(normalizeRole("  TELEPÍTŐ ")).toBe("telepito");
    expect(normalizeRole("ADMIN")).toBe("admin");
  });

  it("ismeretlen / üres bemenetre null", () => {
    expect(normalizeRole("valami")).toBeNull();
    expect(normalizeRole("")).toBeNull();
    expect(normalizeRole(null)).toBeNull();
    expect(normalizeRole(undefined)).toBeNull();
  });

  it("toDisplayRole visszaadja a régi magyar címkét", () => {
    expect(toDisplayRole("telepito")).toBe("Telepítő");
    expect(toDisplayRole("iroda")).toBe("Iroda/Könyvelés");
    expect(toDisplayRole("Admin")).toBe("Admin");
  });

  it("a DB_ROLES a négy engedélyezett szerepkört tartalmazza", () => {
    expect(DB_ROLES).toEqual(["admin", "projektmenedzser", "iroda", "telepito"]);
  });
});

describe("roles – jogosultsági segédfüggvények mindkét jelöléssel", () => {
  it("getHomePage: telepítő → munkalapok, egyéb → dashboard", () => {
    expect(getHomePage("telepito")).toBe("munkalapok");
    expect(getHomePage("Telepítő")).toBe("munkalapok");
    expect(getHomePage("admin")).toBe("dashboard");
    expect(getHomePage("Iroda/Könyvelés")).toBe("dashboard");
  });

  it("canSeePrice: iroda/pm/admin igen, telepítő nem", () => {
    expect(canSeePrice("admin")).toBe(true);
    expect(canSeePrice("iroda")).toBe(true);
    expect(canSeePrice("Projektmenedzser")).toBe(true);
    expect(canSeePrice("telepito")).toBe(false);
    expect(canSeePrice("Telepítő")).toBe(false);
  });

  it("canSeeFovallalkozo: telepítő nem, más igen", () => {
    expect(canSeeFovallalkozo("telepito")).toBe(false);
    expect(canSeeFovallalkozo("admin")).toBe(true);
  });

  it("getAllowedPages: telepítő csak a munkalapokat kapja", () => {
    expect(getAllowedPages("telepito")).toEqual(["munkalapok"]);
    expect(getAllowedPages("Telepítő")).toEqual(["munkalapok"]);
    expect(getAllowedPages("admin")).toContain("beallitasok");
  });
});
