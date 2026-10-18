# Recette — phase 04 (correction climatique en arrière-plan)

**Consigne de Mira (17 octobre 2026)** — « Il ne sera plus nécessaire de calculer les DJU pour le cas démo. kWh/DJU à ne
pas du tout faire. Les 2 indicateurs à retenir : kWh corrigés par mois et kWh corrigés/m². La correction climatique se fait
en arrière-plan, et l'utilisateur ne voit que la conso brute et celle corrigée. » (décision D10, parts : D21)

**Exigence (à reprendre dans le document A)** — Pour chaque mois de consommation, l'application calcule la consommation
corrigée du climat avec la méthode OPERAT fournie par Mira (station Saint-Quentin 02320001, référence = moyenne 2001-2020,
coefficients bornés entre 0,5 et 2, correction des seules parts chauffage et climatisation). La page /climat affiche, à côté
de la consommation brute, la consommation corrigée par mois et par an et les kWh corrigés/m² de l'EFA. Aucune mention de
DJU à l'écran ; une année absente du fichier est « non corrigeable » (jamais 0 ni 1 par défaut) ; une énergie sans part
connue n'est pas corrigée et c'est affiché. Aucune écriture en base depuis la page ou l'API.

**Données** : fichier `data/referentiels/climat/coefficients_saint_quentin_02320001.csv`, fourni par Mira (réel, 2001-2025).
Parts chauffage / climatisation : **hypothèses Mira Énergie, à confirmer**. Consommations de démo : **fictives**.

## Pré-requis
`npm run demo` (une fois), puis :
```
npm run db:import     # vérifie le fichier climatique (25 années) ; il n'est plus importé en base
npm run db:seed       # met le bâtiment de démo sur la station 02320001 (même s'il existe déjà)
npm run dev
```
Ouvrir **http://localhost:3000/climat** (toujours `localhost`, pas l'adresse réseau).

## Automatique
| Vérification | Commande | Attendu |
|---|---|---|
| **Test de référence de la gérante** (2023), référence 2001-2020, bornes, année absente, parts ≠ 100 %, kWh/m² | `npx vitest run src/modules/climat/correction.test.ts` | 27 passés |
| Lecteur du fichier climatique (vrai fichier compris) | `npx vitest run src/modules/climat/coefficients-source.test.ts` | 8 passés |
| Indicateurs par année : brut, corrigé par mois, corrigé/m², statuts | `npx vitest run src/modules/climat/indicators.test.ts` | 7 passés |
| Projet complet | `npm run check` | tout vert |

Valeurs de contrôle (tests, tolérance 1 kWh) — référence chauffage **2 791,295**, climatisation **233,755** ;
coefficients 2023 : chauffage **1,14196**, climatisation **0,75968** ;
bureaux propane 72 627 → **82 937** · bureaux électricité 56 048 → **58 037** · total bureaux 128 675 → **140 974 kWh (+9,6 %)** ·
restaurant électricité 168 146 → **174 114** · restaurant gaz 49 000 → **49 000** · total restaurant 217 146 → **223 114 kWh**.

## Base de données
Aucune table nouvelle. `Building.climateZone = 02320001` après `npm run db:seed`. La table `DjYear` n'est plus alimentée.

## Manuelle
| # | Action | Résultat attendu | OK ? |
|---|---|---|---|
| 1 | Ouvrir la page | « Correction climatique automatique (station Saint-Quentin). » ; « Restauration — 1 200 m² » ; aucun « DJU » | ☐ |
| 2 | Lire la ligne 2019 | brute **47 700** · corrigée **48 188** · **40,16** kWh corrigés/m² · « Corrigée » | ☐ |
| 3 | Lire la ligne 2025 | brute **40 500** · corrigée **41 651** · **34,71** · « Corrigée » | ☐ |
| 4 | Ouvrir « Détail par mois » 2025 | 12 mois : janvier 3 900 → 4 011 ; avril 3 000 → 3 085 | ☐ |
| 5 | Importer `consommations-demo-2010-2018.csv` (/collecte/import), revenir | 2013 : 52 800 → 51 532 ; 2015 (électricité + gaz) : 48 000 → 48 334 (le gaz n'est pas corrigé) ; 2011 « Année incomplète (8/12 mois) » | ☐ |
| 6 | Saisie manuelle 2026 : janvier | 2026 : « Non corrigeable », corrigée « — », encadré « Année non corrigeable : 2026 » ; brute affichée | ☐ |
| 7 | `npm run db:studio` → Building → `climateZone` = 02037002, recharger | Encadré « …rattaché à la station 02037002… lancez npm run db:seed » ; toutes les années « Non corrigeable » | ☐ |
| 8 | `npm run db:seed`, recharger | La correction revient | ☐ |
| 9 | Arrêter la base (`npm run db:down`), recharger | « Impossible de joindre la base de données : lancez npm run db:up » | ☐ |

Remettre les données de démo après la recette : supprimer l'année de test 2026 depuis `npm run db:studio`.

## Contrôle côté serveur (API)
`curl http://localhost:3000/api/climat/indicateurs` → `{ zone: "02320001", stationLabel: "Saint-Quentin (02320001)", activityLabel,
surfaceM2, correctionAvailable, problem, rows }`, une ligne par année
`{ year, consumptionKwh, correctedKwh, correctedKwhPerM2, monthCount, status, correction, correctionProblem, unknownShares, months }`.
Lecture seule ; sans utilisateur → 401, sans bâtiment → 404, base arrêtée → 500 avec message.

Absence de DJU à l'écran (serveur lancé) :
```
for p in climat comparateur dashboard; do curl -s localhost:3000/$p | grep -oi "dju" | wc -l; done   # attendu : 0 0 0
```

## Preuves à garder (document B)
Sortie de `npx vitest run src/modules/climat` (dont le test de référence 128 675 → 140 974 kWh), capture de la page
(étapes 1–4), capture de l'étape 6 (année non corrigeable) et sortie de la commande « 0 0 0 ».
