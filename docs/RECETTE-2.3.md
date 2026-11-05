# Recette — tâche 2.3 : demande d'historique par e-mail (mode 3)

Page : **/collecte/historique** (bouton « Demande d'historique (2.3) » sur /collecte).
Principe (dossier V7.3 §2.1) : l'e-mail part de la messagerie de l'utilisateur (lien `mailto:`), jamais d'une adresse
Mira. L'application n'envoie rien et n'enregistre rien : le PRM / PCE saisi ne sert qu'à remplir l'e-mail (pas de PR schema,
pas de donnée personnelle en base). Le fichier reçu du gestionnaire de réseau s'importe ensuite par le mode 1 (/collecte/import).
Identifiants utilisés ci-dessous : **fictifs**.

| # | Action | Attendu |
|---|---|---|
| 1 | Ouvrir /collecte/historique | Énergie électricité (Enedis), période 2010 → 2019, adresse du site de démo (fictif) affichée ; bouton « Ouvrir dans ma messagerie » désactivé |
| 2 | Saisir le PRM `0000 0000 0000 01` | Aperçu : objet « Demande d'historique de consommations électricité 2010-2019 – PRM 00000000000001 », texte avec PRM, adresse et plage |
| 3 | Cliquer « Ouvrir dans ma messagerie » | La messagerie s'ouvre, destinataire vide, objet et texte préremplis (rien n'est envoyé automatiquement) |
| 4 | Saisir `123` comme PRM | E-mail généré, avertissement « Format inhabituel pour un PRM » (format à confirmer avec Mira, question 13) |
| 5 | Destinataire `contact@miraenergie.com` | Refusé : « jamais à une adresse Mira Énergie » ; bouton désactivé |
| 6 | Énergie gaz naturel (GRDF), PCE `GI000003` | Objet « … gaz naturel 2010-2019 – PCE GI000003 » |
| 7 | Période 2019 → 2010 | « Période invalide » ; bouton désactivé |
| 8 | Titulaire vide | Le texte contient « [nom ou raison sociale du titulaire du contrat] » (jamais inventé) |
| 9 | Propane | Pas dans la liste : note « pas de gestionnaire de réseau, demandez à votre fournisseur » |

Preuves automatiques : `npx vitest run src/modules/collecte/history-request.test.ts` (13 tests : format PRM / PCE, objet,
corps, encodage `mailto:` en CRLF, refus d'une adresse Mira, période, titulaire non inventé).
Limite : la saisie du PRM / PCE n'est pas mémorisée ; un champ en base (fiche EFA, écran 2 du cadrage) demandera une PR schema.
