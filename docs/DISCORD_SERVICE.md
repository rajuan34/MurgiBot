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

| Command | Target Logic | Output Format | Description |
| :--- | :--- | :--- | :--- |
| `!help` / `!commands` | Author | ASCII Menu Table | Displays commands catalog and bot features. |
| `!court [@user]` | `@user` or Author | ASCII Supreme Court Frame (Judge, Crime, Dialogue, Jury, Verdict, Penalty) | Humorous mock courtroom trial with dynamic judge verdict and penalty. |
| `!fight [@user]` | `@user` or Author | ASCII Street Fight Frame (HP bars, Knockout Move, Trash Talk) | 8-bit turn-based brawl between bot and target. |
| `!biryani_roulette [@user]` | `@user` or Author | ASCII Slot Roulette Frame (Dish, Rating, Kitchen Notes, Mockery) | Randomized chaotic restaurant food critique. |
| `!iq [@user]` | `@user` or Author | ASCII Brain Scanner Frame (Fake IQ score, Diagnosis, Roast) | Brain scanner with ridiculous diagnostic roast. |
| `!roast` / `!bully [@user]` | `@user` or Author | Savage Banglish roast | Unhinged, witty desi roast tailored to the user. |
| `!expose [@user]` | `@user` or Author | Fake leaked secret / search history | Absurd fabricated browser history or secret. |
| `!hype [@user]` | `@user` or Author | Deity-level supreme hype | Over-the-top, god-tier praise and hype. |
| `!agree [@user]` | `@user` or Author | Aggressive agreement | Aggressively affirms whatever the user said. |
| `!predict [@user]` | `@user` or Author | 10-year future prediction | Predicts ridiculous, unpredictable future life. |
| `!lore [@user]` | `@user` or Author | Fake origin lore | Dramatic anime/mythological origin backstory. |
| `!flirt [@user]` | `@user` or Author | Pick-up line / compliment | Cheesy desi pick-up line. |
| `!advice [query]` | Query author | Sarcastic toxic desi life advice | Brutally honest and sarcastic desi life guidance. |
| `!truth [@user]` | `@user` or Author | Awkward spicy truth question | Embarrassing and awkward truth question. |
| `!dare [@user]` | `@user` or Author | Chaotic Discord dare | Chaotic server dare or challenge. |
| `!horoscope [@user]`| `@user` or Author | Absurd astrology prediction | Absurd astrological destiny reading. |
| `!biryani_war` | Whole chat | Local food debate starter | Ignites fierce debate between Kacchi vs Tehari vs Morog Polao. |
| `!nasta_check` | Whole chat | Strict desi guardian snack check | Desi parent afternoon nasta evaluation. |
| `!roast_chat` | Whole chat | Roasts server vibe and silence | Roasts dead chat energy with fierce mockery. |

---

## 5. Slash Commands (`Events.InteractionCreate`)

Bohurupi handles modern Discord slash interactions (`/`):
- Translates slash command options and parameters into the corresponding backend command handler.
- Deploys ASCII-styled structured responses with dynamic generation.

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
