# Recette — tâches 4.1 à 4.3 (DJU réels et kWh/DJU)

**Exigence (à reprendre dans le document A)** — Les DJU mensuels Météo-France (base 18) des stations 02037002 et
02320001 sont chargés, agrégés en DJU annuels (années complètes seulement) et enregistrés ; pour chaque année, la page
affiche consommation annuelle ÷ DJU de la station du bâtiment = kWh/DJU, avec un statut ; aucune division par un DJU
nul, négatif ou absent ; aucune écriture en base depuis la page ou l'API.

**Source des DJU : Météo-France, Licence Ouverte 2.0.** Les consommations de démo restent **fictives**.

## Pré-requis
`npm run demo` (une fois), puis :
```
npm run db:import     # charge les DJU réels (32 années-station)
npm run db:seed       # bâtiment de démo sur la station 02037002, supprime les anciens DJU fictifs
npm run dev
```
Ouvrir **http://localhost:3000/climat** (toujours `localhost`, pas l'adresse réseau).

## Automatique
| Vérification | Commande | Attendu |
|---|---|---|
| Lecture et agrégation des DJU (25 tests, dont le vrai fichier) | `npx vitest run src/modules/climat/dju-source.test.ts` | 25 passés |
| Jointure et calcul kWh/DJU (17 tests) | `npx vitest run src/modules/climat/indicators.test.ts` | 17 passés |
| Projet complet | `npm run check` | tout vert |

Valeurs de référence contrôlées par les tests sur le vrai fichier (sommes annuelles, ±0,05) :
Aulnois-sous-Laon 2013 = 2 949,2 · 2019 = 2 485,9 · 2023 = 2 229,5 · 2025 = 2 353,7 ; Saint-Quentin 2013 = 3 002,5 · 2019 = 2 569,5.

## Base de données
`npm run db:studio` → table `DjYear` : **32 lignes**, 2010 à 2025 pour `02037002` et `02320001`, aucune ligne `DEMO`.
Table `Building` : `climateZone = 02037002`.

## Manuelle
| # | Action | Résultat attendu | OK ? |
|---|---|---|---|
| 1 | Ouvrir la page | Mention « DJU Météo-France, station Aulnois-sous-Laon (02037002), base 18 » ; une ligne par année de 2010 à 2025 | ☐ |
| 2 | Lire la ligne 2019 | 47 700 kWh · 2 485,9 DJU · **19,19** · OK | ☐ |
| 3 | Lire la ligne 2025 | 40 500 kWh · 2 353,7 DJU · **17,21** · OK | ☐ |
| 4 | Regarder les autres années | Lignes grisées et plus petites, « Pas de consommation », kWh/DJU « — » | ☐ |
| 5 | Importer `consommations-demo.csv` sur /collecte/import, revenir sur /climat | 2023 : 56 910,5 kWh (électricité + gaz) · 2 229,5 · **25,53** · OK | ☐ |
| 6 | Saisie manuelle 2024 : janvier et février seulement | 2024 : « Année incomplète (non comparable) (2/12 mois) », valeur affichée | ☐ |
| 7 | Saisie manuelle 2026 : janvier | 2026 : « DJU manquant », kWh/DJU « — » ; encadré « DJU manquant pour 2026 … lancez npm run db:import » | ☐ |
| 8 | Arrêter la base (`npm run db:down`), recharger | Message « Impossible de joindre la base de données : lancez npm run db:up » | ☐ |
| 9 | `npm run db:up`, recharger | La page revient | ☐ |

Remettre les données de démo après la recette : supprimer les années de test (2023, 2024, 2026) depuis
`npm run db:studio`, ou `npm run db:reset` puis `npm run db:import` (⚠️ efface toutes les données locales).

## Contrôle côté serveur (API)
`curl http://localhost:3000/api/climat/indicateurs` → `{ zone: "02037002", stationLabel, buildingLabel, hasDju, rows }`,
une ligne par année `{ year, consumptionKwh, monthCount, dju, kwhPerDju, status }`. Lecture seule ; sans utilisateur → 401,
sans bâtiment → 404, base arrêtée → 500 avec message.

## Preuves à garder (document B)
Capture de la page (étapes 2–4), de l'étape 7 (DJU manquant), sortie des tests `src/modules/climat`, et requête SQL
`SELECT "climateZone", count(*) FROM "DjYear" GROUP BY 1;` (2 × 16).
