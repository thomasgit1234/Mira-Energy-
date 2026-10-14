# Recette — référentiel OPERAT v9.0 et site de démonstration de Laon

**Exigence (à reprendre dans le document A)** — Les catégories d'activité et la zone climatique utilisées par l'application
viennent des référentiels officiels (ADEME / OPERAT v9.0) et non de valeurs inventées : le formulaire de surfaces propose
les 64 catégories et 491 sous-catégories OPERAT, la zone climatique est déduite du code postal du bâtiment, et un objectif
Cabs qui ne peut pas être calculé est affiché « non calculable » avec sa raison, jamais avec une valeur par défaut.

**Données** : référentiels réels et sourcés (voir `data/referentiels/README.md`) ; site, nom et consommations **FICTIFS**
(« Site de démonstration (fictif) », Laon 02000, sans adresse postale réelle).

## Pré-requis
```
npm run db:migrate
npm run db:import     # référentiel OPERAT, DJU, vérification de la table département → zone
npm run db:seed       # site de Laon : EFA restauration (1 200 m²) puis EFA bureaux (500 m²)
npm run db:import     # seulement sur une base déjà utilisée : retire les anciennes catégories DEMO
npm run dev           # si le serveur tournait déjà avant la migration efa_surface_total : l'arrêter et le relancer
```

## Automatique
| Vérification | Commande | Attendu |
|---|---|---|
| Lecteur du référentiel (vrai fichier : 64 / 491, SCAP1803, SCAP0401) | `npx vitest run src/modules/batiment` | tout vert |
| Zone climatique (02000 → H1a ; 34, Corse, DOM, département absent → erreur claire) | `npx vitest run src/modules/batiment/zone-climatique` | tout vert |
| Site de Laon : Cabs 278 400, bureaux non calculable, verdict | `npx vitest run src/modules/conformite` | tout vert |
| Aucun code fictif DEMO_* | `npx vitest run scripts/no-demo-codes.test.ts` | tout vert |
| Projet complet | `npm run check` | tout vert |

## Base de données
| # | Action | Attendu | OK ? |
|---|---|---|---|
| 1 | `npm run db:import` deux fois | Mêmes comptes : `categories: 64`, `sousCategories: 491`, `departements: 101` ; `referencesSupprimees: 0` au second passage | ☐ |
| 2 | `npm run db:seed` deux fois | Même message « Seed OK » (mêmes identifiants) ; `npm run db:studio` : 1 bâtiment, 2 EFA, 1 ligne de surface chacune, aucun doublon de consommation | ☐ |
| 3 | `npm run db:studio` → `EFA` triée par id | 1re : restauration, `surfaceTotal` 1 200 ; 2e : `<id>-bureaux`, 500 | ☐ |
| 4 | `npm run db:studio` → `ReferenceData` | Aucun code `DEMO_*`, aucun `CABS_THRESHOLD` | ☐ |

## Manuelle
| # | Page | Attendu | OK ? |
|---|---|---|---|
| 5 | /surfaces | « Site de démonstration (fictif), 02000 Laon » ; une ligne Restauration - Débit de boissons / Restaurant traditionnel ou Brasserie, 1 200 m² ; somme **1 200 = 1 200** ; listes de catégories OPERAT | ☐ |
| 6 | /comparateur | Page affichée, histogramme ; référence choisie inchangée | ☐ |
| 7 | /conformite | Bandeau « Données de consommation fictives. Site de démonstration fictif (Laon). » ; Zone · altitude **H1a** · <400 m (altitude à confirmer (IGN)) ; seuil SCAP1803 **232** (99 CVC + 133 USE) ; objectif **278 400** | ☐ |
| 8 | /conformite, bas de page | « Site : 02000 Laon — zone H1a (déduite du code postal 02000…) » | ☐ |
| 9 | /conformite, encadré « Autres EFA du site » | « EFA SCAP0401 · 500 m² — Cabs non calculable : Sous-catégorie SCAP0401 absente du référentiel Cabs. Le fichier Cabs ne couvre que la catégorie CAP18… », **aucun chiffre** | ☐ |
| 10 | Avec `consommations-demo-2010-2018.csv` importé et la référence 2013 (voir RECETTE-6) | Créf 52 800 → 31 680 / 26 400 / 21 120 ; suivi 2025 = 40 500 ; **✓ CONFORME** par Cabs | ☐ |

## Gérer plusieurs EFA (hors de cette branche)
Aujourd'hui, toutes les pages travaillent sur la **première EFA** du bâtiment (tri par id, D18) ; l'encadré « Autres EFA du
site » ne donne que leur Cabs. Pour un vrai traitement multi-EFA, il faudrait :
1. un **sélecteur d'EFA** commun aux pages (paramètre d'URL `?efa=<id>`), avec l'EFA choisie mémorisée ;
2. un paramètre **`efaId`** sur les chargeurs et les API : `loadSurfacesContext`, `loadClimatIndicators`, `loadComparator`,
   `loadConformite`, collecte (`/api/collecte/...`), avec le contrôle de cloisonnement déjà présent dans `saveSurfaceLines` ;
3. un **libellé d'EFA** lisible (activité principale, surface) au lieu de « EFA SASU · propriétaire occupant » ;
4. un **fichier Cabs pour CAP04** (bureaux), à demander à Mira, pour que le Cabs des bureaux devienne calculable ;
5. les tests correspondants (deux EFA d'un même bâtiment, EFA d'un autre utilisateur refusée).

## Remise à l'état initial
Les étapes 1 à 9 n'écrivent rien de plus que le seed. L'étape 10 : voir « Remise à l'état du seed » dans RECETTE-6.

## Preuves à garder (documents B et C)
Sortie de `npm run check`, sortie des deux `db:import` (comptes identiques), captures des étapes 5, 7 et 9.
