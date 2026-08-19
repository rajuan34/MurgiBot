const fs = require('fs');
let content = fs.readFileSync('src/backend/core/MurgiBrain.ts', 'utf8');

const oldPromptPart = `[Rules of Engagement]
1. Respond to the user directly and concisely. 
2. Reference the [Long-Term Facts] if relevant to make the user feel remembered.
3. React to the [Recent Conversation Context] fluidly. Do not repeat greetings.`.trim();

const newPromptPart = `[Rules of Engagement]
1. Respond to the user directly and concisely. 
2. Reference the [Long-Term Facts] if relevant to make the user feel remembered.
3. React to the [Recent Conversation Context] fluidly. Do not repeat greetings.
4. IMPORTANT: Only output the exact message Murgi says. Do NOT output any metadata, date, tags, or headers (like "date: (no date set for the post)"). Just the raw response.`.trim();

content = content.replace(oldPromptPart, newPromptPart);

fs.writeFileSync('src/backend/core/MurgiBrain.ts', content);
console.log('MurgiBrain.ts patched with strict output format rule.');
