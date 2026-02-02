#!/bin/bash

# Start Local AI Services
# This script starts Ollama, Embedding Server, and Transcription Server

echo "🚀 Starting Local AI Services..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo -e "${RED}❌ Ollama is not installed${NC}"
    echo "   Install: brew install ollama"
    echo "   Or download from: https://ollama.ai/download"
    exit 1
fi

# Check if Ollama model is available
echo -e "${YELLOW}📦 Checking Ollama model...${NC}"
if ! ollama list | grep -q "nomic-embed-text"; then
    echo "   Model not found. Pulling nomic-embed-text..."
    ollama pull nomic-embed-text
fi

# Start Ollama in background
echo -e "${YELLOW}🔄 Starting Ollama server...${NC}"
ollama serve > /tmp/ollama.log 2>&1 &
OLLAMA_PID=$!
sleep 3

# Check if Ollama started
if ! curl -s http://localhost:11434/api/tags > /dev/null; then
    echo -e "${RED}❌ Failed to start Ollama${NC}"
    kill $OLLAMA_PID 2>/dev/null
    exit 1
fi
echo -e "${GREEN}✅ Ollama running (PID: $OLLAMA_PID)${NC}"

# Check if Node dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing Node dependencies...${NC}"
    npm install
fi

# Start Embedding Server
echo -e "${YELLOW}🔄 Starting Embedding Server...${NC}"
node embedding-server.js > /tmp/embedding-server.log 2>&1 &
EMBEDDING_PID=$!
sleep 2

# Check if embedding server started
if ! curl -s http://localhost:8085/health > /dev/null; then
    echo -e "${RED}❌ Failed to start Embedding Server${NC}"
    kill $OLLAMA_PID $EMBEDDING_PID 2>/dev/null
    exit 1
fi
echo -e "${GREEN}✅ Embedding Server running (PID: $EMBEDDING_PID)${NC}"

# Check if virtual environment exists, create if not
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating Python virtual environment...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
    pip install flask faster-whisper requests
else
    source venv/bin/activate
fi

# Start Transcription Server
echo -e "${YELLOW}🔄 Starting Transcription Server...${NC}"
echo "   (First run will download ~3GB model - this may take a few minutes)"
python3 transcription-server.py > /tmp/transcription-server.log 2>&1 &
TRANSCRIPTION_PID=$!
sleep 5

# Check if transcription server started
if ! curl -s http://localhost:8084/health > /dev/null; then
    echo -e "${YELLOW}⚠️  Transcription Server may still be loading model...${NC}"
    echo "   Check: tail -f /tmp/transcription-server.log"
else
    echo -e "${GREEN}✅ Transcription Server running (PID: $TRANSCRIPTION_PID)${NC}"
fi

echo ""
echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo "📡 Service URLs:"
echo "   Embedding:    http://localhost:8085"
echo "   Transcription: http://localhost:8084"
echo ""
echo "📋 Process IDs:"
echo "   Ollama:       $OLLAMA_PID"
echo "   Embedding:    $EMBEDDING_PID"
echo "   Transcription: $TRANSCRIPTION_PID"
echo ""
echo "📝 Logs:"
echo "   Ollama:       tail -f /tmp/ollama.log"
echo "   Embedding:    tail -f /tmp/embedding-server.log"
echo "   Transcription: tail -f /tmp/transcription-server.log"
echo ""
echo "🛑 To stop all services:"
echo "   kill $OLLAMA_PID $EMBEDDING_PID $TRANSCRIPTION_PID"
echo ""
echo "Press Ctrl+C to stop all services..."

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $OLLAMA_PID $EMBEDDING_PID $TRANSCRIPTION_PID 2>/dev/null
    echo "✅ All services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

# Wait for interrupt
wait

