# Conventions d'équipe

## Git
- `main` est protégée : on ne pousse jamais dessus. Une branche par tâche : `t2/import-pdf`, `t4/dju-normalisation`.
- Petites PR (< 400 lignes si possible), relues par **au moins une autre personne**.
- La CI (`.github/workflows/ci.yml`) doit être verte avant de fusionner.
- Commits en français ou anglais, mais à l'impératif et précis ("Ajoute le contrôle de somme des surfaces").

## Code
- Un module n'importe d'un autre module **que via son `index.ts`**. Jamais de chemin interne.
- Accès base : `import { db } from "@/lib/db"`. Écriture des consommations : **uniquement** `saveConsumption`.
- Utilisateur courant : `getCurrentUser()` (`src/lib/session.ts`).
- Valeurs « énumérées » (rôles, énergies, sources) : dans `src/lib/domain.ts`.
- Calculs réglementaires = fonctions **pures** + tests `*.test.ts` à côté, avec la source (article/arrêté) en commentaire.
- Pas de chiffre réglementaire « de mémoire » : tout vient d'un référentiel sourcé (`data/referentiels/`).

## Base de données
- Changer le schéma = PR **séparée**, label `schema`, avertir l'équipe. Commande : `npm run db:migrate -- --name <description>`.
- Ne **jamais** modifier une migration déjà fusionnée : on en ajoute une nouvelle.
- Après un `git pull` qui contient une migration : `npm run db:migrate`.
- Repartir de zéro : `npm run db:reset` (efface tout, rejoue migrations + seed).

## Données & RGPD
- Aucune donnée réelle (factures, PDL, PCE, noms de clients) dans le dépôt, même en test. Utiliser le jeu DEMO.
- `.env` n'est jamais commité.
