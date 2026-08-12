const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const replacement = `
  // Start Discord Bot asynchronously
  // To prevent double-responses (because the bot is running on Render in production),
  // we disable the Discord listener in this development environment by default.
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_DEV_DISCORD === 'true') {
    discordService.start(process.env.DISCORD_TOKEN);
  } else {
    logger.info("Discord Bot is PAUSED in development to prevent double-responses. The Render production bot is handling messages.");
    logger.info("Add ENABLE_DEV_DISCORD=true to .env if you want to test Discord locally.");
  }
`;

code = code.replace(
  `  // Start Discord Bot asynchronously\n  discordService.start(process.env.DISCORD_TOKEN);`,
  replacement.trim()
);

fs.writeFileSync('server.ts', code);
