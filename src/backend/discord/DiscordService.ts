import { Client, GatewayIntentBits, Events, Message, TextChannel, Options } from 'discord.js';
import cron from 'node-cron';
import { logger } from '../telemetry/logger';
import { BohurupiBrain, getDiverseDynamicReply } from '../core/BohurupiBrain';
import { MemoryEngine } from '../memory/MemoryEngine';

/**
 * Allowed Channel IDs where Bohurupi is permitted to reply, execute commands,
 * and send scheduled messages:
 * - Text channel:  705092446366728236
 * - Media channel: 1453357071931019304
 * - Memes channel: 1470329659693600768
 */
export const DEFAULT_ALLOWED_CHANNEL_IDS: string[] = [
  '705092446366728236',  // #bot-tasting-general (formerly text)
  '1453357071931019304',  // Media channel
  '1470329659693600768',  // Memes channel
];

export const ALLOWED_CHANNEL_IDS: string[] = DEFAULT_ALLOWED_CHANNEL_IDS;

export function getAllowedChannelIds(): string[] {
  const envChannels = (process.env.ALLOWED_CHANNEL_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
  
  // Merge the standard 3 channels with any additional channels configured in env:
  return Array.from(new Set([
    ...DEFAULT_ALLOWED_CHANNEL_IDS,
    ...envChannels
  ]));
}

/**
 * Designated Server / Guild IDs where Bohurupi is permitted:
 */
export const SCHEDULED_SERVER_IDS: string[] = [
  '1522520842163060809',
  '705092446366728233'
];
export const SCHEDULED_SERVER_ID: string = SCHEDULED_SERVER_IDS[0];

export function isChannelAllowed(channelId: string, guildId?: string | null): boolean {
  if (!guildId) return true; // Direct messages or uncached

  const allowedList = getAllowedChannelIds();

  // The primary designated server (705092446366728233) strictly restricts replies to the 3 channels:
  const restrictedServers = ['705092446366728233'];
  if (restrictedServers.includes(guildId)) {
    return allowedList.includes(channelId);
  }

  // If this channel is explicitly in allowed list, allow:
  if (allowedList.includes(channelId)) {
    return true;
  }

  // In all other servers where the bot is invited, allow interactions in text channels!
  return true;
}

export function isScheduledServerAllowed(guildId?: string | null): boolean {
  if (!guildId) return true;
  const envServers = (process.env.SCHEDULED_SERVER_ID || process.env.SCHEDULED_SERVER_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
  
  const allowedServers = Array.from(new Set([
    ...SCHEDULED_SERVER_IDS,
    ...envServers
  ]));
  return allowedServers.includes(guildId);
}

export class DiscordService {
  private client: Client;
  private isConnected: boolean = false;
  private schedulerStarted: boolean = false;
  private isPaused: boolean = false;
  private pausedAt: string | null = null;
  private pausedBy: string = 'Admin';
  private lastConnectionError: string | null = null;

  constructor(private brain: BohurupiBrain, private memoryEngine?: MemoryEngine) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      // Render Free Tier memory optimization (512MB RAM cap protection)
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
          interval: 300,
          lifetime: 900,
        },
      },
    });

    this.registerEvents();
  }

  public async loadPersistedState() {
    if (this.memoryEngine) {
      try {
        const saved = await this.memoryEngine.getSystemConfig('bot_paused_state');
        if (saved && typeof saved.isPaused === 'boolean') {
          this.isPaused = saved.isPaused;
          this.pausedAt = saved.pausedAt || null;
          this.pausedBy = saved.pausedBy || 'Admin';
          logger.info(`DiscordService restored bot pause state: ${this.isPaused ? 'PAUSED' : 'ACTIVE'}`);
        }
      } catch (e) {
        logger.warn('Failed to load persisted bot pause state', { error: String(e) });
      }
    }
  }

  public async pause(by: string = 'Admin'): Promise<{ success: boolean; isPaused: boolean; pausedAt: string }> {
    this.isPaused = true;
    this.pausedAt = new Date().toISOString();
    this.pausedBy = by;

    logger.warn(`⏸️ Discord bot activity has been PAUSED by ${by}. Mentions, commands, and scheduled auto-replies are temporarily suspended.`);

    try {
      if (this.isConnected && this.client.user) {
        this.client.user.setPresence({
          activities: [{ name: '⏸️ Activity Paused by Admin' }],
          status: 'idle'
        });
      }
    } catch (e) {}

    if (this.memoryEngine) {
      try {
        await this.memoryEngine.setSystemConfig('bot_paused_state', {
          isPaused: true,
          pausedAt: this.pausedAt,
          pausedBy: this.pausedBy
        });
      } catch (e) {}
    }

    return {
      success: true,
      isPaused: true,
      pausedAt: this.pausedAt
    };
  }

  public async resume(by: string = 'Admin'): Promise<{ success: boolean; isPaused: boolean }> {
    this.isPaused = false;
    this.pausedAt = null;
    this.pausedBy = by;

    logger.info(`▶️ Discord bot activity has been RESUMED by ${by}. Normal chat, mentions, and scheduled tasks are active.`);

    try {
      if (this.isConnected && this.client.user) {
        this.client.user.setPresence({
          activities: [{ name: 'Watching over server' }],
          status: 'online'
        });
      }
    } catch (e) {}

    if (this.memoryEngine) {
      try {
        await this.memoryEngine.setSystemConfig('bot_paused_state', {
          isPaused: false,
          pausedAt: null,
          pausedBy: this.pausedBy
        });
      } catch (e) {}
    }

    return {
      success: true,
      isPaused: false
    };
  }

  public isBotPaused(): boolean {
    return this.isPaused;
  }

  
  private startScheduler() {
    if (this.schedulerStarted) return;
    this.schedulerStarted = true;
    const tz = process.env.TIMEZONE || 'Asia/Dhaka';
    const schedule1 = process.env.SCHEDULE_1 || '15:30';
    const schedule2 = process.env.SCHEDULE_2 || '22:30';

    const parseSchedule = (timeStr: string, defaultHour: string, defaultMinute: string) => {
      try {
        if (!timeStr || typeof timeStr !== 'string') return `${defaultMinute} ${defaultHour} * * *`;
        const parts = timeStr.trim().split(':');
        const hour = parseInt(parts[0], 10);
        const minute = parseInt(parts[1], 10);
        if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
          return `${defaultMinute} ${defaultHour} * * *`;
        }
        return `${minute} ${hour} * * *`;
      } catch (e) {
        return `${defaultMinute} ${defaultHour} * * *`;
      }
    };

    const cronExpr1 = parseSchedule(schedule1, '15', '30');
    const cronExpr2 = parseSchedule(schedule2, '22', '30');

    logger.info(`Initializing Discord Auto-Reply Scheduler: ${cronExpr1} & ${cronExpr2} (${tz})`);

    const task = async () => {
      try {
        await this.triggerAutoReply();
      } catch (err: any) {
        logger.error('Error executing scheduled auto-reply task:', { error: err?.message || String(err) });
      }
    };

    try {
      cron.schedule(cronExpr1, task, { timezone: tz });
    } catch (e: any) {
      logger.error('Failed to schedule cron job 1:', { error: e?.message || String(e) });
    }
    try {
      cron.schedule(cronExpr2, task, { timezone: tz });
    } catch (e: any) {
      logger.error('Failed to schedule cron job 2:', { error: e?.message || String(e) });
    }
  }

  public async triggerAutoReply(): Promise<{ success: boolean; result?: any; results?: any[] }> {
    if (this.isPaused) {
      logger.info('Skipping scheduled auto-reply because bot is currently PAUSED by admin.');
      return { success: false, results: [{ error: 'Bot is currently paused by admin' }] };
    }

    const channelsToPickFrom = getAllowedChannelIds();

    logger.info(`Running scheduled Discord auto-reply task. Picking 1 random channel from [${channelsToPickFrom.join(', ')}]...`);
    if (!this.isConnected || !this.client.user) {
      logger.warn('Skipping auto-reply, Discord client not connected.');
      return { success: false, results: [{ error: 'Discord client not connected' }] };
    }

    // Shuffle the 3 channels to randomly select ONE
    const shuffledChannels = [...channelsToPickFrom].sort(() => Math.random() - 0.5);

    let postedResult: any = null;

    for (const channelId of shuffledChannels) {
      try {
        const channel = await this.client.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased() || channel.isDMBased()) {
          logger.warn(`Channel ${channelId} not found or not text-based, trying next random channel...`);
          continue;
        }

        const textChannel = channel as TextChannel;
        const guildId = textChannel.guildId || textChannel.guild?.id;

        // Check if server is allowed for scheduled posts
        if (guildId && !isScheduledServerAllowed(guildId)) {
          logger.debug(`Skipping channel ${channelId} because its guild [${guildId}] is not in scheduled server list.`);
          continue;
        }

        const perms = textChannel.guild?.members.me?.permissionsIn(textChannel);
        if (perms && (!perms.has('ViewChannel') || !perms.has('SendMessages'))) {
          logger.warn(`Missing permissions in channel #${textChannel.name} (${channelId}), trying next random channel...`);
          continue;
        }

        // Try to fetch recent messages
        let messages: any = null;
        if (!perms || perms.has('ReadMessageHistory')) {
          messages = await textChannel.messages.fetch({ limit: 15 }).catch(() => null);
        }

        const userMessages = messages ? Array.from(messages.values()).filter((m: any) => 
          !m.author.bot && 
          !m.system && 
          m.content && m.content.trim().length > 0
        ) : [];

        if ('sendTyping' in textChannel) {
          await textChannel.sendTyping().catch(() => {});
        }

        let response = '';
        try {
          if (userMessages.length > 0) {
            const selectedMessage: any = userMessages[Math.floor(Math.random() * Math.min(3, userMessages.length))];
            const cleanContent = selectedMessage.content.replace(new RegExp(`<@!?${this.client.user?.id}>`, 'g'), '').trim();
            response = await this.brain.processInteraction(selectedMessage.author.id, cleanContent || 'oi');
          } else {
            const channelStarterPrompts = [
              `Drop a spontaneous, sarcastic, and funny Banglish one-liner or conversation starter. Bohurupi is bored because chat is dead. Speak authentic Banglish in 1-2 sentences.`,
              `Drop an absurd, funny Banglish hot-take in 1-2 short sentences.`,
              `Mock the silence in the Discord server asking if everyone went to sleep. Short witty Banglish.`
            ];
            const prompt = channelStarterPrompts[Math.floor(Math.random() * channelStarterPrompts.length)];
            response = await this.brain.processInteraction('scheduled-cron', prompt);
          }
        } catch (aiErr) {
          logger.warn('AI generation for scheduled auto-reply timed out or failed, using robust fallback.', { error: aiErr });
        }

        if (!response || response.trim().length === 0 || response.includes('*(Bohurupi')) {
          const fallbackStarters = [
            "kire bhai, chat eto shanto keno? 💀",
            "bhai keo ki ghumai gelo naki? 🥱",
            "kono kotha nai, shudhu adda hobe ar biryani khawa hobe 😎",
            "ayo, keo ki alive ase naki shobai busy? 🤣",
            "bhai eto shanti keno server e? panga lagabo naki? 🥊"
          ];
          response = fallbackStarters[Math.floor(Math.random() * fallbackStarters.length)] || getDiverseDynamicReply('oi', 'SERVER_MEMBER');
        }

        let sentMsg: any = null;
        const sanitized = response.length > 1950 ? response.substring(0, 1950) + '...' : response;
        if (userMessages.length > 0) {
          const selectedMessage: any = userMessages[0];
          try {
            sentMsg = await selectedMessage.reply(sanitized);
          } catch (err) {
            sentMsg = await textChannel.send(sanitized);
          }
          postedResult = {
            channelId,
            channelName: textChannel.name,
            status: 'replied_to_user',
            messageId: selectedMessage.id,
            sentMessageId: sentMsg?.id,
            text: sanitized
          };
        } else {
          sentMsg = await textChannel.send(sanitized);
          postedResult = {
            channelId,
            channelName: textChannel.name,
            status: 'sent_spontaneous',
            sentMessageId: sentMsg?.id,
            text: sanitized
          };
        }
        logger.info(`✅ [Discord Scheduled Post Success] Message ID [${sentMsg?.id || 'unknown'}] successfully posted to channel #${textChannel.name} (${channelId}) in guild [${textChannel.guild?.name || 'DM'}]. Text: "${sanitized}"`);
        break; // Stop after successfully sending to 1 channel!
      } catch (err: any) {
        logger.error(`Failed scheduled post attempt in channel ${channelId}`, { error: err?.message || String(err) });
      }
    }

    if (!postedResult) {
      logger.warn('Could not post scheduled auto-reply to any available channel.');
      return { success: false, results: [{ error: 'No channel accessible for posting' }] };
    }

    logger.info(`Scheduled Discord task completed. Randomly posted to #${postedResult.channelName}.`);
    return { success: true, result: postedResult, results: [postedResult] };
  }


  private async handleCommand(command: string, args: string[], message: Message): Promise<boolean> {
    const validCommands = [
      'bully', 'roast', 'court', 'fight', 'biryani_roulette', 'roulette', 
      'expose', 'hype', 'agree', 'biryani_war', 'biryaniwar', 'nasta_check', 'nasta', 
      'predict', 'roast_chat', 'roastchat', 'lore', 'flirt', 'meme', 'advice', 
      'confess', 'truth', 'dare', '8ball', 'choose', 'iq', 'horoscope', 'help', 'commands'
    ];
    
    if (!validCommands.includes(command)) return false;

    // Send typing indicator immediately
    if ('sendTyping' in message.channel) {
      await message.channel.sendTyping().catch(() => {});
    }

    const authorTag = message.author.tag || message.author.username;
    const authorDisplayName = message.member?.displayName || message.author.displayName || message.author.username;
    const channelName = 'name' in message.channel ? (message.channel as any).name : message.channel.id;
    const guildName = message.guild?.name || 'DM';

    const targetMention = message.mentions.users.first();
    let targetUserId = targetMention ? targetMention.id : '';
    if (!targetUserId && args[0]) {
      const cleanArg = args[0].replace(/[<@!>]/g, '');
      if (/^\d{17,20}$/.test(cleanArg)) {
        targetUserId = cleanArg;
      }
    }
    if (!targetUserId) {
      targetUserId = message.author.id;
    }
    const targetUser = targetMention ? "<@" + targetMention.id + ">" : (args[0] || "<@" + message.author.id + ">");
    const targetUserName = targetMention?.username || (args[0] ? args[0].replace(/[@<>]/g, '') : message.author.username);

    logger.info(`⚔️ [Discord Command] !${command} invoked by @${authorDisplayName} (${authorTag} | ID: ${message.author.id}) in #${channelName} [${guildName}] targeting: ${targetUserName}`, {
      type: 'DISCORD_COMMAND',
      command: `!${command}`,
      user: {
        id: message.author.id,
        tag: authorTag,
        displayName: authorDisplayName
      },
      target: targetUserName,
      channel: '#' + channelName,
      guild: guildName,
      args
    });

    // Help menu command
    if (command === 'help' || command === 'commands') {
      const helpFrame = `\`\`\`text
┌─────────────────────────────────────────────────────────┐
│ 🎭  BOHURUPI BOT - OFFICIAL COMMANDS LIST               │
├─────────────────────────────────────────────────────────┤
│ ⚔️ Interactive Action Commands:
│ ├─ !court @user            : Bohurupi court session & verdict
│ ├─ !fight @user            : 1v1 Street fight knockout
│ ├─ !biryani_roulette @user : Poisonous chaotic bowl rating
│ ├─ !bully / !roast @user   : Savage roast & banter
│ ├─ !expose @user           : Fake leaked search history
│ ├─ !hype @user             : Supreme deity-level hype
│ ├─ !agree @user            : Aggressively agree with target
│ ├─ !lore @user             : Absurd fake origin lore
│ ├─ !predict @user          : 10-year absurd future prediction
│ ├─ !iq @user               : Fake IQ scanner & rating
│ ├─ !flirt @user            : Cheesy / toxic romantic line
│ ├─ !confess @user          : Fake scandalous confession
│ ├─ !truth @user            : Provocative truth question
│ ├─ !dare @user             : Absurd chaotic dare
│ ├─ !horoscope              : Chaotic daily astrology
│ ├─ !8ball [question]       : Savage 8-ball fortune prediction
│ ├─ !choose [opt1] or [opt2]: Bohurupi's definitive choice
│ ├─ !biryani_war            : Ignite the ultimate food debate
│ ├─ !nasta_check            : Strict guardian snack check
│ └─ !roast_chat             : Roast the active chat
├─────────────────────────────────────────────────────────┤
│ 💡 Bohurupi AI Core • Active in Allowed Channels        │
└─────────────────────────────────────────────────────────┘
\`\`\``;
      await message.reply(helpFrame);
      logger.info(`📖 [Discord Command Reply] !help menu displayed for @${authorDisplayName} in #${channelName}`, {
        type: 'DISCORD_COMMAND_REPLY',
        command: '!help',
        user: { id: message.author.id, tag: authorTag, displayName: authorDisplayName },
        channel: '#' + channelName,
        guild: guildName
      });
      return true;
    }

    if (command === 'court') {
      const aiResponse = await this.brain.processCommand(
         message.author.id, 
         targetUserName, 
         `COMMAND: !court. INSTRUCTION: You just sentenced ${targetUserName} to guilty. State a short, hilarious fake crime and a funny penalty in Banglish. Format your answer EXACTLY like this (2 lines):\nCrime: [crime]\nPenalty: [penalty]. Do not use quotes.`,
         targetUserId
      );
      
      let crime = "Friday night e jaldi ghumay jawar jonno";
      let penalty = "Creator ke 100 taka flexiload";
      
      const crimeMatch = aiResponse.match(/\bcrime\s*[:\-]\s*(.*)/i);
      const penaltyMatch = aiResponse.match(/\bpenalty\s*[:\-]\s*(.*)/i);
      if (crimeMatch) crime = crimeMatch[1].replace(/\*\*/g, '').trim();
      if (penaltyMatch) penalty = penaltyMatch[1].replace(/\*\*/g, '').trim();

      const frame = `\`\`\`text
┌─────────────────────────────────────────────────────────┐
│ ⚖️  BOHURUPI SUPREME COURT IN SESSION                   │
├─────────────────────────────────────────────────────────┤
│ 👨‍⚖️ Presiding Judge : Bohurupi
│ 🎯 Accused Member   : ${targetUserName}
│ 
│ 📋 Offense:
│ └─ "${crime}"
│ 
│ 🏛️ Courtroom Dialogue:
│ ├─ Bohurupi : "Order in the court! Haturir bari khabi?"
│ └─ ${targetUserName} : "Bhai ami nirdosh, maf koira den!"
│ 
│ 📊 Server Jury Vote : 🟢 0 Innocent  |  🔴 42 Guilty
│ 🚨 Final Verdict    : GUILTY - NO MERCY!
│ 💸 Court Penalty    : ${penalty}
├─────────────────────────────────────────────────────────┤
│ ⚖️ Executed by Bohurupi AI • Single Frame Output
└─────────────────────────────────────────────────────────┘
\`\`\``;
      await message.reply(frame);
      logger.info(`🤖 [Discord Command Reply] !court executed by @${authorDisplayName} against ${targetUserName}: Crime: "${crime}" | Penalty: "${penalty}"`, {
        type: 'DISCORD_COMMAND_REPLY',
        command: '!court',
        user: { id: message.author.id, tag: authorTag, displayName: authorDisplayName },
        target: targetUserName,
        channel: '#' + channelName,
        reply: `Crime: ${crime} | Penalty: ${penalty}`
      });
      return true;
    }

    if (command === 'fight') {
      const aiResponse = await this.brain.processCommand(
         message.author.id, 
         targetUserName, 
         `COMMAND: !fight. INSTRUCTION: You just knocked out ${targetUserName} in a street fight. Name a hilarious, absurd knockout move (e.g. CHICKEN SLAP, NOKH DIYE KHAMCHI, BELUN ER BARI). Format your answer EXACTLY like this (2 lines):\nMove: [move]\nTrashTalk: [trash talk in banglish]. Do not use quotes.`,
         targetUserId
      );
      
      let move = "CHICKEN SLAP";
      let trashTalk = `${targetUserName} tui to 1 v 1 e pure bot 💀 ja age practice kore ay!`;
      
      const moveMatch = aiResponse.match(/\bmove\s*[:\-]\s*(.*)/i);
      const trashTalkMatch = aiResponse.match(/\btrashtalk\s*[:\-]\s*(.*)/i);
      if (moveMatch) move = moveMatch[1].replace(/\*\*/g, '').trim();
      if (trashTalkMatch) trashTalk = trashTalkMatch[1].replace(/\*\*/g, '').trim();

      const frame = `\`\`\`text
┌─────────────────────────────────────────────────────────┐
│ ⚔️  BOHURUPI STREET FIGHT - MATCH RESULT                 │
├─────────────────────────────────────────────────────────┤
│ 🥊 Bohurupi   : [██████████] 100 HP
│ 💀 ${targetUserName} : [░░░░░░░░░░] 0 HP (K.O.)
│ 
│ 📍 Arena       : Mirpur 10 Golchottor
│ 💥 K.O. Move   : [ ${move} ]
│ 🏆 Verdict     : CRITICAL HIT! 100 DMG K.O. SLAP!
│ 💬 Bohurupi    : "${trashTalk}"
├─────────────────────────────────────────────────────────┤
│ ⚔️ Match Official: Bohurupi AI • Single Frame Output
└─────────────────────────────────────────────────────────┘
\`\`\``;
      await message.reply(frame);
      logger.info(`🤖 [Discord Command Reply] !fight executed by @${authorDisplayName} against ${targetUserName}: Move: [${move}] | TrashTalk: "${trashTalk}"`, {
        type: 'DISCORD_COMMAND_REPLY',
        command: '!fight',
        user: { id: message.author.id, tag: authorTag, displayName: authorDisplayName },
        target: targetUserName,
        channel: '#' + channelName,
        reply: `Move: ${move} | TrashTalk: ${trashTalk}`
      });
      return true;
    }

    if (command === 'biryani_roulette' || command === 'roulette') {
      const aiResponse = await this.brain.processCommand(
         message.author.id, 
         targetUserName, 
         `COMMAND: !biryani_roulette. INSTRUCTION: ${targetUserName} was playing biryani roulette and got the worst possible item in their biryani instead of meat. Name a hilarious inedible object (e.g. CRICKET IN ALU, TEELA POKA, NOSTHO ELAICHI, PORA ROSHUN). Format your answer EXACTLY like this (3 lines):\nDish: [dish]\nNotes: [kitchen notes in banglish]\nMock: [mocking sentence in banglish]`,
         targetUserId
      );
      
      let dish = "CRICKET IN ALU";
      let notes = "Teela poka found inside the rice packet.";
      let mock = `bhai ${targetUserName}, ajke ar bhat khas na tui!`;
      
      const dishMatch = aiResponse.match(/\bdish\s*[:\-]\s*(.*)/i);
      const notesMatch = aiResponse.match(/\bnotes\s*[:\-]\s*(.*)/i);
      const mockMatch = aiResponse.match(/\bmock\s*[:\-]\s*(.*)/i);
      if (dishMatch) dish = dishMatch[1].replace(/\*\*/g, '').trim();
      if (notesMatch) notes = notesMatch[1].replace(/\*\*/g, '').trim();
      if (mockMatch) mock = mockMatch[1].replace(/\*\*/g, '').trim();

      const frame = `\`\`\`text
┌─────────────────────────────────────────────────────────┐
│ 🎰  BOHURUPI BIRYANI ROULETTE                           │
├─────────────────────────────────────────────────────────┤
│ 👤 Customer    : ${targetUserName}
│ 🍗 Served Dish : ${dish}
│ 📊 Rating      : 0/10 (FATAL DANGER)
│ 🤢 Status      : POISONOUS BOWL
│ 
│ 📋 Kitchen Notes:
│ └─ "${notes}"
│ 
│ 🚨 Result      : WORST BOWL EVER 💀
│ 💬 Bohurupi    : "${mock}"
├─────────────────────────────────────────────────────────┤
│ 🎰 Chef: Bohurupi AI • Single Frame Output
└─────────────────────────────────────────────────────────┘
\`\`\``;
      await message.reply(frame);
      logger.info(`🤖 [Discord Command Reply] !biryani_roulette executed by @${authorDisplayName} for ${targetUserName}: Dish: "${dish}" | Mock: "${mock}"`, {
        type: 'DISCORD_COMMAND_REPLY',
        command: '!biryani_roulette',
        user: { id: message.author.id, tag: authorTag, displayName: authorDisplayName },
        target: targetUserName,
        channel: '#' + channelName,
        reply: `Dish: ${dish} | Mock: ${mock}`
      });
      return true;
    }

    if (command === 'iq') {
      const fakeIQ = Math.floor(Math.random() * 150) - 20; // -20 to 130
      const aiResponse = await this.brain.processCommand(
        message.author.id,
        targetUserName,
        `COMMAND: !iq. TARGET: ${targetUserName}. CALCULATED_IQ: ${fakeIQ}. INSTRUCTION: Give a 1-sentence hilarious roast about ${targetUserName}'s IQ in Banglish. Mention them using ${targetUser}.`,
        targetUserId
      );
      const frame = `\`\`\`text
┌─────────────────────────────────────────────────────────┐
│ 🧠  BOHURUPI IQ SCANNER                                 │
├─────────────────────────────────────────────────────────┤
│ 🎯 Target      : ${targetUserName}
│ 📊 Scanned IQ  : ${fakeIQ} IQ
│ 🔍 Diagnosis   : ${fakeIQ < 50 ? "Severe Brain Lag 💀" : fakeIQ < 90 ? "Average Rickshaw Puller Brain" : "Surprisingly Functional"}
│ 
│ 💬 Bohurupi Verdict:
│ └─ ${aiResponse.replace(/```/g, '')}
├─────────────────────────────────────────────────────────┤
│ 🧠 Lab: Bohurupi AI • Single Frame Output
└─────────────────────────────────────────────────────────┘
\`\`\``;
      await message.reply(frame);
      return true;
    }
    
    let commandPrompt = '';
    const query = args.join(' ');
    
    switch (command) {
      case 'bully':
      case 'roast':
        commandPrompt = `COMMAND: !bully. TARGET: ${targetUserName}. INSTRUCTION: Roast and bully ${targetUserName} playfully but savagely in Banglish. Act toxic and unhinged. Mention them using ${targetUser}. Do not use quotes.`;
        break;
      case 'expose':
        commandPrompt = `COMMAND: !expose. TARGET: ${targetUserName}. INSTRUCTION: Make up a hilarious, fake "secret" or "leaked search history" about ${targetUserName} in Banglish. Be creative and funny. Mention them using ${targetUser}. Do not use quotes.`;
        break;
      case 'hype':
        commandPrompt = `COMMAND: !hype. TARGET: ${targetUserName}. INSTRUCTION: Hype up ${targetUserName} to an extreme, absurd level in Banglish. Treat them like an absolute legend or deity. Mention them using ${targetUser}.`;
        break;
      case 'agree':
        commandPrompt = `COMMAND: !agree. TARGET: ${targetUserName}. INSTRUCTION: Aggressively and absurdly agree with ${targetUserName} in Banglish. State that their words are the absolute truth. Mention them using ${targetUser}.`;
        break;
      case 'biryani_war':
      case 'biryaniwar':
        commandPrompt = `COMMAND: !biryani_war. INSTRUCTION: Start a highly controversial, chaotic debate about a local Bangladeshi food topic (like Kacchi vs Tehari, Alu in Biryani, etc.) in Banglish. Demand the chat to fight about it.`;
        break;
      case 'nasta_check':
      case 'nasta':
        commandPrompt = `COMMAND: !nasta_check. INSTRUCTION: Aggressively ask everyone in the chat if they have eaten their snacks/food in Banglish. Act like a strict but chaotic desi guardian.`;
        break;
      case 'predict':
        commandPrompt = `COMMAND: !predict. TARGET: ${targetUserName}. INSTRUCTION: Predict a hilariously pathetic or absurd future for ${targetUserName} 5-10 years from now in Banglish. Mention them using ${targetUser}.`;
        break;
      case 'roast_chat':
      case 'roastchat':
        commandPrompt = `COMMAND: !roast_chat. INSTRUCTION: Roast the entire chat's current state, IQ level, or lack of activity in Banglish. Be apathetic, toxic, and savage.`;
        break;
      case 'lore':
        commandPrompt = `COMMAND: !lore. TARGET: ${targetUserName}. INSTRUCTION: Tell a completely fake, funny, and absurd historical "lore" or backstory about how ${targetUserName} was born or how they got here in Banglish. Mention them using ${targetUser}.`;
        break;
      case 'flirt':
        commandPrompt = `COMMAND: !flirt. TARGET: ${targetUserName}. INSTRUCTION: Say a ridiculously funny, cringe, or cheesy flirtatious pickup line to ${targetUserName} in Banglish. Mention them using ${targetUser}.`;
        break;
      case 'meme':
        commandPrompt = `COMMAND: !meme. INSTRUCTION: Describe a hilarious, relatable modern Bangladeshi meme or scenario in Banglish. Be witty and sarcastic.`;
        break;
      case 'advice':
        commandPrompt = `COMMAND: !advice. QUERY: "${query}". TARGET: ${targetUserName}. INSTRUCTION: Give terrible, funny, toxic desi life advice for the user's question or situation in Banglish. Mention ${targetUser}.`;
        break;
      case 'confess':
        commandPrompt = `COMMAND: !confess. TARGET: ${targetUserName}. INSTRUCTION: Make up a dramatic, fake confession about ${targetUserName} or yourself in Banglish.`;
        break;
      case 'truth':
        commandPrompt = `COMMAND: !truth. TARGET: ${targetUserName}. INSTRUCTION: Ask a spicy, awkward, and hilarious truth question to ${targetUserName} in Banglish. Mention them using ${targetUser}.`;
        break;
      case 'dare':
        commandPrompt = `COMMAND: !dare. TARGET: ${targetUserName}. INSTRUCTION: Give a chaotic, hilarious dare to ${targetUserName} to do in the Discord server in Banglish. Mention them using ${targetUser}.`;
        break;
      case '8ball':
        commandPrompt = `COMMAND: !8ball. QUESTION: "${query || 'Will my life get better?'}". INSTRUCTION: Answer like a sassy, savage magic 8-ball in Banglish. Be direct, sarcastic, and funny.`;
        break;
      case 'choose':
        commandPrompt = `COMMAND: !choose. OPTIONS: "${query || 'option A or option B'}". INSTRUCTION: Choose one option decisively and mock the other option ruthlessly in Banglish.`;
        break;
      case 'horoscope':
        commandPrompt = `COMMAND: !horoscope. TARGET: ${targetUserName}. INSTRUCTION: Give a completely chaotic, absurd, and funny daily horoscope prediction for ${targetUserName} in Banglish.`;
        break;
    }

    if (commandPrompt !== '') {
      const response = await this.brain.processCommand(message.author.id, targetUserName, commandPrompt, targetUserId);
      if (response && response.trim().length > 0) {
        const sanitized = response.length > 1950 ? response.substring(0, 1950) + '...' : response;
        await message.reply(sanitized);
        logger.info(`🤖 [Discord Command Reply] !${command} for @${authorDisplayName}: "${sanitized}"`, {
          type: 'DISCORD_COMMAND_REPLY',
          command: `!${command}`,
          user: { id: message.author.id, tag: authorTag, displayName: authorDisplayName },
          target: targetUserName,
          channel: '#' + channelName,
          guild: guildName,
          reply: sanitized
        });
      }
    }

    return true;
  }
  private registerEvents() {
    this.client.on(Events.Error, (error) => {
      logger.error('Discord client encountered an error:', { error: error?.message || String(error) });
    });

    this.client.on(Events.ShardError, (error, shardId) => {
      logger.error(`Discord client shard ${shardId} error:`, { error: error?.message || String(error) });
    });

    this.client.on(Events.ShardDisconnect, (event, shardId) => {
      this.isConnected = false;
      logger.warn(`Discord shard ${shardId} disconnected with code: ${event?.code || 'unknown'}`);
    });

    this.client.on(Events.ShardReconnecting, (shardId) => {
      logger.info(`Discord shard ${shardId} reconnecting...`);
    });

    this.client.once(Events.ClientReady, (readyClient) => {
      this.isConnected = true;
      this.brain.getIdentityManager().setClient(readyClient);
      logger.info(`Discord Service Online! Logged in as ${readyClient.user.tag}`);
      
      if (this.isPaused) {
        try {
          readyClient.user.setPresence({
            activities: [{ name: '⏸️ Activity Paused by Admin' }],
            status: 'idle'
          });
        } catch (e) {}
      }

      // Start scheduler once ready
      this.startScheduler();
    });

    this.client.on(Events.MessageCreate, async (message: Message) => {
      // Ignore bots
      if (message.author.bot) return;

      // If the bot activity is paused by admin, ignore all incoming messages, commands, and mentions
      if (this.isPaused) {
        return;
      }

      const guildId = message.guildId || message.guild?.id;

      // Strict Channel Restriction for primary server, allowed elsewhere:
      if (!isChannelAllowed(message.channel.id, guildId)) return;

      // Check for commands (e.g. !court @user, !bully, or @Bohurupi court)
      const trimmedContent = message.content.trim();
      let commandStr = '';
      let commandArgs: string[] = [];

      if (trimmedContent.startsWith('!')) {
        commandArgs = trimmedContent.slice(1).trim().split(/\s+/);
        commandStr = commandArgs.shift()?.toLowerCase() || '';
      } else if (this.client.user && message.mentions.has(this.client.user.id)) {
        const stripped = trimmedContent.replace(new RegExp(`<@!?${this.client.user.id}>`, 'g'), '').trim();
        if (stripped.startsWith('!')) {
          commandArgs = stripped.slice(1).trim().split(/\s+/);
          commandStr = commandArgs.shift()?.toLowerCase() || '';
        } else {
          const potentialArgs = stripped.split(/\s+/);
          const potentialCmd = potentialArgs[0]?.toLowerCase();
          const recognizedCommands = [
            'bully', 'roast', 'court', 'fight', 'biryani_roulette', 'roulette', 
            'expose', 'hype', 'agree', 'biryani_war', 'biryaniwar', 'nasta_check', 'nasta', 
            'predict', 'roast_chat', 'roastchat', 'lore', 'flirt', 'meme', 'advice', 
            'confess', 'truth', 'dare', '8ball', 'choose', 'iq', 'horoscope', 'help', 'commands'
          ];
          if (potentialCmd && recognizedCommands.includes(potentialCmd)) {
            commandStr = potentialCmd;
            commandArgs = potentialArgs.slice(1);
          }
        }
      }

      if (commandStr) {
        const handled = await this.handleCommand(commandStr, commandArgs, message);
        if (handled) return; // Command processed, do not continue to normal bot chat
      }

      // Check if message is a direct mention or a reply to Bohurupi
      const isMentioned = Boolean(this.client.user && message.mentions.has(this.client.user.id));
      let isReplyToBot = false;
      if (message.reference && message.reference.messageId) {
        try {
          const repliedMsg = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
          if (repliedMsg && repliedMsg.author.id === this.client.user?.id) {
            isReplyToBot = true;
          }
        } catch (e) {}
      }
      
      // Only respond if mentioned or replied to, to prevent unprompted spamming
      if (!isMentioned && !isReplyToBot) return;

      const authorTag = message.author.tag || message.author.username;
      const authorDisplayName = message.member?.displayName || message.author.displayName || message.author.username;
      const channelName = 'name' in message.channel ? (message.channel as any).name : message.channel.id;
      const guildName = message.guild?.name || 'DM';

      let cleanContent = message.content.replace(new RegExp(`<@!?${this.client.user?.id}>`, 'g'), '').trim();
      if (!cleanContent) {
        cleanContent = "oi";
      }

      logger.info(`💬 [Discord Mention] @${authorDisplayName} (${authorTag} | ID: ${message.author.id}) in #${channelName} [${guildName}]: "${cleanContent}"`, {
        type: 'DISCORD_MENTION',
        interaction: isReplyToBot ? 'REPLY_TO_BOT' : 'DIRECT_MENTION',
        user: {
          id: message.author.id,
          tag: authorTag,
          displayName: authorDisplayName
        },
        channel: {
          id: message.channel.id,
          name: channelName
        },
        guild: {
          id: message.guildId || 'DM',
          name: guildName
        },
        incomingMessage: cleanContent
      });

      // Process via Brain
      try {
        const perms = message.channel && 'guild' in message.channel && message.channel.guild ? message.channel.guild.members.me?.permissionsIn(message.channel as TextChannel) : null;
        if (perms && (!perms.has('ViewChannel') || !perms.has('SendMessages'))) {
          return;
        }

        if ('sendTyping' in message.channel && typeof message.channel.sendTyping === 'function') {
          await message.channel.sendTyping().catch(() => {});
        }
        
        const response = await this.brain.processInteraction(message.author.id, cleanContent);
        
        if (response && response.trim().length > 0 && !response.includes('*(Bohurupi')) {
          // Truncate response to stay well within Discord's 2000 character limit
          const sanitizedResponse = response.length > 1950 ? response.substring(0, 1950) + '...' : response;
          
          try {
            await message.reply(sanitizedResponse);
          } catch (replyError: any) {
            logger.warn('Reply failed (e.g. message deleted or missing history permission), falling back to channel.send', {
              error: replyError?.message || String(replyError)
            });
            try {
              if ('send' in message.channel && typeof message.channel.send === 'function') { 
                await message.channel.send(sanitizedResponse); 
              }
            } catch (sendError: any) {
              logger.warn('Failed to send Discord message via fallback channel.send (Missing Permissions/Access)', {
                error: sendError?.message || String(sendError)
              });
            }
          }

          logger.info(`🤖 [Discord Reply] To @${authorDisplayName} (${authorTag} | ID: ${message.author.id}) in #${channelName} [${guildName}]: "${sanitizedResponse}"`, {
            type: 'DISCORD_REPLY',
            user: {
              id: message.author.id,
              tag: authorTag,
              displayName: authorDisplayName
            },
            channel: {
              id: message.channel.id,
              name: '#' + channelName
            },
            guild: {
              id: message.guildId || 'DM',
              name: guildName
            },
            prompt: cleanContent,
            reply: sanitizedResponse
          });
        }
      } catch (error: any) {
        logger.error('Failed to process Discord message', {
          error: error?.message || String(error),
          stack: error?.stack
        });
      }
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;
      if (this.isPaused) return;

      const cmdName = interaction.commandName;
      const targetUser = interaction.options.getUser('user') || interaction.options.getUser('target');
      const targetUserId = targetUser?.id;

      try {
        const resp = await this.brain.processCommand(interaction.user.id, targetUser?.username || interaction.user.username, `COMMAND: /${cmdName}`, targetUserId);
        await interaction.reply({ content: resp }).catch(() => {});
      } catch (e) {
        await interaction.reply({ content: "command processed 🫡" }).catch(() => {});
      }
    });
  }

  async start(token: string | undefined) {
    const cleanToken = token ? token.trim().replace(/^["']|["']$/g, '') : '';
    if (!cleanToken) {
      this.lastConnectionError = 'DISCORD_TOKEN is missing. Discord Integration is in standby.';
      logger.warn('DISCORD_TOKEN is missing. Discord Integration is in standby.');
      return;
    }
    
    try {
      this.lastConnectionError = null;
      await this.client.login(cleanToken);
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      this.lastConnectionError = errMsg;
      if (errMsg.includes('An invalid token was provided')) {
        logger.warn('Discord connection skipped: The provided DISCORD_TOKEN is invalid or has been reset in the Discord Developer Portal. Discord bot running in standby mode.');
      } else if (errMsg.includes('Privileged') || errMsg.includes('disallowed intents')) {
        logger.warn('Discord connection skipped: Privileged Gateway Intents (Message Content) must be enabled in the Discord Developer Portal.', { error: errMsg });
      } else {
        logger.warn('Discord connection attempt failed (operating in standby mode):', { error: errMsg });
      }
    }
  }

  async stop() {
    this.isPaused = true;
    try {
      if (this.isConnected) {
        await this.client.destroy();
        this.isConnected = false;
        logger.info('Discord client disconnected and destroyed. Bot is now in full STANDBY.');
      }
    } catch (e: any) {
      logger.warn('Error destroying Discord client:', { error: e?.message || String(e) });
    }
  }

  async getStatus() {
    const envServers = (process.env.SCHEDULED_SERVER_ID || process.env.SCHEDULED_SERVER_IDS || '')
      .split(',')
      .map(id => id.trim())
      .filter(id => id.length > 0);
    const targetServers = envServers.length > 0 ? envServers : SCHEDULED_SERVER_IDS;

    const targetChannels = getAllowedChannelIds();

    const serversInfo: { id: string; name: string }[] = [];
    const channelsInfo: { id: string; name: string }[] = [];
    const guildChannels: { id: string; name: string; guildId: string; guildName: string }[] = [];

    // If connected to Discord, collect all guilds from client cache (every server the bot joined)
    if (this.isConnected) {
      for (const [gId, guild] of this.client.guilds.cache) {
        serversInfo.push({
          id: gId,
          name: guild.name
        });

        // Collect text channels from joined servers so admin can see server channels
        try {
          const textChannels = guild.channels.cache.filter((c: any) => c.isTextBased() && !c.isDMBased());
          for (const [cId, c] of textChannels) {
            guildChannels.push({
              id: cId,
              name: `#${(c as any).name}`,
              guildId: gId,
              guildName: guild.name
            });
          }
        } catch (e) {}
      }
    }

    // Also include any target servers from config if not yet in cache
    for (const sId of targetServers) {
      if (!serversInfo.some(s => s.id === sId)) {
        let sName = sId === '1522520842163060809' ? 'Bohurupi Main Guild' : (sId === '705092446366728233' ? 'Bohurupi Primary Server' : `Server (${sId})`);
        if (this.isConnected) {
          try {
            const guild = await this.client.guilds.fetch(sId).catch(() => null);
            if (guild) sName = guild.name;
          } catch (e) {}
        }
        serversInfo.push({ id: sId, name: sName });
      }
    }

    const defaultChannelNames: Record<string, string> = {
      '705092446366728236': '#bot-tasting-general',
      '1453357071931019304': '#media',
      '1470329659693600768': '#memes'
    };

    if (this.isConnected) {
      for (const chId of targetChannels) {
        try {
          const ch = await this.client.channels.fetch(chId).catch(() => null);
          channelsInfo.push({
            id: chId,
            name: ch && 'name' in ch ? `#${(ch as any).name}` : (defaultChannelNames[chId] || `#${chId}`)
          });
        } catch (e) {
          channelsInfo.push({
            id: chId,
            name: defaultChannelNames[chId] || `#${chId}`
          });
        }
      }
    } else {
      for (const chId of targetChannels) {
        channelsInfo.push({
          id: chId,
          name: defaultChannelNames[chId] || `#${chId}`
        });
      }
    }

    return {
      connected: this.isConnected,
      isPaused: this.isPaused,
      pausedAt: this.pausedAt,
      pausedBy: this.pausedBy,
      lastConnectionError: this.lastConnectionError,
      botTag: this.client.user?.tag || 'Not Logged In',
      allowedServers: serversInfo,
      allowedServer: serversInfo[0] || { id: SCHEDULED_SERVER_IDS[0], name: 'Bohurupi Main Guild' },
      allowedChannels: channelsInfo,
      guildChannels
    };
  }
}
