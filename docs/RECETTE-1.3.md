# Recette — tâche 1.3 (formulaire de décomposition des surfaces)

**Exigence (à reprendre dans le document A)** — Le formulaire propose les catégories et sous-catégories du
référentiel ; il n'enregistre les lignes que si leur somme est égale à la surface totale déclarée ; les
lignes enregistrées sont relues depuis la base ; un refus n'écrit rien en base.

## Pré-requis
`npm run demo` (une fois), puis `npm run dev` et ouvrir http://localhost:3000/surfaces

## Automatique
| Vérification | Commande | Attendu |
|---|---|---|
| Règles de validation (15 tests) | `npx vitest run src/modules/surfaces` | 15 passés |
| Projet complet | `npm run check` | tout vert |

## Manuelle (Monsieur Dupont : total 1 200 m², lignes 800 + 400)
| # | Action | Résultat attendu | OK ? |
|---|---|---|---|
| 1 | Ouvrir la page | 2 lignes, somme 1 200 m², écart « 0 m² — équilibré » (encadré vert) | ☐ |
| 2 | Passer la 2e ligne à 300, cliquer Enregistrer | Refus : « inférieure de 100 m² » ; encadré rouge | ☐ |
| 3 | Passer la 2e ligne à 500 | Écart « 100 m² en trop » ; Enregistrer → refus « dépasse de 100 m² » | ☐ |
| 4 | Remettre 400, Enregistrer | « Surfaces enregistrées. » | ☐ |
| 5 | Ajouter une ligne sans rien remplir, Enregistrer | Refus : catégorie, sous-catégorie, surface | ☐ |
| 6 | Catégorie « Bureaux » sur une ligne | La liste des sous-catégories ne propose que celles de Bureaux | ☐ |
| 7 | Deux lignes avec la même sous-catégorie | Refus « déjà saisie » | ☐ |
| 8 | Recharger la page (F5) | Les lignes enregistrées s'affichent encore | ☐ |

## Base de données
`npm run db:studio` → table `SurfaceLine` : après un refus, **aucune ligne n'a changé** ;
après l'étape 4, les lignes correspondent à l'écran.

## Preuves à garder (document B)
Capture de l'étape 1 (équilibré), de l'étape 2 (refus), et de la sortie des tests.

## Contrôle côté serveur (API)
`PUT /api/surfaces` renvoie **422** avec la liste des problèmes si la somme est fausse (même règle
que l'écran : `validation.ts` est partagé), **404** si l'EFA n'appartient pas à l'utilisateur.
