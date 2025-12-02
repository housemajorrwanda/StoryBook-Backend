# Local AI Setup Guide - M1 Pro MacBook

Complete guide to run embedding and transcription models locally for testing the AI connection system.

## Quick Start (5 minutes)

### Option 1: Ollama (Easiest - Recommended for M1 Mac)

Ollama runs perfectly on Apple Silicon and requires minimal setup.

#### 1. Install Ollama

```bash
# Download from https://ollama.ai/download
# Or use Homebrew:
brew install ollama
```

#### 2. Start Ollama Service

```bash
# Start Ollama server (runs in background)
ollama serve

# In another terminal, pull embedding model
ollama pull nomic-embed-text
```

#### 3. Create Embedding API Wrapper

Create a simple Node.js server that wraps Ollama's API:

```bash
mkdir -p local-ai-services
cd local-ai-services
npm init -y
npm install express axios cors
```

Create `embedding-server.js`:

```javascript
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const OLLAMA_URL = 'http://localhost:11434';

app.post('/embeddings', async (req, res) => {
  try {
    const { input, model = 'nomic-embed-text' } = req.body;
    const texts = Array.isArray(input) ? input : [input];
    
    console.log(`Generating embeddings for ${texts.length} text(s)...`);
    
    const embeddings = await Promise.all(
      texts.map(async (text) => {
        const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
          model: model,
          prompt: text,
        });
        return { embedding: response.data.embedding };
      })
    );
    
    res.json({ data: embeddings });
  } catch (error) {
    console.error('Embedding error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'embedding-server' });
});

const PORT = 8081;
app.listen(PORT, () => {
  console.log(`✅ Embedding server running on http://localhost:${PORT}`);
  console.log(`   Test: curl http://localhost:${PORT}/health`);
});
```

#### 4. Create Transcription Server

Install faster-whisper (works great on M1):

```bash
pip3 install faster-whisper flask requests
```

Create `transcription-server.py`:

```python
from flask import Flask, request, jsonify
from faster_whisper import WhisperModel
import requests
import os
import tempfile

app = Flask(__name__)

# Load model (downloads automatically on first run)
print("Loading Whisper model...")
model = WhisperModel("large-v3", device="cpu", compute_type="int8")
print("✅ Model loaded!")

@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        data = request.json
        audio_url = data.get('audioUrl')
        model_name = data.get('model', 'faster-whisper-large-v3')
        
        if not audio_url:
            return jsonify({"error": "audioUrl required"}), 400
        
        print(f"Transcribing audio from: {audio_url}")
        
        # Download audio file
        response = requests.get(audio_url, stream=True)
        response.raise_for_status()
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
            for chunk in response.iter_content(chunk_size=8192):
                tmp_file.write(chunk)
            tmp_path = tmp_file.name
        
        try:
            # Transcribe
            segments, info = model.transcribe(tmp_path)
            text = " ".join([segment.text for segment in segments])
            
            print(f"✅ Transcription complete: {len(text)} characters")
            
            return jsonify({
                "text": text,
                "language": info.language,
                "duration": info.duration
            })
        finally:
            # Clean up temp file
            os.unlink(tmp_path)
            
    except Exception as e:
        print(f"❌ Transcription error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "service": "transcription-server"})

if __name__ == '__main__':
    print("🚀 Starting transcription server on port 8084...")
    app.run(host='0.0.0.0', port=8084, debug=False)
```

#### 5. Start All Services

**Terminal 1 - Ollama:**
```bash
ollama serve
```

**Terminal 2 - Embedding Server:**
```bash
cd local-ai-services
node embedding-server.js
```

**Terminal 3 - Transcription Server:**
```bash
cd local-ai-services
python3 transcription-server.py
```

**Terminal 4 - Your NestJS App:**
```bash
# Make sure your .env has:
# AI_EMBEDDING_URL=http://localhost:8081/embeddings
# AI_TRANSCRIBE_URL=http://localhost:8084/transcribe

npm run start:dev
```

### Option 2: Docker (Alternative)

If you prefer Docker, here's a docker-compose setup:

```yaml
version: '3.8'

services:
  embedding-server:
    build: ./local-ai-services/embedding
    ports:
      - "8081:8081"
    environment:
      - MODEL=nomic-embed-text
    
  transcription-server:
    build: ./local-ai-services/transcription
    ports:
      - "8084:8084"
    volumes:
      - ./cache:/app/cache
```

## Testing the Setup

### 1. Test Embedding Server

```bash
curl -X POST http://localhost:8081/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nomic-embed-text",
    "input": "This is a test testimony about an important event."
  }'
