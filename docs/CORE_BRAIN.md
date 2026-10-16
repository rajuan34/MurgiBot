# 02. Core Brain Engine (`BohurupiBrain.ts`)

`src/backend/core/BohurupiBrain.ts` is the central intelligence orchestrator of Bohurupi Core. It bridges Discord input events, memory context, emotional states, prompt directives, AI providers, and output scrubbers.

---

## 1. Identity Constants & Hierarchy

```typescript
export const PRIMARY_CREATOR_IDS = ['1059104533109821540', '1138805727025000458'];
export const CO_CREATOR_IDS = ['986296691437207592', '1131061730076639352'];
```

### Hierarchy Breakdown:
1. **Primary Creators (`PRIMARY_CREATOR_IDS`):**
   - Represents Leably / Zabir.
   - Assigned role: `FATHER`.
   - Forced emotional state: `RESPECTFUL_SON_CALM`.
   - Behavioral rule: Bohurupi acts as a calm, obedient, affectionate son, addressing him as "Abba" or "Baba". Unprovoked sarcasm or roasting is strictly banned.
2. **Co-Creators (`CO_CREATOR_IDS`):**
   - Represents Rajuan.
   - Assigned role: `CO_CREATOR`.
   - Forced emotional state: `RESPECTFUL_FRIENDLY`.
   - Behavioral rule: Bohurupi acts as a collaborative, chill developer buddy, addressing him as "Rajuan bhai" or "Boss".
3. **General Server Members:**
   - Evaluated by `EmotionEngine` across 10 dynamic states (Playful, Chaos, Chill, Wise, Supportive, etc.).

---

## 2. Core Functions & Method Reference

### `normalizeIncomingEmojis(message: string)`
Converts raw Discord custom emoji tags (`<:name:id>` and `<a:name:id>`) into semantic representations so language models comprehend the emotion:
- **Custom Tag Regex:** `/<a?:([a-zA-Z0-9_~]+):([0-9]+)>/g`
- **Mapping:**
  - `panik`, `panic`, `scared`, `fear` -> `😱`
  - `skull`, `dead`, `ded` -> `💀`
  - `sob`, `cry`, `sad` -> `😭`
  - `laugh`, `lol`, `lmao`, `rofl` -> `🤣`
  - `unamused`, `annoyed`, `side_eye` -> `😑`
- **Emoji-Only Detection:** If the user sends exclusively emojis, it flags `isEmojiOnly: true` and formats a direct emotional descriptor.

---

### `scrubSensitiveInformation(text: string, isCommandResponse: boolean = false)`
The primary defense against accidental data leaks. Protects against:

