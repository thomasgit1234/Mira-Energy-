// Tâches 5.1 à 5.3 — accès base du module « comparateur ».
// Les règles sont dans reference.ts (pures). Serveur uniquement : ne pas importer depuis un composant client.
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { loadUserSite, resolveUserEfaId } from "@/modules/batiment";
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

/** EFA choisie de l'utilisateur courant (efaId, sinon sélecteur d'EFA, sinon la première). */
async function requireUserEfa(efaId?: string) {
  const user = await getCurrentUser();
  if (!user) throw new ComparateurError(401, "Aucun utilisateur connecté (lancez `npm run demo` pour créer le compte de démonstration).");
  const id = await resolveUserEfaId(user.id, efaId);
  // Cloisonnement (9.3) : on ne distingue pas « inexistante » et « pas la vôtre ».
  if (!id && efaId) throw new ComparateurError(404, "EFA introuvable.");
  const efa = id === null ? null : await db.eFA.findUnique({ where: { id }, include: { building: true } });
  if (!efa) throw new ComparateurError(404, "Aucun bâtiment rattaché à cet utilisateur (lancez `npm run db:seed`).");
  return { user, efa };
}

/** Libellé lisible de l'EFA (activité · surface · rôle, module bâtiment) ; repli sur l'ancien libellé si le site est illisible. */
async function readableEfaLabel(efa: { id: string; entityType: string; role: string }): Promise<string> {
  try {
    const site = await loadUserSite(efa.id);
    const label = site.efas.find((e) => e.id === efa.id)?.label;
    if (label) return label;
  } catch {
    // repli ci-dessous : le libellé n'empêche jamais d'afficher le comparateur
  }
  return `EFA ${efa.entityType} · ${ROLE_LABELS[efa.role] ?? efa.role}`;
}

/** Indicateurs annuels du module climat ; ses erreurs gardent leur code HTTP. */
async function loadIndicators(efaId: string) {
  try {
    return await loadClimatIndicators(efaId);
  } catch (e) {
    if (e instanceof ClimatError) throw new ComparateurError(e.status, e.message);
    throw e;
  }
}

/** 5.1 / 5.2 — Données du comparateur pour l'EFA de l'utilisateur courant. Lecture seule. */
export async function loadComparator(efaId?: string): Promise<ComparatorData> {
  const { efa } = await requireUserEfa(efaId);
  const climat = await loadIndicators(efa.id);
  const suggested = suggestReferenceYear(climat.rows); // 5.2 : calculée ici, jamais côté client
  return {
    buildingLabel: climat.buildingLabel,
    efaLabel: await readableEfaLabel(efa),
    efaId: efa.id,
    rows: buildComparatorRows(climat.rows, suggested?.year ?? null),
    suggested,
    chosenYear: efa.referenceYear ?? null,
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
 * Stockage : champ EFA.referenceYear (PR schéma dédiée). Un choix valide est écrit puis renvoyé : 200 { ok, chosenYear }.
 */
export async function chooseReferenceYear(rawInput: unknown): Promise<{ ok: true; chosenYear: number }> {
  const parsed = referenceChoiceSchema.safeParse(rawInput);
  if (!parsed.success) throw new ComparateurError(400, "Requête invalide.");
  const { year, efaId } = parsed.data;

  const { efa } = await requireUserEfa(efaId); // EFA d'un autre utilisateur → 404 (cloisonnement 9.3)

  const { rows } = await loadComparator(efa.id);
  const check = validateReferenceChoice(year, rows);
  if (!check.ok) {
    throw new ComparateurError(422, "Cette année ne peut pas être l'année de référence.", [{ code: check.code, message: check.message }]);
  }
  await db.eFA.update({ where: { id: efa.id }, data: { referenceYear: year } });
  return { ok: true, chosenYear: year };
}
