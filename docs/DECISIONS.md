# Décisions techniques du socle

Statut : **proposées**. La tâche 0.1 du plan est justement de les valider en équipe (et avec la tutrice).
Pour en changer une : PR qui modifie ce fichier.

- **D1 — Stack.** Next.js (App Router) + TypeScript + Prisma + PostgreSQL 16, suggérée par le dossier tutrice. Un seul langage, un seul dépôt.
- **D2 — Monolithe modulaire.** Un seul projet, un dossier par phase dans `src/modules/` (carte : `src/modules/registry.ts`).
- **D3 — Schéma.** Part de l'Annexe B du dossier. Écarts : `Consumption` a une contrainte d'unicité (EFA, année, énergie) ; `ConsumptionMonth` ajoute `source`, `confidence`, `validated` ; `DjYear` et `ClimateZone` sont séparées ; champs « type » en texte validé côté code (`src/lib/domain.ts`), pas en enum SQL, pour pouvoir en ajouter sans migration.
- **D4 — Écriture commune des consommations.** `saveConsumption` : une valeur déjà validée par l'utilisateur n'est jamais écrasée par une valeur non validée ; chaque mois garde sa source.
- **D5 — Données de démo fictives.** Zone climatique `DEMO`, codes `DEMO_*`, valeurs inventées. Aucun DJU/Cabs/catégorie OPERAT réel n'est fourni : à sourcer en phases 03/04.
- **D6 — Auth.** `AUTH_MODE=dev-stub` : un utilisateur de démo fixe. L'auth réelle (phase 09) remplace le corps de `getCurrentUser`.
- **D7 — Migrations.** Prisma Migrate. La migration `init` a été **écrite à la main** (le moteur Prisma n'était pas téléchargeable à la création) et appliquée sur un vrai PostgreSQL 16. Premier réflexe pour l'équipe : `npm run db:migrate` — il doit dire que la base est « in sync » ; sinon, voir plus bas.
- **D8 — Prisma 7.** Client généré dans `src/generated/` (non versionné, régénéré par `postinstall`), connexion via `@prisma/adapter-pg`, config dans `prisma.config.ts`.

## Points connus à vérifier
- **Si `prisma migrate dev` propose une nouvelle migration** juste après l'installation : c'est que ma migration `init` diffère légèrement du schéma. Acceptez-la sous le nom `fix_init_drift` et prévenez l'équipe.
- **Formats de référentiels** (`data/referentiels/*.csv`) : hypothèse de départ, à confirmer avec la tutrice.
- **`npm audit`** signale des vulnérabilités « high » dans les dépendances de l'outillage (CLI Prisma, `eslint-config-next`) ; le correctif automatique proposé est un retour à Prisma 6 (changement majeur), non appliqué. À réévaluer avant tout déploiement.
- **Non testés à la création** : `docker-compose.yml`, `Dockerfile`, workflow GitHub Actions.
