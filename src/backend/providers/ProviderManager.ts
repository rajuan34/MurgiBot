import { logger } from '../telemetry/logger';

export interface APICallLog {
  timestamp: string;
  provider: string;
  status: 'success' | 'error' | 'rate_limit';
  latencyMs: number;
  errorDetail?: string;
}

export interface LLMRequest {
  prompt: string;
  context?: string; // Contains retrieved memory and emotion data
  history?: { role: 'user' | 'assistant'; content: string }[];
  systemInstruction?: string; // Overrides character rules if needed
}

export interface AIProvider {
  name: string;
  generate(request: LLMRequest): Promise<string>;
  isHealthy(): boolean;
  getLastSuccessfulModel?(): string | null;
  getAvailableModels?(): string[];
}

export interface ProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  totalLatencyMs: number;
  lastLatencyMs: number;
  lastCalledAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorDetail: string | null;
}

export interface DetailedProviderStatus {
  name: string;
  healthy: boolean;
  enabled: boolean;
  priority: number;
  tier: string;
  circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  maxFailures: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  successRate: number;
  avgLatencyMs: number;
  lastLatencyMs: number;
  lastCalledAt: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastErrorDetail: string | null;
  activeModel: string | null;
  cascadingModels: string[];
}

/**
 * ProviderManager handles multi-provider failover, API key rotation, 
 * and implements a Circuit Breaker pattern to ensure resilience.
 */
export class ProviderManager {
  private apiCallHistory: APICallLog[] = [];
  private consecutiveFallbackCount = 0;

  getConsecutiveFallbackCount(): number {
    return this.consecutiveFallbackCount;
  }

  resetConsecutiveFallbackCount(): void {
    this.consecutiveFallbackCount = 0;
  }

  getAPICallHistory() {
    return this.apiCallHistory;
  }

  private addApiLog(log: Omit<APICallLog, 'timestamp'>) {
    this.apiCallHistory.unshift({ ...log, timestamp: new Date().toISOString() });
    if (this.apiCallHistory.length > 100) this.apiCallHistory.pop();
  }

  
  private activeConfig: { name: string, enabled: boolean, priority: number }[] | null = null;

  setConfig(config: { name: string, enabled: boolean, priority: number }[]) {
    this.activeConfig = config;
    logger.info('ProviderManager config updated.');
  }

  getConfig() {
    const registeredNames = new Set(this.providers.map(p => p.name));
    if (this.activeConfig) {
      const normalizedConfig = this.activeConfig.map(c => {
        if (c.name === 'Google-Gemini-3.8-Flash' && registeredNames.has('Google-Gemini')) {
          return { ...c, name: 'Google-Gemini' };
        }
        return c;
      });
      const validActiveConfig = normalizedConfig.filter(c => registeredNames.has(c.name));
      const existingNames = new Set(validActiveConfig.map(c => c.name));
      const missingProviders = this.providers
        .filter(p => !existingNames.has(p.name))
        .map((p, idx) => ({
          name: p.name,
          enabled: true,
          priority: validActiveConfig.length + idx
        }));
      return [...validActiveConfig, ...missingProviders];
    }
    // Default config based on registration order
    return this.providers.map((p, i) => ({
      name: p.name,
      enabled: true,
      priority: i
    }));
  }

  getActiveProviders() {
    if (!this.activeConfig) return this.providers;
    
    // Create a map for quick lookup
    const configMap = new Map(this.activeConfig.map(c => [c.name, c]));
    
    const active = this.providers.filter(p => {
       const cfg = configMap.get(p.name);
       return cfg ? cfg.enabled : true; // Default enabled if not in config
    });

    active.sort((a, b) => {
       const pA = configMap.get(a.name)?.priority ?? 999;
       const pB = configMap.get(b.name)?.priority ?? 999;
       return pA - pB;
    });

    return active;
  }

  private providers: AIProvider[] = [];
  private circuitBreakerFailures: Map<string, number> = new Map();
  private providerMetrics: Map<string, ProviderMetrics> = new Map();
  private readonly MAX_FAILURES = 3; // Block provider after 3 consecutive failures

  private getOrInitMetrics(name: string): ProviderMetrics {
    let m = this.providerMetrics.get(name);
    if (!m) {
      m = {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        rateLimitedRequests: 0,
        totalLatencyMs: 0,
        lastLatencyMs: 0,
        lastCalledAt: null,
        lastSuccessAt: null,
        lastErrorAt: null,
        lastErrorDetail: null,
      };
      this.providerMetrics.set(name, m);
    }
    return m;
  }

