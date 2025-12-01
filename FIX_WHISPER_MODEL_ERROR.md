# Fix: "lookup faster-whisper-large-v3::: no such host" Error

## ❌ The Problem

The error occurs because the model name `faster-whisper-large-v3` is incorrect. 

**Faster Whisper uses model names like:**
- `large-v3` ✅
- `base` ✅
- `small` ✅
- `medium` ✅

**NOT:**
- `faster-whisper-large-v3` ❌

## ✅ The Fix

### For Railway Deployment

1. **In your Transcription Server environment variables:**
   - `WHISPER_MODEL` should be: `large-v3` (NOT `faster-whisper-large-v3`)

2. **In your main app environment variables:**
   - `AI_TRANSCRIBE_MODEL` should be: `large-v3` (or remove it - the server uses its own config)

### What I Fixed

✅ Changed default model name from `faster-whisper-large-v3` to `large-v3` in:
- `src/ai-processing/transcription.service.ts`

✅ Removed model parameter from request (server uses model loaded at startup)

✅ Updated transcription servers to ignore model parameter

## 🔧 Quick Fix Steps

### Step 1: Update Transcription Server Environment Variable

1. Go to your **Transcription Server** on Railway
2. Go to **Settings** → **Environment Variables**
3. Find `WHISPER_MODEL`
4. Change value from `faster-whisper-large-v3` to `large-v3`
5. Save/Redeploy

### Step 2: Update Main App Environment Variable (Optional)

1. Go to your **Main App** on Railway
2. Go to **Variables** tab
3. Find `AI_TRANSCRIBE_MODEL`
4. Either:
   - Change value to `large-v3`, OR
   - Delete the variable (server uses its own config anyway)
5. Redeploy

### Step 3: Redeploy Services

1. Redeploy Transcription Server
2. Redeploy Main App
3. Test again

## ✅ Correct Environment Variables

### Transcription Server:
```
WHISPER_MODEL=large-v3
WHISPER_COMPUTE_TYPE=int8
```

### Main App:
```
AI_TRANSCRIBE_URL=https://your-transcription-service.up.railway.app/transcribe
AI_TRANSCRIBE_MODEL=large-v3  (optional - server uses its own config)
```

## 🧪 Test After Fix

1. Check transcription server health:
   ```bash
   curl https://your-transcription-url/health
   ```

2. Should return:
   ```json
   {
     "status": "ok",
     "service": "transcription-server",
     "model": "large-v3",
     "compute_type": "int8"
   }
   ```

3. Create a testimony with audio/video
4. Approve it as admin
5. Check logs - should see successful transcription

## 📝 Available Whisper Models

If `large-v3` is too slow or uses too much memory, try smaller models:

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| `base` | Small | Fast | Good |
| `small` | Medium | Medium | Better |
| `medium` | Large | Slow | Great |
| `large-v3` | Largest | Slowest | Best |

For Railway (CPU only), recommended:
- `base` - Fastest, least resources
- `small` - Good balance
- `large-v3` - Best quality (needs more RAM)

---

**The code has been fixed!** Just update your Railway environment variables and redeploy. 🚀

