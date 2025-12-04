const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const PORT = process.env.PORT || 8085;

/**
 * Ensure the model is available in Ollama, pull it if missing
 * Note: This will wait for the model to be pulled (can take several minutes)
 */
async function ensureModel(modelName) {
  try {
    console.log(`🔍 Checking if model '${modelName}' is available...`);
    const tagsResponse = await axios.get(`${OLLAMA_URL}/api/tags`, {
      timeout: 5000,
    });
    
    const models = tagsResponse.data?.models || [];
    const modelExists = models.some(m => m.name === modelName || m.name.includes(modelName));
    
    if (modelExists) {
      console.log(`✅ Model '${modelName}' is already available`);
      return true;
    }
    
    console.log(`📥 Model '${modelName}' not found. Pulling from Ollama (this may take a few minutes)...`);
    console.log(`   This is a one-time download. Future requests will be faster.`);
    
    // Ollama's pull API streams progress, we need to wait for completion
    // Use a streaming approach or poll until model appears
    try {
      const pullResponse = await axios.post(
        `${OLLAMA_URL}/api/pull`,
        { name: modelName },
        { 
          timeout: 600000, // 10 minutes for model download
          responseType: 'stream' // Stream the response to track progress
        }
      );
      
      // Wait for the stream to complete
      await new Promise((resolve, reject) => {
        pullResponse.data.on('data', (chunk) => {
          try {
            const lines = chunk.toString().split('\n').filter(l => l.trim());
            lines.forEach(line => {
              try {
                const data = JSON.parse(line);
                if (data.status) {
                  console.log(`   📥 ${data.status}`);
                }
              } catch (e) {
                // Ignore parse errors
              }
            });
          } catch (e) {
            // Ignore
          }
        });
        
        pullResponse.data.on('end', () => {
          console.log(`✅ Model '${modelName}' pull completed`);
          resolve();
        });
        
        pullResponse.data.on('error', reject);
      });
      
      // Verify model is now available
      const verifyResponse = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
      const verifyModels = verifyResponse.data?.models || [];
      const nowExists = verifyModels.some(m => m.name === modelName || m.name.includes(modelName));
      
      if (nowExists) {
        console.log(`✅ Model '${modelName}' is now available and ready to use`);
        return true;
      } else {
        console.warn(`⚠️ Model '${modelName}' pull completed but model not found in list. It may still be loading.`);
        return false;
      }
    } catch (pullError) {
      console.error(`⚠️ Error pulling model '${modelName}':`, pullError.message);
      // Don't throw - model might still work if it was partially downloaded
      return false;
    }
  } catch (error) {
    console.error(`⚠️ Error checking/pulling model '${modelName}':`, error.message);
    // Don't throw - we'll try to use it anyway, might already be there
    return false;
  }
}

async function wakeUpOllama() {
  try {
    // Send a lightweight request to wake up Ollama
    // Using /api/tags is fast and doesn't require model loading
    // This prevents Railway from suspending the container and keeps models in memory
    await axios.get(`${OLLAMA_URL}/api/tags`, {
      timeout: 2000,
    }).catch(() => {
      // Ignore errors - this is just a wake-up call
    });
  } catch (error) {
    // Ignore wake-up errors
  }
}

app.post('/embeddings', async (req, res) => {
  try {
    const { input, model = 'nomic-embed-text' } = req.body;
    const texts = Array.isArray(input) ? input : [input];

    console.log(
      `📊 Generating embeddings for ${texts.length} text(s) using ${model}...`,
    );

    // Wake up Ollama before processing (prevents idle/sleep issues)
    console.log('🔔 Waking up Ollama before embedding request...');
    await wakeUpOllama();
    
    // Ensure the model is available (pull if missing)
    console.log(`🔍 Ensuring model '${model}' is available...`);
    await ensureModel(model);

    const embeddings = await Promise.all(
      texts.map(async (text, index) => {
        try {
          const response = await axios.post(`${OLLAMA_URL}/api/embed`, {
            model: model,
            prompt: text,
          }, {
            timeout: 60000, // 60 second timeout for embedding generation
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

