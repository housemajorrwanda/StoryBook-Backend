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
          const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
            model: model,
            prompt: text,
          });

          if (!response.data || !response.data.embedding) {
            throw new Error('Invalid response from Ollama');
          }

          console.log(`✅ Generated embedding ${index + 1}/${texts.length}`);
          return { embedding: response.data.embedding };
        } catch (error) {
          console.error(`❌ Error embedding text ${index + 1}:`, error.message);
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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'embedding-server',
    ollama_url: OLLAMA_URL,
  });
});

app.listen(PORT, () => {
  console.log(`✅ Embedding server running on http://localhost:${PORT}`);
  console.log(`   Ollama URL: ${OLLAMA_URL}`);
  console.log(`   Test: curl http://localhost:${PORT}/health`);
});

