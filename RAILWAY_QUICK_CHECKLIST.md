# Railway Deployment - Quick Checklist

Use this checklist as you deploy each service.

---

## 📝 URLs to Save

Fill these in as you create each service:

- [ ] **Ollama URL:** `_________________________________`
- [ ] **Embedding Server URL:** `_________________________________`
- [ ] **Transcription Server URL:** `_________________________________`

---

## ✅ Service 1: Ollama

- [ ] Clicked "+ New" → "Plugin"
- [ ] Searched for "Ollama" and added it
- [ ] Waited for deployment (2-3 minutes)
- [ ] Copied Ollama service URL
- [ ] Opened Ollama shell/terminal
- [ ] Ran: `ollama pull nomic-embed-text`
- [ ] Model downloaded successfully

**Ollama URL:** `_________________________________`

---

## ✅ Service 2: Embedding Server

- [ ] Clicked "+ New" → "Empty Service" or "GitHub Repo"
- [ ] Connected `local-ai-services/railway-embedding` folder
- [ ] Added environment variable:
  - Name: `OLLAMA_URL`
  - Value: `http://ollama-service:11434` (or your Ollama URL)
- [ ] Verified files exist:
  - [ ] `embedding-server.js`
  - [ ] `package.json`
  - [ ] `railway.json`
- [ ] Deployed (waited 1-2 minutes)
- [ ] Copied Embedding Server URL
- [ ] Tested: `https://your-url/health` → Returns `{"status":"ok"}`

**Embedding Server URL:** `_________________________________`

---

## ✅ Service 3: Transcription Server

- [ ] Clicked "+ New" → "Empty Service" or "GitHub Repo"
- [ ] Connected `local-ai-services/railway-transcription` folder
- [ ] Added environment variables:
  - [ ] `WHISPER_MODEL` = `large-v3`
  - [ ] `WHISPER_COMPUTE_TYPE` = `int8`
- [ ] Verified files exist:
  - [ ] `transcription-server.py`
  - [ ] `requirements.txt`
  - [ ] `railway.json`
  - [ ] `nixpacks.toml`
- [ ] Deployed (waited 5-10 minutes for model download)
- [ ] Copied Transcription Server URL
- [ ] Tested: `https://your-url/health` → Returns `{"status":"ok"}`

**Transcription Server URL:** `_________________________________`

---

## ✅ Main App Configuration

- [ ] Opened main NestJS app service
- [ ] Went to "Variables" tab
- [ ] Added all 5 environment variables:

  - [ ] `AI_EMBEDDING_URL` = `https://your-embedding-url/embeddings`
  - [ ] `AI_EMBEDDING_MODEL` = `nomic-embed-text`
  - [ ] `AI_TRANSCRIBE_URL` = `https://your-transcription-url/transcribe`
  - [ ] `AI_TRANSCRIBE_MODEL` = `faster-whisper-large-v3`
  - [ ] `AI_HTTP_TIMEOUT` = `120000`

- [ ] Redeployed main app
- [ ] All services show green checkmarks ✅

---

## 🧪 Testing

- [ ] Embedding health check works
- [ ] Transcription health check works
- [ ] Created/approved a testimony
- [ ] Checked logs - no connection errors
- [ ] Database has embeddings: `SELECT COUNT(*) FROM testimony_embeddings;`
- [ ] Database has connections: `SELECT COUNT(*) FROM testimony_edges;`

---

## 🎉 All Done!

If all checkboxes are checked, your AI services are deployed and working! 🚀

---

## 📋 Quick Command Reference

**Test Embedding Server:**
```bash
curl https://your-embedding-url/health
```

**Test Transcription Server:**
```bash
curl https://your-transcription-url/health
```

**Pull Ollama Model (in Ollama service shell):**
```bash
ollama pull nomic-embed-text
```

---

**Need detailed instructions?** See `RAILWAY_STEP_BY_STEP.md`

