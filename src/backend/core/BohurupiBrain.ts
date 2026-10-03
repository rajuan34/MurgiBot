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
const PRIMARY_CREATOR_IDS = ['1059104533109821540', '1138805727025000458'];
const CO_CREATOR_IDS = ['986296691437207592', '1131061730076639352'];

/**
 * Normalizes user messages that contain Discord custom emojis (<:name:id>, <a:name:id>)
 * or unicode emojis, translating them into rich semantic context so the LLM understands
 * what the user is expressing without getting confused by raw Discord tokens.
 */
export function normalizeIncomingEmojis(message: string): { normalizedText: string; isEmojiOnly: boolean } {
  let text = (message || '').trim();
  if (!text) return { normalizedText: 'oi', isEmojiOnly: false };

  const customEmojiRegex = /<a?:([a-zA-Z0-9_~]+):([0-9]+)>/g;
  const detectedCustomEmojis: string[] = [];

  // Replace custom emoji tokens with friendly descriptors
  let replaced = text.replace(customEmojiRegex, (match, name) => {
    const cleanName = name.replace(/^[0-9]+/, ''); // e.g. 420802panikemoji -> panikemoji
    detectedCustomEmojis.push(cleanName || name);
    return `:${cleanName || name}:`;
  });

  const remainingNonEmoji = replaced.replace(/:[a-zA-Z0-9_~]+:/g, '').replace(/[\p{Emoji}\s]/gu, '').trim();
  const isEmojiOnly = remainingNonEmoji.length === 0;

  // If user sent ONLY an emoji expression (e.g., panicked emoji or 😑 or 💀)
  if (isEmojiOnly) {
    let emojiDescription = replaced;
    if (detectedCustomEmojis.length > 0) {
      emojiDescription = detectedCustomEmojis.map(name => {
        const lower = name.toLowerCase();
        if (/panik|panic|scared|fear|shock/i.test(lower)) return `panicked/scared reaction face (😱 :${name}:)`;
        if (/skull|dead|ded/i.test(lower)) return `skull / laughing to death (💀 :${name}:)`;
        if (/sob|cry|sad/i.test(lower)) return `crying / sad face (😭 :${name}:)`;
        if (/laugh|lol|lmao|rofl/i.test(lower)) return `laughing face (🤣 :${name}:)`;
        if (/unamused|annoyed|side_eye|meh/i.test(lower)) return `unamused / deadpan stare (😑 :${name}:)`;
        return `:${name}: emoji`;
      }).join(' ');
    }
    return {
      normalizedText: `[User reacted/sent an emoji expression: ${emojiDescription}]`,
      isEmojiOnly: true
    };
  }

  return {
    normalizedText: replaced,
    isEmojiOnly: false
  };
}

/**
 * Sanitizes Bohurupi's generated text so that it never contains broken Discord custom emoji tags,
 * markdown bullets, or stray code backticks. Converts known emoji tags to clean Unicode emojis.
 */
