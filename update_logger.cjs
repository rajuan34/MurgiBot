const fs = require('fs');
let code = fs.readFileSync('src/backend/telemetry/logger.ts', 'utf8');

const logStorage = `
export const logHistory: { timestamp: string; level: string; message: string; meta: any }[] = [];

const memoryTransport = new winston.transports.Stream({
  stream: new (require('stream').Writable)({
    write(chunk, encoding, callback) {
      try {
        const log = JSON.parse(chunk.toString());
        logHistory.unshift(log);
        if (logHistory.length > 50) logHistory.pop();
      } catch (e) {}
      callback();
    }
  })
});
`;

code = code.replace(
  `export const logger = winston.createLogger({`,
  logStorage + `\nexport const logger = winston.createLogger({`
);

code = code.replace(
  `    new winston.transports.Console({`,
  `    memoryTransport,\n    new winston.transports.Console({`
);

fs.writeFileSync('src/backend/telemetry/logger.ts', code);
