# Module `comparateur` — Comparateur d'années (Phase 05)

Comparer l'année de référence et l'année suivie (goulot du projet).

- **Piste conseillée** : T4 (+T5) (voir docs/REPARTITION.md)
- **Page** : `src/app/comparateur/page.tsx` (placeholder à remplacer)
- **Contrat de données** : Lit Consumption/ConsumptionMonth + climat

## À faire dans ce module
- [ ] Choix année de référence
- [ ] Calcul de l'écart corrigé du climat

## Règles
- Le code métier vit dans `src/modules/comparateur/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
