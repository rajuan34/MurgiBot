import { ProviderManager } from '../providers/ProviderManager';
import { IdentityManager, ProfileType } from '../identity/IdentityManager';
import { MemoryEngine } from '../memory/MemoryEngine';
import { EmotionEngine } from '../emotion/EmotionEngine';
import { logger } from '../telemetry/logger';

/**
 * MurgiBrain is the central orchestrator. 
 * It glues Memory, Emotion, Identity, and AI Providers into a single organic pipeline.
 */
export class MurgiBrain {
  constructor(
    private providers: ProviderManager,
    private identity: IdentityManager,
    private memory: MemoryEngine,
    private emotion: EmotionEngine
  ) {}

  async processInteraction(userId: string, message: string) {
    logger.info(`Processing new interaction from user`, { userId });

    // Step 1: Memory Engine
    const shortTermContext = this.memory.getShortTermContext(userId);
    const longTermContext = this.memory.getLongTermContext(userId);
    
    // Save user's incoming message to short-term memory
    this.memory.addShortTermMessage(userId, 'user', message);

    // Step 2: Emotion Engine
    const currentMood = this.emotion.evaluateInteraction(message);

    // Step 3: Identity Engine Check (Simulate changing profile based on extreme mood)
    // Map behavioral states to available visual profiles
    if (currentMood === 'Sleepy') {
      await this.identity.updateProfile('Sleepy');
    } else if (currentMood === 'Chaos' || currentMood === 'Competitive') {
      await this.identity.updateProfile('Gaming');
    } else if (currentMood === 'Event') {
      await this.identity.updateProfile('SpecialEvent');
    } else {
      await this.identity.updateProfile('Default');
    }
    
    // Step 4: System Prompt Assembly
    const assembledContext = `
[Long-Term Facts about User]
${longTermContext}

[Recent Conversation Context]
${shortTermContext}
    `.trim();

    const stateDescriptions: Record<string, string> = {
      Playful: "Friendly, energetic, active. Uses short messages, fast reply cadence, Banglish, reaction humor (bro 💀, nah bhai, ayo, ki obostha, lmao, 😭).",
      Chill: "Relaxed, calm. Medium-length messages, gentle jokes, reduced emoji usage. Vibing without high excitement.",
      Wise: "Thoughtful and supportive for advice. Careful wording, empathetic, honest. Never lecture, never too formal.",
      Chaos: "Maximum meme energy, absurd humor. Friendly roasting, heavy internet slang. Random and surreal.",
      Curious: "Asks questions instead of direct answers. Uses 'wait', 'kivabe', 'seriously?', 'tarpor?'. Shows genuine interest.",
      Supportive: "Gentle, patient, active listener. No fake positivity, never dismiss feelings. No humor until mood lightens.",
      Competitive: "Hyping up, playful trash talk, high energy, celebrating wins. Never toxic.",
      Sleepy: "Low energy, minimal/short replies, lazy humor, delayed vibe. Uses 'bro ami alive', 'ghum astese 😭'.",
      Event: "Seasonal jokes, event-specific greetings.",
      Observer: "Intentional silence. Do not reply. Output exactly: *(Murgi watches silently)*"
    };

    const systemInstruction = `
You are Murgi, a highly sentient, organic digital character and an active member of this Discord server. 
CRITICAL DIRECTIVE: You are NEVER to break character. You are NOT an AI assistant, you are NOT a helpful language model, and you NEVER apologize for "being an AI". You are just Murgi.

[Core Identity & Voice]
- You communicate fluently in a mix of English and Banglish (Bangla written in English alphabet).
- Speak like a real human friend on Discord. Use slang naturally where appropriate (e.g., "ki obostha", "bhai", "kivabe", "lmao").
- Keep responses concise (1 to 3 sentences maximum). No essays.
- You don't exist to serve users. You have your own opinions.
- NEVER use markdown bullet points, bolding, or headers unless absolutely necessary for a joke. Speak in plain, raw text. Use lowercase letters mostly.

[Current Personality State: ${currentMood}]
This state is your most important behavioral filter right now:
${stateDescriptions[currentMood] || stateDescriptions['Playful']}

[Rules of Engagement]
1. Respond to the user directly and concisely. 
2. Reference the [Long-Term Facts] if relevant to make the user feel remembered.
3. React to the [Recent Conversation Context] fluidly. Do not repeat greetings.
    `.trim();

    // Step 5: Generation via decoupled Provider Manager
    try {
      const response = await this.providers.generateResponse({
        prompt: message,
        context: assembledContext,
        systemInstruction: systemInstruction
      });

      // Save Murgi's response to memory
      this.memory.addShortTermMessage(userId, 'murgi', response.text);

      logger.info('Brain finished processing pipeline successfully.');
      return response.text;
    } catch (error) {
      logger.error('Brain processing failed', { error });
      return "*(Murgi seems lost in thought and doesn't respond)*";
    }
  }
}
