# Recette — tâches 5.1 à 5.3 (comparateur d'années, année de référence)

**Exigence (à reprendre dans le document A)** — Le comparateur affiche les consommations brutes ET corrigées du climat
2010–2019 (histogramme à deux barres par année + tableau équivalent, correction du module climat, D10) ; il signale les années non éligibles (2020/2021 exclues, hors période,
incomplètes, sans consommation) ; il suggère l'année éligible la plus consommatrice en BRUT (égalité : la plus ancienne ; règle inchangée, D11) ; un choix
d'année refusé n'écrit rien (HTTP 422) ; un choix valide est enregistré (`EFA.referenceYear`) et peut être changé.

**Données de démonstration FICTIVES** (bandeau affiché sur la page).

## Pré-requis
```
npm run demo        # une fois (ou : npm run db:import puis npm run db:seed)
npm run db:migrate  # applique la migration EFA.referenceYear (PR schéma)
npm run dev         # à (re)lancer APRÈS la migration, sinon « Unknown argument referenceYear »
```
Puis importer l'historique fictif : **http://localhost:3000/collecte/import** → fichier `consommations-demo-2010-2018.csv`
(lien de téléchargement sur la page, ou `public/exemples/`) → **Importer**. Attendu : 116 lignes, 0 erreur, « 116 mois enregistrés ».

## Automatique
| Vérification | Commande | Attendu |
|---|---|---|
| Comparateur, suggestion, validation, brut + corrigé, enregistrement du choix (45 tests) | `npx vitest run src/modules/comparateur` | 45 passés |
| Projet complet | `npm run check` | tout vert |

## Manuelle — http://localhost:3000/comparateur
| # | Action | Résultat attendu | OK ? |
|---|---|---|---|
| 1 | Ouvrir la page **avant** l'import | Bandeau « Données de démonstration fictives. » ; 2019 seule éligible, suggérée | ☐ |
| 2 | Importer le CSV (pré-requis), recharger | Histogramme 2010–2019, deux barres par année : brute (pleine, valeur au-dessus) et corrigée du climat (à points, valeur sous l'année) ; légende ; aucun « DJU » | ☐ |
| 3 | Lire la suggestion | « Année la plus consommatrice (suggérée) **2013** — 52 800 kWh » + aide « L'année où vous avez le plus consommé… » | ☐ |
| 4 | Regarder la barre 2013 | Contour pointillé épais + libellé au-dessus (pas seulement la couleur) | ☐ |
| 5 | Regarder 2011 | Barre hachurée grise, « non éligible » ; tableau : « non : année incomplète » | ☐ |
| 6 | Regarder 2015 | 48 000 kWh (électricité + gaz), éligible | ☐ |
| 7 | Tableau, années suivantes | 2020 et 2021 : « 2020 et 2021 : exclues du suivi des objectifs » ; 2022–2025 : « hors période » | ☐ |
| 8 | Mention sous le titre | « Le choix se fait sur la consommation brute ; la consommation corrigée du climat est affichée à côté, pour information. » | ☐ |
| 9 | Bloc « Année de référence » | « Aucune année de référence n'est encore choisie » + bouton « Retenir cette année (2013) » ; la liste ne propose que les années éligibles (pas 2011) | ☐ |
| 10 | Cliquer « Retenir cette année (2013) » | Badge « Référence choisie 2013 » (bloc, tableau) ; barre 2013 au contour plein | ☐ |
| 11 | Choisir 2017 dans la liste, « Enregistrer ce choix » | Badge « Référence choisie 2017 » ; `npm run db:studio` → `EFA.referenceYear = 2017` | ☐ |

Valeurs attendues (kWh brut / kWh corrigé, station Saint-Quentin 02320001, relevées le 18 octobre 2026) :
2010 46 800 / 45 011 · 2011 32 000 / 32 764 (incomplète) · 2012 49 200 / 48 793 · **2013 52 800 / 51 532** ·
2014 45 600 / 47 190 · 2015 48 000 / 48 334 (gaz non corrigé) · 2016 44 400 / 44 200 · 2017 50 400 / 50 759 ·
2018 43 200 / 43 801 · 2019 47 700 / 48 188. La suggestion reste **2013** (brut le plus élevé ; ici, c'est aussi la
corrigée la plus élevée, mais la règle porte sur le brut, D11).

## Contrôle côté serveur (API)
```
curl http://localhost:3000/api/comparateur                        → suggested = { year: 2013, consumptionKwh: 52800 }
curl -X PUT -H "Content-Type: application/json" -d "{\"year\":2020}" http://localhost:3000/api/comparateur/reference  → 422 HORS_PERIODE
curl -X PUT -H "Content-Type: application/json" -d "{\"year\":2011}" http://localhost:3000/api/comparateur/reference  → 422 ANNEE_INCOMPLETE
curl -X PUT -H "Content-Type: application/json" -d "{\"year\":2016}" ...  (après suppression de 2016) → 422 PAS_DE_DONNEES
curl -X PUT ... -d "{\"year\":2013,\"efaId\":\"pas-a-moi\"}"      → 404
curl -X PUT ... -d "{\"year\":2013}"                              → 200 { ok: true, chosenYear: 2013 }
```
Après chaque refus : `GET /api/comparateur` renvoie le même `chosenYear` qu'avant (rien n'est écrit).

## Remise à l'état du seed
Supprimer les années 2010–2018 importées et remettre `EFA.referenceYear` à vide (`npm run db:studio`), ou `npm run db:reset` puis `npm run db:import`
(⚠️ efface toutes les données locales).

## Preuves à garder (document B)
Capture de la page après import (brut + corrigé, suggestion 2013, 2011 hachurée, 2020/2021 signalées), sortie des tests `src/modules/comparateur`,
et les réponses 422 des appels `curl`.
