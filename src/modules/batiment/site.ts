// Site de l'utilisateur courant : bâtiment et EFA, lus en base. Serveur uniquement.
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { efaLabel } from "./efa-choice";
import { resolveUserEfaId } from "./efa-selection";

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
  /** Libellé lisible : activité OPERAT · surface · rôle (sélecteur d'EFA). */
  label: string;
  /** Surface de l'EFA, repli sur celle du bâtiment (D14). */
  surfaceTotal: number;
  lines: { categoryCode: string; subCategoryCode: string; surfaceM2: number }[];
};

export type UserSite = {
  buildingId: string;
  postcode: string;
  city: string;
  /** EFA affichée par les pages (choix du sélecteur, sinon la première). */
  selectedEfaId: string;
  /** Toutes les EFA du bâtiment, triées par id. */
  efas: SiteEfa[];
};

/** Bâtiment de l'EFA choisie (efaId, sinon cookie du sélecteur, sinon première EFA). EFA d'un autre utilisateur → 404. */
export async function loadUserSite(efaId?: string): Promise<UserSite> {
  const user = await getCurrentUser();
  if (!user) throw new BatimentError(401, "Aucun utilisateur connecté (lancez `npm run demo` pour créer le compte de démonstration).");
  const selectedEfaId = await resolveUserEfaId(user.id, efaId);
  if (!selectedEfaId) {
    throw new BatimentError(404, efaId ? "EFA introuvable." : "Aucun bâtiment rattaché à cet utilisateur (lancez `npm run db:seed`).");
  }
  const selected = await db.eFA.findUniqueOrThrow({ where: { id: selectedEfaId }, select: { buildingId: true } });
  const building = await db.building.findUniqueOrThrow({
    where: { id: selected.buildingId },
    include: { efAs: { orderBy: { id: "asc" }, include: { surfaces: { orderBy: { surfaceM2: "desc" } } } } },
  });
  const categories = await db.referenceData.findMany({ where: { type: "CATEGORY" }, select: { code: true, label: true } });
  const categoryLabels = Object.fromEntries(categories.map((c) => [c.code, c.label]));
  return {
    selectedEfaId,
    buildingId: building.id,
    postcode: building.postcode,
    city: building.city,
    efas: building.efAs.map((e) => {
      const surfaceTotal = e.surfaceTotal ?? building.surfaceTotal;
      const lines = e.surfaces.map((s) => ({ categoryCode: s.categoryCode, subCategoryCode: s.subCategoryCode, surfaceM2: s.surfaceM2 }));
      return { id: e.id, entityType: e.entityType, role: e.role, label: efaLabel({ role: e.role, surfaceTotal, lines }, categoryLabels), surfaceTotal, lines };
    }),
  };
}
