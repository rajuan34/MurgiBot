const fs = require('fs');
let code = fs.readFileSync('src/backend/discord/DiscordService.ts', 'utf8');

code = code.replace(
  "if (message.channel.isTextBased()) { await message.channel.send(sanitizedResponse); }",
  "if ('send' in message.channel) { await message.channel.send(sanitizedResponse); }"
);

fs.writeFileSync('src/backend/discord/DiscordService.ts', code);
console.log("Fixed DiscordService.ts");
