const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const importLogHistory = `import { logger, logHistory } from './src/backend/telemetry/logger';\n`;

if (!code.includes('logHistory')) {
  code = code.replace(`import { logger } from './src/backend/telemetry/logger';`, importLogHistory);
  
  if (!code.includes('logHistory')) {
    // maybe it wasn't importing logger
    code = importLogHistory + code;
  }
}

const apiLogs = `
app.get('/api/logs', (req, res) => {
  res.json(logHistory);
});
`;

code = code.replace(`app.get('/api/state'`, apiLogs + `\napp.get('/api/state'`);

fs.writeFileSync('server.ts', code);
