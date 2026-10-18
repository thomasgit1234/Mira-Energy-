import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CLIMATE_FILE, readClimateFile } from "./coefficients-source";
import { buildYearIndicators, type ConsumptionInput } from "./indicators";

const climateRows = readClimateFile(join(process.cwd(), CLIMATE_FILE)).rows;
const months = (kwh: number, count = 12) => Array.from({ length: count }, (_, i) => ({ month: i + 1, kwh }));
const elec = (year: number, kwh: number, count = 12): ConsumptionInput => ({ year, energyType: "ELECTRICITY", months: months(kwh, count) });
const gas = (year: number, kwh: number, count = 12): ConsumptionInput => ({ year, energyType: "GAS", months: months(kwh, count) });

describe("buildYearIndicators — brut, corrigé par mois, corrigé/m²", () => {
  it("restaurant 2023 : électricité corrigée à 25 %, gaz inchangé, kWh corrigés/m² sur 1 200 m²", () => {
    const [r] = buildYearIndicators({ climateRows, consumptions: [elec(2023, 1000), gas(2023, 500)], category: "CAP18", surfaceM2: 1200 });
    const elecFixed = 12000 * 0.75 + 12000 * 0.25 * (2791.295 / 2444.3);
    expect(r.year).toBe(2023);
    expect(r.consumptionKwh).toBe(18000);
    expect(r.correctedKwh).toBeCloseTo(elecFixed + 6000, 1);
    expect(r.correctedKwhPerM2).toBeCloseTo((elecFixed + 6000) / 1200, 2);
    expect(r.status).toBe("OK");
    expect(r.correction).toBe("CORRIGEE");
    expect(r.unknownShares).toEqual([]);
    expect(r.months).toHaveLength(12);
    expect(r.months[0].rawKwh).toBe(1500);
    expect(r.months[0].correctedKwh).toBeCloseTo((elecFixed + 6000) / 12, 1);
  });

  it("une ligne par année avec consommation, triées ; année incomplète signalée mais corrigée", () => {
    const rows = buildYearIndicators({ climateRows, consumptions: [elec(2025, 1000, 6), elec(2019, 1000)], category: "CAP18", surfaceM2: 1200 });
    expect(rows.map((r) => [r.year, r.status, r.correction, r.monthCount])).toEqual([
      [2019, "OK", "CORRIGEE", 12],
      [2025, "ANNEE_INCOMPLETE", "CORRIGEE", 6],
    ]);
  });

  it("année absente du fichier (2026) : NON_CORRIGEABLE, brut conservé, statut de complétude inchangé", () => {
    const [r] = buildYearIndicators({ climateRows, consumptions: [elec(2026, 1000)], category: "CAP18", surfaceM2: 1200 });
    expect(r.consumptionKwh).toBe(12000);
    expect(r.correctedKwh).toBeNull();
    expect(r.correctedKwhPerM2).toBeNull();
    expect(r.status).toBe("OK");
    expect(r.correction).toBe("NON_CORRIGEABLE");
    expect(r.correctionProblem).toMatch(/2026.*non corrigeable/);
  });

  it("activité inconnue : corrigée = brute, énergies signalées", () => {
    const [r] = buildYearIndicators({ climateRows, consumptions: [elec(2023, 1000)], category: null, surfaceM2: 100 });
    expect(r.correctedKwh).toBe(12000);
    expect(r.unknownShares).toEqual(["ELECTRICITY"]);
  });

  it("fichier indisponible ou autre station : toutes les années non corrigeables, avec la raison", () => {
    const a = buildYearIndicators({ climateRows: null, unavailableReason: "Fichier absent.", consumptions: [elec(2023, 1000)], category: "CAP18", surfaceM2: 1 });
    expect(a[0].correction).toBe("NON_CORRIGEABLE");
    expect(a[0].correctionProblem).toBe("Fichier absent.");
    const b = buildYearIndicators({ climateRows, unavailableReason: "Autre station.", consumptions: [elec(2023, 1000)], category: "CAP18", surfaceM2: 1 });
    expect(b[0].correctedKwh).toBeNull();
    expect(b[0].correctionProblem).toBe("Autre station.");
  });

  it("surface inconnue : corrigée calculée, kWh/m² null", () => {
    const [r] = buildYearIndicators({ climateRows, consumptions: [elec(2023, 1000)], category: "CAP18", surfaceM2: null });
    expect(r.correctedKwh).not.toBeNull();
    expect(r.correctedKwhPerM2).toBeNull();
  });

  it("consommation sans mois ignorée ; aucune consommation → aucune ligne", () => {
    expect(buildYearIndicators({ climateRows, consumptions: [{ year: 2023, energyType: "GAS", months: [] }], category: "CAP18", surfaceM2: 1 })).toEqual([]);
  });
});
