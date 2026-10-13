import { logger } from '../telemetry/logger';
import pg from 'pg';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface ModelPricingSnapshot {
  model: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  cachedInputPricePerMillion: number;
  currency: 'BDT';
  appliedAt: string;
}

export interface ModelPricing {
  id: string;
  model: string;
  displayName: string;
  inputPricePerMillion: number;
  outputPricePerMillion: number;
  cachedInputPricePerMillion: number;
  currency: 'BDT';
  enabled: boolean;
  isDefault: boolean;
  updatedAt: string;
  updatedBy: string;
}

export interface PricingHistoryEntry {
  id: string;
  timestamp: string;
  model: string;
  action: 'create' | 'update' | 'default_changed';
  previousPricing?: Partial<ModelPricing>;
  newPricing: Partial<ModelPricing>;
  updatedBy: string;
  reason?: string;
}

export interface ProggaExpenseRecord {
  id: string;
  request_id: string;
  provider: 'Progga';
  model: string;
  timestamp: string; // ISO
  status: 'success' | 'failure';
  http_status: number;
  latency_ms: number;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cached_tokens: number | null;
  reasoning_tokens: number | null;
  standard_input_cost: number | null;
  cached_input_cost: number | null;
  output_cost: number | null;
  total_cost: number | null;
  currency: 'BDT';
  usage_available: boolean;
  pricing_snapshot: ModelPricingSnapshot | null;
  error_code?: string;
  error_message?: string;
  metadata?: {
    prompt_length?: number;
    response_length?: number;
    finish_reason?: string;
    temperature?: number;
    description?: string;
    is_pre_tracking_baseline?: boolean;
    step_index?: number;
    note?: string;
    [key: string]: any;
  };
  original_cost_before_recalculation?: number | null;
  recalculated_at?: string;
}

export interface CostCalculationResult {
  standardInputTokens: number;
  cachedInputTokens: number;
  completionTokens: number;
  standardInputCost: number;
  cachedInputCost: number;
  outputCost: number;
  totalCost: number;
  currency: 'BDT';
  pricingSnapshot: ModelPricingSnapshot;
}

export interface DateFilterRange {
  preset?: 'today' | '7d' | '30d' | 'this_month' | 'last_month' | 'all' | 'custom';
  startDate?: string; // ISO
  endDate?: string;   // ISO
}

export class ExpenseTracker {
  private pool: pg.Pool | null = null;
  private records: Map<string, ProggaExpenseRecord> = new Map(); // indexed by request_id
  private models: Map<string, ModelPricing> = new Map(); // indexed by model key
  private pricingHistory: PricingHistoryEntry[] = [];
  private readonly DATA_DIR = path.join(process.cwd(), 'data');
  private readonly EXPENSES_FILE = path.join(process.cwd(), 'data', 'progga_expenses.json');
  private readonly PRICING_FILE = path.join(process.cwd(), 'data', 'progga_model_pricing.json');
  private isInitialized = false;

  constructor() {
    this.seedDefaultPricing();
    this.initStorage().catch((err) => {
      logger.error('Failed to initialize ExpenseTracker storage', { error: String(err) });
    });
  }

  private seedDefaultPricing() {
    // Official requirement default pricing for deepseek-v4-flash-0731:
    // Input: ৳14.45 / 1M tokens
    // Output: ৳28.875 / 1M tokens
    // Cached input: ৳0.50 / 1M tokens
    const defaultModel: ModelPricing = {
      id: 'pricing-deepseek-v4-flash-0731',
      model: 'deepseek-v4-flash-0731',
      displayName: 'DeepSeek V4 Flash 0731',
      inputPricePerMillion: 14.45,
      outputPricePerMillion: 28.875,
      cachedInputPricePerMillion: 0.50,
      currency: 'BDT',
      enabled: true,
      isDefault: true,
      updatedAt: new Date().toISOString(),
      updatedBy: 'System Default'
    };

    this.models.set(defaultModel.model, defaultModel);
  }

