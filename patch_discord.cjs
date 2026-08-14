const fs = require('fs');
let code = fs.readFileSync('src/backend/discord/DiscordService.ts', 'utf8');

// The block to remove starts at `// Handle /murgi commands` and ends before `// For now, only respond to mentions`
code = code.replace(/\/\/ Handle \/murgi commands[\s\S]*?\/\/ For now, only respond to mentions to prevent spamming/g, '// For now, only respond to mentions to prevent spamming');

fs.writeFileSync('src/backend/discord/DiscordService.ts', code);
