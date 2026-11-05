// Tâche 9.3 — cloisonnement propriétaire / locataire (D22). Fonctions PURES : testées dans access.test.ts.
// C'est la SEULE règle d'accès aux EFA : efa-selection.ts (userEfaIds) l'applique pour toutes les pages et API, et les
// écritures (consommations, surfaces, année de référence, fiche bâtiment) passent par le même contrôle.
//
// Règle :
// - OWNER (propriétaire) et ADMIN : toutes les EFA des bâtiments auxquels l'utilisateur est rattaché (Building.users) ;
// - TENANT (locataire) : UNIQUEMENT les EFA dont il est occupant (EFA.occupants), même s'il est rattaché au bâtiment ;
// - rôle inconnu : aucune EFA (refus par défaut).
// Une EFA hors du périmètre est traitée comme inexistante (404) : on ne révèle pas qu'elle existe.

export const USER_ROLES = ["OWNER", "TENANT", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = { OWNER: "propriétaire", TENANT: "locataire", ADMIN: "administrateur" };

export type AccessUser = { id: string; role: string };
/** EFA vue par la règle : utilisateurs rattachés à son bâtiment, et occupants de l'EFA. */
export type AccessEfa = { id: string; buildingUserIds: string[]; occupantIds: string[] };

export function isUserRole(v: string): v is UserRole {
  return (USER_ROLES as readonly string[]).includes(v);
}

/** L'utilisateur peut-il voir (et saisir sur) cette EFA ? */
export function canAccessEfa(user: AccessUser, efa: AccessEfa): boolean {
  switch (user.role) {
    case "OWNER":
    case "ADMIN":
      return efa.buildingUserIds.includes(user.id);
    case "TENANT":
      return efa.occupantIds.includes(user.id);
    default:
      return false;
  }
}

/** Identifiants des EFA visibles, triés (même ordre que le sélecteur : par id). */
export function visibleEfaIds(user: AccessUser, efas: AccessEfa[]): string[] {
  return efas.filter((e) => canAccessEfa(user, e)).map((e) => e.id).sort();
}

/** Seuls le propriétaire et l'administrateur modifient la fiche bâtiment (adresse, ID-RNB, surface totale). */
export function canEditBuilding(user: AccessUser): boolean {
  return user.role === "OWNER" || user.role === "ADMIN";
}
