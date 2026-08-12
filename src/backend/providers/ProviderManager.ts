import { logger } from '../telemetry/logger';

export interface LLMRequest {
  prompt: string;
  context?: string; // Contains retrieved memory and emotion data
  systemInstruction?: string; // Overrides character rules if needed
}

export interface AIProvider {
  name: string;
  generate(request: LLMRequest): Promise<string>;
  isHealthy(): boolean;
}

/**
 * ProviderManager handles multi-provider failover, API key rotation, 
 * and implements a Circuit Breaker pattern to ensure resilience.
 */
export class ProviderManager {
  private providers: AIProvider[] = [];
  private circuitBreakerFailures: Map<string, number> = new Map();
  private readonly MAX_FAILURES = 3; // Block provider after 3 consecutive failures

  registerProvider(provider: AIProvider) {
    this.providers.push(provider);
    this.circuitBreakerFailures.set(provider.name, 0);
    logger.info(`Registered AI Provider: ${provider.name}`);
  }

  getProviderStatus() {
    return this.providers.map(p => ({
      name: p.name,
      healthy: p.isHealthy(),
      failures: this.circuitBreakerFailures.get(p.name) || 0
    }));
  }

  async generateResponse(request: LLMRequest): Promise<{ text: string, providerName: string }> {
    for (const provider of this.providers) {
      if (!provider.isHealthy()) continue;

      const failures = this.circuitBreakerFailures.get(provider.name) || 0;
      if (failures >= this.MAX_FAILURES) {
         if (failures === this.MAX_FAILURES) {
           logger.warn(`Circuit Breaker OPEN: Skipping provider ${provider.name} due to excessive failures. (This usually means the API key is invalid or quota is exceeded)`);
           this.circuitBreakerFailures.set(provider.name, failures + 1); // Increment so we don't spam the log every loop
         }
         continue; // Move to fallback provider
      }

      try {
        logger.info(`Attempting generation with provider: ${provider.name}`);
        const start = Date.now();
        
        // Execute AI Call
        const text = await provider.generate(request);
        
        const latency = Date.now() - start;

        // Reset failures on successful completion
        this.circuitBreakerFailures.set(provider.name, 0);

        logger.info(`Generation successful via ${provider.name}`, { 
          latency_ms: latency, 
          token_estimate: Math.ceil(text.length / 4) // Rough estimation
        });
        
        return { text, providerName: provider.name };

      } catch (error: any) {
        const errorMessage = error.message || '';
        if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded')) {
          logger.warn(`Provider ${provider.name} rate limited (429). Triggering failover.`);
        } else if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
          logger.warn(`Provider ${provider.name} is unreachable. Triggering failover.`);
        } else {
          logger.error(`Provider ${provider.name} failed`, { error: errorMessage });
        }
        // Increment failure count
        this.circuitBreakerFailures.set(provider.name, failures + 1);
        
        // Loop will continue to the next fallback provider seamlessly
      }
    }

    logger.error('CRITICAL: All cloud and local AI providers failed.');
    throw new Error('All AI providers exhausted. Murgi is unable to process the thought.');
  }
}
