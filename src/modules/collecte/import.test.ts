// Tâche 2.1 — preuve de bout en bout (sans base réelle) : importRows passe par saveConsumption
// avec validated = false, même si le client envoie « validated: true », et un mois validé
// n'est donc pas écrasé. La base est simulée en mémoire ; la règle utilisée est la VRAIE
// planMonthWrites de src/lib/consumption-writer.ts (celle qu'applique saveConsumption).
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaveConsumptionInput } from "@/lib/consumption-writer";

type StoredMonth = { kwh: number; validated: boolean; source: string };
const store = new Map<string, StoredMonth>(); // clé « année|énergie|mois »
const calls: SaveConsumptionInput[] = [];

vi.mock("@/lib/db", () => ({
  db: {
    eFA: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) =>
        where.id === "efa-dupont" ? { id: "efa-dupont", building: { users: [{ id: "user-dupont" }] } } : null,
      ),
    },
  },
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(async () => ({ id: "user-dupont", email: "demo.dupont@example.com", role: "OWNER" })),
}));

vi.mock("@/lib/consumption-writer", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/consumption-writer")>();
  return {
    ...real,
    // Double de saveConsumption : mêmes règles (planMonthWrites réelle), stockage en mémoire.
    saveConsumption: vi.fn(async (input: SaveConsumptionInput) => {
      calls.push(input);
      const validated = input.validated ?? false;
      const key = (m: number) => `${input.year}|${input.energyType}|${m}`;
      const existing = [...Array(12).keys()]
        .map((i) => i + 1)
        .filter((m) => store.has(key(m)))
        .map((m) => ({ month: m, kwh: store.get(key(m))!.kwh, validated: store.get(key(m))!.validated }));
      const plan = real.planMonthWrites(existing, input.months, validated);
      for (const m of plan.toWrite) store.set(key(m.month), { kwh: m.kwh, validated, source: input.source });
      return { consumptionId: "c", writtenMonths: plan.toWrite.map((m) => m.month), skipped: plan.skipped };
    }),
  };
});

const { importRows } = await import("./repository");

const rows = [
  { year: "2019", month: "1", energy: "électricité", kwh: "4400" },
  { year: "2019", month: "2", energy: "électricité", kwh: "4300" },
  { year: "2019", month: "3", energy: "électricité", kwh: "4600" },
];

describe("importRows — un import non validé n'écrase jamais un mois validé", () => {
  beforeEach(() => {
    store.clear();
    calls.length = 0;
    // Seed : janvier et février 2019 validés à 4 500 (saisie manuelle) ; mars absent.
    store.set("2019|ELECTRICITY|1", { kwh: 4500, validated: true, source: "MANUAL" });
    store.set("2019|ELECTRICITY|2", { kwh: 4500, validated: true, source: "MANUAL" });
  });

  it("garde janvier et février à 4 500, écrit mars non validé, et le dit dans le récapitulatif", async () => {
    const result = await importRows({ efaId: "efa-dupont", rows });

    expect(calls).toHaveLength(1);
    expect(calls[0].validated).toBe(false);
    expect(store.get("2019|ELECTRICITY|1")).toEqual({ kwh: 4500, validated: true, source: "MANUAL" });
    expect(store.get("2019|ELECTRICITY|2")).toEqual({ kwh: 4500, validated: true, source: "MANUAL" });
    expect(store.get("2019|ELECTRICITY|3")).toEqual({ kwh: 4600, validated: false, source: "PDF" });
    expect(result.summary).toEqual({
      writtenCount: 1,
      skippedCount: 2,
      skipped: [
        { year: 2019, energyType: "ELECTRICITY", month: 1 },
        { year: 2019, energyType: "ELECTRICITY", month: 2 },
      ],
    });
  });

  it("ignore un « validated: true » envoyé par le client : l'import reste non validé", async () => {
    const result = await importRows({ efaId: "efa-dupont", rows, validated: true });

    expect(calls.every((c) => c.validated === false)).toBe(true);
    expect(store.get("2019|ELECTRICITY|1")?.kwh).toBe(4500);
    expect(store.get("2019|ELECTRICITY|1")?.validated).toBe(true);
    expect(result.summary.skippedCount).toBe(2);
  });

  it("refuse l'EFA d'un autre utilisateur sans rien écrire", async () => {
    await expect(importRows({ efaId: "efa-voisin", rows })).rejects.toMatchObject({ status: 404 });
    expect(calls).toHaveLength(0);
  });
});
