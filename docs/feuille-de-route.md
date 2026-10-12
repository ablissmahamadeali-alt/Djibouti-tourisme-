# Feuille de route

| Phase | Contenu | État |
| --- | --- | --- |
| 1. Audit et architecture | Dépôt vide, Node 22, npm OK ; réseau restreint (docs Expo et api.expo.dev inaccessibles → mode `EXPO_OFFLINE`) ; choix Expo + Supabase | ✅ |
| 2. Identité et design | Jetons, typographie, composants accessibles, icône, écran de démarrage | ✅ (photos à produire) |
| 3. Projet Expo et navigation | SDK 57, Expo Router, 5 onglets, écrans de détail, modales | ✅ |
| 4. Écrans et démo | Accueil, traversées, découverte, séjours, compte, réservation, suivi | ✅ |
| 5. Backend et authentification | Migrations, RLS, fonctions de réservation, connexion par code e-mail, session chiffrée | ✅ code + tests locaux · ⏳ projet Supabase à créer (vous) |
| 6. Réservations et administration | Machine à états serveur, capacité, audit ✅ · tableau de bord web | 🟡 |
| 7. Prestataires, publicité, paiements | Candidature prestataire (RPC) et modèle de données ✅ · écrans prestataire, Storage documents, paiement | 🟡 / ⏸️ |
| 8. Tests et sécurité | 41 tests Jest, 30 tests SQL, lint, typecheck, parcours navigateur | ✅ (à compléter sur appareil) |
| 9. Builds | Bundles et prebuild vérifiés ; `eas.json` prêt | ⏳ build EAS à lancer (vous) |
| 10. Lancement | Docs juridique, budget, publication ; projet de politique de confidentialité | 🟡 |

## Prochaines tâches, par priorité

1. **Suppression de compte et export des données** depuis l'application (exigé par Apple ; droit des personnes).
2. **Espace prestataire** dans l'application : demandes reçues, prise en charge, confirmation / refus avec note.
3. **Tableau de bord d'administration** web (`admin/`) : modération des prestataires et documents, catalogue, demandes, campagnes, indicateurs.
4. Politiques **Storage** pour les documents des prestataires + écran d'envoi.
5. **Expiration** automatique des demandes non traitées (libère les places) via tâche planifiée (`pg_cron`).
6. **Notifications push** (Expo Notifications) branchées sur la table `notifications`.
7. Persistance du catalogue sur l'appareil (lecture hors ligne).
8. Types TypeScript générés depuis la base (`supabase gen types`).
9. Intégration paiement (après contrat marchand et validation réglementaire).
10. Langues supplémentaires (arabe avec mise en page RTL, somali, afar).
