const fs = require('fs');
let code = fs.readFileSync('src/backend/providers/ProviderManager.ts', 'utf8');

const importStatement = `import { logger } from '../telemetry/logger';`;
const newImport = `import { logger } from '../telemetry/logger';

export interface APICallLog {
  timestamp: string;
  provider: string;
  status: 'success' | 'error' | 'rate_limit';
  latencyMs: number;
  errorDetail?: string;
}`;

code = code.replace(importStatement, newImport);

const classStart = `export class ProviderManager {`;
const classStartReplacement = `export class ProviderManager {
  private apiCallHistory: APICallLog[] = [];

  getAPICallHistory() {
    return this.apiCallHistory;
  }

  private addApiLog(log: Omit<APICallLog, 'timestamp'>) {
    this.apiCallHistory.unshift({ ...log, timestamp: new Date().toISOString() });
    if (this.apiCallHistory.length > 100) this.apiCallHistory.pop();
  }
`;

code = code.replace(classStart, classStartReplacement);

const successLog = `logger.info(\`Generation successful via \${provider.name}\`, { 
           latency_ms: latency, 
           token_estimate: Math.ceil(text.length / 4) // Rough estimation
        });`;
const successLogReplacement = `logger.info(\`Generation successful via \${provider.name}\`, { 
           latency_ms: latency, 
           token_estimate: Math.ceil(text.length / 4) // Rough estimation
        });
        this.addApiLog({
          provider: provider.name,
          status: 'success',
          latencyMs: latency
        });`;

code = code.replace(successLog, successLogReplacement);


const errorLog = `if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded')) {
          logger.warn(\`Provider \${provider.name} rate limited (429). Triggering failover.\`);
        } else if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
          logger.warn(\`Provider \${provider.name} is unreachable. Triggering failover.\`);
        } else {
          logger.error(\`Provider \${provider.name} failed\`, { error: errorMessage });
        }`;

const errorLogReplacement = `
        let status: 'error' | 'rate_limit' = 'error';
        if (errorMessage.includes('429') || errorMessage.includes('Quota exceeded')) {
          logger.warn(\`Provider \${provider.name} rate limited (429). Triggering failover.\`);
          status = 'rate_limit';
        } else if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED')) {
          logger.warn(\`Provider \${provider.name} is unreachable. Triggering failover.\`);
        } else {
          logger.error(\`Provider \${provider.name} failed\`, { error: errorMessage });
        }
        
        this.addApiLog({
          provider: provider.name,
          status,
          latencyMs: Date.now() - start, // Time taken before failure
          errorDetail: errorMessage
        });`;

code = code.replace(errorLog, errorLogReplacement);

fs.writeFileSync('src/backend/providers/ProviderManager.ts', code);
console.log('Patched ProviderManager.ts');
