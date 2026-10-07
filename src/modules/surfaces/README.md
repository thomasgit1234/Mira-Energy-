# Module `surfaces` — Photo des surfaces (Phase 03)

Répartition des surfaces par catégorie/sous-catégorie OPERAT.

- **Piste conseillée** : T3 (voir docs/REPARTITION.md)
- **Page** : `src/app/surfaces/page.tsx` (placeholder à remplacer)
- **Contrat de données** : Prisma : SurfaceLine, ReferenceData

## À faire dans ce module
- [ ] Saisie des lignes de surface
- [ ] Contrôle somme = surface totale

## Règles
- Le code métier vit dans `src/modules/surfaces/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
