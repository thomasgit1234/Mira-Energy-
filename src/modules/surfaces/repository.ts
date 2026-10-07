// Tâche 1.3 — accès base du module « surfaces » (lecture du contexte + enregistrement des lignes).
// Les règles métier sont dans validation.ts (pures) ; ici on ne fait que charger, contrôler les droits
// et écrire. Serveur uniquement : ne pas importer ce fichier depuis un composant client.
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import {
  validateSurfaceLines,
  type Referential,
  type SurfaceLineInput,
  type ValidationIssue,
} from "./validation";

export type SurfacesContext = {
  efaId: string;
  buildingLabel: string;
  surfaceTotal: number;
  lines: SurfaceLineInput[];
  referential: Referential;
};

export class SurfacesError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly issues: ValidationIssue[] = [],
  ) {
    super(message);
    this.name = "SurfacesError";
  }
}

export const saveSurfacesSchema = z.object({
  efaId: z.string().min(1),
  lines: z
    .array(
      z.object({
        categoryCode: z.string(),
        subCategoryCode: z.string(),
        // null (champ vide côté formulaire) → NaN → refusé par la validation avec un message clair
        surfaceM2: z.number().nullable().transform((v) => v ?? Number.NaN),
      }),
    )
    .max(200),
});

async function loadReferential(): Promise<Referential> {
  const rows = await db.referenceData.findMany({
    where: { type: { in: ["CATEGORY", "SUBCATEGORY"] } },
    orderBy: { label: "asc" },
  });
  const categories = rows.filter((r) => r.type === "CATEGORY").map((r) => ({ code: r.code, label: r.label }));
  const subCategories = rows
    .filter((r) => r.type === "SUBCATEGORY")
    .map((r) => {
      const v = (r.value ?? {}) as { category?: unknown };
      return { code: r.code, label: r.label, categoryCode: typeof v.category === "string" ? v.category : "" };
    })
    .filter((s) => s.categoryCode !== "");
  return { categories, subCategories };
}

/** EFA de l'utilisateur courant (1.3 : première EFA de son premier bâtiment). */
async function findUserEfa(userId: string) {
  return db.eFA.findFirst({
    where: { building: { users: { some: { id: userId } } } },
    include: { building: true, surfaces: { orderBy: { surfaceM2: "desc" } } },
    orderBy: { id: "asc" },
  });
}

export async function loadSurfacesContext(): Promise<SurfacesContext> {
  const user = await getCurrentUser();
  if (!user) throw new SurfacesError(401, "Aucun utilisateur connecté (lancez `npm run demo` pour créer le compte de démonstration).");
  const efa = await findUserEfa(user.id);
  if (!efa) throw new SurfacesError(404, "Aucun bâtiment rattaché à cet utilisateur (lancez `npm run db:seed`).");
  const referential = await loadReferential();
  if (referential.categories.length === 0) {
    throw new SurfacesError(409, "Référentiel vide : lancez `npm run db:import` pour charger les catégories.");
  }
  return {
    efaId: efa.id,
    buildingLabel: `${efa.building.address}, ${efa.building.postcode} ${efa.building.city}`,
    surfaceTotal: efa.building.surfaceTotal,
    lines: efa.surfaces.map((s) => ({ categoryCode: s.categoryCode, subCategoryCode: s.subCategoryCode, surfaceM2: s.surfaceM2 })),
    referential,
  };
}

/**
 * Enregistre les lignes de surface d'une EFA (remplace les lignes existantes) APRÈS validation.
 * Rien n'est écrit si la validation échoue (transaction + contrôle préalable).
 */
export async function saveSurfaceLines(rawInput: unknown): Promise<SurfaceLineInput[]> {
  const parsed = saveSurfacesSchema.safeParse(rawInput);
  if (!parsed.success) throw new SurfacesError(400, "Requête invalide.");
  const { efaId, lines } = parsed.data;

  const user = await getCurrentUser();
  if (!user) throw new SurfacesError(401, "Aucun utilisateur connecté.");

  const efa = await db.eFA.findUnique({ where: { id: efaId }, include: { building: { include: { users: { select: { id: true } } } } } });
  // Cloisonnement (9.3) : on ne distingue pas « inexistante » et « pas la vôtre ».
  if (!efa || !efa.building.users.some((u) => u.id === user.id)) {
    throw new SurfacesError(404, "EFA introuvable.");
  }

  const referential = await loadReferential();
  const result = validateSurfaceLines(lines, efa.building.surfaceTotal, referential);
  if (!result.ok) throw new SurfacesError(422, "Les surfaces saisies sont refusées.", result.issues);

  await db.$transaction([
    db.surfaceLine.deleteMany({ where: { efaId } }),
    db.surfaceLine.createMany({
      data: lines.map((l) => ({ efaId, categoryCode: l.categoryCode, subCategoryCode: l.subCategoryCode, surfaceM2: l.surfaceM2 })),
    }),
  ]);
  return lines;
}
