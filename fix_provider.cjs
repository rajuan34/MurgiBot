const fs = require('fs');
let code = fs.readFileSync('src/backend/providers/ProviderManager.ts', 'utf8');

code = code.replace(
  /try \{\s+logger\.info\(`Attempting generation with provider: \$\{provider\.name\}`\);\s+const start = Date\.now\(\);/g,
  \`let start = Date.now();
      try {
        logger.info(\\\`Attempting generation with provider: \\\${provider.name}\\\`);
        start = Date.now();\`
);

fs.writeFileSync('src/backend/providers/ProviderManager.ts', code);
console.log('Fixed ProviderManager.ts');
