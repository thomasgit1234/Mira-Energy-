// Importe les fichiers de data/referentiels/*.csv en base (idempotent : relancer ne duplique rien).
//   npm run db:import
// Formats (À CONFIRMER avec la tutrice, voir data/referentiels/README.md) :
//   zones-climatiques.csv : postcode;city;zone
//   dju.csv               : year;zone;dju
//   categories.csv        : type;code;label;value   (type = CATEGORY | SUBCATEGORY | CABS_THRESHOLD ; value = JSON)
import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseCsv } from "../src/lib/csv";
import { createPrismaClient } from "../src/lib/db";
import { REFERENCE_TYPES } from "../src/lib/domain";

const dir = join(process.cwd(), "data", "referentiels");
const read = (f: string) => (existsSync(join(dir, f)) ? parseCsv(readFileSync(join(dir, f), "utf8")) : null);

async function main() {
  const db = createPrismaClient();
  const counts: Record<string, number> = {};
  try {
    const zones = read("zones-climatiques.csv");
    if (zones) {
      for (const z of zones) {
        const existing = await db.climateZone.findFirst({ where: { postcode: z.postcode, city: z.city } });
        if (existing) await db.climateZone.update({ where: { id: existing.id }, data: { zone: z.zone } });
        else await db.climateZone.create({ data: { postcode: z.postcode, city: z.city, zone: z.zone } });
      }
      counts.zones = zones.length;
    }
    const dju = read("dju.csv");
    if (dju) {
      for (const d of dju) {
        const year = Number(d.year), value = Number(d.dju);
        if (!Number.isInteger(year) || !Number.isFinite(value)) throw new Error(`dju.csv : ligne invalide ${JSON.stringify(d)}`);
        await db.djYear.upsert({
          where: { year_climateZone: { year, climateZone: d.zone } },
          create: { year, climateZone: d.zone, dju: value },
          update: { dju: value },
        });
      }
      counts.dju = dju.length;
    }
    const refs = read("categories.csv");
    if (refs) {
      for (const r of refs) {
        if (!(REFERENCE_TYPES as readonly string[]).includes(r.type)) throw new Error(`categories.csv : type inconnu "${r.type}"`);
        const value = JSON.parse(r.value || "{}");
        await db.referenceData.upsert({
          where: { type_code: { type: r.type, code: r.code } },
          create: { type: r.type, code: r.code, label: r.label, value },
          update: { label: r.label, value },
        });
      }
      counts.references = refs.length;
    }
    console.log("Import terminé :", counts);
    if (Object.keys(counts).length === 0) console.log("Aucun fichier trouvé dans data/referentiels/.");
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
