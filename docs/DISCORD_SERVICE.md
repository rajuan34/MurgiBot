# 03. Discord Integration & Commands (`DiscordService.ts`)

`src/backend/discord/DiscordService.ts` integrates Bohurupi with the Discord Gateway using `discord.js` v14, managing WebSocket lifecycles, event dispatching, permission enforcement, interactive prefix commands, slash commands, and autonomous cron auto-replies.

---

## 1. Gateway Client Configuration & Cache Sweepers

Bohurupi is optimized for memory-constrained cloud environments (e.g., Render Free Tier with a 512MB RAM cap):

```typescript
this.client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  makeCache: Options.cacheWithLimits({
    MessageManager: 50,
    PresenceManager: 0,
    ThreadManager: 0,
    ReactionManager: 0,
    GuildMemberManager: 50,
    UserManager: 100,
  }),
  sweepers: {
    messages: {
      interval: 300,  // Sweeps every 5 minutes
      lifetime: 900,  // Discards messages older than 15 minutes
    },
  },
});
```

### Critical Intent Requirement:
- **`MessageContent` Intent:** Privileged Gateway Intent that **MUST** be toggled ON in the [Discord Developer Portal](https://discord.com/developers/applications) under Bot -> Privileged Gateway Intents. Without this, incoming message content will be empty (`""`), preventing mentions, commands, and chat parsing.

---

## 2. Channel & Server Filtering Rules

Bohurupi enforces strict channel restrictions to avoid spamming unauthorized channels:

### Allowed Channels (`DEFAULT_ALLOWED_CHANNEL_IDS`):
```typescript
export const DEFAULT_ALLOWED_CHANNEL_IDS = [
  '705092446366728236',  // #bot-tasting-general
  '1453357071931019304',  // #media
  '1470329659693600768',  // #memes
];
```

### Server Rules (`isChannelAllowed(channelId, guildId)`):
1. **Designated Server (`705092446366728233`):** Strictly restricted to the 3 channels listed above (plus any custom IDs set in `ALLOWED_CHANNEL_IDS`).
2. **Other Servers:** Bohurupi permits conversations and commands in standard text channels across any other server it is invited to.

---

## 3. Pre-Flight Permission Guards

To avoid unhandled exceptions and log pollution like `{"error":"Missing Permissions"}` or `{"error":"Missing Access"}`:
- **Permission Check:** Before calling `.sendTyping()`, `.reply()`, or `.send()`, Bohurupi inspects the bot member's permissions in the channel:
  ```typescript
  const perms = message.channel.guild.members.me?.permissionsIn(message.channel as TextChannel);
  if (perms && (!perms.has('ViewChannel') || !perms.has('SendMessages'))) {
    return; // Silently skip without throwing error
  }
  ```
- **Fallback Hierarchy:** If `message.reply()` fails (e.g., message was deleted or missing reference history permission), it attempts fallback `channel.send()`. If fallback fails due to missing permissions, it logs a clean `logger.warn` instead of an unhandled `logger.error`.

---

## 4. Prefix Commands Engine (`handleCommand`)

Bohurupi features interactive, roleplaying ASCII-framed commands:

| Command | Target Logic | Output Format | Uncal (`872356590991331360`) Behavior |
| :--- | :--- | :--- | :--- |
| `!help` / `!commands` | Author | ASCII Menu Table | Standard display (adds respectful greeting if invoked by Uncal). |
| `!court [@user]` | `@user` or Author | ASCII Supreme Court Frame (Judge, Crime, Dialogue, Jury, Verdict, Penalty) | **Case Dismissed!** Verdict: 100% INNOCENT - Supreme Respect! Penalty: None. |
| `!fight [@user]` | `@user` or Author | ASCII Street Fight Frame (HP bars, Knockout Move, Trash Talk) | **Match Cancelled!** Bohurupi refuses to fight Uncal, offers supreme salam 🫡. |
| `!biryani_roulette [@user]` | `@user` or Author | ASCII Slot Roulette Frame (Dish, Rating, Kitchen Notes, Mockery) | **Royal VIP Platter!** 10/10 rating served with supreme respect. |
| `!iq [@user]` | `@user` or Author | ASCII Brain Scanner Frame (Fake IQ score, Diagnosis, Roast) | **300+ IQ Genius!** Diagnosis: Supreme Genius & Respected Uncal 👑. |
| `!roast` / `!bully [@user]` | `@user` or Author | Savage Banglish roast | **Refused!** Dynamically refuses: *"Nah bro, that's my Uncal! Show some respect 🫡"*. |
| `!expose [@user]` | `@user` or Author | Fake leaked secret / search history | Generates legendary wholesome heroic story about Uncal. |
| `!hype [@user]` | `@user` or Author | Deity-level supreme hype | Treats Uncal as an absolute elder legend with supreme respect. |
| `!agree [@user]` | `@user` or Author | Aggressive agreement | Aggressively affirms Uncal's words as absolute golden truth. |
| `!predict [@user]` | `@user` or Author | 10-year future prediction | Predicts glorious, highly prosperous future for Uncal. |
| `!lore [@user]` | `@user` or Author | Fake origin lore | Tells epic origin story celebrating Uncal. |
| `!flirt [@user]` | `@user` or Author | Pick-up line / compliment | Generates wholesome elder-respecting compliment. |
| `!advice [query]` | Query author | Sarcastic toxic desi life advice | Polite, respectful, and genuinely helpful advice for Uncal. |
| `!truth [@user]` | `@user` or Author | Awkward spicy truth question | Wholesome, respectful, and fun truth question for Uncal. |
| `!dare [@user]` | `@user` or Author | Chaotic Discord dare | Polite, respectful dare (e.g., bless the server). |
| `!horoscope [@user]`| `@user` or Author | Absurd astrology prediction | Blessed, wonderful, prosperous daily horoscope. |
| `!biryani_war` | Whole chat | Local food debate starter | N/A (Chat event). |
| `!nasta_check` | Whole chat | Strict desi guardian snack check | N/A (Chat event). |
| `!roast_chat` | Whole chat | Roasts server vibe and silence | N/A (Chat event). |

---

## 5. Slash Commands (`Events.InteractionCreate`)

Bohurupi handles modern Discord slash interactions (`/`):
- **Uncal Check on Slash Commands:**
  ```typescript
  if (targetUserId === UNCAL_USER_ID && ['bully', 'roast', 'fight', 'court', 'iq', 'biryani_roulette'].includes(cmdName)) {
    const defense = generateDynamicUncalDefense(interaction.user.displayName || interaction.user.username);
    await interaction.reply({ content: defense });
    return;
  }
  ```
- **Uncal Author Support:** If Uncal executes a slash command, the bot acknowledges him respectfully as "Uncal" or "Chacha".

---

## 6. Autonomous Scheduled Auto-Reply System

Configured via `node-cron` in `startScheduler()`:
- **Default Times:** `15:30` and `22:30` (3:30 PM & 10:30 PM) in `Asia/Dhaka` timezone.
- **Workflow:**
  1. Shuffles the allowed channels to pick one random destination.
  2. Verifies channel permissions (`ViewChannel` and `SendMessages`).
  3. Fetches up to 15 recent messages (`textChannel.messages.fetch({ limit: 15 })`).
  4. If user messages exist: Generates a contextual reply to one of the latest messages.
  5. If channel is quiet: Generates a spontaneous Banglish conversation starter (e.g., complaining about silence or being bored).
  6. **Resilient Fail-Safe:** If LLM generation times out (18,000ms) or fails, it falls back to dynamic hardcoded Banglish starters (`"kire bhai, chat eto shanto keno? 💀"`, `"bhai keo ki ghumai gelo naki? 🥱"`), ensuring the scheduled post always succeeds.
  7. Captures the generated message ID and logs success:
     `✅ [Discord Scheduled Post Success] Message ID [1234567890] successfully posted to channel #general`.
