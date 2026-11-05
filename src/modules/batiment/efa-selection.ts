// Sélecteur d'EFA — lecture du cookie et contrôle en base. Serveur uniquement.
// Toutes les pages et API passent par resolveUserEfaId : une seule règle de choix (efa-choice.ts) pour tous les modules.
import { db } from "@/lib/db";
import { EFA_COOKIE, pickEfaId } from "./efa-choice";

/** EFA mémorisée dans le cookie ; undefined hors requête HTTP (tests, scripts) ou sans cookie. */
async function rememberedEfaId(): Promise<string | undefined> {
  try {
    const { cookies } = await import("next/headers");
    return (await cookies()).get(EFA_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

/** Identifiants des EFA rattachées à l'utilisateur, triés par id. */
export async function userEfaIds(userId: string): Promise<string[]> {
  const efas = await db.eFA.findMany({
    where: { building: { users: { some: { id: userId } } } },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  return efas.map((e) => e.id);
}

/**
 * EFA à afficher pour l'utilisateur : l'EFA demandée (sinon null → 404), puis celle du cookie, puis la première.
 * null = aucune EFA (ou EFA demandée qui n'est pas à lui) : l'appelant renvoie 404 sans distinguer les deux cas.
 */
export async function resolveUserEfaId(userId: string, requested?: string | null): Promise<string | null> {
  return pickEfaId(await userEfaIds(userId), requested, requested ? undefined : await rememberedEfaId());
}
