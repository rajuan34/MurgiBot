const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const authMiddleware = `
// Basic Admin Auth Middleware
const adminAuth = (req, res, next) => {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) {
    return next(); // If no password is set, allow access (dev mode)
  }
  
  const providedAuth = req.headers['x-admin-password'] || req.query.admin_password;
  if (providedAuth === expectedPassword) {
    return next();
  }
  
  return res.status(401).json({ error: 'Unauthorized. Invalid or missing Admin Password.' });
};
`;

// Insert after app.use(express.json());
content = content.replace('app.use(express.json());', 'app.use(express.json());\n' + authMiddleware);

// Protect the routes
content = content.replace("app.get('/api/logs', (req, res) => {", "app.get('/api/logs', adminAuth, (req, res) => {");
content = content.replace("app.get('/api/system/metrics', (req, res) => {", "app.get('/api/system/metrics', adminAuth, (req, res) => {");
content = content.replace("app.get('/api/system/tasks', (req, res) => {", "app.get('/api/system/tasks', adminAuth, (req, res) => {");
content = content.replace("app.get('/api/state', async (req, res) => {", "app.get('/api/state', adminAuth, async (req, res) => {");
content = content.replace("app.post('/api/interact', async (req, res) => {", "app.post('/api/interact', adminAuth, async (req, res) => {");

fs.writeFileSync('server.ts', content);
console.log('Added optional adminAuth middleware to server.ts');
