const fs = require('fs');
let code = fs.readFileSync('src/backend/providers/ProviderManager.ts', 'utf8');

const oldLog = "logger.warn(`Circuit Breaker OPEN: Skipping provider ${provider.name} due to excessive failures.`);";
const newLog = `
         if (failures === this.MAX_FAILURES) {
           logger.warn(\`Circuit Breaker OPEN: Skipping provider \${provider.name} due to excessive failures. (This usually means the API key is invalid or quota is exceeded)\`);
           this.circuitBreakerFailures.set(provider.name, failures + 1); // Increment so we don't spam the log every loop
         }
`;

if (code.includes(oldLog)) {
    code = code.replace(oldLog, newLog.trim());
    fs.writeFileSync('src/backend/providers/ProviderManager.ts', code);
}
