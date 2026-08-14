import { logger } from '../telemetry/logger';
import pg from 'pg';

export interface ShortTermMessage {
  role: 'user' | 'murgi';
  text: string;
  timestamp: number;
}

export interface LongTermFact {
  fact: string;
  confidence: number;
  extractedAt: number;
}

export class MemoryEngine {
  private pool: pg.Pool | null = null;
  private dbStartTime: number = Date.now();
  private readonly MAX_CONTEXT_MESSAGES = 10;
  
  // In-memory fallbacks
  private fallbackShortTerm: Map<string, ShortTermMessage[]> = new Map();
  private fallbackLongTerm: Map<string, LongTermFact[]> = new Map();

  constructor() {
    this.initDatabase();
    
    // Auto-cleanup stale data every hour
    setInterval(() => this.cleanupExpiredData(), 60 * 60 * 1000);
  }

  private async initDatabase() {
    if (!process.env.DATABASE_URL) {
      logger.warn('DATABASE_URL is missing. Using in-memory fallback for temporary context.');
      return;
    }

    try {
      this.pool = new pg.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      const client = await this.pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS murgi_temp_memory (
              id SERIAL PRIMARY KEY,
              user_id VARCHAR(255) NOT NULL,
              type VARCHAR(50) NOT NULL,
              data JSONB NOT NULL,
              created_at BIGINT NOT NULL,
              expires_at BIGINT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS idx_murgi_temp_mem_lookup ON murgi_temp_memory(user_id, type);
          CREATE INDEX IF NOT EXISTS idx_murgi_temp_mem_expires ON murgi_temp_memory(expires_at);
        `);
        logger.info('Temporary Cache Database initialized successfully.');
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Failed to initialize cache database. Falling back to in-memory.', { error });
      this.pool = null; // Disable pool on failure
    }
  }

  private async cleanupExpiredData() {
    if (!this.pool) return;
    try {
      const now = Date.now();
      await this.pool.query('DELETE FROM murgi_temp_memory WHERE expires_at < $1', [now]);
    } catch (error) {
      logger.error('Failed to cleanup expired data', { error });
    }
  }

  async addShortTermMessage(userId: string, role: 'user' | 'murgi', text: string) {
    const timestamp = Date.now();
    const data: ShortTermMessage = { role, text, timestamp };
    
    if (this.pool) {
      try {
        // Short term context expires in 24 hours
        const expiresAt = timestamp + (24 * 60 * 60 * 1000); 
        await this.pool.query(
          'INSERT INTO murgi_temp_memory (user_id, type, data, created_at, expires_at) VALUES ($1, $2, $3, $4, $5)',
          [userId, 'short_term_message', data, timestamp, expiresAt]
        );
        
        // Enforce max messages constraint per user
        // We delete oldest messages if they exceed MAX_CONTEXT_MESSAGES
        await this.pool.query(`
          DELETE FROM murgi_temp_memory
          WHERE id IN (
            SELECT id FROM murgi_temp_memory
            WHERE user_id = $1 AND type = 'short_term_message'
            ORDER BY created_at DESC
            OFFSET $2
          )
        `, [userId, this.MAX_CONTEXT_MESSAGES]);
        return;
      } catch (error) {
        logger.error('DB Error adding short term message. Falling back to memory.', { error });
      }
    }
    
    // Fallback
    if (!this.fallbackShortTerm.has(userId)) {
      this.fallbackShortTerm.set(userId, []);
    }
    const history = this.fallbackShortTerm.get(userId)!;
    history.push(data);
    if (history.length > this.MAX_CONTEXT_MESSAGES) {
      history.shift();
    }
  }

  async getShortTermContext(userId: string): Promise<string> {
    if (this.pool) {
      try {
        const now = Date.now();
        const res = await this.pool.query(
          'SELECT data FROM murgi_temp_memory WHERE user_id = $1 AND type = $2 AND expires_at >= $3 ORDER BY created_at ASC',
          [userId, 'short_term_message', now]
        );
        
        if (res.rowCount === 0) return 'No recent conversation context.';
        
        const history = res.rows.map(row => row.data as ShortTermMessage);
        return history.map(m => `${m.role === 'user' ? 'User' : 'Murgi'}: ${m.text}`).join('\n');
      } catch (error) {
        logger.error('DB Error getting short term context. Falling back to memory.', { error });
      }
    }
    
    // Fallback
    const history = this.fallbackShortTerm.get(userId) || [];
    if (history.length === 0) return 'No recent conversation context.';
    return history.map(m => `${m.role === 'user' ? 'User' : 'Murgi'}: ${m.text}`).join('\n');
  }

  async addLongTermFact(userId: string, fact: string) {
    const timestamp = Date.now();
    const data: LongTermFact = { fact, confidence: 1.0, extractedAt: timestamp };
    
    if (this.pool) {
      try {
        // "Long term" context in cache expires in 7 days (as it is not permanent storage)
        const expiresAt = timestamp + (7 * 24 * 60 * 60 * 1000);
        await this.pool.query(
          'INSERT INTO murgi_temp_memory (user_id, type, data, created_at, expires_at) VALUES ($1, $2, $3, $4, $5)',
          [userId, 'long_term_fact', data, timestamp, expiresAt]
        );
        logger.info(`Stored new temporary cached fact for user ${userId}`, { fact });
        return;
      } catch (error) {
        logger.error('DB Error adding long term fact. Falling back to memory.', { error });
      }
    }
    
    // Fallback
    if (!this.fallbackLongTerm.has(userId)) {
      this.fallbackLongTerm.set(userId, []);
    }
    this.fallbackLongTerm.get(userId)!.push(data);
    logger.info(`[Fallback] Stored new long-term fact for user ${userId}`, { fact });
  }

  async getLongTermContext(userId: string): Promise<string> {
    if (this.pool) {
      try {
        const now = Date.now();
        const res = await this.pool.query(
          'SELECT data FROM murgi_temp_memory WHERE user_id = $1 AND type = $2 AND expires_at >= $3 ORDER BY created_at ASC',
          [userId, 'long_term_fact', now]
        );
        
        if (res.rowCount === 0) return 'No cached facts known about this user.';
        
        const facts = res.rows.map(row => row.data as LongTermFact);
        return facts.map(f => `- ${f.fact}`).join('\n');
      } catch (error) {
        logger.error('DB Error getting long term context. Falling back to memory.', { error });
      }
    }
    
    // Fallback
    const facts = this.fallbackLongTerm.get(userId) || [];
    if (facts.length === 0) return 'No long-term facts known about this user.';
    return facts.map(f => `- ${f.fact}`).join('\n');
  }

  async getStats() {
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
  }
}
