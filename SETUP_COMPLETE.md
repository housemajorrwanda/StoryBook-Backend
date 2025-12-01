# ✅ AI Setup Complete!

Both AI services are ready to use!

## 🎉 What's Working

1. ✅ **Ollama** - Running with `nomic-embed-text` model
2. ✅ **Embedding Server** - Port 8085 ✅
3. ✅ **Transcription Server** - Port 8084 ✅ (Whisper model loaded)

## 🚀 Starting the Services

### Option 1: Manual Start (Separate Terminals)

**Terminal 1 - Embedding Server:**
```bash
cd local-ai-services
node embedding-server.js
```

**Terminal 2 - Transcription Server:**
```bash
cd local-ai-services
source venv/bin/activate
python3 transcription-server.py
```

### Option 2: Background Start

**Embedding Server:**
```bash
cd local-ai-services
node embedding-server.js > /tmp/embedding.log 2>&1 &
```

**Transcription Server:**
```bash
cd local-ai-services
source venv/bin/activate
python3 transcription-server.py > /tmp/transcription.log 2>&1 &
```

Check logs:
```bash
tail -f /tmp/embedding.log
tail -f /tmp/transcription.log
```

## 🔧 Update Your `.env` File

Make sure your `.env` has these lines:

```env
# AI Processing Configuration
AI_EMBEDDING_URL=http://localhost:8085/embeddings
AI_EMBEDDING_MODEL=nomic-embed-text
AI_TRANSCRIBE_URL=http://localhost:8084/transcribe
AI_TRANSCRIBE_MODEL=faster-whisper-large-v3
AI_HTTP_TIMEOUT=60000
```

## 🧪 Test the Services

### Test Embedding Server:
```bash
curl http://localhost:8085/health

curl -X POST http://localhost:8085/embeddings \
  -H "Content-Type: application/json" \
  -d '{"input": "Test testimony", "model": "nomic-embed-text"}'
```

### Test Transcription Server:
```bash
curl http://localhost:8084/health
```

## 📋 Full Test Flow

1. **Start both AI services** (see above)
2. **Start your NestJS app:**
   ```bash
   npm run start:dev
   ```
3. **Create a testimony** via your API
4. **Approve it as admin** → AI processing will start automatically!
5. **Check logs** for:
   ```
   Finished AI processing for testimony X
   Created N connections for testimony X
   ```
6. **Query related testimonies:**
   ```bash
   curl http://localhost:3009/testimonies/1/related
   ```

## 📊 Port Summary

- **8085** - Embedding Server ✅
- **8084** - Transcription Server ✅
- **11434** - Ollama (already running) ✅
- **3009** - Your NestJS App

## 🎯 What Happens Next

When you approve a testimony:

1. **AI Processing Starts:**
   - Audio/Video → Transcription (if needed)
   - Text → Embeddings generated
   - Embeddings stored in database

2. **Connection Discovery:**
   - Semantic similarity (AI-based)
   - Rule-based connections (events, locations, people, dates)
   - Connections stored in `testimony_edges` table

3. **Query Related:**
   - `GET /testimonies/:id/related` returns connected testimonies with accuracy scores

## 🛠️ Troubleshooting

**Services not responding?**
```bash
# Check if servers are running
curl http://localhost:8085/health  # Embedding
curl http://localhost:8084/health  # Transcription

# Check Ollama
curl http://localhost:11434/api/tags
```

**Connection discovery not working?**
- Make sure testimonies have embeddings (check `testimony_embeddings` table)
- Manually trigger: `POST /testimonies/:id/discover-connections` (admin only)

## 📝 Next Steps

1. ✅ Update `.env` file with correct ports
2. ✅ Start both AI services
3. ✅ Start your NestJS app
4. ✅ Test with a real testimony!

You're all set! 🎉

