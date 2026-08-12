import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { getSystemMetrics, activeTasks } from './src/backend/telemetry/systemMetrics';
import { logger, logHistory } from './src/backend/telemetry/logger';

import { ProviderManager } from './src/backend/providers/ProviderManager';
import { IdentityManager } from './src/backend/identity/IdentityManager';
import { MemoryEngine } from './src/backend/memory/MemoryEngine';
import { EmotionEngine } from './src/backend/emotion/EmotionEngine';
import { MurgiBrain } from './src/backend/core/MurgiBrain';
import { DiscordService } from './src/backend/discord/DiscordService';
import { GeminiProvider } from './src/backend/providers/GeminiProvider';
import { OllamaProvider } from './src/backend/providers/OllamaProvider';
import { OpenRouterProvider } from './src/backend/providers/OpenRouterProvider';
import 'dotenv/config';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Initialize Core Subsystems
export const providerManager = new ProviderManager();
export const identityManager = new IdentityManager();
export const memoryEngine = new MemoryEngine();
export const emotionEngine = new EmotionEngine();

export const murgiBrain = new MurgiBrain(
  providerManager,
  identityManager,
  memoryEngine,
  emotionEngine
);

// Initialize Discord Integration
export const discordService = new DiscordService(murgiBrain);

// Register Real AI Providers
const geminiProvider = new GeminiProvider();
providerManager.registerProvider(geminiProvider);

const openRouterProvider = new OpenRouterProvider();
providerManager.registerProvider(openRouterProvider);

// Register Fallback Provider (Self-Hosted Ollama)
// NOTE: Disabled for now per user request. Uncomment the lines below to use in the future.
// const ollamaProvider = new OllamaProvider();
// providerManager.registerProvider(ollamaProvider);

// Register Ultimate Fallback Provider (Never fails, used if Ollama is offline)
providerManager.registerProvider({
  name: 'Fallback-Simulated',
  isHealthy: () => true,
  generate: async (req) => `bro matha ghurtese, kisu bujhlam na abar bol (system overloaded)`
});

// Admin Dashboard API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Murgi AI Core Engine' });
});


app.get('/api/logs', (req, res) => {
  res.json(logHistory);
});


app.get('/api/system/metrics', (req, res) => {
  res.json(getSystemMetrics());
});

app.get('/api/system/tasks', (req, res) => {
  res.json(activeTasks);
});

app.get('/api/state', (req, res) => {
  res.json({
    identity: identityManager.getCurrentProfile(),
    providers: providerManager.getProviderStatus(),
    emotion: emotionEngine.getCurrentMood(),
    memory: memoryEngine.getStats(),
    discord: discordService.getStatus()
  });
});

app.post('/api/interact', async (req, res) => {
  const { message } = req.body;
  try {
    // Treat API interactions as coming from a system/web user ID
    const responseText = await murgiBrain.processInteraction('web-admin-id', message);
    res.json({ success: true, text: responseText });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function startServer() {
// Start Discord Bot asynchronously
  // To prevent double-responses (because the bot is running on Render in production),
  // we disable the Discord listener in this development environment by default.
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_DISCORD === 'true') {
    discordService.start(process.env.DISCORD_TOKEN);
  } else {
    logger.info("Discord Bot is PAUSED in development to prevent double-responses. The Render production bot is handling messages.");
    logger.info("Add ENABLE_DEV_DISCORD=true to .env if you want to test Discord locally.");
  }

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Murgi AI Core Engine running on port ${PORT}`);
  });
}

startServer();
