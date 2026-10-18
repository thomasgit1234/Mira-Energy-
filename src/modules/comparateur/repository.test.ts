// Tâche 5.3 — chooseReferenceYear de bout en bout, sans base réelle : base et module climat simulés.
// Preuve : un choix refusé (422), une EFA étrangère (404) ou une requête invalide (400) n'écrivent RIEN ;
// un choix valide écrit EFA.referenceYear et le renvoie.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { YearIndicator } from "@/modules/climat";

const efa = { id: "efa-dupont", entityType: "SASU", role: "OWNER_OCCUPIER", referenceYear: null as number | null, building: {} };
const update = vi.fn(async ({ data }: { data: { referenceYear: number } }) => {
  efa.referenceYear = data.referenceYear;
  return efa;
});

vi.mock("@/lib/db", () => ({ db: { eFA: { findFirst: vi.fn(async () => efa), update: (args: never) => update(args) } } }));
vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn(async () => ({ id: "user-dupont", email: "demo.dupont@example.com", role: "OWNER" })) }));

const ind = (year: number, status: YearIndicator["status"], consumptionKwh: number | null): YearIndicator =>
  ({ year, status, consumptionKwh, correctedKwh: consumptionKwh, correctedKwhPerM2: null, monthCount: 12, correction: "CORRIGEE", correctionProblem: null, unknownShares: [], months: [] });
vi.mock("@/modules/climat", () => ({
  ClimatError: class ClimatError extends Error { status = 500; },
  loadClimatIndicators: vi.fn(async () => ({
    zone: "02320001", stationLabel: "Saint-Quentin (02320001)", buildingLabel: "1 rue de la Démo", activityLabel: "Restauration",
    surfaceM2: 1200, correctionAvailable: true, problem: null,
    rows: [ind(2011, "ANNEE_INCOMPLETE", 32000), ind(2013, "OK", 52800), ind(2019, "OK", 47700), ind(2021, "OK", 94610)],
  })),
}));

const { chooseReferenceYear, loadComparator } = await import("./repository");

describe("chooseReferenceYear — un refus n'écrit rien", () => {
  beforeEach(() => {
    efa.referenceYear = null;
    update.mockClear();
  });

  it("2013 (éligible) : écrit referenceYear = 2013 et le renvoie", async () => {
    await expect(chooseReferenceYear({ year: 2013 })).resolves.toEqual({ ok: true, chosenYear: 2013 });
    expect(update).toHaveBeenCalledTimes(1);
    expect((await loadComparator()).chosenYear).toBe(2013);
  });

  it("changer de choix est possible : 2013 puis 2019", async () => {
    await chooseReferenceYear({ year: 2013 });
    await chooseReferenceYear({ year: 2019, efaId: "efa-dupont" });
    expect(efa.referenceYear).toBe(2019);
  });

  it.each([
    [2020, "HORS_PERIODE"], [2021, "HORS_PERIODE"], [2009, "HORS_PERIODE"], [2011, "ANNEE_INCOMPLETE"], [2015, "PAS_DE_DONNEES"],
  ])("%i → 422 %s, rien n'est écrit", async (year, code) => {
    await expect(chooseReferenceYear({ year })).rejects.toMatchObject({ status: 422, issues: [expect.objectContaining({ code })] });
    expect(update).not.toHaveBeenCalled();
    expect(efa.referenceYear).toBeNull();
  });

  it("EFA d'un autre utilisateur → 404, rien n'est écrit", async () => {
    await expect(chooseReferenceYear({ year: 2013, efaId: "efa-voisin" })).rejects.toMatchObject({ status: 404 });
    expect(update).not.toHaveBeenCalled();
  });

  it("requête invalide → 400, rien n'est écrit", async () => {
    await expect(chooseReferenceYear({ annee: 2013 })).rejects.toMatchObject({ status: 400 });
    await expect(chooseReferenceYear(null)).rejects.toMatchObject({ status: 400 });
    expect(update).not.toHaveBeenCalled();
  });

  it("la suggestion vient du serveur : 2013, et 2021 ignorée bien que supérieure", async () => {
    const data = await loadComparator();
    expect(data.suggested).toEqual({ year: 2013, consumptionKwh: 52800 });
    expect(data.rows.find((r) => r.year === 2013)?.isSuggested).toBe(true);
  });
});
