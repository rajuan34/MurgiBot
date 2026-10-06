import { AIProvider, LLMRequest } from './ProviderManager';
import { logger } from '../telemetry/logger';

/**
 * Ultra-cheap and high-definition models on OpenRouter.
 * DeepSeek V4 Flash 0731 ($0.006 / 1M tokens) is set as the primary model.
 * Backed by 100% FREE (:free) models and sub-penny micro-cost backups.
 */
export const DEFAULT_OPENROUTER_MODELS = [
  // Primary: DeepSeek V4 Flash 0731 (Ultra-cheap $0.006 / 1M tokens, 284B MoE, ultra-fast reasoning)
  'deepseek/deepseek-v4-flash-0731',
  'deepseek/deepseek-v4-flash-0731:free',

  // Tier A: 100% FREE Models (Cost: $0.00 / Zero balance burn)
  'google/gemini-2.0-flash-exp:free',          // Ultra-fast, high intelligence, native multilingual
  'meta-llama/llama-3.3-70b-instruct:free',    // Powerful 70B parameter frontier model, 100% free
  'mistralai/mistral-small-24b-instruct-2501:free', // Ultra-efficient 24B instruct, 100% free
  'nvidia/nemotron-3.5-lightning:free',        // High-speed low-latency inference, 100% free
  'qwen/qwen-2.5-coder-32b-instruct:free',     // Sharp logic, 100% free
  'deepseek/deepseek-chat:free',               // DeepSeek V3 free endpoint

  // Tier B: Sub-Penny Micro-Cost Backups (Cost: $0.02 - $0.14 per 1M tokens)
  'meta-llama/llama-3.2-3b-instruct',          // Micro-cost ~$0.02 / 1M tokens
  'deepseek/deepseek-chat'                     // DeepSeek V3 budget tier ~$0.14 / 1M tokens
];

export class OpenRouterProvider implements AIProvider {
  name: string;
  private models: string[];
  private lastSuccessfulModel: string | null = null;

  constructor(name: string = 'Cloud-OpenRouter', model?: string) {
    this.name = name;
    const primary = model || process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash-0731';
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

    const systemPrompt = (request.systemInstruction || 'You are Bohurupi, a witty Discord bot who speaks authentic Banglish.') +
      '\n\nSTRICT INSTRUCTION: Output ONLY the final dialogue in Banglish. NEVER output thinking steps, reasoning, prompt analysis, quotes of system/user instructions, or meta-commentary (such as "Actually, the prompt says...").';
    
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
            max_tokens: 220,
            temperature: temperature,
            top_p: top_p,
            frequency_penalty: 0.15,
            presence_penalty: 0.1,
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

        // Strip model role echoes like "Bohurupi:" or "Assistant:"
        cleanContent = cleanContent.replace(/^(?:Bohurupi|Assistant|Bot|Reply|Output):\s*/i, '').trim();

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
