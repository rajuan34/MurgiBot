const fs = require('fs');

const path = 'src/backend/discord/DiscordService.ts';
let code = fs.readFileSync(path, 'utf8');

// Patch 1: Rejection block
const rejectionRegex = /if \(ownerIds\.length === 0 \|\| !ownerIds\.includes\(message\.author\.id\)\) {[\s\S]*?return true;\s*}/;
const replacementRejection = `if (ownerIds.length === 0 || !ownerIds.includes(message.author.id)) {
      const aiResponse = await this.brain.processCommand(
         message.author.id, 
         message.author.username, 
         \`COMMAND_REJECTED: The user <@\${message.author.id}> tried to use a command, but they are NOT the owner. Reject their access hilariously and savagely in Banglish. Tell them they need the boss's permission. Do not use quotes.\`
      );
      await message.reply(aiResponse);
      return true;
    }`;

code = code.replace(rejectionRegex, replacementRejection);

// Patch 2: court command
const courtText = "│  💸 PENALTY   : Creator ke 100 taka flexiload          │\\n│                                                        │\\n\\x1b[1;32m│  JURY VOTES   : [████████████████████] 100% GUILTY     │\\x1b[0m\\n│                                                        │\\n\\x1b[1;31m└────────────────────────────────────────────────────────┘\\x1b[0m\\n\`\`\`\\noi \${targetUser}, ekhoni flexiload mar, naile main chat e unmute korbo na 💀\`;";

const replacementCourt = `│  💸 PENALTY   : Creator ke 100 taka flexiload          │\\n│                                                        │\\n\\x1b[1;32m│  JURY VOTES   : [████████████████████] 100% GUILTY     │\\x1b[0m\\n│                                                        │\\n\\x1b[1;31m└────────────────────────────────────────────────────────┘\\x1b[0m\\n\`\`\`\\n\${await this.brain.processCommand(message.author.id, targetUserName, \`COMMAND: !court. INSTRUCTION: You just sentenced \${targetUserName} to guilty. Roast them in Banglish about their crime. Mention them using \${targetUser}. Do not use quotes.\`)}\`;`;

code = code.replace(courtText, replacementCourt);

// Patch 3: fight command
const fightText = "────────────────────────────────────────────────────\\n\`\`\`\\n\${targetUser} tui to 1 v 1 e amar shamne pure bot 💀 ja practice kore ay!\`;";
const replacementFight = "────────────────────────────────────────────────────\\n\`\`\`\\n\${await this.brain.processCommand(message.author.id, targetUserName, \`COMMAND: !fight. INSTRUCTION: You just knocked out \${targetUserName} in a street fight. Trash talk them brutally in Banglish. Mention them using \${targetUser}. Do not use quotes.\`)}\`;";

code = code.replace(fightText, replacementFight);

// Patch 4: biryani_roulette command
const biryaniText = "RESULT: WORST BOWL EVER 💀\\x1b[0m\\n\`\`\`\\nbhai \${targetUser}, tor kacchi-r bhetor teela poka pawa gese, ajke ar bhat khas na tui.\`;";
const replacementBiryani = "RESULT: WORST BOWL EVER 💀\\x1b[0m\\n\`\`\`\\n\${await this.brain.processCommand(message.author.id, targetUserName, \`COMMAND: !biryani_roulette. INSTRUCTION: \${targetUserName} was playing biryani roulette and got the worst possible item in their biryani instead of meat. Mock them in Banglish. Mention them using \${targetUser}. Do not use quotes.\`)}\`;";

code = code.replace(biryaniText, replacementBiryani);

fs.writeFileSync(path, code);
console.log('Patched all commands in DiscordService.ts');
