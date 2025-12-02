#!/bin/bash

# Script to download Ollama model via HTTP API
# Usage: ./download-ollama-model.sh YOUR_OLLAMA_URL

if [ -z "$1" ]; then
  echo "❌ Error: Please provide your Ollama URL"
  echo ""
  echo "Usage:"
  echo "  ./download-ollama-model.sh http://ollama-production-xxxx.up.railway.app:11434"
  echo ""
  echo "Or:"
  echo "  OLLAMA_URL=http://ollama-production-xxxx.up.railway.app:11434 ./download-ollama-model.sh"
  exit 1
fi

OLLAMA_URL=$1

# Remove trailing slash if present
OLLAMA_URL=${OLLAMA_URL%/}

echo "🚀 Downloading nomic-embed-text model..."
echo "📍 Ollama URL: $OLLAMA_URL"
echo ""

# Download the model
echo "📥 Starting download (this may take 1-3 minutes)..."
curl -X POST "$OLLAMA_URL/api/pull" \
  -H "Content-Type: application/json" \
  -d '{"name":"nomic-embed-text"}' \
  --progress-bar

echo ""
echo ""

# Check if download was successful
echo "✅ Verifying model installation..."
MODELS=$(curl -s "$OLLAMA_URL/api/tags")

if echo "$MODELS" | grep -q "nomic-embed-text"; then
  echo "✅ SUCCESS! Model 'nomic-embed-text' is installed!"
  echo ""
  echo "📋 Installed models:"
  echo "$MODELS" | grep -o '"name":"[^"]*"' | sed 's/"name":"\(.*\)"/  - \1/'
else
  echo "⚠️  Model might still be downloading, or check failed."
  echo "Try running the verification again in a few seconds."
fi

echo ""
echo "🎉 Done!"

