# Synthèse de la voix off (Piper, voix fr « siwis », CC-BY 4.0), une phrase par fichier.
import json, sys, wave
from piper import PiperVoice, SynthesisConfig

model, texts_file, out_dir = sys.argv[1:4]
voice = PiperVoice.load(model)
# Orthographe « parlée » des noms de marque pour une prononciation correcte.
SPOKEN = {
    "DjiSea": "Dji-Si",
    "CAC Pay": "Kak Pé",
    "D-Money": "Di Moni",
    "Google Play": "Gougueul Plé",
    "App Store": "Ap Store",
}
cfg = SynthesisConfig(length_scale=1.08, noise_scale=0.6, noise_w_scale=0.8)
segments = []
for i, text in enumerate(json.load(open(texts_file, encoding="utf-8"))):
    spoken = text
    for k, v in SPOKEN.items():
        spoken = spoken.replace(k, v)
    path = f"{out_dir}/seg{i:02d}.wav"
    with wave.open(path, "wb") as w:
        voice.synthesize_wav(spoken, w, syn_config=cfg)
    with wave.open(path) as w:
        duration = w.getnframes() / w.getframerate()
    segments.append({"text": text.replace("'", "’"), "file": path, "duration": round(duration, 3)})
json.dump(segments, open(f"{out_dir}/segments.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(sum(s["duration"] for s in segments), "s de narration")
