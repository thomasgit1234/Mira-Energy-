// Tâches 5.1 à 5.3 — accès base du module « comparateur ».
// Les règles sont dans reference.ts (pures). Serveur uniquement : ne pas importer depuis un composant client.
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ClimatError, loadClimatIndicators } from "@/modules/climat";
import { buildComparatorRows, suggestReferenceYear, validateReferenceChoice, type ComparatorRow } from "./reference";

export class ComparateurError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly issues: { code: string; message: string }[] = [],
  ) {
    super(message);
    this.name = "ComparateurError";
  }
}

export type Suggestion = { year: number; consumptionKwh: number };

export type ComparatorData = {
  buildingLabel: string;
  efaLabel: string;
  efaId: string;
  rows: ComparatorRow[];
  suggested: Suggestion | null;
  chosenYear: number | null;
};

const ROLE_LABELS: Record<string, string> = { OWNER_OCCUPIER: "propriétaire occupant", LANDLORD: "bailleur", TENANT: "locataire" };

/** EFA de l'utilisateur courant (une seule pour l'instant : la première du bâtiment, comme le module surfaces). */
async function requireUserEfa() {
  const user = await getCurrentUser();
  if (!user) throw new ComparateurError(401, "Aucun utilisateur connecté (lancez `npm run demo` pour créer le compte de démonstration).");
  const efa = await db.eFA.findFirst({
    where: { building: { users: { some: { id: user.id } } } },
    include: { building: true },
    orderBy: { id: "asc" },
  });
  if (!efa) throw new ComparateurError(404, "Aucun bâtiment rattaché à cet utilisateur (lancez `npm run db:seed`).");
  return { user, efa };
}

/** Indicateurs annuels du module climat ; ses erreurs gardent leur code HTTP. */
async function loadIndicators() {
  try {
    return await loadClimatIndicators();
  } catch (e) {
    if (e instanceof ClimatError) throw new ComparateurError(e.status, e.message);
    throw e;
  }
}

/** 5.1 / 5.2 — Données du comparateur pour l'EFA de l'utilisateur courant. Lecture seule. */
export async function loadComparator(): Promise<ComparatorData> {
  const { efa } = await requireUserEfa();
  const climat = await loadIndicators();
  const suggested = suggestReferenceYear(climat.rows); // 5.2 : calculée ici, jamais côté client
  return {
    buildingLabel: climat.buildingLabel,
    efaLabel: `EFA ${efa.entityType} · ${ROLE_LABELS[efa.role] ?? efa.role}`,
    efaId: efa.id,
    rows: buildComparatorRows(climat.rows, suggested?.year ?? null),
    suggested,
    chosenYear: null,
  };
}

export const referenceChoiceSchema = z.object({
  year: z.number(),
  efaId: z.string().min(1).optional(), // facultatif : par défaut, l'EFA de l'utilisateur
});

/**
 * 5.3 — Choix de l'année de référence : PUT /api/comparateur/reference { year, efaId? }.
 * Contrôles : 400 requête invalide · 401 non connecté · 404 EFA d'un autre utilisateur ·
 * 422 { error, issues: [{ code, message }] } si l'année est refusée — AUCUNE écriture dans tous ces cas.
 *
 * ⚠️ STOCKAGE NON DÉCIDÉ : le schéma Prisma n'a aucun champ pour l'année de référence de l'EFA.
 * Tant que ce n'est pas tranché, un choix VALIDE renvoie 501 (rien n'est écrit).
 */
export async function chooseReferenceYear(rawInput: unknown): Promise<{ ok: true; chosenYear: number }> {
  const parsed = referenceChoiceSchema.safeParse(rawInput);
  if (!parsed.success) throw new ComparateurError(400, "Requête invalide.");
  const { year, efaId } = parsed.data;

  const { efa } = await requireUserEfa();
  // Cloisonnement (9.3) : on ne distingue pas « inexistante » et « pas la vôtre ».
  if (efaId !== undefined && efaId !== efa.id) throw new ComparateurError(404, "EFA introuvable.");

  const { rows } = await loadComparator();
  const check = validateReferenceChoice(year, rows);
  if (!check.ok) {
    throw new ComparateurError(422, "Cette année ne peut pas être l'année de référence.", [{ code: check.code, message: check.message }]);
  }
  throw new ComparateurError(501, `Choix de ${year} valide, mais l'enregistrement n'est pas encore branché (stockage de l'année de référence à décider).`);
}
