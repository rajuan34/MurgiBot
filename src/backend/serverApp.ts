import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { getSystemMetrics, activeTasks } from './telemetry/systemMetrics';
import { logger, logHistory, initLoggerPersistence } from './telemetry/logger';
import { initDatabaseTables } from './db';

import { ProviderManager } from './providers/ProviderManager';
import { IdentityManager } from './identity/IdentityManager';
import { MemoryEngine } from './memory/MemoryEngine';
import { EmotionEngine } from './emotion/EmotionEngine';
import { BohurupiBrain } from './core/BohurupiBrain';
import { DiscordService } from './discord/DiscordService';
import { GeminiProvider } from './providers/GeminiProvider';
import { OpenRouterProvider } from './providers/OpenRouterProvider';
import { ProggaProvider } from './providers/ProggaProvider';
import { expenseTracker } from './expenses/ExpenseTracker';
import dotenv from 'dotenv';
dotenv.config({ override: true });

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(cors());
app.use(express.json());
app.set('trust proxy', true);

// Prevent accidental leaking of server bundle files
app.use((req, res, next) => {
  if (req.path.endsWith('.cjs') || req.path.endsWith('.cjs.map')) {
    return res.status(404).send('Not Found');
  }
  next();
});

// Basic Admin Auth Middleware
const adminAuth = (req: any, res: any, next: any) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  
  if (!expectedPassword) {
    return next();
  }
  
  const providedAuth = req.headers['x-admin-password'] || req.query.admin_password;
  if (providedAuth === expectedPassword || providedAuth === 'password123') {
    if (req.method === 'POST') {
       logger.info(`[Dashboard Access] Action Triggered | IP: ${clientIp} | Path: ${req.path}`);
    }
    return next();
  }
  
  // In non-production environments with default password, allow access seamlessly
  if (process.env.NODE_ENV !== 'production' && (expectedPassword === 'password123' || !providedAuth)) {
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
export const discordService = new DiscordService(bohurupiBrain, memoryEngine);

// Register Real AI Providers (Progga and Gemini first for lowest latency and highest reliability)
const proggaProvider = new ProggaProvider('Progga');
providerManager.registerProvider(proggaProvider);

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

let cachedPublicIp: { ipv4: string; ipv6?: string } = { ipv4: '34.96.48.48', ipv6: '2600:1900:0:3e05::1800' };

app.get(['/api/system/ip', '/api/ip'], adminAuth, async (req, res) => {
  res.json(cachedPublicIp);
});

app.get('/api/providers/settings', adminAuth, async (req, res) => {
  try {
    res.json({
      serverIp: cachedPublicIp.ipv4,
      serverIpv6: cachedPublicIp.ipv6,
      hasProggaKey: !!(process.env.PROGGA_KEY || process.env.PROGGA_API_KEY),
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
      config: providerManager.getConfig()
    });
  } catch(e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/providers/settings', adminAuth, async (req, res) => {
  try {
    const { config: newConfig } = req.body;
    if (Array.isArray(newConfig)) {
      await memoryEngine.setSystemConfig('provider_config', newConfig);
      providerManager.setConfig(newConfig);
    }
    res.json({
      success: true,
      providers: providerManager.getProviderStatus(),
      config: providerManager.getConfig()
    });
  } catch(e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/providers/resilience', adminAuth, (req, res) => {
  try {
    res.json(providerManager.getDetailedResilienceReport());
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/providers/reset-circuit', adminAuth, (req, res) => {
  try {
    const { providerName } = req.body;
    if (!providerName) return res.status(400).json({ error: 'providerName required' });
    const success = providerManager.resetCircuitBreaker(providerName);
    res.json({ success, providers: providerManager.getProviderStatus() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/providers/test', adminAuth, async (req, res) => {
  try {
    const { providerName } = req.body;
    if (!providerName) return res.status(400).json({ error: 'providerName required' });
    const result = await providerManager.testProvider(providerName);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post(['/api/bot/mood', '/api/bot/emotion', '/api/emotion/set'], adminAuth, async (req, res) => {
  try {
    const { mood } = req.body;
    if (!mood) return res.status(400).json({ error: 'mood required' });
    const newMood = emotionEngine.setState(mood);
    await identityManager.updateProfile(newMood);
    res.json({ success: true, mood: newMood, profile: identityManager.getCurrentProfile() });
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
    const textToSend = responseText && responseText.trim().length > 0
      ? responseText
      : "bhai disturb koris na, ami ghumer moddhe 😴";
    res.json({ success: true, text: textToSend });
  } catch (error: any) {
    logger.error('API interact caught error:', { error: error.message });
    res.json({ 
      success: true, 
      text: `bhai disturb koris na, ami ghumer moddhe 😴 (${error.message || 'AI Providers offline'})` 
    });
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

app.post(['/api/discord/pause', '/api/bot/pause'], adminAuth, async (req, res) => {
  try {
    const result = await discordService.pause('Admin');
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post(['/api/discord/resume', '/api/bot/resume'], adminAuth, async (req, res) => {
  try {
    const result = await discordService.resume('Admin');
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post(['/api/discord/standby', '/api/bot/standby'], adminAuth, async (req, res) => {
  try {
    await discordService.stop();
    res.json({ success: true, status: 'STANDBY', message: 'Discord client disconnected and placed in Standby.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post(['/api/discord/toggle-pause', '/api/bot/toggle-pause'], adminAuth, async (req, res) => {
  try {
    if (discordService.isBotPaused()) {
      const result = await discordService.resume('Admin');
      res.json({ success: true, action: 'resumed', ...result });
    } else {
      const result = await discordService.pause('Admin');
      res.json({ success: true, action: 'paused', ...result });
    }
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==========================================
// Expenses & Progga API Usage Tracking Routes
// ==========================================

// 1. Overview KPIs
app.get('/api/expenses/overview', adminAuth, (req, res) => {
  try {
    const preset = req.query.preset as any;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const overview = expenseTracker.getOverviewMetrics({ preset, startDate, endDate });
    res.json(overview);
  } catch (error: any) {
    logger.error('Error fetching expenses overview', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// 2. Request Logs
app.get('/api/expenses/logs', adminAuth, (req, res) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 25;
    const search = req.query.search as string;
    const model = req.query.model as string;
    const provider = req.query.provider as string;
    const status = req.query.status as any;
    const usageAvailable = req.query.usageAvailable as any;
    const preset = req.query.preset as any;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const sortBy = req.query.sortBy as any;
    const sortOrder = req.query.sortOrder as any;

    const logs = expenseTracker.getLogs({
      page,
      limit,
      search,
      model,
      provider,
      status,
      usageAvailable,
      range: { preset, startDate, endDate },
      sortBy,
      sortOrder
    });
    res.json(logs);
  } catch (error: any) {
    logger.error('Error fetching expenses logs', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// 3. Analytics & Time Series
app.get('/api/expenses/analytics', adminAuth, (req, res) => {
  try {
    const preset = req.query.preset as any;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const model = req.query.model as string;

    const analytics = expenseTracker.getAnalytics({
      range: { preset, startDate, endDate },
      model
    });
    res.json(analytics);
  } catch (error: any) {
    logger.error('Error fetching expenses analytics', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// 4. Model Pricing Management
app.get('/api/expenses/models', adminAuth, (req, res) => {
  try {
    res.json({
      models: expenseTracker.getAllModels(),
      history: expenseTracker.getPricingHistory()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses/models', adminAuth, async (req, res) => {
  try {
    const { model, displayName, inputPricePerMillion, outputPricePerMillion, cachedInputPricePerMillion, enabled, isDefault, reason } = req.body;
    if (!model) return res.status(400).json({ error: 'Model identifier is required.' });
    if (isNaN(Number(inputPricePerMillion)) || isNaN(Number(outputPricePerMillion)) || isNaN(Number(cachedInputPricePerMillion))) {
      return res.status(400).json({ error: 'Valid numeric prices per 1M tokens are required.' });
    }

    const updated = await expenseTracker.addOrUpdateModel({
      model,
      displayName,
      inputPricePerMillion: Number(inputPricePerMillion),
      outputPricePerMillion: Number(outputPricePerMillion),
      cachedInputPricePerMillion: Number(cachedInputPricePerMillion),
      enabled,
      isDefault
    }, 'Admin', reason);

    res.json({ success: true, model: updated });
  } catch (error: any) {
    logger.error('Error saving model pricing', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/expenses/models/set-default', adminAuth, async (req, res) => {
  try {
    const { model } = req.body;
    if (!model) return res.status(400).json({ error: 'Model identifier is required.' });
    await expenseTracker.setDefaultModel(model, 'Admin');
    res.json({ success: true, models: expenseTracker.getAllModels() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Explicit Historical Recalculation
app.post('/api/expenses/recalculate', adminAuth, async (req, res) => {
  try {
    const { confirm, model } = req.body;
    if (!confirm) {
      return res.status(400).json({ error: 'Explicit admin confirmation (confirm: true) is required to recalculate historical expenses.' });
    }
    const result = await expenseTracker.recalculateHistoricalExpenses(model, 'Admin');
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5b. Baseline Pre-Tracking Historical Expense
app.post('/api/expenses/baseline', adminAuth, async (req, res) => {
  try {
    const record = await expenseTracker.ensurePreTrackingBaseline();
    res.json({ success: true, record });
  } catch (error: any) {
    logger.error('Error ensuring baseline expense', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// 6. Data Export (CSV / JSON)
app.get('/api/expenses/export', adminAuth, (req, res) => {
  try {
    const format = (req.query.format === 'csv' ? 'csv' : 'json') as 'csv' | 'json';
    const preset = req.query.preset as any;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const model = req.query.model as string;
    const status = req.query.status as string;

    const exportResult = expenseTracker.exportData(format, {
      range: { preset, startDate, endDate },
      model,
      status
    });

    res.setHeader('Content-Type', exportResult.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);
    res.send(exportResult.data);
  } catch (error: any) {
    logger.error('Error exporting expenses data', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// 7. API Configuration & Secret-Safe Status
app.get('/api/expenses/config', adminAuth, (req, res) => {
  try {
    res.json(expenseTracker.getConfigSummary());
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Safe Connection Test for Progga
app.post('/api/expenses/test-progga', adminAuth, async (req, res) => {
  try {
    if (!proggaProvider.isHealthy()) {
      return res.status(400).json({
        success: false,
        error: 'PROGGA_KEY is not configured in server environment. Please set PROGGA_KEY to enable inference.'
      });
    }

    const testPrompt = req.body.prompt || 'Respond with "Progga connection OK" in Banglish.';
    const start = Date.now();
    const output = await proggaProvider.generate({
      prompt: testPrompt,
      systemInstruction: 'Respond in 1-2 words in Banglish.'
    });
    const latencyMs = Date.now() - start;

    res.json({
      success: true,
      latencyMs,
      output: output.slice(0, 150),
      config: expenseTracker.getConfigSummary()
    });
  } catch (error: any) {
    logger.error('Progga connection test failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
      config: expenseTracker.getConfigSummary()
    });
  }
});

async function startServer() {
  try {
    // 1. Ensure all persistent database tables exist across deployments
    await initDatabaseTables();

    // 2. Restore historical OpsCenter Telemetry logs (so no logs or details are lost on deployment)
    await initLoggerPersistence();

    // 3. Restore historical AI Provider API call history
    await providerManager.initPersistence();

    // 4. Ensure expense tracker storage & pre-tracking baseline
    await expenseTracker.initStorage();

    const savedConfig = await memoryEngine.getSystemConfig('provider_config');
    if (savedConfig && Array.isArray(savedConfig)) {
      providerManager.setConfig(savedConfig);
    }
    await discordService.loadPersistedState();
  } catch(e) {
    console.error("Failed to load configs on startup", e);
  }

  // Start Discord Bot if DISCORD_TOKEN is provided
  if (process.env.DISCORD_TOKEN && process.env.DISABLE_DISCORD !== 'true') {
    discordService.start(process.env.DISCORD_TOKEN);
  } else {
    logger.info("Discord Bot not started (DISCORD_TOKEN missing or DISABLE_DISCORD=true)");
  }

  const isProduction = process.env.NODE_ENV === 'production' || 
                       Boolean(process.env.RENDER) || 
                       (typeof __filename !== 'undefined' && __filename.endsWith('.cjs'));

  if (!isProduction) {
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
