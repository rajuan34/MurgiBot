const fs = require('fs');
const filePath = 'src/backend/discord/DiscordService.ts';
let code = fs.readFileSync(filePath, 'utf8');

code = code.replace(/\\n\s*private registerEvents/, '\n  private registerEvents');
fs.writeFileSync(filePath, code);
