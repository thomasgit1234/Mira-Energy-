# Recette — tâches 1.1 (fiche bâtiment, ID-RNB) et 1.2 (zone climatique par code postal)

Page : **/batiment** (lien « Ouvrir » de l'étape « Bâtiment et EFA » du tableau de bord).
Le bâtiment affiché est celui de l'EFA choisie dans le sélecteur. Les valeurs ci-dessous sont celles du site de démonstration
**fictif** de Laon. Le RNB contient des données publiques : ne rattachez pas au site fictif l'ID-RNB d'un bâtiment réel, sauf le temps de montrer la recherche.

## Automatique
| Vérification | Commande | Attendu |
|---|---|---|
| Lecteur RNB (réponses réelles réduites, faux fetch : aucun appel réseau), contrôle de la fiche, zone 1.2 sur la vraie table OPERAT | `npx vitest run src/modules/batiment` | tous passés |
| Projet complet | `npm run check` | tout vert |

## Manuel — http://localhost:3000/batiment
| # | Action | Attendu | OK ? |
|---|---|---|---|
| 1 | Ouvrir la page | Résumé : « Site de démonstration (fictif), 02000 Laon », ID-RNB « non renseigné », zone **H1a**, altitude « < 400 m (altitude à confirmer (IGN)) », station 02320001 ; 2 EFA (1 200 m² et 500 m²) | ☐ |
| 2 | Code postal → 13001 | La zone passe à **H3 · département 13** sans enregistrer ; avertissement « station … 02320001 … pas dans le département » | ☐ |
| 3 | Code postal → 20000, puis 34000 | « Corse, département 2A ou 2B ambigu » ; « plusieurs zones (H2c, H3) » : jamais de zone devinée | ☐ |
| 4 | Remettre 02000 ; surface → 1 600 ; Enregistrer | Refus : « …inférieure à la somme des surfaces de ses EFA (1 700 m²) » | ☐ |
| 5 | ID-RNB « ABC » ; Enregistrer | « ID-RNB invalide : 12 caractères… » | ☐ |
| 6 | Adresse « 1 rue du Cloître », Chercher par l'adresse (connexion Internet) | Liste du RNB avec EZNS-VN9P-D1H5 « construit », « 1 Rue du Cloître, 02000 Laon », BDNB bdnb-bc-UD2H-GAP4-J69S | ☐ |
| 7 | ID-RNB « EZNSVN9PD1H5 », Vérifier ; puis « ZZZZZZZZZZZZ » | Le bâtiment ci-dessus ; puis « n'existe pas dans le RNB » | ☐ |
| 8 | Couper le Wi-Fi, Vérifier | « Le RNB ne répond pas … saisissez l'ID-RNB à la main » ; la page reste utilisable | ☐ |
| 9 | Remettre l'adresse « Site de démonstration (fictif) », ID-RNB vide, surface 1 700 ; Enregistrer | « Fiche bâtiment enregistrée. » ; résumé à jour | ☐ |

API : `GET /api/batiment[?efa=]`, `PUT /api/batiment` (422 + `issues` si refusé, 409 si l'ID-RNB est déjà pris par un autre
bâtiment), `GET /api/batiment/rnb?id=…` ou `?q=…` (réservé à un utilisateur connecté, toujours 200).

## Preuves à garder (document B)
Sortie de `npx vitest run src/modules/batiment`, capture de la page, captures des étapes 2, 6 et 8.
