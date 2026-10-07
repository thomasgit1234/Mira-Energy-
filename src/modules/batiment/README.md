# Module `batiment` — Référentiel bâtiment (Phase 01)

Identifier le bâtiment, son EFA et son propriétaire (adresse, RNB/BDNB, zone climatique).

- **Piste conseillée** : T1 (voir docs/REPARTITION.md)
- **Page** : `src/app/batiment/page.tsx` (placeholder à remplacer)
- **Contrat de données** : Prisma : Building, EFA, User

## À faire dans ce module
- [ ] Formulaire bâtiment + EFA
- [ ] Recherche d'adresse / identifiant RNB
- [ ] Rattachement utilisateur ↔ bâtiment

## Règles
- Le code métier vit dans `src/modules/batiment/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
