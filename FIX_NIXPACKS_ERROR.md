# Fix Nixpacks Build Error - Transcription Server

## ❌ The Error

```
error: undefined variable 'pip'
at /app/.nixpacks/nixpkgs-bc8f8d1be58e8c8383e683a06e1e1e57893fff87.nix:19:9:
   19|         pip python3
         |         ^
```

**Problem:** Nixpacks doesn't recognize `pip` as a standalone package in Nix.

---

## ✅ The Fix

I've updated `nixpacks.toml` to use the correct Nix package name:

**Changed from:**
```toml
nixPkgs = ["python3", "pip"]
```

**To:**
```toml
nixPkgs = ["python3", "python3Packages.pip"]
```

And changed `pip` to `pip3` in the install command.

---

## 🚀 Next Steps

1. **The fix is already applied** in `nixpacks.toml`
2. **Push the changes:**
   ```bash
   git add local-ai-services/railway-transcription/nixpacks.toml
   git commit -m "Fix: Use correct Nix package name for pip"
   git push
   ```
3. **Railway will auto-redeploy** with the fix
4. **Wait for deployment** (5-10 minutes for model download)

---

## 🐛 Alternative: Use Dockerfile Instead

If Nixpacks continues to have issues, you can use a Dockerfile instead:

**Create `Dockerfile` in `local-ai-services/railway-transcription/`:**

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY transcription-server.py .

EXPOSE 8084

CMD ["python3", "transcription-server.py"]
```

Then update `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "python3 transcription-server.py",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## ✅ After Fix

Once redeployed, you should see:
- ✅ Python packages installing
- ✅ Whisper model downloading
- ✅ Server starting successfully

---

**The nixpacks.toml is fixed! Push and redeploy.** 🚀

