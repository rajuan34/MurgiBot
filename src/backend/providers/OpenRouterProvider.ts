import { AIProvider, LLMRequest } from './ProviderManager';
import { logger } from '../telemetry/logger';

/**
 * Ultra-cheap and high-definition models on OpenRouter.
 * Uses OpenRouter's official Free Router (openrouter/free) and active verified models.
 * Sub-penny micro-cost models (fractions of a cent per 1M tokens) serve as last-resort backup.
 */
export const DEFAULT_OPENROUTER_MODELS = [
  // Primary & Free Tier (Cost: $0.00 / Zero balance burn)
  'openrouter/free',                         // OpenRouter Official Free Auto-Router (Always online, 0 cost)
  'nvidia/nemotron-3.5-lightning:free',      // High-speed low-latency inference, 100% free
  'liquid/lfm-2.5-2.6b:free',                // Lightweight free endpoint

  // Sub-Penny Micro-Cost Backups (Cost: $0.01 - $0.14 per 1M tokens)
  'meta-llama/llama-3.2-3b-instruct',        // Micro-cost ~$0.02 / 1M tokens
  'meta-llama/llama-3.2-1b-instruct',        // Micro-cost ~$0.01 / 1M tokens
  'deepseek/deepseek-chat'                   // DeepSeek V3 budget tier ~$0.14 / 1M tokens
];

export class OpenRouterProvider implements AIProvider {
  name: string;
  private models: string[];
  private lastSuccessfulModel: string | null = null;

  constructor(name: string = 'Cloud-OpenRouter', model?: string) {
    this.name = name;
    const primary = model || process.env.OPENROUTER_MODEL || 'openrouter/free';
    this.models = Array.from(new Set([primary, ...DEFAULT_OPENROUTER_MODELS]));
  }

  isHealthy(): boolean {
    return !!process.env.OPENROUTER_API_KEY;
  }

  getLastSuccessfulModel(): string | null {
    return this.lastSuccessfulModel;
  }

  getAvailableModels(): string[] {
    return [...this.models];
  }

  async generate(request: LLMRequest): Promise<string> {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is missing. Please set it in your environment variables.');
    }

    let systemPrompt = (request.systemInstruction || 'You are Bohurupi, a witty Discord bot who speaks authentic Banglish.').trim();
    if (request.context && request.context.trim()) {
      systemPrompt += `\n\n[USER CONTEXT & MEMORIES]\n${request.context.trim()}`;
    }
    systemPrompt += `\n\nCRITICAL CONVERSATION DIRECTIVES:
- Output ONLY the direct conversational dialogue as Bohurupi in Banglish.
- NEVER output thinking steps, reasoning analysis, or phrases like "Here's a thinking process".
- NEVER echo or parrot the user's message back with a question mark (e.g. NEVER start with "ja ase dekhao?" or "chill mode?").
- NEVER repeat the same sentence patterns, jokes, or boilerplate phrases from recent messages. Keep every reply fresh and diverse!
- NEVER talk about internal personality modes or state names.`;
    
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt }
    ];

    if (request.history && request.history.length > 0) {
      for (const turn of request.history) {
        if (turn.content && turn.content.trim()) {
          const content = turn.content.trim();
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
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      // Tailor parameters specifically for model family
      const isNemotron = /nemotron/i.test(model);
      const isLlama = /llama/i.test(model);

      const temperature = (isNemotron || isLlama) ? 0.7 : 0.8;
      const top_p = 0.9;
      const stopTokens = [
        '\nUser:',
        '\nAssistant:',
        '\nSystem:',
        '<|im_end|>',
        '<|endoftext|>',
        '<|eot_id|>',
        'Actually, the prompt'
      ];

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
            max_tokens: 350,
            temperature: temperature,
            top_p: top_p,
            frequency_penalty: 0.45,
            presence_penalty: 0.45,
            stop: stopTokens,
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
        const rawContent = data.choices?.[0]?.message?.content;
        if (!rawContent || !rawContent.trim()) {
          throw new Error('Invalid or empty response from OpenRouter API');
        }

        // Clean out any <think> or markdown code block reasoning from models
        let cleanContent = rawContent
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .replace(/```(?:thought|thinking)?[\s\S]*?```/gi, '')
          .trim();

        // Strip raw thinking process blocks like "Here's a thinking process: 1. **Analyze User Input:** ... "
        if (
          /Here's a thinking process:/i.test(cleanContent) || 
          /^Thinking Process:/i.test(cleanContent) ||
          /Analyze User Input:/i.test(cleanContent) ||
          /Check Persona Constraints:/i.test(cleanContent)
        ) {
          const matchDialogue = cleanContent.match(/(?:Final Response|Output|Dialogue|Response|Bohurupi):\s*([\s\S]+)$/i);
          if (matchDialogue && matchDialogue[1]?.trim()) {
            cleanContent = matchDialogue[1].trim();
          } else {
            const lines = cleanContent.split('\n');
            const dialogueLines = lines.filter(l => {
              const trimmed = l.trim();
              if (!trimmed) return false;
              if (/thinking process/i.test(trimmed)) return false;
              if (/^[0-9]+\.\s*\*\*/.test(trimmed)) return false;
              if (/^[-*•]/.test(trimmed)) return false;
              if (/user is asking/i.test(trimmed)) return false;
              if (/constraints from/i.test(trimmed)) return false;
              if (/respond as bohurupi/i.test(trimmed)) return false;
              if (trimmed.startsWith('[') && trimmed.endsWith(']')) return false;
              return true;
            });
            cleanContent = dialogueLines.join(' ').trim();
          }
        }

        // Strip model role echoes like "Bohurupi:" or "Assistant:"
        cleanContent = cleanContent.replace(/^(?:Bohurupi|Assistant|Bot|Reply|Output|Dialogue|Final Response):\s*/i, '').trim();

        // Strip quotes if the whole message was wrapped in quotes
        cleanContent = cleanContent.replace(/^["'“‘`\\]+|["'”’`\\]+$/g, '').trim();

        if (!cleanContent) {
          throw new Error('Response contained only reasoning tokens without text content');
        }

        this.lastSuccessfulModel = model;
        logger.info(`[OpenRouter] Successfully generated response using model: ${model}`);
        return cleanContent;
      } catch (error: any) {
        clearTimeout(timeoutId);
        lastError = error;
        const isAbort = error.name === 'AbortError' || error.message?.includes('aborted');
        const errDetail = isAbort ? `OpenRouter model [${model}] timed out after 9000ms` : (error.message || String(error));
        
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
