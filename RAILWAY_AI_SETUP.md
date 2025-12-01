# Railway AI Setup Guide

## ⚠️ Why AI Doesn't Work on Railway (Currently)

Your AI services (embedding and transcription) are **only running locally** on your MacBook. When your NestJS app runs on Railway, it tries to connect to:
- `http://localhost:8085/embeddings` (embedding server)
- `http://localhost:8084/transcribe` (transcription server)

But `localhost` on Railway points to the Railway server, not your MacBook! So the connections fail.

## 🔧 Solutions

### Option 1: Run AI Services on Railway (Recommended for Production)

You need to deploy the AI services to Railway as separate services:

1. **Create a new Railway service** for the embedding server
2. **Create another Railway service** for the transcription server
3. **Update environment variables** to point to Railway service URLs

**Steps:**

1. **Deploy Embedding Server:**
   - Create new Railway service
   - Add `local-ai-services/embedding-server.js` and `package.json`
   - Set environment variable: `OLLAMA_URL=http://your-ollama-service:11434`
   - Or use Railway's Ollama plugin

2. **Deploy Transcription Server:**
   - Create new Railway service  
   - Add `local-ai-services/transcription-server.py` and requirements
   - Set up Python environment

3. **Update Your Main App's `.env` on Railway:**
   ```env
   AI_EMBEDDING_URL=http://your-embedding-service.railway.app/embeddings
   AI_TRANSCRIBE_URL=http://your-transcription-service.railway.app/transcribe
   ```

### Option 2: Make AI Optional (Quick Fix)

Modify the code to gracefully handle when AI services are unavailable:

- If embedding service is down → Skip AI processing, log warning
- If transcription service is down → Skip transcription, use existing transcript
- Connections won't be created, but app won't crash

### Option 3: Use Cloud AI Services (Easiest)

Instead of self-hosting, use cloud services:

- **Embeddings:** OpenAI, Cohere, or Hugging Face Inference API
- **Transcription:** OpenAI Whisper API, AssemblyAI, or Deepgram

Update your `.env`:
```env
AI_EMBEDDING_URL=https://api.openai.com/v1/embeddings
AI_EMBEDDING_MODEL=text-embedding-3-large
# Add API key
```

## 📊 Current Status

- ✅ **Local Development:** AI works (services running on your MacBook)
- ❌ **Railway Production:** AI doesn't work (services not deployed)

## 🎯 Quick Test

To verify if AI is working on Railway:

1. Check logs when approving a testimony
2. Look for errors like: `ECONNREFUSED`, `timeout`, or `Failed to connect`
3. Check database: `SELECT COUNT(*) FROM testimony_embeddings;` - should be 0 if AI isn't working
4. Check connections: `SELECT COUNT(*) FROM testimony_edges;` - should be 0 if AI isn't working

## 🚀 Recommended Next Steps

1. **For now:** Use the new `GET /testimonies/connections/all` endpoint to see all connections (works if you have local data)
2. **For production:** Deploy AI services to Railway or use cloud AI APIs
3. **For testing:** Keep using local setup for development

