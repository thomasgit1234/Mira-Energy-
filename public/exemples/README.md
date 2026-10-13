# Fichiers d'exemple (import CSV, tâche 2.1)

Toutes les valeurs de ce dossier sont **FICTIVES** (aucune donnée client réelle). Format de l'import 2.1 :
`annee;mois;energie;kwh` (séparateur « ; »).

| Fichier | Contenu |
|---|---|
| `consommations-demo.csv` | 2023 électricité + gaz, et 3 mois de 2019 (pour montrer qu'un mois validé n'est pas écrasé) |
| `consommations-avec-erreurs.csv` | 7 lignes, 6 erreurs à corriger dans l'écran de relecture |
| `consommations-demo-2010-2018.csv` | Historique 2010–2018 pour le comparateur (tâche 5) : **répartition forfaitaire** (total annuel ÷ 12 par mois), **valeurs FICTIVES** |

Totaux annuels de `consommations-demo-2010-2018.csv` (kWh) : 2010 = 46 800 · 2011 = **8 mois seulement** (32 000, année
incomplète) · 2012 = 49 200 · **2013 = 52 800 (maximum)** · 2014 = 45 600 · 2015 = 48 000 (électricité 30 000 + gaz 18 000) ·
2016 = 44 400 · 2017 = 50 400 · 2018 = 43 200. L'année 2019 (47 700 kWh) vient du seed.
