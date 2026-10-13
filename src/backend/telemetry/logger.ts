import winston from 'winston';
import { Writable } from 'stream';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDbPool } from '../db';

// Middleware to scrub Personal Identifiable Information (PII) and secrets before logging
const scrubPII = winston.format((info) => {
  if (typeof info.message === 'string') {
    let msg = info.message;
    // Scrub emails
    msg = msg.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
    // Scrub bearer tokens and API keys
    msg = msg.replace(/Bearer\s+[a-zA-Z0-9_\-.]+/gi, 'Bearer [REDACTED]');
    msg = msg.replace(/(?:key|token|password|secret)=[^&\s]+/gi, '$1=[REDACTED]');
    info.message = msg;
  }
  return info;
});

export interface LogEntry {
  id?: string;
  log_id?: string;
  timestamp: string;
  level: string;
  message: string;
  meta?: any;
  [key: string]: any;
}

export const logHistory: LogEntry[] = [];
const seenLogIds = new Set<string>();

const DATA_DIR = path.join(process.cwd(), 'data');
const BACKUP_LOGS_FILE = path.join(DATA_DIR, 'telemetry_logs.json');

// Asynchronous DB Persistence Queue
const dbInsertQueue: LogEntry[] = [];
let isFlushingDb = false;
let fileSaveTimeout: NodeJS.Timeout | null = null;

async function flushQueueToDb() {
  if (isFlushingDb || dbInsertQueue.length === 0) return;
  const pool = getDbPool();
  if (!pool) return;

  isFlushingDb = true;
  const batch = dbInsertQueue.splice(0, 50);

  try {
    const client = await pool.connect();
    try {
      for (const item of batch) {
        const logId = item.log_id || item.id || `log_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const ts = item.timestamp || new Date().toISOString();
        const metaJson = JSON.stringify(item.meta || {});
        await client.query(`
          INSERT INTO bohurupi_telemetry_logs (log_id, timestamp, level, message, meta, created_at)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (log_id) DO NOTHING
        `, [logId, ts, item.level, item.message, metaJson, Date.now()]);
      }
    } finally {
      client.release();
    }
  } catch (err) {
    // If insert failed, put back at start of queue (limit to prevent unbounded memory growth)
    if (dbInsertQueue.length < 500) {
      dbInsertQueue.unshift(...batch);
    }
  } finally {
    isFlushingDb = false;
    if (dbInsertQueue.length > 0) {
      setTimeout(flushQueueToDb, 100);
    }
  }
}

function queueFileBackup() {
  if (fileSaveTimeout) return;
  fileSaveTimeout = setTimeout(async () => {
    fileSaveTimeout = null;
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      const slice = logHistory.slice(0, 1000);
      await fs.writeFile(BACKUP_LOGS_FILE, JSON.stringify(slice, null, 2), 'utf-8');
    } catch (e) {
      // Ignore background file backup error
    }
  }, 3000);
}

const memoryTransport = new winston.transports.Stream({
  stream: new (Writable)({
    write(chunk, encoding, callback) {
      try {
        const raw = JSON.parse(chunk.toString());
        const { timestamp, level, message, ...restMeta } = raw;

        const effectiveTimestamp = timestamp || new Date().toISOString();
        const effectiveLevel = level || 'info';
        const effectiveMessage = message || '';

        // Extract metadata cleanly preserving all nested structures and details
        let metaObj: Record<string, any> = {};
        if (raw.meta && typeof raw.meta === 'object') {
          metaObj = { ...raw.meta, ...restMeta };
        } else {
          metaObj = { ...restMeta };
        }

        const logId = `log_${Date.now()}_${crypto.randomBytes(5).toString('hex')}`;
        const entry: LogEntry = {
          id: logId,
          log_id: logId,
          timestamp: effectiveTimestamp,
          level: effectiveLevel,
          message: effectiveMessage,
          meta: Object.keys(metaObj).length > 0 ? metaObj : undefined,
          ...metaObj
        };

        if (!seenLogIds.has(logId)) {
          seenLogIds.add(logId);
          logHistory.unshift(entry);
          if (logHistory.length > 2000) {
            const popped = logHistory.pop();
            if (popped?.log_id) seenLogIds.delete(popped.log_id);
          }

          dbInsertQueue.push(entry);
          if (dbInsertQueue.length >= 10) {
            flushQueueToDb();
          } else {
            setTimeout(flushQueueToDb, 500);
          }

          queueFileBackup();
        }
      } catch (e) {}
      callback();
    }
  })
});

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    scrubPII(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    memoryTransport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `[${timestamp}] ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    })
  ]
});

/**
 * Initializes telemetry persistence: restores historical logs from PostgreSQL
 * and local file backup so that across deployments and restarts, NO LOGS OR DETAILS ARE LOST.
 */
export async function initLoggerPersistence(): Promise<void> {
  let loadedFromDb = false;
  const pool = getDbPool();

  if (pool) {
    try {
      const client = await pool.connect();
      try {
        const res = await client.query(`
          SELECT log_id, timestamp, level, message, meta 
          FROM bohurupi_telemetry_logs 
          ORDER BY timestamp DESC 
          LIMIT 2000
        `);

        if (res.rows.length > 0) {
          const dbLogs: LogEntry[] = res.rows.map(row => {
            const parsedMeta = row.meta || {};
            return {
              id: row.log_id,
              log_id: row.log_id,
              timestamp: new Date(row.timestamp).toISOString(),
              level: row.level,
              message: row.message,
              meta: parsedMeta,
              ...parsedMeta
            };
          });

          // Merge DB logs with any initial in-memory logs
          for (const dbLog of dbLogs) {
            const key = dbLog.log_id || `${dbLog.timestamp}_${dbLog.message}`;
            if (!seenLogIds.has(key)) {
              seenLogIds.add(key);
              logHistory.push(dbLog);
            }
          }

          // Sort chronologically newest first
          logHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          if (logHistory.length > 2000) logHistory.length = 2000;

          loadedFromDb = true;
          logger.info(`[Telemetry] Restored ${res.rows.length} historical logs from PostgreSQL persistent storage.`);
        }
      } finally {
        client.release();
      }
    } catch (e) {
      logger.warn('[Telemetry] Could not load historical logs from DB, trying file backup', { error: String(e) });
    }
  }

  // File fallback if DB didn't load or as secondary restoration
  if (!loadedFromDb) {
    try {
      const data = await fs.readFile(BACKUP_LOGS_FILE, 'utf-8');
      const fileLogs = JSON.parse(data);
      if (Array.isArray(fileLogs)) {
        for (const fileLog of fileLogs) {
          const key = fileLog.log_id || fileLog.id || `${fileLog.timestamp}_${fileLog.message}`;
          if (!seenLogIds.has(key)) {
            seenLogIds.add(key);
            logHistory.push(fileLog);
          }
        }
        logHistory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (logHistory.length > 2000) logHistory.length = 2000;
        logger.info(`[Telemetry] Restored ${fileLogs.length} logs from local file persistence.`);
      }
    } catch (e) {
      // File backup not found or empty
    }
  }

  // Flush any startup logs that arrived before persistence initialized
  flushQueueToDb();
  queueFileBackup();
}
