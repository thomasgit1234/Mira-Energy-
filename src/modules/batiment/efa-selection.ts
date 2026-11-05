// Sélecteur d'EFA et cloisonnement (9.3) — lecture du cookie et contrôle en base. Serveur uniquement.
// Toutes les pages et API passent par resolveUserEfaId : une seule règle de choix (efa-choice.ts) et une seule règle
// d'accès (access.ts, D22) pour tous les modules.
import { db } from "@/lib/db";
import { visibleEfaIds } from "./access";
import { EFA_COOKIE, pickEfaId } from "./efa-choice";

/** EFA mémorisée dans le cookie ; undefined hors requête HTTP (tests, scripts) ou sans cookie. */
export async function rememberedEfaId(): Promise<string | undefined> {
  try {
    const { cookies } = await import("next/headers");
    return (await cookies()).get(EFA_COOKIE)?.value;
  } catch {
    return undefined;
  }
}

/**
 * Identifiants des EFA que l'utilisateur a le droit de voir, triés par id (cloisonnement 9.3) :
 * propriétaire / administrateur → toutes les EFA de ses bâtiments ; locataire → seulement les EFA dont il est occupant.
 */
export async function userEfaIds(userId: string): Promise<string[]> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user) return [];
  const efas = await db.eFA.findMany({
    where: { OR: [{ building: { users: { some: { id: userId } } } }, { occupants: { some: { id: userId } } }] },
    select: { id: true, building: { select: { users: { select: { id: true } } } }, occupants: { select: { id: true } } },
  });
  return visibleEfaIds(
    user,
    efas.map((e) => ({ id: e.id, buildingUserIds: e.building.users.map((u) => u.id), occupantIds: e.occupants.map((u) => u.id) })),
  );
}

/**
 * EFA à afficher pour l'utilisateur : l'EFA demandée (sinon null → 404), puis celle du cookie, puis la première.
 * null = aucune EFA (ou EFA demandée hors de son périmètre) : l'appelant renvoie 404 sans distinguer les deux cas.
 */
export async function resolveUserEfaId(userId: string, requested?: string | null): Promise<string | null> {
  return pickEfaId(await userEfaIds(userId), requested, requested ? undefined : await rememberedEfaId());
}

/** Contrôle d'écriture : l'EFA est-elle dans le périmètre de l'utilisateur ? (même règle que l'affichage) */
export async function userCanAccessEfa(userId: string, efaId: string): Promise<boolean> {
  return (await userEfaIds(userId)).includes(efaId);
}
