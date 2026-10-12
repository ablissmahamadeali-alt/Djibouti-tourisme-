# Mise en place de Supabase

Durée estimée : 1 à 2 heures. Ces étapes nécessitent **votre** compte : elles ne peuvent pas être faites depuis l'environnement de développement.

## 1. Créer deux projets

Créez sur [supabase.com](https://supabase.com) :

- `bahri-recette` (tests, données de démonstration) ;
- `bahri-production` (vraies données, jamais de données de démo).

**Région** : choisir une région proche (par exemple Europe centrale). ⚠️ Héberger les données hors de Djibouti constitue un **transfert international de données personnelles** : vérifier les conditions posées par la loi djiboutienne sur la protection des données (voir [juridique.md](juridique.md)).

Mot de passe de base de données : le générer et le conserver dans un gestionnaire de mots de passe, jamais dans le dépôt.

## 2. Appliquer les migrations

```bash
npx supabase@latest login
npx supabase@latest init            # crée supabase/config.toml (à committer)
npx supabase@latest link --project-ref <identifiant-du-projet>
npx supabase@latest db push         # applique supabase/migrations/*.sql
```

Pour la **recette uniquement**, charger les données fictives : copier le contenu de `supabase/seed.sql` dans l'éditeur SQL du tableau de bord du projet `bahri-recette`.

## 3. Authentification par code e-mail

Dans *Authentication* :

1. *Providers* → **Email** activé ; inscription autorisée.
2. *Email Templates* → modèle **Magic Link** : inclure le code `{{ .Token }}` dans le message (l'application demande un code à 6 chiffres, pas un lien).
3. *SMTP Settings* : configurer un service d'envoi (par exemple Resend, Brevo, Postmark). Le service intégré de Supabase est limité à quelques messages par heure et réservé aux tests.
4. *Rate Limits* : garder des limites basses sur l'envoi de codes.

## 4. Brancher l'application

*Project Settings* → *API* : copier l'URL et la **clé publique** (« publishable » ou « anon »).

```bash
cp .env.example .env     # puis renseigner les deux valeurs
npm start
```

Pour les builds EAS, déclarer les mêmes variables dans EAS :

```bash
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://xxx.supabase.co --environment preview
npx eas-cli@latest env:create --name EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY --value sb_publishable_xxx --environment preview
```

⚠️ La clé **secrète / service_role** ne doit **jamais** apparaître dans l'application, dans `.env` d'Expo, ni dans GitHub. Elle sert uniquement aux fonctions serveur (Edge Functions) via les secrets Supabase.

## 5. Créer le premier administrateur

Aucun compte n'est administrateur par défaut. Après vous être connecté une fois dans l'application avec votre e-mail :

```sql
-- Éditeur SQL du tableau de bord (s'exécute avec les droits du propriétaire)
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'votre-adresse@exemple.com';
```

Les administrateurs suivants seront nommés depuis le tableau de bord (opération journalisée).

## 6. Documents des prestataires (à finaliser)

Créer un bucket Storage **privé** `provider-documents`, avec des politiques autorisant :

- l'envoi par les membres du prestataire dans le dossier `<provider_id>/` ;
- la lecture par ces membres et par les administrateurs ;
- aucune lecture publique.

Ces politiques Storage feront l'objet d'une prochaine migration, testée sur le projet de recette.

## 7. Sauvegardes et restauration

- Offre gratuite : pas de sauvegarde exploitable → **passer en offre Pro avant d'accepter de vraies demandes** (sauvegardes quotidiennes).
- En complément, export hebdomadaire chiffré conservé hors Supabase :
  `npx supabase@latest db dump --linked -f sauvegarde.sql` (+ `--data-only` pour les données).
- Tester une restauration sur le projet de recette au moins une fois par trimestre.

## 8. Tests locaux

`npm run test:db` applique les migrations sur un PostgreSQL embarqué (PGlite) avec une simulation minimale de l'authentification Supabase (`supabase/tests/auth-stub.sql`, jamais appliqué sur un vrai projet) et vérifie les politiques de sécurité et la logique de réservation.
