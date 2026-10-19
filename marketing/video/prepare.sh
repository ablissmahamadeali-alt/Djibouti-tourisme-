#!/usr/bin/env bash
# Prépare la mise en scène dans dist/ (après `npx expo export --platform web --output-dir dist`).
set -euo pipefail
cd "$(dirname "$0")/../.."
mkdir -p dist/promo
cp marketing/video/stage.html dist/promo/index.html
cp assets/brand/mark.svg dist/promo/
cp node_modules/@expo-google-fonts/fraunces/600SemiBold/Fraunces_600SemiBold.ttf \
   node_modules/@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf \
   node_modules/@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf dist/promo/
