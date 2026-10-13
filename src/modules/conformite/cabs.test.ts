import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cabsThreshold, computeCabs } from "./cabs";
import { CABS_FILE, readCabsFile } from "./cabs-source";

const rows = readCabsFile(join(process.cwd(), CABS_FILE)).rows;

describe("6.2 — cabsThreshold (vrai fichier)", () => {
  it("SCAP1803 Restaurant traditionnel, H1a, < 400 m : 99 + 133 = 232 kWh/m²/an", () => {
    expect(cabsThreshold(rows, "SCAP1803", "H1a", "<400")).toMatchObject({ ok: true, cvc: 99, use: 133, total: 232 });
  });
  it("SCAP1801 bureaux standard, H1a, < 400 m : 57 + 50 = 107 kWh/m²/an", () => {
    expect(cabsThreshold(rows, "SCAP1801", "H1a", "<400")).toMatchObject({ ok: true, cvc: 57, use: 50, total: 107 });
  });
  it("case absente → VALEUR_ABSENTE (jamais 0) : SCAP1801 en H1a, 800-1200 m", () => {
    const r = cabsThreshold(rows, "SCAP1801", "H1a", "800-1200");
    expect(r).toMatchObject({ ok: false, code: "VALEUR_ABSENTE" });
    expect(!r.ok && r.message).toContain("H1a");
  });
  it("réserves froid (CVC vide) → VALEUR_ABSENTE", () => {
    expect(cabsThreshold(rows, "SCAP1812", "H1a", "<400")).toMatchObject({ ok: false, code: "VALEUR_ABSENTE" });
    expect(cabsThreshold(rows, "SCAP1813", "H1a", "<400")).toMatchObject({ ok: false, code: "VALEUR_ABSENTE" });
  });
  it("sous-catégorie inconnue → SOUS_CATEGORIE_INCONNUE", () => {
    expect(cabsThreshold(rows, "DEMO_RESTAURANT", "H1a", "<400")).toMatchObject({ ok: false, code: "SOUS_CATEGORIE_INCONNUE" });
  });
});

describe("6.2 — computeCabs", () => {
  it("232 × 1 200 m² = 278 400 kWh/an (800 + 400 m² de SCAP1803)", () => {
    const r = computeCabs(rows, [{ code: "SCAP1803", surfaceM2: 800 }, { code: "SCAP1803", surfaceM2: 400 }], "H1a", "<400");
    expect(r).toMatchObject({ ok: true, objectiveKwh: 278400, surfaceTotal: 1200 });
  });
  it("plusieurs sous-catégories différentes : somme ligne par ligne", () => {
    const r = computeCabs(rows, [{ code: "SCAP1803", surfaceM2: 1000 }, { code: "SCAP1801", surfaceM2: 200 }], "H1a", "<400");
    if (!r.ok) throw new Error(r.message);
    expect(r.perLine.map((l) => [l.code, l.threshold, l.objectiveKwh])).toEqual([["SCAP1803", 232, 232000], ["SCAP1801", 107, 21400]]);
    expect(r.objectiveKwh).toBe(253400);
  });
  it("surfaces décimales", () => {
    const r = computeCabs(rows, [{ code: "SCAP1803", surfaceM2: 812.5 }, { code: "SCAP1801", surfaceM2: 0.25 }], "H1a", "<400");
    if (!r.ok) throw new Error(r.message);
    expect(r.objectiveKwh).toBeCloseTo(232 * 812.5 + 107 * 0.25, 9);
    expect(r.surfaceTotal).toBeCloseTo(812.75, 9);
  });
  it("aucune ligne → SURFACE_MANQUANTE", () => {
    expect(computeCabs(rows, [], "H1a", "<400")).toMatchObject({ ok: false, code: "SURFACE_MANQUANTE" });
  });
  it("une ligne sans valeur rend tout l'objectif non calculable (pas de total partiel)", () => {
    expect(computeCabs(rows, [{ code: "SCAP1803", surfaceM2: 800 }, { code: "SCAP1812", surfaceM2: 50 }], "H1a", "<400"))
      .toMatchObject({ ok: false, code: "VALEUR_ABSENTE" });
    expect(computeCabs(rows, [{ code: "INCONNU", surfaceM2: 10 }], "H1a", "<400")).toMatchObject({ ok: false, code: "SOUS_CATEGORIE_INCONNUE" });
  });
});
