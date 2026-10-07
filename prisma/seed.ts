// Jeu de données de démonstration : « Monsieur Dupont » (100 % FICTIF).
//   npm run db:seed   (idempotent : relançable sans doublons)
import "dotenv/config";
import { createPrismaClient } from "../src/lib/db";
import { DEMO_CLIMATE_ZONE } from "../src/lib/domain";

const DEMO_EMAIL = process.env.DEV_USER_EMAIL ?? "demo.dupont@example.com";
const YEAR = new Date().getFullYear() - 1;

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
          climateZone: DEMO_CLIMATE_ZONE, surfaceTotal: 1200,
          users: { connect: { id: user.id } },
        },
      });
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

    for (const [zone, dju] of [["2019", 2500], ["2021", 2600], [String(YEAR), 2400]] as const) {
      await db.djYear.upsert({
        where: { year_climateZone: { year: Number(zone), climateZone: DEMO_CLIMATE_ZONE } },
        create: { year: Number(zone), climateZone: DEMO_CLIMATE_ZONE, dju },
        update: { dju },
      });
    }

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
