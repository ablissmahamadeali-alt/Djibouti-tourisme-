# Assemble images + voix off + sous-titres en MP4.
import json, subprocess, sys
frames_dir, segments_file, out = sys.argv[1:4]
timeline = json.load(open(f"{frames_dir}/timeline.json"))
segments = json.load(open(segments_file, encoding="utf-8"))
cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
       "-f", "concat", "-safe", "0", "-i", f"{frames_dir}/frames.ffconcat"]
for t in timeline:
    cmd += ["-i", segments[t["index"]]["file"]]
cmd += ["-i", f"{frames_dir}/sous-titres.srt"]
parts = []
for n, t in enumerate(timeline, start=1):
    ms = int(t["start"] * 1000)
    parts.append(f"[{n}:a]aresample=48000,adelay={ms}|{ms}[a{n}]")
mix = "".join(f"[a{n}]" for n in range(1, len(timeline) + 1))
parts.append(f"{mix}amix=inputs={len(timeline)}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[aout]")
parts.append("[0:v]fps=30,scale=1080:1920:flags=lanczos,format=yuv420p[vout]")
srt_index = len(timeline) + 1
cmd += ["-filter_complex", ";".join(parts), "-map", "[vout]", "-map", "[aout]", "-map", f"{srt_index}:s",
        "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-profile:v", "high",
        "-c:a", "aac", "-b:a", "160k", "-ac", "2", "-c:s", "mov_text", "-metadata:s:s:0", "language=fre",
        "-shortest", "-movflags", "+faststart", out]
subprocess.run(cmd, check=True)