export function sanitizeOutgoingText(rawText: string, userRole: string): string {
  let cleanText = (rawText || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Strip raw "Here's a thinking process:"
  if (cleanText.includes("Here's a thinking process:")) {
    const lines = cleanText.split('\n');
    const validLines = lines.filter(l => l.trim().length > 0 && !l.includes("Here's a thinking process:") && !l.match(/^[0-9]+\.\s/) && !l.startsWith("[") && !l.endsWith("]"));
    cleanText = validLines.length > 0 ? validLines[validLines.length - 1] : "kire bhai, mood nai amar";
  }

  // Strip leading bullet points (•, -, *) and leading whitespace/backticks/backslashes
  cleanText = cleanText.replace(/^[•\-\*\s`\\]+/, '').trim();

  // Map known custom emoji fragments to standard Unicode emojis
  // E.g. `<:420802panikemoji:` or `<:panikemoji:12345>` or `\`<:420802panikemoji:`
  cleanText = cleanText.replace(/`?\\?<a?:([a-zA-Z0-9_~]+)(?::[0-9]*)?>?`?/gi, (match, name) => {
    const lower = name.toLowerCase();
    if (/panik|panic|scared|fear|shock/i.test(lower)) return '😱';
    if (/skull|dead|ded/i.test(lower)) return '💀';
    if (/sob|cry|sad/i.test(lower)) return '😭';
    if (/lol|lmao|rofl|laugh|joy/i.test(lower)) return '🤣';
    if (/unamused|annoyed|side_eye/i.test(lower)) return '😑';
    if (/clown/i.test(lower)) return '🤡';
    if (/fire/i.test(lower)) return '🔥';
    if (/moyai|moai|chad/i.test(lower)) return '🗿';
    if (/eyes|sus/i.test(lower)) return '👀';
    if (/think/i.test(lower)) return '🤔';
    if (/salute/i.test(lower)) return '🫡';
    if (/heart|love/i.test(lower)) return '❤️';
    return ''; // Remove unrecognized custom tags so broken code isn't shown
  });

  // Remove any remaining stray unclosed `<:...` or `<a:...` tags
  cleanText = cleanText.replace(/<a?:[^>\n]+>?/g, '').trim();
  cleanText = cleanText.replace(/<:[a-zA-Z0-9_~]+/g, '').trim();

  // Remove dialogue quotes
  cleanText = cleanText.replace(/^["'“‘`\\]+|["'”’`\\]+$/g, '').trim();

  // Remove meta-asides in parentheses
  cleanText = cleanText.replace(/\s*\([^)]*(?:just saying|not repeating|repeating|repeat|thought|thinking|as an ai|note|boss|nope)[^)]*\)/gi, '').trim();

  // Remove model self-corrections
  cleanText = cleanText.replace(/\s*—\s*\*nope\*[^\n]*/gi, '').trim();
  cleanText = cleanText.replace(/\*(?:nope|softly|gentle voice|clears throat|sighs|chuckles|giggles|whispers|thinking|pause|shrugs)\*/gi, '').trim();

  // Remove dangling punctuation
  cleanText = cleanText.replace(/[,—\-]\s*$/g, '').trim();

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

  // Strip bullet points, backticks, or quotes again if exposed after regex
  cleanText = cleanText.replace(/^[•\-\*\s`\\]+/, '').trim();
  cleanText = cleanText.replace(/^["'“‘`\\]+|["'”’`\\]+$/g, '').trim();

  // If completely empty after cleaning, return role-appropriate organic reply
  if (!cleanText || cleanText.length === 0) {
    if (userRole === 'FATHER') {
      return "ji abba, shunlam.";
    } else if (userRole === 'CO_CREATOR') {
      return "ki obostha Rajuan bhai, bolo?";
    } else {
      return "ki hoise bhai? 💀";
    }
  }

  return cleanText;
}

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

    const rawInput = (message || '').trim() || 'oi';
    const { normalizedText } = normalizeIncomingEmojis(rawInput);

    // Step 1: Memory Engine - retrieve existing context before appending current user message
    const history = await this.memory.getShortTermMessages(userId);
    const shortTermContext = await this.memory.getShortTermContext(userId);
    const longTermContext = await this.memory.getLongTermContext(userId);
    
    // Save user's incoming message to short-term memory
    await this.memory.addShortTermMessage(userId, 'user', rawInput);

    // Step 2: Emotion Engine
    let currentMood = this.emotion.evaluateInteraction(rawInput);
    
    // Step 2.5: Creator Identification & State Override
    let userRole = "SERVER_MEMBER";
    if (PRIMARY_CREATOR_IDS.includes(userId)) {
        userRole = "FATHER";
        currentMood = "RESPECTFUL_SON_CALM";
    } else if (CO_CREATOR_IDS.includes(userId)) {
        userRole = "CO_CREATOR";
        currentMood = "RESPECTFUL_FRIENDLY";
    }

    // Step 3: Identity Engine Check
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
      "RESPECTFUL_FRIENDLY": "Mode: Co-Creator State (with RAJUAN). Tone: Chill, respectful, friendly, and cooperative dev partner vibe. Address: 'Rajuan bhai', 'Boss', or 'Rajuan'. Examples: 'ki obostha Rajuan bhai?', 'bolen boss ki khobor?', 'acha bhai done'."
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

[OUTPUT CONSTRAINTS]
- Plain text only. NEVER wrap your message in quotation marks.
- NEVER include stage directions, meta-asides, or parenthetical explanations.
- Speak naturally in short Banglish or English (1-2 sentences). Directly answer or react to the user.
- EMOJI RULE: Use ONLY standard Unicode emojis (e.g. 💀, 😭, 🤣, 😱, 🗿, 🤡, 👀, 😑, 🥱). NEVER output custom Discord markup like <:name:id> or • bullet points.
`.trim();

    // Step 5: Generation via decoupled Provider Manager
    try {
      const response = await this.providers.generateResponse({
        prompt: normalizedText,
        context: assembledContext,
        history,
        systemInstruction: systemInstruction
      });

      if (response.isIgnored || !response.text || response.text.trim().length === 0) {
        logger.info('Bohurupi is in deep sleep mode (consecutive fallbacks > 2) and ignoring message.');
        return "";
      }

      const cleanText = sanitizeOutgoingText(response.text, userRole);

      // Save Bohurupi's response to memory
      await this.memory.addShortTermMessage(userId, 'bohurupi', cleanText);
      
      logger.info(`Brain generation complete [${response.providerName}] for user ${userId}. Reply: "${cleanText}"`, {
        userId,
        provider: response.providerName,
        reply: cleanText
      });
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
    if (PRIMARY_CREATOR_IDS.includes(userId)) {
        userRole = "FATHER";
        currentMood = "RESPECTFUL_SON_CALM";
    } else if (CO_CREATOR_IDS.includes(userId)) {
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
        prompt: commandInstruction,
        context: "",
        systemInstruction: systemInstruction
      });

      const cleanText = sanitizeOutgoingText(response.text, userRole);
      
      await this.memory.addShortTermMessage(userId, 'user', '[User triggered a bot command]');
      await this.memory.addShortTermMessage(userId, 'bohurupi', cleanText);
      
      return cleanText;
    } catch (error) {
      logger.error('Command processing failed', { error });
      return "bhitor theke kono error ashse vai 💀";
    }
  }
}