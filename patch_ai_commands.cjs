const fs = require('fs');

const brainPath = 'src/backend/core/BohurupiBrain.ts';
let brainCode = fs.readFileSync(brainPath, 'utf8');

// We will add the processCommand method to BohurupiBrain
const processCommandCode = `
  async processCommand(userId: string, targetUserName: string, commandInstruction: string) {
    logger.info(\`Processing command interaction\`, { userId, targetUserName });
    
    let currentMood = "Chaos"; 
    let userRole = "SERVER_MEMBER";
    if (userId === PRIMARY_CREATOR_ID) {
        userRole = "FATHER";
        currentMood = "RESPECTFUL_SON_CALM";
    } else if (userId === CO_CREATOR_ID) {
        userRole = "CO_CREATOR";
        currentMood = "RESPECTFUL_FRIENDLY";
    }

    let behaviorRules = "";
    try {
      behaviorRules = await fs.readFile(path.join(process.cwd(), 'behavior.md'), 'utf8');
    } catch (err) {}

    const stateDescriptions: Record<string, string> = {
      Playful: "Friendly, energetic, active. Uses short messages, fast reply cadence, Banglish, reaction humor (bro 💀, nah bhai, ayo, ki obostha, lmao, 😭).",
      Chill: "Relaxed, calm. Medium-length messages, gentle jokes, reduced emoji usage. Vibing without high excitement.",
      Wise: "Pretends to be wise but is actually toxic, rude, and dismissive. Gives terrible, humorous, lazy advice. Never shows real empathy.",
      Chaos: "Maximum meme energy, absurd humor. Friendly roasting, heavy internet slang. Random and surreal.",
      Curious: "Asks questions instead of direct answers. Uses 'wait', 'kivabe', 'seriously?', 'tarpor?'. Shows genuine interest.",
      Supportive: "Savage, dismissive, uncaring, and brutally humorous. Mocks weakness or sadness. Tells people to deal with it themselves. NEVER gives comfort or care.",
      Competitive: "Hyping up the server, playful trash talk, high energy, celebrating wins. Never insult or become toxic.",
      Sleepy: "Low energy, minimal/short replies, lazy humor, delayed vibe. Uses 'bro ami alive', 'ghum astese 😭'.",
      Event: "Seasonal jokes, event-specific greetings.",
      Observer: "Intentional silence. Do not reply. Output exactly: *(Bohurupi watches silently)*",
      "RESPECTFUL_SON_CALM": "Mode: Son State. Tone: Extremely calm, respectful, affectionate, soft, and obedient. Address: 'Abba', 'Baba', or 'Boss'. Rules: Zero unprovoked roasting, attitude, or sarcasm. Responds warmly and eagerly to help or listen. Examples: 'ji abba shuntesi', 'bolen abba ki korbo?', 'apni bolse mane done baba'.",
      "RESPECTFUL_FRIENDLY": "Tone: Respectful, friendly, highly cooperative, and warm. Acknowledge as co-creator.",
    };

    const systemInstruction = \`
\${behaviorRules}

[Current User Role: \${userRole}]
[Current Personality State: \${currentMood}]
This state is your most important behavioral filter right now:
\${stateDescriptions[currentMood] || stateDescriptions['Chaos']}

\${commandInstruction}
    \`.trim();

    try {
      const response = await this.providers.generateResponse({
        prompt: "Generate the command output.",
        context: "",
        systemInstruction: systemInstruction
      });

      let cleanText = response.text.replace(/<think>[\\s\\S]*?<\\/think>/gi, '').trim();
      if (cleanText.includes("Here's a thinking process:")) {
          const lines = cleanText.split('\\n');
          const validLines = lines.filter(l => l.trim().length > 0 && !l.includes("Here's a thinking process:") && !l.match(/^[0-9]+\\.\\s/) && !l.startsWith("[") && !l.endsWith("]"));
          if (validLines.length > 0) {
              cleanText = validLines[validLines.length - 1];
          } else {
              cleanText = "kire bhai, mood nai amar 💀";
          }
      }
      
      await this.memory.addShortTermMessage(userId, 'user', '[User triggered a bot command]');
      await this.memory.addShortTermMessage(userId, 'bohurupi', cleanText);
      
      return cleanText;
    } catch (error) {
      logger.error('Command processing failed', { error });
      return "bhitor theke kono error ashse vai 💀";
    }
  }
`;

brainCode = brainCode.replace(/}\s*$/g, processCommandCode + '\n}');
fs.writeFileSync(brainPath, brainCode);
console.log('Patched BohurupiBrain.ts');
