import { Client, GatewayIntentBits, Events, Message, TextChannel } from 'discord.js';
import cron from 'node-cron';
import { logger } from '../telemetry/logger';
import { BohurupiBrain } from '../core/BohurupiBrain';

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
    logger.info('Running scheduled Discord auto-reply task...');
    if (!this.isConnected || !this.client.user) {
      logger.warn('Skipping auto-reply, Discord client not connected.');
      return;
    }

    try {
      let selectedMessage: Message | null = null;
      let selectedChannel = null;

      // Shuffle guilds
      const guilds = Array.from(this.client.guilds.cache.values()).sort(() => Math.random() - 0.5);

      for (const guild of guilds) {
        const channels = Array.from(guild.channels.cache.values()).sort(() => Math.random() - 0.5);
        for (const channel of channels) {
          if (!channel.isTextBased() || channel.isDMBased()) continue;
          
          const perms = guild.members.me?.permissionsIn(channel);
          if (!perms?.has('ViewChannel') || !perms?.has('ReadMessageHistory') || !perms?.has('SendMessages')) {
            continue;
          }

          try {
            const messages = await channel.messages.fetch({ limit: 20 });
            // Look for recent user messages that are not from the bot itself
            const userMessages = Array.from(messages.values()).filter(m => 
                !m.author.bot && 
                !m.system && 
                m.content.trim().length > 0
            );

            if (userMessages.length > 0) {
              // Pick one of the top 3 most recent messages
              selectedMessage = userMessages[Math.floor(Math.random() * Math.min(3, userMessages.length))];
              selectedChannel = channel;
              break;
            }
          } catch (e: any) {
             logger.warn(`Failed to fetch messages for channel ${channel.id}`, { error: e?.message || String(e) });
          }
        }
        if (selectedMessage) break;
      }

      if (!selectedMessage) {
        logger.info('No suitable message found for scheduled auto-reply.');
        return;
      }

      logger.info(`Selected message ${selectedMessage.id} in channel ${selectedChannel?.id} for auto-reply.`);
      
      if ('sendTyping' in selectedMessage.channel) {
          await selectedMessage.channel.sendTyping().catch(() => {});
      }

      const cleanContent = selectedMessage.content.replace(new RegExp(`<@!?${this.client.user.id}>`, 'g'), '').trim();
      
      // Inject some context to brain that this is an auto-reply so Bohurupi acts naturally
      const contextPrefix = "[SYSTEM: You are initiating a random interaction. Act naturally, pick up on the context of their message or just roast them out of nowhere. Do not say you are initiating.]\n";
      const response = await this.brain.processInteraction(selectedMessage.author.id, contextPrefix + cleanContent);

      if (response && !response.includes('*(Bohurupi watches silently)*')) {
          const sanitizedResponse = response.length > 1950 ? response.substring(0, 1950) + '...' : response;
          await selectedMessage.reply(sanitizedResponse);
          logger.info(`Successfully sent scheduled auto-reply to message ${selectedMessage.id}`);
      }
    } catch (error: any) {
      logger.error('Scheduled auto-reply failed', { error: error?.message || String(error) });
    }
  }


  private async handleCommand(command: string, args: string[], message: Message): Promise<boolean> {
    const validCommands = ['bully', 'expose', 'hype', 'agree', 'court', 'biryani_war', 'nasta_check', 'predict', 'roast_chat', 'lore', 'fight', 'biryani_roulette'];
    if (!validCommands.includes(command)) return false;

    const ownerIds = (process.env.DISCORD_OWNER_IDS || '').split(',').map(id => id.trim()).filter(id => id.length > 0);
    if (!ownerIds.includes('986296691437207592')) ownerIds.push('986296691437207592'); // Hardcoded Co-creator ID
    
    if (ownerIds.length === 0 || !ownerIds.includes(message.author.id)) {
      const aiResponse = await this.brain.processCommand(
         message.author.id, 
         message.author.username, 
         `COMMAND_REJECTED: The user <@${message.author.id}> tried to use a command, but they are NOT the owner. Reject their access hilariously and savagely in Banglish. Tell them they need the boss's permission. Do not use quotes.`
      );
      await message.reply(aiResponse);
      return true;
    }

    const targetUser = message.mentions.users.first() ? "<@" + message.mentions.users.first()?.id + ">" : (args[0] || "<@" + message.author.id + ">");
    const targetUserName = message.mentions.users.first()?.username || (args[0] ? args[0].replace(/[@<>]/g, '') : message.author.username);

    // Helpers for animation delays
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    if (command === 'court') {
      const aiResponse = await this.brain.processCommand(
         message.author.id, 
         targetUserName, 
         `COMMAND: !court. INSTRUCTION: You just sentenced ${targetUserName} to guilty. State a short, hilarious fake crime and a funny penalty in Banglish. Format your answer EXACTLY like this (2 lines):\nCrime: [crime]\nPenalty: [penalty]. Do not use quotes.`
      );
      
      let crime = "Friday night e jaldi ghumay jawar jonno";
      let penalty = "Creator ke 100 taka flexiload";
      
      const lines = aiResponse.split('\n');
      for(const line of lines) {
         if (line.toLowerCase().startsWith('crime:')) crime = line.substring(6).trim();
         if (line.toLowerCase().startsWith('penalty:')) penalty = line.substring(8).trim();
      }

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
         `COMMAND: !fight. INSTRUCTION: You just knocked out ${targetUserName} in a street fight. Name a hilarious, absurd knockout move (e.g. CHICKEN SLAP, NOKH DIYE KHAMCHI). Format your answer EXACTLY like this (2 lines):\nMove: [move]\nTrashTalk: [trash talk in banglish]. Do not use quotes.`
      );
      
      let move = "CHICKEN SLAP";
      let trashTalk = `${targetUserName} tui to 1 v 1 e pure bot 💀 ja age practice kore ay!`;
      
      const lines = aiResponse.split('\n');
      for(const line of lines) {
         if (line.toLowerCase().startsWith('move:')) move = line.substring(5).trim();
         if (line.toLowerCase().startsWith('trashtalk:')) trashTalk = line.substring(10).trim();
      }

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

    if (command === 'biryani_roulette') {
      const aiResponse = await this.brain.processCommand(
         message.author.id, 
         targetUserName, 
         `COMMAND: !biryani_roulette. INSTRUCTION: ${targetUserName} was playing biryani roulette and got the worst possible item in their biryani instead of meat. Name a hilarious inedible object (e.g. CRICKET IN ALU, TEELA POKA, NOSTHO ELAICHI). Format your answer EXACTLY like this (3 lines):\nDish: [dish]\nNotes: [kitchen notes in banglish]\nMock: [mocking sentence in banglish]`
      );
      
      let dish = "CRICKET IN ALU";
      let notes = "Teela poka found inside the rice packet.";
      let mock = `bhai ${targetUserName}, ajke ar bhat khas na tui!`;
      
      const lines = aiResponse.split('\n');
      for(const line of lines) {
         if (line.toLowerCase().startsWith('dish:')) dish = line.substring(5).trim();
         if (line.toLowerCase().startsWith('notes:')) notes = line.substring(6).trim();
         if (line.toLowerCase().startsWith('mock:')) mock = line.substring(5).trim();
      }

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

    
    let commandPrompt = '';
    
    switch (command) {
      case 'bully':
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
        commandPrompt = `COMMAND: !biryani_war. INSTRUCTION: Start a highly controversial, chaotic debate about a local Bangladeshi food topic (like Kacchi vs Tehari, Alu in Biryani, etc.) in Banglish. Demand the chat to fight about it.`;
        break;
      case 'nasta_check':
        commandPrompt = `COMMAND: !nasta_check. INSTRUCTION: Aggressively ask everyone in the chat if they have eaten their snacks/food in Banglish. Act like a strict but chaotic desi guardian.`;
        break;
      case 'predict':
        commandPrompt = `COMMAND: !predict. TARGET: ${targetUserName}. INSTRUCTION: Predict a hilariously pathetic or absurd future for ${targetUserName} 5-10 years from now in Banglish. Mention them using ${targetUser}.`;
        break;
      case 'roast_chat':
        commandPrompt = `COMMAND: !roast_chat. INSTRUCTION: Roast the entire chat's current state, IQ level, or lack of activity in Banglish. Be apathetic, toxic, and savage.`;
        break;
      case 'lore':
        commandPrompt = `COMMAND: !lore. TARGET: ${targetUserName}. INSTRUCTION: Tell a completely fake, funny, and absurd historical "lore" or backstory about how ${targetUserName} was born or how they got here in Banglish. Mention them using ${targetUser}.`;
        break;
    }

    if (commandPrompt !== '') {
      const response = await this.brain.processCommand(message.author.id, targetUserName, commandPrompt);
      await message.reply(response);
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

      // Check for commands
      if (message.content.startsWith('!')) {
        const args = message.content.slice(1).trim().split(/ +/);
        const command = args.shift()?.toLowerCase();
        if (command) {
          const handled = await this.handleCommand(command, args, message);
          if (handled) return; // Command processed, do not continue to normal bot chat
        }
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

        const cleanContent = message.content.replace(new RegExp(`<@!?${this.client.user?.id}>`, 'g'), '').trim();
        
        const response = await this.brain.processInteraction(message.author.id, cleanContent);
        
        if (response && !response.includes('*(Bohurupi watches silently)*')) {
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
