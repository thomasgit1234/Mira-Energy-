# Module `securite` — RGPD & sécurité (Phase 09)

Authentification réelle, consentement, suppression des données.

- **Piste conseillée** : T1 (transversal) (voir docs/REPARTITION.md)
- **Page** : `src/app/securite/page.tsx` (placeholder à remplacer)
- **Contrat de données** : Remplace le corps de getCurrentUser (src/lib/session.ts)

## À faire dans ce module
- [ ] Auth
- [ ] Consentement
- [ ] Suppression/export des données

## Règles
- Le code métier vit dans `src/modules/securite/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
