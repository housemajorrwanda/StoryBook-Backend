# Create Embedding Server Service on Railway

## 📋 Prerequisites

✅ Ollama service is running
✅ `nomic-embed-text` model is downloaded

---

## 🚀 Step-by-Step: Create Embedding Server

### Step 1: Create New Service

1. **Go to your Railway project** (the same one with Ollama)
2. Click the **"+ New"** button (top right)
3. Click **"GitHub Repo"** (or "Empty Service" if you want to upload files manually)

### Step 2: Connect Repository

**Option A: If using GitHub (Recommended)**

1. **Select your repository** from the list
2. Railway asks: **"Select the root directory for your service"**
3. **Click "Change"** or **"Browse"**
4. Navigate to: `local-ai-services/railway-embedding`
5. **Select that folder**
6. Click **"Deploy"**

**Option B: If uploading manually**

1. Click **"Empty Service"**
2. Go to **"Settings"** → **"Source"**
3. Click **"Connect GitHub"** and select your repo
4. Or use **"Upload Files"** to upload the folder directly

### Step 3: Verify Files are Present

Make sure these files exist in the service:
- ✅ `embedding-server.js`
- ✅ `package.json`
- ✅ `railway.json`

**To check:**
1. Go to **"Settings"** → **"Source"**
2. Verify the folder path is: `local-ai-services/railway-embedding`

### Step 4: Configure Environment Variables

1. **Click on the Embedding Server service**
2. Go to **"Settings"** tab
3. Scroll to **"Environment Variables"**
4. Click **"+ New Variable"**
5. **Add this variable:**

   **Variable Name:** `OLLAMA_URL`
   
   **Variable Value:** `http://ollama-service-name:11434`
   
   **But how do I know the service name?**
   
   - Option 1: Use Railway variable reference
     - Value: `http://${{Ollama.RAILWAY_PRIVATE_DOMAIN}}:11434`
   - Option 2: Use the actual Ollama service name
     - Go to Ollama service → Settings → Networking
     - Copy the service name/domain
     - Use: `http://that-name:11434`
   - Option 3: Use public URL (slower but works)
     - Go to Ollama service → Settings → Networking
     - Copy the Public Domain (e.g., `ollama-production-xxxx.up.railway.app`)
     - Use: `https://ollama-production-xxxx.up.railway.app:11434`

6. Click **"Add"**

### Step 5: Deploy

1. Railway should **auto-deploy** when it detects files
2. If not, go to **"Deployments"** tab
3. Click **"Redeploy"**
4. **Wait 1-2 minutes** for deployment

### Step 6: Get the Embedding Server URL

1. Go to **"Settings"** → **"Networking"**
2. Find **"Public Domain"** 
3. Copy the URL (e.g., `embedding-production-xxxx.up.railway.app`)
4. **Save this URL!** You'll need it for your main app

### Step 7: Test the Service

1. **Open a new browser tab**
2. Go to: `https://your-embedding-url.up.railway.app/health`
3. **You should see:**
   ```json
   {
     "status": "ok",
     "service": "embedding-server",
     "ollama_url": "http://..."
   }
   ```
4. **If you see this, it's working!** ✅

---

## 📝 Environment Variables Summary

### Embedding Server Service:

| Variable | Value | Example |
|----------|-------|---------|
| `OLLAMA_URL` | Your Ollama service URL | `http://ollama-production.up.railway.app:11434` |

**Best option (same Railway project):**
```
OLLAMA_URL=http://${{Ollama.RAILWAY_PRIVATE_DOMAIN}}:11434
```

**Or use public domain:**
```
OLLAMA_URL=https://ollama-production-xxxx.up.railway.app:11434
```

---

## ✅ Checklist

Before moving to next service, verify:

- [ ] Embedding Server service created
- [ ] Files deployed (embedding-server.js, package.json, railway.json)
- [ ] `OLLAMA_URL` environment variable set
- [ ] Service deployed successfully (green checkmark)
- [ ] Health check works: `/health` endpoint returns `{"status":"ok"}`
- [ ] Saved the Embedding Server URL

---

## 🐛 Troubleshooting

### Problem: Can't find the folder
- Make sure you pushed `local-ai-services/railway-embedding` to GitHub
- Check the folder structure in your repo

### Problem: Service won't start
- Check logs in "Deployments" tab
- Verify `package.json` is correct
- Make sure Node.js is detected (Railway auto-detects)

### Problem: Can't connect to Ollama
- Check `OLLAMA_URL` is correct
- Verify Ollama service is running
- Try using the public domain URL instead of private domain

### Problem: Health check fails
- Check Railway logs for errors
- Verify Ollama is accessible from the embedding server
- Test Ollama directly: `curl http://your-ollama-url:11434/api/tags`

---

## 🎯 Next Steps

Once the Embedding Server is working:

1. **Test it works** with the health endpoint
2. **Save the URL** for your main app configuration
3. **Create the Transcription Server** (next service)
4. **Update your main app** environment variables

---

**Your Embedding Server should be ready in 2-3 minutes!** 🚀

