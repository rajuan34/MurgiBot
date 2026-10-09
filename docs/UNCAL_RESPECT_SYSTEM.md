# 08. Respect Uncal (Chacha) System

This document specifies the architecture, logic, and operational guarantees of the **"Respect Uncal (Chacha)"** system implemented for **Discord User ID `872356590991331360`**.

---

## 1. Specification Overview

| Parameter | Value |
| :--- | :--- |
| **Target Discord User ID** | `872356590991331360` |
| **Honorific Titles** | `"Uncal"`, `"Chacha"` |
| **Emotional State** | `RESPECTFUL_UNCAL_CALM` |
| **Core Directive** | Zero insults, zero roasts, zero trolls, supreme elder respect under all circumstances. |
| **Identification Method** | Strictly by exact Discord Snowflake ID (`872356590991331360`), never by display name or username. |
| **Dynamic Generation** | Strictly compliant with `RULE[AGENTS_md]` (never copies static documentation examples verbatim). |

---

## 2. Why ID-Based Identification?

Usernames and display names on Discord can be modified at any time by users or server administrators. To prevent identity spoofing or protection bypass, Bohurupi resolves users strictly through their immutable Discord Snowflake ID:
```typescript
export const UNCAL_USER_ID = '872356590991331360';
```
In `DiscordService.ts`:
- Resolves `message.author.id === UNCAL_USER_ID`.
- Resolves `targetMention?.id === UNCAL_USER_ID`.
- Strips raw arguments: `args[0].replace(/[<@!>]/g, '') === UNCAL_USER_ID`.
- Inspects mention collection: `message.mentions.users.has(UNCAL_USER_ID)`.
- Inspects slash interaction: `interaction.options.getUser('user')?.id === UNCAL_USER_ID`.

---

## 3. Two Modes of Uncal Interaction

### Mode 1: Interacting Directly with Uncal
When Uncal sends a message, executes a slash command, or mentions Bohurupi:
1. `BohurupiBrain.ts` assigns `userRole = "UNCAL"` and forces mood to `RESPECTFUL_UNCAL_CALM`.
2. System directive injected:
   ```
   DIRECTIVE: You are speaking directly with your respected Uncal (Chacha - Exact Discord User ID: 872356590991331360).
   Address him respectfully as "Uncal" or "Chacha". You must ALWAYS be polite, friendly, warm, respectful, and helpful.
   You must NEVER roast, insult, mock, troll, or disrespect him under any circumstances. Speak naturally in 1-2 short Banglish sentences.
   ```
3. **Deterministic Honorific Verification:**
   Before outgoing delivery, `BohurupiBrain` verifies that the response contains `"Uncal"` or `"Chacha"`. If omitted by the LLM, it gracefully prepends the honorific:
   ```typescript
   if (userRole === 'UNCAL') {
     const hasDisrespect = /\b(?:roast|bully|bot|boka|gadha|pagol|faltu|kharap|loss)\b/i.test(cleanText);
     if (hasDisrespect) {
       cleanText = getDiverseDynamicReply(normalizedText, 'UNCAL');
     } else if (!/\b(?:uncal|chacha)\b/i.test(cleanText)) {
       cleanText = `ji Uncal, ${cleanText}`;
     }
   }
   ```

### Mode 2: Defending Uncal from Other Users
When another user asks Bohurupi to roast, bully, mock, or attack Uncal:
1. Detected in both `DiscordService.ts` and `BohurupiBrain.ts`:
   ```typescript
   const mentionsUncal = rawInput.includes(UNCAL_USER_ID) || 
     /<@!?872356590991331360>/.test(rawInput) ||
     /\b(?:uncal|chacha)\b/i.test(rawInput);
   const hasDisrespectIntent = /\b(?:roast|bully|insult|mock|troll|fight|poka|pachano|bash|attack|maro|guilty|crime|penalty|kharap)\b/i.test(rawInput);

   if (userId !== UNCAL_USER_ID && mentionsUncal && hasDisrespectIntent) {
     return generateDynamicUncalDefense(authorDisplayName);
   }
   ```
