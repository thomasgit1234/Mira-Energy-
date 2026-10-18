import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CLIMATE_FILE, buildYearIndicators, readClimateFile, type YearIndicator, type YearStatus } from "@/modules/climat";
import { parseConsumptionCsv, validateImportRows } from "@/modules/collecte";
import {
  INELIGIBLE_REASONS, buildComparatorRows, formatKwh, ineligibleReason, isEligibleRow, isReferenceYearEligible, suggestReferenceYear, validateReferenceChoice,
} from "./reference";

const NBSP = " "; // séparateur de milliers français (espace fine insécable)
/** correctedKwh absent = année non corrigeable (statut de correction NON_CORRIGEABLE). */
const ind = (year: number, status: YearStatus, consumptionKwh: number | null = null, correctedKwh: number | null = null): YearIndicator => ({
  year, status, consumptionKwh, correctedKwh, correctedKwhPerM2: null, monthCount: status === "PAS_DE_CONSOMMATION" ? 0 : 12,
  correction: correctedKwh === null ? "NON_CORRIGEABLE" : "CORRIGEE", correctionProblem: null, unknownShares: [], months: [],
});

describe("5.1 — éligibilité d'une année de référence", () => {
  it.each([[2009, false], [2010, true], [2015, true], [2019, true], [2020, false], [2021, false], [2025, false]])(
    "%i → %s", (year, expected) => expect(isReferenceYearEligible(year)).toBe(expected),
  );

  it("une ligne est éligible si l'année est dans la période ET complète (statut OK du module climat)", () => {
    expect(isEligibleRow(ind(2013, "OK", 52800))).toBe(true);
    expect(isEligibleRow(ind(2011, "ANNEE_INCOMPLETE", 32000))).toBe(false);
    expect(isEligibleRow(ind(2012, "PAS_DE_CONSOMMATION"))).toBe(false);
    expect(isEligibleRow(ind(2021, "OK", 94610))).toBe(false);
  });

  it("une année complète mais non corrigeable du climat reste éligible (référence choisie sur le brut, D11)", () => {
    const row = ind(2014, "OK", 45600, null);
    expect(row.correction).toBe("NON_CORRIGEABLE");
    expect(isEligibleRow(row)).toBe(true);
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
  it("pas de consommation, année incomplète", () => {
    expect(ineligibleReason(ind(2012, "PAS_DE_CONSOMMATION"))).toBe("pas de consommation");
    expect(ineligibleReason(ind(2011, "ANNEE_INCOMPLETE", 32000))).toBe("année incomplète");
    expect(Object.keys(INELIGIBLE_REASONS)).toEqual(["EXCLUDED", "OUT_OF_PERIOD", "NO_CONSUMPTION", "INCOMPLETE"]);
  });
  it("aucune raison pour une année éligible", () => expect(ineligibleReason(ind(2013, "OK", 52800))).toBeNull());
});

describe("5.1 — buildComparatorRows", () => {
  const indicators = [ind(2013, "OK", 52800, 49100), ind(2011, "ANNEE_INCOMPLETE", 32000, 31000), ind(2019, "OK", 47700, 47900),
    ind(2021, "OK", 94610, 93000), ind(2025, "OK", 40500, 41800), ind(2020, "PAS_DE_CONSOMMATION")];
  const rows = buildComparatorRows(indicators, 2013);

  it("liste 2010 à 2019 (années manquantes complétées) puis les années postérieures, triées", () => {
    expect(rows.map((r) => r.year)).toEqual([2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2025]);
    expect(rows[0]).toEqual({
      year: 2010, consumptionKwh: null, correctedKwh: null, correction: null, status: "PAS_DE_CONSOMMATION",
      eligible: false, ineligibleReason: "pas de consommation", isSuggested: false,
    });
  });

  it("porte la consommation brute ET la corrigée du climat", () => {
    expect(rows.find((r) => r.year === 2013)).toMatchObject({ consumptionKwh: 52800, correctedKwh: 49100, correction: "CORRIGEE" });
  });

  it("marque l'éligibilité, la raison et l'année suggérée", () => {
    const get = (y: number) => rows.find((r) => r.year === y)!;
    expect(get(2013)).toMatchObject({ eligible: true, ineligibleReason: null, isSuggested: true, consumptionKwh: 52800 });
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
  it("valeur non finie → « — »", () => {
    expect(formatKwh(Number.NaN)).toBe("—");
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

describe("5.2 — suggestReferenceYear", () => {
  it("propose l'année la plus consommatrice parmi les éligibles", () => {
    const rows = [ind(2012, "OK", 49200), ind(2013, "OK", 52800), ind(2019, "OK", 47700)];
    expect(suggestReferenceYear(rows)).toEqual({ year: 2013, consumptionKwh: 52800 });
  });

  it("égalité : l'année la plus ancienne, quel que soit l'ordre", () => {
    expect(suggestReferenceYear([ind(2017, "OK", 50000), ind(2012, "OK", 50000), ind(2015, "OK", 50000)])).toEqual({ year: 2012, consumptionKwh: 50000 });
  });

  it("règle inchangée : la suggestion porte sur le BRUT, pas sur la consommation corrigée", () => {
    // 2012 a le brut le plus élevé ; 2013 aurait la corrigée la plus élevée : on suggère 2012.
    expect(suggestReferenceYear([ind(2012, "OK", 53000, 48000), ind(2013, "OK", 52800, 56000)])?.year).toBe(2012);
  });

  it("ignore une année incomplète même si elle est plus élevée", () => {
    expect(suggestReferenceYear([ind(2011, "ANNEE_INCOMPLETE", 99000), ind(2013, "OK", 52800)])?.year).toBe(2013);
  });

  it("ignore 2020 et 2021 (et les années après 2019) même si elles sont supérieures", () => {
    const rows = [ind(2019, "OK", 47700), ind(2020, "OK", 80000), ind(2021, "OK", 94610), ind(2025, "OK", 99999), ind(2009, "OK", 99999)];
    expect(suggestReferenceYear(rows)).toEqual({ year: 2019, consumptionKwh: 47700 });
  });

  it("aucune année éligible → null", () => {
    expect(suggestReferenceYear([])).toBeNull();
    expect(suggestReferenceYear([ind(2011, "ANNEE_INCOMPLETE", 1), ind(2012, "PAS_DE_CONSOMMATION"), ind(2021, "OK", 9)])).toBeNull();
  });

  it("ne calcule jamais de moyenne : la valeur renvoyée est celle d'une année réelle", () => {
    const rows = [ind(2010, "OK", 40000), ind(2011, "OK", 50000), ind(2012, "OK", 60000)];
    const s = suggestReferenceYear(rows)!;
    expect(s).toEqual({ year: 2012, consumptionKwh: 60000 });
    expect(rows.map((r) => r.consumptionKwh)).toContain(s.consumptionKwh);
    expect(s.consumptionKwh).not.toBe(50000); // la moyenne
  });

  it("données de démo (fichier 2010-2018 + 2019 du seed) → 2013 ; la suggestion est marquée dans les lignes", () => {
    const text = readFileSync(join(process.cwd(), "public", "exemples", "consommations-demo-2010-2018.csv"), "utf8");
    const batches = validateImportRows(parseConsumptionCsv(text).rows, new Date("2026-10-13")).batches;
    const seed2019 = { year: 2019, energyType: "ELECTRICITY", months: Array.from({ length: 12 }, (_, i) => ({ month: i + 1, kwh: 3600 + (i < 3 || i >= 10 ? 900 : 0) })) };
    const climateRows = readClimateFile(join(process.cwd(), CLIMATE_FILE)).rows;
    const indicators = buildYearIndicators({ climateRows, consumptions: [...batches, seed2019], category: "CAP18", surfaceM2: 1200 });
    const suggested = suggestReferenceYear(indicators);
    expect(suggested).toEqual({ year: 2013, consumptionKwh: 52800 });
    const rows = buildComparatorRows(indicators, suggested!.year);
    expect(rows.filter((r) => r.isSuggested).map((r) => r.year)).toEqual([2013]);
    expect(rows.find((r) => r.year === 2011)?.ineligibleReason).toBe("année incomplète");
    expect(rows.find((r) => r.year === 2015)).toMatchObject({ eligible: true, consumptionKwh: 48000 });
    // Chaque année 2010-2019 de la démo est dans le fichier Saint-Quentin : corrigée calculée, différente du brut (électricité à 25 %).
    const r2013 = rows.find((r) => r.year === 2013)!;
    expect(r2013.correction).toBe("CORRIGEE");
    expect(r2013.correctedKwh).not.toBeNull();
    expect(r2013.correctedKwh).not.toBe(r2013.consumptionKwh);
  });
});

describe("5.3 — validateReferenceChoice", () => {
  const rows = [ind(2011, "ANNEE_INCOMPLETE", 32000), ind(2012, "PAS_DE_CONSOMMATION"), ind(2013, "OK", 52800, 49100),
    ind(2014, "OK", 45600, null), ind(2021, "OK", 94610)];

  it("accepte une année éligible complète", () => expect(validateReferenceChoice(2013, rows)).toEqual({ ok: true }));

  it("accepte une année complète non corrigeable du climat (choix sur le brut)", () => {
    expect(validateReferenceChoice(2014, rows)).toEqual({ ok: true });
  });

  it("HORS_PERIODE : avant 2010, après 2019, non entier", () => {
    for (const y of [2009, 2022, 2013.5, "2013", null]) {
      expect(validateReferenceChoice(y, rows)).toMatchObject({ ok: false, code: "HORS_PERIODE" });
    }
  });

  it("HORS_PERIODE avec un message dédié pour 2020 et 2021, même avec des données", () => {
    const r = validateReferenceChoice(2021, rows);
    expect(r).toMatchObject({ ok: false, code: "HORS_PERIODE" });
    expect(!r.ok && r.message).toContain("2020 et 2021");
  });

  it("PAS_DE_DONNEES : année sans consommation ou absente", () => {
    expect(validateReferenceChoice(2012, rows)).toMatchObject({ ok: false, code: "PAS_DE_DONNEES" });
    expect(validateReferenceChoice(2016, rows)).toMatchObject({ ok: false, code: "PAS_DE_DONNEES" });
  });

  it("ANNEE_INCOMPLETE : moins de 12 mois", () => {
    expect(validateReferenceChoice(2011, rows)).toMatchObject({ ok: false, code: "ANNEE_INCOMPLETE" });
  });
});
