# Fix 502 Error - Railway Networking Issue

## ✅ Good News

Your server IS binding correctly:
- ✅ `Embedding server running on http://0.0.0.0:8080`
- ✅ Code fix is deployed

But still getting 502 errors = **Railway networking/routing issue**

---

## 🔍 The Problem

Railway's public domain might not be routing to port 8080 correctly. This can happen when:
1. Port isn't explicitly configured in Railway
2. Railway expects a different port
3. Health check is failing
4. Service networking not properly set up

---

## ✅ Solutions to Try

### Solution 1: Check Railway Port Configuration

1. **Go to Embedding Server** → **Settings** → **Networking**
2. **Check "Port" field:**
   - Should be `8080` (or whatever PORT Railway set)
   - If it's different, update it to match
3. **Check "Generate Domain":**
   - Should be enabled
   - If not, enable it

### Solution 2: Verify PORT Environment Variable

Railway automatically sets `PORT`. Your server uses:
```javascript
const PORT = process.env.PORT || 8085;
```

**Check what PORT Railway is actually setting:**
1. **Go to Embedding Server** → **Variables**
2. **Look for `PORT` variable**
3. **Note the value** (might be different from 8080)

### Solution 3: Add Explicit Port Configuration

Update `railway.json` to specify the port:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  },
  "healthcheckPath": "/health",
  "healthcheckTimeout": 100,
  "rewrite": false
}
```

Railway should auto-detect the port, but you can also check Railway dashboard settings.

### Solution 4: Check Health Check

1. **Go to Embedding Server** → **Settings** → **Deploy**
2. **Check health check configuration:**
   - Path: `/health`
   - Timeout: Should be reasonable (100ms might be too short)
   - Try increasing to 5000ms

### Solution 5: Test Internal Connection

Test if the service is accessible internally:

```bash
railway run --service embedding-server curl http://localhost:8080/health
```

If this works, the service is fine - it's just Railway's public domain routing.

---

## 🎯 Most Likely Fix

**Check Railway Settings → Networking:**

1. **Port** should match what your server is listening on (8080)
2. **Public Domain** should be generated
3. **If port is wrong, update it**

---

## 🧪 Debug Steps

### Step 1: Check What Port Railway Expects

1. **Embedding Server** → **Settings** → **Networking**
2. **Note the "Port" value**
3. **Compare with server logs** (should match)

### Step 2: Check Environment Variables

1. **Embedding Server** → **Variables**
2. **Look for `PORT` variable**
3. **Check its value**

### Step 3: Test from Inside Container

```bash
railway run --service embedding-server curl http://localhost:8080/health
```

If this works, service is fine - it's Railway routing.

---

## 💡 Alternative: Use Railway's Internal URL

If public domain keeps having issues, you can test using Railway's internal networking from another service:

```
http://embedding-server:8080/health
```

But for your main app, you'll need the public domain to work.

---

## 🐛 If Nothing Works

1. **Try redeploying** the service
2. **Check Railway status page** for any issues
3. **Contact Railway support** - this might be a platform issue
4. **Try creating a new service** and see if it works

---

**Check Railway Settings → Networking first - that's usually the issue!** 🚀

