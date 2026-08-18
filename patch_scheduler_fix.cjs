const fs = require('fs');
let content = fs.readFileSync('src/backend/discord/DiscordService.ts', 'utf8');

// Add a boolean flag to avoid double scheduling on reconnection
content = content.replace(
  "private isConnected: boolean = false;",
  "private isConnected: boolean = false;\n  private schedulerStarted: boolean = false;"
);

content = content.replace(
  "private startScheduler() {",
  "private startScheduler() {\n    if (this.schedulerStarted) return;\n    this.schedulerStarted = true;"
);

fs.writeFileSync('src/backend/discord/DiscordService.ts', content);
console.log('Scheduler reconnection fix applied.');
