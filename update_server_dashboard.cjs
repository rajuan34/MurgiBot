const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const importMetrics = `import { getSystemMetrics, activeTasks } from './src/backend/telemetry/systemMetrics';\n`;

if (!code.includes('getSystemMetrics')) {
  code = code.replace(`import { logger, logHistory }`, importMetrics + `import { logger, logHistory }`);
}

const apiMetrics = `
app.get('/api/system/metrics', (req, res) => {
  res.json(getSystemMetrics());
});

app.get('/api/system/tasks', (req, res) => {
  res.json(activeTasks);
});
`;

if (!code.includes('/api/system/metrics')) {
  code = code.replace(`app.get('/api/state'`, apiMetrics + `\napp.get('/api/state'`);
}

fs.writeFileSync('server.ts', code);
