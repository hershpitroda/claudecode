#!/bin/sh
# One command: Fitted (Exploded Teardown). voice -> speech check -> cues -> events -> picture -> mix -> master -> .srt -> checks -> poster
#   sh build.sh
# Without a GPU, set LEMO_ANGLE=swiftshader (software WebGL, slow: about 10 s a frame).
set -e
LIB=${LIB:-/root/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the Lemo-Opuscar library folder"; exit 1; }
PY="$LIB/.venv/bin/python"
NAME=fitted
cd "$LIB"
[ -f core/assets/polyhaven/photo_studio_loft_hall_2k.hdr ] || sh tools/fetch.sh hdri
[ -f core/tts/kokoro-v1.0.onnx ] || sh tools/fetch.sh voice
"$PY" core/audio/sampler.py --need "$HERE/mix.py"

# voice: Kokoro bf_emma, checked by speech-to-text; then subtitle cues from the real durations
node "$HERE/tools/export.mjs" "$HERE"
"$PY" core/tts/tts.py "$HERE/voice/lines.json" "$HERE/voice/out"
WHISPER_MODEL=small.en "$PY" core/tts/asr_check.py "$HERE/voice/lines.json" "$HERE/voice/out" --lang en
node "$HERE/tools/export.mjs" "$HERE"

# picture, events, mix, master, subtitles
node core/render/events.mjs "$HERE"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
LIB="$LIB" "$PY" "$HERE/mix.py"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/$NAME.mp4" 24 1
"$PY" core/render/srt.py "$HERE/out/cues_srt.json" "$HERE/subtitles_en.srt"   # burned in, so not named like the video

# checks and poster (the stacked layers with their labels, without the subtitle strip)
node core/render/readcheck.mjs "$HERE" > "$HERE/out/readcheck.txt" && echo "readcheck ok" || { tail -20 "$HERE/out/readcheck.txt"; exit 1; }
node core/render/still.mjs "$HERE" 10.5 --q nosub=1 --prefix poster_ --out "$HERE/out"
ffmpeg -v error -y -i "$HERE/out/poster_10.5.jpg" -q:v 2 "$HERE/poster.jpg"
echo "done: $HERE/$NAME.mp4"
