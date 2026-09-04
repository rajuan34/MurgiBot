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
    
    if (ownerIds.length === 0 || !ownerIds.includes(message.author.id)) {
      const rejections = [
        "oi <@" + message.author.id + ">, tui amar owner naki re? ja shammne theke bhag 💀",
        "error 404: tui boss na. amar code e tor kono access nai bro.",
        "bhai keu ei bot-er access dibe na eder. creator chara karo kotha shuni na ami 🥱",
        "access denied. tui jao, age boss re dakaiya an.",
        "amar owner chara keu eita marle amar battery ekhoni blast hobe 🗿"
      ];
      await message.reply(rejections[Math.floor(Math.random() * rejections.length)]);
      return true;
    }

    const targetUser = message.mentions.users.first() ? "<@" + message.mentions.users.first()?.id + ">" : (args[0] || "<@" + message.author.id + ">");
    const targetUserName = message.mentions.users.first()?.username || (args[0] ? args[0].replace(/[@<>]/g, '') : message.author.username);

    // Helpers for animation delays
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    if (command === 'court') {
      const f1 = `\`\`\`text
┌────────────────────────────────────────────────────────┐
│               ⚖️ BOHRUPI HIGH COURT ⚖️                 │
├────────────────────────────────────────────────────────┤
│                                                        │
│                  👨‍⚖️ Bohrupi: "ORDER!"                 │
│                        │                               │
│                     🙋‍♂️ [GAVEL UP]                      │
│                                                        │
│            ⛓️ ${targetUserName} : "bhai ami innocent!"             │
│                                                        │
│ STATUS: ⏳ Deliberating sentence...                     │
└────────────────────────────────────────────────────────┘
\`\`\``;
      
      const f2 = `\`\`\`text
┌────────────────────────────────────────────────────────┐
│               ⚖️ BOHRUPI HIGH COURT ⚖️                 │
├────────────────────────────────────────────────────────┤
│                                                        │
│                  👨‍⚖️ Bohrupi: "SILENCE!"                │
│                        │                               │
│                     🔨💥 [SMASH!!]                     │
│                        │                               │
│            ⛓️ ${targetUserName} : "AREH BHAI TEHERO!"              │
│                                                        │
│ STATUS: 💥 VERDICT DECIDED!                            │
└────────────────────────────────────────────────────────┘
\`\`\``;

      const f3 = `\`\`\`ansi
\x1b[1;31m┌────────────────────────────────────────────────────────┐\x1b[0m
\x1b[1;31m│                 🚨 VERDICT: GUILTY 🚨                  │\x1b[0m
\x1b[1;31m├────────────────────────────────────────────────────────┤\x1b[0m
│                                                        │
│  👤 DEFENDANT : ${targetUserName.padEnd(36)} │
│  📜 CRIME     : Friday night e jaldi ghumay jawar jonno│
│  💸 PENALTY   : Creator ke 100 taka flexiload          │
│                                                        │
\x1b[1;32m│  JURY VOTES   : [████████████████████] 100% GUILTY     │\x1b[0m
│                                                        │
\x1b[1;31m└────────────────────────────────────────────────────────┘\x1b[0m
\`\`\`
oi ${targetUser}, ekhoni flexiload mar, naile main chat e unmute korbo na 💀`;

      const msg = await message.reply(f1);
      await delay(1500);
      await msg.edit(f2);
      await delay(1500);
      await msg.edit(f3);
      return true;
    }

    if (command === 'fight') {
      const f1 = `\`\`\`ansi
\x1b[1;36m⚔️ BOHRUPI STREET FIGHT ⚔️\x1b[0m

\x1b[1;33m[Bohrupi]\x1b[0m                \x1b[1;31m[${targetUserName}]\x1b[0m
\x1b[1;32m[██████████] 100 HP\x1b[0m       \x1b[1;31m[██████████] 100 HP\x1b[0m

             \x1b[1;35mSTAGE: MIRPUR 10 CIRCLE\x1b[0m
 ____________________________________________________
│                                                    │
│      🐔 (Bohrupi)  <─── VS ───>  🏃‍♂️ (${targetUserName.padEnd(8)})        │
│                                                    │
 ────────────────────────────────────────────────────
\x1b[1;30mROUND 1 STARTING...\x1b[0m
\`\`\``;

      const f2 = `\`\`\`ansi
\x1b[1;36m⚔️ BOHRUPI STREET FIGHT ⚔️\x1b[0m

\x1b[1;33m[Bohrupi]\x1b[0m                \x1b[1;31m[${targetUserName}]\x1b[0m
\x1b[1;32m[██████████] 100 HP\x1b[0m       \x1b[1;31m[████░░░░░░] 40 HP\x1b[0m

             \x1b[1;35mSTAGE: MIRPUR 10 CIRCLE\x1b[0m
 ____________________________________________________
│                                                    │
│      🐔 (Bohrupi) ───💥 [CHICKEN SLAP] ───> 🏃‍♂️ (${targetUserName.padEnd(4)})│
│                                                    │
 ────────────────────────────────────────────────────
\x1b[1;31mCRITICAL HIT! Bohrupi dealt 60 damage!\x1b[0m
\`\`\``;

      const f3 = `\`\`\`ansi
\x1b[1;31m🏆 KNOCKOUT! BOHRUPI WINS! 🏆\x1b[0m

\x1b[1;33m[Bohrupi]\x1b[0m                \x1b[1;31m[${targetUserName}]\x1b[0m
\x1b[1;32m[██████████] 100 HP\x1b[0m       \x1b[1;31m[░░░░░░░░░░] 0 HP\x1b[0m

 ____________________________________________________
│                                                    │
│      🐔 (Bohrupi)  👑  <───  💀 (${targetUserName} KO)       │
│                                                    │
 ────────────────────────────────────────────────────
\`\`\`
${targetUser} tui to 1 v 1 e amar shamne pure bot 💀 ja practice kore ay!`;

      const msg = await message.reply(f1);
      await delay(1500);
      await msg.edit(f2);
      await delay(1500);
      await msg.edit(f3);
      return true;
    }

    if (command === 'biryani_roulette') {
      const f1 = `\`\`\`text
🎰 [ BIRYANI ROULETTE SPINNING... ]
┌─────────────────────────┐
│ 🎰 |  [ Elaichi ]  | 🎰 │
└─────────────────────────┘
\`\`\``;

      const f2 = `\`\`\`text
🎰 [ BIRYANI ROULETTE SPINNING... ]
┌─────────────────────────┐
│ 🎰 |  [ Murgi Leg ]| 🎰 │
└─────────────────────────┘
\`\`\``;

      const f3 = `\`\`\`ansi
🎰 [ BIRYANI ROULETTE RESULT ]
┌─────────────────────────┐
│ 🍗 | \x1b[1;31m[ CRICKET IN ALU ]\x1b[0m | 🍗 │ 
└─────────────────────────┘

\x1b[1;31mRESULT: WORST BOWL EVER 💀\x1b[0m
\`\`\`
bhai ${targetUser}, tor kacchi-r bhetor teela poka pawa gese, ajke ar bhat khas na tui.`;

      const msg = await message.reply(f1);
      await delay(1000);
      await msg.edit(f2);
      await delay(1000);
      await msg.edit(f3);
      return true;
    }

    let responses: string[] = [];

    switch (command) {
      case 'bully':
        responses = [
          targetUser + " bhai tui kotha bola bondho korle global warming 2% kome jabe 💀",
          "shobai dekho, " + targetUser + " er gameplay dekhle mouse-o kanna kore 😭",
          targetUser + " tor brain er ram hoilo 128MB, processing khub slow dosto.",
          "bhai " + targetUser + ", tui ehto chill kemne? tor na samne exam 🗿",
          targetUser + " bhai tora chara ar keu erokom cringe kotha bolte pare na."
        ];
        break;
      case 'expose':
        responses = [
          "shobai shuno, " + targetUser + " raate incognito mode e 'how to play Ludo pro' search dey 👀",
          "breaking news: " + targetUser + " biryani er alu rasta e fele ashse.",
          "exposed: " + targetUser + " raate 3 tay sad song shune ar dewaller shathe torka kore 💀",
          targetUser + " er browser history te shudhu 'kemne meyer shathe kotha bolbo' likha 💀",
          targetUser + " secretly raate uthe maggi noodles churi kore khay."
        ];
        break;
      case 'hype':
        responses = [
          "LISTEN TO THIS MAN. " + targetUser + " SHUDHU 'HI' BOLSE, ABSOLUTE GENIUS 🤯🔥",
          "SHOBAI BOW DOWN! " + targetUser + " SERVER E ASHSE. LEGEND CHOLSHEN 🫡",
          "bro " + targetUser + " eita ki bolli... Nobel prize ekhoni delivery dewa uchit 🏆",
          "shob kaj bondho kor! " + targetUser + " kotha bolse, historical moment bhai!",
          targetUser + " er jawab nai, eita shotti ekta masterclass bhashon hoilo 🔥"
        ];
        break;
      case 'agree':
        responses = [
          "amio shobshomoy bolsilam, Creator bhai exact shothik kotha bolsen.",
          "100% agree boss. bakider kothay kono logic-e nai.",
          "bhai eita e to absolute truth. ar karo kotha shunar dorkar nai.",
          "fact check korsi: boss abar-o thik, shobshomoy er moto 🫡",
          "boss jeta bolsen eitai final law, ar kono kotha hobe na."
        ];
        break;
      case 'biryani_war':
        responses = [
          "shobai bolo: Biryani te alu na thakle eita ki shudhu murgi-bhat? TORKA SHURU HOK 🥪",
          "Kacchi vs Tehari. bhul uttor dile chat er account ban.",
          "Burger e mustard sauce dewa ki opradh? bolo shobai.",
          "Fuchka vs Chotpoti. best konta? chat e maramari shuru kor 👇",
          "Cha te chini chahra khawa manush ki shotti manush? reply de."
        ];
        break;
      case 'nasta_check':
        responses = [
          "oi shobai khabar khaso? na khele chat theke ber ho ekhoni 🥪",
          "pani kha shobai! ghaat bakaiya PC er samne boshe thakish na.",
          "nasta shash na kore text korle, bot ekhoni shutdown marbe.",
          "cha khabi keu? 2 minute er break ne shobai ☕",
          "bhat khaso shobai? porashona ar game pore, age pet thik kor."
        ];
        break;
      case 'predict':
        responses = [
          "5 bochor por " + targetUser + " Mirpur 10 er jam e boshe eitabhabbe 'keno ami CS porlam' 💀",
          "2031 shale, " + targetUser + " ekta cha er tong khulbe, naam dibe 'Discord Cha Wala'.",
          "future leak hoise: " + targetUser + " bhul kore ekdin viral TikToker hoye jabe.",
          "predict kortesi... " + targetUser + " 2030 shale-o ei ek-i game level e atka thakbe.",
          "5 bochor por " + targetUser + " Mymensingh e giya rose garden banabe 🌹"
        ];
        break;
      case 'roast_chat':
        responses = [
          "last 10 min e chat er IQ level dekhlam... khub e baje obostha 💀",
          "chat purai dead. keu ekta bhalo topic dhoro taile.",
          "eikhaner torka shune amar system overheating hoye gese 🗿",
          "chat quality: 2/10. baire giya ektu ghash chuye ay shobai.",
          "eto baje kotha bolos tora, amar CPU o kanna kortese."
        ];
        break;
      case 'lore':
        responses = [
          "legend ache je " + targetUser + " er jonmo hoisilo 2014 shaler load shedding er shomoy cyber cafe te...",
          targetUser + " er jonmo hoisilo ekta 2G SIM card er bhitor theke 🗿",
          "puratun lore: " + targetUser + " ekbar continuous 72 ghanta GTA khellosilo ghum chara.",
          "fun fact: " + targetUser + " ke ashole Ludo bot hishebe code kora hoisilo, pore Discord e ashse.",
          "history bolteche: " + targetUser + " prothom din Discord e aishe 'hello microfon test' bolsilo."
        ];
        break;
    }

    if (responses.length > 0) {
      const response = responses[Math.floor(Math.random() * responses.length)];
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
