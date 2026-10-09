# Module `collecte` — Collecte des données (Phase 02)

Les 5 modes de collecte des consommations (PDF, saisie, email, export, API simulée).

- **Piste conseillée** : T2 (+T3) (voir docs/REPARTITION.md)
- **Pages** : `src/app/collecte/page.tsx` (accueil + données déjà collectées), `src/app/collecte/saisie/` (2.2)
- **API** : `src/app/api/collecte/consommations/route.ts` (GET / PUT)
- **Contrat de données** : TOUT passe par saveConsumption (src/lib/consumption-writer.ts)

## Fichiers
- `manual.ts` (+ `manual.test.ts`) : règles pures de la saisie, partagées par l'écran et le serveur
- `repository.ts` : lecture de l'existant, contrôle propriétaire, appel à `saveConsumption` (serveur uniquement)
- `ManualEntryForm.tsx`, `Collecte.module.css` : interface

## À faire dans ce module
- [ ] Import PDF/Excel (2.1)
- [x] Saisie manuelle (2.2) — voir `docs/RECETTE-2.2.md`
- [ ] Modèle d'email de demande d'historique (2.3)
- [ ] Import export espace client Enedis/GRDF (2.4)
- [ ] API ACD simulée (2.5)

## Règles
- Le code métier vit dans `src/modules/collecte/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
