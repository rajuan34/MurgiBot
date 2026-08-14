const fs = require('fs');
const filePath = 'src/backend/discord/DiscordService.ts';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/message\.content\.startsWith\('\/murgi '\)/g, "message.content.startsWith('!murgi ') || message.content.startsWith('murgi ')");

fs.writeFileSync(filePath, code);
console.log("Updated DiscordService to use !murgi or murgi instead of /murgi");
