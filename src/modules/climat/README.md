# Module `climat` — Correction climatique (DJU) (Phase 04, tâches 4.1 à 4.3)

Pour chaque année : consommation annuelle de l'EFA (kWh) ÷ DJU de l'année et de la station du bâtiment = **kWh/DJU**.

- **Piste conseillée** : T4 (voir docs/REPARTITION.md)
- **Page** : `src/app/climat/page.tsx` — **API** : `GET /api/climat/indicateurs` (lecture seule)
- **Données** : table Prisma `DjYear` (remplie par `npm run db:import`), consommations de l'EFA (`Consumption`, `ConsumptionMonth`)
- **Recette** : `docs/RECETTE-4.md`

## Les DJU : réels, Météo-France
- Fichier : `data/referentiels/dju/dju_mensuel_2010_2025.csv` — **Source : Météo-France, Licence Ouverte 2.0**.
- DJU chauffage, méthode « Météo », base 18 °C : max(0 ; 18 − (TN + TX) / 2) par jour, sommé par mois.
- Deux stations, 2010 à 2025 : **02037002 Aulnois-sous-Laon** (station de **suivi**, celle du bâtiment de démo) et
  **02320001 Saint-Quentin** (station **OPERAT** de l'Aisne, gardée pour l'export, phase 08).
- Les DJU ne servent **pas** à la déclaration OPERAT (OPERAT corrige lui-même le climat), seulement au suivi dans l'application.

## Fichiers
| Fichier | Rôle |
|---|---|
| `dju-source.ts` | **4.1** — `parseDjuCsv` / `readDjuFile` : **le seul code qui connaît le format du fichier DJU**. Agrège les mois en DJU annuels. Si le format change, on ne réécrit que ce fichier. |
| `repository.ts` | **4.1** `loadDjuTable()` (seule lecture des DJU à l'exécution, depuis `DjYear`) ; **4.3** `loadClimatIndicators()` (utilisateur → bâtiment → EFA → consommations, 401 / 404 comme les surfaces). Serveur uniquement. |
| `indicators.ts` | **4.2** `normalizeZone`, `findDju`, `isValidDju` ; **4.3** `computeKwhPerDju`, `buildYearIndicators`, `STATUS_LABELS`. Fonctions pures. |
| `stations.ts` | Libellés des stations pour l'affichage. |
| `*.test.ts` | Tests (dont le contrôle des DJU annuels sur le vrai fichier). |

## Règles de calcul
- **Agrégation (4.1)** : DJU annuel = somme des 12 mois, arrondie au dixième. Une année n'est produite que si les
  12 mois sont présents et si `jours_mesures` = nombre réel de jours de chaque mois (bissextiles comprises) ;
  sinon elle est ignorée et signalée. Doublon station + année + mois, colonne manquante, DJU non numérique ou
  négatif = erreur bloquante pour `db:import`.
- **kWh/DJU (4.3)** : arrondi à 2 décimales ; jamais de division par un DJU nul, négatif, non numérique ou NaN.
- **Statuts**, par priorité : `PAS_DE_CONSOMMATION` → `DJU_MANQUANT` (kWh/DJU non calculé) → `ANNEE_INCOMPLETE`
  (valeur calculée mais **non comparable**) → `OK`. Les années affichées sont l'union des années avec consommation
  et des années avec DJU pour la station.

## Hypothèses (à valider avec Mira / la tutrice)
1. **Consommation annuelle** = somme de tous les mois et de **toutes les énergies** de l'EFA pour l'année.
2. **Année complète** = chaque énergie présente a ses 12 mois.
3. Les mois **validés ou non** sont pris tels quels.
4. Le kWh/DJU est calculé sur la consommation **totale** : c'est un indicateur de suivi, **indicatif**. La correction
   climatique rigoureuse ne porte que sur la part chauffage (non distinguée aujourd'hui).
5. **2020 et 2021** sont à déclarer mais exclues comme année de référence et du suivi des objectifs (règle du cadrage
   Mira) : à appliquer dans les tâches 5 (comparateur), **pas ici** — elles sont affichées normalement.
6. Le **DJU mensuel** existe dans le fichier mais n'est pas utilisé : une vue mensuelle (évolution future) demanderait
   une nouvelle table.

## Limite connue : `climateZone` porte le code station
Le schéma n'a qu'un champ `climateZone` (sur `Building` et `DjYear`). **Provisoirement, il porte le code de la
station Météo-France** (`02037002` pour le bâtiment de démo). La **zone climatique H1a**, nécessaire pour Cabs
(tâche 6.2), sera déduite plus tard du département (tâche 1.2). Séparer les deux notions en deux champs demandera
une **PR schéma dédiée** (label `schema`), hors de cette tâche.

## Règles
- Le code métier vit dans `src/modules/climat/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
