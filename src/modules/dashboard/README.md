# Module `dashboard` — Tableau de bord (Phase 07)

Interface de synthèse pour l'utilisateur (Monsieur Dupont).

- **Piste conseillée** : T6 (voir docs/REPARTITION.md)
- **Page** : `src/app/dashboard/page.tsx` (placeholder à remplacer)
- **Contrat de données** : Lit conformite + comparateur

## À faire dans ce module
- [ ] Vues synthèse
- [ ] Graphiques mensuels
- [ ] Alertes

## Règles
- Le code métier vit dans `src/modules/dashboard/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
