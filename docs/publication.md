# Compilation et publication Android / iOS

Ces étapes demandent **vos** comptes (Expo, Apple, Google) : elles ne peuvent pas être réalisées depuis l'environnement de développement cloud, qui ne dispose ni du SDK Android, ni de macOS/Xcode, ni de vos identifiants.

## Identifiants de l'application

| Plateforme | Identifiant | Remarque |
| --- | --- | --- |
| Android | `dj.djisea.app` | **Définitif après la première publication sur Google Play** |
| iOS | `dj.djisea.app` | Définitif après création dans App Store Connect |

⚠️ À confirmer **avant** le premier build de production. Il est d'usage d'utiliser un nom de domaine que l'on possède (inversé) : si vous achetez un autre domaine que `djisea.dj`, changez ces identifiants dans `app.json` maintenant.

## Ce qui a déjà été vérifié dans l'environnement cloud

- Compilation des bundles JavaScript Android et iOS (bytecode Hermes) avec `expo export` ✅
- Génération des projets natifs (`expo prebuild`) : identifiants, nom, version, permissions Android ✅
- Permissions Android réduites à `INTERNET` et `VIBRATE` (stockage, micro, fenêtre système bloqués) ✅
- Version web compilée et parcourue automatiquement dans Chromium (recherche → réservation → suivi → annulation) ✅

**Non vérifié ici** : compilation native complète (Gradle / Xcode), comportement sur un vrai téléphone, stockage sécurisé (Keychain / Keystore), clavier et zones sûres (encoche), performances sur appareil d'entrée de gamme.

## 1. Tester sur votre téléphone (sans compte payant)

```bash
npm install
npm start
```

Scannez le QR code avec **Expo Go** (Android : application Expo Go ; iOS : appareil photo). Les bibliothèques natives utilisées (stockage sécurisé, localisation de la langue, stockage local, images, polices, icônes) font partie des modules Expo habituellement fournis par Expo Go : ce premier test ne devrait pas nécessiter de build (non vérifié sur appareil depuis le cloud). Si Expo Go signale un module manquant, passer à l'étape 2.

## 2. APK Android installable (test interne)

```bash
npx eas-cli@latest login
npx eas-cli@latest init                       # lie le projet à votre compte Expo
npx eas-cli@latest build --platform android --profile preview
```

Le profil `preview` (voir `eas.json`) produit un **APK** : EAS fournit un lien / QR code pour l'installer sur des téléphones Android (autoriser l'installation depuis cette source).

## 3. Android App Bundle pour Google Play

```bash
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android   # nécessite une clé de compte de service Google Play
```

Côté Google Play Console : fiche de l'application, captures d'écran, **politique de confidentialité** (URL publique), questionnaire **Sécurité des données**, classification du contenu, public cible. Les nouveaux comptes développeur personnels doivent passer par une phase de **test fermé** avec un nombre minimal de testeurs pendant une durée minimale avant la production : vérifier les conditions actuelles.

## 4. iOS (sans Mac, via EAS)

Prérequis : compte **Apple Developer Program** actif.

```bash
npx eas-cli@latest build --platform ios --profile production   # EAS gère certificats et profils
npx eas-cli@latest submit --platform ios                        # envoi vers App Store Connect / TestFlight
```

Testez d'abord via **TestFlight**. Côté App Store Connect : fiche, captures (iPhone 6,7"/6,9"), questionnaire **App Privacy**, URL de politique de confidentialité, informations de connexion de test pour l'équipe de revue (un compte de démonstration).

Points de revue Apple à anticiper :

- **suppression de compte** depuis l'application (obligatoire dès qu'on peut créer un compte) — à implémenter ;
- l'application ne doit pas apparaître « vide » : prévoir du contenu réel ou un mode démo explicite ;
- le terme « sponsorisé » et la nature d'intermédiaire doivent être clairs.

## 5. Variables d'environnement des builds

Déclarer `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dans EAS (voir [supabase.md](supabase.md) § 4). Sans elles, le build fonctionne en **mode démonstration**.

## 6. Fiches des boutiques (brouillon)

- **Nom** : DjiSea — Traversées & Djibouti
- **Sous-titre** : Golfe de Tadjourah, excursions, hébergements
- **Description courte** : Trouvez une traversée, découvrez Djibouti et contactez des prestataires locaux vérifiés.
- **Mention obligatoire dans la description** : « DjiSea est une plateforme indépendante de mise en relation. Les traversées et prestations sont assurées par leurs exploitants. »
- **Catégorie** : Voyages

## 7. Recette avant lancement

- [ ] `npm run check` vert
- [ ] Test sur Android d'entrée de gamme (≤ 3 Go de RAM) et sur iPhone
- [ ] Mode avion : messages d'erreur clairs, aucune confirmation fictive
- [ ] Connexion / déconnexion, session conservée après redémarrage
- [ ] Demande de réservation : client → prestataire → confirmation → notification
- [ ] Deux demandes simultanées sur la dernière place (base de recette)
- [ ] Texte agrandi (accessibilité) et lecteur d'écran (TalkBack / VoiceOver)
- [ ] Données de démonstration absentes de la base de production
- [ ] Politique de confidentialité et CGU en ligne, validées juridiquement
- [ ] Premier administrateur créé, sauvegarde et restauration testées
