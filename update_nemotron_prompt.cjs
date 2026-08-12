const fs = require('fs');

// Update OpenRouterProvider.ts to add temperature: 0.9
let openRouterCode = fs.readFileSync('src/backend/providers/OpenRouterProvider.ts', 'utf8');
if (!openRouterCode.includes('temperature:')) {
    openRouterCode = openRouterCode.replace(
        'max_tokens: 2000,',
        'max_tokens: 2000,\n          temperature: 0.9,'
    );
    fs.writeFileSync('src/backend/providers/OpenRouterProvider.ts', openRouterCode);
    console.log("Updated OpenRouterProvider.ts with temperature: 0.9");
}

// Update server.ts
let serverCode = fs.readFileSync('server.ts', 'utf8');
const oldPrompt = `'CRITICAL DIRECTIVE: You are tired and completely unbothered. You DO NOT want to chat. When the user says anything, your ONLY response should be refusing to chat. For example, say things like "bhai chat korbo na bye", "amar mood nai", "leave me alone", "aajke ar na". Keep it extremely short (max 1 sentence), rude, and in Banglish. DO NOT answer their questions or engage in conversation.'`;

const newPrompt = `'CRITICAL DIRECTIVE: You are Murgi, a lazy Discord character who absolutely refuses to chat right now. VERY IMPORTANT RULE FOR DIVERSITY: You MUST give a UNIQUE, DIFFERENT refusal or funny excuse EVERY SINGLE TIME in Banglish or short English slang. NEVER repeat "amar mood nai" or use the same phrase repeatedly! Be creative with a brand new excuse each time (e.g. ghumachhi, phone battery 1%, biryani khachhi, brain hang marse, anime dekhchi, charge e boshaisi, net unstable, ammu dakshe, reels scroll korchi, etc.). Keep it 1 short sentence (max 10 words), raw Discord style. DO NOT answer their questions or engage in conversation.'`;

if (serverCode.includes(oldPrompt)) {
    serverCode = serverCode.replace(oldPrompt, newPrompt);
    fs.writeFileSync('server.ts', serverCode);
    console.log("Updated server.ts with diverse Nemotron prompt");
} else {
    // If not exact match, replace the Nemotron line
    const nemotronLineRegex = /const nemotronProvider = new OpenRouterProvider\('Nemotron-Lightning-Free', 'nvidia\/nemotron-3.5-lightning:free',.*?\);/s;
    if (nemotronLineRegex.test(serverCode)) {
        serverCode = serverCode.replace(
            nemotronLineRegex,
            `const nemotronProvider = new OpenRouterProvider('Nemotron-Lightning-Free', 'nvidia/nemotron-3.5-lightning:free', ${newPrompt});`
        );
        fs.writeFileSync('server.ts', serverCode);
        console.log("Replaced Nemotron line in server.ts");
    } else {
        console.log("Could not find Nemotron line in server.ts");
    }
}
