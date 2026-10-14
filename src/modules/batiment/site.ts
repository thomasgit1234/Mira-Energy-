// Site de l'utilisateur courant : bâtiment et EFA, lus en base. Serveur uniquement.
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Tranche d'altitude du site de démo (Laon) pour le Cabs : « < 400 m », À CONFIRMER (IGN).
 * Constante isolée (D15) : pas de champ en base ; sera remplacée quand la tâche 1.1 saura lire l'altitude.
 */
export const SITE_ALTITUDE_BAND = "<400" as const;
export const SITE_ALTITUDE_NOTE = "altitude à confirmer (IGN)";

export class BatimentError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "BatimentError";
  }
}

export type SiteEfa = {
  id: string;
  entityType: string;
  role: string;
  /** Surface de l'EFA, repli sur celle du bâtiment (D14). */
  surfaceTotal: number;
  lines: { categoryCode: string; subCategoryCode: string; surfaceM2: number }[];
};

export type UserSite = {
  buildingId: string;
  postcode: string;
  city: string;
  /** Toutes les EFA du bâtiment, triées par id : la première est celle des pages (D18). */
  efas: SiteEfa[];
};

/** Bâtiment de la première EFA de l'utilisateur (comme les pages surfaces, comparateur, conformité). */
export async function loadUserSite(): Promise<UserSite> {
  const user = await getCurrentUser();
  if (!user) throw new BatimentError(401, "Aucun utilisateur connecté (lancez `npm run demo` pour créer le compte de démonstration).");
  const first = await db.eFA.findFirst({
    where: { building: { users: { some: { id: user.id } } } },
    orderBy: { id: "asc" },
    select: { buildingId: true },
  });
  if (!first) throw new BatimentError(404, "Aucun bâtiment rattaché à cet utilisateur (lancez `npm run db:seed`).");
  const building = await db.building.findUniqueOrThrow({
    where: { id: first.buildingId },
    include: { efAs: { orderBy: { id: "asc" }, include: { surfaces: { orderBy: { surfaceM2: "desc" } } } } },
  });
  return {
    buildingId: building.id,
    postcode: building.postcode,
    city: building.city,
    efas: building.efAs.map((e) => ({
      id: e.id,
      entityType: e.entityType,
      role: e.role,
      surfaceTotal: e.surfaceTotal ?? building.surfaceTotal,
      lines: e.surfaces.map((s) => ({ categoryCode: s.categoryCode, subCategoryCode: s.subCategoryCode, surfaceM2: s.surfaceM2 })),
    })),
  };
}
