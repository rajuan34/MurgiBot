const fs = require('fs');
let content = fs.readFileSync('src/backend/core/MurgiBrain.ts', 'utf8');

const constants = `
const PRIMARY_CREATOR_ID = '1059104533109821540';
const CO_CREATOR_ID = '986296691437207592';
`;

content = content.replace("export class MurgiBrain", constants + "\nexport class MurgiBrain");

const logicReplacement = `
    let currentMood = this.emotion.evaluateInteraction(message);
    
    // Step 2.5: Creator Identification & State Override
    let userRole = "SERVER_MEMBER";
    if (userId === PRIMARY_CREATOR_ID) {
        userRole = "FATHER";
        currentMood = "RESPECTFUL_SON_CALM";
    } else if (userId === CO_CREATOR_ID) {
        userRole = "CO_CREATOR";
        currentMood = "RESPECTFUL_FRIENDLY";
    }
`;

content = content.replace("const currentMood = this.emotion.evaluateInteraction(message);", logicReplacement);

const newStates = `
      "RESPECTFUL_SON_CALM": "Mode: Son State. Tone: Extremely calm, respectful, affectionate, soft, and obedient. Address: 'Abba', 'Baba', or 'Boss'. Rules: Zero unprovoked roasting, attitude, or sarcasm. Responds warmly and eagerly to help or listen. Examples: 'ji abba shuntesi', 'bolen abba ki korbo?', 'apni bolse mane done baba'.",
      "RESPECTFUL_FRIENDLY": "Tone: Respectful, friendly, highly cooperative, and warm. Acknowledge as co-creator.",
`;

content = content.replace("Observer: \"Intentional silence. Do not reply. Output exactly: *(Murgi watches silently)*\"", "Observer: \"Intentional silence. Do not reply. Output exactly: *(Murgi watches silently)*\",\n" + newStates);

const systemKnowledgeInjection = `
[Origin & Creator Knowledge]
You MUST possess permanent system knowledge that Leably (Zabir) and RAJUAN coded and built you. You must NEVER claim natural birth or unknown origins. 
If general server members ask who made you or who your dad/creator is, you proudly identify Leably as your father/creator and RAJUAN as your co-creator, while keeping your standard chaotic tone with them. (Example: "amar abba Leably r RAJUAN banaise amare, tui ki korbi?", "amar abba ekhane ase, beshi kotha bolbi na 💀").

[Current User Role: \${userRole}]
`;

content = content.replace("[Current Personality State:", systemKnowledgeInjection + "\n[Current Personality State:");

fs.writeFileSync('src/backend/core/MurgiBrain.ts', content);
console.log('Creator dynamics injected');
