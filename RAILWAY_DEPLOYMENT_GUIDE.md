# Railway AI Services Deployment Guide

Complete step-by-step guide to deploy embedding and transcription services to Railway.

## 📋 Prerequisites

- Railway account (https://railway.app)
- Railway CLI installed (optional but helpful)
- Your main NestJS app already deployed on Railway

## 🎯 Overview

We'll create **3 separate Railway services**:
1. **Ollama Service** - Runs the embedding model
2. **Embedding Server** - Node.js wrapper for Ollama
3. **Transcription Server** - Python server with Whisper

---

## Step 1: Deploy Ollama Service

### Option A: Use Railway's Ollama Plugin (E1asy)

1. Go to your Railway project
2. Click **"+ New"** → **"Plugin"**
3. Search for **"Ollama"** and add it
4. Note the service URL (e.g., `ollama-production.up.railway.app`)
5. Set environment variable: `OLLAMA_URL=http://ollama-production.up.railway.app:11434`

### Option B: Deploy Ollama Manually

1. Create new service in Railway
2. Connect to GitHub repo (or upload files)
3. Add these files:

**`railway-ollama/Dockerfile`:**
```dockerfile
FROM ollama/ollama:latest

EXPOSE 11434

CMD ["ollama", "serve"]
```

**`railway-ollama/railway.json`:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "ollama serve",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

4. Deploy and note the service URL
5. After deployment, SSH into the service and run:
   ```bash
   ollama pull nomic-embed-text
   ```

---

## Step 2: Deploy Embedding Server

1. **Create New Service** in Railway
2. **Connect to GitHub** (or upload files)
3. **Add these files:**

**`local-ai-services/railway-embedding/package.json`:**
```json
{
  "name": "embedding-server",
  "version": "1.0.0",
  "main": "embedding-server.js",
  "scripts": {
    "start": "node embedding-server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "axios": "^1.6.0",
    "cors": "^2.8.5"
  }
}
```

**`local-ai-services/railway-embedding/embedding-server.js`:**
```javascript
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const PORT = process.env.PORT || 8085;

app.post('/embeddings', async (req, res) => {
  try {
    const { input, model = 'nomic-embed-text' } = req.body;
    const texts = Array.isArray(input) ? input : [input];

    console.log(`📊 Generating embeddings for ${texts.length} text(s) using ${model}...`);

    const embeddings = await Promise.all(
      texts.map(async (text, index) => {
        try {
          const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
            model: model,
            prompt: text,
          });

          if (!response.data || !response.data.embedding) {
            throw new Error('Invalid response from Ollama');
          }

          console.log(`✅ Generated embedding ${index + 1}/${texts.length}`);
          return { embedding: response.data.embedding };
        } catch (error) {
          console.error(`❌ Error embedding text ${index + 1}:`, error.message);
          throw error;
        }
      }),
    );

    res.json({ data: embeddings });
  } catch (error) {
    console.error('❌ Embedding error:', error.message);
    res.status(500).json({
      error: error.message,
      details: error.response?.data || null,
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'embedding-server',
    ollama_url: OLLAMA_URL,
  });
});

app.listen(PORT, () => {
  console.log(`✅ Embedding server running on port ${PORT}`);
  console.log(`   Ollama URL: ${OLLAMA_URL}`);
});
```

**`local-ai-services/railway-embedding/railway.json`:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

4. **Set Environment Variables:**
   - `OLLAMA_URL` = Your Ollama service URL (from Step 1)
   - `PORT` = Railway will set this automatically

5. **Deploy** and note the service URL (e.g., `embedding-production.up.railway.app`)

---

## Step 3: Deploy Transcription Server

1. **Create New Service** in Railway
2. **Connect to GitHub** (or upload files)
3. **Add these files:**

**`local-ai-services/railway-transcription/requirements.txt`:**
```
flask==3.1.2
faster-whisper==1.2.1
requests==2.32.5
```

**`local-ai-services/railway-transcription/transcription-server.py`:**
```python
#!/usr/bin/env python3
from flask import Flask, request, jsonify
from faster_whisper import WhisperModel
import requests
import os
import tempfile
import sys

app = Flask(__name__)

# Load model (downloads automatically on first run)
MODEL_NAME = os.getenv('WHISPER_MODEL', 'large-v3')
COMPUTE_TYPE = os.getenv('WHISPER_COMPUTE_TYPE', 'int8')  # int8 for CPU, float16 for GPU

print(f"🤖 Loading Whisper model: {MODEL_NAME} (compute_type: {COMPUTE_TYPE})...")
try:
    model = WhisperModel(MODEL_NAME, device="cpu", compute_type=COMPUTE_TYPE)
    print("✅ Model loaded successfully!")
except Exception as e:
    print(f"❌ Failed to load model: {e}")
    sys.exit(1)

@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        data = request.json
        audio_url = data.get('audioUrl')
        model_name = data.get('model', MODEL_NAME)

        if not audio_url:
            return jsonify({"error": "audioUrl required"}), 400

        print(f"🎤 Transcribing audio from: {audio_url}")

        # Download audio file
        try:
            response = requests.get(audio_url, stream=True, timeout=60)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"❌ Failed to download audio: {e}")
            return jsonify({"error": f"Failed to download audio: {str(e)}"}), 400

        # Determine file extension
        content_type = response.headers.get('Content-Type', '')
        if 'audio/mpeg' in content_type or audio_url.endswith('.mp3'):
            suffix = '.mp3'
        elif 'audio/wav' in content_type or audio_url.endswith('.wav'):
            suffix = '.wav'
        elif 'audio/mp4' in content_type or audio_url.endswith('.m4a'):
            suffix = '.m4a'
        else:
            suffix = '.mp3'

        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            for chunk in response.iter_content(chunk_size=8192):
                tmp_file.write(chunk)
            tmp_path = tmp_file.name

        try:
            # Transcribe
            print("🔄 Processing audio...")
            segments, info = model.transcribe(tmp_path, beam_size=5)

            text_parts = []
            for segment in segments:
                text_parts.append(segment.text.strip())

            text = " ".join(text_parts)

            print(f"✅ Transcription complete: {len(text)} characters, language: {info.language}")

            return jsonify({
                "text": text,
                "language": info.language,
                "duration": info.duration if hasattr(info, 'duration') else None,
            })
        except Exception as e:
            print(f"❌ Transcription error: {str(e)}")
            return jsonify({"error": f"Transcription failed: {str(e)}"}), 500
        finally:
            # Clean up temp file
            try:
                os.unlink(tmp_path)
            except:
                pass

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok",
        "service": "transcription-server",
        "model": MODEL_NAME,
        "compute_type": COMPUTE_TYPE,
    })

if __name__ == '__main__':
    PORT = int(os.getenv('PORT', 8084))
    print(f"🚀 Starting transcription server on port {PORT}...")
    print(f"   Model: {MODEL_NAME}")
    app.run(host='0.0.0.0', port=PORT, debug=False)
```

**`local-ai-services/railway-transcription/railway.json`:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "python3 transcription-server.py",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**`local-ai-services/railway-transcription/nixpacks.toml`:**
```toml
[phases.setup]
nixPkgs = ["python3", "pip"]

[phases.install]
cmds = ["pip install -r requirements.txt"]

[start]
cmd = "python3 transcription-server.py"
```

4. **Set Environment Variables:**
   - `WHISPER_MODEL` = `large-v3` (or smaller like `base` for faster startup)
   - `WHISPER_COMPUTE_TYPE` = `int8` (for CPU)
   - `PORT` = Railway will set this automatically

5. **Deploy** and note the service URL (e.g., `transcription-production.up.railway.app`)

**⚠️ Note:** First deployment will download ~3GB Whisper model - this takes 5-10 minutes!

---

## Step 4: Update Main App Environment Variables

1. Go to your **main NestJS app service** on Railway
2. Go to **Variables** tab
3. Add/Update these environment variables:

```env
# AI Processing Configuration
AI_EMBEDDING_URL=https://your-embedding-service.up.railway.app/embeddings
AI_EMBEDDING_MODEL=nomic-embed-text
AI_TRANSCRIBE_URL=https://your-transcription-service.up.railway.app/transcribe
AI_TRANSCRIBE_MODEL=faster-whisper-large-v3
AI_HTTP_TIMEOUT=120000
```

**Replace:**
- `your-embedding-service` with your actual embedding service URL
- `your-transcription-service` with your actual transcription service URL

4. **Redeploy** your main app

---

## Step 5: Test the Setup

1. **Test Embedding Service:**
   ```bash
   curl https://your-embedding-service.up.railway.app/health
   ```

2. **Test Transcription Service:**
   ```bash
   curl https://your-transcription-service.up.railway.app/health
   ```

3. **Test from Main App:**
   - Create a testimony
   - Approve it as admin
   - Check logs for AI processing
   - Verify embeddings were created in database

---

## 🎯 Quick Setup Checklist

- [ ] Deploy Ollama service (or use plugin)
- [ ] Pull `nomic-embed-text` model in Ollama
- [ ] Deploy Embedding Server
- [ ] Deploy Transcription Server
- [ ] Update main app environment variables
- [ ] Redeploy main app
- [ ] Test all services
- [ ] Verify AI processing works

---

## 💰 Cost Considerations

**Railway Pricing:**
- Each service uses resources
- Ollama: ~2GB RAM
- Embedding Server: ~500MB RAM
- Transcription Server: ~4-6GB RAM (when processing)
- **Total: ~7-9GB RAM** across all services

**Tips to Reduce Costs:**
- Use smaller Whisper model (`base` instead of `large-v3`) - faster, less RAM
- Scale down services when not in use
- Consider using cloud AI APIs instead (OpenAI, etc.)

---

## 🐛 Troubleshooting

### Embedding Service Can't Connect to Ollama

- Check `OLLAMA_URL` environment variable
- Verify Ollama service is running
- Check Railway service logs

### Transcription Service Fails to Start

- Check Python version (needs 3.8+)
- Verify `requirements.txt` is correct
- Check Railway logs for model download errors
- Try smaller model first (`base` instead of `large-v3`)

### Main App Can't Connect to AI Services

- Verify service URLs in environment variables
- Check that services are deployed and running
- Verify Railway service networking (services in same project can use internal URLs)

---

## 🔗 Internal Service URLs (Better Performance)

If all services are in the same Railway project, you can use internal URLs:

```env
AI_EMBEDDING_URL=http://embedding-service:8085/embeddings
AI_TRANSCRIBE_URL=http://transcription-service:8084/transcribe
```

This is faster and doesn't go through the public internet!

---

## ✅ Success Indicators

You'll know it's working when:
- ✅ Testimony approval triggers AI processing
- ✅ Embeddings appear in `testimony_embeddings` table
- ✅ Connections appear in `testimony_edges` table
- ✅ No connection errors in logs
- ✅ `/testimonies/connections/all` returns results

Good luck! 🚀

