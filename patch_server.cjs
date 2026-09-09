const fs = require('fs');
const path = './server.ts';
let code = fs.readFileSync(path, 'utf-8');

const importRegex = /import .* from '.*';\n/g;
let lastImportMatch;
while ((match = importRegex.exec(code)) !== null) {
  lastImportMatch = match;
}

// Ensure express.json() is used before any API routes
if (!code.includes('app.get(\'/api/providers/config\'')) {
  
  const apiRoutes = `
app.get('/api/providers/config', adminAuth, async (req, res) => {
  try {
    const config = await memoryEngine.getSystemConfig('provider_config');
    res.json(config || providerManager.getConfig());
  } catch(e) {
    res.status(500).json({ error: String(e) });
  }
});

app.post('/api/providers/config', adminAuth, async (req, res) => {
  try {
    const newConfig = req.body.config;
    await memoryEngine.setSystemConfig('provider_config', newConfig);
    providerManager.setConfig(newConfig);
    res.json({ success: true, config: providerManager.getConfig() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
`;

  code = code.replace('// Admin Dashboard API Routes', '// Admin Dashboard API Routes' + apiRoutes);
  
  // Load config on startup
  const startupLogic = `
  try {
    const savedConfig = await memoryEngine.getSystemConfig('provider_config');
    if (savedConfig) {
      providerManager.setConfig(savedConfig);
    }
  } catch(e) {
    console.error("Failed to load provider config on startup", e);
  }
`;

  code = code.replace('async function startServer() {', 'async function startServer() {\n' + startupLogic);
}

fs.writeFileSync(path, code);
console.log('Patched server.ts');
