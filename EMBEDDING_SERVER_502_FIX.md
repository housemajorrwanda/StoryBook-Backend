# Fix 502 Error on Embedding Server

## ❌ The Problem

You're getting **502 errors** when accessing the embedding server, even though the server is running.

**Symptoms:**
- Server logs show: `✅ Embedding server running on http://localhost:8080`
- But accessing `/health` returns 502
- This is a **Railway routing issue**, not your code

---

## ✅ Solutions

### Solution 1: Check Railway Service Settings

1. **Go to Embedding Server** → **Settings** → **Networking**
2. **Check these:**
   - **Port:** Should be `8080` (or whatever PORT Railway set)
   - **Is "Generate Domain" enabled?** - Make sure it's ON
   - **Is there a "Public Domain" listed?** - Should show your URL

### Solution 2: Verify Port Configuration

Railway automatically sets `PORT` environment variable. Your server uses:
```javascript
const PORT = process.env.PORT || 8085;
```

**Check Railway logs** - it should show which port Railway assigned (looks like it's 8080).

### Solution 3: Test Internal Connection

The embedding server might not be able to reach Ollama. Test this:

1. **Check Embedding Server logs** for connection errors
2. **Look for:** `❌ Error embedding text` or connection timeouts

### Solution 4: Verify Service Names

Make sure the Ollama service name in Railway is exactly `ollama`:

1. **Go to Ollama service** → **Settings** → **General**
2. **Check the service name** - should be `ollama` (case-sensitive)
3. **If it's different**, update `OLLAMA_URL` in Embedding Server to match

---

## 🔍 Debugging Steps

### Step 1: Check Embedding Server Logs

In Railway, go to **Embedding Server** → **Deployments** → **View Logs**

Look for:
- ✅ Server started successfully
- ❌ Any connection errors to Ollama
- ❌ Any port binding errors

### Step 2: Test Ollama Connection from Embedding Server

The embedding server should be able to reach Ollama. If it can't, you'll see errors when trying to generate embeddings.

### Step 3: Check Railway Networking

1. **Embedding Server** → **Settings** → **Networking**
   - Port should match what the server is listening on
   - Public domain should be generated

2. **Ollama Service** → **Settings** → **Networking**
   - Should be accessible internally

---

## 🎯 Most Likely Causes

### Cause 1: Port Mismatch
- Railway expects port 8080
- But server might be on different port
- **Fix:** Railway sets `PORT` automatically - your code should use it ✅

### Cause 2: Service Name Wrong
- `OLLAMA_URL="http://ollama:11434"` assumes service name is `ollama`
- If Railway service name is different, connection fails
- **Fix:** Check actual service name in Railway

### Cause 3: Railway Routing Issue
- Public domain not properly configured
- **Fix:** Regenerate domain or check networking settings

---

## ✅ Quick Fix Checklist

- [ ] Embedding Server is running (logs show it started)
- [ ] Port matches Railway's PORT environment variable
- [ ] Ollama service name is exactly `ollama` (case-sensitive)
- [ ] `OLLAMA_URL="http://ollama:11434"` matches service name
- [ ] Public domain is generated in Railway
- [ ] No connection errors in Embedding Server logs

---

## 🧪 Test Commands

### Test Embedding Server Health (from your computer)

```bash
curl https://grand-truth-production-ca4e.up.railway.app/health
```

### Test Ollama Connection (from Railway CLI)

```bash
railway run --service embedding-server curl http://ollama:11434/api/tags
```

This tests if the embedding server can reach Ollama.

---

## 💡 Alternative: Use Railway Variable Reference

Instead of hardcoding `http://ollama:11434`, try using Railway's variable reference:

```
OLLAMA_URL=http://${{Ollama.RAILWAY_PRIVATE_DOMAIN}}:11434
```

Or check what Railway provides for service-to-service communication.

---

## 🐛 If Still Not Working

1. **Check Railway service logs** for both Embedding Server and Ollama
2. **Verify service names** match exactly
3. **Try using Railway's internal networking** with variable references
4. **Check Railway documentation** for service-to-service communication

The 502 error is usually a Railway networking/routing issue, not your code! 🚀

