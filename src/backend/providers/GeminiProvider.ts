import { GoogleGenAI } from '@google/genai';
import { AIProvider, LLMRequest } from './ProviderManager';
import { logger } from '../telemetry/logger';

export class GeminiProvider implements AIProvider {
  name = 'Google-Gemini-2.5-Flash';
  private ai: GoogleGenAI | null = null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
      logger.info('GeminiProvider initialized successfully.');
    } else {
      logger.warn('GEMINI_API_KEY is not set. GeminiProvider will remain unhealthy and circuit breaker will bypass it.');
    }
  }

  isHealthy(): boolean {
    // Healthy only if the SDK initialized correctly
    return this.ai !== null;
  }

  async generate(request: LLMRequest): Promise<string> {
    if (!this.ai) {
      throw new Error('Gemini API is not initialized. Check GEMINI_API_KEY.');
    }

    const systemInstruction = request.systemInstruction || '';
    
    // We pass the context directly in the prompt for this implementation, 
    // though in a full RAG system, context might be injected via specific role blocks.
    const combinedPrompt = `${request.context ? `[System Context & Memories]\n${request.context}\n\n` : ''}User: ${request.prompt}`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: combinedPrompt,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      if (!response.text) {
        throw new Error('Received empty response from Gemini.');
      }

      return response.text;
    } catch (error: any) {
      const errorMessage = error.message || '';
      if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded')) {
        logger.warn('Gemini API Rate Limit Exceeded (429). Falling back to local Llama3.');
      } else {
        logger.error('Gemini API Error', { error: errorMessage });
      }
      throw error;
    }
  }
}
