# Module `dashboard` — Tableau de bord (Phase 07, tâches 7.1 et 7.4)

Synthèse de l'EFA (la première du bâtiment de l'utilisateur, comme les autres pages, D18) et états vides : chaque donnée
manquante donne un message clair et **une** action, au lieu d'une page cassée ou vide.

- **Piste conseillée** : T6 (voir docs/REPARTITION.md)
- **Page** : `src/app/dashboard/page.tsx` — **API** : `GET /api/dashboard` (lecture seule, toujours 200)
- **Données** : API publiques des autres modules, **aucun calcul recodé** : `loadUserSite` (batiment), `loadSurfacesContext`
  + `validateSurfaceLines` (surfaces), `loadClimatIndicators` (climat), `loadComparator` (comparateur), `loadConformite`
  + `pickCurrentYear` (conformité)
- **Recette** : `docs/RECETTE-7.md`

## Fichiers
| Fichier | Rôle |
|---|---|
| `synthesis.ts` | **Pur.** `buildSynthesis(inputs)` → `{ sections, steps, empties, nextAction }` ; `classifyError` (erreur d'un chargeur → `AUTH` / `NOT_FOUND` / `DB` / `ERROR`) ; constantes du bandeau et de l'encadré réel / fictif. |
| `format.ts` | **Pur.** Formats français (`fmtKwh`, `fmtKwhYear`, `fmtM2`, `fmtKwhPerM2`) : espace fine insécable pour les milliers, virgule décimale. |
| `repository.ts` | `loadDashboard()` : appelle les 5 chargeurs avec `Promise.allSettled`, classe leurs erreurs, appelle `buildSynthesis`. Ne lève jamais d'erreur, n'écrit rien. |
| `Dashboard.module.css` | Une colonne sur mobile, deux à partir de 900 px. |
| `*.test.ts` | États vides, cas nominal (valeurs de Laon), sections indépendantes, priorité, classement des erreurs, formats. |

## Sections (7.1)
Site et EFA · Verdict 2030 (texte + icône ✓ / ✗ / ?, méthode retenue, voie la plus favorable) · Objectifs (année de
référence, Créf, Crelat 2030 / 2040 / 2050, Cabs) · Consommation suivie (brute, corrigée du climat, kWh corrigés/m²) · Chaîne de la démo (6 étapes, fait /
à faire / indisponible ; l'étape « bâtiment » n'a pas de lien tant que le module est un squelette) · Encadré réel / fictif.
Hors périmètre : frise (7.2) et comparatif (7.3).

## États vides (7.4)
Chaque section ne lit que ses sources : si l'une échoue, les autres s'affichent quand même. La **prochaine action** est le
premier manque dans l'ordre de la chaîne (`EMPTY_PRIORITY`) :

| Ordre | Code | Cas | Action |
|---|---|---|---|
| 1 | `BASE_INJOIGNABLE` | erreur Prisma / réseau (ex. `ECONNREFUSED`, `P1001`) | commande `npm run db:up` |
| 2 | `NON_CONNECTE` | 401 | commande `npm run demo` + retour à la carte du projet |
| 3 | `PAS_DE_BATIMENT` | 404 | commande `npm run db:seed` + retour à la carte du projet |
| 4–5 | `SURFACES_ABSENTES`, `SURFACES_INCOHERENTES` | aucune ligne ; contrôle `validateSurfaceLines` refusé | /surfaces |
| 6–7 | `PAS_DE_CONSOMMATION`, `AUCUNE_ANNEE_SUIVIE` | aucune consommation ; seulement 2020 / 2021 | /collecte |
| 8–9 | `ANNEE_NON_CORRIGEABLE`, `ANNEE_INCOMPLETE` | année suivie absente du fichier climatique (ou autre station) : la brute reste affichée ; aucune année complète | /climat ; /collecte |
| 10–11 | `REFERENCE_NON_CHOISIE`, `REFERENCE_INELIGIBLE` | `chosenYear` vide ; année plus éligible | /comparateur |
| 12–14 | `ZONE_INTROUVABLE`, `CABS_INDISPONIBLE`, `CABS_NON_CALCULABLE` | zone non déduite ; fichier Cabs absent ; autre raison | /conformite |
| 15 | `ERREUR` | toute autre erreur d'une source | retour à la carte du projet |

## Limites
- Une seule EFA (la première) ; les autres EFA du site sont visibles dans /conformite (encadré « Autres EFA du site »).
- `loadConformite` rappelle lui-même le comparateur et les surfaces : quelques requêtes en double, sans effet sur les valeurs.
- Le dashboard signale une somme de surfaces incohérente, mais la conformité calcule alors le Cabs sur la somme des lignes
  (point à traiter dans le module conformité, voir docs/RECETTE-7.md).

## Règles
- Le code métier vit dans `src/modules/dashboard/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
