const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  \`app.get('/api/logs', adminAuth, (req, res) => {
  res.json(logHistory);
});\`,
  \`app.get('/api/logs', adminAuth, (req, res) => {
  res.json(logHistory);
});

app.get('/api/calls', adminAuth, (req, res) => {
  res.json(providerManager.getAPICallHistory());
});\`
);

code = code.replace(
  \`if (req.method === 'GET' && (req.path === '/api/logs' || req.path === '/api/system/metrics' || req.path === '/api/state')) {\`,
  \`if (req.method === 'GET' && (req.path === '/api/logs' || req.path === '/api/calls' || req.path === '/api/system/metrics' || req.path === '/api/state')) {\`
);

fs.writeFileSync('server.ts', code);
console.log('Patched server.ts');
