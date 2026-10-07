# Module `conformite` — Conformité (Phase 06)

Calcul Crelat / Cabs et verdict de conformité aux jalons 2030/2040/2050.

- **Piste conseillée** : T5 (voir docs/REPARTITION.md)
- **Page** : `src/app/conformite/page.tsx` (placeholder à remplacer)
- **Contrat de données** : Lit comparateur + ReferenceData

## À faire dans ce module
- [ ] Crelat
- [ ] Cabs
- [ ] Verdict par jalon

## Règles
- Le code métier vit dans `src/modules/conformite/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
