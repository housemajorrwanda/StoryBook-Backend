# Railway Environment Variables - Correct Configuration

## ❌ The Problem

You have these **WRONG** environment variables:

### Ollama Service:
```
OLLAMA_HOST="${{StoryBook-Backend.AI_TRANSCRIBE_MODEL}}::"
OLLAMA_ORIGINS="http://${{RAILWAY_PRIVATE_DOMAIN}}:*"
```

**This is wrong because:**
- `OLLAMA_HOST` should be a hostname/port, NOT a model name
- It's trying to use `faster-whisper-large-v3` as a hostname (which doesn't exist!)

### Main App:
```
AI_TRANSCRIBE_MODEL="faster-whisper-large-v3"
```

**This is wrong because:**
- Faster Whisper model name should be `large-v3`, not `faster-whisper-large-v3`

---

## ✅ Correct Configuration

### Service 1: Ollama Service

**Environment Variables:**

```
OLLAMA_HOST=0.0.0.0:11434
OLLAMA_ORIGINS=*
```

**NOT using any Railway variable references!** Just plain values.

---

### Service 2: Embedding Server

**Environment Variables:**

```
OLLAMA_URL=http://your-ollama-service-name:11434
```

**OR** if Ollama is in the same Railway project:

```
OLLAMA_URL=http://${{Ollama.RAILWAY_PRIVATE_DOMAIN}}:11434
```

**OR** if you need the public domain:

```
OLLAMA_URL=https://your-ollama-production.up.railway.app:11434
```

---

### Service 3: Transcription Server

**Environment Variables:**

```
WHISPER_MODEL=large-v3
WHISPER_COMPUTE_TYPE=int8
```

---

### Service 4: Main App (StoryBook-Backend)

**Environment Variables:**

```env
# Database (keep as is)
DATABASE_URL="${{Postgres.DATABASE_URL}}"

# Auth (keep as is)
JWT_SECRET="YOUR_JWT_SECRET"
JWT_EXPIRES_IN="24h"

# Server (keep as is)
PORT="3009"
NODE_ENV="production"

# Email (keep as is)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="465"
SMTP_USER="YOUR_SMTP_EMAIL"
SMTP_PASS="YOUR_SMTP_PASSWORD"
FROM_EMAIL="noreply@yourdomain.com"

# Google OAuth (keep as is)
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
GOOGLE_CALLBACK_URL="https://your-app.up.railway.app/auth/google/callback"

# Cloudinary (keep as is)
CLOUDINARY_CLOUD_NAME="YOUR_CLOUDINARY_CLOUD_NAME"
CLOUDINARY_API_KEY="YOUR_CLOUDINARY_API_KEY"
CLOUDINARY_API_SECRET="YOUR_CLOUDINARY_API_SECRET"

# Frontend (keep as is)
FRONTEND_URL="https://story-book-tau-fawn.vercel.app"

# AI Embedding (FIX THIS - use your embedding service URL)
AI_EMBEDDING_URL="https://your-embedding-service.up.railway.app/embeddings"
AI_EMBEDDING_MODEL="nomic-embed-text"

# AI Transcription (FIX THIS - use your transcription service URL AND correct model)
AI_TRANSCRIBE_URL="https://your-transcription-service.up.railway.app/transcribe"
AI_TRANSCRIBE_MODEL="large-v3"

# HTTP Timeout (keep as is)
AI_HTTP_TIMEOUT="60000"
```

---

## 🔧 Step-by-Step Fix

### Step 1: Fix Ollama Service Variables

1. Go to **Ollama service** on Railway
2. Go to **Settings** → **Environment Variables**
3. **Delete or change:**
   - `OLLAMA_HOST="${{StoryBook-Backend.AI_TRANSCRIBE_MODEL}}::"` ❌
4. **Add/Set:**
   - `OLLAMA_HOST` = `0.0.0.0:11434` ✅
   - `OLLAMA_ORIGINS` = `*` ✅
5. **Save/Redeploy**

### Step 2: Fix Main App Variables

1. Go to **StoryBook-Backend** service
2. Go to **Variables** tab
3. **Change:**
   - `AI_TRANSCRIBE_MODEL` from `faster-whisper-large-v3` ❌
   - To: `large-v3` ✅
4. **Update URLs** to point to your actual services:
   - `AI_EMBEDDING_URL` = Your embedding service URL
   - `AI_TRANSCRIBE_URL` = Your transcription service URL
5. **Save/Redeploy**

### Step 3: Verify All Services

Check that:
- ✅ Ollama service has `OLLAMA_HOST=0.0.0.0:11434`
- ✅ Embedding service has correct `OLLAMA_URL`
- ✅ Transcription service has `WHISPER_MODEL=large-v3`
- ✅ Main app has `AI_TRANSCRIBE_MODEL=large-v3`

---

## 📋 Quick Reference

### Ollama Service Variables:
```
OLLAMA_HOST=0.0.0.0:11434
OLLAMA_ORIGINS=*
```

### Embedding Server Variables:
```
OLLAMA_URL=http://ollama-service-name:11434
```

### Transcription Server Variables:
```
WHISPER_MODEL=large-v3
WHISPER_COMPUTE_TYPE=int8
```

### Main App AI Variables:
```
AI_EMBEDDING_URL=https://your-embedding-service/embeddings
AI_EMBEDDING_MODEL=nomic-embed-text
AI_TRANSCRIBE_URL=https://your-transcription-service/transcribe
AI_TRANSCRIBE_MODEL=large-v3
AI_HTTP_TIMEOUT=60000
```

---

## 🎯 The Key Fixes

1. **OLLAMA_HOST** should be `0.0.0.0:11434` (NOT a variable reference!)
2. **AI_TRANSCRIBE_MODEL** should be `large-v3` (NOT `faster-whisper-large-v3`)
3. **Use actual service URLs** for embedding and transcription services

After making these changes, redeploy all services and the error should be gone! 🚀

