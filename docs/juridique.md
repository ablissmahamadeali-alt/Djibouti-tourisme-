# Points juridiques et réglementaires à vérifier (Djibouti)

> **Avertissement.** Cette note est un **relevé de questions** destiné à orienter une analyse juridique, pas un avis juridique. Les textes cités ont été repérés par recherche documentaire en octobre 2026 ; leur contenu exact, leur version en vigueur et leurs textes d'application **doivent être vérifiés à la source** (Journal officiel de la République de Djibouti) et, avant le lancement commercial, validés par un avocat inscrit au barreau de Djibouti. Rien ici ne permet d'affirmer qu'une licence ou une autorisation n'est **pas** nécessaire.

## 1. Qualification de l'activité de la plateforme

Question centrale : selon la manière dont Bahri fonctionne, elle peut être qualifiée de simple **hébergeur / annuaire**, d'**intermédiaire** de réservation, ou d'**agence de voyages / opérateur de services touristiques**. Chaque qualification entraîne des obligations différentes.

| Mode de fonctionnement | Qualification probable à analyser |
| --- | --- |
| Mise en relation, le client paie directement le prestataire | Intermédiaire technique — régime de responsabilité de l'hébergeur / du prestataire de services numériques (Code du numérique ?) |
| La plateforme encaisse le prix pour le compte du prestataire | Intermédiaire financier ? Possible exigence d'agrément de la Banque centrale (voir § 5) |
| La plateforme vend des « forfaits » (traversée + hôtel + excursion) | Probablement activité d'**agence de voyages** soumise à licence |

