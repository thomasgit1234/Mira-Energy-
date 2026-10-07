# Module `export` — Export & attestation (Phase 08)

Fichiers CSV OPERAT (EFA, consommations) et attestation numérique.

- **Piste conseillée** : T6 (+T5) (voir docs/REPARTITION.md)
- **Page** : `src/app/export/page.tsx` (placeholder à remplacer)
- **Contrat de données** : Utilise src/lib/csv.ts

## À faire dans ce module
- [ ] CSV EFA
- [ ] CSV consommations
- [ ] Attestation

## Règles
- Le code métier vit dans `src/modules/export/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
