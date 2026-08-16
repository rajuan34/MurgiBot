const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "const openRouterProvider = new OpenRouterProvider();",
  "const openRouterProvider = new OpenRouterProvider('Cloud-OpenRouter', 'deepseek/deepseek-v4-flash-0731');"
);

fs.writeFileSync('server.ts', content);
console.log('Updated server.ts');
