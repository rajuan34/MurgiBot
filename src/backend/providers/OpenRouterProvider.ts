import { AIProvider, LLMRequest } from './ProviderManager';
import { logger } from '../telemetry/logger';

export class OpenRouterProvider implements AIProvider {
  name: string;
  private model: string;

  private overrideSystemPrompt?: string;

  constructor(name: string = 'Cloud-OpenRouter', model?: string, overrideSystemPrompt?: string) {
    this.overrideSystemPrompt = overrideSystemPrompt;
    this.name = name;
    this.model = model || process.env.OPENROUTER_MODEL || 'google/gemini-3.5-flash';
  }

  isHealthy(): boolean {
    return !!process.env.OPENROUTER_API_KEY;
  }

  async generate(request: LLMRequest): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    // Defaulting to the requested Gemini 3.5 Flash model on OpenRouter
    const model = this.model;

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is missing. Please set it in your environment variables.');
    }

    const systemPrompt = this.overrideSystemPrompt || request.systemInstruction || 'You are a helpful AI.';
    const userPrompt = request.context ? `CONTEXT:\n${request.context}\n\nUSER PROMPT:\n${request.prompt}` : request.prompt;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000', // Recommended by OpenRouter
          'X-Title': 'Murgi AI Core', // Recommended by OpenRouter
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 2000,
          temperature: 0.9, // Explicitly limit tokens so it doesn't reserve the model's max context (65k) which causes 402 on low balance
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error: any) {
      logger.error('OpenRouter Provider Error', { error: error.message });
      throw error;
    }
  }
}
