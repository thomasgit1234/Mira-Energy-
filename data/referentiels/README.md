# Référentiels

Les fichiers ici sont **fictifs** (zone `DEMO`, codes `DEMO_*`). Ils permettent de faire tourner
l'appli sans chiffre réglementaire inventé. **Aucune valeur de DJU, de Cabs ou de catégorie OPERAT
réelle ne doit y figurer tant que la phase 03/04 ne l'a pas sourcée** (arrêté + dossier tutrice).

Les formats de colonnes sont une hypothèse de départ : à confirmer avec la tutrice (tâche 0.3),
puis à corriger dans `scripts/import-referentiels.ts` si besoin.

Import : `npm run db:import` (idempotent).

Dans `categories.csv`, la colonne `value` contient du JSON : entourez-la de guillemets et doublez
ceux de l'intérieur (`"{""a"":1}"`), comme dans le fichier fourni.
