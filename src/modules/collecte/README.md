# Module `collecte` — Collecte des données (Phase 02)

Les 5 modes de collecte des consommations (PDF, saisie, email, export, API simulée).

- **Piste conseillée** : T2 (+T3) (voir docs/REPARTITION.md)
- **Pages** : `src/app/collecte/page.tsx` (accueil + données déjà collectées), `src/app/collecte/saisie/` (2.2), `src/app/collecte/import/` (2.1)
- **API** : `src/app/api/collecte/consommations/route.ts` (GET / PUT), `src/app/api/collecte/import/route.ts` (POST)
- **Contrat de données** : TOUT passe par saveConsumption (src/lib/consumption-writer.ts)

## Fichiers
- `manual.ts` (+ `manual.test.ts`) : règles pures de la saisie, partagées par l'écran et le serveur
- `csv-import.ts` (+ `csv-import.test.ts`) : lecture et contrôle du CSV, regroupement par année × énergie
- `repository.ts` : lecture de l'existant, contrôle propriétaire, appel à `saveConsumption` (serveur uniquement)
- `ManualEntryForm.tsx`, `ImportForm.tsx`, `Collecte.module.css` : interface
- Fichiers d'exemple fictifs : `public/exemples/*.csv`

## À faire dans ce module
- [x] Import de fichier CSV avec relecture (2.1) — voir `docs/RECETTE-2.1.md` (PDF : prévu)
- [x] Saisie manuelle (2.2) — voir `docs/RECETTE-2.2.md`
- [ ] Modèle d'email de demande d'historique (2.3)
- [ ] Import export espace client Enedis/GRDF (2.4)
- [ ] API ACD simulée (2.5)

## Règles
- Le code métier vit dans `src/modules/collecte/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
