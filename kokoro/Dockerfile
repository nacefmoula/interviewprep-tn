FROM hwdsl2/kokoro-server:latest

# Preinstall the spaCy English model that your logs show is being fetched at startup
RUN /opt/venv/bin/python -m pip install --no-cache-dir \
    https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl

# Increase the startup watchdog from 300s to 1200s
RUN sed -i 's/while \[ "$i" -lt 300 \]; do/while [ "$i" -lt 1200 ]; do/' /opt/src/run.sh
