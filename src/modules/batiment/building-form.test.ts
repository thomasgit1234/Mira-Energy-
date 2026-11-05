import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSurface, stationDepartment, validateBuildingInput, zoneForPostcode, type BuildingInput } from "./building-form";
import { DEPARTMENT_ZONES_FILE, readDepartmentZones } from "./zone-climatique";

// Site de démonstration (fictif) de Laon : bâtiment 1 700 m², EFA restauration 1 200 m² + bureaux 500 m², station 02320001.
const LAON: BuildingInput = { address: "Site de démonstration (fictif)", postcode: "02000", city: "Laon", rnbId: "", surfaceTotal: "1 700" };
const CTX = { efaSurfaces: [1200, 500], stationCode: "02320001" };
// Vraie table département → zone du dépôt (référentiel OPERAT v9.0).
const ZONES = readDepartmentZones(join(process.cwd(), DEPARTMENT_ZONES_FILE)).rows;

describe("1.1 — contrôle de la fiche bâtiment", () => {
  it("site de Laon : accepté, données nettoyées, ID-RNB vide = null", () => {
    expect(validateBuildingInput(LAON, CTX)).toEqual({
      ok: true,
      data: { address: "Site de démonstration (fictif)", postcode: "02000", city: "Laon", rnbId: null, surfaceTotal: 1700 },
      warnings: [],
    });
  });

  it("ID-RNB saisi avec tirets : normalisé", () => {
    const r = validateBuildingInput({ ...LAON, rnbId: "ezns-vn9p-d1h5" }, CTX);
    expect(r.ok && r.data.rnbId).toBe("EZNSVN9PD1H5");
  });

  it("champs obligatoires et formats : un message par champ", () => {
    const r = validateBuildingInput({ address: " ", postcode: "2000", city: "", rnbId: "ABC", surfaceTotal: "" }, CTX);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.issues.map((i) => i.field)).toEqual(["address", "postcode", "city", "rnbId", "surfaceTotal"]);
  });

  it("surface du bâtiment inférieure à la somme des EFA (1 200 + 500) : refusée", () => {
    const r = validateBuildingInput({ ...LAON, surfaceTotal: "1 600" }, CTX);
    expect(r).toMatchObject({ ok: false, issues: [{ field: "surfaceTotal" }] });
    expect(!r.ok && r.issues[0].message).toContain("EFA (1 700 m²)");
    // EFA sans surface propre (null) : ne compte pas dans la somme.
    expect(validateBuildingInput({ ...LAON, surfaceTotal: 1200 }, { ...CTX, efaSurfaces: [1200, null] }).ok).toBe(true);
  });

  it("surface : virgule décimale, espaces (y compris insécables), valeurs absurdes refusées", () => {
    expect(parseSurface("1 700,5")).toBe(1700.5);
    expect(parseSurface("1 700")).toBe(1700);
    expect(Number.isNaN(parseSurface("douze"))).toBe(true);
    expect(validateBuildingInput({ ...LAON, surfaceTotal: "0" }, CTX).ok).toBe(false);
    expect(validateBuildingInput({ ...LAON, surfaceTotal: "20000000" }, CTX).ok).toBe(false);
  });

  it("code postal hors du département de la station : enregistrable, avec un avertissement", () => {
    const r = validateBuildingInput({ ...LAON, postcode: "75011", city: "Paris" }, CTX);
    expect(r.ok).toBe(true);
    expect(r.warnings[0]).toContain("02320001");
    expect(stationDepartment("02320001")).toBe("02");
    expect(stationDepartment("Saint-Quentin")).toBeNull();
  });
});

describe("1.2 — zone climatique déduite du code postal (vraie table OPERAT)", () => {
  it("02000 Laon → H1a ; 75011 → H1a ; 13001 → H3", () => {
    expect(zoneForPostcode(ZONES, "02000")).toEqual({ ok: true, department: "02", zone: "H1a" });
    expect(zoneForPostcode(ZONES, "75011")).toMatchObject({ ok: true, zone: "H1a" });
    expect(zoneForPostcode(ZONES, "13001")).toMatchObject({ ok: true, zone: "H3" });
  });
  it("jamais de zone devinée : Corse, Hérault, code postal incomplet, table indisponible", () => {
    expect(zoneForPostcode(ZONES, "20000")).toMatchObject({ ok: false, code: "CORSE_AMBIGUE" });
    expect(zoneForPostcode(ZONES, "34000")).toMatchObject({ ok: false, code: "PLUSIEURS_ZONES" });
    expect(zoneForPostcode(ZONES, "020")).toMatchObject({ ok: false, code: "CODE_POSTAL_INVALIDE" });
    expect(zoneForPostcode(null, "02000", "fichier absent")).toEqual({ ok: false, code: "DEPARTEMENT_ABSENT", message: "fichier absent" });
  });
});
