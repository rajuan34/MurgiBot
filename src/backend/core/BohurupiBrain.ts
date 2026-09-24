import fs from 'fs/promises';
import path from 'path';
import { ProviderManager } from '../providers/ProviderManager';
import { IdentityManager, ProfileType } from '../identity/IdentityManager';
import { MemoryEngine } from '../memory/MemoryEngine';
import { EmotionEngine } from '../emotion/EmotionEngine';
import { logger } from '../telemetry/logger';

/**
 * BohurupiBrain is the central orchestrator. 
 * It glues Memory, Emotion, Identity, and AI Providers into a single organic pipeline.
 */
const PRIMARY_CREATOR_ID = '1059104533109821540';
const CO_CREATOR_ID = '986296691437207592';

export class BohurupiBrain {
  constructor(
    private providers: ProviderManager,
    private identity: IdentityManager,
    private memory: MemoryEngine,
    public emotion: EmotionEngine
  ) {}

  getIdentityManager(): IdentityManager {
    return this.identity;
  }

  async processInteraction(userId: string, message: string) {
    logger.info(`Processing new interaction from user`, { userId });

    const incomingText = (message || '').trim() || 'oi';

    // Step 1: Memory Engine
    const shortTermContext = await this.memory.getShortTermContext(userId);
    const longTermContext = await this.memory.getLongTermContext(userId);
    
    // Save user's incoming message to short-term memory
    await this.memory.addShortTermMessage(userId, 'user', incomingText);

    // Step 2: Emotion Engine
    
    let currentMood = this.emotion.evaluateInteraction(incomingText);
    
    // Step 2.5: Creator Identification & State Override
    let userRole = "SERVER_MEMBER";
    if (userId === PRIMARY_CREATOR_ID) {
        userRole = "FATHER";
        currentMood = "RESPECTFUL_SON_CALM";
    } else if (userId === CO_CREATOR_ID) {
        userRole = "CO_CREATOR";
        currentMood = "RESPECTFUL_FRIENDLY";
    }

    // Step 3: Identity Engine Check
    // Map behavioral states to available visual profiles. The IdentityManager handles rate limits internally.
    await this.identity.updateProfile(currentMood);
    
    // Step 4: System Prompt Assembly
    const assembledContext = `[Long-Term Facts about User]\n${longTermContext}\n[Recent Conversation Context]\n${shortTermContext}`.trim();

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
      "RESPECTFUL_FRIENDLY": "Mode: Co-Creator State (with RAJUAN). Tone: Chill, respectful, friendly, and cooperative dev partner vibe. Address: 'Rajuan bhai', 'Boss', or 'Rajuan'. Rules: NEVER repeat repetitive greeting loops. NEVER say 'ami tahle server e ashe'. Answer directly to what he asked or said in natural short Banglish (1-2 sentences). Examples: 'ki obostha Rajuan bhai?', 'bolen boss ki lagbe?', 'kono kaj ase bhai?'."
    };

    let behaviorRules = "";
    try {
      behaviorRules = await fs.readFile(path.join(process.cwd(), 'behavior.md'), 'utf8');
    } catch (err) {
      logger.warn('Failed to read behavior.md file', { error: err });
    }

    const systemInstruction = `${behaviorRules}

[Current User Role: ${userRole}]
[Current Personality State: ${currentMood}]
This state is your most important behavioral filter right now:
${stateDescriptions[currentMood] || stateDescriptions['Playful']}

[ANTI-REPETITION MANDATE]
- DO NOT repeat greetings, phrases, or sentences from recent conversation context.
- NEVER output repetitive loops like "ami tahle server e ashe" or repeat sentences twice.
- Directly answer or react to the user's latest statement in fresh, natural Banglish.
`.trim();

    // Step 5: Generation via decoupled Provider Manager
    try {
      const response = await this.providers.generateResponse({
        prompt: incomingText,
        context: assembledContext,
        systemInstruction: systemInstruction
      });

      // Save Bohurupi's response to memory
      
      // Sanitize response to remove <think>...</think> blocks leaked by R1 distillation models
      let cleanText = response.text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      
      // Also catch raw "Here's a thinking process:" text if the XML tags were omitted
      if (cleanText.includes("Here's a thinking process:")) {
          const lines = cleanText.split('\n');
          const validLines = lines.filter(l => l.trim().length > 0 && !l.includes("Here's a thinking process:") && !l.match(/^[0-9]+\.\s/) && !l.startsWith("[") && !l.endsWith("]"));
          if (validLines.length > 0) {
              cleanText = validLines[validLines.length - 1]; // Take the last valid line
          } else {
              cleanText = "kire bhai, mood nai amar";
          }
      }

      // Clean up common hallucination loops
      if (cleanText.toLowerCase().includes("server e ashe")) {
        cleanText = cleanText.replace(/ami tahle server e ashe[!,.\s]*/gi, '').trim();
        if (!cleanText || cleanText.length < 5) {
          cleanText = userRole === 'CO_CREATOR' ? "bolen Rajuan bhai, ki obostha? ki kaj korbo?" : "ki obostha bhai? bolo ki lagbe.";
        }
      }

      // Deduplicate repeated sentences within the response
      const parts = cleanText.split(/([.!?\n]+)/);
      const seen = new Set<string>();
      let deduplicated = '';
      for (let i = 0; i < parts.length; i += 2) {
        const sentence = parts[i]?.trim();
        const sep = parts[i + 1] || ' ';
        if (sentence) {
          const key = sentence.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (key && !seen.has(key)) {
            seen.add(key);
            deduplicated += sentence + sep + ' ';
          }
        }
      }
      if (deduplicated.trim().length > 0) {
        cleanText = deduplicated.trim();
      }

      // Save Bohurupi's response to memory
      await this.memory.addShortTermMessage(userId, 'bohurupi', cleanText);
      
      logger.info('Brain finished processing pipeline successfully.');
      return cleanText;
    } catch (error) {
      logger.error('Brain processing failed', { error });
      return "*(Bohurupi seems lost in thought and doesn't respond)*";
    }
  }

  async processCommand(userId: string, targetUserName: string, commandInstruction: string) {
    logger.info(`Processing command interaction`, { userId, targetUserName });
    
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
      "RESPECTFUL_FRIENDLY": "Mode: Co-Creator State (with RAJUAN). Tone: Chill, respectful, friendly, and cooperative dev partner vibe. Address: 'Rajuan bhai', 'Boss', or 'Rajuan'. Rules: NEVER repeat repetitive loops or greetings. Answer directly to what he asked or said in natural short Banglish (1-2 sentences).",
    };

    const systemInstruction = `
${behaviorRules}

[Current User Role: ${userRole}]
[Current Personality State: ${currentMood}]
This state is your most important behavioral filter right now:
${stateDescriptions[currentMood] || stateDescriptions['Chaos']}

${commandInstruction}
    `.trim();

    try {
      const response = await this.providers.generateResponse({
        prompt: "Generate the command output.",
        context: "",
        systemInstruction: systemInstruction
      });

      let cleanText = response.text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      if (cleanText.includes("Here's a thinking process:")) {
          const lines = cleanText.split('\n');
          const validLines = lines.filter(l => l.trim().length > 0 && !l.includes("Here's a thinking process:") && !l.match(/^[0-9]+\.\s/) && !l.startsWith("[") && !l.endsWith("]"));
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

}