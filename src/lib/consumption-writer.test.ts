import { describe, expect, it } from "vitest";
import { planMonthWrites, saveConsumptionSchema } from "@/lib/consumption-writer";

describe("planMonthWrites", () => {
  it("écrit tous les mois quand rien n'existe", () => {
    const plan = planMonthWrites([], [{ month: 1, kwh: 100 }, { month: 2, kwh: 120 }], false);
    expect(plan.toWrite.map((m) => m.month)).toEqual([1, 2]);
    expect(plan.skipped).toEqual([]);
  });

  it("n'écrase pas un mois déjà validé avec une valeur non validée", () => {
    const plan = planMonthWrites([{ month: 3, kwh: 500, validated: true }], [{ month: 3, kwh: 999 }], false);
    expect(plan.toWrite).toEqual([]);
    expect(plan.skipped).toEqual([{ month: 3, reason: "ALREADY_VALIDATED" }]);
  });

  it("écrase un mois validé quand la nouvelle valeur est validée aussi", () => {
    const plan = planMonthWrites([{ month: 3, kwh: 500, validated: true }], [{ month: 3, kwh: 510 }], true);
    expect(plan.toWrite).toEqual([{ month: 3, kwh: 510 }]);
  });

  it("écrase un mois non validé", () => {
    const plan = planMonthWrites([{ month: 4, kwh: 10, validated: false }], [{ month: 4, kwh: 20 }], false);
    expect(plan.toWrite).toEqual([{ month: 4, kwh: 20 }]);
  });

  it("ignore un mois en double dans la saisie (le premier gagne)", () => {
    const plan = planMonthWrites([], [{ month: 5, kwh: 1 }, { month: 5, kwh: 2 }], false);
    expect(plan.toWrite).toEqual([{ month: 5, kwh: 1 }]);
    expect(plan.skipped).toEqual([{ month: 5, reason: "DUPLICATE_IN_INPUT" }]);
  });
});

describe("saveConsumptionSchema", () => {
  const base = { efaId: "efa1", year: 2023, energyType: "ELECTRICITY", source: "PDF", months: [{ month: 1, kwh: 10 }] };

  it("accepte une saisie valide et applique validated=false par défaut", () => {
    expect(saveConsumptionSchema.parse(base).validated).toBe(false);
  });

  it.each([
    ["mois 13", { ...base, months: [{ month: 13, kwh: 10 }] }],
    ["kWh négatif", { ...base, months: [{ month: 1, kwh: -1 }] }],
    ["année avant 2010", { ...base, year: 2009 }],
    ["énergie inconnue", { ...base, energyType: "FIOUL" }],
    ["source inconnue", { ...base, source: "FAX" }],
    ["aucun mois", { ...base, months: [] }],
  ])("refuse : %s", (_label, input) => {
    expect(saveConsumptionSchema.safeParse(input).success).toBe(false);
  });
});
