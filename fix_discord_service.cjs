const fs = require('fs');

const updatedDiscordService = `import { Client, GatewayIntentBits, Events, Message } from 'discord.js';
import { logger } from '../telemetry/logger';
import { MurgiBrain } from '../core/MurgiBrain';

export class DiscordService {
  private client: Client;
  private isConnected: boolean = false;

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

  private registerEvents() {
    this.client.once(Events.ClientReady, (readyClient) => {
      this.isConnected = true;
      logger.info(\`Discord Service Online! Logged in as \${readyClient.user.tag}\`);
    });

    this.client.on(Events.MessageCreate, async (message: Message) => {
      // Ignore bots
      if (message.author.bot) return;

      // Basic triggering logic: respond if mentioned
      const isMentioned = this.client.user && message.mentions.has(this.client.user.id);
      
      // For now, only respond to mentions to prevent spamming
      if (!isMentioned) return;

      logger.info(\`Received Discord mention in #\${message.channel.id} by \${message.author.id}\`);

      // Process via Brain
      try {
        if ('sendTyping' in message.channel) {
          await message.channel.sendTyping().catch((err) => {
            logger.warn('Failed to send typing indicator in Discord channel', { error: err?.message || String(err) });
          });
        }

        const cleanContent = message.content.replace(new RegExp(\`<@!?\${this.client.user?.id}>\`, 'g'), '').trim();
        
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
              await message.channel.send(sanitizedResponse);
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
`;

fs.writeFileSync('src/backend/discord/DiscordService.ts', updatedDiscordService);
console.log("Successfully updated DiscordService.ts");
