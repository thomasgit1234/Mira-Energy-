import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "@/lib/csv";
import { CABS_FILE, readCabsFile } from "./cabs-source";
import { DEMO_SUBCATEGORY_TO_OPERAT } from "./provisional";

describe("contexte provisoire", () => {
  it("chaque sous-catégorie de categories.csv a une correspondance OPERAT présente dans le fichier Cabs", () => {
    const subs = parseCsv(readFileSync(join(process.cwd(), "data", "referentiels", "categories.csv"), "utf8"))
      .filter((r) => r.type === "SUBCATEGORY").map((r) => r.code);
    const codes = new Set(readCabsFile(join(process.cwd(), CABS_FILE)).rows.map((r) => r.code));
    expect(subs.length).toBeGreaterThan(0);
    for (const s of subs) {
      expect(DEMO_SUBCATEGORY_TO_OPERAT[s], s).toBeDefined();
      expect(codes.has(DEMO_SUBCATEGORY_TO_OPERAT[s]), s).toBe(true);
    }
  });
});
