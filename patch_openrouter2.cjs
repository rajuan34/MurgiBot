const fs = require('fs');
let code = fs.readFileSync('src/backend/providers/OpenRouterProvider.ts', 'utf8');

code = code.replace(
  "constructor(name: string = 'Cloud-OpenRouter', model?: string) {",
  "private overrideSystemPrompt?: string;\n\n  constructor(name: string = 'Cloud-OpenRouter', model?: string, overrideSystemPrompt?: string) {\n    this.overrideSystemPrompt = overrideSystemPrompt;"
);

code = code.replace(
  "const systemPrompt = request.systemInstruction || 'You are a helpful AI.';",
  "const systemPrompt = this.overrideSystemPrompt || request.systemInstruction || 'You are a helpful AI.';"
);

fs.writeFileSync('src/backend/providers/OpenRouterProvider.ts', code);