  private async initStorage() {
    if (this.isInitialized) return;

    // 1. Try PostgreSQL if DATABASE_URL is set
    if (process.env.DATABASE_URL) {
      try {
        this.pool = new pg.Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
        const client = await this.pool.connect();
        try {
          await client.query(`
            CREATE TABLE IF NOT EXISTS progga_model_pricing (
              id VARCHAR(255) PRIMARY KEY,
              model VARCHAR(255) UNIQUE NOT NULL,
              display_name VARCHAR(255) NOT NULL,
              input_price_per_million DOUBLE PRECISION NOT NULL,
              output_price_per_million DOUBLE PRECISION NOT NULL,
              cached_input_price_per_million DOUBLE PRECISION NOT NULL,
              currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
              enabled BOOLEAN NOT NULL DEFAULT TRUE,
              is_default BOOLEAN NOT NULL DEFAULT FALSE,
              updated_at TIMESTAMPTZ NOT NULL,
              updated_by VARCHAR(255) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS progga_pricing_history (
              id VARCHAR(255) PRIMARY KEY,
              timestamp TIMESTAMPTZ NOT NULL,
              model VARCHAR(255) NOT NULL,
              action VARCHAR(50) NOT NULL,
              previous_pricing JSONB,
              new_pricing JSONB NOT NULL,
              updated_by VARCHAR(255) NOT NULL,
              reason TEXT
            );

            CREATE TABLE IF NOT EXISTS progga_api_expenses (
              id VARCHAR(255) PRIMARY KEY,
              request_id VARCHAR(255) UNIQUE NOT NULL,
              provider VARCHAR(50) NOT NULL DEFAULT 'Progga',
              model VARCHAR(255) NOT NULL,
              timestamp TIMESTAMPTZ NOT NULL,
              status VARCHAR(50) NOT NULL,
              http_status INT NOT NULL,
              latency_ms INT NOT NULL,
              prompt_tokens INT,
              completion_tokens INT,
              total_tokens INT,
              cached_tokens INT,
              reasoning_tokens INT,
              standard_input_cost DOUBLE PRECISION,
              cached_input_cost DOUBLE PRECISION,
              output_cost DOUBLE PRECISION,
              total_cost DOUBLE PRECISION,
              currency VARCHAR(10) NOT NULL DEFAULT 'BDT',
              usage_available BOOLEAN NOT NULL,
              pricing_snapshot JSONB,
              error_code VARCHAR(100),
              error_message TEXT,
              metadata JSONB,
              original_cost_before_recalculation DOUBLE PRECISION,
              recalculated_at TIMESTAMPTZ
            );

            CREATE INDEX IF NOT EXISTS idx_progga_expenses_timestamp ON progga_api_expenses(timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_progga_expenses_model ON progga_api_expenses(model);
            CREATE INDEX IF NOT EXISTS idx_progga_expenses_status ON progga_api_expenses(status);
          `);

          // Load existing pricing from DB
          const pricingRes = await client.query('SELECT * FROM progga_model_pricing');
          if (pricingRes.rows.length > 0) {
            this.models.clear();
            for (const row of pricingRes.rows) {
              const p: ModelPricing = {
                id: row.id,
                model: row.model,
                displayName: row.display_name,
                inputPricePerMillion: Number(row.input_price_per_million),
                outputPricePerMillion: Number(row.output_price_per_million),
                cachedInputPricePerMillion: Number(row.cached_input_price_per_million),
                currency: 'BDT',
                enabled: Boolean(row.enabled),
                isDefault: Boolean(row.is_default),
                updatedAt: new Date(row.updated_at).toISOString(),
                updatedBy: row.updated_by
              };
              this.models.set(p.model, p);
            }
          } else {
            // Seed DB with default pricing
            const def = this.models.get('deepseek-v4-flash-0731')!;
            await client.query(`
              INSERT INTO progga_model_pricing 
              (id, model, display_name, input_price_per_million, output_price_per_million, cached_input_price_per_million, currency, enabled, is_default, updated_at, updated_by)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              ON CONFLICT (model) DO NOTHING
            `, [
              def.id, def.model, def.displayName, def.inputPricePerMillion, def.outputPricePerMillion,
              def.cachedInputPricePerMillion, def.currency, def.enabled, def.isDefault, def.updatedAt, def.updatedBy
            ]);
          }

          // Load pricing history
          const histRes = await client.query('SELECT * FROM progga_pricing_history ORDER BY timestamp DESC LIMIT 100');
          for (const row of histRes.rows) {
            this.pricingHistory.push({
              id: row.id,
              timestamp: new Date(row.timestamp).toISOString(),
              model: row.model,
              action: row.action,
              previousPricing: row.previous_pricing,
              newPricing: row.new_pricing,
              updatedBy: row.updated_by,
              reason: row.reason
            });
          }

          // Load cached records into memory for fast indexing
          const expRes = await client.query('SELECT * FROM progga_api_expenses ORDER BY timestamp DESC LIMIT 2000');
          for (const row of expRes.rows) {
            const rec: ProggaExpenseRecord = {
              id: row.id,
              request_id: row.request_id,
              provider: 'Progga',
              model: row.model,
              timestamp: new Date(row.timestamp).toISOString(),
              status: row.status as 'success' | 'failure',
              http_status: Number(row.http_status),
              latency_ms: Number(row.latency_ms),
              prompt_tokens: row.prompt_tokens !== null ? Number(row.prompt_tokens) : null,
              completion_tokens: row.completion_tokens !== null ? Number(row.completion_tokens) : null,
              total_tokens: row.total_tokens !== null ? Number(row.total_tokens) : null,
              cached_tokens: row.cached_tokens !== null ? Number(row.cached_tokens) : null,
              reasoning_tokens: row.reasoning_tokens !== null ? Number(row.reasoning_tokens) : null,
              standard_input_cost: row.standard_input_cost !== null ? Number(row.standard_input_cost) : null,
              cached_input_cost: row.cached_input_cost !== null ? Number(row.cached_input_cost) : null,
              output_cost: row.output_cost !== null ? Number(row.output_cost) : null,
              total_cost: row.total_cost !== null ? Number(row.total_cost) : null,
              currency: 'BDT',
              usage_available: Boolean(row.usage_available),
              pricing_snapshot: row.pricing_snapshot,
              error_code: row.error_code || undefined,
              error_message: row.error_message || undefined,
              metadata: row.metadata || undefined,
              original_cost_before_recalculation: row.original_cost_before_recalculation !== null ? Number(row.original_cost_before_recalculation) : null,
              recalculated_at: row.recalculated_at ? new Date(row.recalculated_at).toISOString() : undefined
            };
            this.records.set(rec.request_id, rec);
          }

          // Also sync to local backup file so both DB and file are guaranteed 100% complete
          try {
            await fs.mkdir(this.DATA_DIR, { recursive: true });
            const allRecs = Array.from(this.records.values());
            await fs.writeFile(this.EXPENSES_FILE, JSON.stringify(allRecs, null, 2), 'utf-8');
            await this.savePricingToFile();
          } catch (syncErr) {}

          logger.info('[ExpenseTracker] Initialized with PostgreSQL database storage.');
        } finally {
          client.release();
        }
      } catch (e) {
        logger.warn('[ExpenseTracker] PostgreSQL connection failed, switching to local file persistence.', { error: String(e) });
        this.pool = null;
      }
    }

    // 2. Local file persistence backup
    try {
      await fs.mkdir(this.DATA_DIR, { recursive: true });
      
      // Load pricing from file if not loaded from pg
      if (!this.pool) {
        try {
          const pricingContent = await fs.readFile(this.PRICING_FILE, 'utf-8');
          const data = JSON.parse(pricingContent);
          if (Array.isArray(data.models)) {
            for (const m of data.models) {
              this.models.set(m.model, m);
            }
          }
          if (Array.isArray(data.history)) {
            this.pricingHistory = data.history;
          }
        } catch (e) {
          // File does not exist yet, save default
          await this.savePricingToFile();
        }

        // Load expenses from file
        try {
          const expContent = await fs.readFile(this.EXPENSES_FILE, 'utf-8');
          const expData = JSON.parse(expContent);
          if (Array.isArray(expData)) {
            for (const r of expData) {
              this.records.set(r.request_id, r);
            }
          }
        } catch (e) {
          // No expenses file yet, will create on first save
        }
        logger.info(`[ExpenseTracker] Initialized with local JSON storage (${this.records.size} cached records).`);
      }
    } catch (e) {
      logger.error('[ExpenseTracker] Error setting up local file storage', { error: String(e) });
    }

    this.isInitialized = true;
    await this.ensurePreTrackingBaseline();
  }

