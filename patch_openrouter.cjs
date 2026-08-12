const fs = require('fs');
let code = fs.readFileSync('src/backend/providers/OpenRouterProvider.ts', 'utf8');

code = code.replace("name = 'Cloud-OpenRouter';", "name: string;\n  private model: string;\n\n  constructor(name: string = 'Cloud-OpenRouter', model?: string) {\n    this.name = name;\n    this.model = model || process.env.OPENROUTER_MODEL || 'google/gemini-3.5-flash';\n  }");

code = code.replace("const model = process.env.OPENROUTER_MODEL || 'google/gemini-3.5-flash';", "const model = this.model;");

fs.writeFileSync('src/backend/providers/OpenRouterProvider.ts', code);
