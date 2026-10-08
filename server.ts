import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distServer = path.resolve(__dirname, 'dist', 'server.cjs');

// Detect if running with tsx runtime (which can resolve TypeScript imports and mounts Vite middleware)
const isTsxRuntime = Boolean(
  process.env.npm_lifecycle_event === 'dev' ||
  (process.execArgv && process.execArgv.some(arg => arg.includes('/tsx/') || arg.includes('preflight.cjs') || arg.includes('loader.mjs')))
);

// If running in development with tsx and not forcing production bundle:
if (isTsxRuntime && !process.env.SERVE_PROD && process.env.NODE_ENV !== 'production' && !process.env.RENDER) {
  await import('./src/backend/serverApp.ts');
} else if (fs.existsSync(distServer)) {
  // In production (Render, Docker, npm run start, node server.ts):
  // Run the standalone compiled CommonJS backend
  const req = createRequire(import.meta.url);
  req(distServer);
} else {
  await import('./src/backend/serverApp.ts');
}
