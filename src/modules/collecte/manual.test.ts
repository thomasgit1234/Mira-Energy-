import { describe, expect, it } from "vitest";
import { parseKwh, validateManualEntry } from "./manual";

const NOW = new Date("2026-10-07T12:00:00Z");
const twelve = (fill: (i: number) => string) => Array.from({ length: 12 }, (_, i) => fill(i));
const codes = (r: ReturnType<typeof validateManualEntry>) => r.issues.map((i) => i.code);

describe("parseKwh — nombres à la française", () => {
  it("lit un entier", () => expect(parseKwh("3000")).toBe(3000));
  it("lit une virgule décimale", () => expect(parseKwh("1234,5")).toBe(1234.5));
  it("ignore les espaces de milliers (y compris insécables)", () => {
    expect(parseKwh("1 234,5")).toBe(1234.5);
    expect(parseKwh("12 345")).toBe(12345);
    expect(parseKwh("12 345")).toBe(12345);
  });
  it("renvoie null pour une case vide", () => {
    expect(parseKwh("")).toBeNull();
    expect(parseKwh("   ")).toBeNull();
  });
  it("renvoie NaN pour du texte", () => {
    expect(parseKwh("abc")).toBeNaN();
    expect(parseKwh("12kWh")).toBeNaN();
    expect(parseKwh("1,2,3")).toBeNaN();
  });
});

describe("validateManualEntry", () => {
  it("accepte une année complète et calcule le total", () => {
    const r = validateManualEntry({ year: 2023, energyType: "ELECTRICITY", months: twelve(() => "1000") }, NOW);
    expect(r.ok).toBe(true);
    expect(r.months).toHaveLength(12);
    expect(r.total).toBe(12000);
  });

  it("accepte une année partielle : les cases vides ne sont pas envoyées", () => {
    const r = validateManualEntry({ year: 2023, energyType: "GAS", months: twelve((i) => (i < 3 ? "500,5" : "")) }, NOW);
    expect(r.ok).toBe(true);
    expect(r.months).toEqual([{ month: 1, kwh: 500.5 }, { month: 2, kwh: 500.5 }, { month: 3, kwh: 500.5 }]);
    expect(r.total).toBe(1501.5);
  });

  it("accepte 0 kWh (local fermé)", () => {
    const r = validateManualEntry({ year: 2023, energyType: "GAS", months: twelve((i) => (i === 7 ? "0" : "")) }, NOW);
    expect(r.ok).toBe(true);
    expect(r.months).toEqual([{ month: 8, kwh: 0 }]);
  });

  it("refuse une saisie entièrement vide", () => {
    const r = validateManualEntry({ year: 2023, energyType: "ELECTRICITY", months: twelve(() => "") }, NOW);
    expect(codes(r)).toEqual(["NO_MONTH"]);
  });

  it("refuse un texte et indique le mois", () => {
    const r = validateManualEntry({ year: 2023, energyType: "ELECTRICITY", months: twelve((i) => (i === 2 ? "beaucoup" : "100")) }, NOW);
    expect(r.ok).toBe(false);
    expect(r.issues).toEqual([expect.objectContaining({ code: "INVALID_KWH", month: 3 })]);
    expect(r.issues[0].message).toContain("Mars");
  });

  it("refuse une valeur négative", () => {
    const r = validateManualEntry({ year: 2023, energyType: "ELECTRICITY", months: twelve((i) => (i === 0 ? "-5" : "")) }, NOW);
    expect(r.issues).toEqual([expect.objectContaining({ code: "NEGATIVE_KWH", month: 1 })]);
  });

  it("refuse une année avant 2010 ou dans le futur", () => {
    const months = twelve(() => "1");
    expect(codes(validateManualEntry({ year: 2009, energyType: "GAS", months }, NOW))).toEqual(["INVALID_YEAR"]);
    expect(codes(validateManualEntry({ year: 2027, energyType: "GAS", months }, NOW))).toEqual(["INVALID_YEAR"]);
    expect(validateManualEntry({ year: 2026, energyType: "GAS", months }, NOW).ok).toBe(true);
  });

  it("refuse une énergie inconnue", () => {
    const r = validateManualEntry({ year: 2023, energyType: "FIOUL", months: twelve(() => "1") }, NOW);
    expect(codes(r)).toEqual(["INVALID_ENERGY"]);
  });

  it("refuse un nombre de mois différent de 12", () => {
    const r = validateManualEntry({ year: 2023, energyType: "GAS", months: ["1", "2"] }, NOW);
    expect(codes(r)).toEqual(["WRONG_MONTH_COUNT"]);
  });
});
