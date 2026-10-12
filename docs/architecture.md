# Architecture et choix techniques

## Vue d'ensemble

```
┌──────────────────────────────┐        ┌───────────────────────────────────────┐
│ Application mobile (Expo)    │        │ Supabase (PostgreSQL managé)          │
│  écrans  →  interfaces data ─┼─HTTPS─▶│  API REST/RPC générée                 │
│             ├ mode démo      │        │  Auth (code par e-mail)               │
│             └ adaptateur     │        │  RLS : droits client/prestataire/admin│
│               Supabase       │        │  Fonctions : request_booking, …       │
└──────────────────────────────┘        │  Journal d'audit                      │
┌──────────────────────────────┐        │  Storage privé (documents prestataires)│
│ Tableau de bord admin (web)  │──HTTPS─▶│  Edge Functions (paiements, à venir) │
│  à construire                │        └───────────────────────────────────────┘
└──────────────────────────────┘
```

## Choix retenus et raisons

| Sujet | Choix | Pourquoi | Alternatives écartées |
| --- | --- | --- | --- |
| Mobile | **Expo SDK 57**, React Native 0.86, React 19.2 | Une base de code pour Android et iOS ; compilation dans le cloud (EAS) sans Mac ; mises à jour fréquentes et documentées | Flutter (équipe JS plus facile à recruter localement), natif ×2 (coût double) |
| Langage | **TypeScript strict** | Erreurs détectées avant exécution | JavaScript |
| Navigation | **Expo Router** (fichiers = routes), onglets `expo-router/js-tabs` | Standard Expo, liens profonds automatiques. Les onglets natifs (`unstable-native-tabs`) sont encore « instables » : écartés pour la production | React Navigation manuel |
| Backend | **Supabase** (PostgreSQL + Auth + Storage + Edge Functions) | PostgreSQL : contraintes, transactions et verrous → indispensable pour éviter la surréservation ; sécurité par lignes (RLS) ; offre gratuite puis ~25 USD/mois ; données exportables (pas d'enfermement) | Firebase (NoSQL : transactions de capacité et reporting plus difficiles), serveur sur mesure (coût de maintenance élevé) |
| Validation | **zod** côté app ; contraintes + fonctions SQL côté serveur | Le serveur revalide tout | — |
| Session | `expo-secure-store` (Keychain / Keystore) | Jeton chiffré par le système | AsyncStorage (non chiffré) |
| Icônes | Feather via `@expo/vector-icons` | Un seul style, trait fin, cohérent | Emojis, jeux mélangés |
| Polices | Fraunces (titres), Inter (texte) | Caractère éditorial « voyage » + lisibilité | Police système seule |
| Tests | Jest + Testing Library ; PGlite pour le SQL | Tests SQL réels sans serveur ni Docker | — |

### Remarque sur l'environnement de développement

La documentation web d'Expo n'était pas accessible depuis l'environnement cloud. Les API utilisées ont été vérifiées directement dans les définitions TypeScript des paquets installés (source de vérité de la version utilisée). Exemple concret : en SDK 57, `Tabs` importé depuis `expo-router` est **déprécié** au profit de `expo-router/js-tabs`.

## Mode démonstration / mode production

`src/data/backend.ts` choisit l'implémentation au démarrage :

- variables `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` présentes → **Supabase** ;
- sinon → **démo** : données fictives embarquées, demandes enregistrées uniquement sur l'appareil et marquées `isDemo`.

Les écrans ne connaissent que les interfaces de `src/data/repository.ts` ; ajouter un autre backend ne touche pas aux écrans.

## Modèle de données (Supabase)

| Table | Rôle |
| --- | --- |
| `profiles` | Profil lié au compte (nom, téléphone, langue, consentement marketing horodaté) |
| `user_roles` | Rôles plateforme (`admin`, `support`). Absence de ligne = client ordinaire |
| `providers` | Prestataires : statut `pending` → `verified` → `suspended`, commission |
| `provider_members` | Comptes rattachés à un prestataire (`owner`, `staff`) |
| `provider_documents` | Documents de vérification (fichier en Storage privé, statut de revue) |
| `destinations` | Lieux (port ou non), publiés par la plateforme |
| `routes` / `departures` | Trajets (origine, destination, tarif, conditions) et départs datés avec capacité |
| `experiences` / `stays` | Excursions, circuits, activités, guides / hébergements |
| `bookings` | Demandes : référence unique `BH-XXXXXXXX`, statut, horodatages, montant indicatif |
| `booking_passengers` | Manifeste nominatif |
| `booking_events` | Historique des statuts (chronologie affichée + audit) |
| `payments` / `refunds` | Prêtes pour un futur prestataire de paiement ; **aucune donnée de carte** |
| `sponsored_campaigns` | Visibilité payante, modérée, avec dates de diffusion |
| `notifications` | Notifications internes (prestataire : nouvelle demande ; client : changement de statut) |
| `audit_log` | Journal des opérations sensibles (rôles, prestataires, tarifs, paiements…) |

Chaque élément du catalogue porte `reliability` (`demo` / `unverified` / `verified`).

## Réservations : statuts et transitions

```
brouillon ─▶ demande envoyée ─▶ en attente de confirmation ─▶ confirmée ─▶ terminée
                 │   │                 │   │                     │
                 │   └──▶ refusée ◀────┘   │                     │
                 └──────▶ annulée ◀────────┴─────────────────────┘
```

| De → vers | Client | Prestataire | Admin |
| --- | :-: | :-: | :-: |
| brouillon → envoyée / annulée | ✅ | | |
| envoyée → en attente / confirmée / refusée | | ✅ | ✅ |
| envoyée ou en attente → annulée | ✅ | | ✅ |
| en attente → confirmée / refusée | | ✅ | ✅ |
| confirmée → terminée (date passée uniquement) | | ✅ | ✅ |
| confirmée → annulée | ✅ | ✅ | ✅ |

La même table existe en TypeScript (`src/domain/booking-status.ts`) et en SQL (`booking_transition_allowed`). Un test automatique échoue si elles divergent.

**Surréservation.** `request_booking` verrouille la ligne du départ (`SELECT … FOR UPDATE`), additionne les places des demandes actives (envoyée, en attente, confirmée) et refuse au-delà de la capacité. Une demande envoyée bloque donc des places pendant la confirmation manuelle. Une expiration automatique des demandes non traitées (par exemple 24 h) est prévue dans la feuille de route.

## Sécurité

- **RLS** activée sur toutes les tables ; privilèges retirés puis accordés un par un.
- Les clients ne peuvent **ni insérer ni modifier** une réservation directement : uniquement via `request_booking` et `transition_booking`.
- Un prestataire ne voit que les réservations qui le concernent ; un client uniquement les siennes ; un tiers n'apprend même pas qu'une réservation existe (`NOT_FOUND`).
- Un prestataire ne peut ni se déclarer « vérifié », ni publier sans modération, ni modifier sa commission ; modifier une offre vérifiée la repasse « non vérifiée » (déclencheur `guard_moderated_fields`).
- **Aucun rôle administrateur n'est attribué automatiquement.** Le premier administrateur se crée à la main (voir [supabase.md](supabase.md)).
- Limitation des abus : 10 demandes par heure et par compte ; 3 candidatures prestataire par compte.
- Journal d'audit pour les rôles, prestataires, documents, trajets, départs, paiements, campagnes et transitions de réservation.

Tout cela est vérifié par `npm run test:db` (30 tests). Limite : PGlite n'ayant qu'une connexion, la concurrence réelle (deux demandes simultanées) n'est pas simulée ; le verrou `FOR UPDATE` est le mécanisme standard de PostgreSQL pour ce cas, à vérifier sur la base de recette avec un test de charge.

## Tableau de bord d'administration (à construire)

Recommandation : application web séparée (`admin/`), par exemple Next.js ou Vite + React, hébergée à bas coût, utilisant :

- la même base et les mêmes politiques RLS (un administrateur est un utilisateur avec la ligne `user_roles.role = 'admin'`) ;
- des fonctions RPC dédiées pour les actions sensibles (valider un prestataire, revoir un document), journalisées ;
- des sessions par cookies `httpOnly` ;
- la double authentification pour les comptes administrateurs.

Écrans prévus : demandes à traiter, prestataires et documents, catalogue (destinations, trajets, départs, tarifs, excursions, hébergements), campagnes sponsorisées, utilisateurs et rôles, indicateurs.

## Connexions instables

- Squelettes de chargement, messages d'erreur explicites avec bouton « Réessayer », tirer pour rafraîchir.
- Cache mémoire des données **publiques** (affiché immédiatement puis rafraîchi) ; jamais pour les données personnelles.
- Une demande qui échoue affiche « Rien n'a été réservé » : aucune confirmation simulée (test automatisé).
- Pistes futures : persistance du catalogue sur l'appareil, images compressées servies par CDN.

## Internationalisation

Dictionnaires typés `src/i18n/fr.ts` et `en.ts`. Ajouter l'arabe, le somali ou l'afar : créer le fichier de traduction ; l'arabe demandera en plus la mise en page de droite à gauche.
