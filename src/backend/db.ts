import pg from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';

let pool: pg.Pool | null = null;

export function getDbPool(): pg.Pool | null {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) return null;
  try {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 12,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    });
    pool.on('error', (err) => {
      console.error('[DB Pool Error]', err?.message || err);
    });
    return pool;
  } catch (e) {
    console.error('[DB Pool Initialization Error]', e);
    return null;
  }
}

/**
 * Ensures all persistent storage tables exist across deployments.
 * Prevents loss of logs, telemetry, API records, and configurations.
 */
export async function initDatabaseTables(): Promise<boolean> {
  const dbPool = getDbPool();
  if (!dbPool) return false;

  let client: pg.PoolClient | null = null;
  try {
    client = await dbPool.connect();

    // 1. Persistent OpsCenter Telemetry & System Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS bohurupi_telemetry_logs (
        id SERIAL PRIMARY KEY,
        log_id VARCHAR(64) UNIQUE,
        timestamp TIMESTAMPTZ NOT NULL,
        level VARCHAR(32) NOT NULL,
        message TEXT NOT NULL,
        meta JSONB,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_telemetry_logs_ts ON bohurupi_telemetry_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_telemetry_logs_level ON bohurupi_telemetry_logs(level);
    `);

    // 2. Persistent Provider API Call History
    await client.query(`
      CREATE TABLE IF NOT EXISTS bohurupi_api_call_logs (
        id SERIAL PRIMARY KEY,
        call_id VARCHAR(64) UNIQUE,
        timestamp TIMESTAMPTZ NOT NULL,
        provider VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        latency_ms INTEGER NOT NULL,
        error_detail TEXT,
        metadata JSONB,
        created_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_api_calls_ts ON bohurupi_api_call_logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_api_calls_provider ON bohurupi_api_call_logs(provider);
    `);

    // 3. System Config
    await client.query(`
      CREATE TABLE IF NOT EXISTS bohurupi_system_config (
        key VARCHAR(255) PRIMARY KEY,
        data JSONB NOT NULL
      );
    `);

    // 4. Temporary Memory & Conversation Context
    await client.query(`
      CREATE TABLE IF NOT EXISTS bohurupi_temp_memory (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        data JSONB NOT NULL,
        created_at BIGINT NOT NULL,
        expires_at BIGINT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_bohurupi_temp_mem_lookup ON bohurupi_temp_memory(user_id, type);
      CREATE INDEX IF NOT EXISTS idx_bohurupi_temp_mem_expires ON bohurupi_temp_memory(expires_at);
    `);

    return true;
  } catch (error) {
    console.error('[DB Schema Init Error]', error);
    return false;
  } finally {
    if (client) client.release();
  }
}
