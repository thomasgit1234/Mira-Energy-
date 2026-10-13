// Jeu de données de démonstration : « Monsieur Dupont » (100 % FICTIF).
//   npm run db:seed   (idempotent : relançable sans doublons)
import "dotenv/config";
import { createPrismaClient } from "../src/lib/db";
import { DEMO_CLIMATE_ZONE } from "../src/lib/domain";

const DEMO_EMAIL = process.env.DEV_USER_EMAIL ?? "demo.dupont@example.com";
const YEAR = new Date().getFullYear() - 1;
// Station Météo-France de suivi du bâtiment de démo (Aulnois-sous-Laon). Les DJU RÉELS viennent de
// `npm run db:import` (data/referentiels/dju/) : le seed n'écrit plus aucun DJU. Provisoire : le champ
// climateZone porte le code station (voir src/modules/climat/README.md).
const DEMO_DJU_STATION = "02037002";

async function main() {
  const db = createPrismaClient();
  try {
    const user = await db.user.upsert({
      where: { email: DEMO_EMAIL },
      create: { email: DEMO_EMAIL, password: "dev-stub-not-a-real-hash", role: "OWNER" },
      update: {},
    });

    let building = await db.building.findFirst({ where: { address: "1 rue de la Démo", postcode: "00000" } });
    if (!building) {
      building = await db.building.create({
        data: {
          address: "1 rue de la Démo", postcode: "00000", city: "Ville Démo",
          climateZone: DEMO_DJU_STATION, surfaceTotal: 1200,
          users: { connect: { id: user.id } },
        },
      });
    } else if (building.climateZone !== DEMO_DJU_STATION) {
      // Bases créées avant la tâche 4.1 : le bâtiment pointait sur la zone fictive « DEMO ».
      building = await db.building.update({ where: { id: building.id }, data: { climateZone: DEMO_DJU_STATION } });
    }

    let efa = await db.eFA.findFirst({ where: { buildingId: building.id } });
    if (!efa) {
      efa = await db.eFA.create({
        data: {
          buildingId: building.id, entityType: "SASU", role: "OWNER_OCCUPIER",
          surfaces: { create: [
            { categoryCode: "DEMO_RESTAURATION", subCategoryCode: "DEMO_RESTAURANT", surfaceM2: 800 },
            { categoryCode: "DEMO_RESTAURATION", subCategoryCode: "DEMO_RESTAURANT_RESERVE", surfaceM2: 400 },
          ] },
        },
      });
    }

    // Nettoyage : supprime les anciens DJU FICTIFS (zone « DEMO ») écrits par les versions précédentes du seed.
    await db.djYear.deleteMany({ where: { climateZone: DEMO_CLIMATE_ZONE } });

    // Consommations fictives (mêmes formes que celles écrites par saveConsumption).
    for (const year of [2019, YEAR]) {
      const c = await db.consumption.upsert({
        where: { efaId_year_energyType: { efaId: efa.id, year, energyType: "ELECTRICITY" } },
        create: { efaId: efa.id, year, energyType: "ELECTRICITY", source: "MANUAL", data: { demo: true }, validated: true },
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
    console.log(`Seed OK : utilisateur ${user.email}, bâtiment ${building.id}, EFA ${efa.id}`);
  } finally {
    await db.$disconnect();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
