Mira Énergie — contexte du projet (à lire en premier)

Fichier de contexte pour toute personne (ou toute IA) qui reprend le projet. Dernière mise à jour : dimanche 18 octobre 2026 (branche feat/modification-dju). À placer à la racine du dépôt sous le nom CLAUDE.md : l'extension Claude Code le lit automatiquement. AGENTS.md renvoie vers ce fichier. Ne jamais y écrire de mot de passe, de clé, ni de vraie donnée client.

1. Le projet en bref
Projet : PFE ECE, équipe de 6, « Mira Énergie » — prototype de mise en conformité déclarative au décret tertiaire.
Cas fil rouge : « Monsieur Dupont », un restaurant (1 200 m²) sur un site de Laon (02000) ; le site de démo comporte aussi une EFA de bureaux (500 m²). Nom et adresse fictifs, consommations fictives ; les données climatiques de la station Saint-Quentin et les valeurs Cabs sont réelles (fournies par Mira).
Chef de file de ce fichier : Léo Farina. Dépôt : https://github.com/thomasgit1234/Mira-Energy- (branche main).
Langue de travail : français (code et commentaires en français, noms de variables en anglais).
Notions métier :
EFA (entité fonctionnelle assujettie) ; OPERAT (plateforme de déclaration, exports CSV) ; PRM / PCE (identifiants de compteur électricité / gaz).
Année de référence : une année complète de 12 mois choisie entre 2010 et 2019, la plus consommatrice, une par EFA, jamais une moyenne. 2020 et 2021 sont déclarées sur OPERAT mais exclues comme référence et du suivi des objectifs.
Crelat (méthode relative) : −40 % en 2030, −50 % en 2040, −60 % en 2050 par rapport à la consommation de l'année de référence (Créf).
Cabs (méthode absolue) : seuil en kWh/m²/an = CVC (zone climatique + tranche d'altitude) + USE étalon, multiplié par la surface. Source : arrêté du 1er août 2025 « valeurs absolues VI ».
Correction climatique (consigne de Mira du 17 octobre 2026, D10) : faite en arrière-plan avec la méthode OPERAT (station Saint-Quentin 02320001, référence = moyenne 2001-2020, coefficients bornés entre 0,5 et 2, seules les parts chauffage / clim sont corrigées, parts = hypothèses D21). L'utilisateur voit la consommation brute, la corrigée par mois et les kWh corrigés/m². Plus aucun DJU ni kWh/DJU à l'écran. La conformité reste sur la brute.
Consommations en kWh d'énergie finale, sans eau.
Règle de conformité : conforme si au moins une des deux méthodes (Crelat, Cabs) est satisfaite (consommation ≤ objectif). Verdict principal = jalon 2030 ; 2040 et 2050 affichés pour information.
2. Pile technique (en place sur main)

Next.js 16 (App Router) · React 19 · TypeScript · Prisma 7.10 (prisma.config.ts, générateur prisma-client → src/generated/prisma, adaptateur @prisma/adapter-pg) · PostgreSQL 16 via Docker Compose · zod 4 · vitest · tsx · ESLint 9. Node ≥ 20.19.

Organisation : src/app/ (pages, un dossier par module + api/), src/modules/<module>/ (code métier, API publique dans index.ts), src/lib/ (briques communes), prisma/ (schéma, migrations, seed), data/referentiels/ (référentiels réels et sourcés : climat/ pour le fichier de la correction climatique (station Saint-Quentin), operat/ pour le référentiel d'activités v9.0, la table département → zone et le fichier Cabs), public/exemples/ (CSV d'exemple fictifs pour la démo), docs/ (REPARTITION, CONVENTIONS, DECISIONS, fiches RECETTE-x). data/prive/ est ignoré par Git : c'est là que vont les données privées (Enedis, factures), jamais versionnées.

9 modules (src/modules/registry.ts) : batiment, collecte, surfaces, climat, comparateur, conformite, dashboard, export, securite.

Briques communes à réutiliser, ne pas recoder :

src/lib/db.ts : client Prisma paresseux (import { db } from "@/lib/db").
src/lib/session.ts : getCurrentUser() (mode dev-stub : utilisateur de démo ; la vraie authentification viendra en phase 09 sans changer la signature).
src/lib/domain.ts : vocabulaire métier partagé (rôles, types d'énergie, sources).
src/lib/csv.ts : lecture/écriture CSV (séparateur ;, UTF-8).
src/lib/consumption-writer.ts : saveConsumption, couche d'écriture commune des consommations. Règles : une seule Consumption par (EFA, année, énergie) ; chaque mois garde sa source ; un mois validé n'est jamais écrasé par une valeur non validée (fonction pure planMonthWrites + tests). Tout mode de collecte doit passer par elle.

Règle d'architecture : un seul fichier connaît le format d'un fichier externe (fichier climatique : climat/coefficients-source.ts ; Cabs : conformite/cabs-source.ts ; référentiel d'activités OPERAT : batiment/operat-activites.ts ; zone par département : batiment/zone-climatique.ts). Si un format change, on ne modifie que ce lecteur.

API publiques réutilisables entre modules : loadUserSite() (bâtiment : code postal, ville, EFA et leurs lignes de surface), loadSurfacesContext() (surfaces), loadClimatIndicators() (climat), loadComparator() (comparateur), loadConformite() (conformité), loadDashboard() (synthèse, qui appelle les cinq précédentes). Passer par index.ts du module, pas par ses fichiers internes.

3. Lancer le projet

Prérequis Windows : Docker Desktop (Virtual Machine Platform + WSL + virtualisation activée dans le BIOS ; sur HP : « SVM Mode »), Node, Git, VS Code, GitHub CLI (gh). Le guide complet est dans Mira_Energie_Guide_Installation.pdf.

git clone https://github.com/thomasgit1234/Mira-Energy-   (ou : gh repo clone thomasgit1234/Mira-Energy-)
cd Mira-Energy-
npm install
npm run demo        # crée .env, démarre la base, migre, importe les référentiels, seed du site de démo
npm run dev         # http://localhost:3000

À chaque réouverture : Docker Desktop lancé → npm run db:up → npm run dev. Après chaque git pull qui apporte un schéma ou des données : npm run db:migrate, puis npm run db:import et npm run db:seed si des référentiels ou le seed ont changé. Autres commandes : npm run check (typage + lint + tests + prisma validate), npm test, npm run db:studio, npm run db:reset, npm run db:down. Santé : http://localhost:3000/api/health. La base Docker écoute sur le port 5432 (voir .env.example et docker-compose.yml).

4. Le plan (11 phases) — Mira_Energie_Plan_Taches_S2.pdf

00 Cadrage & socle (fait) · 01 Référentiel bâtiment (1.1 adresse + ID-RNB via API RNB/BDNB, 1.2 zone climatique par code postal, 1.3 formulaire de décomposition des surfaces fait) · 02 Collecte (2.1 import PDF/Excel avec relecture et correction — import CSV fait, 2.2 saisie manuelle fait, 2.3 email d'historique mailto:, 2.4 guide d'export espace client, 2.5 API ACD simulée) · 03 Photo + Points (estimation de surface, appoint) · 04 Correction climatique (refaite le 18 octobre 2026 selon la consigne de Mira : brute + corrigée par mois + kWh corrigés/m², plus de kWh/DJU : fait) · 05 Comparateur d'années (5.1 histogramme brut vs corrigé, 5.2 année la plus favorable, 5.3 choix de l'année de référence : fait) · 06 Conformité (6.1 Crelat, 6.2 Cabs, 6.3 verdict : fait) · 07 Tableau de bord (7.1 synthèse fait, 7.2 frise, 7.3 comparatif, 7.4 états vides fait) · 08 Export & attestation · 09 RGPD & sécurité (9.1 consentement, 9.2 chiffrement, 9.3 cloisonnement propriétaire/locataire, 9.4 suppression) · 10 Démo (seed, hors-ligne, répétition) · 11 perspective (hors périmètre).

Pistes (tracks) de répartition (docs/REPARTITION.md, noms à remplir en réunion) : T1 bâtiment + sécurité + garde du socle · T2 collecte modes 1–2 · T3 collecte modes 3–5 + surfaces · T4 climat + comparateur (goulot) · T5 conformité + référentiels Cabs · T6 dashboard + export. Attention : un « track » est un morceau du projet confié à une personne ; une « phase » est une étape dans le temps. Ce ne sont pas la même chose.

5. Échéances
Soutenance intermédiaire de prototypage : semaine du 19 octobre 2026 (jour exact et date limite de remise des documents à confirmer avec le tuteur).
Soutenance finale : décembre 2026 (gel du code annoncé par Mira le 4 décembre ; date du 14 décembre à confirmer avec l'école).
La démonstration de 30 à 60 min décrite par Mira (brief V7.3, Annexe D) vise la soutenance finale ; l'école attend, pour la soutenance intermédiaire, 10 min de démo dans un oral de 20 min.
6. Soutenance intermédiaire — exigences (cahier des charges « Seconde soutenance : prototypage »)

Logique : « Ne dites pas que ça marche, démontrez-le » — des preuves (mesures, tests, démonstrations), pas des intentions. Documents à rendre (6 PDF + 1 support) :

Doc	Contenu	Format
A	Spécifications techniques et exigences testables	PDF 2 p. max
B	Plan de validation / protocole de test	PDF 2 p. max
C	Choix des composants et preuves associées	PDF 3 p. max
D	Journal des risques (à initier) : au moins 5 risques dont au moins 1 nouveau	PDF 2 p. max
E	Architecture technique consolidée (à mettre à jour)	PDF 2 p. max
F	Kit de transmission / guide de prise en main (à initier)	PDF 3 p. max
G	Support de soutenance	PDF ou PPT, 10 slides max

Format oral : 20 min + 10 min de questions. Découpage : 1 min rappel · 4 min architecture · 10 min démo · 3 min choix et preuves · 1 min risques et plan d'action · 1 min organisation de l'équipe. Grille du jury : compétences CT-BC2 0005/0006/0007/0008, CT-BC3 0010, CT-BC5 0017, avec échelle de couleurs ; un seul critère rouge invalide la compétence. Éviter : affirmations sans preuve, dépassement de pages, démo sans plan B. Le jury avait aussi demandé à la première soutenance un modèle économique (non traité dans le dossier technique) : à confier à une ou deux personnes.

7. Tranche de démo décidée (Monsieur Dupont)
Fiche bâtiment + formulaire de surfaces (tâche 1.3) — fait
Saisie manuelle (2.2) puis import CSV (2.1) via saveConsumption — fait
Preuve : un mois validé ne peut pas être écrasé (tests dans consumption-writer.test.ts) — fait
Correction climatique en arrière-plan : brute + corrigée par mois + kWh corrigés/m² (phase 04, méthode OPERAT, station Saint-Quentin) — fait
Histogramme brut vs corrigé + choix de l'année de référence (5.1–5.3) — fait
Verdict CONFORME / NON CONFORME / INDÉTERMINÉ (6.1–6.3), Crelat + Cabs — fait
Synthèse + états vides (7.1, 7.4), page /dashboard — fait
Bonus : cloisonnement/consentement (9.3, 9.1), mailto: (2.3) — à faire si le temps le permet Hors démo, à présenter comme « prévu » : phases 03 et 08, 9.2, 9.4, modes de collecte 4 et 5, phase 11. Prévoir une vidéo de secours de la démo.
8. État d'avancement (18 octobre 2026) — main à jour à 262 tests ; branche feat/modification-dju : 268 tests verts
✅ Phase 00 : socle.
✅ 1.3 surfaces ; 2.1 import CSV ; 2.2 saisie manuelle.
✅ Phase 04 climat (src/modules/climat/), refaite le 18 octobre 2026 (branche feat/modification-dju, consigne de Mira du 17 octobre) : fichier data/referentiels/climat/coefficients_saint_quentin_02320001.csv (lu à la demande, pas en base), lecteur unique coefficients-source.ts, calculs purs correction.ts (référence 2001-2020 calculée, coefficients bornés 0,5–2, correction mensuelle), parts chauffage / clim isolées dans usage-shares.ts (hypothèses à confirmer, D21), statuts de complétude OK / ANNEE_INCOMPLETE / PAS_DE_CONSOMMATION + statut de correction CORRIGEE / NON_CORRIGEABLE, page /climat (brute, corrigée par mois, kWh corrigés/m²), docs/RECETTE-4.md. Test de référence de la gérante (bureaux 128 675 → 140 974 kWh) dans correction.test.ts. dju-source.ts, stations.ts et les DJU d'Aulnois sont supprimés ; la table DjYear n'est plus alimentée. Le comparateur montre brut + corrigé (suggestion toujours sur le brut), le dashboard montre brute / corrigée / kWh corrigés/m² (étape « Correction climatique », manque ANNEE_NON_CORRIGEABLE).
✅ 5.1–5.3 comparateur (src/modules/comparateur/) : histogramme SVG brut vs corrigé, année la plus favorable suggérée, choix enregistré dans EFA.referenceYear, page /comparateur, CSV d'exemple fictif public/exemples/consommations-demo-2010-2018.csv, docs/RECETTE-5.md.
✅ 6.1–6.3 conformité (src/modules/conformite/) : crelat.ts, cabs.ts, cabs-source.ts, verdict.ts, page /conformite (avec encadré « Autres EFA du site »), API /api/conformite, docs/RECETTE-6.md. Valeurs de contrôle : Créf 52 800 → 31 680 / 26 400 / 21 120 ; Cabs SCAP1803, H1a, < 400 m = 99 + 133 = 232 kWh/m²/an → 278 400 kWh/an pour 1 200 m² ; consommation suivie 2025 = 40 500 kWh → CONFORME par Cabs.
✅ Schéma : EFA.surfaceTotal Float? (migration efa_surface_total) ; règle 1.3 = « somme des lignes = surface de l'EFA », repli sur Building.surfaceTotal.
✅ Référentiel OPERAT v9.0 (src/modules/batiment/) : lecteur unique operat-activites.ts (64 catégories, 491 sous-catégories, import idempotent dans ReferenceData), zone-climatique.ts (code postal → département → zone ; 02 → H1a ; Corse et 34 → erreur explicite), fichiers dans data/referentiels/operat/. Les anciens CSV fictifs (categories.csv, zones-climatiques.csv) et les codes DEMO_* ont disparu ; un test garde-fou l'interdit.
✅ Site de démonstration de Laon : bâtiment fictif (Laon, 02000, 1 700 m²), deux EFA — restauration 1 200 m² (SCAP1803, première EFA) et bureaux 500 m² (SCAP0401, Cabs non calculable car le fichier Cabs ne couvre que CAP18). Le contexte provisoire de la conformité (provisional.ts) est supprimé ; la zone vient du code postal ; l'altitude est la constante SITE_ALTITUDE_BAND = "<400" (module bâtiment, « à confirmer (IGN) »).
✅ 7.1 + 7.4 dashboard (src/modules/dashboard/) : page /dashboard en lecture seule (verdict 2030, objectifs, consommation suivie, chaîne de six étapes, encadré réel / fictif), fonction pure buildSynthesis, chaque section se dégrade seule, états vides avec une action, docs/RECETTE-7.md.
⏳ À faire : 1.1 / 1.2 (pages adresse, ID-RNB, zone depuis le code postal — le module bâtiment n'a pas encore d'écran) ; bonus 9.3, 9.1, 2.3 ; documents A–G ; vidéo de secours ; modèle économique ; répétition de la démo ; sélecteur d'EFA (liste de ce qu'il faut dans docs/RECETTE-OPERAT.md).
⏳ Petit correctif connu (module conformité) : si la somme des lignes de surface ne correspond pas à la surface de l'EFA, la conformité calcule le Cabs sur la somme des lignes sans le signaler (le dashboard, lui, le signale).
La page surfaces s'appelle encore « Photo des surfaces (phase 3) » sur la carte d'accueil : libellé à corriger dans registry.ts (fichier chaud, PR séparée et prévenir l'équipe). Même PR : la carte « climat » s'appelle encore « Correction climatique (DJU) » (résumé et todo parlent de kWh/DJU).
⏳ PROPANE n'est pas dans ENERGY_TYPES (src/lib/domain.ts) : la part « bureaux, propane » n'est utilisée que par les tests tant qu'une PR dédiée ne l'ajoute pas à la collecte.
9. Décisions et points d'attention
Données réelles / fictives : les données climatiques de la station Saint-Quentin 02320001 (fournies par Mira, jamais affichées) et les valeurs Cabs de l'arrêté sont réelles et sourcées ; les parts chauffage / clim par énergie sont des hypothèses Mira Énergie à confirmer (D21). Les consommations, le nom et l'adresse du site sont fictifs et étiquetés comme tels sur les pages. À dire clairement au jury. Aucune donnée client réelle dans le dépôt.
Station : Building.climateZone contient provisoirement le code de la station, désormais 02320001 Saint-Quentin (98 m), station OPERAT du 02, pour la correction climatique et pour l'export (phase 08) ; npm run db:seed met à jour un bâtiment de démo existant (anciennement 02037002). La zone H1a se déduit du département (tâche 1.2). Un champ séparé exigerait une PR schema.
Cabs non calculable plutôt qu'inventé : une case absente du fichier donne VALEUR_ABSENTE, un code absent donne SOUS_CATEGORIE_INCONNUE, jamais 0. SCAP1812 et SCAP1813 (réserves froid, objet CVC vide) sont traités comme « valeur absente ». Le fichier Cabs ne couvre que la catégorie CAP18 : pour l'EFA de bureaux (SCAP0401), le Cabs est non calculable et le verdict s'appuie sur Crelat seul ou reste INDÉTERMINÉ.
Un seul seuil Cabs est appliqué aux jalons 2030, 2040 et 2050 (le fichier n'en donne qu'un) : à vérifier dans l'arrêté.
Électricité : l'export Enedis (privé, hors dépôt) ne donne que des kWh annuels, alors que le modèle est mensuel. Pour la démo, les CSV d'exemple utilisent une répartition forfaitaire fictive (annuel ÷ 12), à marquer FICTIF.
« Première EFA » : les pages surfaces, comparateur et conformité travaillent sur la première EFA du bâtiment (tri par identifiant). Un vrai choix d'EFA (sélecteur, paramètre efaId sur les API) reste à faire. Le seed garantit que la restauration passe en premier.
Cohérence d'étiquette : la page surfaces portait « phase 3, Photo des surfaces » alors que la tâche 1.3 est en phase 01. Dire « tâche 1.3 » dans les messages d'équipe.
Une migration déjà fusionnée dans main ne se modifie jamais : on en crée une nouvelle. Toute modification de prisma/schema.prisma passe par une PR séparée, label schema, fusionnée avant le code qui l'utilise.
PR empilées à éviter : ne pas fusionner une PR dans la branche d'une autre (déjà arrivé avec la PR #4). Chaque branche part de main à jour et fusionne dans main (« Create a merge commit »).
Fichiers « chauds » où les conflits Git sont probables : prisma/schema.prisma, package.json, src/modules/registry.ts. Prévenir l'autre avant d'y toucher et pousser tout de suite.
10. Règles d'équipe (non négociables)
Jamais de vraie donnée client (factures, PDL/PRM, PCE, export Enedis) dans le dépôt : ça va dans data/prive/. .env n'est jamais versionné.
Jamais npm audit fix --force.
Une branche par tâche (ex. feat/surfaces, feat/conformite), relecture avant fusion sur main. Voir docs/CONVENTIONS.md.
Avant de pousser : npm run check. Fonctions de calcul = fonctions pures + tests *.test.ts à côté.
Après un git pull : npm run db:migrate (et db:import, db:seed si besoin).
Gel du code deux jours avant la soutenance.
Ne pas modifier le socle sans raison : il tourne.
11. Pièges déjà rencontrés (Windows)
package.json not found → on est dans le mauvais dossier (dossier imbriqué).
Docker « Virtual Machine Platform not enabled » / « WSL not installed » / HCS_E_HYPERV_NOT_INSTALLED → activer les fonctionnalités Windows (PowerShell administrateur), wsl --install --no-distribution, activer la virtualisation dans le BIOS (HP : touche Échap/F10, « SVM Mode »).
Docker « Wsl/Service/CreateInstance/CreateVm/ERROR_TIMEOUT » → wsl --shutdown, redémarrer, wsl --update.
Git : le dépôt distant doit s'appeler origin ; « Invalid username or token » → utiliser gh auth login puis gh auth setup-git ; il faut être invité comme collaborateur sur le dépôt GitHub.
git pull refusé à cause d'un fichier non suivi (ex. CLAUDE.md) → le renommer, puis refaire le pull.
Le terminal « tourne sans fin » après git log ou git show : c'est le pager. Appuyer sur q, ou utiliser git --no-pager.
npm run check échoue sur .next/dev/types/validator.ts → cache périmé : supprimer le dossier .next.
Un test vitest peut échouer une fois avec une erreur interne puis passer à la relance : à surveiller s'il se répète.
gh non reconnu → winget install GitHub.cli, redémarrer VS Code.
Ne pas relancer npm install en changeant de dossier de travail sans nécessité : cloner proprement dans C:\Users\<nom>\Mira-Energy-.
Parties non testées : guide Mac / autres marques de BIOS, workflow CI GitHub, vérification de dérive prisma migrate dev.
12. Questions ouvertes (pour Aliyath / Mira ou le tuteur)
L'export Enedis fourni correspond-il bien au site de Laon (son README parle d'un hôtel) ? Existe-t-il un détail mensuel pour l'électricité ?
Les seuils Cabs sont-ils les mêmes pour 2030, 2040 et 2050 ?
Parts chauffage / climatisation par énergie (D21) : à confirmer ; faut-il gérer le propane dans la collecte ?
Existe-t-il un fichier Cabs pour les bureaux (CAP04) ?
Les bureaux du site forment-ils une EFA indépendante (SCAP0401) ou sont-ils rattachés au restaurant (SCAP1801) ?
Altitude du site de Laon (ou confirmation < 400 m) ?
Le comparateur brut vs corrigé reste-t-il dans le périmètre (il n'est pas parmi les six écrans prioritaires du brief) ?
Les deux CSV « vérité terrain » (gaz, propane) mentionnés dans le cadrage.
Date, durée et format de la démo de décembre ; date limite et canal de remise des documents de la soutenance intermédiaire.
13. Documents produits dans cette conversation

Mira_Energie_Guide_Installation.pdf (V2, 16 p.) · Mira_Energie_Plan_Semaine_Soutenance.pdf (4 p.) · Mira_Energie_Plan_Taches_S2.pdf / Vague1_Detail.pdf / Vague2_Detail.pdf (plan et détail technique des phases) · Mira_Energie_Plan_Demo.pdf · Mira_Energie_Prochaines_Etapes.pdf · Mira_Energie_Questions_Bloquantes.pdf · fiches de recette docs/RECETTE-1.3.md, RECETTE-4.md, RECETTE-5.md, RECETTE-6.md.

14. Consignes pour l'IA qui reprend le travail
Répondre en français, de façon claire ; l'équipe est composée d'étudiants, pas tous à l'aise avec Git/Docker.
Lire d'abord README.md, docs/REPARTITION.md, docs/CONVENTIONS.md, docs/DECISIONS.md et le README du module concerné avant de modifier du code.
Travailler sur une branche partie de main à jour, ne pas toucher aux fichiers « chauds » sans prévenir, ne pas modifier le schéma sans PR dédiée, ne jamais pousser ni fusionner à la place de l'équipe.
Toujours prouver : tests automatiques + capture ou commande de vérification, car la soutenance juge des preuves.
Ne jamais inventer de valeur réglementaire (données climatiques, parts d'usage, Cabs, catégories OPERAT) : la marquer fictive, la rendre « non calculable », ou demander la source.