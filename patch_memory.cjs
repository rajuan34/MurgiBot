const fs = require('fs');
const path = './src/backend/memory/MemoryEngine.ts';
let code = fs.readFileSync(path, 'utf-8');

code = code.replace(
  'CREATE INDEX IF NOT EXISTS idx_bohurupi_temp_mem_expires ON bohurupi_temp_memory(expires_at);\n        `);',
  `CREATE INDEX IF NOT EXISTS idx_bohurupi_temp_mem_expires ON bohurupi_temp_memory(expires_at);
          
          CREATE TABLE IF NOT EXISTS bohurupi_system_config (
              key VARCHAR(255) PRIMARY KEY,
              data JSONB NOT NULL
          );
        \`);`
);

if (!code.includes('getSystemConfig(key: string)')) {
  code = code.replace('private async initDatabase() {',
  `async getSystemConfig(key: string): Promise<any | null> {
    if (this.pool) {
      try {
        const res = await this.pool.query('SELECT data FROM bohurupi_system_config WHERE key = $1', [key]);
        if (res.rows.length > 0) return res.rows[0].data;
      } catch (e) {
        logger.error('DB getSystemConfig error', { error: String(e) });
      }
    } else {
       try {
         const fs = require('fs/promises');
         const path = require('path');
         const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');
         const data = await fs.readFile(CONFIG_PATH, 'utf-8');
         const json = JSON.parse(data);
         return json[key] || null;
       } catch (e) {
         return null;
       }
    }
    return null;
  }

  async setSystemConfig(key: string, data: any): Promise<void> {
    if (this.pool) {
       try {
         await this.pool.query(\`
           INSERT INTO bohurupi_system_config (key, data)
           VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data
         \`, [key, JSON.stringify(data)]);
       } catch(e) {
         logger.error('DB setSystemConfig error', { error: String(e) });
       }
    } else {
       try {
         const fs = require('fs/promises');
         const path = require('path');
         const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');
         await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
         let json: any = {};
         try {
           const oldData = await fs.readFile(CONFIG_PATH, 'utf-8');
           json = JSON.parse(oldData);
         } catch(e) {}
         json[key] = data;
         await fs.writeFile(CONFIG_PATH, JSON.stringify(json, null, 2), 'utf-8');
       } catch(e) {
         logger.error('File setSystemConfig error', { error: String(e) });
       }
    }
  }

  private async initDatabase() {`);
}

fs.writeFileSync(path, code);
console.log('Patched MemoryEngine.ts');
