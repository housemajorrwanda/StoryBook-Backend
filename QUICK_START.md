# Quick Start - Run AI Models Locally

## ✅ What's Already Done

1. ✅ Ollama is installed and running
2. ✅ Embedding model (`nomic-embed-text`) is downloaded
3. ✅ Embedding server files are ready
4. ✅ Dependencies installed

## 🚀 Next Steps

### Step 1: Start the Embedding Server

Open a new terminal and run:

```bash
cd /Users/apple/Desktop/housemajor/local-ai-services
node embedding-server.js
```

You should see:
```
✅ Embedding server running on http://localhost:8085
```

### Step 2: Update Your `.env` File

Add these lines to your `.env` file:

```env
# AI Processing Configuration
AI_EMBEDDING_URL=http://localhost:8085/embeddings
AI_EMBEDDING_MODEL=nomic-embed-text
AI_TRANSCRIBE_URL=http://localhost:8084/transcribe
AI_TRANSCRIBE_MODEL=faster-whisper-large-v3
AI_HTTP_TIMEOUT=60000
```

### Step 3: Test the Embedding Server

In another terminal, test if it's working:

```bash
curl -X POST http://localhost:8085/embeddings \
  -H "Content-Type: application/json" \
  -d '{"input": "This is a test testimony", "model": "nomic-embed-text"}'
```

You should get back a JSON response with an embedding vector.

### Step 4: (Optional) Set Up Transcription Server

If you need transcription for audio/video testimonies:

The virtual environment is already set up! Just activate it and start the server:

```bash
cd /Users/apple/Desktop/housemajor/local-ai-services
source venv/bin/activate
python3 transcription-server.py
```

**Note:** First run will download ~3GB Whisper model (takes a few minutes).

### Step 5: Start Your NestJS App

```bash
cd /Users/apple/Desktop/housemajor
npm run start:dev
```

## 🧪 Testing the Full Flow

1. Create a testimony via your API
2. Approve it as admin → AI processing will start automatically
3. Check the logs for:
   ```
   Finished AI processing for testimony X
   Created N connections for testimony X
   ```
4. Query related testimonies:
   ```bash
   curl http://localhost:3009/testimonies/1/related
   ```

## 📝 Quick Commands

**Start embedding server:**
```bash
cd local-ai-services && node embedding-server.js
```

**Check if Ollama is running:**
```bash
curl http://localhost:11434/api/tags
```

**Test embedding:**
```bash
curl -X POST http://localhost:8085/embeddings \
  -H "Content-Type: application/json" \
  -d '{"input": "test", "model": "nomic-embed-text"}'
```

## 🎉 You're Ready!

Your AI connection system is now ready to run locally! When you approve a testimony, it will automatically:
1. Generate embeddings
2. Find connections with other testimonies
3. Store connections in the database

