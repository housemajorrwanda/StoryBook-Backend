# How to Set Up Ollama on Railway - Exact Steps

## Step 1: Add Ollama Plugin to Railway

1. **Go to Railway Dashboard**
   - Open https://railway.app
   - Log in to your account

2. **Open Your Project**
   - Click on your project name (the one with your NestJS app)

3. **Add Ollama Plugin**
   - Click the **"+ New"** button (top right of the services list)
   - From the dropdown, click **"Plugin"**
   - In the search box, type: **"Ollama"**
   - Click on **"Ollama"** when it appears
   - Railway will automatically create the service

4. **Wait for Deployment**
   - Wait 2-3 minutes
   - You'll see a green checkmark ✅ when it's ready

## Step 2: Configure Ollama Environment Variables

1. **Click on the Ollama service** in your project list
2. **Go to "Settings" tab**
3. **Scroll to "Environment Variables" section**
4. **Add these variables:**

   **Variable 1: OLLAMA_HOST**
   - **Name:** `OLLAMA_HOST`
   - **Value:** `0.0.0.0:11434`
   - Click **"Add"**

   **Variable 2: OLLAMA_ORIGINS**
   - **Name:** `OLLAMA_ORIGINS`
   - **Value:** `*`
   - Click **"Add"**

   **Why these values?**
   - `OLLAMA_HOST=0.0.0.0:11434` - Allows Ollama to accept connections from other services
   - `OLLAMA_ORIGINS=*` - Allows CORS from all origins (needed for Railway services)

5. **Save/Redeploy** - Railway will automatically redeploy with new variables

## Step 3: Get Ollama Service URL

1. **Still in "Settings" tab**, scroll to **"Networking" section**
2. **Find "Public Domain"** - it looks like: `ollama-production-xxxx.up.railway.app`
3. **Copy this URL** - you'll need it!

**Example URL:** `ollama-production-abc123.up.railway.app`

## Step 4: Download the Model

### Option A: Using Railway Shell (Easiest)

1. **In the Ollama service**, click **"Deployments"** tab
2. **Click on the latest deployment** (the one with green checkmark)
3. **Click "View Logs"** or look for **"Shell"** button
4. **A terminal window opens**
5. **Type this command:**
   ```bash
   ollama pull nomic-embed-text
   ```
6. **Press Enter**
7. **Wait 1-2 minutes** - you'll see download progress
8. **When you see "success"** - the model is downloaded! ✅

### Option B: Using Railway CLI

If you have Railway CLI installed:

1. **Open your terminal**
2. **Run:**
   ```bash
   railway shell
   ```
3. **Select the Ollama service**
4. **Run:**
   ```bash
   ollama pull nomic-embed-text
   ```
5. **Wait for download to complete**

## Step 5: Verify Model is Installed

1. **In the Ollama shell/terminal**, run:
   ```bash
   ollama list
   ```
2. **You should see:**
   ```
   NAME                SIZE
   nomic-embed-text    274 MB
   ```
3. **If you see this, it's working!** ✅

## Step 6: Test Ollama is Working

1. **In the Ollama shell**, test with:
   ```bash
   ollama run nomic-embed-text "test"
   ```
2. **You should see output** - this confirms it's working!

## ✅ Done!

Your Ollama service is now ready with the `nomic-embed-text` model installed!

**Next Steps:**
- Use the Ollama URL in your Embedding Server's `OLLAMA_URL` environment variable
- Format: `http://ollama-production-xxxx.up.railway.app:11434`

---

## 🐛 Troubleshooting

### Problem: Can't find "Plugin" option
- Make sure you're in the project view (not service view)
- Try refreshing the page
- Make sure you have the right Railway plan (some features require paid plans)

### Problem: Ollama service won't start
- Check the logs in "Deployments" tab
- Make sure you have enough resources in your Railway plan
- Try redeploying the service

### Problem: Can't access shell/terminal
- Make sure the deployment is complete (green checkmark)
- Try clicking "View Logs" first, then look for shell option
- Some Railway plans have limited shell access

### Problem: Model download fails
- Check your internet connection
- Try again - sometimes downloads can timeout
- Check Railway logs for error messages
- Make sure you have enough disk space

### Problem: "ollama: command not found"
- The Ollama plugin should include Ollama automatically
- If not, you may need to deploy Ollama manually (see Option B in main guide)

---

## 📝 Quick Reference

### Environment Variables to Set:

| Variable Name | Value | Purpose |
|--------------|-------|---------|
| `OLLAMA_HOST` | `0.0.0.0:11434` | Allows connections from other services |
| `OLLAMA_ORIGINS` | `*` | Allows CORS from all origins |

### Your Information:

**Ollama Service URL:** `_________________________________`

**Model Status:** [ ] Downloaded [ ] Not Downloaded

### Test Commands:

**List installed models:**
```bash
ollama list
```

**Expected Output:**
```
NAME                SIZE
nomic-embed-text    274 MB
```

**Download model:**
```bash
ollama pull nomic-embed-text
```

