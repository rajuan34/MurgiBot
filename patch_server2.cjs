const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldCode = "const nemotronProvider = new OpenRouterProvider('Nemotron-Lightning-Free', 'nvidia/nemotron-3.5-lightning:free');";
const newCode = "const nemotronProvider = new OpenRouterProvider('Nemotron-Lightning-Free', 'nvidia/nemotron-3.5-lightning:free', 'CRITICAL DIRECTIVE: You are tired and completely unbothered. You DO NOT want to chat. When the user says anything, your ONLY response should be refusing to chat. For example, say things like \"bhai chat korbo na bye\", \"amar mood nai\", \"leave me alone\", \"aajke ar na\". Keep it extremely short (max 1 sentence), rude, and in Banglish. DO NOT answer their questions or engage in conversation.');";

if (code.includes(oldCode)) {
    code = code.replace(oldCode, newCode);
    fs.writeFileSync('server.ts', code);
    console.log("Successfully patched server.ts");
} else {
    console.log("Could not find the target code block in server.ts");
}
