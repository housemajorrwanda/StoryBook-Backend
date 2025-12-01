# Railway Deployment - Step by Step Guide

**Complete walkthrough for creating all 3 AI services on Railway.**

---

## 🎯 What We're Building

1. **Ollama Service** - Runs the embedding model
2. **Embedding Server** - Node.js wrapper for Ollama  
3. **Transcription Server** - Python server with Whisper

---

## 📋 Before You Start

✅ Make sure you have:
- Railway account (sign up at https://railway.app if needed)
- Your main NestJS app project on Railway
- GitHub repository connected (or ready to upload files)

---

## 🚀 Service 1: Ollama Service

### Step 1.1: Open Your Railway Project

1. Go to https://railway.app
2. Log in to your account
3. Click on your **main project** (the one with your NestJS app)
4. You should see your existing services

### Step 1.2: Create New Service

1. Click the **"+ New"** button (usually top right or in the services list)
2. A dropdown menu appears
3. Click **"Plugin"** from the dropdown

### Step 1.3: Add Ollama Plugin

1. A search box appears
2. Type: **"Ollama"**
3. Click on the **Ollama plugin** when it appears
4. Railway will automatically create the service

### Step 1.4: Wait for Deployment

1. Railway will start deploying Ollama
2. Wait 2-3 minutes for it to finish
3. You'll see a green checkmark when it's ready

### Step 1.5: Get Ollama URL

1. Click on the **Ollama service** in your project
2. Go to the **"Settings"** tab
3. Scroll down to **"Networking"** section
4. Find the **"Public Domain"** or **"Service URL"**
5. Copy the URL (e.g., `ollama-production.up.railway.app`)
6. **Save this URL** - you'll need it later!

### Step 1.6: Pull the Embedding Model

1. In the Ollama service, click the **"Deployments"** tab
2. Click on the latest deployment
3. Click **"View Logs"** or **"Shell"** button
4. A terminal opens
5. Type this command and press Enter:
   ```bash
   ollama pull nomic-embed-text
   ```
6. Wait 1-2 minutes for the model to download
7. You'll see "success" when it's done

**✅ Ollama Service is Ready!**

---

## 🚀 Service 2: Embedding Server

### Step 2.1: Prepare Files Locally

**Option A: Using GitHub (Recommended)**

1. Make sure your code is pushed to GitHub
2. The files are already in: `local-ai-services/railway-embedding/`

**Option B: Upload Directly**

1. We'll upload files directly to Railway

### Step 2.2: Create New Service

1. In your Railway project, click **"+ New"**
2. This time, click **"Empty Service"** or **"GitHub Repo"**

**If using GitHub:**
3. Select your repository
4. Railway will ask which folder to deploy
5. Select: **`local-ai-services/railway-embedding`**
6. Click **"Deploy"**

**If uploading directly:**
3. Click **"Empty Service"**
4. Railway creates a blank service
5. Go to **"Settings"** → **"Source"**
6. Click **"Connect GitHub"** or **"Upload Files"**

### Step 2.3: Configure Service

1. Click on the **Embedding Server** service
2. Go to **"Settings"** tab
3. Scroll to **"Environment Variables"**
4. Click **"+ New Variable"**
5. Add this variable:
   - **Name:** `OLLAMA_URL`
   - **Value:** `http://ollama-production.up.railway.app:11434`
     (Replace with YOUR Ollama service URL from Step 1.5)
6. Click **"Add"**

### Step 2.4: Verify Files

Make sure these files exist in the service:
- ✅ `embedding-server.js`
- ✅ `package.json`
- ✅ `railway.json`

**If files are missing:**
1. Go to **"Settings"** → **"Source"**
2. Make sure the correct folder is selected
3. Or upload files manually

### Step 2.5: Deploy

1. Railway should auto-deploy when files are detected
2. If not, go to **"Deployments"** tab
3. Click **"Redeploy"**
4. Wait 1-2 minutes for deployment

### Step 2.6: Get Embedding Server URL

1. In the Embedding Server, go to **"Settings"** tab
2. Scroll to **"Networking"** section
3. Find **"Public Domain"** or **"Service URL"**
4. Copy the URL (e.g., `embedding-production.up.railway.app`)
5. **Save this URL** - you'll need it!

### Step 2.7: Test the Service

1. Copy your Embedding Server URL
2. Open a new browser tab
3. Go to: `https://your-embedding-url.up.railway.app/health`
4. You should see: `{"status":"ok","service":"embedding-server",...}`
5. If you see this, **it's working!** ✅

**✅ Embedding Server is Ready!**

---

## 🚀 Service 3: Transcription Server

### Step 3.1: Create New Service

1. In your Railway project, click **"+ New"**
2. Click **"Empty Service"** or **"GitHub Repo"**

**If using GitHub:**
3. Select your repository
4. Select folder: **`local-ai-services/railway-transcription`**
5. Click **"Deploy"**

**If uploading directly:**
3. Click **"Empty Service"**
4. Connect GitHub or upload files

### Step 3.2: Configure Environment Variables

1. Click on the **Transcription Server** service
2. Go to **"Settings"** → **"Environment Variables"**
3. Click **"+ New Variable"** and add:

   **Variable 1:**
   - **Name:** `WHISPER_MODEL`
   - **Value:** `large-v3`
   - Click **"Add"**

   **Variable 2:**
   - **Name:** `WHISPER_COMPUTE_TYPE`
   - **Value:** `int8`
   - Click **"Add"**

### Step 3.3: Verify Files

Make sure these files exist:
- ✅ `transcription-server.py`
- ✅ `requirements.txt`
- ✅ `railway.json`
- ✅ `nixpacks.toml`

### Step 3.4: Deploy (This Takes Time!)

1. Railway will start building
2. **⚠️ First deployment takes 5-10 minutes!**
   - It downloads the Whisper model (~3GB)
   - Be patient, this is normal!
3. Watch the logs in **"Deployments"** tab
4. You'll see Python installing packages
5. Then it downloads the model
6. Wait for green checkmark ✅

### Step 3.5: Get Transcription Server URL

1. Go to **"Settings"** → **"Networking"**
2. Copy the **Public Domain** URL
3. **Save this URL** - you'll need it!

### Step 3.6: Test the Service

1. Go to: `https://your-transcription-url.up.railway.app/health`
2. You should see: `{"status":"ok","service":"transcription-server",...}`
3. If you see this, **it's working!** ✅

**✅ Transcription Server is Ready!**

---

## 🔗 Step 4: Connect Everything to Your Main App

### Step 4.1: Open Main App Service

1. Click on your **main NestJS app** service in Railway
2. Go to **"Variables"** tab

### Step 4.2: Add Environment Variables

Click **"+ New Variable"** for each of these:

**Variable 1:**
- **Name:** `AI_EMBEDDING_URL`
- **Value:** `https://your-embedding-url.up.railway.app/embeddings`
  (Replace with YOUR Embedding Server URL from Step 2.6)
- Click **"Add"**

**Variable 2:**
- **Name:** `AI_EMBEDDING_MODEL`
- **Value:** `nomic-embed-text`
- Click **"Add"**

**Variable 3:**
- **Name:** `AI_TRANSCRIBE_URL`
- **Value:** `https://your-transcription-url.up.railway.app/transcribe`
  (Replace with YOUR Transcription Server URL from Step 3.5)
- Click **"Add"**

**Variable 4:**
- **Name:** `AI_TRANSCRIBE_MODEL`
- **Value:** `faster-whisper-large-v3`
- Click **"Add"**

**Variable 5:**
- **Name:** `AI_HTTP_TIMEOUT`
- **Value:** `120000`
- Click **"Add"**

### Step 4.3: Redeploy Main App

1. Go to **"Deployments"** tab
2. Click **"Redeploy"**
3. Wait for deployment to finish

**✅ Everything is Connected!**

---

## ✅ Final Checklist

Before testing, make sure:

- [ ] Ollama service is running (green checkmark)
- [ ] `nomic-embed-text` model is downloaded in Ollama
- [ ] Embedding Server is running (green checkmark)
- [ ] Embedding Server `/health` endpoint works
- [ ] Transcription Server is running (green checkmark)
- [ ] Transcription Server `/health` endpoint works
- [ ] Main app has all 5 environment variables set
- [ ] Main app is redeployed

---

## 🧪 Test Everything

### Test 1: Check Service Health

Open these URLs in your browser:

1. **Embedding:** `https://your-embedding-url/health`
2. **Transcription:** `https://your-transcription-url/health`

Both should return `{"status":"ok",...}`

### Test 2: Test AI Processing

1. Go to your app
2. Create a new testimony (or use existing one)
3. Approve it as admin
4. Check Railway logs for your main app
5. Look for:
   - ✅ "Generating embeddings..."
   - ✅ "Transcribing audio..."
   - ✅ No connection errors

### Test 3: Check Database

1. Connect to your database
2. Run: `SELECT COUNT(*) FROM testimony_embeddings;`
3. Should be > 0 if AI is working
4. Run: `SELECT COUNT(*) FROM testimony_edges;`
5. Should be > 0 if connections are being created

---

## 🐛 Troubleshooting

### Problem: Ollama can't connect

**Solution:**
- Check `OLLAMA_URL` in Embedding Server
- Make sure it's the internal URL format: `http://ollama-service:11434`
- Or use the public domain with port: `https://ollama-url.up.railway.app:11434`

### Problem: Embedding Server fails

**Solution:**
- Check logs in Embedding Server
- Verify `OLLAMA_URL` is correct
- Make sure Ollama service is running
- Verify `nomic-embed-text` model is downloaded

### Problem: Transcription Server won't start

**Solution:**
- Check logs - first deployment takes 5-10 minutes
- Verify Python version (should be 3.8+)
- Check `requirements.txt` is correct
- Try smaller model: `WHISPER_MODEL=base` (faster startup)

### Problem: Main app can't connect to services

**Solution:**
- Verify all environment variables are set correctly
- Check service URLs are correct (no typos)
- Make sure services are deployed and running
- Check Railway logs for connection errors

### Problem: Services are too slow

**Solution:**
- Use internal URLs (faster):
  - `AI_EMBEDDING_URL=http://embedding-service:8085/embeddings`
  - `AI_TRANSCRIBE_URL=http://transcription-service:8084/transcribe`
- Upgrade Railway plan for more resources
- Use smaller Whisper model (`base` instead of `large-v3`)

---

## 💡 Pro Tips

1. **Use Internal URLs** - If all services are in the same Railway project, use internal service names instead of public URLs (faster!)

2. **Monitor Costs** - Each service uses resources. Check Railway billing dashboard.

3. **Scale Down When Not Using** - You can pause services when not in use to save costs.

4. **Check Logs Regularly** - Railway logs show what's happening in real-time.

5. **Test Locally First** - Make sure everything works locally before deploying to Railway.

---

## 🎉 Success!

If all tests pass, your AI services are now running on Railway! 

Your testimonies will now:
- ✅ Get transcribed automatically
- ✅ Generate embeddings
- ✅ Create AI-powered connections
- ✅ Work in production! 🚀

---

## 📞 Need Help?

- Check Railway logs for error messages
- Verify all URLs and environment variables
- Make sure all services are running (green checkmarks)
- Test each service individually using `/health` endpoints

Good luck! 🍀

