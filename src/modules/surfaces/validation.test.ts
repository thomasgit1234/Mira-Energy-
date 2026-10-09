import { describe, expect, it } from "vitest";
import { roundM2, validateSurfaceLines, type Referential } from "./validation";

const REF: Referential = {
  categories: [
    { code: "RESTO", label: "Restauration" },
    { code: "BUREAUX", label: "Bureaux" },
  ],
  subCategories: [
    { code: "RESTAURANT", label: "Restaurant", categoryCode: "RESTO" },
    { code: "RESERVE", label: "Réserve", categoryCode: "RESTO" },
    { code: "OUVERT", label: "Bureaux ouverts", categoryCode: "BUREAUX" },
  ],
};
const L = (categoryCode: string, subCategoryCode: string, surfaceM2: number) => ({ categoryCode, subCategoryCode, surfaceM2 });
const codes = (r: ReturnType<typeof validateSurfaceLines>) => r.issues.map((i) => i.code);

describe("validateSurfaceLines — somme = surface totale", () => {
  it("accepte le cas Dupont : 800 + 400 = 1200", () => {
    const r = validateSurfaceLines([L("RESTO", "RESTAURANT", 800), L("RESTO", "RESERVE", 400)], 1200, REF);
    expect(r.ok).toBe(true);
    expect(r.sum).toBe(1200);
    expect(r.gap).toBe(0);
  });

  it("refuse une somme trop petite et indique l'écart", () => {
    const r = validateSurfaceLines([L("RESTO", "RESTAURANT", 800), L("RESTO", "RESERVE", 300)], 1200, REF);
    expect(r.ok).toBe(false);
    expect(codes(r)).toEqual(["SUM_MISMATCH"]);
    expect(r.gap).toBe(100);
    expect(r.issues[0].message).toContain("inférieure de 100");
  });

  it("refuse une somme trop grande et indique le dépassement", () => {
    const r = validateSurfaceLines([L("RESTO", "RESTAURANT", 800), L("RESTO", "RESERVE", 500)], 1200, REF);
    expect(codes(r)).toEqual(["SUM_MISMATCH"]);
    expect(r.gap).toBe(-100);
    expect(r.issues[0].message).toContain("dépasse de 100");
  });

  it("tolère les erreurs d'arrondi flottant (0,1 + 0,2 = 0,3)", () => {
    const r = validateSurfaceLines([L("RESTO", "RESTAURANT", 0.1), L("RESTO", "RESERVE", 0.2)], 0.3, REF);
    expect(r.ok).toBe(true);
  });

  it("accepte plusieurs catégories", () => {
    const r = validateSurfaceLines([L("RESTO", "RESTAURANT", 700), L("BUREAUX", "OUVERT", 500)], 1200, REF);
    expect(r.ok).toBe(true);
  });
});

describe("validateSurfaceLines — validité des lignes", () => {
  it("refuse une saisie vide", () => {
    expect(codes(validateSurfaceLines([], 1200, REF))).toEqual(["NO_LINES"]);
  });

  it("refuse une catégorie ou une sous-catégorie manquante", () => {
    const r = validateSurfaceLines([L("", "", 1200)], 1200, REF);
    expect(codes(r)).toEqual(["MISSING_CATEGORY", "MISSING_SUBCATEGORY"]);
    expect(r.issues[0].line).toBe(0);
  });

  it("refuse un code inconnu du référentiel", () => {
    expect(codes(validateSurfaceLines([L("XXX", "RESTAURANT", 1200)], 1200, REF))).toContain("UNKNOWN_CATEGORY");
    expect(codes(validateSurfaceLines([L("RESTO", "YYY", 1200)], 1200, REF))).toContain("UNKNOWN_SUBCATEGORY");
  });

  it("refuse une sous-catégorie qui n'appartient pas à la catégorie", () => {
    const r = validateSurfaceLines([L("BUREAUX", "RESTAURANT", 1200)], 1200, REF);
    expect(codes(r)).toEqual(["SUBCATEGORY_NOT_IN_CATEGORY"]);
  });

  it.each([[0], [-5], [Number.NaN], [Number.POSITIVE_INFINITY]])("refuse la surface %s", (s) => {
    expect(codes(validateSurfaceLines([L("RESTO", "RESTAURANT", s)], 1200, REF))).toContain("INVALID_SURFACE");
  });

  it("refuse la même sous-catégorie saisie deux fois", () => {
    const r = validateSurfaceLines([L("RESTO", "RESTAURANT", 600), L("RESTO", "RESTAURANT", 600)], 1200, REF);
    expect(codes(r)).toEqual(["DUPLICATE_LINE"]);
    expect(r.issues[0].line).toBe(1);
  });
});

describe("roundM2", () => {
  it("arrondit au centième", () => {
    expect(roundM2(0.1 + 0.2)).toBe(0.3);
    expect(roundM2(12.3456)).toBe(12.35);
  });
});
