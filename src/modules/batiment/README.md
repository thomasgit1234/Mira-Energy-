# Module `batiment` — Référentiel bâtiment (Phase 01)

Identifier le bâtiment, son EFA et son propriétaire (adresse, RNB/BDNB, zone climatique).

- **Piste conseillée** : T1 (voir docs/REPARTITION.md)
- **Page** : `src/app/batiment/page.tsx` (placeholder à remplacer)
- **Contrat de données** : Prisma : Building, EFA, User

## Référentiel d'activités OPERAT (fait)
- **Source** : ADEME, « Description Import CSV CONSOMMATIONS » V9.0 du 08/04/2026, onglet 5 (pack Mira du 09/10/2026).
  Fichier : `data/referentiels/operat/referentiel_activites_OPERAT_v9.0.csv` — 64 catégories, 491 sous-catégories.
- **Lecteur unique** : `operat-activites.ts` (`parseOperatActivities`, `readOperatActivities`). C'est le seul code qui
  connaît ce format (D9) ; le reste du projet manipule des `OperatCategory` / `OperatSubCategory`.
- **Contenu d'une sous-catégorie** : code (`SCAPxxxx` ou `SCAPxxxxxx`), libellé, catégorie (`CAPxx` ou `CAPxxxx`),
  ajustements climatiques par usage (chauffage, refroidissement, logistique de froid, froid commercial) et indicateurs
  d'intensité d'usage avec leur valeur étalon (`null` quand l'ADEME n'en fixe pas, jamais 0).
- **Contrôles** (tous bloquants à l'import) : colonnes attendues, codes bien formés, ajustements à 0/1, valeur étalon
  numérique, doublon (sous-catégorie, indicateur), sous-catégorie rattachée à deux catégories, libellés ou
  ajustements divergents, version lisible dans le nom du fichier.
- **Import** : `npm run db:import` écrit les catégories (`CATEGORY`) et sous-catégories (`SUBCATEGORY`) dans
  `ReferenceData`, avec `value = { category, version, ajustements, indicateurs }`. Idempotent ; une ligne absente de la
  source est supprimée, sauf si une ligne de surface l'utilise encore (avertissement, ligne conservée).
- **Mise à jour (ex. v9.1)** : remplacer le fichier dans `data/referentiels/operat/` (un seul
  `referentiel_activites_OPERAT_v<X>.csv` à la fois, sinon erreur), relancer `npm run db:import`, puis `npm test`
  (le test « vrai référentiel » vérifie les comptes : à mettre à jour avec la nouvelle version).

## Zone climatique depuis le code postal (tâche 1.2, logique faite)
- **Source** : `data/referentiels/operat/departement_zone_climatique.csv` (pack Mira du 09/10/2026, table dérivée des
  stations météo du référentiel OPERAT V9.0, onglet 6). Lue à la demande, **pas importée en base** (pas de PR schema).
- **Lecteur unique** : `zone-climatique.ts` (`parseDepartmentZones`, `readDepartmentZones`).
- `departmentFromPostcode` (pure) : 02000 → 02 ; DOM 97100 → 971 ; Corse 20xxx → erreur `CORSE_AMBIGUE` (2A ou 2B ne
  se déduit pas du code postal).
- `climateZoneForPostcode` : renvoie une zone unique (02000 → H1a), ou une erreur explicite, jamais une zone devinée :
  `CODE_POSTAL_INVALIDE`, `CORSE_AMBIGUE`, `DEPARTEMENT_ABSENT`, `ZONE_NON_DEFINIE` (DOM : le fichier donne le nom du
  territoire, pas de zone), `PLUSIEURS_ZONES` (Hérault 34 : H2c/H3, choisir via la station).
- `npm run db:import` vérifie la table et refuse un fichier abîmé.
- Reste à faire : brancher sur le formulaire bâtiment (tâche 1.1) et la tranche d'altitude (IGN, D15).

## Site de l'utilisateur (`site.ts`)
- `loadUserSite()` (serveur) : bâtiment de la première EFA de l'utilisateur, son code postal et toutes ses EFA (triées par id,
  surface de l'EFA avec repli sur celle du bâtiment, lignes de surface). Utilisé par la conformité.
- `SITE_ALTITUDE_BAND = "<400"` : tranche d'altitude du site de démo de Laon, **à confirmer (IGN)**, constante isolée (D15)
  tant que la tâche 1.1 ne lit pas l'altitude.
- Site de démonstration (seed) : « Site de démonstration (fictif) », Laon 02000, sans adresse postale réelle ; EFA
  restauration (SCAP1803, 1 200 m², toujours la première) et EFA bureaux (SCAP0401, 500 m², id `<restauration>-bureaux`).

## À faire dans ce module
- [ ] Formulaire bâtiment + EFA
- [ ] Recherche d'adresse / identifiant RNB (tâche 1.1)
- [ ] Rattachement utilisateur ↔ bâtiment

## Règles
- Le code métier vit dans `src/modules/batiment/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
