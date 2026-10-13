import { describe, expect, it } from "vitest";
import type { DjuEntry } from "./dju-source";
import { buildYearIndicators, computeKwhPerDju, findDju, isValidDju, normalizeZone, type ConsumptionInput } from "./indicators";

const STATION = "02037002";
const TABLE: DjuEntry[] = [
  { zone: STATION, year: 2019, dju: 2485.9 },
  { zone: STATION, year: 2020, dju: 2272.3 },
  { zone: STATION, year: 2025, dju: 2353.7 },
  { zone: "02320001", year: 2019, dju: 2569.5 },
];
const fullYear = (year: number, energyType: string, kwhPerMonth: number | ((m: number) => number)): ConsumptionInput => ({
  year,
  energyType,
  months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, kwh: typeof kwhPerMonth === "number" ? kwhPerMonth : kwhPerMonth(i + 1) })),
});
// Profil du seed « Dupont » : 3 600 kWh/mois + 900 en hiver (5 mois) = 47 700 kWh en 2019.
const seed2019 = fullYear(2019, "ELECTRICITY", (m) => 3600 + (m <= 3 || m >= 11 ? 900 : 0));

describe("4.2 — normalizeZone / findDju / isValidDju", () => {
  it("normalise la zone (casse, espaces)", () => {
    expect(normalizeZone(" 0203 7002 ")).toBe("02037002");
    expect(normalizeZone("h1a")).toBe("H1A");
  });
  it("trouve le DJU de la zone et de l'année, ou null", () => {
    expect(findDju(TABLE, STATION, 2019)).toBe(2485.9);
    expect(findDju(TABLE, " 0203 7002 ", 2019)).toBe(2485.9);
    expect(findDju(TABLE, "02320001", 2019)).toBe(2569.5);
    expect(findDju(TABLE, STATION, 2018)).toBeNull();
    expect(findDju(TABLE, "INCONNUE", 2019)).toBeNull();
  });
  it("n'accepte qu'un DJU fini et strictement positif", () => {
    expect(isValidDju(2485.9)).toBe(true);
    for (const v of [0, -10, Number.NaN, Number.POSITIVE_INFINITY, "2485", null, undefined]) expect(isValidDju(v)).toBe(false);
  });
});

describe("4.3 — computeKwhPerDju", () => {
  it("calcul nominal : 47 700 / 2 485,9 = 19,19", () => expect(computeKwhPerDju(47700, 2485.9)).toBe(19.19));
  it("arrondit à 2 décimales", () => {
    expect(computeKwhPerDju(40500, 2353.7)).toBe(17.21); // 17,2069…
    expect(computeKwhPerDju(100, 3)).toBe(33.33);
    expect(computeKwhPerDju(200, 3)).toBe(66.67);
  });
  it("ne divise jamais par un DJU nul, négatif, NaN ou non numérique", () => {
    expect(computeKwhPerDju(47700, 0)).toBeNull();
    expect(computeKwhPerDju(47700, -2485.9)).toBeNull();
    expect(computeKwhPerDju(47700, Number.NaN)).toBeNull();
    expect(computeKwhPerDju(47700, "2485,9")).toBeNull();
    expect(computeKwhPerDju(47700, null)).toBeNull();
  });
  it("consommation nulle → 0 ; consommation invalide → null", () => {
    expect(computeKwhPerDju(0, 2485.9)).toBe(0);
    expect(computeKwhPerDju(Number.NaN, 2485.9)).toBeNull();
    expect(computeKwhPerDju(-5, 2485.9)).toBeNull();
  });
});

