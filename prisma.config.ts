import "dotenv/config";
import { defineConfig } from "prisma/config";

// DATABASE_URL vient de .env. Valeur par défaut = celle de .env.example, pour que
// `npm install` (qui lance `prisma generate`) fonctionne sur un clone neuf sans .env.
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://mira:mira@localhost:5432/mira";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  datasource: { url: databaseUrl },
});