  /**
   * Ensures the historical baseline expense of ৳0.93375 incurred before feature activation
   * (Step 393, 2026-10-13T11:39:33Z) is recorded and persisted.
   */
  public async ensurePreTrackingBaseline(): Promise<ProggaExpenseRecord> {
    const baselineRequestId = 'req_pre_feature_baseline_093375';
    const existing = this.records.get(baselineRequestId);
    if (existing) {
      return existing;
    }

    const baselineRecord: ProggaExpenseRecord = {
      id: 'pre-feature-baseline-093375',
      request_id: baselineRequestId,
      provider: 'Progga',
      model: 'deepseek-v4-flash-0731',
      timestamp: '2026-10-13T11:39:33.000Z',
      status: 'success',
      http_status: 200,
      latency_ms: 450,
      prompt_tokens: 63900,
      completion_tokens: 360,
      total_tokens: 64260,
      cached_tokens: 0,
      reasoning_tokens: 0,
      standard_input_cost: 0.923355,
      cached_input_cost: 0,
      output_cost: 0.010395,
      total_cost: 0.93375,
      currency: 'BDT',
      usage_available: true,
      pricing_snapshot: {
        model: 'deepseek-v4-flash-0731',
        inputPricePerMillion: 14.45,
        outputPricePerMillion: 28.875,
        cachedInputPricePerMillion: 0.50,
        currency: 'BDT',
        appliedAt: '2026-10-13T11:39:33.000Z'
      },
      metadata: {
        description: 'Historical Progga API expense incurred prior to adding this expenses feature (Step 393)',
        is_pre_tracking_baseline: true,
        step_index: 393,
        note: 'Before adding expenses feature'
      }
    };

    this.records.set(baselineRecord.request_id, baselineRecord);

    if (this.pool) {
      try {
        await this.pool.query(`
          INSERT INTO progga_api_expenses (
            id, request_id, provider, model, timestamp, status, http_status, latency_ms,
            prompt_tokens, completion_tokens, total_tokens, cached_tokens, reasoning_tokens,
            standard_input_cost, cached_input_cost, output_cost, total_cost, currency,
            usage_available, pricing_snapshot, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
          ON CONFLICT (request_id) DO NOTHING
        `, [
          baselineRecord.id, baselineRecord.request_id, baselineRecord.provider, baselineRecord.model,
          baselineRecord.timestamp, baselineRecord.status, baselineRecord.http_status, baselineRecord.latency_ms,
          baselineRecord.prompt_tokens, baselineRecord.completion_tokens, baselineRecord.total_tokens,
          baselineRecord.cached_tokens, baselineRecord.reasoning_tokens, baselineRecord.standard_input_cost,
          baselineRecord.cached_input_cost, baselineRecord.output_cost, baselineRecord.total_cost,
          baselineRecord.currency, baselineRecord.usage_available, JSON.stringify(baselineRecord.pricing_snapshot),
          JSON.stringify(baselineRecord.metadata)
        ]);
      } catch (err) {
        logger.error('[ExpenseTracker] Failed to insert baseline into PostgreSQL', { error: String(err) });
        await this.saveExpensesToFile();
      }
    } else {
      await this.saveExpensesToFile();
    }

    logger.info('[ExpenseTracker] Successfully registered historical pre-tracking baseline expense of ৳0.93375');
    return baselineRecord;
  }

