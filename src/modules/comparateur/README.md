# Module `comparateur` — Comparateur d'années et année de référence (Phase 05, tâches 5.1 à 5.3)

Comparer les consommations **brutes** 2010–2019, suggérer l'année de référence et permettre de la choisir.

- **Piste conseillée** : T4 (+T5) (voir docs/REPARTITION.md)
- **Page** : `src/app/comparateur/page.tsx` — **API** : `GET /api/comparateur`, `PUT /api/comparateur/reference`
- **Données** : indicateurs annuels du module climat (`loadClimatIndicators` via `@/modules/climat`)
- **Recette** : `docs/RECETTE-5.md`

## Règles métier (cadrage Mira du 9 octobre, non réinterprétées)
- L'année de référence est une année **pleine de 12 mois**, entre **2010 et 2019 inclus**. Jamais une moyenne.
- **2020 et 2021** se déclarent sur OPERAT mais sont **exclues** comme année de référence et du suivi des objectifs ;
  elles sont affichées en lecture seule avec cette raison.
- **Suggestion** : parmi les années éligibles, l'année la plus **consommatrice**. Aide affichée :
  « L'année où vous avez le plus consommé est souvent la plus favorable. »
- Comparaison et suggestion sur consommations **brutes** (kWh d'énergie finale, pas d'eau). La consommation **corrigée du
  climat** (module climat, D10) est affichée à côté : deux barres par année dans l'histogramme, une colonne dans le tableau.

## Fichiers
| Fichier | Rôle |
|---|---|
| `reference.ts` | Fonctions pures : `isReferenceYearEligible`, `isEligibleRow`, `ineligibleReason`, `buildComparatorRows` (5.1), `suggestReferenceYear` (5.2), `validateReferenceChoice` (5.3), formats français, constantes (bandeau de démo, textes). |
| `repository.ts` | `loadComparator()` (5.1/5.2, lecture seule) ; `chooseReferenceYear()` (5.3). Serveur uniquement. |
| `ReferenceChooser.tsx` | Choix de l'année (5.3) : sélection parmi les années éligibles, badge « Référence choisie », bouton « Retenir cette année ». |
| `ReferenceChart.tsx` | Histogramme SVG pur (aucune dépendance), accessible (`role="img"`, `<title>`, `<desc>`, tableau équivalent sur la page). |
| `reference.test.ts` | Tests, dont la suggestion sur le fichier de démo `public/exemples/consommations-demo-2010-2018.csv`. |
| `repository.test.ts` | `chooseReferenceYear` de bout en bout (base simulée) : un refus n'écrit rien. |

## Hypothèses (à valider)
1. **Égalité** de consommation entre deux années éligibles : l'année la plus **ancienne** est suggérée.
2. **Suggestion = maximum** de la consommation brute annuelle (toutes énergies), jamais une moyenne.
3. **Année complète** = critère du module climat (statut `OK` de `buildYearIndicators` : chaque énergie présente a ses 12 mois),
   réutilisé tel quel. Une année complète mais **non corrigeable** du climat reste éligible (le choix porte sur la brute).
4. **Corrigée du climat** : affichée pour information, calculée par le module climat ; elle n'entre ni dans la suggestion
   ni dans l'éligibilité.
5. **Une seule EFA** : la première EFA du bâtiment de l'utilisateur (comme le module surfaces). La référence « par EFA »
   viendra avec le site de Laon (plusieurs EFA).
6. Le bandeau « Données de démonstration fictives. » est la constante `DEMO_BANNER` de `reference.ts` (la mettre à `null` pour le retirer).

## 5.3 — Choix de l'année de référence : contrat
`PUT /api/comparateur/reference` avec `{ "year": 2013 }` (`efaId` facultatif, par défaut l'EFA de l'utilisateur) :

| Cas | Réponse |
|---|---|
| Requête mal formée | 400 `{ error }` |
| Non connecté | 401 |
| `efaId` d'un autre utilisateur | 404 « EFA introuvable. » |
| Année refusée | 422 `{ error, issues: [{ code, message }] }`, code `HORS_PERIODE` (dont 2020/2021), `PAS_DE_DONNEES` ou `ANNEE_INCOMPLETE` — **rien n'est écrit** |
| Année valide | 200 `{ ok: true, chosenYear }` — écrit `EFA.referenceYear` |

**Stockage : champ `EFA.referenceYear Int?`** (décision de Léo), ajouté par la **PR schéma dédiée** `feat/schema-reference-year`
(migration `20261013200708_efa_reference_year`, colonne nullable, label `schema`) — **à fusionner avant ce module**, puis
`npm run db:migrate`. `null` = pas encore choisie ; `GET /api/comparateur` renvoie `chosenYear`. Si l'année enregistrée
devient non éligible (données modifiées), la page le signale.

## Règles
- Le code métier vit dans `src/modules/comparateur/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
