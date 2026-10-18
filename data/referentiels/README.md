# Référentiels

Les dossiers `climat/` et `operat/` contiennent des données **réelles et sourcées** (voir plus bas). Toute valeur
réglementaire (données climatiques, Cabs, catégorie OPERAT) doit être sourcée ; à défaut, elle est marquée fictive ou
« non calculable ».

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

## `climat/coefficients_saint_quentin_02320001.csv` — données climatiques RÉELLES (correction climatique, D10)
- **Source** : fourni par Mira (méthode OPERAT), station **Saint-Quentin 02320001**, station du référentiel OPERAT pour
  l'Aisne ; degrés-jours « professionnels de l'énergie », seuil 18 °C, chauffage et climatisation, 2001 à 2025.
- **Format** : `annee;dju_chauffage;dju_climatisation`, séparateur « ; », point décimal, une ligne par année.
- Sert **uniquement** au calcul de la correction climatique (référence = moyenne 2001-2020, coefficients bornés entre
  0,5 et 2) ; ces valeurs ne sont **pas affichées** (consigne de Mira du 17 octobre 2026).
- Pas importé en base : lu à la demande par le module climat ; `npm run db:import` se contente de le vérifier.
- Le format n'est connu que de `parseClimateCsv` / `readClimateFile` (`src/modules/climat/coefficients-source.ts`).
- Les anciens DJU mensuels Météo-France (dossier `dju/`, stations Aulnois-sous-Laon et Saint-Quentin) ont été retirés le
  18 octobre 2026 ; la table `DjYear` n'est plus alimentée.
