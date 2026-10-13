import { describe, expect, it } from "vitest";
import { CRELAT_REDUCTION, computeCrelat } from "./crelat";

describe("6.1 — computeCrelat", () => {
  it("Créf = 52 800 → 31 680 / 26 400 / 21 120", () => {
    const r = computeCrelat(52800);
    if (!r.ok) throw new Error(r.reason);
    expect(r.objectives[2030]).toBeCloseTo(31680, 9);
    expect(r.objectives[2040]).toBeCloseTo(26400, 9);
    expect(r.objectives[2050]).toBeCloseTo(21120, 9);
    expect(r.crefKwh).toBe(52800);
  });

  it("applique −40 %, −50 %, −60 %", () => {
    expect(CRELAT_REDUCTION).toEqual({ 2030: 0.4, 2040: 0.5, 2050: 0.6 });
  });

  it("ne cache aucun arrondi (flottants)", () => {
    const r = computeCrelat(47700.5);
    if (!r.ok) throw new Error(r.reason);
    expect(r.objectives[2030]).toBeCloseTo(28620.3, 9);
    expect(r.objectives[2050]).toBeCloseTo(19080.2, 9);
    expect(Number.isInteger(r.objectives[2030])).toBe(false);
  });

  it.each([[0], [-100], [Number.NaN], [Number.POSITIVE_INFINITY], [null], [undefined]])("Créf = %s → erreur claire", (v) => {
    const r = computeCrelat(v as number | null | undefined);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason.length).toBeGreaterThan(10);
  });
});
