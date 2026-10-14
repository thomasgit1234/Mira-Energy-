// Importe les fichiers de data/referentiels/*.csv en base (idempotent : relancer ne duplique rien).
//   npm run db:import
// Sources (voir data/referentiels/README.md) :
//   dju/dju_mensuel_2010_2025.csv : DJU mensuels Météo-France par station ; format connu UNIQUEMENT de
//                                   readDjuFile (src/modules/climat/dju-source.ts), qui les agrège par année
//   operat/referentiel_activites_OPERAT_v<X>.csv : référentiel d'activités ADEME (réel) ; format connu UNIQUEMENT de
//                                   readOperatActivities (src/modules/batiment/operat-activites.ts)
//   operat/departement_zone_climatique.csv : PAS importée en base (lue à la demande par
//                                   src/modules/batiment/zone-climatique.ts) ; seulement vérifiée ici
// categories.csv et zones-climatiques.csv (fictifs) ne sont plus lus : supprimés à la branche site-laon.
import "dotenv/config";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createPrismaClient } from "../src/lib/db";
import { readOperatActivities } from "../src/modules/batiment/operat-activites";
import { DEPARTMENT_ZONES_FILE, readDepartmentZones } from "../src/modules/batiment/zone-climatique";
import { readDjuFile } from "../src/modules/climat/dju-source";

const dir = join(process.cwd(), "data", "referentiels");

async function main() {
  const db = createPrismaClient();
  const counts: Record<string, number> = {};
  try {
    // Table département → zone (tâche 1.2) : vérifiée pour signaler tout de suite un fichier abîmé.
    const zones = readDepartmentZones(join(process.cwd(), DEPARTMENT_ZONES_FILE));
    if (zones.issues.length > 0) throw new Error(`Table département → zone refusée :\n- ${zones.issues.join("\n- ")}`);
    counts.departements = zones.rows.length;
    // DJU (tâche 4.1) : le format du fichier n'est connu QUE de readDjuFile. Table DjYear : climateZone = code station.
    const djuFile = join(dir, "dju", "dju_mensuel_2010_2025.csv");
    if (existsSync(djuFile)) {
      const dju = readDjuFile(djuFile);
      if (dju.errorCount > 0) throw new Error(`Fichier DJU refusé (${djuFile}) :\n- ${dju.issues.join("\n- ")}`);
      for (const warning of dju.issues) console.warn(`DJU : ${warning}`); // années incomplètes, ignorées
      for (const d of dju.rows) {
        await db.djYear.upsert({
          where: { year_climateZone: { year: d.year, climateZone: d.zone } },
          create: { year: d.year, climateZone: d.zone, dju: d.dju },
          update: { dju: d.dju },
        });
      }
      counts.dju = dju.rows.length;
    }
    // Référentiel d'activités OPERAT → ReferenceData (CATEGORY CAPxx, SUBCATEGORY SCAPxxxx). Le module surfaces
    // lit value.category ; version, ajustements et indicateurs servent à l'export (phase 08) et au Cabs modulé.
    const operat = readOperatActivities(join(dir, "operat"));
    if (operat.issues.length > 0) throw new Error(`Référentiel OPERAT refusé (${operat.fileName}) :\n- ${operat.issues.join("\n- ")}`);
    const { version } = operat;
    const rows = [
      ...operat.categories.map((c) => ({ type: "CATEGORY", code: c.code, label: c.label, value: { version } })),
      ...operat.subCategories.map((s) => ({
        type: "SUBCATEGORY", code: s.code, label: s.label,
        value: { category: s.categoryCode, version, ajustements: s.ajustements, indicateurs: s.indicateurs },
      })),
    ];
    for (const r of rows) {
      await db.referenceData.upsert({
        where: { type_code: { type: r.type, code: r.code } },
        create: r,
        update: { label: r.label, value: r.value },
      });
    }
    // Synchronisation : une ligne absente de la source est supprimée, sauf si une ligne de surface l'utilise encore
    // (on la garde et on prévient). Les seuils CABS_THRESHOLD n'ont plus de source (Cabs lu par conformite/cabs-source.ts).
    const sourceKeys = new Set(rows.map((r) => `${r.type}:${r.code}`));
    const used = await db.surfaceLine.findMany({ select: { categoryCode: true, subCategoryCode: true } });
    const usedKeys = new Set(used.flatMap((l) => [`CATEGORY:${l.categoryCode}`, `SUBCATEGORY:${l.subCategoryCode}`]));
    const stale = await db.referenceData.findMany({ where: { type: { in: ["CATEGORY", "SUBCATEGORY", "CABS_THRESHOLD"] } } });
    let removed = 0;
    for (const r of stale) {
      const key = `${r.type}:${r.code}`;
      if (sourceKeys.has(key)) continue;
      if (usedKeys.has(key)) {
        console.warn(`Référentiel OPERAT : ${r.type} ${r.code} absent de la v${version} mais utilisé par une ligne de surface, conservé.`);
        continue;
      }
      await db.referenceData.delete({ where: { id: r.id } });
      removed++;
    }
    counts.categories = operat.categories.length;
    counts.sousCategories = operat.subCategories.length;
    counts.referencesSupprimees = removed;
    console.log(`Référentiel OPERAT v${version} (${operat.fileName}).`);
    console.log("Import terminé :", counts);
    if (Object.keys(counts).length === 0) console.log("Aucun fichier trouvé dans data/referentiels/.");
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
