# Download Ollama Model - Run These Commands

## ✅ Good News!

Your Ollama is **running perfectly**! The logs show:
- ✅ Ollama is listening on port 11434
- ✅ Service is healthy
- ❌ The 499/502 errors are **normal** - just means you can't access it from browser

---

## 🚀 Download the Model Now

**Open your terminal and run these commands:**

### Step 1: Link Your Project (if not already linked)

```bash
cd /Users/apple/Desktop/housemajor
railway link
```

**When prompted:**
- Select your workspace: "Ndizihiwe Nkusi Benny Chrispin's Projects"
- Select your project (the one with Ollama service)

### Step 2: Download the Model

```bash
railway run --service ollama ollama pull nomic-embed-text
```

**This will:**
- Connect to your Ollama service
- Download the `nomic-embed-text` model (~274 MB)
- Take 1-3 minutes

### Step 3: Verify Model is Downloaded

```bash
railway run --service ollama ollama list
```

**You should see:**
```
NAME                SIZE      MODIFIED
nomic-embed-text    274 MB    just now
```

---

## 🎯 Quick Copy-Paste Commands

Run these in order:

```bash
# 1. Go to project directory
cd /Users/apple/Desktop/housemajor

# 2. Link project (select your project when prompted)
railway link

# 3. Download model
railway run --service ollama ollama pull nomic-embed-text

# 4. Verify it worked
railway run --service ollama ollama list
```

---

## 📝 What Those Errors Mean

The **499/502 errors** you're seeing are:
- **499** = Client closed connection (timeout)
- **502** = Bad Gateway (Railway can't route to port 11434)

**This is NORMAL!** Railway's public HTTPS domain doesn't expose custom ports.

**Ollama IS running** - you just need Railway CLI to access it!

---

## ✅ After Model is Downloaded

Once you see `nomic-embed-text` in the list:

1. ✅ Model is ready!
2. ✅ You can create the Embedding Server
3. ✅ Use `http://ollama:11434` for internal connections

---

**Run those commands in your terminal now!** 🚀

