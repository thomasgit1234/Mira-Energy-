// Jeu de données de démonstration : « Monsieur Dupont », site de démonstration FICTIF à Laon (02000).
//   npm run db:seed   (idempotent : relançable sans doublons)
// Nom, adresse et consommations sont FICTIFS ; les codes d'activité (SCAP1803, SCAP0401) viennent du référentiel
// OPERAT v9.0 réel (npm run db:import). Deux EFA : restauration 1 200 m² (toujours la PREMIÈRE, voir D18) et
// bureaux 500 m².
import "dotenv/config";
import { createPrismaClient } from "../src/lib/db";

const DEMO_EMAIL = process.env.DEV_USER_EMAIL ?? "demo.dupont@example.com";
const YEAR = new Date().getFullYear() - 1;
// Station Météo-France de suivi (Aulnois-sous-Laon). Les DJU RÉELS viennent de `npm run db:import`.
// Provisoire : le champ climateZone porte le code station (voir src/modules/climat/README.md, D16).
const DJU_STATION = "02037002";

/** Site de démonstration : aucune adresse postale réelle, seulement la ville et le code postal (zone H1a). */
const SITE = { address: "Site de démonstration (fictif)", postcode: "02000", city: "Laon", surfaceTotal: 1700 };
// Ancien bâtiment fictif des versions précédentes du seed, repris et mis à jour plutôt que dupliqué.
const OLD_SITE = { address: "1 rue de la Démo", postcode: "00000" };

const RESTAURATION = { surfaceTotal: 1200, line: { categoryCode: "CAP18", subCategoryCode: "SCAP1803", surfaceM2: 1200 } };
const BUREAUX = { surfaceTotal: 500, line: { categoryCode: "CAP04", subCategoryCode: "SCAP0401", surfaceM2: 500 } };
/** Code d'activité OPERAT (CAPxx…, SCAPxxxx…) : sert à repérer les anciennes lignes fictives à remplacer. */
const OPERAT_CODE = /^S?CAP\d{2}(\d{2})*$/;

async function main() {
  const db = createPrismaClient();
  try {
    const user = await db.user.upsert({
      where: { email: DEMO_EMAIL },
      create: { email: DEMO_EMAIL, password: "dev-stub-not-a-real-hash", role: "OWNER" },
      update: {},
    });

    // Bâtiment : celui de la première EFA de l'utilisateur (comme les pages), sinon l'ancien bâtiment fictif.
    const firstEfa = await db.eFA.findFirst({ where: { building: { users: { some: { id: user.id } } } }, orderBy: { id: "asc" } });
    const existing = firstEfa
      ? await db.building.findUnique({ where: { id: firstEfa.buildingId } })
      : await db.building.findFirst({ where: { OR: [OLD_SITE, { address: SITE.address, postcode: SITE.postcode }] } });
    const siteData = { ...SITE, climateZone: DJU_STATION };
    const building = existing
      ? await db.building.update({ where: { id: existing.id }, data: { ...siteData, users: { connect: { id: user.id } } } })
      : await db.building.create({ data: { ...siteData, users: { connect: { id: user.id } } } });

    // EFA restauration = première EFA du bâtiment (tri par id, comme les pages).
    let resto = await db.eFA.findFirst({ where: { buildingId: building.id }, orderBy: { id: "asc" }, include: { surfaces: true } });
    if (!resto) {
      resto = await db.eFA.create({
        data: { buildingId: building.id, entityType: "SASU", role: "OWNER_OCCUPIER", surfaceTotal: RESTAURATION.surfaceTotal },
        include: { surfaces: true },
      });
    }
    await db.eFA.update({ where: { id: resto.id }, data: { surfaceTotal: RESTAURATION.surfaceTotal } });
    // Lignes remplacées seulement si absentes ou fictives : une saisie faite sur /surfaces est conservée.
    const fictive = resto.surfaces.some((s) => !OPERAT_CODE.test(s.categoryCode) || !OPERAT_CODE.test(s.subCategoryCode));
    if (resto.surfaces.length === 0 || fictive) {
      await db.$transaction([
        db.surfaceLine.deleteMany({ where: { efaId: resto.id } }),
        db.surfaceLine.create({ data: { efaId: resto.id, ...RESTAURATION.line } }),
      ]);
    }

    // EFA bureaux : id dérivé de celui de la restauration, donc toujours triée APRÈS elle. Sans consommation.
    const bureauxId = `${resto.id}-bureaux`;
    await db.eFA.upsert({
      where: { id: bureauxId },
      create: {
        id: bureauxId, buildingId: building.id, entityType: "SASU", role: "OWNER_OCCUPIER", surfaceTotal: BUREAUX.surfaceTotal,
        surfaces: { create: [BUREAUX.line] },
      },
      update: { surfaceTotal: BUREAUX.surfaceTotal },
    });

    // Nettoyage : ligne de zone fictive (code postal 00000) des versions précédentes.
    await db.climateZone.deleteMany({ where: { postcode: OLD_SITE.postcode } });

    // Consommations FICTIVES de la restauration (mêmes formes que celles écrites par saveConsumption).
    for (const year of [2019, YEAR]) {
      const c = await db.consumption.upsert({
        where: { efaId_year_energyType: { efaId: resto.id, year, energyType: "ELECTRICITY" } },
        create: { efaId: resto.id, year, energyType: "ELECTRICITY", source: "MANUAL", data: { demo: true }, validated: true },
        update: {},
      });
      for (let month = 1; month <= 12; month++) {
        const kwh = 3000 + (month <= 3 || month >= 11 ? 900 : 0) + (year === 2019 ? 600 : 0);
        await db.consumptionMonth.upsert({
          where: { consumptionId_year_month: { consumptionId: c.id, year, month } },
          create: { consumptionId: c.id, year, month, kwh, source: "MANUAL", validated: true },
          update: {},
        });
      }
    }
    console.log(`Seed OK : utilisateur ${user.email}, bâtiment ${building.id} (${SITE.city} ${SITE.postcode}), EFA restauration ${resto.id}, EFA bureaux ${bureauxId}`);
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
