# Recette — tâche 9.3 : cloisonnement propriétaire / locataire

Règle (décision **D22**, code `src/modules/batiment/access.ts`) :
- un **propriétaire** (ou administrateur) voit toutes les EFA des bâtiments auxquels il est rattaché ;
- un **locataire** ne voit **que** les EFA dont il est occupant, même s'il est rattaché au bâtiment, et ne modifie pas la fiche bâtiment ;
- une EFA hors du périmètre répond **404**, comme une EFA qui n'existe pas.

La règle est appliquée par le serveur, à un seul endroit (`userEfaIds`), pour toutes les pages, les API et les écritures
(consommations, surfaces, année de référence). Comptes de démonstration **fictifs** créés par `npm run db:seed` :
`demo.dupont@example.com` (propriétaire, restaurant et bureaux) et `locataire.demo@example.com` (locataire, occupant des bureaux).

## Pré-requis (une fois, après le pull)
`npm run db:migrate` (migration `efa_occupants`), `npx prisma generate`, `npm run db:seed`, puis **redémarrer** `npm run dev`.

## Automatique
| Vérification | Commande | Attendu |
|---|---|---|
| Règle d'accès (propriétaire, locataire, autre bâtiment, administrateur, rôle inconnu, droit de modifier la fiche) | `npx vitest run src/modules/batiment/access.test.ts` | 6 passés |
| De bout en bout sur le serveur lancé (14 contrôles, n'écrit rien) | `node scripts/verifier-cloisonnement.mjs` | 14 lignes « OK », code de sortie 0 |
| Projet complet | `npm run check` | tout vert |

## Manuel — démonstration (2 minutes)
| # | Action | Attendu | OK ? |
|---|---|---|---|
| 1 | Ouvrir /securite | « Connecté : demo.dupont@example.com (propriétaire) » ; 2 EFA visibles ; fiche bâtiment modifiable | ☐ |
| 2 | « Se connecter en tant que » sur le locataire | Retour sur /securite : « locataire.demo@example.com (locataire) », **1 EFA** visible (bureaux), fiche bâtiment en lecture seule | ☐ |
| 3 | Ouvrir /dashboard | « Utilisateur : locataire.demo@example.com (locataire) » ; sélecteur avec les **seuls bureaux** | ☐ |
| 4 | Ouvrir /conformite | Encadré « Autres EFA du site » absent (le restaurant n'est pas visible) | ☐ |
| 5 | Ouvrir /batiment | Champs grisés, « Lecture seule : seul le propriétaire du bâtiment peut modifier sa fiche » | ☐ |
| 6 | Copier dans l'adresse `/surfaces?efa=<id du restaurant>` (id lu en étant propriétaire, page /batiment) | « EFA introuvable. » : aucune donnée du restaurant | ☐ |
| 7 | Revenir au propriétaire (/securite) | Les deux EFA réapparaissent ; les bureaux portent « locataire » | ☐ |

## Limites (à dire au jury)
- Le choix du compte de démo (cookie `mira-demo-user`, liste fermée de comptes fictifs) n'existe qu'en mode `AUTH_MODE=dev-stub` :
  ce n'est pas une authentification. La vraie connexion (phase 09) remplacera le corps de `getCurrentUser` sans rien changer d'autre.
- Partage bailleur / preneur : le propriétaire voit les EFA de ses locataires. Hypothèse à confirmer avec Mira (D22).
- Hors périmètre de la démo : consentement (9.1), chiffrement (9.2), suppression et export des données (9.4).

## Preuves à garder (document B)
Sortie de `node scripts/verifier-cloisonnement.mjs`, sortie de `npx vitest run src/modules/batiment/access.test.ts`, captures
des étapes 1, 2 et 3.
