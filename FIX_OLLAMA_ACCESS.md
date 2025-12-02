# Fix Ollama Access - Step by Step

Your URL: `https://ollama-production-9280.up.railway.app/`

The 502 error means the HTTPS domain can't reach Ollama's port 11434.

---

## 🔍 Step 1: Check Railway Networking Settings

1. Go to your **Ollama service** on Railway
2. Click **"Settings"** tab
3. Scroll to **"Networking"** section
4. **Check these:**

   - **Port:** Should show `11434`
   - **Is there a "Generate Domain" button?** - Click it if available
   - **Is there an "Expose Port" toggle?** - Enable it

---

## 🚀 Step 2: Use Railway CLI (Most Reliable)

This is the best way since HTTP API isn't working.

### Install Railway CLI:

```bash
npm i -g @railway/cli
```

### Login:

```bash
railway login
```

### Link to your project:

```bash
cd /Users/apple/Desktop/housemajor
railway link
```

Select your Railway project.

### Download the model:

```bash
railway run --service ollama ollama pull nomic-embed-text
```

**Or open a shell:**

```bash
railway shell --service ollama
```

Then run:
```bash
ollama pull nomic-embed-text
```

---

## 🔧 Step 3: Check Ollama Environment Variables

Make sure Ollama is configured correctly:

1. Go to **Ollama service** → **Settings** → **Environment Variables**
2. Check:
   - `OLLAMA_HOST` = `0.0.0.0:11434`
   - `OLLAMA_ORIGINS` = `*`

---

## 💡 Why HTTPS Public Domain Doesn't Work

Railway's public HTTPS domains (like `ollama-production-9280.up.railway.app`) typically:
- Only work on ports 80/443 (standard HTTP/HTTPS)
- Don't automatically route to custom ports like 11434
- Need special configuration for custom ports

**Solutions:**
1. ✅ Use Railway CLI (recommended)
2. ✅ Use internal service networking (for other services in same project)
3. ⚠️ Configure port forwarding (complex)

---

## 🎯 Quick Action Items

1. **Install Railway CLI:** `npm i -g @railway/cli`
2. **Login:** `railway login`
3. **Link project:** `railway link`
4. **Download model:** `railway run --service ollama ollama pull nomic-embed-text`

This should work! 🚀

---

## 📝 For Embedding Server Connection

When you create the Embedding Server, use Railway's internal networking:

**In Embedding Server environment variables:**

```
OLLAMA_URL=http://${{Ollama.RAILWAY_PRIVATE_DOMAIN}}:11434
```

Or if Railway doesn't support that syntax:

```
OLLAMA_URL=http://ollama:11434
```

This uses Railway's internal service-to-service networking, which is faster and more reliable than public domains!

---

**Start with Railway CLI - it's the easiest solution!** ✅

