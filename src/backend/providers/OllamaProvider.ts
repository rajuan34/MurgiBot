import { AIProvider, LLMRequest } from './ProviderManager';
import { logger } from '../telemetry/logger';

export class OllamaProvider implements AIProvider {
  name = 'Local-Ollama-Llama3';
  private baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
  private model = process.env.OLLAMA_MODEL || 'llama3';

  isHealthy(): boolean {
    // We assume it's healthy, the Circuit Breaker will track actual request failures
    return true;
  }

  async generate(request: LLMRequest): Promise<string> {
    const combinedPrompt = `
${request.systemInstruction || ''}
${request.context || ''}

User: ${request.prompt}
Bohurupi:`.trim();

    try {
      const cleanBaseUrl = this.baseUrl.replace(/\/$/, '');
      const response = await fetch(`${cleanBaseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          prompt: combinedPrompt,
          stream: false, // Wait for full response
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API responded with status: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error: any) {
      const errorMessage = error.message || '';
      if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
        logger.warn(`Ollama is unreachable at ${this.baseUrl}. Is the Ollama server running?`);
      } else {
        logger.error('Ollama Provider Error', { error: errorMessage });
      }
      throw error;
    }
  }
}
