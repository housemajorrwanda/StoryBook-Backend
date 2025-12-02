# Fix Transcription Server Healthcheck Failure

## ❌ The Problem

Transcription server healthcheck is failing:
- "service unavailable"
- "1/1 replicas never became healthy!"

**This is happening because:**
1. **Whisper model is downloading** (takes 5-10 minutes for `large-v3`)
2. **Model is loading into memory** (takes 1-2 minutes)
3. **Healthcheck timeout is too short** (default is probably 100ms or 5s)

---

## ✅ The Fix

I've updated `railway.json` to:
- Set `healthcheckPath: "/health"`
- Set `healthcheckTimeout: 600` (10 minutes - enough for model download)

---

## 🎯 Why This Happens

### Model Download Time

**Whisper `large-v3` model:**
- Size: ~3 GB
- Download time: 5-10 minutes (depending on connection)
- Load time: 1-2 minutes

**During this time:**
- Server is starting
- Model is downloading
- Healthcheck fails because server isn't ready yet

### Solution Options

**Option 1: Increase Healthcheck Timeout (What I Did)**
- Set timeout to 600 seconds (10 minutes)
- Gives enough time for model download and loading

**Option 2: Use Smaller Model (Faster Startup)**
- Change `WHISPER_MODEL=base` (downloads in ~1 minute)
- Then upgrade to `large-v3` later if needed

**Option 3: Disable Healthcheck Temporarily**
- Remove healthcheck during initial deployment
- Re-enable after model is downloaded

---

## 🚀 Next Steps

1. **Push the updated railway.json:**
   ```bash
   git add local-ai-services/railway-transcription/railway.json
   git commit -m "Fix: Increase healthcheck timeout for model download"
   git push
   ```

2. **Or use smaller model for faster startup:**
   - Go to Transcription Server → Variables
   - Change `WHISPER_MODEL=base` (instead of `large-v3`)
   - Redeploy

3. **Wait for deployment:**
   - With `large-v3`: 5-10 minutes
   - With `base`: 1-2 minutes

---

## 📊 Model Comparison

| Model | Download Time | RAM Usage | Quality |
|-------|---------------|-----------|---------|
| `base` | ~1 min | ~1 GB | Good |
| `small` | ~2 min | ~2 GB | Better |
| `large-v3` | ~5-10 min | ~4-6 GB | Best |

**For testing:** Use `base` first, then switch to `large-v3` for production.

---

## 🐛 If Still Failing

### Check Transcription Server Logs

1. **Go to Transcription Server** → **Deployments** → **View Logs**
2. **Look for:**
   - ✅ "Loading Whisper model..."
   - ✅ "Model loaded successfully!"
   - ✅ "Starting transcription server..."
   - ❌ Any Python errors
   - ❌ Import errors
   - ❌ Model download failures

### Common Issues

**Problem: Model download fails**
- Check internet connectivity
- Try smaller model first
- Check Railway resource limits

**Problem: Out of memory**
- Use smaller model (`base` or `small`)
- Upgrade Railway plan
- Check resource limits

**Problem: Python import errors**
- Check `requirements.txt` is correct
- Verify all packages install successfully
- Check logs for specific error

---

## ✅ After Model Downloads

Once the model is downloaded and loaded, you should see:
- ✅ Healthcheck passes
- ✅ `/health` endpoint returns 200 OK
- ✅ Server ready to transcribe

---

**The healthcheck timeout is now increased. Push and redeploy!** 🚀

