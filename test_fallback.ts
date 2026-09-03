import { ProviderManager } from './src/backend/providers/ProviderManager';
import { GeminiProvider } from './src/backend/providers/GeminiProvider';

const providerManager = new ProviderManager();

// Fake a provider that always fails
providerManager.registerProvider({
  name: 'Failing-Provider',
  isHealthy: () => true,
  generate: async (req) => { throw new Error('Simulated failure'); }
});

// Fallback
providerManager.registerProvider({
  name: 'Fallback-Simulated',
  isHealthy: () => true,
  generate: async (req) => 'Fallback success'
});

async function run() {
  try {
    const res = await providerManager.generateResponse({ prompt: 'test' });
    console.log('Result:', res);
  } catch (e) {
    console.error('Final Error:', e);
  }
}
run();
