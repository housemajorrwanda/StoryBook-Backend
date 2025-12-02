# Download Model in Ollama on Railway

## ✅ Ollama is Running!

Your logs show Ollama is successfully running on port 11434! Now we need to download the embedding model.

---

## 📥 Step 1: Download the Model

### Option A: Using Railway Shell (Recommended)

1. **Go to your Ollama service** on Railway
2. Click **"Deployments"** tab
3. Click on the **latest deployment** (the one that's running)
4. Look for **"Shell"** or **"View Logs"** button
5. Click **"Shell"** - a terminal opens
6. **Type this command:**
   ```bash
   ollama pull nomic-embed-text
   ```
7. **Press Enter**
8. **Wait 1-2 minutes** - you'll see download progress:
   ```
   pulling manifest
   pulling 274 MB / 274 MB [████████████████] 100%
   pulling d9c2... 
   pulling 5b4a...
   verifying sha256 digest
   writing manifest
   success
   ```

### Option B: Using Railway CLI

If you have Railway CLI installed locally:

1. **Open your terminal**
2. **Run:**
   ```bash
   railway shell
   ```
3. **Select your Ollama service** from the list
4. **Run:**
   ```bash
   ollama pull nomic-embed-text
   ```
5. **Wait for download**

---

## ✅ Step 2: Verify Model is Installed

In the same shell/terminal, run:

```bash
ollama list
```

**You should see:**
```
NAME                SIZE      MODIFIED
nomic-embed-text    274 MB    just now
```

If you see this, the model is installed! ✅

---

## 🧪 Step 3: Test the Model

Test that the model works:

```bash
ollama run nomic-embed-text "test embedding"
```

You should see some output (the model will generate embeddings).

---

## 📝 Quick Reference

**Download command:**
```bash
ollama pull nomic-embed-text
```

**Check installed models:**
```bash
ollama list
```

**Test model:**
```bash
ollama run nomic-embed-text "test"
```

---

## 🐛 Troubleshooting

### Problem: Can't find Shell button
- Make sure the deployment is running (green checkmark)
- Try refreshing the page
- Look for "View Logs" first, then Shell option

### Problem: Model download fails
- Check your internet connection
- Try again - downloads can timeout
- Make sure Ollama service has enough resources

### Problem: "ollama: command not found"
- The Ollama plugin should include Ollama automatically
- Try restarting the service

---

Once the model is downloaded, you're ready to create the Embedding Server! 🚀

