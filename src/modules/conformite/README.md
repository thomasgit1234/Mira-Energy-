# Module `conformite` — Conformité au décret tertiaire (Phase 06, tâches 6.1 à 6.3)

Méthode relative (Crelat), méthode absolue (Cabs) et verdict aux jalons 2030 / 2040 / 2050.

- **Piste conseillée** : T5 (voir docs/REPARTITION.md)
- **Page** : `src/app/conformite/page.tsx` — **API** : `GET /api/conformite` (lecture seule, aucune écriture en base)
- **Données** : comparateur (`loadComparator` : année de référence, consommations annuelles), surfaces (`loadSurfacesContext`),
  bâtiment (`loadUserSite`, `climateZoneForPostcode`, `SITE_ALTITUDE_BAND`), fichier Cabs `data/referentiels/operat/cabs_CAP18_restauration.json`
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
| `site-efas.ts` | `cabsForEfas` (pur) : Cabs des autres EFA du site, pour l'encadré « Autres EFA du site ». |
| `repository.ts` | `loadConformite()` : assemble le tout, lecture seule (contexte du site : voir plus bas). |

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

## Contexte du site (fin du contexte provisoire)
Lu par `repository.ts` via l'API du module bâtiment (`@/modules/batiment`) :
- **zone climatique** = `climateZoneForPostcode` sur le code postal du bâtiment (02000 → département 02 → **H1a**, table
  département → zone OPERAT v9.0). Zone impossible à déduire (Corse, Hérault, DOM, département absent) → Cabs **non calculable**
  avec la raison, jamais de zone devinée ;
- **tranche d'altitude** = constante `SITE_ALTITUDE_BAND = "<400"` (D15, **à confirmer IGN**) ;
- **codes OPERAT** = `subCategoryCode` des lignes de surface (référentiel v9.0), sans table de correspondance.

L'API renvoie ce contexte dans `site { postcode, city, department, zone, altitudeBand, sources }`.

## Limites
- **Verdict sur une seule EFA** (la première du bâtiment de l'utilisateur, comme les surfaces, D18). Les autres EFA du site
  n'ont que leur Cabs, dans l'encadré « Autres EFA du site » ; ce qu'il faut pour gérer plusieurs EFA est listé dans
  `docs/RECETTE-OPERAT.md`.
- **Une seule catégorie Cabs** (CAP18 Restauration) : l'EFA bureaux (SCAP0401, CAP04) a un Cabs **non calculable**
  (`SOUS_CATEGORIE_INCONNUE`), son verdict reposera sur Crelat seul ou restera INDÉTERMINÉ.
- Surface = lignes de surface de l'EFA (tâche 1.3) ; pas de distinction de surface par usage au-delà de ces lignes.
- **Consommations et site fictifs** (Laon 02000, sans adresse réelle) ; le fichier Cabs et les référentiels OPERAT sont réels.

## Règles
- Le code métier vit dans `src/modules/conformite/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
