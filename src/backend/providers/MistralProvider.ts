import { AIProvider, LLMRequest } from './ProviderManager';
import { logger } from '../telemetry/logger';

export class MistralProvider implements AIProvider {
  name: string;
  private model: string;
  private overrideSystemPrompt?: string;

  constructor(name: string = 'Mistral-AI', model?: string, overrideSystemPrompt?: string) {
    this.name = name;
    // Users can override model via MISTRAL_MODEL or MISTAL_MODEL. Default to 'ministral-8b-latest'
    this.model = model || process.env.MISTRAL_MODEL || process.env.MISTAL_MODEL || 'ministral-8b-latest';
    this.overrideSystemPrompt = overrideSystemPrompt;
  }

  private getApiKey(): string | undefined {
    return process.env.MISTAL_KEY || process.env.MISTRAL_KEY || process.env.MISTRAL_API_KEY;
  }

  isHealthy(): boolean {
    return !!this.getApiKey();
  }

  async generate(request: LLMRequest): Promise<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('Mistral API key is missing. Please set MISTAL_KEY or MISTRAL_KEY in your environment variables.');
    }

    const systemPrompt = this.overrideSystemPrompt || request.systemInstruction || 'You are Bohurupi, a witty and helpful AI assistant.';
    const userPrompt = request.context
      ? `CONTEXT:\n${request.context}\n\nUSER PROMPT:\n${request.prompt}`
      : request.prompt;

    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.75,
          frequency_penalty: 0.5,
          presence_penalty: 0.4,
          max_tokens: 1500,
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
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response structure received from Mistral API');
      }

      return data.choices[0].message.content;
    } catch (error: any) {
      logger.error('Mistral Provider Error', { error: error.message });
      throw error;
    }
  }
}
