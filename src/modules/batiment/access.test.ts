import { describe, expect, it } from "vitest";
import { canAccessEfa, canEditBuilding, isUserRole, visibleEfaIds, type AccessEfa } from "./access";

// Site de démonstration (fictif) : M. Dupont, propriétaire, rattaché au bâtiment ; le locataire des bureaux est rattaché
// au bâtiment ET occupant des bureaux. Un second locataire et un autre bâtiment servent de témoins.
const DUPONT = { id: "dupont", role: "OWNER" };
const LOCATAIRE = { id: "locataire", role: "TENANT" };
const AUTRE_LOCATAIRE = { id: "autre-locataire", role: "TENANT" };
const AUTRE_PROPRIO = { id: "autre-proprio", role: "OWNER" };

const RESTO: AccessEfa = { id: "resto", buildingUserIds: ["dupont", "locataire"], occupantIds: [] };
const BUREAUX: AccessEfa = { id: "resto-bureaux", buildingUserIds: ["dupont", "locataire"], occupantIds: ["locataire"] };
const AILLEURS: AccessEfa = { id: "ailleurs", buildingUserIds: ["autre-proprio"], occupantIds: ["autre-locataire"] };
const ALL = [BUREAUX, AILLEURS, RESTO];

describe("9.3 — cloisonnement propriétaire / locataire (D22)", () => {
  it("le propriétaire voit toutes les EFA de son bâtiment, et seulement celles-là (triées par id)", () => {
    expect(visibleEfaIds(DUPONT, ALL)).toEqual(["resto", "resto-bureaux"]);
  });

  it("le locataire ne voit QUE l'EFA dont il est occupant, même rattaché au bâtiment", () => {
    expect(visibleEfaIds(LOCATAIRE, ALL)).toEqual(["resto-bureaux"]);
    expect(canAccessEfa(LOCATAIRE, RESTO)).toBe(false);
  });

  it("aucune fuite entre bâtiments : chacun reste dans son périmètre", () => {
    expect(visibleEfaIds(AUTRE_LOCATAIRE, ALL)).toEqual(["ailleurs"]);
    expect(visibleEfaIds(AUTRE_PROPRIO, ALL)).toEqual(["ailleurs"]);
    expect(canAccessEfa(DUPONT, AILLEURS)).toBe(false);
  });

  it("l'administrateur suit la règle du propriétaire (ses bâtiments seulement)", () => {
    expect(visibleEfaIds({ id: "dupont", role: "ADMIN" }, ALL)).toEqual(["resto", "resto-bureaux"]);
  });

  it("rôle inconnu ou mal écrit : aucune EFA (refus par défaut)", () => {
    expect(visibleEfaIds({ id: "dupont", role: "owner" }, ALL)).toEqual([]);
    expect(visibleEfaIds({ id: "dupont", role: "" }, ALL)).toEqual([]);
    expect(isUserRole("owner")).toBe(false);
    expect(isUserRole("TENANT")).toBe(true);
  });

  it("fiche bâtiment : modifiable par le propriétaire et l'administrateur, pas par le locataire", () => {
    expect(canEditBuilding(DUPONT)).toBe(true);
    expect(canEditBuilding({ id: "x", role: "ADMIN" })).toBe(true);
    expect(canEditBuilding(LOCATAIRE)).toBe(false);
    expect(canEditBuilding({ id: "x", role: "INCONNU" })).toBe(false);
  });
});
