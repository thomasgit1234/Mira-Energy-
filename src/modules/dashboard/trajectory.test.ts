import { describe, expect, it } from "vitest";
import { computeCrelat, evaluateVerdict, type CabsResult } from "@/modules/conformite";
import { buildComparison, buildTimeline, changePct, type TrajectoryObjectives, type TrajectoryRow } from "./trajectory";

// Site de Laon (consommations FICTIVES) ; objectifs construits avec les VRAIES fonctions de la conformité.
const NOW = new Date("2026-11-05T12:00:00Z");
const row = (year: number, kwh: number | null, corrected: number | null, status: TrajectoryRow["status"] = "OK"): TrajectoryRow => ({
  year, consumptionKwh: kwh, correctedKwh: corrected, correctedKwhPerM2: corrected === null ? null : Math.round((corrected / 1200) * 100) / 100,
  status: kwh === null ? "PAS_DE_CONSOMMATION" : status,
});
const ROWS: TrajectoryRow[] = [
  row(2025, 40500, 41700),
  row(2013, 52800, 49500),
  row(2019, 43200, 44100),
  row(2020, 30000, 31000),
  row(2023, 42000, 42900),
  row(2024, 20000, null, "ANNEE_INCOMPLETE"),
];
const CABS_OK: CabsResult = { ok: true, objectiveKwh: 278400, surfaceTotal: 1200, perLine: [] };
const CABS_KO: CabsResult = { ok: false, code: "VALEUR_ABSENTE", message: "valeur absente du fichier Cabs" };

function objectives(cabs: CabsResult, referenceYear: number | null = 2013, currentKwh: number | null = 40500): TrajectoryObjectives {
  const crelat = referenceYear === null ? { ok: false as const, reason: "Aucune année de référence choisie." } : computeCrelat(52800);
  return {
    reference: { year: referenceYear, crefKwh: crelat.ok ? 52800 : null },
    verdict: evaluateVerdict({ crelat, cabs, currentKwh, currentYear: currentKwh === null ? null : 2025, referenceYear }),
  };
}

describe("7.2 — frise", () => {
  const t = buildTimeline(ROWS, objectives(CABS_OK), 2025, null, NOW);

  it("années triées, rôles : référence, exclue (2020), incomplète, suivie", () => {
    expect(t.years.map((y) => [y.year, y.role])).toEqual([
      [2013, "REFERENCE"], [2019, "AUTRE"], [2020, "EXCLUE"], [2023, "AUTRE"], [2024, "INCOMPLETE"], [2025, "SUIVIE"],
    ]);
    expect(t.axis).toEqual({ from: 2010, to: 2050 });
  });

  it("jalons : Crelat 31 680 / 26 400 / 21 120, Cabs 278 400 (plus favorable), années restantes", () => {
    expect(t.milestones.map((m) => [m.year, m.crelatKwh, m.cabsKwh, m.targetKwh, m.favorable, m.status, m.yearsLeft])).toEqual([
      [2030, 31680, 278400, 278400, "CABS", "CONFORME", 4],
      [2040, 26400, 278400, 278400, "CABS", "CONFORME", 14],
      [2050, 21120, 278400, 278400, "CABS", "CONFORME", 24],
    ]);
    expect(t.objectivesNote).toBeNull();
  });

  it("position par rapport à l'objectif 2030 : seulement les années complètes après la référence, hors 2020-2021", () => {
    expect(Object.fromEntries(t.years.map((y) => [y.year, y.vsTarget2030]))).toEqual({
      2013: null, 2019: "SOUS", 2020: null, 2023: "SOUS", 2024: null, 2025: "SOUS",
    });
  });

  it("Cabs non calculable : objectif retenu Crelat, 2025 (40 500) au-dessus de 31 680, verdict indéterminé", () => {
    const k = buildTimeline(ROWS, objectives(CABS_KO), 2025, null, NOW);
    expect(k.milestones[0]).toMatchObject({ targetKwh: 31680, cabsKwh: null, favorable: "CRELAT", status: "INDETERMINE" }); // règle de la conformité : Cabs inconnu
    expect(k.years.find((y) => y.year === 2025)?.vsTarget2030).toBe("AU_DESSUS");
  });

  it("aucun objectif calculable : frise des consommations seule, avec une explication", () => {
    const k = buildTimeline(ROWS, objectives(CABS_KO, null), 2025, null, NOW);
    expect(k.milestones.every((m) => m.targetKwh === null)).toBe(true);
    expect(k.years.every((y) => y.vsTarget2030 === null)).toBe(true);
    expect(k.objectivesNote).toContain("Aucun objectif calculable");
  });

  it("conformité indisponible : consommations affichées, raison donnée, jamais d'objectif inventé", () => {
    const k = buildTimeline(ROWS, null, 2025, "base de données injoignable", NOW);
    expect(k.years).toHaveLength(6);
    expect(k.milestones.map((m) => m.targetKwh)).toEqual([null, null, null]);
    expect(k.objectivesNote).toBe("Objectifs indisponibles : base de données injoignable");
  });

  it("jalon atteint ou dépassé : 0 année restante", () => {
    expect(buildTimeline(ROWS, null, 2025, null, new Date("2045-01-01")).milestones.map((m) => m.yearsLeft)).toEqual([0, 0, 5]);
  });
});

