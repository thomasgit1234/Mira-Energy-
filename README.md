# Mira Énergie — socle commun (phase 00)

Base de code partagée par les 6 membres de l'équipe : base de données, couche commune, un module par
phase, jeu de données de démo. **Clonez, `npm run demo`, et chacun travaille dans son dossier.**

## Démarrage rapide
Prérequis : Node ≥ 20.19, Docker (pour PostgreSQL), Git.

```bash
npm install
npm run demo      # crée .env, lance PostgreSQL, applique les migrations, charge référentiels + cas « Dupont »
npm run dev       # http://localhost:3000   (état de la base : /api/health)
```
Sans Docker : installez PostgreSQL 16, créez une base, copiez `.env.example` en `.env` et ajustez `DATABASE_URL`, puis `npx prisma migrate deploy && npm run db:import && npm run db:seed`.

Commandes utiles : `npm run check` (types + lint + tests + schéma, à lancer avant chaque PR), `npm run db:studio` (voir les données), `npm run db:reset`.

## Les étapes de la phase 00
| Tâche | Quoi | Où c'est fait |
|---|---|---|
| **0.1** Choix de la stack | Valider en équipe la stack proposée | `docs/DECISIONS.md` (D1, D2) — **à faire : une réunion de 20 min** |
| **0.2** Dépôt, structure, outils | Dépôt Git, dossiers, lint, tests, CI | ce dépôt, `.github/`, `docs/CONVENTIONS.md` — **à faire : pousser sur GitHub, protéger `main`** |
| **0.3** Modèle de données | Schéma + migration + référentiels | `prisma/`, `data/referentiels/`, `docs/DECISIONS.md` (D3) — **à faire : valider les formats avec la tutrice** |
| **0.4** Cas test « Dupont » | Données de démo fictives | `prisma/seed.ts` — **à faire : remplacer par les vraies hypothèses du cas quand elles sont fixées** |
| **0.5** Répartition & rituels | Qui fait quoi, comment on fusionne | `docs/REPARTITION.md`, `.github/PULL_REQUEST_TEMPLATE.md` — **à faire : mettre vos noms** |

Le code et les fichiers sont prêts ; les parties « à faire » sont des décisions et des actions d'équipe qu'un dépôt ne peut pas faire à votre place.

## Structure
```
prisma/            schéma, migrations, seed          (propriétaire : T1)
src/lib/           db, session, domain, csv, écriture commune des consommations
src/modules/       un dossier par phase (README + index.ts) + registry.ts
src/app/           pages (une par module) + /api/health
data/referentiels/ CSV fictifs DEMO      data/fixtures/ réservé aux fichiers de test fictifs
docs/              REPARTITION, CONVENTIONS, DECISIONS
```
