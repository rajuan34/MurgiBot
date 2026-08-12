const fs = require('fs');
let code = fs.readFileSync('src/backend/telemetry/logger.ts', 'utf8');

if (!code.includes("import { Writable } from 'stream';")) {
  code = code.replace("import winston from 'winston';", "import winston from 'winston';\nimport { Writable } from 'stream';");
}

code = code.replace("require('stream').Writable", "Writable");

fs.writeFileSync('src/backend/telemetry/logger.ts', code);
