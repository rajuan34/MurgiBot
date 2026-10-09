import { AIProvider, LLMRequest } from './ProviderManager';
import { logger } from '../telemetry/logger';

/**
 * Progga AI Provider using DeepSeek v4 Flash (0731).
 * Base URL: https://api.progga.app/v1
 */
export const DEFAULT_PROGGA_MODELS = [
  'deepseek-v4-flash-0731'
];

export class ProggaProvider implements AIProvider {
  name: string;
  private baseUrl: string;
  private models: string[];
  private lastSuccessfulModel: string | null = 'deepseek-v4-flash-0731';

  constructor(name: string = 'Progga', model?: string) {
    this.name = name;
    this.baseUrl = (process.env.PROGGA_BASE_URL || 'https://api.progga.app/v1').replace(/\/+$/, '');
    const chosenModel = model || process.env.PROGGA_MODEL || 'deepseek-v4-flash-0731';
    this.models = [chosenModel];
  }

  isHealthy(): boolean {
    const key = process.env.PROGGA_KEY || process.env.PROGGA_API_KEY;
    return !!key;
  }

  getLastSuccessfulModel(): string | null {
    return this.lastSuccessfulModel;
  }

  getAvailableModels(): string[] {
    return [...this.models];
  }

  async generate(request: LLMRequest): Promise<string> {
    const apiKey = (process.env.PROGGA_KEY || process.env.PROGGA_API_KEY || '').trim();

    if (!apiKey) {
      throw new Error('PROGGA_KEY is missing. Please set PROGGA_KEY in your environment variables.');
    }

    let systemPrompt = (request.systemInstruction || 'You are Bohurupi, a witty Discord bot who speaks authentic Banglish.').trim();
    if (request.context && request.context.trim()) {
      systemPrompt += `\n\n[USER CONTEXT & MEMORIES]\n${request.context.trim()}`;
    }
    systemPrompt += `\n\nCRITICAL CONVERSATION DIRECTIVES:
- Output ONLY the direct conversational dialogue as Bohurupi in Banglish.
- NEVER output thinking steps, reasoning analysis, or phrases like "Here's a thinking process".
- NEVER echo or parrot the user's message back with a question mark (e.g. NEVER start with "ja ase dekhao?" or "chill mode?"). Jump straight into your real response.
- NEVER repeat the same sentence patterns, jokes, or boilerplate phrases from recent messages. Every single reply MUST have fresh vocabulary, diverse humor, and authentic personality!
- NEVER talk about internal personality modes or state names (do not say "chill mode", "chill vibe", "playful mode", etc.). Just act natural.`;

    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (request.history && request.history.length > 0) {
      for (const turn of request.history) {
        if (turn.content && turn.content.trim()) {
          const content = turn.content.trim();
          // Skip poisoned repetitive turns from history so model doesn't mimic them
          if (turn.role === 'assistant' && /(?:shudhu chill vibe|chill mode nei|shudhu chill mode)/i.test(content)) {
            continue;
          }
          messages.push({
            role: turn.role === 'user' ? 'user' : 'assistant',
            content
          });
        }
      }
      messages.push({ role: 'user', content: request.prompt });
    } else {
      messages.push({ role: 'user', content: request.prompt });
    }

    // Build try order: lastSuccessfulModel first
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        const endpoint = `${this.baseUrl}/chat/completions`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages,
            temperature: 0.85,
            top_p: 0.9,
            frequency_penalty: 0.5,
            presence_penalty: 0.5,
            max_tokens: 600
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          const status = res.status;
          
          if (status === 401 || status === 403) {
            throw new Error(`[Progga] Authorization failed on ${endpoint}: HTTP ${status}: Invalid API Key or Unauthorized (${errText.slice(0, 100)})`);
          }

          if (status === 429) {
            throw new Error(`[Progga] Rate limited (429) on model ${model}: ${errText.slice(0, 100)}`);
          }

          throw new Error(`[Progga] HTTP ${status} from ${endpoint} (model: ${model}): ${errText.slice(0, 150)}`);
        }

        const data = await res.json();
        let rawContent = data.choices?.[0]?.message?.content;

        if (typeof rawContent !== 'string' || !rawContent.trim()) {
          // Check reasoning content if standard content is empty
          const reasoning = data.choices?.[0]?.message?.reasoning;
          if (typeof reasoning === 'string' && reasoning.trim()) {
            rawContent = reasoning.trim();
          } else {
            throw new Error(`[Progga] Empty response received from model ${model}`);
          }
        }

        // Clean out any rogue thinking tags from reasoning models
        let clean = rawContent
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .replace(/```(?:thought|thinking)[\s\S]*?```/gi, '')
          .trim();

        if (!clean) {
          clean = rawContent.replace(/<\/?think>/gi, '').trim();
        }

        this.lastSuccessfulModel = model;
        return clean;

      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        if (err.name === 'AbortError') {
          logger.warn(`[Progga] Request timeout on model ${model}`);
        } else {
          logger.warn(`[Progga] Error on model ${model}: ${err.message}`);
        }

        // For auth errors, fail fast without spamming cascade
        if (err.message && (err.message.includes('Authorization failed') || err.message.includes('Invalid API Key'))) {
          throw err;
        }

        // Otherwise try next candidate model
        continue;
      }
    }

    throw lastError || new Error('[Progga] All candidate models failed.');
  }
}
