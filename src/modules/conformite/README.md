# Module `conformite` — Conformité au décret tertiaire (Phase 06, tâches 6.1 à 6.3)

Méthode relative (Crelat), méthode absolue (Cabs) et verdict aux jalons 2030 / 2040 / 2050.

- **Piste conseillée** : T5 (voir docs/REPARTITION.md)
- **Page** : `src/app/conformite/page.tsx` — **API** : `GET /api/conformite` (lecture seule, aucune écriture en base)
- **Données** : comparateur (`loadComparator` : année de référence, consommations annuelles), surfaces (`loadSurfacesContext`),
  fichier Cabs `data/referentiels/operat/cabs_CAP18_restauration.json`
- **Recette** : `docs/RECETTE-6.md`

## Règles (V7.3 + cadrage Mira du 9 octobre)
- **Conforme si au moins une** des deux méthodes est satisfaite (le décret permet de retenir la plus favorable).
- **Crelat** : objectif = (1 − 40 % / 50 % / 60 %) × Créf pour 2030 / 2040 / 2050. Créf = consommation **brute totale**
  (kWh d'énergie finale) de l'année de référence choisie (`EFA.referenceYear`, tâche 5). Jamais de moyenne.
- **Cabs** : objectif (kWh/an) = Σ lignes de surface de l'EFA [seuil de la sous-catégorie × surface]. Seuil (kWh/m²/an) =
  CVC (zone climatique ET tranche d'altitude) + USE étalon. Source : **arrêté du 1er août 2025 dit « valeurs absolues VI »**
  (constantes `CABS_DECREE` / `CABS_SOURCE`). Contrôles : SCAP1803 H1a < 400 m = 99 + 133 = **232** (× 1 200 m² = **278 400**) ;
  SCAP1801 = 57 + 50 = **107**.
- **Suivi** : consommation de la dernière année **complète** hors 2020 et 2021. Tout est en consommation **brute**, avant la
  correction climatique que fait OPERAT (écrit sur la page). Vocabulaire : EFA, PRM (électricité), PCE (gaz). Pas d'eau.

## Fichiers
| Fichier | Rôle |
|---|---|
| `crelat.ts` | 6.1 — `computeCrelat` (pur). |
| `cabs-source.ts` | 6.2 — `parseCabsJson` / `readCabsFile` : **seul code qui connaît le format du fichier Cabs**. |
| `cabs.ts` | 6.2 — `cabsThreshold`, `computeCabs` (purs ; erreurs `SOUS_CATEGORIE_INCONNUE`, `VALEUR_ABSENTE`, `SURFACE_MANQUANTE`, `FICHIER_INDISPONIBLE`). |
| `verdict.ts` | 6.3 — `pickCurrentYear`, `evaluateVerdict` (purs). |
| `provisional.ts` | ⚠️ Contexte de démonstration provisoire (voir plus bas). |
| `repository.ts` | `loadConformite()` : assemble le tout, lecture seule ; seul utilisateur de `provisional.ts`. |

## Hypothèses (à valider)
1. « Satisfaite » = consommation **≤** objectif.
2. Cabs **à l'étalon**, jamais combiné avec la modulation (`part_use_variable` ignorée).
3. Le fichier ne donne **qu'une valeur Cabs**, appliquée aux trois jalons (2030, 2040, 2050) — **à confirmer** avec l'arrêté.
4. Consommation actuelle = dernière année **complète** hors 2020/2021 : critère « année complète » du module climat (statut `OK`),
   réutilisé tel quel.
5. Voie la plus favorable = méthode calculable dont l'objectif autorise la consommation la plus haute ; égalité → « les deux ».
6. Verdict : CONFORME si une méthode calculable est satisfaite ; NON_CONFORME si les deux sont calculables et non satisfaites ;
   INDÉTERMINÉ sinon (avec ce qu'il faut renseigner). Verdict principal = 2030 ; 2040 et 2050 pour information.
7. Créf refusé si l'année enregistrée n'est plus éligible (données modifiées depuis le choix).
8. **Réserves froid** SCAP1812 / SCAP1813 : objet CVC vide dans le fichier → **VALEUR_ABSENTE** (décision de Léo), jamais 0.
   Une seule ligne sans valeur rend tout l'objectif Cabs non calculable (pas de total partiel).

## ⚠️ Contexte provisoire à supprimer
`provisional.ts`, utilisé **uniquement** par `repository.ts` (et vérifié par `provisional.test.ts`) :
- `DEMO_SITE` : zone **H1a** (département 02, Laon), altitude **< 400 m** ;
- `DEMO_SUBCATEGORY_TO_OPERAT` : DEMO_RESTAURANT → SCAP1803, DEMO_RESTAURANT_RESERVE → SCAP1803, DEMO_BUREAU_OUVERT → SCAP1801.

Sera remplacé par les tâches 1.1/1.2 (adresse, zone climatique, altitude du site de Laon) et le référentiel OPERAT v9.0
(sous-catégories réelles). Pour le retirer : supprimer `provisional.ts` et son test, puis lire zone, altitude et codes OPERAT
depuis le bâtiment et les lignes de surface dans `repository.ts`.

## Limites
- **Une seule EFA** (la première du bâtiment de l'utilisateur, comme les surfaces) ; une seule catégorie Cabs (CAP18 Restauration).
- Surface = lignes de surface de l'EFA (tâche 1.3) ; pas de distinction de surface par usage au-delà de ces lignes.
- **Données de démo fictives** (consommations, bâtiment, sous-catégories DEMO) ; seul le fichier Cabs est réglementaire.
- La ligne `CABS_THRESHOLD` fictive (999) de `data/referentiels/categories.csv` n'est **pas** utilisée.

## Règles
- Le code métier vit dans `src/modules/conformite/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