describe("7.3 — comparatif N-2 / N-1 / N", () => {
  it("N = 2025 : N-1 = 2024 incomplète (pas d'évolution), N-2 = 2023 complète", () => {
    const c = buildComparison(ROWS, 2025, objectives(CABS_OK));
    expect(c.years.map((y) => [y.label, y.year, y.state])).toEqual([["N-2", 2023, "COMPLETE"], ["N-1", 2024, "INCOMPLETE"], ["N", 2025, "COMPLETE"]]);
    expect(c.years.map((y) => y.rawChangePct)).toEqual([null, null, null]);
    expect(c.years[2]).toMatchObject({ rawKwh: 40500, correctedKwh: 41700, vsCrefPct: -23.3, gap2030Kwh: 40500 - 278400 });
    expect(c.years[1]).toMatchObject({ vsCrefPct: null, gap2030Kwh: null });
  });

  it("trois années complètes : évolutions brute et corrigée, écart à Créf et à l'objectif 2030 (Crelat seul)", () => {
    const rows = [row(2023, 42000, 42900), row(2024, 41000, 42500), row(2025, 40500, 41700)];
    const c = buildComparison(rows, 2025, objectives(CABS_KO));
    expect(c.target2030Kwh).toBe(31680);
    expect(c.years.map((y) => y.rawChangePct)).toEqual([null, -2.4, -1.2]);
    expect(c.years.map((y) => y.correctedChangePct)).toEqual([null, -0.9, -1.9]);
    expect(c.years.map((y) => y.gap2030Kwh)).toEqual([10320, 9320, 8820]);
  });

  it("année absente et 2020-2021 exclues : affichées, sans écart à la référence ni à l'objectif", () => {
    const rows = [row(2021, 35000, 36000), row(2022, 39000, 40000)];
    const c = buildComparison(rows, 2022, objectives(CABS_OK));
    expect(c.years.map((y) => [y.year, y.state])).toEqual([[2020, "ABSENTE"], [2021, "EXCLUE"], [2022, "COMPLETE"]]);
    expect(c.years[1]).toMatchObject({ rawKwh: 35000, vsCrefPct: null, gap2030Kwh: null });
    // 2021 est complète : l'évolution 2021 → 2022 reste une information utile.
    expect(c.years[2].rawChangePct).toBe(11.4);
    expect(c.years[0]).toMatchObject({ rawKwh: null, correctedKwh: null });
  });

  it("conformité indisponible : valeurs et évolutions affichées, pas d'écart aux objectifs", () => {
    const c = buildComparison([row(2024, 41000, 42500), row(2025, 40500, 41700)], 2025, null);
    expect(c).toMatchObject({ crefKwh: null, target2030Kwh: null, referenceYear: null });
    expect(c.years[2]).toMatchObject({ rawChangePct: -1.2, vsCrefPct: null, gap2030Kwh: null });
  });

  it("changePct : arrondi au dixième, base nulle ou absente → null", () => {
    expect(changePct(52800, 40500)).toBe(-23.3);
    expect(changePct(0, 10)).toBeNull();
    expect(changePct(null, 10)).toBeNull();
  });
});
