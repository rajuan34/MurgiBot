const fs = require('fs');
const path = './src/backend/providers/ProviderManager.ts';
let code = fs.readFileSync(path, 'utf-8');

const newMethods = `
  private activeConfig: { name: string, enabled: boolean, priority: number }[] | null = null;

  setConfig(config: { name: string, enabled: boolean, priority: number }[]) {
    this.activeConfig = config;
    logger.info('ProviderManager config updated.');
  }

  getConfig() {
    if (this.activeConfig) return this.activeConfig;
    // Default config based on registration order
    return this.providers.map((p, i) => ({
      name: p.name,
      enabled: true,
      priority: i
    }));
  }

  getActiveProviders() {
    if (!this.activeConfig) return this.providers;
    
    // Create a map for quick lookup
    const configMap = new Map(this.activeConfig.map(c => [c.name, c]));
    
    const active = this.providers.filter(p => {
       const cfg = configMap.get(p.name);
       return cfg ? cfg.enabled : true; // Default enabled if not in config
    });

    active.sort((a, b) => {
       const pA = configMap.get(a.name)?.priority ?? 999;
       const pB = configMap.get(b.name)?.priority ?? 999;
       return pA - pB;
    });

    return active;
  }
`;

if (!code.includes('setConfig(config')) {
  code = code.replace('private providers: AIProvider[] = [];',
    newMethods + '\n  private providers: AIProvider[] = [];'
  );
}

// Update generateResponse to use getActiveProviders() instead of this.providers
code = code.replace('for (const provider of this.providers) {', 'for (const provider of this.getActiveProviders()) {');
// Update getProviderStatus
code = code.replace(
  'return this.providers.map(p => ({', 
  `return this.getActiveProviders().map(p => ({`
);

fs.writeFileSync(path, code);
console.log('Patched ProviderManager.ts');
