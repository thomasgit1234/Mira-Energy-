# Recette — tâche 2.1 (import d'un fichier CSV avec relecture et correction)

**Exigence (à reprendre dans le document A)** — L'utilisateur importe un fichier CSV de consommations mensuelles ;
chaque ligne est contrôlée et affichée pour relecture ; les erreurs sont signalées sur la ligne et corrigeables
à l'écran ; rien n'est écrit tant qu'il reste une erreur ; l'écriture passe par `saveConsumption` ;
**un import est toujours enregistré non validé** (`validated = false`, même si le client envoie autre chose),
donc **un mois déjà validé n'est jamais remplacé** ; un récapitulatif donne le nombre de mois enregistrés et la
liste des mois ignorés car déjà validés. La validation se fait ensuite dans la saisie manuelle (2.2).

## Format de fichier (hypothèse d'équipe, à confirmer avec la tutrice)
Une ligne par mois, première ligne : `annee;mois;energie;kwh`
- En-têtes acceptés avec accents / majuscules (`Année`, `Énergie`, `Consommation (kWh)`).
- Séparateur `;` (Excel français), `,` ou tabulation. Décimales avec virgule et espaces de milliers acceptés (`3 720,5`).
- Mois : `1`…`12` ou `janvier`…`décembre`. Énergie : `électricité` / `elec` / `gaz`.
- Encodage UTF-8 ou Windows-1252 (CSV enregistré par Excel sous Windows).
- Depuis Excel : « Enregistrer sous » → « CSV (séparateur : point-virgule) ».

Fichiers d'exemple **fictifs** (aussi téléchargeables depuis la page) : `public/exemples/consommations-demo.csv`,
`public/exemples/consommations-avec-erreurs.csv`.

## Pré-requis
`npm run demo` (une fois), puis `npm run dev` et ouvrir **http://localhost:3000/collecte/import**
(toujours `localhost`). Le seed contient l'électricité 2019 et de l'année dernière, **validées**.

## Automatique
| Vérification | Commande | Attendu |
|---|---|---|
| Lecture et contrôle CSV (18 tests), import sans écrasement (3 tests), saisie (14 tests) | `npx vitest run src/modules/collecte` | 35 passés |
| Preuve « import non validé n'écrase pas un mois validé » | `npx vitest run src/modules/collecte/import.test.ts` | 3 passés |
| Projet complet | `npm run check` | tout vert |

## Manuelle
| # | Action | Résultat attendu | OK ? |
|---|---|---|---|
| 1 | Choisir `consommations-avec-erreurs.csv` | 7 lignes lues, **6 en erreur**, chaque erreur écrite en rouge sur sa ligne (mois 13, fioul, abc, négatif, doublon, kWh manquant) ; bouton « Importer » grisé | ☐ |
| 2 | Corriger : mois `13` → `2`, `fioul` → `electricite`, `abc` → `3600`, `-120` → `3500`, kWh vide → `400` ; supprimer la ligne du doublon (✕) | Compteur d'erreurs = **0** ; « À enregistrer : 2022 électricité (5 mois) · 2022 gaz (1 mois) » ; bouton « Importer » actif | ☐ |
| 3 | « Recommencer », puis choisir `consommations-demo.csv` | 27 lignes, 0 erreur ; « 2019 électricité (3 mois) · 2023 électricité (12 mois) · 2023 gaz (12 mois) » | ☐ |
| 4 | Vérifier les boutons | Un seul bouton « **Importer** » (aucun bouton « valider ») ; mention « enregistrés non validés » | ☐ |
| 5 | « Importer » | Récapitulatif : **« 24 mois enregistrés (non validés) »** et **« 3 mois ignorés car déjà validés : 2019 · électricité : janvier, février, mars »** | ☐ |
| 6 | Ouvrir http://localhost:3000/collecte | 2023 électricité et gaz, origine « import de fichier », 0 / 12 validés ; 2019 inchangée (12 / 12 validés, 47 700 kWh) | ☐ |
| 7 | Ouvrir la saisie manuelle, année 2023 | 12 badges « non validé · import de fichier » ; pour les valider : cocher « J'ai relu et je valide » | ☐ |

Remettre les données de démo après la recette : `npm run db:reset` (repart de zéro : seed seul).

## Base de données
`npm run db:studio` → table `ConsumptionMonth` : après l'étape 5, les mois de 2019 gardent leur valeur (4 500),
`source = MANUAL`, `validated = true` ; ceux de 2023 ont `source = PDF` (mode 1, import de fichier) et `validated = false`.

## Contrôle côté serveur (API)
`POST /api/collecte/import` recontrôle tout : **422** avec la liste `{ line, field, message }` si une ligne est
invalide (même envoyée sans passer par l'écran), **404** si l'EFA n'appartient pas à l'utilisateur, **400** si la
requête est mal formée ou vide. Un champ `validated: true` envoyé par le client est **ignoré** : la réponse
contient `summary: { writtenCount, skippedCount, skipped: [{ year, energyType, month }] }`.

## Preuves à garder (document B)
Captures des étapes 1 (erreurs signalées), 2 (0 erreur après correction) et 5 (récapitulatif « ignorés car déjà validés »),
et sortie de `npx vitest run src/modules/collecte/import.test.ts`.
