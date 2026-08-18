const fs = require('fs');
let content = fs.readFileSync('src/backend/discord/DiscordService.ts', 'utf8');

const importReplacement = `import { Client, GatewayIntentBits, Events, Message, TextChannel } from 'discord.js';
import cron from 'node-cron';`;

content = content.replace("import { Client, GatewayIntentBits, Events, Message } from 'discord.js';", importReplacement);

const schedulerCode = `
  private startScheduler() {
    const tz = process.env.TIMEZONE || 'Asia/Dhaka';
    const schedule1 = process.env.SCHEDULE_1 || '15:30';
    const schedule2 = process.env.SCHEDULE_2 || '22:30';

    const parseSchedule = (timeStr: string) => {
      const [hour, minute] = timeStr.split(':');
      return \`\${minute} \${hour} * * *\`;
    };

    const cronExpr1 = parseSchedule(schedule1);
    const cronExpr2 = parseSchedule(schedule2);

    logger.info(\`Initializing Discord Auto-Reply Scheduler: \${schedule1} & \${schedule2} (\${tz})\`);

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
             logger.warn(\`Failed to fetch messages for channel \${channel.id}\`, { error: e?.message || String(e) });
          }
        }
        if (selectedMessage) break;
      }

      if (!selectedMessage) {
        logger.info('No suitable message found for scheduled auto-reply.');
        return;
      }

      logger.info(\`Selected message \${selectedMessage.id} in channel \${selectedChannel?.id} for auto-reply.\`);
      
      if ('sendTyping' in selectedMessage.channel) {
          await selectedMessage.channel.sendTyping().catch(() => {});
      }

      const cleanContent = selectedMessage.content.replace(new RegExp(\`<@!?\${this.client.user.id}>\`, 'g'), '').trim();
      
      // Inject some context to brain that this is an auto-reply so Murgi acts naturally
      const contextPrefix = "[SYSTEM: You are initiating a random interaction. Act naturally, pick up on the context of their message or just roast them out of nowhere. Do not say you are initiating.]\\n";
      const response = await this.brain.processInteraction(selectedMessage.author.id, contextPrefix + cleanContent);

      if (response && !response.includes('*(Murgi watches silently)*')) {
          const sanitizedResponse = response.length > 1950 ? response.substring(0, 1950) + '...' : response;
          await selectedMessage.reply(sanitizedResponse);
          logger.info(\`Successfully sent scheduled auto-reply to message \${selectedMessage.id}\`);
      }
    } catch (error: any) {
      logger.error('Scheduled auto-reply failed', { error: error?.message || String(error) });
    }
  }
`;

content = content.replace("private registerEvents() {", schedulerCode + "\n  private registerEvents() {");

const startSchedulerCall = `      this.isConnected = true;
      this.brain.getIdentityManager().setClient(readyClient);
      logger.info(\`Discord Service Online! Logged in as \${readyClient.user.tag}\`);
      
      // Start scheduler once ready
      this.startScheduler();`;

content = content.replace(`      this.isConnected = true;
      this.brain.getIdentityManager().setClient(readyClient);
      logger.info(\`Discord Service Online! Logged in as \${readyClient.user.tag}\`);`, startSchedulerCall);

fs.writeFileSync('src/backend/discord/DiscordService.ts', content);
console.log('DiscordService patched with node-cron scheduler');
