const fs = require('fs');

let content = fs.readFileSync('src/backend/providers/OpenRouterProvider.ts', 'utf8');

// Replace the default model
content = content.replace(
  "this.model = model || process.env.OPENROUTER_MODEL || 'google/gemini-3.5-flash';",
  "this.model = model || process.env.OPENROUTER_MODEL || 'deepseek/deepseek-v4-flash-0731';"
);

// Remove the obsolete comment
content = content.replace(
  "// Defaulting to the requested Gemini 3.5 Flash model on OpenRouter",
  "// Defaulting to DeepSeek V4 Flash"
);

fs.writeFileSync('src/backend/providers/OpenRouterProvider.ts', content);
console.log('Updated OpenRouterProvider.ts');
