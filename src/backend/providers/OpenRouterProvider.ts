import { AIProvider, LLMRequest } from './ProviderManager';
import { logger } from '../telemetry/logger';

export class OpenRouterProvider implements AIProvider {
  name: string;
  private model: string;

  private overrideSystemPrompt?: string;

  constructor(name: string = 'Cloud-OpenRouter', model?: string, overrideSystemPrompt?: string) {
    this.overrideSystemPrompt = overrideSystemPrompt;
    this.name = name;
    this.model = model || process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash-0731';
  }

  isHealthy(): boolean {
    return !!process.env.OPENROUTER_API_KEY;
  }

  async generate(request: LLMRequest): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;
    // Defaulting to DeepSeek V4 Flash
    const model = this.model;

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is missing. Please set it in your environment variables.');
    }

    const systemPrompt = this.overrideSystemPrompt || request.systemInstruction || 'You are a helpful AI.';
    
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (request.history && request.history.length > 0) {
      for (const turn of request.history) {
        if (turn.content && turn.content.trim()) {
          messages.push({
            role: turn.role === 'user' ? 'user' : 'assistant',
            content: turn.content.trim()
          });
        }
      }
      messages.push({ role: 'user', content: request.prompt });
    } else {
      const userPrompt = request.context ? `CONTEXT:\n${request.context}\n\nUSER PROMPT:\n${request.prompt}` : request.prompt;
      messages.push({ role: 'user', content: userPrompt });
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000', // Recommended by OpenRouter
          'X-Title': 'Bohurupi AI Core', // Recommended by OpenRouter
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 300,
          temperature: 0.85,
          messages
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
