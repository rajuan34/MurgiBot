const fs = require('fs');
const path = 'server.ts';
let code = fs.readFileSync(path, 'utf8');

const originalRegistration = `// Register Real AI Providers
const geminiProvider = new GeminiProvider();
providerManager.registerProvider(geminiProvider);

const openRouterProvider = new OpenRouterProvider('Cloud-OpenRouter', 'deepseek/deepseek-v4-flash-0731');
providerManager.registerProvider(openRouterProvider);`;

const newRegistration = `// Register Real AI Providers
const openRouterProvider = new OpenRouterProvider('Cloud-OpenRouter', 'deepseek/deepseek-v4-flash-0731');
providerManager.registerProvider(openRouterProvider);

const geminiProvider = new GeminiProvider();
providerManager.registerProvider(geminiProvider);`;

code = code.replace(originalRegistration, newRegistration);

fs.writeFileSync(path, code);
console.log('Swapped provider order in server.ts');
