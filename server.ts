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
import { BohurupiBrain } from './src/backend/core/BohurupiBrain';
import { DiscordService } from './src/backend/discord/DiscordService';
import { GeminiProvider } from './src/backend/providers/GeminiProvider';
import { OllamaProvider } from './src/backend/providers/OllamaProvider';
import { OpenRouterProvider } from './src/backend/providers/OpenRouterProvider';
import 'dotenv/config';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.set('trust proxy', true);

// Basic Admin Auth Middleware
const adminAuth = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  
  if (!expectedPassword) {
    return next();
  }
  
  const providedAuth = req.headers['x-admin-password'] || req.query.admin_password;
  if (providedAuth === expectedPassword) {
    if (req.method === 'POST') {
       logger.info(`[Dashboard Access] Action Triggered | IP: ${clientIp} | Path: ${req.path}`);
    }
    return next();
  }
  
  // Explicitly check for valid auth string length to prevent "null" or empty string from triggering logs
  const hasProvidedAuth = typeof providedAuth === 'string' && providedAuth.length > 0 && providedAuth !== 'null' && providedAuth !== 'undefined';
  
  if (hasProvidedAuth || req.method === 'POST') {
     // Check if it is just a periodic polling endpoint, lower the log level for it so it doesn't spam warnings
     if (req.method === 'GET' && (req.path === '/api/logs' || req.path === '/api/calls' || req.path === '/api/system/metrics' || req.path === '/api/state')) {
         // Silently reject to prevent UI spam log issues
     } else {
         logger.warn(`[Dashboard Access] Unauthorized/Failed Attempt! | IP: ${clientIp} | Path: ${req.path}`);
     }
  }
  return res.status(401).json({ error: 'Unauthorized. Invalid or missing Admin Password.' });
};


// Initialize Core Subsystems
export const providerManager = new ProviderManager();
export const identityManager = new IdentityManager();
export const memoryEngine = new MemoryEngine();
export const emotionEngine = new EmotionEngine();

export const bohurupiBrain = new BohurupiBrain(
  providerManager,
  identityManager,
  memoryEngine,
  emotionEngine
);

// Initialize Discord Integration
export const discordService = new DiscordService(bohurupiBrain);

// Register Real AI Providers
const openRouterProvider = new OpenRouterProvider('Cloud-OpenRouter', process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat');
providerManager.registerProvider(openRouterProvider);

const geminiProvider = new GeminiProvider();
providerManager.registerProvider(geminiProvider);

// Register Fallback Provider (Self-Hosted Ollama)
// NOTE: Disabled for now per user request. Uncomment the lines below to use in the future.
// const ollamaProvider = new OllamaProvider();
// providerManager.registerProvider(ollamaProvider);

// Register Ultimate Fallback Provider (Never fails, used if real AI providers fail)
const fallbackMessages = [
  "Bhai Disturb করিস না, আমি ঘুমের মধ্যে 😴",
  "bhai disturb koris na, ami ghumer moddhe 😴",
  "Bhai disturb korish na, ghumaitesi 😴",
  "bhai ekhon na, ami ghumer moddhe 😴"
];

providerManager.registerProvider({
  name: 'Fallback-Simulated',
  isHealthy: () => true,
  generate: async (req) => {
    const randomIndex = Math.floor(Math.random() * fallbackMessages.length);
    return fallbackMessages[randomIndex];
  }
});

// Admin Dashboard API Routes
app.get('/api/providers/config', adminAuth, async (req, res) => {
  try {
    res.json(providerManager.getConfig());
  } catch(e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/providers/config', adminAuth, async (req, res) => {
  try {
    const newConfig = req.body.config;
    await memoryEngine.setSystemConfig('provider_config', newConfig);
    providerManager.setConfig(newConfig);
    res.json({ success: true, config: providerManager.getConfig() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Bohurupi AI Core Engine' });
});


app.get('/api/logs', adminAuth, (req, res) => {
  res.json(logHistory);
});

app.get('/api/calls', adminAuth, (req, res) => {
  res.json(providerManager.getAPICallHistory());
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
    const responseText = await bohurupiBrain.processInteraction('web-admin-id', message);
    res.json({ success: true, text: responseText });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

async function startServer() {

  try {
    const savedConfig = await memoryEngine.getSystemConfig('provider_config');
    if (savedConfig) {
      providerManager.setConfig(savedConfig);
    }
  } catch(e) {
    console.error("Failed to load provider config on startup", e);
  }

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
    logger.info(`Bohurupi AI Core Engine running on port ${PORT}`);
  });
}

startServer();
