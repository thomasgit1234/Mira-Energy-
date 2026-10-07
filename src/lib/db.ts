// Connexion unique à la base (client Prisma 7 + adaptateur PostgreSQL).
// À importer partout où l'on lit/écrit en base :  import { db } from "@/lib/db";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL manquant : copiez .env.example en .env (ou lancez `npm run setup`).");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Création PARESSEUSE : la connexion n'est ouverte qu'au premier vrai usage, ce qui permet
// d'importer des modules (et de tester les fonctions pures) sans base ni DATABASE_URL.
// En développement, Next recharge les modules à chaque modification : on garde une seule
// instance sur `globalThis` pour ne pas saturer les connexions.
const globalForDb = globalThis as unknown as { __miraDb?: PrismaClient };

function getDb(): PrismaClient {
  const client = globalForDb.__miraDb ?? createPrismaClient();
  globalForDb.__miraDb = client;
  return client;
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getDb() as unknown as Record<string | symbol, unknown>;
    const value = client[prop];
    return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
  },
});
