# Module `collecte` — Collecte des données (Phase 02)

Les 5 modes de collecte des consommations (PDF, saisie, email, export, API simulée).

- **Piste conseillée** : T2 (+T3) (voir docs/REPARTITION.md)
- **Page** : `src/app/collecte/page.tsx` (placeholder à remplacer)
- **Contrat de données** : TOUT passe par saveConsumption (src/lib/consumption-writer.ts)

## À faire dans ce module
- [ ] Import PDF/Excel
- [ ] Saisie manuelle
- [ ] Modèle d'email de demande d'historique
- [ ] Import export espace client Enedis/GRDF
- [ ] API ACD simulée

## Règles
- Le code métier vit dans `src/modules/collecte/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
