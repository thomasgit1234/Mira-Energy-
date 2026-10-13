# Référentiels

Les fichiers ici sont **fictifs** (zone `DEMO`, codes `DEMO_*`), **sauf les DJU** du dossier `dju/`, réels
et sourcés (voir plus bas). Ils permettent de faire tourner
l'appli sans chiffre réglementaire inventé. **Aucune valeur de DJU, de Cabs ou de catégorie OPERAT
réelle ne doit y figurer tant que la phase 03/04 ne l'a pas sourcée** (arrêté + dossier tutrice).

Les formats de colonnes sont une hypothèse de départ : à confirmer avec la tutrice (tâche 0.3),
puis à corriger dans `scripts/import-referentiels.ts` si besoin.

Import : `npm run db:import` (idempotent).

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

Dans `categories.csv`, la colonne `value` contient du JSON : entourez-la de guillemets et doublez
ceux de l'intérieur (`"{""a"":1}"`), comme dans le fichier fourni.
