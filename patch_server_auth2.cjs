const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldAuth = `  // Explicitly check for valid auth string length to prevent "null" or empty string from triggering logs
  const hasProvidedAuth = typeof providedAuth === 'string' && providedAuth.length > 0 && providedAuth !== 'null' && providedAuth !== 'undefined';
  
  if (hasProvidedAuth || req.method === 'POST') {
     logger.warn(\`[Dashboard Access] Unauthorized/Failed Attempt! | IP: \${clientIp} | Path: \${req.path}\`);
  }
  return res.status(401).json({ error: 'Unauthorized. Invalid or missing Admin Password.' });
};`;

const newAuth = `  // Explicitly check for valid auth string length to prevent "null" or empty string from triggering logs
  const hasProvidedAuth = typeof providedAuth === 'string' && providedAuth.length > 0 && providedAuth !== 'null' && providedAuth !== 'undefined';
  
  if (hasProvidedAuth || req.method === 'POST') {
     // Check if it is just a periodic polling endpoint, lower the log level for it so it doesn't spam warnings
     if (req.method === 'GET' && (req.path === '/api/logs' || req.path === '/api/system/metrics' || req.path === '/api/state')) {
         // Silently reject to prevent UI spam log issues
     } else {
         logger.warn(\`[Dashboard Access] Unauthorized/Failed Attempt! | IP: \${clientIp} | Path: \${req.path}\`);
     }
  }
  return res.status(401).json({ error: 'Unauthorized. Invalid or missing Admin Password.' });
};`;

content = content.replace(oldAuth, newAuth);
fs.writeFileSync('server.ts', content);
console.log('server.ts auth logging patched deeply.');
