# Recette — tâches 6.1 à 6.3 (conformité : Crelat, Cabs, verdict)

**Exigence (à reprendre dans le document A)** — La page de conformité calcule l'objectif relatif (Crelat = −40/−50/−60 % de la
consommation de l'année de référence) et l'objectif absolu (Cabs = Σ seuil × surface, arrêté du 1er août 2025 « valeurs
absolues VI »), les compare à la consommation brute de la dernière année complète hors 2020/2021 et affiche un verdict 2030
(CONFORME si au moins une méthode est satisfaite) ; une donnée manquante donne un message clair, jamais un plantage.

**Consommations FICTIVES, site de démonstration FICTIF (Laon 02000)** : zone H1a déduite du code postal, altitude < 400 m à confirmer (IGN), sous-catégorie OPERAT SCAP1803 (voir aussi docs/RECETTE-OPERAT.md).

## Pré-requis
```
npm run demo          # une fois (ou : npm run db:import puis npm run db:seed)
npm run db:import     # base déjà utilisée : retire les anciennes catégories DEMO après le seed
npm run db:migrate    # colonne EFA.referenceYear (tâche 5)
npm run dev
```
1. **http://localhost:3000/collecte/import** → `consommations-demo-2010-2018.csv` → Importer (116 mois, 0 erreur).
2. **http://localhost:3000/comparateur** → « Retenir cette année (2013) » → badge « Référence choisie 2013 — 52 800 kWh ».

## Automatique
| Vérification | Commande | Attendu |
|---|---|---|
| Crelat, Cabs (dont le vrai fichier), verdict, site de Laon (dont l'EFA bureaux) | `npx vitest run src/modules/conformite` | 47 passés |
| Projet complet | `npm run check` | tout vert |

## Manuelle — http://localhost:3000/conformite
| # | Action | Résultat attendu | OK ? |
|---|---|---|---|
| 1 | Ouvrir la page | Bandeau « Données de consommation fictives. Site de démonstration fictif (Laon). » ; mention « Réduction brute, avant la correction climatique que fait OPERAT. » | ☐ |
| 2 | Lire le verdict | **✓ CONFORME** (texte + icône), « Conforme par l'objectif en valeur absolue (Cabs) », « Voie la plus favorable : objectif en valeur absolue (Cabs) », consommation suivie **2025, 40 500 kWh** | ☐ |
| 3 | Colonne Crelat | Référence 2013, Créf 52 800, objectifs **31 680 / 26 400 / 21 120**, écart 2030 **+8 820**, « non atteint » | ☐ |
| 4 | Colonne Cabs | Zone H1a · <400 m (altitude à confirmer (IGN)), seuil **232** (99 CVC + 133 USE) sur une ligne SCAP1803 de 1 200 m², surface **1 200**, objectif **278 400**, écart **−237 900**, « atteint » | ☐ |
| 5 | Tableau des jalons | 2030, 2040, 2050 : Crelat non atteint, Cabs atteint, CONFORME | ☐ |
| 6 | Vider l'année de référence (`npm run db:studio`, EFA.referenceYear vide), recharger | Encadré « Objectif relatif non calculable : choisissez une année de référence » (lien comparateur) ; verdict **CONFORME** par Cabs | ☐ |
| 7 | Renommer `data/referentiels/operat/cabs_CAP18_restauration.json`, recharger | Pas de plantage : « Objectif Cabs non calculable : Fichier Cabs introuvable… » ; verdict **INDÉTERMINÉ** avec ce qu'il faut renseigner. **Remettre le nom d'origine.** | ☐ |
| 8 | Arrêter la base (`npm run db:down`), recharger | « Impossible de joindre la base de données : lancez npm run db:up » | ☐ |

## Contrôle côté serveur (API)
`curl http://localhost:3000/api/conformite` → `reference.crefKwh = 52800`, `crelat.objectives = { 2030: 31680, 2040: 26400, 2050: 21120 }`,
`cabs.objectiveKwh = 278400`, `current = { year: 2025, consumptionKwh: 40500 }`, `verdict.main.status = "CONFORME"`,
`verdict.main.favorable = "CABS"`, `site = { postcode: "02000", department: "02", zone: "H1a", altitudeBand: "<400", sources }`,
`otherEfas[0].cabs.code = "SOUS_CATEGORIE_INCONNUE"` (EFA bureaux SCAP0401). Lecture seule.

## Remise à l'état du seed
Supprimer les années 2010–2018 importées et vider `EFA.referenceYear` (`npm run db:studio`).

## Preuves à garder (document B)
Capture de la page (étapes 2–4), de l'étape 6 (sans référence) et de l'étape 7 (fichier absent), sortie des tests `src/modules/conformite`.
