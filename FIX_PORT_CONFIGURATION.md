# Fix Port Configuration - Important!

## ❌ The Problem

You changed ports, but there's confusion about which service should use which port.

---

## ✅ Correct Port Configuration

### Ollama Service
- **Port:** `11434` (Ollama's default port - DON'T CHANGE THIS!)
- **OLLAMA_HOST:** `0.0.0.0:11434` ✅
- **Why:** Ollama always runs on port 11434 - this is fixed!

### Embedding Server
- **Port:** `8080` (or whatever Railway sets via `PORT` env var)
- **Uses:** `process.env.PORT || 8085` (Railway will set PORT automatically)
- **Why:** Railway sets PORT automatically - your code should use it

---

## 🔧 What to Fix

### 1. Ollama Service - Keep Port 11434

**Ollama MUST stay on port 11434!** Don't change it.

**Environment Variables:**
```
OLLAMA_HOST=0.0.0.0:11434  ✅ (Correct)
OLLAMA_ORIGINS=*  ✅
```

**DO NOT change Ollama's port to 8080!** It must be 11434.

### 2. Embedding Server - Use Railway's PORT

**Embedding Server should use whatever PORT Railway sets:**

**Your code (correct):**
```javascript
const PORT = process.env.PORT || 8085;
```

**Railway will automatically:**
- Set `PORT` environment variable
- Usually sets it to `8080` or similar
- Your server should use this value

**In Railway Settings:**
- **Embedding Server** → **Settings** → **Networking**
- **Port:** Should match what Railway set (probably `8080`)
- **Or leave it auto** - Railway will detect it

### 3. Embedding Server OLLAMA_URL

**Should point to Ollama on port 11434:**

```
OLLAMA_URL=http://Ollama:11434
```

Or:
```
OLLAMA_URL=http://ollama.railway.internal:11434
```

**NOT port 8080!** Ollama is always on 11434.

---

## 🎯 Summary

| Service | Port | Why |
|---------|------|-----|
| **Ollama** | `11434` | Fixed - Ollama's default port |
| **Embedding Server** | `8080` (or Railway's PORT) | Railway sets this automatically |
| **Transcription Server** | `8084` (or Railway's PORT) | Railway sets this automatically |

---

## ✅ Quick Fix Checklist

### Ollama Service:
- [ ] `OLLAMA_HOST=0.0.0.0:11434` (port 11434, not 8080!)
- [ ] `OLLAMA_ORIGINS=*`
- [ ] Port in Railway settings: `11434` (if configurable)

### Embedding Server:
- [ ] `OLLAMA_URL=http://Ollama:11434` (port 11434, not 8080!)
- [ ] Port in Railway settings: `8080` (or auto-detect)
- [ ] Code uses `process.env.PORT` ✅

---

## 🐛 If You Changed Ollama Port

**If you changed Ollama to port 8080, change it back:**

1. **Ollama service** → **Settings** → **Environment Variables**
2. **Set:** `OLLAMA_HOST=0.0.0.0:11434`
3. **Redeploy Ollama**

**Ollama MUST be on 11434!** It's hardcoded in Ollama.

---

## 📝 Correct Configuration

### Ollama:
```
OLLAMA_HOST=0.0.0.0:11434
OLLAMA_ORIGINS=*
```

### Embedding Server:
```
OLLAMA_URL=http://Ollama:11434
PORT=8080 (set by Railway automatically)
```

---

**Ollama = 11434 (fixed), Embedding Server = 8080 (Railway sets it)** 🚀