  registerProvider(provider: AIProvider) {
    this.providers.push(provider);
    this.circuitBreakerFailures.set(provider.name, 0);
    this.getOrInitMetrics(provider.name);
    logger.info(`Registered AI Provider: ${provider.name}`);
  }

  getProviderStatus(): DetailedProviderStatus[] {
    const config = this.getConfig();
    const configMap = new Map(config.map(c => [c.name, c]));

    return this.providers.map((p, idx) => {
      const cfg = configMap.get(p.name);
      const enabled = cfg ? cfg.enabled : true;
      const priority = cfg ? cfg.priority : idx;
      const failures = this.circuitBreakerFailures.get(p.name) || 0;
      const metrics = this.getOrInitMetrics(p.name);

      let circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
      if (failures >= this.MAX_FAILURES) {
        circuitState = 'OPEN';
      } else if (failures > 0) {
        circuitState = 'HALF_OPEN';
      }

      let tier = 'Tier 2: Secondary Failover';
      if (p.name.includes('Gemini')) tier = 'Tier 1: Primary AI Engine';
      else if (p.name.includes('Fallback')) tier = 'Tier 3: Offline Safe Guard';

      const avgLatencyMs = metrics.successfulRequests > 0 
        ? Math.round(metrics.totalLatencyMs / metrics.successfulRequests)
        : metrics.lastLatencyMs;

      const successRate = metrics.totalRequests > 0
        ? Math.round((metrics.successfulRequests / metrics.totalRequests) * 1000) / 10
        : (p.isHealthy() ? 100 : 0);

      const activeModel = p.getLastSuccessfulModel ? p.getLastSuccessfulModel() : (p.name.includes('Gemini') ? 'gemini-3.1-flash-lite' : (p.name.includes('OpenRouter') ? 'deepseek/deepseek-chat' : 'Deterministic offline generator'));
      const cascadingModels = p.getAvailableModels ? p.getAvailableModels() : [];

      return {
        name: p.name,
        healthy: p.isHealthy(),
        enabled,
        priority,
        tier,
        circuitState,
        failures,
        maxFailures: this.MAX_FAILURES,
        totalRequests: metrics.totalRequests,
        successfulRequests: metrics.successfulRequests,
        failedRequests: metrics.failedRequests,
        rateLimitedRequests: metrics.rateLimitedRequests,
        successRate,
        avgLatencyMs,
        lastLatencyMs: metrics.lastLatencyMs,
        lastCalledAt: metrics.lastCalledAt,
        lastSuccessAt: metrics.lastSuccessAt,
        lastErrorAt: metrics.lastErrorAt,
        lastErrorDetail: metrics.lastErrorDetail,
        activeModel: activeModel || null,
        cascadingModels: cascadingModels || []
      };
    }).sort((a, b) => a.priority - b.priority);
  }

  resetCircuitBreaker(providerName: string): boolean {
    if (this.circuitBreakerFailures.has(providerName)) {
      this.circuitBreakerFailures.set(providerName, 0);
      const metrics = this.getOrInitMetrics(providerName);
      metrics.lastErrorDetail = null;
      logger.info(`Circuit breaker manually reset for provider: ${providerName}`);
      return true;
    }
    return false;
  }

  async testProvider(providerName: string): Promise<{ success: boolean; latencyMs: number; model?: string; output?: string; error?: string }> {
    const provider = this.providers.find(p => p.name === providerName);
    if (!provider) {
      return { success: false, latencyMs: 0, error: `Provider "${providerName}" not found` };
    }

    if (!provider.isHealthy()) {
      return { success: false, latencyMs: 0, error: `Provider "${providerName}" has no active API key or configuration` };
    }

    const start = Date.now();
    try {
      const output = await provider.generate({
        prompt: 'Say: "Health check OK"',
        systemInstruction: 'Respond in 1-2 words in Banglish.'
      });
      const latencyMs = Date.now() - start;
      const model = provider.getLastSuccessfulModel ? provider.getLastSuccessfulModel() || undefined : undefined;
      
      const metrics = this.getOrInitMetrics(providerName);
      metrics.totalRequests++;
      metrics.successfulRequests++;
      metrics.totalLatencyMs += latencyMs;
      metrics.lastLatencyMs = latencyMs;
      metrics.lastSuccessAt = new Date().toISOString();
      this.circuitBreakerFailures.set(providerName, 0);

      this.addApiLog({
        provider: providerName,
        status: 'success',
        latencyMs,
        errorDetail: undefined
      });

      return {
        success: true,
        latencyMs,
        model,
        output: output.slice(0, 100)
      };
    } catch (e: any) {
      const latencyMs = Date.now() - start;
      const metrics = this.getOrInitMetrics(providerName);
      metrics.totalRequests++;
      metrics.failedRequests++;
      metrics.lastErrorAt = new Date().toISOString();
      metrics.lastErrorDetail = e?.message || String(e);

      this.addApiLog({
        provider: providerName,
        status: 'error',
        latencyMs,
        errorDetail: e?.message || String(e)
      });

      return {
        success: false,
        latencyMs,
        error: e?.message || String(e)
      };
    }
  }

