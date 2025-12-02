const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const PORT = process.env.PORT || 8085;

app.post('/embeddings', async (req, res) => {
  try {
    const { input, model = 'nomic-embed-text' } = req.body;
    const texts = Array.isArray(input) ? input : [input];

    console.log(
      `📊 Generating embeddings for ${texts.length} text(s) using ${model}...`,
    );

    const embeddings = await Promise.all(
      texts.map(async (text, index) => {
        try {
          const response = await axios.post(`${OLLAMA_URL}/api/embed`, {
            model: model,
            prompt: text,
          }, {
            timeout: 10000, 
          });

          
          if (!response.data || !response.data.embedding) {
            throw new Error('Invalid response from Ollama - missing embedding');
          }

          console.log(`✅ Generated embedding ${index + 1}/${texts.length} (dimension: ${response.data.embedding.length})`);
          return { embedding: response.data.embedding };
        } catch (error) {
          const errorMsg = error.response?.data?.error || error.message;
          const statusCode = error.response?.status;
          console.error(`❌ Error embedding text ${index + 1}:`, errorMsg);
          if (statusCode === 404) {
            console.error(`   → Ollama endpoint not found. Check: 1) Ollama is running, 2) Model '${model}' is available (run: ollama pull ${model}), 3) OLLAMA_URL is correct (currently: ${OLLAMA_URL})`);
          } else if (statusCode) {
            console.error(`   → HTTP ${statusCode} error from Ollama`);
          }
          throw error;
        }
      }),
    );

    res.json({ data: embeddings });
  } catch (error) {
    console.error('❌ Embedding error:', error.message);
    res.status(500).json({
      error: error.message,
      details: error.response?.data || null,
    });
  }
});

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'embedding-server',
    endpoints: {
      health: '/health',
      embeddings: '/embeddings (POST)',
    },
    ollama_url: OLLAMA_URL,
  });
});

app.get('/health', async (req, res) => {
  try {
    // Try to verify Ollama is accessible
    const ollamaCheck = await axios.get(`${OLLAMA_URL}/api/tags`, {
      timeout: 5000,
    }).catch(() => null);

    res.json({
      status: 'ok',
      service: 'embedding-server',
      ollama_url: OLLAMA_URL,
      ollama_accessible: !!ollamaCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'degraded',
      service: 'embedding-server',
      ollama_url: OLLAMA_URL,
      ollama_accessible: false,
      error: 'Cannot reach Ollama service',
      timestamp: new Date().toISOString(),
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Embedding server running on http://0.0.0.0:${PORT}`);
  console.log(`   Ollama URL: ${OLLAMA_URL}`);
  console.log(`   Test: curl http://localhost:${PORT}/health`);
});

