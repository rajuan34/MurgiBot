# 06. Memory & Storage (`MemoryEngine.ts`)

`src/backend/memory/MemoryEngine.ts` implements a dual-tier persistence architecture. It enables Bohurupi to maintain short-term conversational context across Discord interactions and long-term user memories over months, while maintaining local disk fallbacks if PostgreSQL is unavailable.

---

## 1. Dual-Tier Memory Architecture

```
                    [ MemoryEngine ]
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
 [ Tier 1: Short-Term Memory ]       [ Tier 2: Long-Term Memory ]
 (Rolling window of 10 messages)    (Synthesized facts & profiles)
 - In-memory Map<userId, Msg[]>     - PostgreSQL Table: bohurupi_long_term_facts
 - PostgreSQL Table:                - In-memory Map<userId, Fact[]> fallback
   bohurupi_temp_memory
```

---

## 2. Database Schema (PostgreSQL)

When `DATABASE_URL` is provided, `MemoryEngine` automatically bootstraps three relational tables:

```sql
-- 1. Temporary Conversational Context Table
CREATE TABLE IF NOT EXISTS bohurupi_temp_memory (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    role VARCHAR(16) NOT NULL, -- 'user' | 'bohurupi'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_temp_memory_user ON bohurupi_temp_memory(user_id);

-- 2. Long-Term Facts & Synthesized Context Table
CREATE TABLE IF NOT EXISTS bohurupi_long_term_facts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    fact TEXT NOT NULL,
    confidence NUMERIC DEFAULT 1.0,
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_long_term_facts_user ON bohurupi_long_term_facts(user_id);

-- 3. System Configuration Table
CREATE TABLE IF NOT EXISTS bohurupi_system_config (
    key VARCHAR(64) PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Fallback Mechanisms (Zero DB Dependency)

If PostgreSQL is down or `DATABASE_URL` is omitted:
1. **Memory Storage:** Reverts seamlessly to `Map<string, ShortTermMessage[]>` and `Map<string, LongTermFact[]>`.
2. **System Configurations (`getSystemConfig` / `setSystemConfig`):** Persists configuration keys (e.g. `provider_config`, `bot_paused_state`) to `data/config.json` on disk using atomic Node.js `fs/promises`.

---

## 4. Key Functions Reference

### `addShortTermMessage(userId: string, role: 'user' | 'bohurupi', text: string): Promise<void>`
- Commits a message to short-term memory.
- If PostgreSQL is active: Inserts into `bohurupi_temp_memory`.
- If memory fallback is active: Pushes to in-memory array, slicing to maintain `MAX_CONTEXT_MESSAGES = 10`.

### `getShortTermMessages(userId: string): Promise<{ role: 'user' | 'assistant'; content: string }[]>`
- Retrieves the last 10 messages for the specified user.
- Formats them into LLM-compatible format: `{ role: 'user' | 'assistant', content: string }`.

### `addLongTermFact(userId: string, fact: string, confidence: number = 1.0): Promise<void>`
- Records synthesized facts about the user (e.g. "User loves spicy biryani", "User lost 5 court trials").

### `getLongTermContext(userId: string): Promise<string>`
- Concatenates user facts into a formatted markdown string injected into the system prompt:
  ```
  USER FACTS:
  - User loves spicy biryani
  - User lost 5 court trials
  ```

### `cleanupExpiredData(): Promise<void>`
- Autonomous garbage collector executed every 60 minutes (`setInterval(..., 60 * 60 * 1000).unref()`).
- Deletes rows from `bohurupi_temp_memory` older than **7 days**:
  ```sql
  DELETE FROM bohurupi_temp_memory WHERE created_at < NOW() - INTERVAL '7 days'
  ```

### `getStats(): Promise<{ shortTermCount: number; longTermFactsCount: number; databaseStatus: string }>`
- Returns real-time memory metrics for the Admin Dashboard.
