import { GoogleGenAI } from '@google/genai';
import { AIProvider, LLMRequest } from './ProviderManager';
import { logger } from '../telemetry/logger';

export class GeminiProvider implements AIProvider {
  name = 'Google-Gemini-3.8-Flash';
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
    return this.ai !== null;
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

    try {
      const callPromise = this.ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction: systemInstruction,
          maxOutputTokens: 300,
          temperature: 0.8
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API request timed out after 6000ms')), 6000)
      );

      const response = await Promise.race([callPromise, timeoutPromise]);

      if (!response.text) {
        throw new Error('Received empty response from Gemini.');
      }

      return response.text;
    } catch (error: any) {
      const errorMessage = error.message || '';
      if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded')) {
        logger.warn('Gemini API Rate Limit Exceeded (429). Triggering failover.');
      } else {
        logger.error('Gemini API Error', { error: errorMessage });
      }
      throw error;
    }
  }
}
