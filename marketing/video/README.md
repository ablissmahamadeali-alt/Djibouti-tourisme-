# Vidéo tutoriel DjiSea

| Fichier | Contenu |
| --- | --- |
| `djisea-tutoriel.mp4` | Vidéo verticale 1080×1920, ~68 s, **voix off française + sous-titres incrustés** (+ piste de sous-titres activable) — WhatsApp, Instagram, TikTok, Facebook |
| `djisea-tutoriel.srt` | Sous-titres séparés (YouTube, Facebook) |
| `narration.json` | Texte de la voix off, une phrase par étape |

Déroulé : ouverture → choisir le trajet → comparer les départs → vérifier les détails → indiquer les passagers → **choisir le paiement (CAC Pay, Waafi, D-Money, espèces à l'agence)** → recevoir la référence → suivre la demande → découvrir Djibouti et les hébergements → fin.

⚠️ Filmée en **mode démonstration** : prestataires, horaires et tarifs sont **fictifs**, ce que la vidéo dit et affiche. Pour la communication publique, la refaire avec les vraies offres.

## Version « mobilisation » (`mobilisation/`)

Destinée à Facebook : montrer au public et à l'agence maritime que l'application est prête, et inviter au partage.
Ouverture « Vous l'avez demandée. La voici », paiement mobile présenté « dès la signature des accords », fin « Il ne manque que le feu vert — partagez ».
Fichiers : `djisea-mobilisation.mp4`, `.srt`, `narration.json`, `cartes.json` (textes des cartes) et `publication-facebook.md` (texte du post).
Tournage : `node record.mjs <images> <segments.json> mobilisation/cartes.json`.

## Voix off

Voix de synthèse **Piper, modèle « fr_FR-siwis-medium »**, licence **CC-BY 4.0** (corpus SIWIS, Université d'Édimbourg) : usage commercial autorisé, **mention obligatoire**, par exemple dans la description de la publication : « Voix de synthèse : Piper, voix SIWIS (CC-BY 4.0) ».

Pour une campagne de lancement, une voix humaine (comédien local) ou une voix ElevenLabs avec abonnement payant donnera un rendu plus naturel : il suffit de remplacer les fichiers audio, le montage reste identique.

## Refaire la vidéo

```bash
# 1. Application web + mise en scène
EXPO_OFFLINE=1 npx expo export --platform web --output-dir dist
./marketing/video/prepare.sh
EXPO_OFFLINE=1 npx expo serve --port 8099 &

# 2. Voix off (Python : pip install piper-tts ; modèle fr_FR-siwis-medium téléchargé à part)
python voix.py fr_FR-siwis-medium.onnx marketing/video/narration.json /tmp/voix

# 3. Tournage synchronisé sur la durée de chaque phrase (npm i --no-save playwright-core)
CHROMIUM_PATH=/chemin/vers/chrome node marketing/video/record.mjs /tmp/images /tmp/voix/segments.json

# 4. Montage (ffmpeg)
python marketing/video/montage.py /tmp/images /tmp/voix/segments.json marketing/video/djisea-tutoriel.mp4
```

Textes de la voix : `narration.json`. Titres d'étapes et gestes : `record.mjs`. Mise en page : `stage.html`.
