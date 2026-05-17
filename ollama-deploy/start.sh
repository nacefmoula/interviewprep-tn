#!/bin/bash
ollama serve &
SERVER_PID=$!

echo "Waiting for Ollama to start..."
until curl -s http://127.0.0.1:11434/api/version > /dev/null 2>&1; do
  sleep 2
done

echo "Pulling llama3.2:3b..."
ollama pull llama3.2:3b

echo "Model ready. Ollama is running."
wait $SERVER_PID
