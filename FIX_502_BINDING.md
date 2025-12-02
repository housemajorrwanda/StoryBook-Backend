# Fix 502 Error - Server Binding Issue

## ❌ The Problem

Your embedding server is binding to `localhost` only, but Railway's public domain needs it to bind to `0.0.0.0` to be accessible.

**Current code:**
```javascript
app.listen(PORT, () => { ... })  // Binds to localhost only
```

**This causes 502 errors** because Railway's public domain can't reach localhost!

---

## ✅ The Fix

I've updated the code to bind to `0.0.0.0`:

```javascript
app.listen(PORT, '0.0.0.0', () => { ... })  // Binds to all interfaces
```

---

## 🚀 Next Steps

1. **Push the updated code to GitHub:**
   ```bash
   git add local-ai-services/railway-embedding/embedding-server.js
   git commit -m "Fix: Bind embedding server to 0.0.0.0 for Railway"
   git push
   ```

2. **Railway will auto-redeploy** when it detects the push

3. **Wait for deployment** (1-2 minutes)

4. **Test again:**
   ```bash
   curl https://grand-truth-production-ca4e.up.railway.app/health
   ```

---

## 🔍 Why This Happens

- **`localhost`** = Only accessible from within the container
- **`0.0.0.0`** = Accessible from outside (Railway's public domain)

Railway's public domain needs to reach your service from outside the container, so it must bind to `0.0.0.0`.

---

## ✅ After Fix

Once redeployed, you should see:
- ✅ `/health` endpoint returns 200 OK
- ✅ `/` endpoint returns service info
- ✅ No more 502 errors
- ✅ Embedding server accessible via public domain

---

**The code is fixed! Just push and redeploy.** 🚀

