# Module `surfaces` — Décomposition des surfaces (tâche 1.3)

Répartition des surfaces par catégorie/sous-catégorie OPERAT.

- **Piste conseillée** : T3 (voir docs/REPARTITION.md)
- **Page** : `src/app/surfaces/page.tsx` (placeholder à remplacer)
- **Contrat de données** : Prisma : SurfaceLine, ReferenceData

## À faire dans ce module
- [x] Saisie des lignes de surface (`SurfaceForm.tsx`, `repository.ts`, `/api/surfaces`)
- [x] Contrôle somme = surface totale (`validation.ts`, testé)
- [ ] Plus tard : photo + points (phase 03 du plan), total modifiable depuis le module bâtiment

## Règles
- Le code métier vit dans `src/modules/surfaces/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.

## Vérifier
Voir `docs/RECETTE-1.3.md`.
