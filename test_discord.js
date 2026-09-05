const fs = require('fs');
console.log(fs.readFileSync('src/backend/discord/DiscordService.ts', 'utf8').substring(0, 1000));
