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

## À faire dans ce module
- [ ] Formulaire bâtiment + EFA
- [ ] Recherche d'adresse / identifiant RNB (tâche 1.1)
- [ ] Rattachement utilisateur ↔ bâtiment

## Règles
- Le code métier vit dans `src/modules/batiment/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