**Texte repéré** : [décret n° 2023-176/PR/MCT régissant l'exercice des agences de voyages et autres opérateurs de services touristiques](https://www.journalofficiel.dj/texte-juridique/decret-n2023-176-pr-mct-regissant-lexercice-des-agences-de-voyages-et-autres-operateurs-de-services-touristiques-en-republique-de-djibouti/) (JO du 22 juin 2023). Selon la présentation officielle, il fixe les conditions d'exercice, un régime de **licences (type A pour une activité exclusive, type B pour une activité accessoire)** délivrées par l'**Agence Nationale du Tourisme (ANT)**, ainsi que des contrôles et sanctions. Voir aussi le [compte rendu du Conseil des ministres du 23 mai 2023](https://www.presidence.dj/conseil-des-ministres/2023-05-23).

À vérifier dans le texte intégral :

- la définition des « opérateurs de services touristiques » et si une plateforme numérique d'intermédiation y entre ;
- les conditions d'obtention (forme sociale, capital, garantie financière, assurance responsabilité civile professionnelle) ;
- l'éventuelle obligation de ne travailler qu'avec des prestataires eux-mêmes licenciés.

**Recommandation provisoire (déjà reflétée dans l'application)** : se présenter comme plateforme indépendante de mise en relation, ne vendre aucun forfait, ne pas encaisser de fonds tant que le régime n'est pas clarifié.

## 2. Transport maritime de passagers

Textes repérés (à confirmer) : **loi n° 212/AN/82 du 18 janvier 1982 portant Code des affaires maritimes** ; loi n° 83/AN/00/4e L de 2000 soumettant les **auxiliaires du transport maritime** à agrément ; décret n° 2009-030 sur l'agrément des prestataires de sûreté maritime (sources : [FAOLEX](https://faolex.fao.org/docs/pdf/dji87943.pdf)).

Questions :

- Un intermédiaire qui vend ou réserve des places sur un navire est-il un « auxiliaire du transport maritime » au sens de la loi de 2000 ?
- Quelles autorisations l'exploitant doit-il détenir (titre de navigation, certificat de sécurité, nombre maximal de passagers, assurance) ? La plateforme doit **collecter et vérifier** ces documents (table `provider_documents`, types `maritime_license`, `vessel_certificate`, `insurance`).
- Manifeste passagers : contenu obligatoire, transmission éventuelle aux autorités portuaires ou à la Direction des affaires maritimes, durée de conservation.
- Responsabilité en cas d'accident, de retard ou d'annulation : elle doit rester celle du transporteur ; les CGU doivent le dire clairement.

Interlocuteurs : Direction des affaires maritimes, autorité portuaire, Agence Nationale du Tourisme.

## 3. Protection des données personnelles

Le **Code du numérique**, dont la loi d'approbation a été adoptée le 30 juin 2025, comporte un titre consacré aux données personnelles et institue une **Commission nationale de protection des données (CNDP)** ([texte publié au JO, sept. 2025](https://www.journalofficiel.dj/wp-content/uploads/2025/09/code-numerique.pdf) ; analyses : [Jones Day](https://www.jonesday.com/en/insights/2025/07/national-assembly-of-the-republic-of-djibouti-approves-digital-code), [Techhive Advisory](https://www.techhiveadvisory.africa/insights/review-of-djiboutis-data-protection-law), [Data Protection Africa](https://dataprotection.africa/djibouti/)).

Selon des sources secondaires **non vérifiées dans le texte officiel** : droits des personnes, obligations de minimisation et de protection dès la conception, notification des violations (un délai de 72 h est avancé), **régime d'autorisation des transferts vers des pays tiers**, autorisation préalable pour certains traitements à risque. Les sources divergent sur la mise en place effective de la CNDP.

Conséquences pour Bahri :

- **Hébergement hors de Djibouti** (Supabase, serveurs en Europe ou ailleurs) = transfert international : vérifier s'il faut une autorisation ou des garanties.
- Données traitées : identité et téléphone du client, **noms des passagers** (y compris d'enfants), historique de réservations. Pas de données de carte bancaire.
- Pièces d'identité : **ne pas les collecter dans l'application** tant que ce n'est pas indispensable et encadré.
- Prévoir : registre des traitements, durées de conservation, procédure d'exercice des droits, procédure en cas de violation, contrats de sous-traitance (Supabase, envoi d'e-mails, hébergement).
- Un [projet de politique de confidentialité](politique-confidentialite.md) est fourni, à adapter.

## 4. Commerce électronique et consommateurs

Le Code du numérique traite aussi du commerce électronique (contrats en ligne). Une source de presse ([La Nation](https://www.lanation.dj/le-code-du-numerique-un-pas-decisif-pour-la-transformation-digitale/)) évoque un droit de rétractation, des garanties de conformité et des mécanismes de réclamation : **à vérifier**, notamment l'existence d'exceptions pour les prestations de transport ou de loisirs à date déterminée (ces exceptions existent dans d'autres droits, mais rien ne permet de supposer qu'elles existent ici).

À rédiger : conditions générales d'utilisation (plateforme), conditions de chaque prestataire (annulation, remboursement), mentions légales (éditeur, immatriculation, contact), procédure de réclamation.

## 5. Paiements

- La **Banque Centrale de Djibouti (BCD)** soumet les établissements financiers à agrément ; l'**Instruction n° 2017-01** encadre les émetteurs de monnaie électronique ([instructions BCD](https://banque-centrale.dj/les-instructions/), [établissements agréés](https://banque-centrale.dj/les-etablissements-agrees/)).
- **Encaisser des fonds pour le compte de tiers** (le client paie Bahri, qui reverse au prestataire) pourrait relever d'une activité réglementée : à vérifier avec la BCD et la banque choisie. Alternative plus simple : le client paie le prestataire directement, Bahri facture une commission au prestataire.
- Voir [paiements.md](paiements.md).

## 6. Fiscalité et statut de l'entreprise

À vérifier avec un expert-comptable local et la Direction des impôts :

- forme juridique et immatriculation ; régime de la zone franche si envisagé ;
- TVA applicable aux commissions et aux abonnements (taux, seuil d'assujettissement) ;
- retenues ou taxes éventuelles sur les services numériques et sur les paiements vers l'étranger (abonnements Apple, Google, Supabase, EAS) ;
- facturation des commissions et des annonces sponsorisées.

## 7. Publicité et contenus sponsorisés

- Identification claire de toute publicité (implémenté : badge « Sponsorisé » + mention explicative).
- Vérifier les règles djiboutiennes sur la publicité (y compris les secteurs réglementés) et sur la prospection par e-mail ou SMS (consentement préalable — champ `marketing_consent` horodaté, désactivé par défaut).
- Aucune publicité ciblée à partir des données de réservation sans base légale et consentement.

## 8. Propriété intellectuelle

- Dépôt de la marque (nom et logo) : vérifier la disponibilité et la procédure auprès de l'office compétent (Office djiboutien de la propriété industrielle et commerciale) et, le cas échéant, au niveau international.
- Photographies : cession de droits écrite (usage commercial).
- Licences des composants : polices Fraunces et Inter sous licence SIL Open Font License ; icônes Feather sous licence MIT ; bibliothèques open source sous licences permissives (MIT, Apache 2.0) — conserver les mentions.

## 9. Boutiques d'applications

- Apple et Google exigent une politique de confidentialité accessible, des formulaires « App Privacy » / « Data safety » exacts, et une procédure de suppression de compte depuis l'application.
- Les comptes développeur doivent idéalement être ouverts au nom de la société (vérification D-U-N-S pour Apple).

## Prochaines étapes suggérées

1. Lire le texte intégral du décret 2023-176 et du Code du numérique (titres données personnelles et commerce électronique).
2. Rendez-vous avec l'ANT pour qualifier l'activité de la plateforme.
3. Rendez-vous avec la Direction des affaires maritimes sur l'intermédiation de places à bord.
4. Échange avec la BCD ou la banque choisie sur le flux des paiements.
5. Faire relire CGU, politique de confidentialité et contrat type prestataire par un avocat local.
