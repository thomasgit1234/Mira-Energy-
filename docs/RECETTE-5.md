# Recette — tâches 5.1 à 5.3 (comparateur d'années, année de référence)

**Exigence (à reprendre dans le document A)** — Le comparateur affiche les consommations brutes 2010–2019 (histogramme +
tableau équivalent) avec le kWh/DJU indicatif ; il signale les années non éligibles (2020/2021 exclues, hors période,
incomplètes, sans consommation) ; il suggère l'année éligible la plus consommatrice (égalité : la plus ancienne) ; un choix
d'année refusé n'écrit rien (HTTP 422).

**Données de démonstration FICTIVES** (bandeau affiché sur la page).

## Pré-requis
```
npm run demo        # une fois (ou : npm run db:import puis npm run db:seed)
npm run dev
```
Puis importer l'historique fictif : **http://localhost:3000/collecte/import** → fichier `consommations-demo-2010-2018.csv`
(lien de téléchargement sur la page, ou `public/exemples/`) → **Importer**. Attendu : 116 lignes, 0 erreur, « 116 mois enregistrés ».

## Automatique
| Vérification | Commande | Attendu |
|---|---|---|
| Comparateur, suggestion, validation du choix (31 tests) | `npx vitest run src/modules/comparateur` | 31 passés |
| Projet complet | `npm run check` | tout vert |

## Manuelle — http://localhost:3000/comparateur
| # | Action | Résultat attendu | OK ? |
|---|---|---|---|
| 1 | Ouvrir la page **avant** l'import | Bandeau « Données de démonstration fictives. » ; 2019 seule éligible, suggérée | ☐ |
| 2 | Importer le CSV (pré-requis), recharger | Histogramme 2010–2019, kWh au-dessus des barres, kWh/DJU en dessous | ☐ |
| 3 | Lire la suggestion | « Année la plus consommatrice (suggérée) **2013** — 52 800 kWh » + aide « L'année où vous avez le plus consommé… » | ☐ |
| 4 | Regarder la barre 2013 | Contour pointillé épais + libellé au-dessus (pas seulement la couleur) | ☐ |
| 5 | Regarder 2011 | Barre hachurée grise, « non éligible » ; tableau : « non : année incomplète » | ☐ |
| 6 | Regarder 2015 | 48 000 kWh (électricité + gaz), éligible | ☐ |
| 7 | Tableau, années suivantes | 2020 et 2021 : « 2020 et 2021 : exclues du suivi des objectifs » ; 2022–2025 : « hors période » | ☐ |
| 8 | Mention sous le titre | « Réduction brute, avant la correction climatique que fait OPERAT. » | ☐ |

Valeurs attendues (kWh / kWh/DJU, station 02037002) : 2010 46 800 / 15,17 · 2011 32 000 / 13,54 (incomplète) ·
2012 49 200 / 18,11 · **2013 52 800 / 17,90** · 2014 45 600 / 19,69 · 2015 48 000 / 18,76 · 2016 44 400 / 16,45 ·
2017 50 400 / 19,88 · 2018 43 200 / 17,62 · 2019 47 700 / 19,19.

## Contrôle côté serveur (API)
```
curl http://localhost:3000/api/comparateur                        → suggested = { year: 2013, consumptionKwh: 52800 }
curl -X PUT -H "Content-Type: application/json" -d "{\"year\":2020}" http://localhost:3000/api/comparateur/reference  → 422 HORS_PERIODE
curl -X PUT -H "Content-Type: application/json" -d "{\"year\":2011}" http://localhost:3000/api/comparateur/reference  → 422 ANNEE_INCOMPLETE
curl -X PUT -H "Content-Type: application/json" -d "{\"year\":2016}" ...  (après suppression de 2016) → 422 PAS_DE_DONNEES
curl -X PUT ... -d "{\"year\":2013,\"efaId\":\"pas-a-moi\"}"      → 404
curl -X PUT ... -d "{\"year\":2013}"                              → 501 tant que le stockage n'est pas décidé (puis 200)
```
Après chaque refus : `GET /api/comparateur` renvoie le même `chosenYear` qu'avant (rien n'est écrit).

## Remise à l'état du seed
Supprimer les années 2010–2018 importées (`npm run db:studio`, table `Consumption`), ou `npm run db:reset` puis `npm run db:import`
(⚠️ efface toutes les données locales).

## Preuves à garder (document B)
Capture de la page après import (suggestion 2013, 2011 hachurée, 2020/2021 signalées), sortie des tests `src/modules/comparateur`,
et les réponses 422 des appels `curl`.
