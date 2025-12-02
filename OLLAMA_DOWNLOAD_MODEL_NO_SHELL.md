# Download Ollama Model Without Shell Access

Since Railway doesn't show a shell option, here are alternative methods:

---

## 🚀 Method 1: Use Ollama HTTP API (Easiest)

You can download models using HTTP requests directly!

### Step 1: Get Your Ollama Service URL

1. Go to **Ollama service** on Railway
2. Go to **Settings** → **Networking**
3. Copy the **Public Domain** URL (e.g., `ollama-production-xxxx.up.railway.app`)
4. **Save this URL!**

### Step 2: Download Model Using curl or Browser

**Option A: Using curl (Terminal)**

Open your terminal and run:

```bash
curl http://your-ollama-url.up.railway.app:11434/api/pull -d '{
  "name": "nomic-embed-text"
}'
```

Replace `your-ollama-url.up.railway.app` with your actual Ollama URL.

**Option B: Using Browser/Postman**

1. **URL:** `http://your-ollama-url.up.railway.app:11434/api/pull`
2. **Method:** POST
3. **Headers:** `Content-Type: application/json`
4. **Body:**
   ```json
   {
     "name": "nomic-embed-text"
   }
   ```
5. Click **Send**

**Option C: Using Browser (Simple GET - if API supports it)**

Try opening in browser:
```
http://your-ollama-url.up.railway.app:11434/api/pull?name=nomic-embed-text
```

### Step 3: Monitor Download Progress

You'll see output like:
```json
{"status":"pulling manifest"}
{"status":"downloading digest","digest":"..."}
{"completed":10,"total":274}
{"completed":50,"total":274}
{"completed":100,"total":274}
{"status":"success"}
```

### Step 4: Verify Model is Downloaded

**Check installed models:**
```bash
curl http://your-ollama-url.up.railway.app:11434/api/tags
```

Or open in browser:
```
http://your-ollama-url.up.railway.app:11434/api/tags
```

You should see:
```json
{
  "models": [
    {
      "name": "nomic-embed-text",
      "size": 287965823,
      ...
    }
  ]
}
```

---

## 🚀 Method 2: Use Railway CLI

### Step 1: Install Railway CLI

```bash
npm i -g @railway/cli
```

Or using Homebrew (Mac):
```bash
brew install railway
```

### Step 2: Login

```bash
railway login
```

This opens a browser for authentication.

### Step 3: Link to Your Project

```bash
railway link
```

Select your project and service (Ollama).

### Step 4: Open Shell

```bash
railway shell
```

Select your Ollama service, then run:

```bash
ollama pull nomic-embed-text
```

---

## 🚀 Method 3: Create Startup Script (Automatic Download)

Create a script that downloads the model when the service starts!

### Step 1: Create a Startup Script

Create a file `download-model.sh` in your Ollama service:

```bash
#!/bin/bash

# Wait for Ollama to start
sleep 10

# Download the model
ollama pull nomic-embed-text

echo "Model downloaded successfully!"
```

### Step 2: Make it Executable

In Railway, you can add this as a startup command, OR create a Dockerfile that runs this script.

However, **Railway's Ollama plugin might not support this easily**. Better to use Method 1 (HTTP API).

---

## 🚀 Method 4: Use Railway's One-Click Script Runner

Some Railway services have a "Run Command" feature:

1. Go to your Ollama service
2. Look for **"Run Command"** or **"Execute"** button
3. If available, run: `ollama pull nomic-embed-text`

---

## ✅ Recommended: Method 1 (HTTP API)

**This is the easiest and works 100% of the time!**

### Quick Steps:

1. **Get Ollama URL:** Settings → Networking → Public Domain
2. **Run this in terminal:**
   ```bash
   curl -X POST http://YOUR-OLLAMA-URL:11434/api/pull \
     -H "Content-Type: application/json" \
     -d '{"name":"nomic-embed-text"}'
   ```
3. **Wait 1-2 minutes** (watch the progress)
4. **Verify:**
   ```bash
   curl http://YOUR-OLLAMA-URL:11434/api/tags
   ```

---

## 🧪 Test After Download

Once downloaded, test the model works:

```bash
curl -X POST http://YOUR-OLLAMA-URL:11434/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nomic-embed-text",
    "prompt": "test embedding"
  }'
```

You should get back an embedding vector (array of numbers).

---

## 🐛 Troubleshooting

### Problem: curl command times out
- Check that Ollama URL is correct
- Make sure Ollama service is running
- Try using `https://` instead of `http://`
- Check if port 11434 is exposed

### Problem: "Connection refused"
- Ollama might not be fully started yet
- Wait a minute and try again
- Check Railway logs to see if Ollama is running

### Problem: Model download is slow
- This is normal - model is ~274 MB
- Can take 1-3 minutes depending on connection
- Just wait for it to complete

### Problem: Can't find Public Domain
- Go to Settings → Networking
- Enable "Generate Domain" if not enabled
- Or use the internal service name

---

## 📝 Quick Reference

**Download model:**
```bash
curl -X POST http://your-ollama-url:11434/api/pull \
  -H "Content-Type: application/json" \
  -d '{"name":"nomic-embed-text"}'
```

**Check models:**
```bash
curl http://your-ollama-url:11434/api/tags
```

**Test embedding:**
```bash
curl -X POST http://your-ollama-url:11434/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"nomic-embed-text","prompt":"test"}'
```

---

**Method 1 (HTTP API) is your best bet!** It works from anywhere - your terminal, browser, or even Postman. 🚀

