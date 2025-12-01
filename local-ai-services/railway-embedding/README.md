# Embedding Server - Railway Deployment

This folder contains the embedding server for Railway deployment.

## 🚀 Quick Deploy

1. **Create new Railway service**
2. **Connect this folder** (or push to GitHub and connect repo)
3. **Set environment variable:**
   - `OLLAMA_URL` = Your Ollama service URL (e.g., `http://ollama-service:11434`)
4. **Deploy!**

## 📋 Files

- `embedding-server.js` - Main server file
- `package.json` - Dependencies
- `railway.json` - Railway configuration

## 🔗 After Deployment

Update your main app's environment variable:
```env
AI_EMBEDDING_URL=https://your-service.up.railway.app/embeddings
```

