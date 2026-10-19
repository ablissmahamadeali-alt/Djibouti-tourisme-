# Vidéo tutoriel DjiSea

`djisea-tutoriel.mp4` : vidéo verticale 1080×1920, 70 s, sans son, pour WhatsApp, Instagram, TikTok, Facebook.

Contenu : ouverture → 6 étapes (choisir le trajet, comparer les départs, vérifier les détails, envoyer la demande, recevoir la référence, suivre la demande) → découverte de Djibouti → hébergements → carte de fin.

⚠️ Elle est filmée en **mode démonstration** : prestataires, horaires et tarifs sont **fictifs**, et la vidéo l'indique (« Démonstration — offres fictives »). Pour la communication publique de lancement, la refaire avec les vraies offres une fois les prestataires vérifiés.

## Refaire la vidéo

```bash
EXPO_OFFLINE=1 npx expo export --platform web --output-dir dist
./marketing/video/prepare.sh
EXPO_OFFLINE=1 npx expo serve --port 8099 &          # sert dist/
npm i --no-save playwright-core
mkdir -p /tmp/frames
CHROMIUM_PATH=/chemin/vers/chrome node marketing/video/record.mjs /tmp/frames
ffmpeg -f concat -safe 0 -i /tmp/frames/frames.ffconcat \
  -vf "fps=30,scale=1080:1920:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 20 -movflags +faststart -an marketing/video/djisea-tutoriel.mp4
```

Les titres d'étapes se modifient dans `record.mjs`, la mise en page dans `stage.html`.
