import { GoogleGenAI } from '@google/genai';
import { AIProvider, LLMRequest } from './ProviderManager';
import { logger } from '../telemetry/logger';

/**
 * Ordered list of Google AI Studio free/flash models for cascading failover.
 * When primary models hit credit/quota/rate limits (429/503), the provider automatically
 * falls back to the next available model in the cascade.
 */
export const DEFAULT_GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.8-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest'
];

export class GeminiProvider implements AIProvider {
  name: string;
  private ai: GoogleGenAI | null = null;
  private models: string[];
  private lastSuccessfulModel: string | null = 'gemini-3.1-flash-lite';

  constructor(name: string = 'Google-Gemini') {
    this.name = name;
    
    // Allow custom model list override via environment variables
    const envModels = (process.env.GEMINI_MODELS || '')
      .split(',')
      .map(m => m.trim())
      .filter(m => m.length > 0);

    this.models = envModels.length > 0 ? envModels : DEFAULT_GEMINI_MODELS;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
      logger.info(`GeminiProvider initialized with cascading models: ${this.models.join(' -> ')}`);
    } else {
      logger.warn('GEMINI_API_KEY is not set. GeminiProvider will remain unhealthy and circuit breaker will bypass it.');
    }
  }

  isHealthy(): boolean {
    return this.ai !== null;
  }

  getLastSuccessfulModel(): string | null {
    return this.lastSuccessfulModel;
  }

  async generate(request: LLMRequest): Promise<string> {
    if (!this.ai) {
      throw new Error('Gemini API is not initialized. Check GEMINI_API_KEY.');
    }

    const systemInstruction = request.systemInstruction || '';
    
    let contents: any[] = [];
    if (request.history && request.history.length > 0) {
      contents = request.history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.content }]
      }));
      contents.push({
        role: 'user',
        parts: [{ text: request.prompt }]
      });
    } else {
      const combinedPrompt = `${request.context ? `[System Context & Memories]\n${request.context}\n\n` : ''}User: ${request.prompt}`;
      contents = [{ role: 'user', parts: [{ text: combinedPrompt }] }];
    }

    // Build model try list: start with lastSuccessfulModel, then rest of models
    const candidateModels: string[] = [];
    if (this.lastSuccessfulModel && this.models.includes(this.lastSuccessfulModel)) {
      candidateModels.push(this.lastSuccessfulModel);
    }
    for (const m of this.models) {
      if (!candidateModels.includes(m)) {
        candidateModels.push(m);
      }
    }

    let lastError: any = null;

    // Cascading model failover loop
    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];
      const nextModel = candidateModels[i + 1];

      try {
        const callPromise = this.ai.models.generateContent({
          model: model,
          contents,
          config: {
            systemInstruction: systemInstruction,
            maxOutputTokens: 300,
            temperature: 0.8
          }
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Gemini request for model [${model}] timed out after 3000ms`)), 3000)
        );

        const response = await Promise.race([callPromise, timeoutPromise]);

        if (!response.text) {
          throw new Error(`Received empty text response from model [${model}].`);
        }

        this.lastSuccessfulModel = model;
        logger.info(`[Google-Gemini] Successfully generated response using model: ${model}`);
        return response.text;

      } catch (error: any) {
        lastError = error;
        const errorMessage = error.message || String(error);
        const isQuotaOrDemand = 
          errorMessage.includes('429') || 
          errorMessage.includes('Quota exceeded') ||
          errorMessage.includes('RESOURCE_EXHAUSTED') ||
          errorMessage.includes('503') ||
          errorMessage.includes('high demand') ||
          errorMessage.includes('UNAVAILABLE') ||
          errorMessage.includes('404') ||
          errorMessage.includes('NOT_FOUND') ||
          errorMessage.includes('timed out');

        if (isQuotaOrDemand && nextModel) {
          logger.info(`[Google-Gemini] Model [${model}] busy/limited, cascading to [${nextModel}]...`);
          continue;
        } else if (nextModel) {
          logger.info(`[Google-Gemini] Model [${model}] error, trying [${nextModel}]...`);
          continue;
        } else {
          logger.error(`[Google-Gemini] Model [${model}] failed and no cascading models left: ${errorMessage}`);
        }
      }
    }

    throw new Error(`All Google-Gemini cascading models failed. Last error: ${lastError?.message || String(lastError)}`);
  }
}
