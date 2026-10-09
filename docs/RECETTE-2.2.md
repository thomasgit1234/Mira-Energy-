# Recette — tâche 2.2 (saisie manuelle des consommations)

**Exigence (à reprendre dans le document A)** — L'utilisateur saisit les consommations mensuelles (kWh) d'une
année et d'une énergie ; une valeur non numérique ou négative est refusée sans rien écrire ; l'écriture passe
par `saveConsumption` ; **un mois déjà validé n'est jamais remplacé par une saisie non validée**.

## Pré-requis
`npm run demo` (une fois), puis `npm run dev` et ouvrir **http://localhost:3000/collecte/saisie**
(toujours `localhost`, pas l'adresse réseau `192.168…` / `172.…` : le formulaire ne s'activerait pas).
Le seed contient l'électricité **2019** et de **l'année dernière**, 12 mois **validés** chacune.

## Automatique
| Vérification | Commande | Attendu |
|---|---|---|
| Règles de saisie (14 tests) | `npx vitest run src/modules/collecte` | 14 passés |
| Règle « validé jamais écrasé » (socle) | `npx vitest run src/lib` | tous passés |
| Projet complet | `npm run check` | tout vert |

## Manuelle
| # | Action | Résultat attendu | OK ? |
|---|---|---|---|
| 1 | Ouvrir la page | Année proposée = dernière année sans données (ex. 2024), 12 cases vides, colonne « En base » = vide | ☐ |
| 2 | Janvier : `3 000` ; Février : `abc` | Février en rouge : « « abc » n'est pas un nombre de kWh » ; total = 3 000 kWh | ☐ |
| 3 | Cliquer « Enregistrer en brouillon » | Refus « corrigez les cases en rouge » ; rien n'est écrit | ☐ |
| 4 | Février : `2800,5`, Enregistrer | « Enregistré : 2 mois (janvier, février) » ; badges « non validé · saisie » | ☐ |
| 5 | Choisir l'année dernière (ex. 2025) | 12 badges « 🔒 validé » | ☐ |
| 6 | Mars : `9999`, « Enregistrer en brouillon » | Encadré orange « **Non écrasé car déjà validé : mars** » ; la case revient à 3 900 | ☐ |
| 7 | Mars : `3950`, cocher « J'ai relu et je valide », « Valider et enregistrer » | 12 mois enregistrés ; mars = 3 950 | ☐ |
| 8 | Aller sur http://localhost:3000/collecte | Le tableau « Données déjà collectées » montre l'année saisie | ☐ |

Remettre les données de démo après la recette : `npm run db:seed` remet 2019 et l'année dernière
(mars = 3 900). Les années ajoutées (ex. 2024) restent : `npm run db:reset` repart de zéro.

## Contrôle côté serveur (API)
`PUT /api/collecte/consommations` → **422** si un kWh est négatif / non numérique ou l'année hors 2010–année en cours,
**404** si l'EFA n'appartient pas à l'utilisateur, **400** si la requête est mal formée.
En brouillon sur un mois validé : **200** avec `skipped: [{ month, reason: "ALREADY_VALIDATED" }]` et valeur inchangée en base.

## Preuves à garder (document B)
Captures des étapes 2 (erreur en direct) et 6 (« Non écrasé car déjà validé »), et sortie des tests.
