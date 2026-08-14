const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldState = `app.get('/api/state', (req, res) => {
  res.json({
    identity: identityManager.getCurrentProfile(),
    providers: providerManager.getProviderStatus(),
    emotion: emotionEngine.getCurrentMood(),
    memory: memoryEngine.getStats(),
    discord: discordService.getStatus()
  });
});`;

const newState = `app.get('/api/state', async (req, res) => {
  res.json({
    identity: identityManager.getCurrentProfile(),
    providers: providerManager.getProviderStatus(),
    emotion: emotionEngine.getCurrentMood(),
    memory: await memoryEngine.getStats(),
    discord: discordService.getStatus()
  });
});`;

if (code.includes(oldState)) {
  code = code.replace(oldState, newState);
  fs.writeFileSync('server.ts', code);
  console.log("Updated server.ts /api/state to await memoryEngine.getStats()");
} else {
  console.log("Could not find the exact block for /api/state in server.ts");
}
