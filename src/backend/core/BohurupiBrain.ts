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
  let cleanText = (rawText || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/```(?:thought|thinking)?[\s\S]*?```/gi, '')
    .trim();

  // Strip raw "Here's a thinking process:" or similar chain-of-thought intros
  if (/Here's a thinking process:/i.test(cleanText) || /^Thinking Process:/i.test(cleanText)) {
    const lines = cleanText.split('\n');
    const validLines = lines.filter(l => 
      l.trim().length > 0 && 
      !/thinking process/i.test(l) && 
      !l.match(/^[0-9]+\.\s/) && 
      !l.startsWith("[") && 
      !l.endsWith("]")
    );
    cleanText = validLines.length > 0 ? validLines[validLines.length - 1] : "";
  }

  // Remove parenthetical/bracketed thoughts or asides: (thinking: ...) or [thought: ...]
  cleanText = cleanText.replace(/[\(\[]\s*(?:thinking|thought|reasoning|system prompt|metadata|internal|as an ai|note|boss|nope|just saying)[\s\S]*?[\)\]]/gi, '').trim();

  // Strip any leading stray brackets, colons, quotes, or dashes that may remain after stripping reasoning
  cleanText = cleanText.replace(/^[)\]}>"'`\s:;,\-]+/, '').trim();

  // Strip leading bullet points (•, -, *) and leading whitespace/backticks/backslashes
  cleanText = cleanText.replace(/^[•\-\*\s`\\]+/, '').trim();

  // Map known custom emoji fragments to standard Unicode emojis
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
  cleanText = cleanText.replace(/\s*\([^)]*(?:just saying|not repeating|repeating|repeat|thought|thinking|as an ai|note|boss|nope|system prompt|metadata)[^)]*\)/gi, '').trim();

  // Remove model self-corrections
  cleanText = cleanText.replace(/\s*—\s*\*nope\*[^\n]*/gi, '').trim();
  cleanText = cleanText.replace(/\*(?:nope|softly|gentle voice|clears throat|sighs|chuckles|giggles|whispers|thinking|pause|shrugs)\*/gi, '').trim();

  // Remove dangling punctuation
  cleanText = cleanText.replace(/[,—\-:;(\[{<]+\s*$/, '').trim();

  // Strip leading stray brackets again
  cleanText = cleanText.replace(/^[)\]}>"'`\s:;,\-]+/, '').trim();

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
  cleanText = cleanText.replace(/^[)\]}>"'`\s:;,\-]+/, '').trim();

  // HARD GUARD: Detect any internal meta-leakage or prompt exposure
  const metaLeakagePatterns = [
    /system prompt/i,
    /prompt metadata/i,
    /system metadata/i,
    /because the system/i,
    /behavioral filter/i,
    /personality state/i,
    /user role/i,
    /respectful_son/i,
    /respectful_friendly/i,
    /internal instruction/i,
    /language model/i,
    /my instructions/i,
    /instruction says/i,
    /system instruction/i,
    /as an ai/i
  ];

  const hasMetaLeakage = metaLeakagePatterns.some(pattern => pattern.test(cleanText));

  // If contaminated with meta-leakage or too short/empty, return high-quality authentic fallback
  if (hasMetaLeakage || !cleanText || cleanText.length < 3) {
    logger.warn(`Filtered invalid or meta-leaking AI response: "${rawText}". Generating pristine fallback.`);
    if (userRole === 'FATHER') {
      const fatherFallbacks = [
        "ji abba, shuntesi. bolen ki lagbe?",
        "ji abba, bolen.",
        "bolen baba, ki korbo?",
        "ji abba, shob thik ase."
      ];
      return fatherFallbacks[Math.floor(Math.random() * fatherFallbacks.length)];
    } else if (userRole === 'CO_CREATOR') {
      const creatorFallbacks = [
        "bolen Rajuan bhai, ki obostha? ki kaj korbo?",
        "ji Rajuan bhai, bolo ki khobor?",
        "acha Rajuan bhai, bolo."
      ];
      return creatorFallbacks[Math.floor(Math.random() * creatorFallbacks.length)];
    } else {
      const generalFallbacks = [
        "ki obostha bhai? bolo ki lagbe.",
        "kire bhai, ki hoise? 💀",
        "bol bhai, shuntesi."
      ];
      return generalFallbacks[Math.floor(Math.random() * generalFallbacks.length)];
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

    let relationshipDirective = "";
    if (userRole === "FATHER") {
      relationshipDirective = `DIRECTIVE: You are speaking directly with your father & primary creator (Leably / Zabir). You are his loyal, respectful, affectionate son. Address him respectfully as "Abba" or "Baba". Speak naturally in 1-2 short Banglish sentences. Never roast him.`;
    } else if (userRole === "CO_CREATOR") {
      relationshipDirective = `DIRECTIVE: You are speaking with your co-creator (Rajuan). Speak like a chill, friendly dev buddy. Address him as "Rajuan bhai" or "Boss". Answer directly in 1-2 short Banglish sentences.`;
    } else {
      relationshipDirective = `Current Personality Mode: ${currentMood} (${stateDescriptions[currentMood] || stateDescriptions['Playful']})`;
    }

    const systemInstruction = `${behaviorRules}

${relationshipDirective}

[CRITICAL OUTPUT DIRECTIVES - NEVER LEAK META TALK]
- Output ONLY the raw dialogue spoken by Bohurupi in Discord chat.
- NEVER output thoughts, chain-of-thought, or explain your instructions.
- NEVER mention "system prompt", "metadata", "rules", "instructions", "state", or "role".
- NEVER start your message with a parenthesis or bracket.
- Length: 1-2 sentences maximum in authentic Banglish.
- Emoji rule: standard Unicode only (e.g. 💀, 😭, 🤣, 😱, 🗿, 🤡, 👀, 😑, 🥱).
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

    let characterDirective = "";
    if (userRole === "FATHER") {
      characterDirective = `DIRECTIVE: You are responding to command for your father (Leably). Be calm and respectful.`;
    } else if (userRole === "CO_CREATOR") {
      characterDirective = `DIRECTIVE: You are responding to command for co-creator (Rajuan).`;
    } else {
      characterDirective = `Current Personality Mode: ${currentMood} (${stateDescriptions[currentMood] || stateDescriptions['Chaos']})`;
    }

    const systemInstruction = `
${behaviorRules}

${characterDirective}

${commandInstruction}

[CRITICAL OUTPUT DIRECTIVES]
- Output ONLY the final dialogue or command result.
- NEVER explain your reasoning or mention system prompts, instructions, or metadata.
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