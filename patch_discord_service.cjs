const fs = require('fs');
let code = fs.readFileSync('src/backend/discord/DiscordService.ts', 'utf8');

code = code.replace(
  /await message\.channel\.send\(sanitizedResponse\);/g,
  "if (message.channel.isTextBased()) { await message.channel.send(sanitizedResponse); }"
);

fs.writeFileSync('src/backend/discord/DiscordService.ts', code);
console.log("Patched DiscordService.ts");
