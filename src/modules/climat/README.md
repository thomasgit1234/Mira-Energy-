# Module `climat` — Correction climatique (Phase 04)

La correction climatique se fait **en arrière-plan** (consigne de Mira du 17 octobre 2026, décision D10) : l'utilisateur voit
la consommation **brute** et la consommation **corrigée** (par mois et par an), plus les **kWh corrigés/m²** de l'EFA.
Aucun DJU ni kWh/DJU n'est affiché.

- **Piste conseillée** : T4 (voir docs/REPARTITION.md)
- **Page** : `src/app/climat/page.tsx` — **API** : `GET /api/climat/indicateurs` (lecture seule)
- **Données** : fichier `data/referentiels/climat/coefficients_saint_quentin_02320001.csv` (lu à la demande, pas en base),
  consommations de l'EFA (`Consumption`, `ConsumptionMonth`), lignes de surface (catégorie OPERAT de l'EFA)
- **Recette** : `docs/RECETTE-4.md`

## Méthode (OPERAT, fournie par Mira)
- Station **Saint-Quentin 02320001** (station OPERAT de l'Aisne), degrés-jours « professionnels de l'énergie », seuil 18 °C,
  chauffage et climatisation, 2001 à 2025.
- **Référence** = moyenne 2001-2020 de la station, **calculée** depuis le fichier (2 791,295 chauffage ; 233,755 clim).
- **Coefficient** de l'année = référence / valeur de l'année, **borné entre 0,5 et 2** (chauffage et clim séparément).
- **Corrigée** = brute × part chauffage × coef chauffage + brute × part clim × coef clim + brute × part autres usages.
- **Mensuel** : chaque mois est corrigé avec le coefficient de son année (le fichier est annuel).
- Année absente du fichier → **non corrigeable** (corrigée `null`, affichée « — ») ; jamais 0 ni 1 par défaut.

## Fichiers
| Fichier | Rôle |
|---|---|
| `coefficients-source.ts` | `parseClimateCsv` / `readClimateFile` : **le seul code qui connaît le format du fichier climatique** (D9). |
| `correction.ts` | **Pur.** `referenceDegreeDays`, `boundedCoefficient`, `yearCoefficients`, `validateShares`, `correctKwh`, `correctYear`, `kwhPerM2`. |
| `usage-shares.ts` | **Hypothèses Mira Énergie, à confirmer** (D21) : `USAGE_SHARES` (parts chauffage / clim par activité et énergie), `sharesFor`, `efaCategory`. |
| `indicators.ts` | **Pur.** `buildYearIndicators` : par année, brute, corrigée, corrigée/m², détail mensuel, statuts. |
| `repository.ts` | `loadClimatIndicators()` (utilisateur → première EFA → consommations, 401 / 404 comme les surfaces), `loadClimateRows()`. Serveur uniquement. |
| `*.test.ts` | Tests, dont le **test de référence** de la gérante (`correction.test.ts`). |

## Statuts (séparés)
- **Complétude** (`status`, sur la brute) : `OK` (chaque énergie a ses 12 mois) · `ANNEE_INCOMPLETE` · `PAS_DE_CONSOMMATION`.
  Utilisé tel quel par le comparateur (éligibilité) et la conformité (année suivie).
- **Correction** (`correction`) : `CORRIGEE` · `NON_CORRIGEABLE` (année absente du fichier, fichier invalide, ou bâtiment
  rattaché à une autre station que 02320001), avec la raison dans `correctionProblem`.
- `unknownShares` : énergies sans part connue, comptées sans correction (« part chauffage inconnue, non corrigée »).

## Parts retenues (D21, hypothèses à confirmer)
| Activité (catégorie OPERAT) | Énergie | Chauffage | Climatisation |
|---|---|---|---|
| Restauration (CAP18) | gaz naturel (`GAS`) | 0 % | 0 % |
| Restauration (CAP18) | électricité (`ELECTRICITY`) | 25 % | 0 % |
| Bureaux (CAP04) | propane (`PROPANE`, pas encore dans `src/lib/domain.ts`) | 100 % | 0 % |
| Bureaux (CAP04) | électricité (`ELECTRICITY`) | 25 % | 0 % |

## Hypothèses
1. Consommation annuelle = somme de tous les mois et de **toutes les énergies** de l'EFA.
2. Les mois **validés ou non** sont pris tels quels.
3. Catégorie de l'EFA = celle de toutes ses lignes de surface ; plusieurs catégories → activité inconnue (rien corrigé).
4. La conformité reste calculée sur la **brute** (module conformité inchangé).

## Limite connue : `climateZone` porte le code station
`Building.climateZone` porte provisoirement le code de la station (`02320001`, D16). La zone climatique H1a se déduit du
département (tâche 1.2). Séparer les deux notions demandera une **PR schéma dédiée**. La table `DjYear` n'est plus alimentée.

## Règles
- Le code métier vit dans `src/modules/climat/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
