import { AIProvider, LLMRequest } from './ProviderManager';
import { logger } from '../telemetry/logger';

export const DEFAULT_OPENROUTER_MODELS = [
  'deepseek/deepseek-chat',
  'qwen/qwen3.8-27b:free',
  'nvidia/nemotron-3.5-lightning:free',
  'liquid/lfm-2.5-2.6b:free'
];

export class OpenRouterProvider implements AIProvider {
  name: string;
  private models: string[];
  private lastSuccessfulModel: string | null = null;

  constructor(name: string = 'Cloud-OpenRouter', model?: string) {
    this.name = name;
    const primary = model || process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';
    this.models = Array.from(new Set([primary, ...DEFAULT_OPENROUTER_MODELS]));
  }

  isHealthy(): boolean {
    return !!process.env.OPENROUTER_API_KEY;
  }

  getLastSuccessfulModel(): string | null {
    return this.lastSuccessfulModel;
  }

  async generate(request: LLMRequest): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is missing. Please set it in your environment variables.');
    }

    const systemPrompt = request.systemInstruction || 'You are a helpful AI.';
    
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

    // Build try order: lastSuccessfulModel first if present
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

    for (let i = 0; i < candidateModels.length; i++) {
      const model = candidateModels[i];
      const nextModel = candidateModels[i + 1];

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
            'X-Title': 'Bohurupi AI Core',
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 150,
            temperature: 0.85,
            messages
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorData}`);
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message?.content) {
          throw new Error('Invalid or empty response from OpenRouter API');
        }

        this.lastSuccessfulModel = model;
        logger.info(`[OpenRouter] Successfully generated response using model: ${model}`);
        return data.choices[0].message.content;
      } catch (error: any) {
        clearTimeout(timeoutId);
        lastError = error;
        const isAbort = error.name === 'AbortError' || error.message?.includes('aborted');
        const errDetail = isAbort ? `OpenRouter model [${model}] timed out after 8000ms` : (error.message || String(error));
        
        if (nextModel) {
          logger.warn(`[OpenRouter] Model [${model}] failed (${errDetail.slice(0, 80)}). Cascading to [${nextModel}]...`);
          continue;
        } else {
          logger.error(`[OpenRouter] Model [${model}] failed, no more fallback models left: ${errDetail}`);
        }
      }
    }

    throw new Error(`All OpenRouter cascading models failed. Last error: ${lastError?.message || String(lastError)}`);
  }
}
