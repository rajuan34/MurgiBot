const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldAuth = `const adminAuth = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  
  if (!expectedPassword) {
    return next(); // If no password is set, allow access (dev mode)
  }
  
  const providedAuth = req.headers['x-admin-password'] || req.query.admin_password;
  if (providedAuth === expectedPassword) {
    // Only log success for non-polling routes to avoid log spam (e.g. POST requests or specific actions)
    if (req.method === 'POST') {
       logger.info(\`[Dashboard Access] Action Triggered | IP: \${clientIp} | Path: \${req.path}\`);
    }
    return next();
  }
  
  logger.warn(\`[Dashboard Access] Unauthorized/Failed Attempt! | IP: \${clientIp} | Path: \${req.path}\`);
  return res.status(401).json({ error: 'Unauthorized. Invalid or missing Admin Password.' });
};`;

const newAuth = `const adminAuth = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  
  if (!expectedPassword) {
    return next();
  }
  
  const providedAuth = req.headers['x-admin-password'] || req.query.admin_password;
  if (providedAuth === expectedPassword) {
    if (req.method === 'POST') {
       logger.info(\`[Dashboard Access] Action Triggered | IP: \${clientIp} | Path: \${req.path}\`);
    }
    return next();
  }
  
  // Only log if they actually provided a wrong password, or if it's a non-polling route. 
  // This prevents log spam when the frontend just hasn't entered a password yet.
  if (providedAuth || req.method === 'POST') {
     logger.warn(\`[Dashboard Access] Unauthorized/Failed Attempt! | IP: \${clientIp} | Path: \${req.path}\`);
  }
  return res.status(401).json({ error: 'Unauthorized. Invalid or missing Admin Password.' });
};`;

content = content.replace(oldAuth, newAuth);
fs.writeFileSync('server.ts', content);
console.log('server.ts patched to silence missing password polling errors.');
