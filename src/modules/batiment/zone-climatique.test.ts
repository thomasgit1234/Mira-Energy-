import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { climateZoneForPostcode, DEPARTMENT_ZONES_FILE, departmentFromPostcode, parseDepartmentZones, readDepartmentZones } from "./zone-climatique";

// Petite table construite par les tests (la vraie n'est que lue, dans le dernier bloc).
const HEADER = "departement;zone_climatique;remarque";
const file = (...lines: string[]) => [HEADER, ...lines].join("\n") + "\n";
const SAMPLE = file("02;H1a;", "2A;H3;", "2B;H3;", "34;H2c/H3;plusieurs zones : choisir via la station la plus proche", "971;Guadeloupe;");
const rows = parseDepartmentZones(SAMPLE).rows;

describe("departmentFromPostcode (pure)", () => {
  it("métropole : 2 premiers chiffres", () => {
    expect(departmentFromPostcode("02000")).toEqual({ ok: true, department: "02" });
    expect(departmentFromPostcode("75 001")).toEqual({ ok: true, department: "75" });
  });
  it("DOM : 3 premiers chiffres", () => {
    expect(departmentFromPostcode("97100")).toEqual({ ok: true, department: "971" });
  });
  it("Corse : 2A / 2B ambigu", () => {
    const r = departmentFromPostcode("20000");
    expect(r).toMatchObject({ ok: false, code: "CORSE_AMBIGUE" });
    expect(!r.ok && r.message).toMatch(/2A ou 2B ambigu/);
  });
  it("code postal mal formé", () => {
    for (const p of ["", "2000", "020000", "02A00"]) expect(departmentFromPostcode(p)).toMatchObject({ ok: false, code: "CODE_POSTAL_INVALIDE" });
  });
});

describe("climateZoneForPostcode", () => {
  it("Laon 02000 → H1a", () => {
    expect(climateZoneForPostcode(rows, "02000")).toEqual({ ok: true, department: "02", zone: "H1a" });
  });
  it("Hérault (34) : plusieurs zones, choisir via la station", () => {
    const r = climateZoneForPostcode(rows, "34000");
    expect(r).toMatchObject({ ok: false, code: "PLUSIEURS_ZONES" });
    expect(!r.ok && r.message).toMatch(/H2c, H3.*choisir via la station/);
  });
  it("Corse (20xxx) : erreur, pas de zone devinée même si 2A et 2B sont en H3", () => {
    expect(climateZoneForPostcode(rows, "20090")).toMatchObject({ ok: false, code: "CORSE_AMBIGUE" });
  });
  it("DOM : zone non définie dans le référentiel", () => {
    expect(climateZoneForPostcode(rows, "97110")).toMatchObject({ ok: false, code: "ZONE_NON_DEFINIE" });
  });
  it("département absent de la table", () => {
    expect(climateZoneForPostcode(rows, "75001")).toMatchObject({ ok: false, code: "DEPARTEMENT_ABSENT" });
  });
});

describe("parseDepartmentZones — format", () => {
  it("lit zones simples, multiples et non définies", () => {
    const r = parseDepartmentZones(SAMPLE);
    expect(r.issues).toEqual([]);
    expect(r.rows.find((x) => x.department === "34")?.zones).toEqual(["H2c", "H3"]);
    expect(r.rows.find((x) => x.department === "971")).toEqual({ department: "971", zones: [], rawZone: "Guadeloupe", remark: "" });
  });
  it("colonne manquante", () => {
    expect(parseDepartmentZones("departement;zone\n02;H1a\n").issues[0]).toMatch(/Colonne\(s\) manquante\(s\).*zone_climatique, remarque/);
  });
  it("doublon, département invalide, zone vide ou illisible", () => {
    const r = parseDepartmentZones(file("02;H1a;", "02;H1b;", "2C;H3;", "03;;", "04;H1a/H9;"));
    expect(r.issues).toEqual([
      "Ligne 3 : département 02 en double.",
      "Ligne 4 : département « 2C » invalide.",
      "Ligne 5 : zone vide pour le département 03.",
      "Ligne 6 : zone « H1a/H9 » illisible.",
    ]);
  });
});

describe("vraie table (data/referentiels/operat)", () => {
  const r = readDepartmentZones(join(process.cwd(), DEPARTMENT_ZONES_FILE));
  it("se lit sans problème et donne 02 → H1a", () => {
    expect(r.issues).toEqual([]);
    expect(climateZoneForPostcode(r.rows, "02000")).toEqual({ ok: true, department: "02", zone: "H1a" });
    expect(climateZoneForPostcode(r.rows, "34000")).toMatchObject({ ok: false, code: "PLUSIEURS_ZONES" });
  });
  it("fichier absent → erreur claire", () => {
    expect(() => readDepartmentZones(join(process.cwd(), "absent.csv"))).toThrow(/introuvable/);
  });
});
