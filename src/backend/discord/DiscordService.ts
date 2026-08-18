import { Client, GatewayIntentBits, Events, Message, TextChannel } from 'discord.js';
import cron from 'node-cron';
import { logger } from '../telemetry/logger';
import { MurgiBrain } from '../core/MurgiBrain';

export class DiscordService {
  private client: Client;
  private isConnected: boolean = false;
  private schedulerStarted: boolean = false;

  constructor(private brain: MurgiBrain) {
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
      
      // Inject some context to brain that this is an auto-reply so Murgi acts naturally
      const contextPrefix = "[SYSTEM: You are initiating a random interaction. Act naturally, pick up on the context of their message or just roast them out of nowhere. Do not say you are initiating.]\n";
      const response = await this.brain.processInteraction(selectedMessage.author.id, contextPrefix + cleanContent);

      if (response && !response.includes('*(Murgi watches silently)*')) {
          const sanitizedResponse = response.length > 1950 ? response.substring(0, 1950) + '...' : response;
          await selectedMessage.reply(sanitizedResponse);
          logger.info(`Successfully sent scheduled auto-reply to message ${selectedMessage.id}`);
      }
    } catch (error: any) {
      logger.error('Scheduled auto-reply failed', { error: error?.message || String(error) });
    }
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
        
        if (response && !response.includes('*(Murgi watches silently)*')) {
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
