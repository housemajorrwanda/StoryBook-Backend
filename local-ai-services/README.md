# Local AI Services

Simple servers to run embedding and transcription models locally on your M1 Pro MacBook.

## Quick Start

### 1. Install Ollama

```bash
# Download from https://ollama.ai/download
# Or:
brew install ollama
```

### 2. Install Dependencies

```bash
# Node.js dependencies (for embedding server)
npm install

# Python dependencies (for transcription server) - using virtual environment
python3 -m venv venv
source venv/bin/activate
pip install flask faster-whisper requests
```

### 3. Start All Services

```bash
./start-all.sh
```

This will:
- Start Ollama server
- Pull the embedding model (first time only)
- Start embedding server on port 8081
- Start transcription server on port 8084

## Manual Start

### Start Ollama

```bash
ollama serve

# In another terminal:
ollama pull nomic-embed-text
```

### Start Embedding Server

```bash
node embedding-server.js
```

### Start Transcription Server

```bash
source venv/bin/activate
python3 transcription-server.py
```

## Testing

### Test Embedding Server

```bash
curl http://localhost:8081/health
curl -X POST http://localhost:8081/embeddings \
  -H "Content-Type: application/json" \
  -d '{"input": "Test testimony", "model": "nomic-embed-text"}'
```

### Test Transcription Server

```bash
curl http://localhost:8084/health
curl -X POST http://localhost:8084/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audioUrl": "https://example.com/audio.mp3"}'
```

## Environment Variables

### Embedding Server

- `OLLAMA_URL` - Ollama server URL (default: `http://localhost:11434`)
- `PORT` - Server port (default: `8081`)

### Transcription Server

- `WHISPER_MODEL` - Whisper model name (default: `large-v3`)
- `WHISPER_COMPUTE_TYPE` - Compute type: `int8` (CPU) or `float16` (GPU) (default: `int8`)
- `PORT` - Server port (default: `8084`)

## Troubleshooting

### Ollama Not Starting

```bash
# Check if port 11434 is in use
lsof -i :11434

# Kill existing Ollama process
pkill ollama

# Start again
ollama serve
```

### Embedding Server Fails

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Check embedding server logs
tail -f /tmp/embedding-server.log
```

### Transcription Server Fails

```bash
# Check Python version (need 3.8+)
python3 --version

# Reinstall faster-whisper
pip3 install --upgrade faster-whisper

# Check logs
tail -f /tmp/transcription-server.log
```

## Files

- `embedding-server.js` - Node.js server wrapping Ollama API
- `transcription-server.py` - Python server using faster-whisper
- `package.json` - Node.js dependencies
- `start-all.sh` - Script to start all services
- `README.md` - This file

## Next Steps

1. Make sure all services are running
2. Update your NestJS app `.env`:
   ```
   AI_EMBEDDING_URL=http://localhost:8081/embeddings
   AI_TRANSCRIBE_URL=http://localhost:8084/transcribe
   ```
3. Test with a testimony!

