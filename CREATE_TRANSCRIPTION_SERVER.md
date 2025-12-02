# Create Transcription Server Service on Railway

## 📋 Prerequisites

✅ Ollama service is running
✅ Embedding Server is created
✅ Database connection is working
✅ Transcription server files are ready in `local-ai-services/railway-transcription/`

---

## 🚀 Step-by-Step: Create Transcription Server

### Step 1: Create New Service

1. **Go to your Railway project** (the same one with Ollama and Embedding Server)
2. Click the **"+ New"** button (top right)
3. Click **"GitHub Repo"** (or "Empty Service" if you want to upload files manually)

### Step 2: Connect Repository

**Option A: If using GitHub (Recommended)**

1. **Select your repository** from the list
2. Railway asks: **"Select the root directory for your service"**
3. **Click "Change"** or **"Browse"**
4. Navigate to: `local-ai-services/railway-transcription`
5. **Select that folder**
6. Click **"Deploy"**

**Option B: If uploading manually**

1. Click **"Empty Service"**
2. Go to **"Settings"** → **"Source"**
3. Click **"Connect GitHub"** and select your repo
4. Or use **"Upload Files"** to upload the folder directly

### Step 3: Verify Files are Present

Make sure these files exist in the service:
- ✅ `transcription-server.py`
- ✅ `requirements.txt`
- ✅ `railway.json`
- ✅ `nixpacks.toml`

**To check:**
1. Go to **"Settings"** → **"Source"**
2. Verify the folder path is: `local-ai-services/railway-transcription`

### Step 4: Configure Environment Variables

1. **Click on the Transcription Server service**
2. Go to **"Settings"** tab
3. Scroll to **"Environment Variables"**
4. Click **"+ New Variable"** and add:

   **Variable 1:**
   - **Name:** `WHISPER_MODEL`
   - **Value:** `large-v3`
   - Click **"Add"**

   **Variable 2:**
   - **Name:** `WHISPER_COMPUTE_TYPE`
   - **Value:** `int8`
   - Click **"Add"**

   **Note:** You can use `base` instead of `large-v3` for faster startup and less memory usage.

### Step 5: Deploy (This Takes Time!)

1. Railway will start building
2. **⚠️ First deployment takes 5-10 minutes!**
   - It downloads the Whisper model (~3GB for large-v3)
   - Python packages are installed
   - Be patient, this is normal!
3. Watch the logs in **"Deployments"** tab
4. You'll see:
   - Python installing packages
   - Model downloading progress
   - Server starting
5. Wait for green checkmark ✅

### Step 6: Get Transcription Server URL

1. Go to **"Settings"** → **"Networking"**
2. Find **"Public Domain"** 
3. Copy the URL (e.g., `transcription-production-xxxx.up.railway.app`)
4. **Save this URL!** You'll need it for your main app

### Step 7: Test the Service

1. **Open a new browser tab**
2. Go to: `https://your-transcription-url.up.railway.app/health`
3. **You should see:**
   ```json
   {
     "status": "ok",
     "service": "transcription-server",
     "model": "large-v3",
     "compute_type": "int8"
   }
   ```
4. **If you see this, it's working!** ✅

---

## 📝 Environment Variables Summary

### Transcription Server Service:

| Variable | Value | Purpose |
|----------|-------|---------|
| `WHISPER_MODEL` | `large-v3` | Whisper model to use (or `base` for faster startup) |
| `WHISPER_COMPUTE_TYPE` | `int8` | CPU computation type |

**For faster startup, use:**
```
WHISPER_MODEL=base
WHISPER_COMPUTE_TYPE=int8
```

---

## ✅ Checklist

Before moving to next step, verify:

- [ ] Transcription Server service created
- [ ] Files deployed (transcription-server.py, requirements.txt, railway.json, nixpacks.toml)
- [ ] `WHISPER_MODEL` environment variable set
- [ ] `WHISPER_COMPUTE_TYPE` environment variable set
- [ ] Service deployed successfully (green checkmark)
- [ ] Health check works: `/health` endpoint returns `{"status":"ok"}`
- [ ] Saved the Transcription Server URL

---

## 🐛 Troubleshooting

### Problem: Service won't start

**Solution:**
- Check logs in "Deployments" tab
- Verify Python version (should be 3.8+)
- Check `requirements.txt` is correct
- First deployment takes 5-10 minutes (model download)

### Problem: Model download fails

**Solution:**
- Check Railway logs for errors
- Try smaller model first: `WHISPER_MODEL=base`
- Verify service has enough resources
- Check internet connectivity

### Problem: Health check fails

**Solution:**
- Check Railway logs for errors
- Verify server is binding to `0.0.0.0` (we fixed this in embedding server)
- Check port configuration

### Problem: Out of memory

**Solution:**
- Use smaller model: `WHISPER_MODEL=base` or `small`
- Upgrade Railway plan for more resources
- `large-v3` needs ~4-6GB RAM when processing

---

## 🎯 Next Steps After Transcription Server is Ready

Once the Transcription Server is working:

1. **Update Main App Environment Variables:**
   - `AI_TRANSCRIBE_URL` = Your transcription service URL
   - `AI_TRANSCRIBE_MODEL` = `large-v3` (or whatever model you used)

2. **Test AI Processing:**
   - Create a testimony with audio/video
   - Approve it as admin
   - Check logs for transcription
   - Verify embeddings are generated
   - Check connections are created

---

## 💡 Model Size Comparison

| Model | Size | RAM Usage | Speed | Quality |
|-------|------|-----------|-------|---------|
| `base` | ~150 MB | ~1 GB | Fast | Good |
| `small` | ~500 MB | ~2 GB | Medium | Better |
| `medium` | ~1.5 GB | ~3-4 GB | Slow | Great |
| `large-v3` | ~3 GB | ~4-6 GB | Slowest | Best |

**Recommendation for Railway:**
- Start with `base` for testing (faster, less resources)
- Use `large-v3` for production (best quality)

---

**Your Transcription Server should be ready in 5-10 minutes!** 🚀

