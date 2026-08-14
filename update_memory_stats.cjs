const fs = require('fs');
let code = fs.readFileSync('src/backend/memory/MemoryEngine.ts', 'utf8');

// Add dbStartTime
if (!code.includes('dbStartTime')) {
  code = code.replace(
    'private pool: pg.Pool | null = null;',
    'private pool: pg.Pool | null = null;\n  private dbStartTime: number = Date.now();'
  );
}

// Update getStats
const oldStatsRegex = /async getStats\(\) \{[\s\S]*?return \{\s*activeConversations: this\.fallbackShortTerm\.size,\s*knownUsers: this\.fallbackLongTerm\.size,\s*storage: 'in-memory-fallback'\s*\};\s*\}/;

const newStats = `async getStats() {
    let dbActive = 0;
    let dbUsers = 0;
    
    if (this.pool) {
      try {
        const now = Date.now();
        const activeRes = await this.pool.query("SELECT COUNT(DISTINCT user_id) as count FROM murgi_temp_memory WHERE type = 'short_term_message' AND expires_at >= $1", [now]);
        dbActive = parseInt(activeRes.rows[0].count);
        
        const userRes = await this.pool.query("SELECT COUNT(DISTINCT user_id) as count FROM murgi_temp_memory WHERE type = 'long_term_fact' AND expires_at >= $1", [now]);
        dbUsers = parseInt(userRes.rows[0].count);
        
        return {
          activeConversations: dbActive,
          knownUsers: dbUsers,
          storage: 'postgres-cache',
          dbStatus: {
            healthy: true,
            activeConnections: this.pool.totalCount,
            idleConnections: this.pool.idleCount,
            uptimeSeconds: Math.floor((Date.now() - this.dbStartTime) / 1000)
          }
        };
      } catch (error) {
        // Fallthrough
      }
    }
    
    return {
      activeConversations: this.fallbackShortTerm.size,
      knownUsers: this.fallbackLongTerm.size,
      storage: 'in-memory-fallback',
      dbStatus: {
        healthy: false,
        activeConnections: 0,
        idleConnections: 0,
        uptimeSeconds: 0
      }
    };
  }`;

code = code.replace(oldStatsRegex, newStats);
fs.writeFileSync('src/backend/memory/MemoryEngine.ts', code);
console.log('MemoryEngine updated for stats');
