import { Client, GatewayIntentBits, Events, Message, TextChannel } from 'discord.js';
import cron from 'node-cron';
import { logger } from '../telemetry/logger';
import { BohurupiBrain } from '../core/BohurupiBrain';

/**
 * Allowed Channel IDs where Bohurupi is permitted to reply, execute commands,
 * and send scheduled messages:
 * - Text channel:  705092446366728236
 * - Media channel: 1453357071931019304
 * - Memes channel: 1470329659693600768
 */
export const ALLOWED_CHANNEL_IDS: string[] = [
  '705092446366728236',  // Text channel
  '1453357071931019304', // Media channel
  '1470329659693600768'  // Memes channel
];

/**
 * Designated Server / Guild ID where Bohurupi is strictly permitted to send scheduled messages:
 * Server ID: 705092446366728233
 */
export const SCHEDULED_SERVER_ID: string = '705092446366728233';

export function isChannelAllowed(channelId: string): boolean {
  const envChannels = (process.env.ALLOWED_CHANNEL_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
  
  const allowedList = envChannels.length > 0 ? envChannels : ALLOWED_CHANNEL_IDS;
  return allowedList.includes(channelId);
}

export function isScheduledServerAllowed(guildId?: string | null): boolean {
  if (!guildId) return false;
  const targetServerId = process.env.SCHEDULED_SERVER_ID || SCHEDULED_SERVER_ID;
  return guildId === targetServerId;
}

export class DiscordService {
  private client: Client;
  private isConnected: boolean = false;
  private schedulerStarted: boolean = false;

  constructor(private brain: BohurupiBrain) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.registerEvents();
  }

  
  private startScheduler() {
    if (this.schedulerStarted) return;
    this.schedulerStarted = true;
    const tz = process.env.TIMEZONE || 'Asia/Dhaka';
    const schedule1 = process.env.SCHEDULE_1 || '15:30';
    const schedule2 = process.env.SCHEDULE_2 || '22:30';

    const parseSchedule = (timeStr: string) => {
      const [hour, minute] = timeStr.split(':');
      return `${minute} ${hour} * * *`;
    };

    const cronExpr1 = parseSchedule(schedule1);
    const cronExpr2 = parseSchedule(schedule2);

    logger.info(`Initializing Discord Auto-Reply Scheduler: ${schedule1} & ${schedule2} (${tz})`);

    const task = async () => {
      await this.triggerAutoReply();
    };

    cron.schedule(cronExpr1, task, { timezone: tz });
    cron.schedule(cronExpr2, task, { timezone: tz });
  }

  private async triggerAutoReply() {
    const targetServerId = process.env.SCHEDULED_SERVER_ID || SCHEDULED_SERVER_ID;
    logger.info(`Running scheduled Discord auto-reply task strictly for server [${targetServerId}]...`);
    if (!this.isConnected || !this.client.user) {
      logger.warn('Skipping auto-reply, Discord client not connected.');
      return;
    }

    try {
      let selectedMessage: Message | null = null;
      let selectedChannel: TextChannel | null = null;

      // Pick randomly from the allowed channels only (Text, Media, Memes)
      const allowedChannelsShuffled = [...ALLOWED_CHANNEL_IDS].sort(() => Math.random() - 0.5);

      for (const channelId of allowedChannelsShuffled) {
        try {
          const channel = await this.client.channels.fetch(channelId).catch(() => null);
          if (!channel || !channel.isTextBased() || channel.isDMBased()) continue;
          
          const textChannel = channel as TextChannel;
          const guildId = textChannel.guildId || textChannel.guild?.id;

          // STRICT CHECK: The bot will ONLY send scheduled messages in server 705092446366728233
          if (!isScheduledServerAllowed(guildId)) {
            logger.debug(`Skipping channel ${channelId} because its guild [${guildId}] is not the designated scheduled server [${targetServerId}].`);
            continue;
          }

          const perms = textChannel.guild?.members.me?.permissionsIn(textChannel);
          if (perms && (!perms.has('ViewChannel') || !perms.has('ReadMessageHistory') || !perms.has('SendMessages'))) {
            continue;
          }

          const messages = await textChannel.messages.fetch({ limit: 20 });
          // Look for recent user messages that are not from the bot itself
          const userMessages = Array.from(messages.values()).filter(m => 
              !m.author.bot && 
              !m.system && 
              m.content.trim().length > 0
          );

          if (userMessages.length > 0) {
            // Pick one of the top 3 most recent messages
            selectedMessage = userMessages[Math.floor(Math.random() * Math.min(3, userMessages.length))];
            selectedChannel = textChannel;
            break;
          }
        } catch (e: any) {
          logger.warn(`Failed to fetch messages for allowed channel ${channelId}`, { error: e?.message || String(e) });
        }
      }

      if (!selectedMessage || !selectedChannel) {
        logger.info(`No suitable message found in allowed channels within server [${targetServerId}] for scheduled auto-reply.`);
        return;
      }

      logger.info(`Selected message ${selectedMessage.id} in allowed channel ${selectedChannel.id} (Server: ${selectedChannel.guildId || selectedChannel.guild?.id}) for auto-reply.`);
      
      if ('sendTyping' in selectedMessage.channel) {
          await selectedMessage.channel.sendTyping().catch(() => {});
      }

      const cleanContent = selectedMessage.content.replace(new RegExp(`<@!?${this.client.user.id}>`, 'g'), '').trim();
      
      // Inject some context to brain that this is an auto-reply so Bohurupi acts naturally
      const contextPrefix = "[SYSTEM: You are initiating a random interaction. Act naturally, pick up on the context of their message or just roast them out of nowhere. Do not say you are initiating.]\n";
      const response = await this.brain.processInteraction(selectedMessage.author.id, contextPrefix + cleanContent);

      if (response && response.trim().length > 0 && !response.includes('*(Bohurupi')) {
          const sanitizedResponse = response.length > 1950 ? response.substring(0, 1950) + '...' : response;
          await selectedMessage.reply(sanitizedResponse);
          logger.info(`Successfully sent scheduled auto-reply to message ${selectedMessage.id} in allowed channel ${selectedChannel?.id}`);
      }
    } catch (error: any) {
      logger.error('Scheduled auto-reply failed', { error: error?.message || String(error) });
    }
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

    const targetUser = message.mentions.users.first() ? "<@" + message.mentions.users.first()?.id + ">" : (args[0] || "<@" + message.author.id + ">");
    const targetUserName = message.mentions.users.first()?.username || (args[0] ? args[0].replace(/[@<>]/g, '') : message.author.username);

    // Help menu command
    if (command === 'help' || command === 'commands') {
      const helpFrame = `\`\`\`text
┌
│ 🎭 BOHURUPI BOT - COMMANDS LIST
│ ─────────────────────────────────────────────────────────
│ ⚔️ Interactive Action Commands:
│ ├─ !court @user            : Bohurupi court session & verdict
│ ├─ !fight @user            : 1v1 Street fight knockout
│ ├─ !biryani_roulette @user : Poisonous / chaotic bowl rating
│ ├─ !bully / !roast @user   : Savage roast & banter
│ ├─ !expose @user           : Leaked fake search history / secret
│ ├─ !hype @user             : Supreme deity-level hype
│ ├─ !agree @user            : Aggressively agree with target
│ ├─ !lore @user             : Absurd fake origin lore
│ ├─ !predict @user          : 10-year absurd future prediction
│ ├─ !iq @user               : Fake IQ scanner & rating
│ ├─ !flirt @user            : Toxic / cheesy romantic line
│ ├─ !confess @user          : Fake scandalous confession
│ ├─ !truth @user            : Provocative truth question
│ ├─ !dare @user             : Absurd & chaotic dare
│ ├─ !horoscope              : Chaotic daily astrology
│ ├─ !8ball [question]       : Savage 8-ball fortune prediction
│ ├─ !choose [opt1] or [opt2]: Bohurupi's definitive choice
│ ├─ !biryani_war            : Ignite the ultimate food debate
│ ├─ !nasta_check            : Strict guardian snack check
│ └─ !roast_chat             : Roast the whole active chat
│ ───────────────
│ 💡 Bohurupi AI Core • Active in Allowed Channels
└
\`\`\``;
      await message.reply(helpFrame);
      return true;
    }

    if (command === 'court') {
      const aiResponse = await this.brain.processCommand(
         message.author.id, 
         targetUserName, 
         `COMMAND: !court. INSTRUCTION: You just sentenced ${targetUserName} to guilty. State a short, hilarious fake crime and a funny penalty in Banglish. Format your answer EXACTLY like this (2 lines):\nCrime: [crime]\nPenalty: [penalty]. Do not use quotes.`
      );
      
      let crime = "Friday night e jaldi ghumay jawar jonno";
      let penalty = "Creator ke 100 taka flexiload";
      
      const crimeMatch = aiResponse.match(/\bcrime\s*[:\-]\s*(.*)/i);
      const penaltyMatch = aiResponse.match(/\bpenalty\s*[:\-]\s*(.*)/i);
      if (crimeMatch) crime = crimeMatch[1].replace(/\*\*/g, '').trim();
      if (penaltyMatch) penalty = penaltyMatch[1].replace(/\*\*/g, '').trim();

      const frame = `\`\`\`text
┌
│ ⚖️ BOHRUPI COURT IN SESSION
│ ─────────────────────────────────────────────────────────
│ 
│ 👨⚖️ Presiding Judge: Bohrupi
│ 🎯 Accused Member: ${targetUserName}
│ 
│ 📋 Offense:
│ └─ "${crime}"
│ 
│ 🏛️ Courtroom Visual:
│ ┌────────────────────────────────────────┐
│ │  👨⚖️ Bohrupi : "Order in the court!"   │
│ │  🔨 *Gavel Smashes*                    │
│ │  ⛓️ ${targetUserName.padEnd(9)} : "Bhai ami innocent!"    │
│ └────────────────────────────────────────┘
│ 
│ 📊 Server Jury Status:
│ 🟢 Not Guilty [ 1 ]  |  🔴 Guilty [ 42 ]
│ 
│ 🚨 Verdict: GUILTY - NO MERCY
│ 💸 Penalty: ${penalty}
│ ───────────────
│ Executed by Bot • Single Frame Output
└
\`\`\``;
      await message.reply(frame);
      return true;
    }

    if (command === 'fight') {
      const aiResponse = await this.brain.processCommand(
         message.author.id, 
         targetUserName, 
         `COMMAND: !fight. INSTRUCTION: You just knocked out ${targetUserName} in a street fight. Name a hilarious, absurd knockout move (e.g. CHICKEN SLAP, NOKH DIYE KHAMCHI, BELUN ER BARI). Format your answer EXACTLY like this (2 lines):\nMove: [move]\nTrashTalk: [trash talk in banglish]. Do not use quotes.`
      );
      
      let move = "CHICKEN SLAP";
      let trashTalk = `${targetUserName} tui to 1 v 1 e pure bot 💀 ja age practice kore ay!`;
      
      const moveMatch = aiResponse.match(/\bmove\s*[:\-]\s*(.*)/i);
      const trashTalkMatch = aiResponse.match(/\btrashtalk\s*[:\-]\s*(.*)/i);
      if (moveMatch) move = moveMatch[1].replace(/\*\*/g, '').trim();
      if (trashTalkMatch) trashTalk = trashTalkMatch[1].replace(/\*\*/g, '').trim();

      const frame = `\`\`\`text
┌
│ ⚔️ BOHRUPI STREET FIGHT - MATCH RESULT
│ ─────────────────────────────────────────────────────────
│ 
│ 🥊 Fighters:
│ ├─ 🐔 Bohrupi  : [██████████] 100 HP
│ └─ 💀 ${targetUserName.padEnd(8)} : [░░░░░░░░░░] 0 HP (KO)
│ 
│ 📍 Battle Location:
│ └─ Mirpur 10 Circle
│ 
│ 💥 Final Knockout Move:
│ ┌────────────────────────────────────────┐
│ │  🐔 Bohrupi ───💥 [${move}] ───> 💀 ${targetUserName} │
│ └────────────────────────────────────────┘
│ 
│ 🏆 Result: CRITICAL HIT! Bohrupi landed a 100 DMG KO SLAP!
│ 💬 Comment: ${trashTalk}
│ ───────────────
│ Executed by Bot • Single Frame Output
└
\`\`\``;
      await message.reply(frame);
      return true;
    }

    if (command === 'biryani_roulette' || command === 'roulette') {
      const aiResponse = await this.brain.processCommand(
         message.author.id, 
         targetUserName, 
         `COMMAND: !biryani_roulette. INSTRUCTION: ${targetUserName} was playing biryani roulette and got the worst possible item in their biryani instead of meat. Name a hilarious inedible object (e.g. CRICKET IN ALU, TEELA POKA, NOSTHO ELAICHI, PORA ROSHUN). Format your answer EXACTLY like this (3 lines):\nDish: [dish]\nNotes: [kitchen notes in banglish]\nMock: [mocking sentence in banglish]`
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
┌
│ 🎰 BOHRUPI BIRYANI ROULETTE
│ ─────────────────────────────────────────────────────────
│ 
│ 👤 Customer: ${targetUserName}
│ 🍗 Bowl Dish: ${dish}
│ 
│ 📊 Dish Rating: 0/10 (FATAL DANGER)
│ 🤢 Status: POISONOUS BOWL
│ 
│ 📋 Kitchen Notes:
│ └─ "${notes}"
│ 
│ 🚨 Result: WORST BOWL EVER 💀
│ 💬 Message: ${mock}
│ ───────────────
│ Executed by Bot • Single Frame Output
└
\`\`\``;
      await message.reply(frame);
      return true;
    }

    if (command === 'iq') {
      const fakeIQ = Math.floor(Math.random() * 150) - 20; // -20 to 130
      const aiResponse = await this.brain.processCommand(
        message.author.id,
        targetUserName,
        `COMMAND: !iq. TARGET: ${targetUserName}. CALCULATED_IQ: ${fakeIQ}. INSTRUCTION: Give a 1-sentence hilarious roast about ${targetUserName}'s IQ in Banglish. Mention them using ${targetUser}.`
      );
      const frame = `\`\`\`text
┌
│ 🧠 BOHRUPI IQ SCANNER
│ ─────────────────────────────────────────────────────────
│ 🎯 Target: ${targetUserName}
│ 📊 Scanned IQ: ${fakeIQ} IQ
│ 🔍 Diagnosis: ${fakeIQ < 50 ? "Severe Brain Lag 💀" : fakeIQ < 90 ? "Average Rickshaw Puller Brain" : "Surprisingly Functional"}
│ 
│ 💬 Bohrupi Verdict:
│ └─ ${aiResponse.replace(/```/g, '')}
│ ───────────────
│ Executed by Bot • Single Frame Output
└
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
      const response = await this.brain.processCommand(message.author.id, targetUserName, commandPrompt);
      if (response && response.trim().length > 0) {
        const sanitized = response.length > 1950 ? response.substring(0, 1950) + '...' : response;
        await message.reply(sanitized);
      }
    }

    return true;
  }
  private registerEvents() {
    this.client.once(Events.ClientReady, (readyClient) => {
      this.isConnected = true;
      this.brain.getIdentityManager().setClient(readyClient);
      logger.info(`Discord Service Online! Logged in as ${readyClient.user.tag}`);
      
      // Start scheduler once ready
      this.startScheduler();
    });

    this.client.on(Events.MessageCreate, async (message: Message) => {
      // Ignore bots
      if (message.author.bot) return;

      // Strict Channel Restriction: Bot only responds/operates in allowed channels (Text, Media, Memes)
      if (!isChannelAllowed(message.channel.id)) return;

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

      // Basic triggering logic: respond if mentioned
      
      const isMentioned = this.client.user && message.mentions.has(this.client.user.id);
      
      // For now, only respond to mentions to prevent spamming
      if (!isMentioned) return;

      logger.info(`Received Discord mention in #${message.channel.id} by ${message.author.id}`);

      // Process via Brain
      try {
        if ('sendTyping' in message.channel) {
          await message.channel.sendTyping().catch((err) => {
            logger.warn('Failed to send typing indicator in Discord channel', { error: err?.message || String(err) });
          });
        }

        let cleanContent = message.content.replace(new RegExp(`<@!?${this.client.user?.id}>`, 'g'), '').trim();
        if (!cleanContent) {
          cleanContent = "oi";
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
              if ('send' in message.channel) { await message.channel.send(sanitizedResponse); }
            } catch (sendError: any) {
              logger.error('Failed to send Discord message via fallback channel.send', {
                error: sendError?.message || String(sendError)
              });
            }
          }
        }
      } catch (error: any) {
        logger.error('Failed to process Discord message', {
          error: error?.message || String(error),
          stack: error?.stack
        });
      }
    });
  }

  async start(token: string | undefined) {
    if (!token) {
      logger.warn('DISCORD_TOKEN is missing. Discord Integration is disabled.');
      return;
    }
    
    try {
      await this.client.login(token);
    } catch (error: any) {
      logger.error('Failed to connect to Discord', { error: error?.message || String(error) });
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      botTag: this.client.user?.tag || 'Not Logged In'
    };
  }
}
