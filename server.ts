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
import { OpenRouterProvider } from './src/backend/providers/OpenRouterProvider';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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

// Register Real AI Providers (Google-Gemini first for lowest latency and highest reliability)
const geminiProvider = new GeminiProvider();
providerManager.registerProvider(geminiProvider);

const openRouterProvider = new OpenRouterProvider('Cloud-OpenRouter');
providerManager.registerProvider(openRouterProvider);

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
    const sys = req.systemInstruction || '';
    if (sys.includes('COMMAND: !court')) {
      return "Crime: 24 ghonta phone tipe chokher 12ta bajano\nPenalty: Shobai ke 1 plate kacchi khawano";
    }
    if (sys.includes('COMMAND: !fight')) {
      return "Move: ULTA CHARI SLAP\nTrashTalk: tui to ek fukei ure jabi bot 💀";
    }
    if (sys.includes('COMMAND: !biryani_roulette')) {
      return "Dish: TEELA POKA IN RICE\nNotes: Special crispy crunch item found.\nMock: bhai ei biryani khele hospitale bhorti howa lagbe!";
    }
    if (sys.includes('COMMAND: !iq')) {
      return "Ei matha diye sudhu meme scroll kora jay, IQ 40 💀";
    }
    if (sys.includes('COMMAND:')) {
      return "bhai ajke ektu chill kortesi, kichukkhon por abar try kor!";
    }
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

app.get(['/health', '/api/health'], (req, res) => {
  const mem = process.memoryUsage();
  res.status(200).json({
    status: 'ok',
    service: 'Bohurupi AI Core Engine',
    uptimeSeconds: Math.floor(process.uptime()),
    memoryMB: {
      rss: Math.round(mem.rss / 1024 / 1024),
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024)
    },
    timestamp: new Date().toISOString()
  });
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
    discord: await discordService.getStatus()
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

app.post('/api/discord/trigger-schedule', adminAuth, async (req, res) => {
  try {
    logger.info("Admin triggered scheduled auto-reply manually from dashboard");
    const result = await discordService.triggerAutoReply();
    res.json(result);
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

  // Start Discord Bot if DISCORD_TOKEN is provided
  if (process.env.DISCORD_TOKEN && process.env.DISABLE_DISCORD !== 'true') {
    discordService.start(process.env.DISCORD_TOKEN);
  } else {
    logger.info("Discord Bot not started (DISCORD_TOKEN missing or DISABLE_DISCORD=true)");
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

    // Render Free Tier Keep-Alive Ping (prevents 15-minute sleep)
    const pingHost = process.env.RENDER_EXTERNAL_URL || process.env.APP_URL;
    if (pingHost) {
      const pingEndpoint = `${pingHost.replace(/\/$/, '')}/api/health`;
      logger.info(`Render Keep-Alive active. Pinging: ${pingEndpoint} every 14 mins.`);
      setInterval(async () => {
        try {
          await fetch(pingEndpoint).catch(() => {});
        } catch (e) {}
      }, 14 * 60 * 1000);
    }
  });
}

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Promise Rejection caught at process level:', {
    error: reason?.message || String(reason),
    stack: reason?.stack
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception caught at process level:', {
    error: error?.message || String(error),
    stack: error?.stack
  });
});

startServer();
