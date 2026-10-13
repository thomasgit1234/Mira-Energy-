import { describe, expect, it } from "vitest";
import type { CabsResult } from "./cabs";
import { computeCrelat } from "./crelat";
import { evaluateVerdict, pickCurrentYear } from "./verdict";

const crelat52800 = computeCrelat(52800); // 31 680 / 26 400 / 21 120
const noReference = computeCrelat(null);
const cabs = (objectiveKwh: number): CabsResult => ({ ok: true, objectiveKwh, surfaceTotal: 1200, perLine: [] });
const cabsMissing: CabsResult = { ok: false, code: "VALEUR_ABSENTE", message: "Pas de valeur Cabs définie pour SCAP1812" };
const base = { currentYear: 2025, referenceYear: 2013 };

describe("6.3 — evaluateVerdict (jalon 2030 = verdict principal)", () => {
  it("Crelat seul atteint → CONFORME, voie la plus favorable = Crelat", () => {
    const v = evaluateVerdict({ ...base, crelat: crelat52800, cabs: cabs(20000), currentKwh: 30000 }).main;
    expect(v).toMatchObject({ milestone: 2030, status: "CONFORME", favorable: "CRELAT" });
    expect(v.crelat).toMatchObject({ calculable: true, met: true });
    expect(v.cabs).toMatchObject({ calculable: true, met: false, gapKwh: 10000 });
  });

  it("Cabs seul atteint → CONFORME par Cabs (cas de la démo : 40 500 > 31 680, ≤ 278 400)", () => {
    const v = evaluateVerdict({ ...base, crelat: crelat52800, cabs: cabs(278400), currentKwh: 40500 }).main;
    expect(v).toMatchObject({ status: "CONFORME", favorable: "CABS" });
    expect(v.crelat).toMatchObject({ met: false });
    expect(v.crelat.calculable && v.crelat.gapKwh).toBeCloseTo(8820, 9);
    expect(v.cabs).toMatchObject({ met: true, gapKwh: 40500 - 278400 });
    expect(v.message).toContain("Cabs");
  });

  it("les deux atteintes → CONFORME par les deux méthodes", () => {
    const v = evaluateVerdict({ ...base, crelat: crelat52800, cabs: cabs(278400), currentKwh: 30000 }).main;
    expect(v).toMatchObject({ status: "CONFORME", message: "Conforme par les deux méthodes." });
  });

  it("aucune atteinte (les deux calculables) → NON_CONFORME", () => {
    const v = evaluateVerdict({ ...base, crelat: crelat52800, cabs: cabs(25000), currentKwh: 40500 }).main;
    expect(v.status).toBe("NON_CONFORME");
  });

  it("Crelat non calculable + Cabs atteint → CONFORME", () => {
    const v = evaluateVerdict({ ...base, referenceYear: null, crelat: noReference, cabs: cabs(278400), currentKwh: 40500 }).main;
    expect(v.status).toBe("CONFORME");
    expect(v.crelat).toEqual({ calculable: false, reason: "non calculable : pas d'année de référence" });
    expect(v.favorable).toBe("CABS");
  });

  it("Crelat non calculable + Cabs non atteint → INDETERMINE, avec quoi renseigner", () => {
    const v = evaluateVerdict({ ...base, referenceYear: null, crelat: noReference, cabs: cabs(25000), currentKwh: 40500 }).main;
    expect(v.status).toBe("INDETERMINE");
    expect(v.message).toContain("choisissez une année de référence");
  });

  it("Cabs non calculable + Crelat non atteint → INDETERMINE, avec la raison Cabs", () => {
    const v = evaluateVerdict({ ...base, crelat: crelat52800, cabs: cabsMissing, currentKwh: 40500 }).main;
    expect(v.status).toBe("INDETERMINE");
    expect(v.message).toContain("SCAP1812");
  });

  it("consommation exactement égale à l'objectif → satisfaite (≤)", () => {
    const v = evaluateVerdict({ ...base, crelat: crelat52800, cabs: cabs(278400), currentKwh: 278400 }).main;
    expect(v.cabs).toMatchObject({ met: true, gapKwh: 0 });
    expect(v.status).toBe("CONFORME");
  });

  it("égalité des objectifs → voie EGALITE", () => {
    expect(evaluateVerdict({ ...base, crelat: computeCrelat(50000), cabs: cabs(30000), currentKwh: 1 }).main.favorable).toBe("EGALITE");
  });

  it("pas de consommation actuelle → INDETERMINE", () => {
    const v = evaluateVerdict({ ...base, currentYear: null, crelat: crelat52800, cabs: cabs(278400), currentKwh: null }).main;
    expect(v.status).toBe("INDETERMINE");
    expect(v.cabs).toMatchObject({ calculable: true, met: null });
  });

  it("2040 et 2050 calculés pour information", () => {
    const v = evaluateVerdict({ ...base, crelat: crelat52800, cabs: cabs(25000), currentKwh: 24000 });
    expect(v.milestones.map((m) => [m.milestone, m.status])).toEqual([[2030, "CONFORME"], [2040, "CONFORME"], [2050, "CONFORME"]]);
    expect(v.milestones[2].crelat).toMatchObject({ met: false }); // 24 000 > 21 120
  });
});

describe("6.3 — pickCurrentYear", () => {
  it("dernière année complète, jamais 2020 ni 2021", () => {
    const rows = [
      { year: 2019, status: "OK" as const, consumptionKwh: 47700 },
      { year: 2020, status: "OK" as const, consumptionKwh: 99000 },
      { year: 2021, status: "OK" as const, consumptionKwh: 94610 },
    ];
    expect(pickCurrentYear(rows)).toEqual({ year: 2019, consumptionKwh: 47700 });
  });
  it("ignore les années incomplètes, sans consommation ou sans DJU", () => {
    const rows = [
      { year: 2019, status: "OK" as const, consumptionKwh: 47700 },
      { year: 2025, status: "OK" as const, consumptionKwh: 40500 },
      { year: 2026, status: "ANNEE_INCOMPLETE" as const, consumptionKwh: 4000 },
      { year: 2024, status: "PAS_DE_CONSOMMATION" as const, consumptionKwh: null },
    ];
    expect(pickCurrentYear(rows)).toEqual({ year: 2025, consumptionKwh: 40500 });
  });
  it("aucune année complète → null", () => {
    expect(pickCurrentYear([{ year: 2021, status: "OK", consumptionKwh: 1 }])).toBeNull();
  });
});
