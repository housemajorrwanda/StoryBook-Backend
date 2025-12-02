# Ollama URL Troubleshooting

Your Ollama URL: `https://ollama-production-9280.up.railway.app/`

The 502 error means Railway can't route to Ollama's port 11434 directly through HTTPS.

---

## 🔧 Solution: Configure Railway Networking

Railway needs to expose port 11434 properly. Here's how to fix it:

### Option 1: Use Port in URL (If Exposed)

Try accessing with port:
```
https://ollama-production-9280.up.railway.app:11434
```

But Railway public domains typically don't support custom ports directly.

### Option 2: Check Railway Service Settings

1. Go to **Ollama service** → **Settings** → **Networking**
2. Make sure **"Expose Port"** is set to **11434**
3. Check if there's a **"Generate Domain"** option - enable it
4. Railway might create a special domain for port 11434

### Option 3: Use Railway's Internal Networking

If services are in the same Railway project, use internal service name:

```
http://ollama:11434
```

Or use Railway variable:
```
${{Ollama.RAILWAY_PRIVATE_DOMAIN}}:11434
```

### Option 4: Create a Proxy/Reverse Proxy

Create a simple Node.js proxy service that routes HTTPS to Ollama's HTTP port 11434.

---

## 🚀 Quick Fix: Try These URLs

### Test 1: HTTP instead of HTTPS

```bash
curl http://ollama-production-9280.up.railway.app:11434/api/tags
```

### Test 2: Check if Ollama responds

```bash
curl http://ollama-production-9280.up.railway.app/api/tags
```

### Test 3: Use Railway's internal domain

If you have other services in the same project, they can use:
```
http://ollama:11434
```

---

## ✅ Recommended: Use Railway CLI

Since HTTP API isn't working, use Railway CLI:

### Step 1: Install Railway CLI

```bash
npm i -g @railway/cli
```

### Step 2: Login

```bash
railway login
```

### Step 3: Link to Project

```bash
cd /Users/apple/Desktop/housemajor
railway link
```

Select your project.

### Step 4: Run Command in Ollama Service

```bash
railway run --service ollama ollama pull nomic-embed-text
```

Or if that doesn't work:

```bash
railway shell --service ollama
```

Then in the shell:
```bash
ollama pull nomic-embed-text
```

---

## 🔍 Check Railway Service Configuration

Go to Ollama service → Settings → Networking:

1. **Check "Port"** - should be 11434
2. **Check "Expose Port"** - should be enabled
3. **Check if port is publicly accessible**

Railway might not expose port 11434 publicly by default. You may need to:
- Configure port forwarding
- Use Railway's internal networking
- Or use Railway CLI to access the service directly

---

## 💡 Alternative: Download Model on Startup

Since direct HTTP access might not work, you can configure Ollama to auto-download the model.

However, Railway's Ollama plugin might not support this. Better to use Railway CLI method above.

---

**Try Railway CLI first - it's the most reliable way!** 🚀

