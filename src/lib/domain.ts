// Vocabulaire métier partagé : valeurs autorisées des champs « texte libre » du schéma
// (Annexe B). Une valeur nouvelle s'ajoute ICI, par PR, pour que tout le monde parle pareil.

export const USER_ROLES = ["OWNER", "TENANT", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const EFA_ROLES = ["OWNER_OCCUPIER", "LANDLORD", "TENANT"] as const;
export type EfaRole = (typeof EFA_ROLES)[number];

export const ENTITY_TYPES = ["SASU", "SCI", "COLLECTIVITE", "PARTICULAR"] as const;
export type EntityType = (typeof ENTITY_TYPES)[number];

export const ENERGY_TYPES = ["ELECTRICITY", "GAS"] as const;
export type EnergyType = (typeof ENERGY_TYPES)[number];

// Origine d'une donnée de consommation = les 5 modes de collecte (phase 02).
//  PDF           mode 1  import PDF/Excel
//  MANUAL        mode 2  saisie manuelle
//  (mode 3, la demande d'historique par email, ne produit pas de donnée : le fichier reçu arrive ensuite par PDF ou export)
//  ENEDIS_EXPORT mode 4  export de l'espace client Enedis
//  GRDF_EXPORT   mode 4  export de l'espace client GRDF
//  ENEDIS_API    mode 5  API ACD simulée (puis réelle en phase 2 du projet)
export const CONSUMPTION_SOURCES = ["PDF", "MANUAL", "ENEDIS_EXPORT", "GRDF_EXPORT", "ENEDIS_API"] as const;
export type ConsumptionSource = (typeof CONSUMPTION_SOURCES)[number];

export const REFERENCE_TYPES = ["CATEGORY", "SUBCATEGORY", "CABS_THRESHOLD"] as const;
export type ReferenceType = (typeof REFERENCE_TYPES)[number];

// Plage d'années acceptée pour les consommations (référence 2010-2019 + suivi jusqu'à aujourd'hui).
export const MIN_YEAR = 2010;
export function maxYear(now = new Date()): number {
  return now.getFullYear();
}

// Zone climatique fictive des données de démonstration (voir docs/DECISIONS.md, D5).
export const DEMO_CLIMATE_ZONE = "DEMO";
