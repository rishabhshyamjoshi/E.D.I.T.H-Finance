import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const geminiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
  const orchestratorKey = process.env.GEMINI_API_KEY_ORCHESTRATOR || env.GEMINI_API_KEY_ORCHESTRATOR || geminiKey;
  const groqKey = process.env.GROQ_API_KEY || env.GROQ_API_KEY;
  
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'local-api-proxy',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/config') {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                geminiApiKey: geminiKey,
                geminiOrchestratorKey: orchestratorKey
              }));
              return;
            }
            if (req.url === '/api/groq' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                try {
                  const parsedBody = JSON.parse(body);
                  const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${groqKey}`
                    },
                    body: JSON.stringify({
                      model: parsedBody.model || 'openai/gpt-oss-120b',
                      messages: [{ role: 'user', content: parsedBody.prompt }],
                      max_tokens: parsedBody.max_tokens || 4096,
                    })
                  });
                  const data = await groqRes.json();
                  res.statusCode = groqRes.status;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                } catch (e: any) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: e.message }));
                }
              });
              return;
            }
            next();
          });
        }
      }
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
