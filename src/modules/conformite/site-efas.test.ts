import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CABS_FILE, readCabsFile } from "./cabs-source";
import { computeCrelat } from "./crelat";
import { cabsForEfas } from "./site-efas";
import { evaluateVerdict } from "./verdict";

// Site de démonstration de Laon (02000 → H1a, altitude < 400 m à confirmer), sur le VRAI fichier Cabs.
const rows = readCabsFile(join(process.cwd(), CABS_FILE)).rows;
const RESTO = { id: "resto", surfaceTotal: 1200, lines: [{ subCategoryCode: "SCAP1803", surfaceM2: 1200 }] };
const BUREAUX = { id: "resto-bureaux", surfaceTotal: 500, lines: [{ subCategoryCode: "SCAP0401", surfaceM2: 500 }] };
const base = { currentKwh: 40500, currentYear: 2025, referenceYear: 2013 };

describe("site de Laon — Cabs par EFA (codes OPERAT des lignes de surface)", () => {
  const [resto, bureaux] = cabsForEfas(rows, [RESTO, BUREAUX], "H1a", "<400");

  it("restauration SCAP1803, H1a, < 400 m, 1 200 m² : 232 × 1 200 = 278 400 kWh/an", () => {
    expect(resto.cabs).toMatchObject({ ok: true, objectiveKwh: 278400, surfaceTotal: 1200 });
    expect(resto.codes).toEqual(["SCAP1803"]);
  });

  it("bureaux SCAP0401 (CAP04, absente du fichier CAP18) : non calculable, jamais de valeur inventée", () => {
    expect(bureaux.cabs).toEqual({ ok: false, code: "SOUS_CATEGORIE_INCONNUE", message: "Sous-catégorie SCAP0401 absente du référentiel Cabs." });
    expect(bureaux.cabs).not.toHaveProperty("objectiveKwh");
  });

  it("bureaux : verdict sur Crelat seul quand il est calculable", () => {
    const v = evaluateVerdict({ ...base, crelat: computeCrelat(52800), cabs: bureaux.cabs, currentKwh: 30000 }).main;
    expect(v.cabs.calculable).toBe(false);
    expect(v.crelat).toMatchObject({ calculable: true, objectiveKwh: 31680, met: true });
    expect(v.status).toBe("CONFORME");
    expect(v.favorable).toBe("CRELAT");
  });

  it("bureaux : INDÉTERMINÉ sans année de référence (aucune méthode calculable)", () => {
    const v = evaluateVerdict({ ...base, referenceYear: null, crelat: { ok: false, reason: "Aucune année de référence choisie." }, cabs: bureaux.cabs }).main;
    expect(v.status).toBe("INDETERMINE");
    expect(v.favorable).toBeNull();
  });

  it("restauration : CONFORME par Cabs avec la référence 2013 (Créf 52 800) et 40 500 kWh en 2025", () => {
    const v = evaluateVerdict({ ...base, crelat: computeCrelat(52800), cabs: resto.cabs }).main;
    expect(v.status).toBe("CONFORME");
    expect(v.favorable).toBe("CABS");
  });
});
