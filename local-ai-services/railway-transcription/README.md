# Transcription Server - Railway Deployment

This folder contains the transcription server for Railway deployment.

## 🚀 Quick Deploy

1. **Create new Railway service**
2. **Connect this folder** (or push to GitHub and connect repo)
3. **Set environment variables:**
   - `WHISPER_MODEL` = `large-v3` (or `base` for faster startup)
   - `WHISPER_COMPUTE_TYPE` = `int8`
4. **Deploy!**

⚠️ **First deployment downloads ~3GB model** - takes 5-10 minutes!

## 📋 Files

- `transcription-server.py` - Main server file
- `requirements.txt` - Python dependencies
- `railway.json` - Railway configuration
- `nixpacks.toml` - Build configuration

## 🔗 After Deployment

Update your main app's environment variable:
```env
AI_TRANSCRIBE_URL=https://your-service.up.railway.app/transcribe
```