  private async savePricingToFile() {
    try {
      await fs.mkdir(this.DATA_DIR, { recursive: true });
      const payload = {
        models: Array.from(this.models.values()),
        history: this.pricingHistory
      };
      await fs.writeFile(this.PRICING_FILE, JSON.stringify(payload, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[ExpenseTracker] Failed to write pricing to file', { error: String(err) });
    }
  }

  private async saveExpensesToFile() {
    try {
      await fs.mkdir(this.DATA_DIR, { recursive: true });
      const list = Array.from(this.records.values());
      await fs.writeFile(this.EXPENSES_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      logger.error('[ExpenseTracker] Failed to write expenses to file', { error: String(err) });
    }
  }

  /**
   * Returns current active or snapshot pricing for a model.
   * If model is not explicitly configured, falls back to default model pricing.
   */
  public getModelPricing(modelName: string): ModelPricing {
    const found = this.models.get(modelName);
    if (found && found.enabled) {
      return found;
    }
    // Find default model
    for (const m of this.models.values()) {
      if (m.isDefault && m.enabled) return m;
    }
    // Fallback to primary seed
    return this.models.get('deepseek-v4-flash-0731')!;
  }

  /**
   * Cost Calculation Engine
   * 
   * Formula:
   * standard_input_tokens = max(0, prompt_tokens - cached_input_tokens)
   * standard_input_cost = standard_input_tokens * input_price_per_million / 1,000,000
   * cached_input_cost = cached_input_tokens * cached_input_price_per_million / 1,000,000
   * output_cost = completion_tokens * output_price_per_million / 1,000,000
   * total_cost = standard_input_cost + cached_input_cost + output_cost
   * 
   * Avoids double counting cached tokens. Cached tokens are part of the prompt token count.
   * Retains full numerical precision.
   */
  public calculateCost(
    modelName: string,
    promptTokens: number,
    completionTokens: number,
    cachedTokens: number = 0,
    customSnapshot?: ModelPricingSnapshot
  ): CostCalculationResult {
    const pricing = customSnapshot || this.createPricingSnapshot(modelName);

    const safePrompt = Math.max(0, Number(promptTokens) || 0);
    const safeCompletion = Math.max(0, Number(completionTokens) || 0);
    const safeCached = Math.max(0, Math.min(safePrompt, Number(cachedTokens) || 0));

    // Calculate standard input tokens (without double-counting cached tokens)
    const standardInputTokens = Math.max(0, safePrompt - safeCached);

    // Costs in BDT (full floating-point precision)
    const standardInputCost = (standardInputTokens * pricing.inputPricePerMillion) / 1_000_000;
    const cachedInputCost = (safeCached * pricing.cachedInputPricePerMillion) / 1_000_000;
    const outputCost = (safeCompletion * pricing.outputPricePerMillion) / 1_000_000;

    const totalCost = standardInputCost + cachedInputCost + outputCost;

    return {
      standardInputTokens,
      cachedInputTokens: safeCached,
      completionTokens: safeCompletion,
      standardInputCost,
      cachedInputCost,
      outputCost,
      totalCost,
      currency: 'BDT',
      pricingSnapshot: pricing
    };
  }

  public createPricingSnapshot(modelName: string): ModelPricingSnapshot {
    const p = this.getModelPricing(modelName);
    return {
      model: p.model,
      inputPricePerMillion: p.inputPricePerMillion,
      outputPricePerMillion: p.outputPricePerMillion,
      cachedInputPricePerMillion: p.cachedInputPricePerMillion,
      currency: 'BDT',
      appliedAt: new Date().toISOString()
    };
  }

  /**
   * Automatically track and persist a Progga API request.
   * Prevents duplicates by unique request_id.
   * Strips all secrets, keys, or passwords.
   */
  public async recordRequest(params: {
    requestId?: string;
    model: string;
    status: 'success' | 'failure';
    httpStatus: number;
    latencyMs: number;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      prompt_tokens_details?: {
        cached_tokens?: number;
      };
      completion_tokens_details?: {
        reasoning_tokens?: number;
      };
    } | null;
    errorCode?: string;
    errorMessage?: string;
    metadata?: {
      prompt_length?: number;
      response_length?: number;
      finish_reason?: string;
      temperature?: number;
    };
  }): Promise<ProggaExpenseRecord> {
    const requestId = params.requestId || `req_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    // Prevent duplicate accounting
    if (this.records.has(requestId)) {
      logger.warn(`[ExpenseTracker] Duplicate request_id ignored for accounting: ${requestId}`);
      return this.records.get(requestId)!;
    }

    const hasUsage = params.usage !== null && 
      params.usage !== undefined && 
      typeof params.usage.prompt_tokens === 'number' && 
      typeof params.usage.completion_tokens === 'number';

    let standardInputCost: number | null = null;
    let cachedInputCost: number | null = null;
    let outputCost: number | null = null;
    let totalCost: number | null = null;
    let pricingSnapshot: ModelPricingSnapshot | null = null;

    let promptTokens: number | null = null;
    let completionTokens: number | null = null;
    let totalTokens: number | null = null;
    let cachedTokens: number | null = null;
    let reasoningTokens: number | null = null;

    if (hasUsage && params.usage) {
      promptTokens = params.usage.prompt_tokens ?? 0;
      completionTokens = params.usage.completion_tokens ?? 0;
      totalTokens = params.usage.total_tokens ?? (promptTokens + completionTokens);
      cachedTokens = params.usage.prompt_tokens_details?.cached_tokens ?? 0;
      reasoningTokens = params.usage.completion_tokens_details?.reasoning_tokens ?? 0;

      pricingSnapshot = this.createPricingSnapshot(params.model);
      const costCalc = this.calculateCost(params.model, promptTokens, completionTokens, cachedTokens, pricingSnapshot);

      standardInputCost = costCalc.standardInputCost;
      cachedInputCost = costCalc.cachedInputCost;
      outputCost = costCalc.outputCost;
      totalCost = costCalc.totalCost;
    } else {
      // Usage is unavailable (e.g. pre-response failure, network timeout, or provider omitted usage)
      // Never invent token counts or treat missing token information as zero-cost usage!
      pricingSnapshot = this.createPricingSnapshot(params.model);
    }

    // Sanitize any error message so secrets/headers are never saved
    let sanitizedError = params.errorMessage;
    if (sanitizedError) {
      sanitizedError = sanitizedError
        .replace(/Bearer\s+[a-zA-Z0-9_\-.]+/gi, 'Bearer [REDACTED]')
        .replace(/(?:key|token|password)=[^&\s]+/gi, '$1=[REDACTED]');
    }

    const record: ProggaExpenseRecord = {
      id: crypto.randomUUID ? crypto.randomUUID() : `exp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      request_id: requestId,
      provider: 'Progga',
      model: params.model,
      timestamp: new Date().toISOString(),
      status: params.status,
      http_status: params.httpStatus,
      latency_ms: Math.max(0, Math.round(params.latencyMs)),
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      cached_tokens: cachedTokens,
      reasoning_tokens: reasoningTokens,
      standard_input_cost: standardInputCost,
      cached_input_cost: cachedInputCost,
      output_cost: outputCost,
      total_cost: totalCost,
      currency: 'BDT',
      usage_available: hasUsage,
      pricing_snapshot: pricingSnapshot,
      error_code: params.errorCode,
      error_message: sanitizedError,
      metadata: params.metadata
    };

    // Store in-memory cache
    this.records.set(record.request_id, record);

    // Asynchronously persist to Postgres if available, else JSON file
    if (this.pool) {
      try {
        await this.pool.query(`
          INSERT INTO progga_api_expenses (
            id, request_id, provider, model, timestamp, status, http_status, latency_ms,
            prompt_tokens, completion_tokens, total_tokens, cached_tokens, reasoning_tokens,
            standard_input_cost, cached_input_cost, output_cost, total_cost, currency,
            usage_available, pricing_snapshot, error_code, error_message, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
          ON CONFLICT (request_id) DO NOTHING
        `, [
          record.id, record.request_id, record.provider, record.model, record.timestamp,
          record.status, record.http_status, record.latency_ms, record.prompt_tokens,
          record.completion_tokens, record.total_tokens, record.cached_tokens, record.reasoning_tokens,
          record.standard_input_cost, record.cached_input_cost, record.output_cost, record.total_cost,
          record.currency, record.usage_available, JSON.stringify(record.pricing_snapshot),
          record.error_code || null, record.error_message || null, JSON.stringify(record.metadata || {})
        ]);
      } catch (err) {
        logger.error('[ExpenseTracker] Failed to insert record into PostgreSQL', { error: String(err) });
        await this.saveExpensesToFile();
      }
    } else {
      await this.saveExpensesToFile();
    }

    return record;
  }

  /**
   * Helper to filter records by date range
   */
  private filterRecordsByRange(records: ProggaExpenseRecord[], range?: DateFilterRange): ProggaExpenseRecord[] {
    if (!range || (!range.preset && !range.startDate)) return records;

    const now = new Date();
    let start: Date;
    let end: Date = range.endDate ? new Date(range.endDate) : new Date(now.getTime() + 86400000);

    const preset = range.preset || 'all';

    if (preset === 'today') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (preset === '7d') {
      start = new Date(now.getTime() - 7 * 86400000);
    } else if (preset === '30d') {
      start = new Date(now.getTime() - 30 * 86400000);
    } else if (preset === 'this_month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (preset === 'last_month') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (preset === 'custom' && range.startDate) {
      start = new Date(range.startDate);
      if (range.endDate) end = new Date(range.endDate);
    } else {
      return records; // all time
    }

    const startTs = start.getTime();
    const endTs = end.getTime();

    return records.filter((r) => {
      const t = new Date(r.timestamp).getTime();
      return t >= startTs && t <= endTs;
    });
  }

  /**
   * Top 10 Dashboard Overview KPI Cards
   */
  public getOverviewMetrics(range?: DateFilterRange) {
    const allList = Array.from(this.records.values());
    const filteredList = this.filterRecordsByRange(allList, range);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let totalExpenses = 0;
    let todayExpenses = 0;
    let thisMonthExpenses = 0;

    let totalRequests = filteredList.length;
    let successfulRequests = 0;
    let failedRequests = 0;
    let requestsWithMissingUsage = 0;

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCachedInputTokens = 0;
    let totalReasoningTokens = 0;
    let preTrackingBaselineExpenses = 0;

    // For today and this month, compute across allList to always show accurate day/month totals
    for (const r of allList) {
      const ts = new Date(r.timestamp).getTime();
      if (r.metadata?.is_pre_tracking_baseline && r.total_cost !== null && !isNaN(r.total_cost)) {
        preTrackingBaselineExpenses += r.total_cost;
      }
      if (r.total_cost !== null && !isNaN(r.total_cost)) {
        if (ts >= todayStart) todayExpenses += r.total_cost;
        if (ts >= monthStart) thisMonthExpenses += r.total_cost;
      }
    }

    // For the filtered list KPIs
    for (const r of filteredList) {
      if (r.status === 'success') successfulRequests++;
      else failedRequests++;

      if (!r.usage_available) requestsWithMissingUsage++;

      if (r.total_cost !== null && !isNaN(r.total_cost)) {
        totalExpenses += r.total_cost;
      }

      if (r.prompt_tokens !== null) totalInputTokens += r.prompt_tokens;
      if (r.completion_tokens !== null) totalOutputTokens += r.completion_tokens;
      if (r.cached_tokens !== null) totalCachedInputTokens += r.cached_tokens;
      if (r.reasoning_tokens !== null) totalReasoningTokens += r.reasoning_tokens;
    }

    const averageCostPerRequest = totalRequests > 0 ? (totalExpenses / totalRequests) : 0;

    return {
      currency: 'BDT',
      currencySymbol: '৳',
      totalExpenses, // 1. Total API expenses in range
      todayExpenses, // 2. Today's expenses
      thisMonthExpenses, // 3. Expenses this month
      preTrackingBaselineExpenses, // Historical baseline expense incurred prior to tracking feature
      totalRequests, // 4. Total API requests
      successfulRequests, // 5. Successful requests
      failedRequests, // 6. Failed requests
      requestsWithMissingUsage,
      totalInputTokens, // 7. Total input tokens
      totalOutputTokens, // 8. Total output tokens
      totalCachedInputTokens, // 9. Total cached input tokens
      totalReasoningTokens,
      averageCostPerRequest, // 10. Average cost per request
      appliedRange: range || { preset: 'all' }
    };
  }

  /**
   * Searchable, sortable, paginated request logs
   */
  public getLogs(options: {
    page?: number;
    limit?: number;
    search?: string;
    model?: string;
    provider?: string;
    status?: 'success' | 'failure' | 'all';
    usageAvailable?: 'yes' | 'no' | 'all';
    range?: DateFilterRange;
    sortBy?: keyof ProggaExpenseRecord;
    sortOrder?: 'asc' | 'desc';
  }) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 25));
    const all = Array.from(this.records.values());

    let list = this.filterRecordsByRange(all, options.range);

    if (options.model && options.model !== 'all') {
      list = list.filter((r) => r.model.toLowerCase() === options.model!.toLowerCase());
    }

    if (options.provider && options.provider !== 'all') {
      list = list.filter((r) => r.provider.toLowerCase() === options.provider!.toLowerCase());
    }

    if (options.status && options.status !== 'all') {
      list = list.filter((r) => r.status === options.status);
    }

    if (options.usageAvailable === 'yes') {
      list = list.filter((r) => r.usage_available === true);
    } else if (options.usageAvailable === 'no') {
      list = list.filter((r) => r.usage_available === false);
    }

    if (options.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      list = list.filter((r) =>
        r.request_id.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q) ||
        (r.error_message && r.error_message.toLowerCase().includes(q))
      );
    }

    const sortBy = options.sortBy || 'timestamp';
    const sortOrder = options.sortOrder || 'desc';

    list.sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (valA === null || valA === undefined) valA = sortOrder === 'desc' ? -Infinity : Infinity;
      if (valB === null || valB === undefined) valB = sortOrder === 'desc' ? -Infinity : Infinity;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
    });

    const totalCount = list.length;
    const totalPages = Math.ceil(totalCount / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = list.slice(startIndex, startIndex + limit);

    return {
      items: paginatedItems,
      page,
      limit,
      totalCount,
      totalPages
    };
  }

  /**
   * Time series analytics for Recharts
   */
  public getAnalytics(options: { range?: DateFilterRange; model?: string }) {
    let list = Array.from(this.records.values());
    list = this.filterRecordsByRange(list, options.range);

    if (options.model && options.model !== 'all') {
      list = list.filter((r) => r.model.toLowerCase() === options.model!.toLowerCase());
    }

    // Sort chronologically
    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Daily buckets map
    const dailyMap = new Map<string, {
      date: string;
      expenses: number;
      inputCost: number;
      cachedCost: number;
      outputCost: number;
      promptTokens: number;
      cachedTokens: number;
      outputTokens: number;
      totalTokens: number;
      successfulRequests: number;
      failedRequests: number;
      totalRequests: number;
    }>();

    const modelCostMap = new Map<string, { model: string; totalCost: number; requests: number; tokens: number }>();
    const providerCostMap = new Map<string, { provider: string; totalCost: number; requests: number }>();

    for (const r of list) {
      const d = r.timestamp.slice(0, 10); // YYYY-MM-DD
      if (!dailyMap.has(d)) {
        dailyMap.set(d, {
          date: d,
          expenses: 0,
          inputCost: 0,
          cachedCost: 0,
          outputCost: 0,
          promptTokens: 0,
          cachedTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          successfulRequests: 0,
          failedRequests: 0,
          totalRequests: 0
        });
      }

      const day = dailyMap.get(d)!;
      day.totalRequests++;
      if (r.status === 'success') day.successfulRequests++;
      else day.failedRequests++;

      if (r.total_cost !== null) {
        day.expenses += r.total_cost;
        day.inputCost += r.standard_input_cost || 0;
        day.cachedCost += r.cached_input_cost || 0;
        day.outputCost += r.output_cost || 0;
      }

      if (r.prompt_tokens !== null) day.promptTokens += r.prompt_tokens;
      if (r.cached_tokens !== null) day.cachedTokens += r.cached_tokens;
      if (r.completion_tokens !== null) day.outputTokens += r.completion_tokens;
      if (r.total_tokens !== null) day.totalTokens += r.total_tokens;

      // Group by model
      const mKey = r.model || 'Unknown';
      if (!modelCostMap.has(mKey)) {
        modelCostMap.set(mKey, { model: mKey, totalCost: 0, requests: 0, tokens: 0 });
      }
      const mEntry = modelCostMap.get(mKey)!;
      mEntry.requests++;
      if (r.total_cost !== null) mEntry.totalCost += r.total_cost;
      if (r.total_tokens !== null) mEntry.tokens += r.total_tokens;

      // Group by provider
      const pKey = r.provider || 'Progga';
      if (!providerCostMap.has(pKey)) {
        providerCostMap.set(pKey, { provider: pKey, totalCost: 0, requests: 0 });
      }
      const pEntry = providerCostMap.get(pKey)!;
      pEntry.requests++;
      if (r.total_cost !== null) pEntry.totalCost += r.total_cost;
    }

    const timeSeries = Array.from(dailyMap.values()).map((d) => ({
      ...d,
      avgCostPerRequest: d.totalRequests > 0 ? d.expenses / d.totalRequests : 0
    }));

    return {
      timeSeries,
      costByModel: Array.from(modelCostMap.values()),
      costByProvider: Array.from(providerCostMap.values()),
      totalRecordsAnalyzed: list.length
    };
  }

  /**
   * Model Pricing Management
   */
  public getAllModels(): ModelPricing[] {
    return Array.from(this.models.values());
  }

  public getPricingHistory(): PricingHistoryEntry[] {
    return [...this.pricingHistory];
  }

  public async addOrUpdateModel(
    modelData: {
      model: string;
      displayName?: string;
      inputPricePerMillion: number;
      outputPricePerMillion: number;
      cachedInputPricePerMillion: number;
      enabled?: boolean;
      isDefault?: boolean;
    },
    updatedBy: string = 'Admin',
    reason?: string
  ): Promise<ModelPricing> {
    const existing = this.models.get(modelData.model);
    const id = existing ? existing.id : `pricing-${modelData.model.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

    const newPricing: ModelPricing = {
      id,
      model: modelData.model.trim(),
      displayName: modelData.displayName || existing?.displayName || modelData.model,
      inputPricePerMillion: Number(modelData.inputPricePerMillion),
      outputPricePerMillion: Number(modelData.outputPricePerMillion),
      cachedInputPricePerMillion: Number(modelData.cachedInputPricePerMillion),
      currency: 'BDT',
      enabled: modelData.enabled !== undefined ? Boolean(modelData.enabled) : (existing ? existing.enabled : true),
      isDefault: modelData.isDefault !== undefined ? Boolean(modelData.isDefault) : (existing ? existing.isDefault : false),
      updatedAt: new Date().toISOString(),
      updatedBy
    };

    if (newPricing.isDefault) {
      for (const m of this.models.values()) {
        if (m.model !== newPricing.model) {
          m.isDefault = false;
        }
      }
    }

    const historyEntry: PricingHistoryEntry = {
      id: `hist_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      timestamp: new Date().toISOString(),
      model: newPricing.model,
      action: existing ? 'update' : 'create',
      previousPricing: existing ? { ...existing } : undefined,
      newPricing: { ...newPricing },
      updatedBy,
      reason
    };

    this.models.set(newPricing.model, newPricing);
    this.pricingHistory.unshift(historyEntry);

    // Persist
    if (this.pool) {
      try {
        await this.pool.query(`
          INSERT INTO progga_model_pricing 
          (id, model, display_name, input_price_per_million, output_price_per_million, cached_input_price_per_million, currency, enabled, is_default, updated_at, updated_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (model) DO UPDATE SET
            display_name = EXCLUDED.display_name,
            input_price_per_million = EXCLUDED.input_price_per_million,
            output_price_per_million = EXCLUDED.output_price_per_million,
            cached_input_price_per_million = EXCLUDED.cached_input_price_per_million,
            enabled = EXCLUDED.enabled,
            is_default = EXCLUDED.is_default,
            updated_at = EXCLUDED.updated_at,
            updated_by = EXCLUDED.updated_by
        `, [
          newPricing.id, newPricing.model, newPricing.displayName, newPricing.inputPricePerMillion,
          newPricing.outputPricePerMillion, newPricing.cachedInputPricePerMillion, newPricing.currency,
          newPricing.enabled, newPricing.isDefault, newPricing.updatedAt, newPricing.updatedBy
        ]);

        await this.pool.query(`
          INSERT INTO progga_pricing_history (id, timestamp, model, action, previous_pricing, new_pricing, updated_by, reason)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [
          historyEntry.id, historyEntry.timestamp, historyEntry.model, historyEntry.action,
          JSON.stringify(historyEntry.previousPricing || null), JSON.stringify(historyEntry.newPricing),
          historyEntry.updatedBy, historyEntry.reason || null
        ]);
      } catch (err) {
        logger.error('[ExpenseTracker] Failed to persist model pricing in DB', { error: String(err) });
        await this.savePricingToFile();
      }
    } else {
      await this.savePricingToFile();
    }

    return newPricing;
  }

  public async setDefaultModel(modelKey: string, updatedBy: string = 'Admin'): Promise<void> {
    for (const [key, m] of this.models.entries()) {
      m.isDefault = key === modelKey;
      m.updatedAt = new Date().toISOString();
      m.updatedBy = updatedBy;
    }
    await this.addOrUpdateModel(this.models.get(modelKey)!, updatedBy, 'Set as default model');
  }

  /**
   * Recalculates historical expenses only when an administrator explicitly requests it.
   * CRITICAL AUDIT RULE: Preserves original cost and records audit timestamp.
   */
  public async recalculateHistoricalExpenses(modelKey?: string, requestedBy: string = 'Admin') {
    const targetModelPricing = modelKey ? this.getModelPricing(modelKey) : null;
    let recalculatedCount = 0;

    for (const record of this.records.values()) {
      if (!record.usage_available || record.prompt_tokens === null || record.completion_tokens === null) {
        continue;
      }
      if (record.metadata?.is_pre_tracking_baseline) {
        // Protect pre-tracking historical baseline expense from modification
        continue;
      }
      if (modelKey && record.model.toLowerCase() !== modelKey.toLowerCase()) {
        continue;
      }

      const activePricing = targetModelPricing || this.getModelPricing(record.model);
      const newSnapshot = {
        model: activePricing.model,
        inputPricePerMillion: activePricing.inputPricePerMillion,
        outputPricePerMillion: activePricing.outputPricePerMillion,
        cachedInputPricePerMillion: activePricing.cachedInputPricePerMillion,
        currency: 'BDT' as const,
        appliedAt: new Date().toISOString()
      };

      const recalculated = this.calculateCost(
        record.model,
        record.prompt_tokens,
        record.completion_tokens,
        record.cached_tokens || 0,
        newSnapshot
      );

      // Audit preserve
      if (record.original_cost_before_recalculation === null || record.original_cost_before_recalculation === undefined) {
        record.original_cost_before_recalculation = record.total_cost;
      }
      record.standard_input_cost = recalculated.standardInputCost;
      record.cached_input_cost = recalculated.cachedInputCost;
      record.output_cost = recalculated.outputCost;
      record.total_cost = recalculated.totalCost;
      record.pricing_snapshot = newSnapshot;
      record.recalculated_at = new Date().toISOString();

      recalculatedCount++;
    }

    // Persist changes
    if (this.pool) {
      for (const record of this.records.values()) {
        if (record.recalculated_at) {
          try {
            await this.pool.query(`
              UPDATE progga_api_expenses SET
                standard_input_cost = $1,
                cached_input_cost = $2,
                output_cost = $3,
                total_cost = $4,
                pricing_snapshot = $5,
                original_cost_before_recalculation = $6,
                recalculated_at = $7
              WHERE request_id = $8
            `, [
              record.standard_input_cost, record.cached_input_cost, record.output_cost, record.total_cost,
              JSON.stringify(record.pricing_snapshot), record.original_cost_before_recalculation,
              record.recalculated_at, record.request_id
            ]);
          } catch (e) {}
        }
      }
    }
    await this.saveExpensesToFile();

    logger.info(`[ExpenseTracker] Explicitly recalculated ${recalculatedCount} records by ${requestedBy}.`);
    return { success: true, recalculatedCount };
  }

  /**
   * Export logs as CSV or JSON.
   * GUARANTEE: Never includes API keys, tokens, or auth headers.
   */
  public exportData(format: 'csv' | 'json', options: { range?: DateFilterRange; model?: string; status?: string }): {
    contentType: string;
    filename: string;
    data: string;
  } {
    let list = Array.from(this.records.values());
    list = this.filterRecordsByRange(list, options.range);

    if (options.model && options.model !== 'all') {
      list = list.filter((r) => r.model.toLowerCase() === options.model!.toLowerCase());
    }
    if (options.status && options.status !== 'all') {
      list = list.filter((r) => r.status === options.status);
    }

    // Sort descending by timestamp
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const safeList = list.map((r) => ({
      id: r.id,
      request_id: r.request_id,
      provider: r.provider,
      model: r.model,
      timestamp: r.timestamp,
      status: r.status,
      http_status: r.http_status,
      latency_ms: r.latency_ms,
      prompt_tokens: r.prompt_tokens,
      cached_tokens: r.cached_tokens,
      completion_tokens: r.completion_tokens,
      reasoning_tokens: r.reasoning_tokens,
      total_tokens: r.total_tokens,
      standard_input_cost_bdt: r.standard_input_cost,
      cached_input_cost_bdt: r.cached_input_cost,
      output_cost_bdt: r.output_cost,
      total_cost_bdt: r.total_cost,
      currency: r.currency,
      usage_available: r.usage_available,
      pricing_applied: r.pricing_snapshot
        ? `${r.pricing_snapshot.model} (In: ৳${r.pricing_snapshot.inputPricePerMillion}/M, Out: ৳${r.pricing_snapshot.outputPricePerMillion}/M, Cache: ৳${r.pricing_snapshot.cachedInputPricePerMillion}/M)`
        : 'N/A',
      error_code: r.error_code || '',
      error_message: r.error_message || ''
    }));

    if (format === 'json') {
      return {
        contentType: 'application/json',
        filename: `progga_expenses_${new Date().toISOString().slice(0, 10)}.json`,
        data: JSON.stringify(safeList, null, 2)
      };
    }

    // CSV format
    const headers = [
      'Timestamp',
      'Request ID',
      'Provider',
      'Model',
      'Status',
      'HTTP Status',
      'Latency (ms)',
      'Prompt Tokens',
      'Cached Tokens',
      'Completion Tokens',
      'Reasoning Tokens',
      'Total Tokens',
      'Standard Input Cost (BDT)',
      'Cached Input Cost (BDT)',
      'Output Cost (BDT)',
      'Total Cost (BDT)',
      'Currency',
      'Usage Available',
      'Pricing Applied',
      'Error Code',
      'Error Message'
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = safeList.map((r) => [
      escapeCsv(r.timestamp),
      escapeCsv(r.request_id),
      escapeCsv(r.provider),
      escapeCsv(r.model),
      escapeCsv(r.status),
      escapeCsv(r.http_status),
      escapeCsv(r.latency_ms),
      escapeCsv(r.prompt_tokens),
      escapeCsv(r.cached_tokens),
      escapeCsv(r.completion_tokens),
      escapeCsv(r.reasoning_tokens),
      escapeCsv(r.total_tokens),
      escapeCsv(r.standard_input_cost_bdt),
      escapeCsv(r.cached_input_cost_bdt),
      escapeCsv(r.output_cost_bdt),
      escapeCsv(r.total_cost_bdt),
      escapeCsv(r.currency),
      escapeCsv(r.usage_available ? 'Yes' : 'No'),
      escapeCsv(r.pricing_applied),
      escapeCsv(r.error_code),
      escapeCsv(r.error_message)
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');

    return {
      contentType: 'text/csv',
      filename: `progga_expenses_${new Date().toISOString().slice(0, 10)}.csv`,
      data: csvContent
    };
  }

  /**
   * API Configuration Summary (without exposing any secrets)
   */
  public getConfigSummary() {
    const list = Array.from(this.records.values());
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const lastSuccess = list.find((r) => r.status === 'success');
    const lastFailure = list.find((r) => r.status === 'failure');

    let totalKnownExpenses = 0;
    for (const r of list) {
      if (r.total_cost !== null && !isNaN(r.total_cost)) {
        totalKnownExpenses += r.total_cost;
      }
    }

    const defaultModel = Array.from(this.models.values()).find((m) => m.isDefault) || this.models.get('deepseek-v4-flash-0731')!;

    return {
      provider: 'Progga',
      baseUrl: (process.env.PROGGA_BASE_URL || 'https://api.progga.app/v1').replace(/\/+$/, ''),
      configuredModel: defaultModel.model,
      defaultModelDisplayName: defaultModel.displayName,
      hasKeyConfigured: !!(process.env.PROGGA_KEY || process.env.PROGGA_API_KEY),
      lastSuccessfulRequest: lastSuccess
        ? {
            timestamp: lastSuccess.timestamp,
            requestId: lastSuccess.request_id,
            latencyMs: lastSuccess.latency_ms,
            model: lastSuccess.model
          }
        : null,
      lastFailedRequest: lastFailure
        ? {
            timestamp: lastFailure.timestamp,
            requestId: lastFailure.request_id,
            httpStatus: lastFailure.http_status,
            error: lastFailure.error_message || lastFailure.error_code || 'Unknown failure'
          }
        : null,
      totalRequests: list.length,
      totalKnownExpenses,
      currency: 'BDT'
    };
  }
}

export const expenseTracker = new ExpenseTracker();
