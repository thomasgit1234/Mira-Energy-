# Recette — tâches 7.1 (synthèse) et 7.4 (états vides)

**Exigence (à reprendre dans le document A)** — La page de synthèse affiche, pour l'EFA suivie, le verdict 2030 (texte et
icône), la méthode retenue, l'année de référence et son Créf, les objectifs Crelat 2030 / 2040 / 2050 et Cabs, la
consommation suivie brute, sa consommation corrigée du climat et ses kWh corrigés/m² (D10, plus aucun DJU affiché). Chaque donnée manquante produit un message clair et une action vers la bonne page ;
une source en panne n'empêche pas les autres sections de s'afficher, et la page ne renvoie jamais d'erreur 500.

**Consommations FICTIVES, site de démonstration FICTIF (Laon 02000)** ; données climatiques de la station Saint-Quentin,
Cabs et référentiel OPERAT réels ; parts chauffage / climatisation = hypothèses Mira Énergie, à confirmer.

## Pré-requis
```
npm run db:migrate
npm run db:import
npm run db:seed
npm run dev
```
Puis, pour retrouver l'état de la démo : importer `public/exemples/consommations-demo-2010-2018.csv` (/collecte/import) et
retenir 2013 dans /comparateur (voir RECETTE-6).

## Automatique
| Vérification | Commande | Attendu |
|---|---|---|
| Synthèse, états vides, priorité, erreurs, formats | `npx vitest run src/modules/dashboard` | 36 passés |
| Projet complet | `npm run check` | tout vert |

## Nominal — http://localhost:3000/dashboard
| # | Contrôle | Attendu | OK ? |
|---|---|---|---|
| 1 | Bandeau | « Données de consommation fictives. Site de démonstration fictif (Laon). » | ☐ |
| 2 | Prochaine étape | « Tout est renseigné » → bouton « Voir le détail de la conformité » | ☐ |
| 3 | Site et EFA | « Site de démonstration (fictif), 02000 Laon », EFA SASU · propriétaire occupant, **1 200 m²**, zone **H1a**, 2 EFA | ☐ |
| 4 | Verdict 2030 | **✓ CONFORME** (icône et texte), « Conforme par l'objectif en valeur absolue (Cabs) », méthode retenue et voie la plus favorable : Cabs | ☐ |
| 5 | Objectifs | référence **2013**, Créf **52 800 kWh**, Crelat **31 680 / 26 400 / 21 120 kWh**, Cabs **278 400 kWh/an** | ☐ |
| 6 | Consommation suivie | **2025** · Consommation brute **40 500 kWh** · Consommation corrigée **41 651 kWh** · **34,71 kWh/m²** corrigés ; « Correction climatique automatique (station Saint-Quentin) » ; aucun « DJU » | ☐ |
| 7 | Chaîne | 6 étapes « ✓ Fait » (dont « Correction climatique ») ; « Bâtiment et EFA » sans lien, les 5 autres avec « Ouvrir » | ☐ |
| 8 | Encadrés | « Données réelles et sourcées » (station Saint-Quentin, Cabs, OPERAT) et « Données fictives » (dont les parts chauffage, hypothèses) | ☐ |
| 9 | Largeur | 1 280 px : deux colonnes ; mobile (outils de développement, 375 px) : une colonne, pas de défilement horizontal | ☐ |

Contrôle côté serveur : `curl http://localhost:3000/api/dashboard` → `sections.verdict.data.status = "CONFORME"`,
`sections.objectives.data = { referenceYear: 2013, crefKwh: 52800, crelat: { 2030: 31680, 2040: 26400, 2050: 21120 }, cabsKwh: 278400 }`,
`sections.followUp.data = { year: 2025, consumptionKwh: 40500, correctedKwh: 41651.33, correctedKwhPerM2: 34.71, … }`, `nextAction.code = null`.

## États vides — une ligne par cas
Tous les cas sont prouvés par `src/modules/dashboard/synthesis.test.ts` (aucune modification de base nécessaire). Pour les
voir à l'écran, **noter la valeur initiale, puis la remettre juste après** ; jamais de `npm run db:reset`.

| Cas | Code | Reproduire à l'écran | Attendu (prochaine étape) | Remettre |
|---|---|---|---|---|
| Année de référence non choisie | `REFERENCE_NON_CHOISIE` | `npm run db:studio` → EFA restauration → `referenceYear` vide | « Aucune année de référence choisie… » → **Choisir l'année de référence** (/comparateur) ; verdict toujours CONFORME par Cabs | `referenceYear` = 2013 |
| Somme des surfaces ≠ surface de l'EFA | `SURFACES_INCOHERENTES` | `SurfaceLine` SCAP1803 : 1 200 → 1 100 | « …inférieure de 100 m² à la surface totale déclarée… » → **Corriger les surfaces** (/surfaces) ; étape Surfaces « À faire » | 1 200 |
| Aucune ligne de surface | `SURFACES_ABSENTES` | test seulement (supprimer la ligne effacerait une saisie) | → **Renseigner les surfaces** (/surfaces) | — |
| Pas de consommation | `PAS_DE_CONSOMMATION` | test seulement (base vide) | → **Saisir ou importer les consommations** (/collecte) | — |
| Année suivie non corrigeable | `ANNEE_NON_CORRIGEABLE` | `npm run db:studio` → Building → `climateZone` = 02037002 (autre station) | « Année 2025 non corrigeable du climat : … » → **Voir la correction climatique** (/climat) ; brute toujours affichée, corrigée « — » ; verdict inchangé | `npm run db:seed` |
| Année incomplète / aucune année suivie | `ANNEE_INCOMPLETE`, `AUCUNE_ANNEE_SUIVIE` | test seulement | → /collecte | — |
| Référence plus éligible | `REFERENCE_INELIGIBLE` | test seulement | raison du comparateur → /comparateur | — |
| Fichier Cabs introuvable | `CABS_INDISPONIBLE` | test seulement (ne pas renommer le fichier) | → /conformite ; Crelat toujours affiché | — |
| Zone introuvable | `ZONE_INTROUVABLE` | test seulement | raison de la zone → /conformite | — |
| Base injoignable | `BASE_INJOIGNABLE` | test seulement (forme réelle de l'erreur : `PrismaClientKnownRequestError`, code `ECONNREFUSED`, observée avec une `DATABASE_URL` vers un port fermé) | commande `npm run db:up` | — |
| Utilisateur non connecté | `NON_CONNECTE` | test seulement | commande `npm run demo` + **Retour à la carte du projet** | — |
| Pas de bâtiment / d'EFA | `PAS_DE_BATIMENT` | test seulement | commande `npm run db:seed` + **Retour à la carte du projet** | — |

Vérification faite le 14 octobre 2026 sur la base locale : les deux premières lignes, puis requête de contrôle
(`referenceYear` = 2013, ligne SCAP1803 = 1 200 m², EFA bureaux 500 m² / SCAP0401 500 m², inchangée).

## Point relevé pour le module conformité
Avec une somme de lignes incohérente (1 100 m² pour une EFA de 1 200 m²), la conformité calcule le Cabs sur la somme des
lignes (232 × 1 100 = 255 200) sans signaler l'écart. Le dashboard l'indique (`SURFACES_INCOHERENTES`), mais la page
/conformite ne le fait pas : à discuter (refuser le Cabs, ou l'afficher avec un avertissement).

## Preuves à garder (document B)
Sortie de `npx vitest run src/modules/dashboard`, capture de la page nominale (1 280 px et mobile), captures des deux états
reproduits à l'écran.
