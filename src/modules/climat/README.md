# Module `climat` — Correction climatique (DJU) (Phase 04)

Corriger les consommations par les degrés-jours unifiés.

- **Piste conseillée** : T4 (voir docs/REPARTITION.md)
- **Page** : `src/app/climat/page.tsx` (placeholder à remplacer)
- **Contrat de données** : Prisma : ClimateZone, DjYear

## À faire dans ce module
- [ ] Table DJU par zone/année
- [ ] Fonction de normalisation kWh/DJU

## Règles
- Le code métier vit dans `src/modules/climat/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
