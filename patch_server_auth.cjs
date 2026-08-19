const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldAuth = `  // Only log if they actually provided a wrong password, or if it's a non-polling route. 
  // This prevents log spam when the frontend just hasn't entered a password yet.
  if (providedAuth || req.method === 'POST') {
     logger.warn(\`[Dashboard Access] Unauthorized/Failed Attempt! | IP: \${clientIp} | Path: \${req.path}\`);
  }
  return res.status(401).json({ error: 'Unauthorized. Invalid or missing Admin Password.' });
};`;

const newAuth = `  // Explicitly check for valid auth string length to prevent "null" or empty string from triggering logs
  const hasProvidedAuth = typeof providedAuth === 'string' && providedAuth.length > 0 && providedAuth !== 'null' && providedAuth !== 'undefined';
  
  if (hasProvidedAuth || req.method === 'POST') {
     logger.warn(\`[Dashboard Access] Unauthorized/Failed Attempt! | IP: \${clientIp} | Path: \${req.path}\`);
  }
  return res.status(401).json({ error: 'Unauthorized. Invalid or missing Admin Password.' });
};`;

content = content.replace(oldAuth, newAuth);
fs.writeFileSync('server.ts', content);
console.log('server.ts auth logging patched.');
