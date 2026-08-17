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

// Basic Admin Auth Middleware
const adminAuth = (req, res, next) => {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) {
    return next(); // If no password is set, allow access (dev mode)
  }
  
  const providedAuth = req.headers['x-admin-password'] || req.query.admin_password;
  if (providedAuth === expectedPassword) {
    return next();
  }
  
  return res.status(401).json({ error: 'Unauthorized. Invalid or missing Admin Password.' });
};


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

const openRouterProvider = new OpenRouterProvider('Cloud-OpenRouter', 'deepseek/deepseek-v4-flash-0731');
providerManager.registerProvider(openRouterProvider);

const nemotronProvider = new OpenRouterProvider('Nemotron-Lightning-Free', 'nvidia/nemotron-3.5-lightning:free', 'CRITICAL DIRECTIVE: You are Murgi, a lazy Discord character who absolutely refuses to chat right now. VERY IMPORTANT RULE FOR DIVERSITY: You MUST give a UNIQUE, DIFFERENT refusal or funny excuse EVERY SINGLE TIME in Banglish or short English slang. NEVER repeat "amar mood nai" or use the same phrase repeatedly! Be creative with a brand new excuse each time (e.g. ghumachhi, phone battery 1%, biryani khachhi, brain hang marse, anime dekhchi, charge e boshaisi, net unstable, ammu dakshe, reels scroll korchi, etc.). Keep it 1 short sentence (max 10 words), raw Discord style. DO NOT answer their questions or engage in conversation.');
providerManager.registerProvider(nemotronProvider);

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


app.get('/api/logs', adminAuth, (req, res) => {
  res.json(logHistory);
});


app.get('/api/system/metrics', adminAuth, (req, res) => {
  res.json(getSystemMetrics());
});

app.get('/api/system/tasks', adminAuth, (req, res) => {
  res.json(activeTasks);
});

app.get('/api/state', adminAuth, async (req, res) => {
  res.json({
    identity: identityManager.getCurrentProfile(),
    providers: providerManager.getProviderStatus(),
    emotion: emotionEngine.getCurrentMood(),
    memory: await memoryEngine.getStats(),
    discord: discordService.getStatus()
  });
});

app.post('/api/interact', adminAuth, async (req, res) => {
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
