import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { YearIndicator, YearStatus } from "@/modules/climat";
import { parseConsumptionCsv, validateImportRows } from "@/modules/collecte";
import {
  INELIGIBLE_REASONS, buildComparatorRows, formatKwh, formatRatio, ineligibleReason, isEligibleRow, isReferenceYearEligible,
} from "./reference";

const NBSP = " "; // séparateur de milliers français (espace fine insécable)
const ind = (year: number, status: YearStatus, consumptionKwh: number | null = null, kwhPerDju: number | null = null): YearIndicator => ({
  year, status, consumptionKwh, kwhPerDju, monthCount: status === "PAS_DE_CONSOMMATION" ? 0 : 12, dju: 2500,
});

describe("5.1 — éligibilité d'une année de référence", () => {
  it.each([[2009, false], [2010, true], [2015, true], [2019, true], [2020, false], [2021, false], [2025, false]])(
    "%i → %s", (year, expected) => expect(isReferenceYearEligible(year)).toBe(expected),
  );

  it("une ligne est éligible si l'année est dans la période ET complète (statut OK du module climat)", () => {
    expect(isEligibleRow(ind(2013, "OK", 52800))).toBe(true);
    expect(isEligibleRow(ind(2011, "ANNEE_INCOMPLETE", 32000))).toBe(false);
    expect(isEligibleRow(ind(2012, "PAS_DE_CONSOMMATION"))).toBe(false);
    expect(isEligibleRow(ind(2014, "DJU_MANQUANT", 45600))).toBe(false);
    expect(isEligibleRow(ind(2021, "OK", 94610))).toBe(false);
  });
});

describe("5.1 — raisons de non-éligibilité", () => {
  it("2020 et 2021 : exclues du suivi des objectifs", () => {
    expect(ineligibleReason(ind(2020, "OK", 1))).toBe(INELIGIBLE_REASONS.EXCLUDED);
    expect(ineligibleReason(ind(2021, "OK", 1))).toBe("2020 et 2021 : exclues du suivi des objectifs");
  });
  it("hors période (2009, 2022 et après)", () => {
    expect(ineligibleReason(ind(2009, "OK", 1))).toBe("hors période de référence 2010-2019");
    expect(ineligibleReason(ind(2025, "OK", 1))).toBe("hors période de référence 2010-2019");
  });
  it("pas de consommation, année incomplète, DJU manquant", () => {
    expect(ineligibleReason(ind(2012, "PAS_DE_CONSOMMATION"))).toBe("pas de consommation");
    expect(ineligibleReason(ind(2011, "ANNEE_INCOMPLETE", 32000))).toBe("année incomplète");
    expect(ineligibleReason(ind(2014, "DJU_MANQUANT", 45600))).toBe("DJU manquant");
  });
  it("aucune raison pour une année éligible", () => expect(ineligibleReason(ind(2013, "OK", 52800))).toBeNull());
});

describe("5.1 — buildComparatorRows", () => {
  const indicators = [ind(2013, "OK", 52800, 17.9), ind(2011, "ANNEE_INCOMPLETE", 32000, 13.54), ind(2019, "OK", 47700, 19.19),
    ind(2021, "OK", 94610, 35.77), ind(2025, "OK", 40500, 17.21), ind(2020, "PAS_DE_CONSOMMATION")];
  const rows = buildComparatorRows(indicators, 2013);

  it("liste 2010 à 2019 (années manquantes complétées) puis les années postérieures, triées", () => {
    expect(rows.map((r) => r.year)).toEqual([2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2025]);
    expect(rows[0]).toEqual({ year: 2010, consumptionKwh: null, kwhPerDju: null, status: "PAS_DE_CONSOMMATION", eligible: false, ineligibleReason: "pas de consommation", isSuggested: false });
  });

  it("marque l'éligibilité, la raison et l'année suggérée", () => {
    const get = (y: number) => rows.find((r) => r.year === y)!;
    expect(get(2013)).toMatchObject({ eligible: true, ineligibleReason: null, isSuggested: true, consumptionKwh: 52800, kwhPerDju: 17.9 });
    expect(get(2011)).toMatchObject({ eligible: false, ineligibleReason: "année incomplète", isSuggested: false });
    expect(get(2019)).toMatchObject({ eligible: true, isSuggested: false });
    expect(get(2021)).toMatchObject({ eligible: false, ineligibleReason: "2020 et 2021 : exclues du suivi des objectifs", consumptionKwh: 94610 });
    expect(get(2025)).toMatchObject({ eligible: false, ineligibleReason: "hors période de référence 2010-2019" });
  });

  it("n'accepte jamais une suggestion non éligible", () => {
    expect(buildComparatorRows(indicators, 2021).some((r) => r.isSuggested)).toBe(false);
    expect(buildComparatorRows(indicators).some((r) => r.isSuggested)).toBe(false);
  });
});

describe("5.1 — formats français", () => {
  it("kWh sans décimale, avec séparateur de milliers", () => {
    expect(formatKwh(266500)).toBe(`266${NBSP}500`);
    expect(formatKwh(56910.5)).toBe(`56${NBSP}911`);
    expect(formatKwh(null)).toBe("—");
  });
  it("kWh/DJU avec 2 décimales et virgule", () => {
    expect(formatRatio(19.19)).toBe("19,19");
    expect(formatRatio(17.2)).toBe("17,20");
    expect(formatRatio(null)).toBe("—");
    expect(formatRatio(Number.NaN)).toBe("—");
  });
});

describe("données de démonstration consommations-demo-2010-2018.csv", () => {
  const text = readFileSync(join(process.cwd(), "public", "exemples", "consommations-demo-2010-2018.csv"), "utf8");
  const parsed = parseConsumptionCsv(text);
  const check = validateImportRows(parsed.rows, new Date("2026-10-13"));
  const totals = new Map<string, { kwh: number; months: number }>();
  for (const b of check.batches) totals.set(`${b.year}-${b.energyType}`, { kwh: b.months.reduce((s, m) => s + m.kwh, 0), months: b.months.length });

  it("est lu par l'import 2.1 sans aucune erreur", () => {
    expect(parsed.fileIssues).toEqual([]);
    expect(check.ok).toBe(true);
    expect(check.errorCount).toBe(0);
  });
  it("a 2011 incomplète (8 mois), 2015 sur deux énergies, et un maximum unique en 2013 (52 800 > 47 700 de 2019)", () => {
    expect(totals.get("2011-ELECTRICITY")?.months).toBe(8);
    expect(totals.get("2015-ELECTRICITY")?.kwh).toBe(30000);
    expect(totals.get("2015-GAS")?.kwh).toBe(18000);
    const yearly = new Map<number, number>();
    for (const b of check.batches) if (b.months.length === 12) yearly.set(b.year, (yearly.get(b.year) ?? 0) + b.months.reduce((s, m) => s + m.kwh, 0));
    const max = Math.max(...yearly.values(), 47700);
    expect(max).toBe(52800);
    expect([...yearly].filter(([, v]) => v === max).map(([y]) => y)).toEqual([2013]);
  });
});