describe("4.3 — buildYearIndicators", () => {
  it("année complète avec DJU → OK et 19,19", () => {
    const rows = buildYearIndicators({ zone: STATION, djuTable: TABLE, consumptions: [seed2019] });
    expect(rows.find((r) => r.year === 2019)).toEqual({
      year: 2019, consumptionKwh: 47700, monthCount: 12, dju: 2485.9, kwhPerDju: 19.19, status: "OK",
    });
  });

  it("fait l'union des années (consommation ∪ DJU de la station) et trie", () => {
    const rows = buildYearIndicators({ zone: STATION, djuTable: TABLE, consumptions: [fullYear(2018, "GAS", 100), seed2019] });
    expect(rows.map((r) => [r.year, r.status])).toEqual([
      [2018, "DJU_MANQUANT"],
      [2019, "OK"],
      [2020, "PAS_DE_CONSOMMATION"],
      [2025, "PAS_DE_CONSOMMATION"],
    ]);
  });

  it("ignore les DJU des autres stations", () => {
    const rows = buildYearIndicators({ zone: "02320001", djuTable: TABLE, consumptions: [] });
    expect(rows.map((r) => r.year)).toEqual([2019]);
  });

  it("PAS_DE_CONSOMMATION : aucune valeur calculée", () => {
    const [row] = buildYearIndicators({ zone: STATION, djuTable: [TABLE[1]], consumptions: [{ year: 2020, energyType: "GAS", months: [] }] });
    expect(row).toEqual({ year: 2020, consumptionKwh: null, monthCount: 0, dju: 2272.3, kwhPerDju: null, status: "PAS_DE_CONSOMMATION" });
  });

  it("DJU_MANQUANT quand le DJU est absent, nul, négatif ou NaN : kWh/DJU = null", () => {
    for (const dju of [0, -1, Number.NaN]) {
      const [row] = buildYearIndicators({ zone: STATION, djuTable: [{ zone: STATION, year: 2019, dju }], consumptions: [seed2019] });
      expect(row.status).toBe("DJU_MANQUANT");
      expect(row.kwhPerDju).toBeNull();
      expect(row.dju).toBeNull();
      expect(row.consumptionKwh).toBe(47700);
    }
  });

  it("ANNEE_INCOMPLETE : valeur calculée mais signalée", () => {
    const partial: ConsumptionInput = { year: 2019, energyType: "ELECTRICITY", months: [{ month: 1, kwh: 4500 }, { month: 2, kwh: 4500 }] };
    const [row] = buildYearIndicators({ zone: STATION, djuTable: [TABLE[0]], consumptions: [partial] });
    expect(row).toMatchObject({ status: "ANNEE_INCOMPLETE", monthCount: 2, consumptionKwh: 9000, kwhPerDju: 3.62 });
  });

  it("somme deux énergies ; incomplète si l'une des deux n'a pas ses 12 mois", () => {
    const gas = fullYear(2019, "GAS", 1000);
    const [ok] = buildYearIndicators({ zone: STATION, djuTable: [TABLE[0]], consumptions: [seed2019, gas] });
    expect(ok).toMatchObject({ status: "OK", consumptionKwh: 59700, kwhPerDju: 24.02 });
    const gasPartial = { ...gas, months: gas.months.slice(0, 6) };
    const [partial] = buildYearIndicators({ zone: STATION, djuTable: [TABLE[0]], consumptions: [seed2019, gasPartial] });
    expect(partial).toMatchObject({ status: "ANNEE_INCOMPLETE", monthCount: 12, consumptionKwh: 53700 });
  });

  it("consommation nulle (12 mois à 0 kWh) → OK et 0", () => {
    const [row] = buildYearIndicators({ zone: STATION, djuTable: [TABLE[0]], consumptions: [fullYear(2019, "GAS", 0)] });
    expect(row).toMatchObject({ status: "OK", consumptionKwh: 0, kwhPerDju: 0 });
  });

  it("zone du bâtiment écrite avec espaces ou en minuscules", () => {
    const rows = buildYearIndicators({ zone: " 0203 7002 ", djuTable: TABLE, consumptions: [seed2019] });
    expect(rows.find((r) => r.year === 2019)?.kwhPerDju).toBe(19.19);
  });

  it("valeurs de la démo avec les vrais DJU : 2025 = 40 500 / 2 353,7 = 17,21", () => {
    const seed2025 = fullYear(2025, "ELECTRICITY", (m) => 3000 + (m <= 3 || m >= 11 ? 900 : 0));
    const rows = buildYearIndicators({ zone: STATION, djuTable: TABLE, consumptions: [seed2019, seed2025] });
    expect(rows.filter((r) => r.status === "OK").map((r) => [r.year, r.kwhPerDju])).toEqual([[2019, 19.19], [2025, 17.21]]);
  });
});
