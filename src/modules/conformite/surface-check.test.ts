import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeCabs } from "./cabs";
import { CABS_FILE, readCabsFile } from "./cabs-source";
import { cabsForEfas } from "./site-efas";
import { checkCabsSurface } from "./surface-check";
import { evaluateVerdict } from "./verdict";

const rows = readCabsFile(join(process.cwd(), CABS_FILE)).rows;
const cabsFor = (surfaceM2: number) => computeCabs(rows, [{ code: "SCAP1803", surfaceM2 }], "H1a", "<400");

describe("checkCabsSurface — somme des lignes = surface de l'EFA", () => {
  it("surfaces cohérentes (1 200 = 1 200) : Cabs inchangé, 278 400 kWh/an", () => {
    expect(checkCabsSurface(cabsFor(1200), 1200)).toMatchObject({ ok: true, objectiveKwh: 278400 });
  });

  it("lignes à 1 100 m² pour une EFA de 1 200 m² : non calculable, jamais 255 200", () => {
    const r = checkCabsSurface(cabsFor(1100), 1200);
    expect(r).toMatchObject({ ok: false, code: "SURFACES_INCOHERENTES" });
    expect(r).not.toHaveProperty("objectiveKwh");
    if (!r.ok) expect(r.message).toMatch(/1\s100/u); // séparateur de milliers fr-FR = espace fine insécable
  });

  it("dépassement (1 300 m² de lignes) : non calculable aussi", () => {
    expect(checkCabsSurface(cabsFor(1300), 1200)).toMatchObject({ ok: false, code: "SURFACES_INCOHERENTES" });
  });

  it("écart sous le centième de m² (0,1 + 0,2) : toléré", () => {
    const cabs = computeCabs(rows, [{ code: "SCAP1803", surfaceM2: 0.1 }, { code: "SCAP1801", surfaceM2: 0.2 }], "H1a", "<400");
    expect(checkCabsSurface(cabs, 0.3).ok).toBe(true);
  });

  it("une erreur Cabs existante est conservée telle quelle", () => {
    const err = computeCabs(rows, [{ code: "SCAP0401", surfaceM2: 500 }], "H1a", "<400");
    expect(checkCabsSurface(err, 999)).toBe(err);
  });

  it("verdict : surfaces incohérentes → Cabs non calculable, Crelat seul décide", () => {
    const v = evaluateVerdict({ crelat: { ok: false, reason: "pas de référence" }, cabs: checkCabsSurface(cabsFor(1100), 1200), currentKwh: 40500, currentYear: 2025, referenceYear: null }).main;
    expect(v.cabs.calculable).toBe(false);
    expect(v.status).toBe("INDETERMINE");
  });

  it("autres EFA du site : contrôle appliqué aussi", () => {
    const [e] = cabsForEfas(rows, [{ id: "x", surfaceTotal: 1200, lines: [{ subCategoryCode: "SCAP1803", surfaceM2: 1100 }] }], "H1a", "<400");
    expect(e.cabs).toMatchObject({ ok: false, code: "SURFACES_INCOHERENTES" });
  });
});
