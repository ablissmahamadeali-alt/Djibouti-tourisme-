# Paiements et monétisation

**État actuel : paiements désactivés.** Les demandes de réservation sont gratuites et confirmées manuellement par le prestataire ; le paiement se fait directement auprès de lui. C'est volontaire : ni le prestataire de paiement, ni le cadre réglementaire (voir [juridique.md](juridique.md) § 5) ne sont encore établis.

## Solutions repérées (à confirmer par contact commercial)

| Solution | Ce qui a été constaté | Points à vérifier |
| --- | --- | --- |
| **D-Money** (Djibouti Telecom) | Émetteur de monnaie électronique figurant parmi les établissements agréés par la BCD ; le site présente une **passerelle de paiement pour e-commerce et applications mobiles** avec documentation technique, suivi des paiements et remboursements ([d-money.dj](https://d-money.dj/)) | Conditions d'ouverture d'un compte marchand, frais, délais de reversement, API et environnement de test, webhooks signés |
| **Waafi** | Application de paiement mobile avec bureau à Djibouti ([Google Play](https://play.google.com/store/apps/details?id=com.safarifone.waafi&hl=en_US)) | Aucune documentation publique d'API marchande trouvée : à demander |
| **Banques locales** (acquisition carte) | Non vérifié | Offres de paiement par carte en ligne (Visa / Mastercard) pour les touristes étrangers ; conformité 3-D Secure |
| **Prestataires internationaux** (Stripe, etc.) | Non vérifié | Ne pas supposer qu'ils acceptent une société djiboutienne ; vérifier la liste officielle des pays pris en charge |

## Architecture prévue (extensible, sans données sensibles)

```
Application ──(1) créer un paiement──▶ Edge Function « create-payment » (clé secrète côté serveur)
     │                                          │ (2) appel API du prestataire de paiement
     │◀──(3) URL / référence de paiement────────┘
     │ (4) le client paie dans l'interface du prestataire (D-Money, carte…)
Prestataire de paiement ──(5) webhook signé──▶ Edge Function « payment-webhook »
                                                 │ vérifie la signature + le montant + l'idempotence
                                                 └─▶ payments.status = 'succeeded' (seule source de vérité)
```

Principes :

- **Aucun numéro de carte ni secret de paiement** dans la base ou l'application ; uniquement la référence du prestataire (`payments.gateway_reference`).
- Un paiement n'est « réussi » que sur **webhook signé vérifié**, jamais sur le retour de l'application.
- Idempotence : contrainte `unique (gateway, gateway_reference)`.
- Interface `PaymentGateway` par prestataire (D-Money, Waafi, carte…) pour en ajouter sans toucher au reste.
- Remboursements tracés dans `refunds`, journalisés dans `audit_log`.

## Modèles de revenus prévus

| Modèle | Support dans le modèle de données | Remarque |
| --- | --- | --- |
| Commission sur réservation **réalisée** | `providers.commission_bps`, `payments.commission_djf` | Facturable au prestataire même sans paiement en ligne (relevé mensuel des réservations « terminées ») |
| Offres de visibilité / annonces sponsorisées | `sponsored_campaigns` (dates, emplacement, budget, modération) | Toujours signalées « Sponsorisé » |
| Abonnement professionnel | À ajouter (`provider_subscriptions`) quand l'offre sera définie | Ex. : statistiques, mise en avant, plus de photos |
| Emplacements publicitaires | Même table que les campagnes, emplacement dédié | Pas de régie publicitaire tierce ni de pistage sans consentement |

**Recommandation de lancement** : commencer par la commission facturée aux prestataires et quelques campagnes sponsorisées vendues directement, sans encaissement pour compte de tiers. Ajouter le paiement en ligne une fois le contrat marchand signé et le cadre réglementaire confirmé.