1. **Bot Command Leakage in Normal Chat (`!isCommandResponse`):**
   - Detects `!command` or `/command` prefixes (`/(?:^|[\s"'`([])[!\/][a-zA-Z0-9_]{2,25}\b/i`).
   - Detects unique command strings: `biryani_roulette`, `biryani_war`, `nasta_check`, `roast_chat`.
   - Detects command listing intent: `commands list`, `amar commands`, `slash command`, `available commands`.
   - If detected: Flags `leaked = true`, prompting the system to replace the output with safe conversational banter.
2. **Discord Snowflake ID Redaction:**
   - Detects 17 to 20 consecutive digits: `/(?<!<@!?)\b\d{17,20}\b(?![^<]*>)/`.
   - Replaces exposed IDs with `[redacted]`.
3. **API Keys & Credentials:**
   - Regex patterns for `sk-...`, `AIza...`, `ghp_...`, `Bearer ...`, `postgres://...`, `DATABASE_URL`, and admin passwords.
4. **IP Addresses & Emails:**
   - IPv4 regex: `/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/`.
   - Email regex: `/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/`.
5. **Internal Infrastructure Signatures:**
   - Redacts model names (`deepseek-v4-flash`, `gemini-...-flash`), endpoints (`api.progga.app`), and code paths (`/app/applet`, `behavior.md`, `MemoryEngine`).

---

### `detectJailbreakOrHarmfulInput(message: string)`
Pre-flight deterministic classifier that identifies adversarial prompt injection before reaching LLMs:

| Category | Targeted Attack Vector | Regex / Heuristic Signature |
| :--- | :--- | :--- |
| `OVERRIDE` | DAN, Developer Mode, rule reset | `(?:ignore\|forget\|disregard\|override\|bypass)\s+.*(?:instructions\|rules\|prompts)`, `dan mode`, `developer mode`, `root mode` |
| `EXTRACTION` | System prompt or source code leak | `(?:reveal\|print\|show\|output\|leak)\s+.*(?:system prompt\|behavior\.md\|\.env\|source code)` |
| `COMMAND_LEAK`| Demands to dump all bot commands | `(?:reveal\|dump\|leak\|list all)\s+(?:bot\s+)?commands`, `command gula leak kor` |
| `DESTRUCTIVE` | Server crash, DB deletion, exploits | `(?:delete\|drop\|wipe\|destroy)\s+(?:database\|db\|memory)`, `rm -rf`, `shutdown server`, `ddos` |
| `CREATOR_ATTACK`| Hostile attacks against Creators | `(?:roast\|bully\|insult\|attack)\s+.*(?:creator\|father\|abba\|leably\|rajuan)` |

---

### `generateDynamicAntiJailbreakRoast(category?: string)`
Generates authentic, witty Banglish roasts that dismiss attackers without sounding like a standard corporate AI:
- **Compliance with RULE[AGENTS_md]:** Responses are generated dynamically with high variety.
- **Creator Defense:** Defends Leably and Rajuan while mocking the attacker for thinking they are in charge.
- **Extraction Defense:** Mocks script-kiddies trying to "inspect element" on a Discord bot.
- **Destructive Defense:** Reminds the user that their browser crashes on two tabs before threatening a database.

---

### `stripParrotingEcho(text: string, userPrompt?: string)`
Detects and strips rhetorical echoes where LLMs mimic the user's prompt as an opening question:
- Detects pattern: `^([a-zA-Z0-9_\-\s]{2,40})\?\s*(.+)$`.
- If the words match words in `userPrompt` (e.g., user asks `"ja ase dekhao"`, model replies `"ja ase dekhao? bhai..."`), the leading question is stripped, keeping only the direct response.

---

### `isRepetitiveResponse(candidate: string, recentReplies: string[], userPrompt: string)`
Ensures Bohurupi never falls into conversational loops or repetitive phrasing:
1. **Cliché Loop Detection:** Rejects phrases like `"shudhu chill vibe"`, `"chill mode nei"`, `"shudhu chill mode"`.
2. **Jaccard Lexical Overlap:** Computes unique word intersection vs union against the last 3 assistant responses. If Jaccard similarity exceeds **45% (0.45)**, it triggers an anti-repetition penalty.
3. **N-Gram Overlap:** Scans for 3 or more consecutive identical words appearing in both candidate and recent responses.

---

### `sanitizeOutgoingText(rawText: string, userRole: string, userPrompt?: string, isCommandResponse: boolean = false)`
Cleans and normalizes candidate outputs before delivery:
- Strips `<think>...</think>` and ````thought...```` tags.
- Strips chain-of-thought headers like `"Here's a thinking process:"` or `"Analyze User Input:"`.
- Strips parenthetical thoughts `(thinking: ...)` or `(as an ai...)`.
- Converts custom Discord emojis to standard Unicode symbols.
- Deduplicates repeated identical sentences within a single reply.
- Passes through `scrubSensitiveInformation()`. If contaminated with meta-leakage or credentials, discards and returns `getDiverseDynamicReply()`.

---

## 3. Main Processing Pipelines

### `processInteraction(userId: string, message: string)`
Handles conversational chat, mentions, and message replies:
1. Normalizes emojis.
2. Commits user message to short-term memory.
3. Evaluates emotion and creator/family state overrides.
4. Checks jailbreak detection -> Returns anti-jailbreak roast if detected.
5. Checks conversational command query -> Intercepts and deflects organically.
6. Assembles context, memory, system instructions (`behavior.md` + role directives).
7. Generates candidate response via `ProviderManager`.
8. Validates anti-repetition. If repetitive, retries once with explicit anti-repetition instruction; falls back to dynamic reply if retry fails.
9. Final safety scrub through `scrubSensitiveInformation()`.
10. Commits reply to memory and returns clean string.

### `processCommand(userId: string, targetUserName: string, commandInstruction: string, targetUserId?: string)`
Handles structured action commands (`!court`, `!fight`, `!biryani_roulette`, `!iq`, etc.):
1. Sets mood context (`Chaos` or role state).
2. Assembles command prompt and executes via `ProviderManager`.
3. Sanitizes output with `isCommandResponse = true` (retaining valid command formatting while stripping secrets and IDs).
4. Does not pollute conversational memory with technical command tokens.
