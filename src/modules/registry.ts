// Carte des modules du projet : une ligne = une phase du plan. Sert à la page d'accueil
// et aux pages squelettes. Pour ajouter un module : un dossier src/modules/<slug>/, une page
// src/app/<slug>/page.tsx, et une entrée ci-dessous.
export type ModuleInfo = {
  slug: string;
  phase: number;
  title: string;
  track: string; // piste de travail conseillée (docs/REPARTITION.md)
  summary: string;
  todo: string[];
};

export const MODULES: ModuleInfo[] = [
  {"slug": "batiment", "phase": 1, "title": "Référentiel bâtiment", "track": "T1", "summary": "Identifier le bâtiment, son EFA et son propriétaire (adresse, RNB/BDNB, zone climatique).", "todo": ["Formulaire bâtiment + EFA", "Recherche d'adresse / identifiant RNB", "Rattachement utilisateur ↔ bâtiment"]},
  {"slug": "collecte", "phase": 2, "title": "Collecte des données", "track": "T2 (+T3)", "summary": "Les 5 modes de collecte des consommations (PDF, saisie, email, export, API simulée).", "todo": ["Import PDF/Excel", "Saisie manuelle", "Modèle d'email de demande d'historique", "Import export espace client Enedis/GRDF", "API ACD simulée"]},
  {"slug": "surfaces", "phase": 3, "title": "Photo des surfaces", "track": "T3", "summary": "Répartition des surfaces par catégorie/sous-catégorie OPERAT.", "todo": ["Saisie des lignes de surface", "Contrôle somme = surface totale"]},
  {"slug": "climat", "phase": 4, "title": "Correction climatique (DJU)", "track": "T4", "summary": "Corriger les consommations par les degrés-jours unifiés.", "todo": ["Table DJU par zone/année", "Fonction de normalisation kWh/DJU"]},
  {"slug": "comparateur", "phase": 5, "title": "Comparateur d'années", "track": "T4 (+T5)", "summary": "Comparer l'année de référence et l'année suivie (goulot du projet).", "todo": ["Choix année de référence", "Calcul de l'écart corrigé du climat"]},
  {"slug": "conformite", "phase": 6, "title": "Conformité", "track": "T5", "summary": "Calcul Crelat / Cabs et verdict de conformité aux jalons 2030/2040/2050.", "todo": ["Crelat", "Cabs", "Verdict par jalon"]},
  {"slug": "dashboard", "phase": 7, "title": "Tableau de bord", "track": "T6", "summary": "Interface de synthèse pour l'utilisateur (Monsieur Dupont).", "todo": ["Vues synthèse", "Graphiques mensuels", "Alertes"]},
  {"slug": "export", "phase": 8, "title": "Export & attestation", "track": "T6 (+T5)", "summary": "Fichiers CSV OPERAT (EFA, consommations) et attestation numérique.", "todo": ["CSV EFA", "CSV consommations", "Attestation"]},
  {"slug": "securite", "phase": 9, "title": "RGPD & sécurité", "track": "T1 (transversal)", "summary": "Authentification réelle, consentement, suppression des données.", "todo": ["Auth", "Consentement", "Suppression/export des données"]},
];

export function getModule(slug: string): ModuleInfo {
  const m = MODULES.find((x) => x.slug === slug);
  if (!m) throw new Error(`Module inconnu : ${slug}`);
  return m;
}
