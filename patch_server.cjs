const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldCode = `const openRouterProvider = new OpenRouterProvider();
providerManager.registerProvider(openRouterProvider);`;

const newCode = `const openRouterProvider = new OpenRouterProvider();
providerManager.registerProvider(openRouterProvider);

const nemotronProvider = new OpenRouterProvider('Nemotron-Lightning-Free', 'nvidia/nemotron-3.5-lightning:free');
providerManager.registerProvider(nemotronProvider);`;

if (code.includes(oldCode)) {
    code = code.replace(oldCode, newCode);
    fs.writeFileSync('server.ts', code);
} else {
    console.log("Could not find the target code block in server.ts");
}
