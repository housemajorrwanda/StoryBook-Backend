# Fix: Service Name Case Sensitivity

## ❌ The Problem

Your Ollama service is named **"Ollama"** (capital O) in Railway, but your Embedding Server is trying to connect to **"ollama"** (lowercase).

**Railway service names are case-sensitive for internal networking!**

---

## ✅ The Fix

### Update Embedding Server Environment Variable

1. **Go to Embedding Server** → **Settings** → **Environment Variables**
2. **Find `OLLAMA_URL`**
3. **Change from:**
   ```
   http://ollama:11434
   ```
4. **To:**
   ```
   http://Ollama:11434
   ```
   (Capital O to match the service name)

5. **Save/Redeploy**

---

## 🎯 Alternative: Use Railway Variable Reference

Instead of hardcoding the service name, you can use Railway's variable reference:

```
OLLAMA_URL=http://${{Ollama.RAILWAY_PRIVATE_DOMAIN}}:11434
```

This automatically uses the correct service name regardless of case!

---

## 📝 Quick Steps

1. **Embedding Server** → **Settings** → **Environment Variables**
2. **Update `OLLAMA_URL`** to: `http://Ollama:11434`
3. **Save/Redeploy**
4. **Test:** The `/health` endpoint should now work, and embeddings should connect to Ollama!

---

## ✅ After Fix

Once you update the service name, the Embedding Server should be able to:
- ✅ Connect to Ollama successfully
- ✅ Generate embeddings
- ✅ Return proper responses instead of 502 errors

---

**This is likely why you're getting 502 errors - the service name doesn't match!** 🚀

