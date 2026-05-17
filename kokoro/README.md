# Kokoro TTS (patched)

Custom build of [hwdsl2/kokoro-server](https://github.com/hwdsl2/docker-kokoro)
with two fixes for the interview-service integration:

1. Pre-installs spaCy `en_core_web_sm` model so the container doesn't try
   to download it at first request (which fails behind some networks).
2. Bumps the startup watchdog from 300s to 1200s — the model load can
   exceed 5 minutes on machines without a GPU.

Built automatically by docker-compose. No manual steps required.

OpenAI-compatible TTS endpoint: `POST /v1/audio/speech`
Available voices: `af_heart`, `af_bella`, `af_nova`
