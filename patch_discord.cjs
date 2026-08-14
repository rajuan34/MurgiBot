const fs = require('fs');
let code = fs.readFileSync('src/backend/discord/DiscordService.ts', 'utf8');

// 1. Add passing client to IdentityManager in ClientReady
const readyTarget = "this.isConnected = true;";
const readyReplacement = `this.isConnected = true;
      this.brain.getIdentityManager().setClient(readyClient);`;
code = code.replace(readyTarget, readyReplacement);

// 2. Add /murgi command handler
const messageTarget = `const isMentioned = this.client.user && message.mentions.has(this.client.user.id);`;
const messageReplacement = `
      const isMentioned = this.client.user && message.mentions.has(this.client.user.id);
      
      // Handle /murgi commands
      if (message.content.startsWith('/murgi ')) {
        const args = message.content.split(' ');
        if (args[1] === 'profile') {
          const action = args[2];
          const identity = this.brain.getIdentityManager();
          const emotion = this.brain.emotion;
          
          if (action === 'set' && args[3]) {
            const state = args[3].toLowerCase();
            // Force the emotion engine to match
            const mood = state.charAt(0).toUpperCase() + state.slice(1);
            emotion.setState(mood as any);
            
            // Force the identity manager to update, bypassing rate limits
            identity.updateProfile(state, true)
              .then(success => {
                if ('send' in message.channel) {
                  message.channel.send(success ? \`✅ Murgi profile forced to: \${state}\` : \`❌ Failed to set profile.\`);
                }
              });
          } else if (action === 'lock' && args[3]) {
            const duration = parseInt(args[3], 10);
            if (!isNaN(duration)) {
              identity.lockProfile(duration);
              if ('send' in message.channel) {
                message.channel.send(\`🔒 Profile locked for \${duration} minutes.\`);
              }
            }
          } else if (action === 'unlock') {
            identity.unlockProfile();
            if ('send' in message.channel) {
              message.channel.send(\`🔓 Profile unlocked.\`);
            }
          } else if (action === 'reload') {
            const success = identity.reloadRegistry();
            if ('send' in message.channel) {
              message.channel.send(success ? \`✅ Identity Registry reloaded.\` : \`❌ Failed to reload registry.\`);
            }
          }
        }
        return; // Don't process as a normal chat
      }
`;
code = code.replace(messageTarget, messageReplacement);

fs.writeFileSync('src/backend/discord/DiscordService.ts', code);
console.log("Patched DiscordService.ts");