  getDetailedResilienceReport() {
    const providers = this.getProviderStatus();
    const healthyCount = providers.filter(p => p.healthy && p.enabled && p.circuitState !== 'OPEN').length;
    
    return {
      redundancyLevel: healthyCount,
      totalTiers: providers.length,
      consecutiveFallbackCount: this.consecutiveFallbackCount,
      sleepModeActive: this.consecutiveFallbackCount > 2,
      maxFailuresThreshold: this.MAX_FAILURES,
      providers,
      recentFailovers: this.apiCallHistory.slice(0, 15)
    };
  }

  async generateResponse(request: LLMRequest): Promise<{ text: string, providerName: string, isIgnored?: boolean }> {
    for (const provider of this.getActiveProviders()) {
      if (!provider.isHealthy()) continue;

      const failures = this.circuitBreakerFailures.get(provider.name) || 0;
      if (failures >= this.MAX_FAILURES) {
         if (failures === this.MAX_FAILURES) {
           logger.warn(`Circuit Breaker OPEN: Skipping provider ${provider.name} due to excessive failures. (This usually means the API key is invalid or quota is exceeded)`);
           this.circuitBreakerFailures.set(provider.name, failures + 1); // Increment so we don't spam the log every loop
         }
         continue; // Move to fallback provider
      }

      const metrics = this.getOrInitMetrics(provider.name);
      metrics.totalRequests++;
      metrics.lastCalledAt = new Date().toISOString();

      let start = Date.now();
      try {
        logger.info(`Attempting generation with provider: ${provider.name}`);
        start = Date.now();
        
        // Execute AI Call with safety timeout to prevent stalling
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout: Provider ${provider.name} exceeded 18000ms limit`)), 18000)
        );
        const text = await Promise.race([provider.generate(request), timeoutPromise]);
        
        const latency = Date.now() - start;

        // Reset failures on successful completion
        this.circuitBreakerFailures.set(provider.name, 0);

        metrics.successfulRequests++;
        metrics.totalLatencyMs += latency;
        metrics.lastLatencyMs = latency;
        metrics.lastSuccessAt = new Date().toISOString();
        metrics.lastErrorDetail = null;

        if (provider.name === 'Fallback-Simulated') {
          this.consecutiveFallbackCount++;
          logger.warn(`Fallback-Simulated activated. Consecutive fallback count: ${this.consecutiveFallbackCount}`);
          if (this.consecutiveFallbackCount > 2) {
            logger.info(`Bohurupi has gone to sleep due to >2 consecutive fallbacks. Ignoring message silently (sleep mode).`);
            return { text: '', providerName: provider.name, isIgnored: true };
          }
        } else {
          this.consecutiveFallbackCount = 0;
        }

        logger.info(`Generation successful via ${provider.name}`, { 
          latency_ms: latency, 
          token_estimate: Math.ceil(text.length / 4) // Rough estimation
        });
        
        return { text, providerName: provider.name, isIgnored: false };

      } catch (error: any) {
        const errorMessage = error.message || '';
        
        let status: 'error' | 'rate_limit' = 'error';
        if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded')) {
          logger.warn(`Provider ${provider.name} rate limited (429). Triggering failover.`);
          status = 'rate_limit';
          metrics.rateLimitedRequests++;
        } else if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
          logger.warn(`Provider ${provider.name} is unreachable. Triggering failover.`);
        } else {
          logger.error(`Provider ${provider.name} failed`, { error: errorMessage });
        }
        
        metrics.failedRequests++;
        metrics.lastErrorAt = new Date().toISOString();
        metrics.lastErrorDetail = errorMessage;

        this.addApiLog({
          provider: provider.name,
          status,
          latencyMs: Date.now() - start, // Time taken before failure
          errorDetail: errorMessage
        });
        // Increment failure count
        this.circuitBreakerFailures.set(provider.name, failures + 1);
        
        // Loop will continue to the next fallback provider seamlessly
      }
    }

    logger.error('CRITICAL: All cloud and local AI providers failed.');
    throw new Error('All AI providers exhausted. Bohurupi is unable to process the thought.');
  }
}
