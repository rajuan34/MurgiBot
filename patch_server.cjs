const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// Enable trust proxy for correct IP logging behind Cloud Run/Nginx
content = content.replace(
  "app.use(express.json());",
  "app.use(express.json());\napp.set('trust proxy', true);"
);

const adminAuthTarget = `const adminAuth = (req, res, next) => {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) {
    return next(); // If no password is set, allow access (dev mode)
  }
  
  const providedAuth = req.headers['x-admin-password'] || req.query.admin_password;
  if (providedAuth === expectedPassword) {
    return next();
  }
  
  return res.status(401).json({ error: 'Unauthorized. Invalid or missing Admin Password.' });
};`;

const adminAuthReplacement = `const adminAuth = (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || req.ip;
  const expectedPassword = process.env.ADMIN_PASSWORD;
  
  if (!expectedPassword) {
    logger.info(\`[Dashboard Access] Allow (No password set) | IP: \${clientIp} | Path: \${req.path}\`);
    return next(); // If no password is set, allow access (dev mode)
  }
  
  const providedAuth = req.headers['x-admin-password'] || req.query.admin_password;
  if (providedAuth === expectedPassword) {
    logger.info(\`[Dashboard Access] Success | IP: \${clientIp} | Path: \${req.path}\`);
    return next();
  }
  
  logger.warn(\`[Dashboard Access] Failed Attempt | IP: \${clientIp} | Path: \${req.path}\`);
  return res.status(401).json({ error: 'Unauthorized. Invalid or missing Admin Password.' });
};`;

content = content.replace(adminAuthTarget, adminAuthReplacement);
fs.writeFileSync('server.ts', content);
console.log('server.ts patched with IP logging.');
