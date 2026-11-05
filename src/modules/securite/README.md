# Module `securite` — RGPD & sécurité (Phase 09)

Authentification réelle, consentement, cloisonnement, suppression des données.

- **Piste conseillée** : T1 (transversal) (voir docs/REPARTITION.md)
- **Page** : `src/app/securite/page.tsx` — cloisonnement propriétaire / locataire (tâche 9.3) et choix du compte de démo
- **Contrat de données** : remplace le corps de getCurrentUser (src/lib/session.ts)

## Cloisonnement propriétaire / locataire (tâche 9.3, fait)
- Règle unique, pure et testée : `src/modules/batiment/access.ts` (décision D22). Elle vit dans le module bâtiment parce que le
  sélecteur d'EFA (`userEfaIds`, `resolveUserEfaId`) est le point de passage de toutes les pages et API.
- Données : relation `EFA.occupants` ↔ `User.occupiedEfas` (migration `efa_occupants`, PR schema séparée).
- Écritures : collecte, surfaces et année de référence passent par la même règle (`userCanAccessEfa`, `resolveUserEfaId`) ;
  la fiche bâtiment n'est modifiable que par un propriétaire ou un administrateur (403 sinon).
- Démonstration : `DEMO_USERS` et le cookie `mira-demo-user` (src/lib/session.ts, mode dev-stub seulement) ; route
  `GET /api/securite/demo-user?email=…&back=…` ; utilisateur courant affiché au-dessus du sélecteur d'EFA de chaque page.
- Recette : `docs/RECETTE-9.3.md` ; vérification de bout en bout : `node scripts/verifier-cloisonnement.mjs`.

## À faire dans ce module
- [ ] Auth réelle (remplacer le corps de getCurrentUser ; supprimer alors le choix de compte de démo)
- [ ] Consentement (9.1 : PR schema pour enregistrer date et version du texte)
- [ ] Suppression / export des données (9.4)
- [ ] Chiffrement (9.2)

## Règles
- Le code métier vit dans `src/modules/securite/` ; ne modifiez pas les autres modules sans PR dédiée.
- Pour changer le schéma de base : PR séparée, label `schema` (voir docs/CONVENTIONS.md).
- Fonctions de calcul = fonctions pures + tests `*.test.ts` à côté.
