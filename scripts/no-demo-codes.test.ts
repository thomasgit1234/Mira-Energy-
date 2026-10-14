// Garde-fou : plus aucun code fictif « DEMO_… » (catégorie, sous-catégorie, zone) dans le code, le seed et les référentiels.
// Les NOMS de constantes (ex. DEMO_BANNER, DEMO_EMAIL) ne comptent pas : seules les chaînes "DEMO_…" sont cherchées.
// Ce fichier s'exclut lui-même ; src/generated/ (client Prisma généré) est ignoré.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SELF = join("scripts", "no-demo-codes.test.ts");
const DIRS = ["src", "prisma", "scripts", join("data", "referentiels")];
const IGNORED = [join("src", "generated"), "node_modules"];
const CODE = /\.(ts|tsx|js|mjs|cjs|sql|prisma)$/;
const DATA = /\.(csv|json)$/;

function files(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    if (IGNORED.includes(path)) return [];
    return statSync(join(ROOT, path)).isDirectory() ? files(path) : [path];
  });
}

describe("aucun code DEMO_*", () => {
  const all = DIRS.flatMap(files).filter((f) => f !== SELF);

  it("parcourt bien le seed, la conformité et les référentiels", () => {
    for (const f of [join("prisma", "seed.ts"), join("src", "modules", "conformite", "repository.ts"), join("data", "referentiels", "operat", "referentiel_activites_OPERAT_v9.0.csv")]) {
      expect(all).toContain(f);
    }
  });

  it("aucune chaîne \"DEMO_…\" dans le code, aucun DEMO_… dans les fichiers de données", () => {
    const found: string[] = [];
    for (const f of all) {
      const pattern = CODE.test(f) ? /["'`]DEMO_[A-Za-z0-9_]*["'`]/g : DATA.test(f) ? /\bDEMO_[A-Za-z0-9_]*/g : null;
      if (!pattern) continue;
      readFileSync(join(ROOT, f), "utf8").split(/\r?\n/).forEach((line, i) => {
        for (const m of line.match(pattern) ?? []) found.push(`${relative(ROOT, join(ROOT, f))}:${i + 1} ${m}`);
      });
    }
    expect(found).toEqual([]);
  });

  it("les anciens fichiers fictifs ont disparu", () => {
    expect(all).not.toContain(join("data", "referentiels", "categories.csv"));
    expect(all).not.toContain(join("data", "referentiels", "zones-climatiques.csv"));
    expect(all).not.toContain(join("src", "modules", "conformite", "provisional.ts"));
  });
});