```

Expected response:
```json
{
  "data": [
    {
      "embedding": [0.1, 0.3, -0.2, ...]
    }
  ]
}
```

### 2. Test Transcription Server

```bash
curl -X POST http://localhost:8084/transcribe \
  -H "Content-Type: application/json" \
  -d '{
    "audioUrl": "https://example.com/audio.mp3",
    "model": "faster-whisper-large-v3"
  }'
```

### 3. Test Full Flow

1. **Create a testimony** via your API
2. **Approve it** as admin
3. **Check logs** - you should see:
   ```
   Finished AI processing for testimony X
   Created N connections for testimony X
   ```
4. **Query related testimonies:**
   ```bash
   curl http://localhost:3009/testimonies/1/related
   ```

## Environment Variables

Update your `.env` file:

```env
# AI Processing Configuration
AI_EMBEDDING_URL=http://localhost:8081/embeddings
AI_EMBEDDING_MODEL=nomic-embed-text
AI_TRANSCRIBE_URL=http://localhost:8084/transcribe
AI_TRANSCRIBE_MODEL=faster-whisper-large-v3
AI_HTTP_TIMEOUT=60000  # 60 seconds (transcription can take time)
```

## Troubleshooting

### Embedding Server Not Responding

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Check if embedding server is running
curl http://localhost:8081/health
```

### Transcription Server Errors

```bash
# Check Python version (need 3.8+)
python3 --version

# Reinstall faster-whisper
pip3 install --upgrade faster-whisper

# Check if model downloads correctly
python3 -c "from faster_whisper import WhisperModel; WhisperModel('large-v3', device='cpu')"
```

### Connection Discovery Not Working

1. **Check if embeddings were created:**
   ```sql
   SELECT * FROM testimony_embeddings WHERE testimony_id = 1;
   ```

2. **Check if edges were created:**
   ```sql
   SELECT * FROM testimony_edges WHERE from_id = 1;
   ```

3. **Manually trigger connection discovery:**
   ```bash
   curl -X POST http://localhost:3009/testimonies/1/discover-connections \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```

## Performance Tips for M1 Mac

### Embedding Server
- Ollama uses Apple Silicon optimizations automatically
- First run downloads model (~500MB)
- Subsequent runs are fast

### Transcription Server
- Uses CPU by default (fast enough on M1)
- For faster transcription, you can use `compute_type="int8"` or `"float16"`
- First run downloads model (~3GB)

### Memory Usage
- Ollama: ~2-3GB RAM
- Whisper: ~4-6GB RAM
- NestJS app: ~500MB RAM
- **Total: ~7-10GB RAM** (you have 32GB, plenty of room!)

## Quick Start Script

Create `start-local-ai.sh`:

```bash
#!/bin/bash

echo "🚀 Starting Local AI Services..."

# Start Ollama in background
echo "Starting Ollama..."
ollama serve &
OLLAMA_PID=$!

# Wait for Ollama to be ready
sleep 3

# Start embedding server
echo "Starting embedding server..."
cd local-ai-services
node embedding-server.js &
EMBEDDING_PID=$!

# Start transcription server
echo "Starting transcription server..."
python3 transcription-server.py &
TRANSCRIPTION_PID=$!

echo "✅ All services started!"
echo "   Embedding: http://localhost:8081"
echo "   Transcription: http://localhost:8084"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for interrupt
trap "kill $OLLAMA_PID $EMBEDDING_PID $TRANSCRIPTION_PID; exit" INT TERM
wait
```

Make it executable:
```bash
chmod +x start-local-ai.sh
./start-local-ai.sh
```

## Next Steps

1. Start all AI services
2. Update `.env` with local URLs
3. Test with a testimony
4. Check connections in database
5. Query related testimonies via API

Your AI connection system is now running locally! 🎉

