# Système de design « DjiSea »

Source : `src/design/tokens.ts` et `src/components/ui/`.

## Intention

Le golfe de Tadjourah : bleu marin profond du large, turquoise des hauts-fonds, blanc cassé de la lumière, sable des plages et des lacs salés. Ton **calme, fiable et premium**, sans effets gratuits.

Règles :

- aplats de couleur, pas de dégradés ;
- une seule couleur d'accent (turquoise) par écran pour les actions ;
- icônes d'un seul jeu (Feather), jamais d'emojis ;
- contraste du texte ≥ 4,5:1 (WCAG AA) ;
- cibles tactiles ≥ 48 px ; texte agrandissable (plafonné à ×1,6 pour préserver la mise en page).

## Couleurs

| Jeton | Valeur | Usage |
| --- | --- | --- |
| `brand` / `navy900` | `#0B2540` | En-tête de marque, sélection, texte fort sur fond clair |
| `accent` / `teal600` | `#0B7A7A` | Boutons principaux, liens, onglet actif |
| `teal500` | `#169A97` | Mer dans les visuels et l'icône |
| `sand300` | `#E4D3B4` | Rivage, soleil de l'icône, filet décoratif |
| `background` / `shell` | `#FAF8F4` | Fond des écrans (blanc cassé) |
| `surface` | `#FFFFFF` | Cartes, champs |
| `text` / `ink900` | `#0F1B2A` | Texte principal |
| `textMuted` / `ink600` | `#4B5A6A` | Texte secondaire |
| `success`, `warning`, `danger` | vert, ambre, rouge foncés | États (confirmée, non vérifié, erreur) |
| `demo` | `#6E5320` sur `#F3EADA` | Bandeau et badge « Démo — fictif » |

## Typographie

| Variante | Police | Taille / interligne |
| --- | --- | --- |
| `display` | Fraunces SemiBold | 32 / 38 |
| `title` | Fraunces SemiBold | 24 / 30 |
| `heading` | Inter SemiBold | 18 / 24 |
| `body`, `bodyStrong` | Inter Regular / SemiBold | 16 / 24 |
| `small`, `smallStrong` | Inter Regular / Medium | 14 / 20 |
| `label` | Inter SemiBold, capitales espacées | 12 / 16 |
| `caption` | Inter Regular | 12 / 16 |

## Espacements et formes

Échelle de 4 : 2, 4, 8, 12, 16, 24, 32, 48. Rayons : 8 (badges), 12 (boutons, champs), 18 (cartes). Une seule ombre discrète, réservée aux éléments flottants.

## Composants

| Composant | Rôle |
| --- | --- |
| `AppText` | Texte typé ; les titres sont annoncés comme tels aux lecteurs d'écran |
| `Button` | Principal, secondaire, discret, danger ; état chargement / désactivé |
| `TextField` | Libellé, aide, erreur (bordure + message), focus visible |
| `Card` | Surface ; toute la carte est cliquable |
| `Badge`, `ReliabilityBadge`, `StatusBadge`, `SponsoredBadge` | Fiabilité de la donnée, statut de réservation, contenu sponsorisé |
| `Notice` | Information, avertissement, démo, succès, erreur |
| `LoadingState`, `ErrorState`, `EmptyState` | États de chargement (squelettes), d'erreur (avec Réessayer) et vides |
| `Stepper`, `ChoiceChips`, `DateStrip`, `Checkbox` | Contrôles tactiles accessibles |
| `Visual` | Photo si disponible, sinon composition « horizon » (ciel / mer / rivage) en aplats |

## Photographies

Aucune photo n'est intégrée : nous n'utilisons pas d'images dont les droits ne sont pas établis. Le champ `image_url` est prévu ; recommandations :

- commander un reportage à un photographe local avec **cession de droits écrite** (usage commercial, durée, territoires) ;
- ou obtenir l'autorisation écrite des prestataires pour leurs propres photos ;
- formats : 1600 px de large maximum, WebP/JPEG ~80 %, servis par un CDN.

## Icône et écran de démarrage

`assets/brand/mark.svg` : un soleil sable posé sur l'horizon, trois vagues turquoise, fond marine. Fichiers PNG générés dans `assets/images/` (icône 1024 px, icône adaptative Android avec version monochrome, écran de démarrage, favicon).
