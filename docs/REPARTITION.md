# Répartition du travail à 6 — PROPOSITION À AJUSTER ENSEMBLE

Principe : **un module = un dossier = une personne responsable** (`src/modules/<nom>/` + `src/app/<nom>/`).
Tout ce qui est commun (`src/lib/`, `prisma/`) est géré par PR avec relecture. Si chacun reste dans son
dossier, il n'y a quasiment pas de conflits Git.

| Piste | Nom (à remplir) | Modules / phases | Contenu | Dépend de |
|---|---|---|---|---|
| **T1** | ………… | `batiment` (01) + `securite` (09) + garde du socle | Formulaire bâtiment/EFA, RNB, auth réelle, RGPD ; propriétaire de `prisma/` et `src/lib/` | socle |
| **T2** | ………… | `collecte` modes 1 & 2 (02) | Import PDF/Excel (OCR, score de confiance) + saisie manuelle | `saveConsumption` |
| **T3** | ………… | `collecte` modes 3, 4, 5 (02) + `surfaces` (03) | Modèle d'email, import export Enedis/GRDF, API ACD simulée ; photo des surfaces | `saveConsumption`, référentiels |
| **T4** | ………… | `climat` (04) + `comparateur` (05) | DJU, normalisation, comparateur d'années — **le goulot** : à démarrer tôt | données de T2/T3 (seed au début) |
| **T5** | ………… | `conformite` (06) + référentiels (Cabs/catégories) | Crelat, Cabs, verdict 2030/2040/2050 ; chargement des référentiels sourcés | T4, surfaces |
| **T6** | ………… | `dashboard` (07) + `export` (08) | Interface Dupont, graphiques, CSV OPERAT, attestation | T5 (maquettes d'abord) |

Transversal, à partager : phase 10 (démo), modèle économique (demandé par le jury), relecture des PR.

## Pourquoi ça tient en parallèle
- **Les 5 modes de collecte n'écrivent jamais directement en base** : ils appellent `saveConsumption()`
  (`src/lib/consumption-writer.ts`). Chaque mode ne produit qu'une liste `{ month, kwh }`.
- **Le jeu de démo** (`npm run demo`) donne à T4, T5 et T6 des données réalistes dès le jour 1 — ils
  n'attendent pas que la collecte soit finie.
- Les phases 03 et 09 tournent à côté de la chaîne principale (voir le plan).

## À ajuster
- Si T2 est trop chargé (OCR) : déplacer le mode 2 (saisie manuelle, le plus simple) chez T3.
- T4 porte le goulot : lui donner la personne la plus à l'aise en calcul.
- 6 pistes pour 6 personnes, mais une personne peut tenir 2 petites pistes si l'équipe est inégale.
