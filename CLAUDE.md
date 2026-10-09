# Mira Énergie — contexte du projet (à lire en premier)

> Fichier de contexte pour toute personne (ou toute IA) qui reprend le projet. Dernière mise à jour : jeudi 8 octobre 2026.
> À placer à la racine du dépôt sous le nom `CLAUDE.md` : l'extension Claude Code le lit automatiquement.
> **Ne jamais y écrire de mot de passe, de clé, ni de vraie donnée client.**

## 1. Le projet en bref
- **Projet** : PFE ECE, équipe de 6, « Mira Énergie » — prototype de mise en conformité **déclarative** au **décret tertiaire**.
- **Cas fil rouge** : « Monsieur Dupont » (bâtiment de 1 200 m², restauration), données **fictives** de démonstration.
- **Chef de file de ce fichier** : Léo Farina. Dépôt : https://github.com/thomasgit1234/Mira-Energy- (branche `main`).
- **Langue de travail** : français (code et commentaires en français, noms de variables en anglais).
- **Notions métier** : EFA (entité fonctionnelle assujettie), Crelat (méthode relative : 2030 = −40 %, 2040 = −50 %, 2050 = −60 % par rapport à l'année de référence 2010–2019), Cabs (méthode absolue : seuil par catégorie × surface), DJU (degrés-jours unifiés, correction climatique), OPERAT (plateforme de déclaration, exports CSV), PDL/PCE (identifiants de compteur électricité/gaz).
- **Règle de conformité** : conforme si **au moins une** des deux méthodes (Crelat, Cabs) est satisfaite.

## 2. Pile technique (déjà en place sur `main`)
Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7.10 (`prisma.config.ts`, générateur `prisma-client` → `src/generated/prisma`, adaptateur `@prisma/adapter-pg`) · PostgreSQL 16 via Docker Compose · zod 4 · vitest · tsx · ESLint 9. Node ≥ 20.19.

Organisation : `src/app/` (pages, un dossier par module + `api/`), `src/modules/<module>/` (code métier, API publique dans `index.ts`), `src/lib/` (briques communes), `prisma/` (schéma, migration, seed), `data/referentiels/*.csv` (référentiels **fictifs**), `docs/` (REPARTITION, CONVENTIONS, DECISIONS).

9 modules (`src/modules/registry.ts`) : batiment, collecte, surfaces, climat, comparateur, conformite, dashboard, export, securite.

Briques communes à **réutiliser, ne pas recoder** :
- `src/lib/db.ts` : client Prisma paresseux (`import { db } from "@/lib/db"`).
- `src/lib/session.ts` : `getCurrentUser()` (mode `dev-stub` : utilisateur de démo ; la vraie authentification viendra en phase 09 sans changer la signature).
- `src/lib/domain.ts` : vocabulaire métier partagé (rôles, types d'énergie, sources).
- `src/lib/csv.ts` : lecture/écriture CSV (séparateur `;`, UTF-8).
- `src/lib/consumption-writer.ts` : **`saveConsumption`**, couche d'écriture commune des consommations. Règles : une seule `Consumption` par (EFA, année, énergie) ; chaque mois garde sa source ; **un mois validé n'est jamais écrasé par une valeur non validée** (fonction pure `planMonthWrites` + tests). Tout mode de collecte doit passer par elle.

## 3. Lancer le projet
Prérequis Windows : Docker Desktop (Virtual Machine Platform + WSL + virtualisation activée dans le BIOS ; sur HP : « SVM Mode »), Node, Git, VS Code, GitHub CLI (`gh`). Le guide complet est dans `Mira_Energie_Guide_Installation.pdf`.

```
git clone https://github.com/thomasgit1234/Mira-Energy-   (ou : gh repo clone thomasgit1234/Mira-Energy-)
cd Mira-Energy-
npm install
npm run demo        # crée .env, démarre la base, migre, importe les référentiels, seed Dupont
npm run dev         # http://localhost:3000
```
À chaque réouverture : Docker Desktop lancé → `npm run db:up` → `npm run dev`.
Autres commandes : `npm run check` (typage + lint + tests + prisma validate), `npm test`, `npm run db:studio`, `npm run db:import`, `npm run db:seed`, `npm run db:reset`, `npm run db:down`.
Santé : http://localhost:3000/api/health. La base Docker écoute sur le port **5432** (voir `.env.example` et `docker-compose.yml`).

## 4. Le plan (11 phases) — `Mira_Energie_Plan_Taches_S2.pdf`
00 Cadrage & socle (**fait**) · 01 Référentiel bâtiment (1.1 adresse + ID-RNB via API RNB/BDNB, 1.2 zone climatique par code postal, 1.3 formulaire de décomposition des surfaces) · 02 Collecte (2.1 import PDF/Excel avec relecture et correction, 2.2 saisie manuelle, 2.3 email d'historique `mailto:`, 2.4 guide d'export espace client, 2.5 API ACD simulée) · 03 Photo + Points (estimation de surface, appoint) · 04 DJU (4.1 chargement, 4.2 jointure année/zone, 4.3 kWh/DJU) · 05 Comparateur d'années (5.1 histogramme brut vs corrigé, 5.2 année la plus favorable, 5.3 choix de l'année de référence) · 06 Conformité (6.1 Crelat, 6.2 Cabs, 6.3 verdict) · 07 Tableau de bord (7.1 synthèse, 7.2 frise, 7.3 comparatif, 7.4 états vides) · 08 Export & attestation · 09 RGPD & sécurité (9.1 consentement, 9.2 chiffrement, 9.3 cloisonnement propriétaire/locataire, 9.4 suppression) · 10 Démo (seed, hors-ligne, répétition) · 11 perspective (hors périmètre).
Les phases **01, 02 et 09** peuvent avancer en parallèle une fois le socle posé.

**Pistes (tracks) de répartition** (`docs/REPARTITION.md`, noms à remplir en réunion) : T1 bâtiment + sécurité + garde du socle · T2 collecte modes 1–2 · T3 collecte modes 3–5 + surfaces · T4 climat + comparateur (goulot) · T5 conformité + référentiels Cabs · T6 dashboard + export.
Attention : un « track » est un morceau du projet confié à une personne ; une « phase » est une étape dans le temps. Ce ne sont pas la même chose.

## 5. Échéances
- **Soutenance intermédiaire de prototypage : semaine du 19 octobre 2026** (jour exact et date limite de remise des documents **à confirmer** avec le tuteur).
- **Soutenance finale : décembre 2026.**
- **Réunion PFE avec le tuteur : jeudi 8 octobre 2026** (visio).

## 6. Soutenance intermédiaire — exigences (cahier des charges « Seconde soutenance : prototypage »)
Logique : **« Ne dites pas que ça marche, démontrez-le »** — des preuves (mesures, tests, démonstrations), pas des intentions.
Documents à rendre (**6 PDF + 1 support**) :
| Doc | Contenu | Format |
|---|---|---|
| A | Spécifications techniques et exigences testables | PDF 2 p. max |
| B | Plan de validation / protocole de test | PDF 2 p. max |
| C | Choix des composants et preuves associées | PDF 3 p. max |
| D | Journal des risques (à initier) : au moins 5 risques dont au moins 1 nouveau | PDF 2 p. max |
| E | Architecture technique consolidée (à mettre à jour) | PDF 2 p. max |
| F | Kit de transmission / guide de prise en main (à initier) | PDF 3 p. max |
| G | Support de soutenance | PDF ou PPT, 10 slides max |

Format oral : 20 min + 10 min de questions. Découpage : 1 min rappel · 4 min architecture · **10 min démo** · 3 min choix et preuves · 1 min risques et plan d'action · 1 min organisation de l'équipe.
Grille du jury : compétences CT-BC2 0005/0006/0007/0008, CT-BC3 0010, CT-BC5 0017, avec échelle de couleurs ; **un seul critère rouge invalide la compétence**. Éviter : affirmations sans preuve, dépassement de pages, démo sans plan B. Le jury avait aussi demandé à la première soutenance un **modèle économique** (non traité dans le dossier technique) : à confier à une ou deux personnes.

## 7. Tranche de démo décidée (Monsieur Dupont)
1. Fiche bâtiment + formulaire de surfaces (tâche 1.3) — **fait, voir §8**
2. Saisie manuelle (2.2) puis import Excel/CSV (2.1) via `saveConsumption`
3. Preuve : un mois validé ne peut pas être écrasé (14 tests dans `consumption-writer.test.ts`)
4. kWh/DJU (4.1–4.3), données DEMO
5. Histogramme brut vs corrigé + choix de l'année de référence (5.1–5.3)
6. Verdict CONFORME / NON CONFORME (6.1–6.3)
7. Synthèse + états vides (7.1, 7.4)
8. Bonus : cloisonnement/consentement (9.3, 9.1), `mailto:` (2.3)
Hors démo, à présenter comme « prévu » : phases 03 et 08, 9.2, 9.4, modes de collecte 4 et 5, phase 11. Prévoir une **vidéo de secours** de la démo.
Règle d'architecture pour 4–6 : **isoler la lecture des fichiers DJU/Cabs dans une seule fonction**, pour adapter vite si le tuteur impose un autre format.

## 8. État d'avancement (7 octobre 2026, 17 h 30)
- ✅ Phase 00 : socle sur `main`, testé sur Windows (Docker, `npm run demo`, `dev`, `/api/health`).
- ✅ Guide d'installation PDF (16 p.) et plan de la semaine PDF (4 p.) produits.
- ✅ **Tâche 1.3 écrite et testée** (livrée en archive `mira-1.3-surfaces.zip`) — **pas encore poussée sur GitHub** : à dézipper à la racine, créer la branche `feat/surfaces`, `npm run db:import`, vérifier avec `docs/RECETTE-1.3.md`, puis pousser.
  - Fichiers : `src/modules/surfaces/{validation.ts, validation.test.ts, repository.ts, SurfaceForm.tsx, SurfaceForm.module.css, index.ts, README.md}`, `src/app/api/surfaces/route.ts` (GET + PUT), `src/app/surfaces/page.tsx`, `data/referentiels/categories.csv` (3 lignes de démo ajoutées), `docs/RECETTE-1.3.md`.
  - Règles : sous-catégorie ∈ catégorie ; surface > 0 ; pas de doublon de sous-catégorie ; **somme des lignes = surface totale du bâtiment** (arrondi au centième) ; un refus n'écrit rien (HTTP 422) ; EFA d'un autre utilisateur → 404.
  - Test réel : 29 tests verts au total (14 + 15 nouveaux), API et interface essayées contre PostgreSQL avec un navigateur automatisé.
- ⏳ À faire : 2.2 puis 2.1 (collecte), calcul 4–6 sur données DEMO, 7.1/7.4, documents A–G, vidéo de secours, modèle économique.
- ⏳ Attendent la visio du tuteur : formats DJU, valeurs Cabs, export OPERAT d'exemple, ID-RNB/BDNB et mapping code postal → zone (1.1, 1.2).

## 9. Décisions et points d'attention
- **Données fictives** : zone « DEMO », codes `DEMO_*`. Aucune vraie valeur DJU/Cabs/OPERAT dans le dépôt tant qu'elle n'est pas sourcée. À dire clairement au jury.
- **Cohérence d'étiquette** : dans le squelette, la page `surfaces` porte « phase 3, Photo des surfaces » alors que la tâche 1.3 du plan est en phase 01. Dire « tâche 1.3 » dans les messages d'équipe.
- Surface totale du bâtiment : lue depuis `Building.surfaceTotal`, **non modifiable** depuis la page surfaces (ce sera le module bâtiment, tâches 1.1/1.2).
- La page surfaces travaille sur la première EFA du bâtiment de l'utilisateur de démo.
- Une migration déjà fusionnée dans `main` **ne se modifie jamais** : on en crée une nouvelle. Toute modification de `prisma/schema.prisma` passe par une PR séparée, label `schema`.
- Fichiers « chauds » où les conflits Git sont probables : `prisma/schema.prisma`, `package.json`, `src/modules/registry.ts`. Prévenir l'autre avant d'y toucher et pousser tout de suite.

## 10. Règles d'équipe (non négociables)
- **Jamais** de vraie donnée client (factures, PDL, PCE) dans le dépôt. **`.env` n'est jamais versionné.**
- **Jamais** `npm audit fix --force`.
- Une **branche par tâche** (ex. `feat/surfaces`, `feat/collecte-saisie`), relecture avant fusion sur `main`. Les poussées directes sur `main` ne valent que pour le socle initial. Voir `docs/CONVENTIONS.md`.
- Avant de pousser : `npm run check`. Fonctions de calcul = **fonctions pures + tests `*.test.ts` à côté**.
- **Gel du code deux jours avant la soutenance.**
- Ne pas modifier le socle sans raison : il tourne.

## 11. Pièges déjà rencontrés (Windows)
- `package.json not found` → on est dans le mauvais dossier (dossier imbriqué).
- Docker « Virtual Machine Platform not enabled » / « WSL not installed » / `HCS_E_HYPERV_NOT_INSTALLED` → activer les fonctionnalités Windows (PowerShell administrateur), `wsl --install --no-distribution`, activer la virtualisation dans le BIOS (HP : touche Échap/F10, « SVM Mode »).
- Git : le dépôt distant doit s'appeler `origin` ; « Invalid username or token » → utiliser `gh auth login` puis `gh auth setup-git` ; il faut être invité comme **collaborateur** sur le dépôt GitHub.
- `gh` non reconnu → `winget install GitHub.cli`, redémarrer VS Code.
- Ne pas relancer `npm install` en changeant de dossier de travail sans nécessité : cloner proprement dans `C:\Users\<nom>\Mira-Energy-`.
- Parties non testées : guide Mac / autres marques de BIOS, workflow CI GitHub, vérification de dérive `prisma migrate dev`.

## 12. Questions ouvertes pour le tuteur (visio du 8 octobre)
1. Format exact des **DJU** (source, pas de temps, station de référence) ?
2. Où trouver les valeurs **Cabs** et quelle version de l'arrêté ?
3. Un **export OPERAT d'exemple**, même anonymisé ?
4. Le parcours de démo « Monsieur Dupont » convient-il ?
5. **Date limite et canal de remise** des documents ?
6. Attentes particulières sur les documents A à G ?

## 13. Documents produits dans cette conversation
`Mira_Energie_Guide_Installation.pdf` (V2, 16 p.) · `Mira_Energie_Plan_Semaine_Soutenance.pdf` (4 p.) · `Mira_Energie_Plan_Taches_S2.pdf` / `Vague1_Detail.pdf` / `Vague2_Detail.pdf` (plan et détail technique des phases) · `mira-energie-socle.zip` (socle) · `mira-1.3-surfaces.zip` (tâche 1.3) · `docs/RECETTE-1.3.md` (fiche de recette).

## 14. Consignes pour l'IA qui reprend le travail
- Répondre en **français**, de façon claire ; l'équipe est composée d'étudiants, pas tous à l'aise avec Git/Docker.
- Lire d'abord `README.md`, `docs/REPARTITION.md`, `docs/CONVENTIONS.md`, `docs/DECISIONS.md` avant de modifier du code.
- Travailler **sur une branche**, ne pas toucher aux fichiers « chauds » sans prévenir, ne pas modifier le schéma sans PR dédiée.
- Toujours **prouver** : tests automatiques + capture ou commande de vérification, car la soutenance juge des preuves.
- Ne jamais inventer de valeur réglementaire (DJU, Cabs, catégories OPERAT) : la marquer fictive ou demander la source.
