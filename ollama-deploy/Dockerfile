FROM ollama/ollama:latest

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Start ollama in background, pull the model, then stop it
# This bakes the model into the image layer at build time
RUN /bin/bash -c '\
  ollama serve & \
  SERVER_PID=$!; \
  sleep 5; \
  ollama pull llama3.2:3b; \
  kill $SERVER_PID'

EXPOSE 11434
ENTRYPOINT ["ollama", "serve"]
