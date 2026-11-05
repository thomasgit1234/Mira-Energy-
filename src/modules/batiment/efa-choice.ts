// Choix de l'EFA affichée (sélecteur d'EFA, remplace la règle « première EFA » de D18).
// Fonctions PURES : testées dans efa-choice.test.ts. La lecture du cookie et de la base est dans efa-selection.ts.
//
// Priorité : 1) EFA demandée explicitement (?efa= ou efaId dans une requête) → elle, ou rien si elle n'est pas à
// l'utilisateur (l'appelant répond 404) ; 2) EFA mémorisée dans le cookie, si elle est toujours à l'utilisateur
// (un cookie périmé après un db:reset est ignoré) ; 3) sinon la première EFA (tri par id, comme avant).

/** Nom du cookie qui mémorise l'EFA choisie (aucune donnée personnelle : un identifiant technique). */
export const EFA_COOKIE = "mira-efa";

/** ownedIds : EFA de l'utilisateur, triées par id. Renvoie null si aucune EFA ne convient. */
export function pickEfaId(ownedIds: string[], requested?: string | null, remembered?: string | null): string | null {
  if (requested) return ownedIds.includes(requested) ? requested : null;
  if (remembered && ownedIds.includes(remembered)) return remembered;
  return ownedIds[0] ?? null;
}

/** Chemin de retour après un changement d'EFA : uniquement une page interne (pas de redirection vers un autre site). */
export function safeBackPath(back: string | null | undefined): string {
  if (!back || !back.startsWith("/") || back.startsWith("//") || back.startsWith("/\\")) return "/dashboard";
  return back;
}

const ROLE_LABELS: Record<string, string> = { OWNER_OCCUPIER: "propriétaire occupant", LANDLORD: "bailleur", TENANT: "locataire" };
const m2 = (v: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(v);

/**
 * Libellé lisible d'une EFA : activité (libellé OPERAT de la catégorie de ses lignes de surface), surface, rôle.
 * Plusieurs catégories → « activités mixtes » ; aucune ligne → « activité non renseignée ».
 */
export function efaLabel(
  efa: { role: string; surfaceTotal: number; lines: { categoryCode: string }[] },
  categoryLabels: Record<string, string>,
): string {
  const categories = [...new Set(efa.lines.map((l) => l.categoryCode))];
  const activity =
    categories.length === 0 ? "activité non renseignée"
    : categories.length > 1 ? "activités mixtes"
    : categoryLabels[categories[0]] ?? categories[0];
  return `${activity} · ${m2(efa.surfaceTotal)} m² · ${ROLE_LABELS[efa.role] ?? efa.role}`;
}

/** Paramètre ?efa= d'une page ou d'une API : une seule valeur non vide, sinon undefined (= pas de choix explicite). */
export function efaParam(value: string | string[] | null | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.trim() !== "" ? v.trim() : undefined;
}
