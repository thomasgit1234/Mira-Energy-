// ⚠️ CONTEXTE DE DÉMONSTRATION PROVISOIRE — à supprimer d'un bloc.
// Le seed contient encore un bâtiment et des sous-catégories fictifs (DEMO_*). En attendant le site de Laon
// (tâches 1.1/1.2) et le référentiel OPERAT v9.0, ces constantes permettent de calculer le Cabs.
// Utilisées à UN SEUL endroit : src/modules/conformite/repository.ts.

/** Site du bâtiment de démo. */
export const DEMO_SITE = {
  zone: "H1a", // provisoire : sera remplacé par les tâches 1.1/1.2 et le référentiel OPERAT v9.0 (département 02, Laon)
  altitudeBand: "<400", // provisoire : sera remplacé par les tâches 1.1/1.2 et le référentiel OPERAT v9.0
} as const;

/** Sous-catégories fictives de data/referentiels/categories.csv → code de sous-catégorie OPERAT (CAP18 Restauration). */
export const DEMO_SUBCATEGORY_TO_OPERAT: Record<string, string> = {
  DEMO_RESTAURANT: "SCAP1803", // provisoire : sera remplacé par les tâches 1.1/1.2 et le référentiel OPERAT v9.0 (Restaurant traditionnel ou brasserie)
  DEMO_RESTAURANT_RESERVE: "SCAP1803", // provisoire : sera remplacé par les tâches 1.1/1.2 et le référentiel OPERAT v9.0 (rattachée au restaurant)
  DEMO_BUREAU_OUVERT: "SCAP1801", // provisoire : sera remplacé par les tâches 1.1/1.2 et le référentiel OPERAT v9.0 (bureaux standard)
};

export const PROVISIONAL_NOTE =
  "Contexte du site provisoire : zone H1a, altitude < 400 m et correspondance des sous-catégories DEMO vers OPERAT, en attendant les tâches 1.1/1.2 et le référentiel OPERAT v9.0.";