2. Bohurupi **politely and humorously refuses**, explaining that this person is respected as its Uncal.

---

## 4. Compliance with `RULE[AGENTS_md]`

The specification rule defines:
> *The example responses shown in the Commands documentation/specification are strictly examples. DO NOT use them as fixed or original responses for the bot. The bot's actual responses must always be generated dynamically based on the command's logic, context, and defined behavior. Do not exactly copy the text from example responses.*

`generateDynamicUncalDefense` adheres to this rule:
```typescript
export function generateDynamicUncalDefense(requesterName?: string): string {
  const prefix = requesterName ? `${requesterName}, ` : '';
  const defenses = [
    `${prefix}areh bhai, Chacha ke roast korar kono shujog nai! Uncal ke shomman korte hoy 🫡`,
    `kono chance nai bro, oita amar Uncal! Chacha ke niye kono roast ba troll hobe na 👀`,
    `bhai amar Chacha ke niye kono disrespect korbo na, Uncal is always respected here 👑`,
    `nah re bhai, Uncal ke niye kono troll chalbe na! Chacha er jonno full respect 🫡`,
    `amar Chacha er upor kono attack nai bhai, Uncal ke age salam de! 🫡`,
    `shobai ke roast korleo amar Uncal ke kokhono na! Chacha ke respect kora compulsory 🫡`,
    `${prefix}oita amar Chacha! Uncal ke roast korar kotha mathay-o anba na 🫡`,
    `areh na bhai, Uncal amader shobar priyo manush! Chacha ke shomman koro 👑`
  ];
  return defenses[Math.floor(Math.random() * defenses.length)];
}
```

---

## 5. Command Immunity Matrix

When any user attempts to execute an interactive Discord command targeting Uncal (`872356590991331360`):

| Command | Normal Output | Output When Targeting Uncal |
| :--- | :--- | :--- |
| `!court @Uncal` | Guilty sentence with fake penalty | **Case Dismissed!** Courtroom jury votes 100 Innocent - 0 Guilty. Full immunity & respect granted. |
| `!fight @Uncal` | Street knockout with savage trash-talk | **Match Cancelled!** Bohurupi refuses to fight Uncal (HP: 9999), offers supreme salam 🫡. |
| `!biryani_roulette @Uncal` | Poisonous bowl with inedible object | **Royal Shahi Kacchi Platter!** 10/10 rating served with pure ghee, tender mutton & saffron. |
| `!iq @Uncal` | Low IQ diagnosis and roast | **300+ IQ Genius!** Diagnosis: Supreme Genius & Respected Uncal 👑. |
| `!roast / !bully @Uncal` | Savage roast | **Refused!** Returns dynamic Uncal defense immediately. |
| `!expose @Uncal` | Embarrassing fake secret | Legendary wholesome story (e.g. Uncal secretly treated everyone to biryani). |
| `!hype @Uncal` | Extreme hype | Deity-level elder praise and celebration. |
| `!agree @Uncal` | Aggressive agreement | Affirms Uncal's words as absolute golden truth. |
| `!predict @Uncal` | Absurd pathetic future | Predicts a glorious, highly successful, prosperous future. |
| `!lore @Uncal` | Ridiculous origin lore | Epic historical legend celebrating Uncal. |
| `!flirt @Uncal` | Cheesy pickup line | Wholesome, polite elder compliment. |
| `!advice @Uncal` | Toxic bad advice | Polite, helpful, respectful elder advice. |
| `!truth @Uncal` | Spicy awkward question | Wholesome, respectful, fun question. |
| `!dare @Uncal` | Chaotic server dare | Polite, respectful dare (e.g. give blessings to chat). |
| `!horoscope @Uncal` | Absurd astrology | Blessed, prosperous daily horoscope. |
