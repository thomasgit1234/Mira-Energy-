import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CLIMATE_FILE, readClimateFile, type ClimateYear } from "./coefficients-source";
import {
  boundedCoefficient, correctKwh, correctYear, kwhPerM2, referenceDegreeDays, validateShares, yearCoefficients,
  type ReferenceDegreeDays, type UsageShares, type YearCoefficients,
} from "./correction";
import { efaCategory, sharesFor } from "./usage-shares";

// Le VRAI fichier fourni par Mira (station Saint-Quentin 02320001), lu une fois.
const real = readClimateFile(join(process.cwd(), CLIMATE_FILE));
const reference = referenceDegreeDays(real.rows) as ReferenceDegreeDays;
const coef2023 = yearCoefficients(real.rows, reference, 2023) as YearCoefficients;

const shares = (heating: number, cooling: number, other = 1 - heating - cooling): UsageShares => ({ heating, cooling, other });

describe("référence 2001-2020 calculée depuis le fichier (pas de constante en dur)", () => {
  it("fichier lu sans problème", () => {
    expect(real.issues).toEqual([]);
    expect(real.rows).toHaveLength(25);
  });
  it("chauffage 2791,295 ; climatisation 233,755", () => {
    expect(reference.heating).toBeCloseTo(2791.295, 6);
    expect(reference.cooling).toBeCloseTo(233.755, 6);
  });
  it("une année de la période manque → null (jamais une moyenne partielle)", () => {
    expect(referenceDegreeDays(real.rows.filter((r) => r.year !== 2010))).toBeNull();
    expect(referenceDegreeDays([])).toBeNull();
  });
});

describe("coefficients bornés entre 0,5 et 2", () => {
  it("2023 : chauffage 1,14196 ; climatisation 0,75968 (non bornés)", () => {
    expect(coef2023.heating?.value).toBeCloseTo(1.14196, 5);
    expect(coef2023.cooling?.value).toBeCloseTo(0.75968, 5);
    expect(coef2023.heating?.clamped).toBe(false);
  });
  it("cas limite haut : référence 3 000 / année 1 000 = 3 → borné à 2", () => {
    expect(boundedCoefficient(3000, 1000)).toEqual({ value: 2, clamped: true });
  });
  it("cas limite bas : référence 1 000 / année 4 000 = 0,25 → borné à 0,5", () => {
    expect(boundedCoefficient(1000, 4000)).toEqual({ value: 0.5, clamped: true });
  });
  it("exactement sur les bornes : non signalé comme borné", () => {
    expect(boundedCoefficient(2000, 1000)).toEqual({ value: 2, clamped: false });
    expect(boundedCoefficient(500, 1000)).toEqual({ value: 0.5, clamped: false });
  });
  it("valeur nulle, négative ou absente → null (jamais 0 ni 1 par défaut)", () => {
    expect(boundedCoefficient(2791, 0)).toBeNull();
    expect(boundedCoefficient(2791, -5)).toBeNull();
    expect(boundedCoefficient(2791, undefined)).toBeNull();
    expect(boundedCoefficient(Number.NaN, 2000)).toBeNull();
  });
  it("année absente du fichier → null (non corrigeable)", () => {
    expect(yearCoefficients(real.rows, reference, 2026)).toBeNull();
    expect(yearCoefficients(real.rows, reference, 1999)).toBeNull();
  });
});

describe("parts d'usage", () => {
  it("parts valides : 25 % + 0 % + 75 %", () => {
    expect(validateShares(shares(0.25, 0))).toEqual({ ok: true });
  });
  it("parts qui ne totalisent pas 100 % → refusées, aucune correction", () => {
    const bad = { heating: 0.25, cooling: 0.1, other: 0.5 };
    expect(validateShares(bad)).toEqual({ ok: false, message: "les parts totalisent 85 % au lieu de 100 %" });
    expect(correctKwh(1000, bad, coef2023)).toBeNull();
    expect(validateShares({ heating: 0.8, cooling: 0.4, other: -0.2 }).ok).toBe(false);
  });
  it("table des hypothèses Mira : restaurant gaz 0 %, restaurant élec 25 %, bureaux propane 100 %, bureaux élec 25 %", () => {
    expect(sharesFor("CAP18", "GAS")).toEqual(shares(0, 0));
    expect(sharesFor("CAP18", "ELECTRICITY")).toEqual(shares(0.25, 0));
    expect(sharesFor("CAP04", "PROPANE")).toEqual(shares(1, 0));
    expect(sharesFor("CAP04", "ELECTRICITY")).toEqual(shares(0.25, 0));
  });
  it("énergie ou activité sans part connue → null (pas de part inventée)", () => {
    expect(sharesFor("CAP04", "GAS")).toBeNull();
    expect(sharesFor("CAP99", "ELECTRICITY")).toBeNull();
    expect(sharesFor(null, "ELECTRICITY")).toBeNull();
  });
  it("catégorie de l'EFA : unique, sinon inconnue", () => {
    expect(efaCategory([{ categoryCode: "CAP18" }, { categoryCode: "CAP18" }])).toBe("CAP18");
    expect(efaCategory([{ categoryCode: "CAP18" }, { categoryCode: "CAP04" }])).toBeNull();
    expect(efaCategory([])).toBeNull();
  });
});

