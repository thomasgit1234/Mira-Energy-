# Référentiels

Les dossiers `dju/` et `operat/` contiennent des données **réelles et sourcées** (voir plus bas). Toute valeur
réglementaire (DJU, Cabs, catégorie OPERAT) doit être sourcée ; à défaut, elle est marquée fictive ou « non calculable ».

- Les anciens fichiers fictifs categories.csv et zones-climatiques.csv ont été supprimés (branche site-laon) ; le test
  `scripts/no-demo-codes.test.ts` vérifie qu'aucun code DEMO_* ne revient.

Import : `npm run db:import` (idempotent).

## `operat/referentiel_activites_OPERAT_v9.0.csv` — référentiel d'activités RÉEL
- **Source** : ADEME, « Description Import CSV CONSOMMATIONS » V9.0 du 08/04/2026, onglet 5 (pack Mira du 09/10/2026).
- **Contenu** : 64 catégories (`CAPxx` / `CAPxxxx`), 491 sous-catégories (`SCAPxxxx` / `SCAPxxxxxx`), ajustement
  climatique par usage, indicateurs d'intensité d'usage et valeurs étalon. Une ligne par indicateur.
- **Format** connu uniquement de `src/modules/batiment/operat-activites.ts`.
- `npm run db:import` l'écrit dans `ReferenceData` (types `CATEGORY` et `SUBCATEGORY`) et supprime les lignes qui n'y
  figurent plus, sauf celles encore utilisées par une ligne de surface (avertissement).
- **Mise à jour** : un seul fichier `referentiel_activites_OPERAT_v<X>.csv` dans le dossier ; pour passer en v9.1,
  remplacer le fichier puis relancer `npm run db:import`.

## `operat/departement_zone_climatique.csv` — zone climatique par département RÉELLE
- **Source** : pack Mira du 09/10/2026, table dérivée des stations météo du référentiel OPERAT V9.0 (ADEME, onglet 6).
- **Format** : `departement;zone_climatique;remarque`, connu uniquement de `src/modules/batiment/zone-climatique.ts`.
- Zone unique par département, sauf l'Hérault (34 : `H2c/H3`, choisir via la station). Corse en 2A / 2B. Pour les DOM
  (971 à 976), la colonne donne le nom du territoire : la zone est traitée comme « non définie ».
- Pas importée en base : lue à la demande ; `npm run db:import` se contente de la vérifier.

## `operat/cabs_CAP18_restauration.json` — valeurs absolues Cabs RÉELLES
Arrêté du 1er août 2025 « valeurs absolues VI », catégorie CAP18 uniquement. Lu par `src/modules/conformite/cabs-source.ts`.

## `dju/dju_mensuel_2010_2025.csv` — degrés-jours unifiés RÉELS (tâche 4.1)
- **Source : Météo-France, Licence Ouverte 2.0** — jeu « Données climatologiques de base - quotidiennes »
  (data.gouv.fr), fichiers du département 02. Réutilisation libre en citant « Source : Météo-France ».
- **Calcul** : DJU chauffage, méthode « Météo », base 18 °C : max(0 ; 18 − (TN + TX) / 2) par jour, sommé par mois.
- **Format** : `code_station;nom_station;annee;mois;DJU_chauffage_base18;DJ_refroid_base18;jours_mesures`,
  séparateur « ; », virgule décimale, 384 lignes = 2 stations × 192 mois (2010 à 2025).
- **Stations** :

  | Code | Station | Usage |
  |---|---|---|
  | 02037002 | Aulnois-sous-Laon | Station de **suivi** retenue pour la démo (la plus proche de Laon) |
  | 02320001 | Saint-Quentin | Station du référentiel **OPERAT** pour l'Aisne, gardée pour l'export (phase 08) |

- `npm run db:import` agrège les mois en **DJU annuels** (somme des 12 mois ; une année incomplète est ignorée et
  signalée) et les écrit dans la table `DjYear` (`climateZone` = code station, voir `src/modules/climat/README.md`).
- Le format n'est connu que de `parseDjuCsv` / `readDjuFile` (`src/modules/climat/dju-source.ts`) : si le format
  change, c'est la seule fonction à réécrire.
- Ces DJU servent au **suivi** dans l'application, **pas à la déclaration OPERAT** (OPERAT corrige lui-même le climat
  à partir du code station).