describe("test de référence — exemple de la gérante de Mira, année 2023 (tolérance 1 kWh)", () => {
  const fix = (kwh: number, category: string, energy: string) => correctKwh(kwh, sharesFor(category, energy)!, coef2023)!;

  it("bureaux propane : 72 627 kWh, 100 % chauffage → 82 937 kWh", () => {
    expect(Math.abs(fix(72627, "CAP04", "PROPANE") - 82937)).toBeLessThanOrEqual(1);
  });
  it("bureaux électricité (1/4 du PRM) : 56 048 kWh, 25 % chauffage → 58 037 kWh", () => {
    expect(Math.abs(fix(56048, "CAP04", "ELECTRICITY") - 58037)).toBeLessThanOrEqual(1);
  });
  it("total bureaux : 128 675 → 140 974 kWh (+9,6 %)", () => {
    const total = fix(72627, "CAP04", "PROPANE") + fix(56048, "CAP04", "ELECTRICITY");
    expect(72627 + 56048).toBe(128675);
    expect(Math.abs(total - 140974)).toBeLessThanOrEqual(1);
    expect(Math.round((total / 128675 - 1) * 1000) / 10).toBe(9.6);
  });
  it("restaurant électricité : 168 146 kWh, 25 % chauffage → 174 114 kWh", () => {
    expect(Math.abs(fix(168146, "CAP18", "ELECTRICITY") - 174114)).toBeLessThanOrEqual(1);
  });
  it("restaurant gaz : 49 000 kWh → 49 000 kWh (inchangé)", () => {
    expect(fix(49000, "CAP18", "GAS")).toBe(49000);
  });
  it("total restaurant : 217 146 → 223 114 kWh", () => {
    const total = fix(168146, "CAP18", "ELECTRICITY") + fix(49000, "CAP18", "GAS");
    expect(168146 + 49000).toBe(217146);
    expect(Math.abs(total - 223114)).toBeLessThanOrEqual(1);
  });
  it("même résultat en application MENSUELLE (12 mois de 1/12) via correctYear", () => {
    const months = (annual: number) => Array.from({ length: 12 }, (_, i) => ({ month: i + 1, kwh: annual / 12 }));
    const r = correctYear({
      year: 2023,
      category: "CAP04",
      coefficients: coef2023,
      energies: [{ energyType: "PROPANE", months: months(72627) }, { energyType: "ELECTRICITY", months: months(56048) }],
    });
    expect(r.status).toBe("CORRIGEE");
    expect(r.rawKwh).toBeCloseTo(128675, 6);
    expect(Math.abs(r.correctedKwh! - 140974)).toBeLessThanOrEqual(1);
    expect(r.months).toHaveLength(12);
    expect(Math.abs(r.months.reduce((s, m) => s + m.correctedKwh!, 0) - r.correctedKwh!)).toBeLessThan(0.1);
    expect(r.unknownShares).toEqual([]);
  });
});

describe("correctYear — cas particuliers", () => {
  const twelve = (kwh: number) => Array.from({ length: 12 }, (_, i) => ({ month: i + 1, kwh }));

  it("année absente du fichier → NON_CORRIGEABLE, corrigée null, brute conservée", () => {
    const r = correctYear({ year: 2026, category: "CAP18", coefficients: null, energies: [{ energyType: "ELECTRICITY", months: twelve(1000) }] });
    expect(r.status).toBe("NON_CORRIGEABLE");
    expect(r.rawKwh).toBe(12000);
    expect(r.correctedKwh).toBeNull();
    expect(r.months.every((m) => m.correctedKwh === null)).toBe(true);
    expect(r.problem).toContain("2026");
  });
  it("énergie sans part connue : corrigée = brute, et signalée", () => {
    const r = correctYear({ year: 2023, category: "CAP04", coefficients: coef2023, energies: [{ energyType: "GAS", months: twelve(1000) }] });
    expect(r.status).toBe("CORRIGEE");
    expect(r.correctedKwh).toBe(12000);
    expect(r.unknownShares).toEqual(["GAS"]);
  });
  it("chaque mois utilise le coefficient de SON année (2010 froide ≠ 2023 douce)", () => {
    const coef2010 = yearCoefficients(real.rows, reference, 2010)!;
    const a = correctYear({ year: 2010, category: "CAP04", coefficients: coef2010, energies: [{ energyType: "PROPANE", months: twelve(1000) }] });
    const b = correctYear({ year: 2023, category: "CAP04", coefficients: coef2023, energies: [{ energyType: "PROPANE", months: twelve(1000) }] });
    expect(a.correctedKwh!).toBeLessThan(12000); // hiver plus froid que la référence → corrigée < brute
    expect(b.correctedKwh!).toBeGreaterThan(12000);
  });
  it("climatisation présente mais coefficient non calculable (valeur 0) → non corrigeable, jamais 0", () => {
    const rows: ClimateYear[] = [{ year: 2023, heatingDegreeDays: 2400, coolingDegreeDays: 0 }];
    const coefs = yearCoefficients(rows, { heating: 2800, cooling: 230 }, 2023)!;
    expect(coefs.cooling).toBeNull();
    expect(correctKwh(1000, shares(0, 0.5), coefs)).toBeNull();
    expect(correctKwh(1000, shares(0.25, 0), coefs)).toBeCloseTo(250 * (2800 / 2400) + 750, 6); // clim à 0 % : pas besoin
  });
});

describe("kWh/m²", () => {
  it("140 974 kWh / 500 m² = 281,95", () => {
    expect(kwhPerM2(140974, 500)).toBe(281.95);
  });
  it("surface absente, nulle ou négative → null", () => {
    expect(kwhPerM2(1000, null)).toBeNull();
    expect(kwhPerM2(1000, 0)).toBeNull();
    expect(kwhPerM2(1000, -10)).toBeNull();
    expect(kwhPerM2(null, 500)).toBeNull();
  });
});
