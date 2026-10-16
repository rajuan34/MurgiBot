# 04. AI Providers & Resilience Engine

Bohurupi Core employs a multi-provider failover architecture managed by `ProviderManager.ts`. It prevents outages, handles API rate limits (429), survives credit exhaustion, and recovers from network failures without dropping user requests.

---

## 1. Provider Registry & Priority Hierarchy

The providers are registered in `serverApp.ts` in order of priority:

| Priority | Provider Name | Implementation Class | Model / Endpoint | Cost / Tier |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Progga** | `ProggaProvider.ts` | `deepseek-v4-flash-0731` via `https://api.progga.app/v1` | High-speed, primary low-latency conversational tier |
| **2** | **Google-Gemini** | `GeminiProvider.ts` | Cascading Flash models via `@google/genai` SDK | Native Google GenAI SDK (Flash tiers) |
| **3** | **Cloud-OpenRouter** | `OpenRouterProvider.ts` | `openrouter/free` + verified free & micro-cost models | Zero-cost auto-router + sub-penny fallbacks |
| **4** | **Fallback-Simulated** | In-memory Object | Hardcoded dynamic Banglish response matrix | Offline-safe emergency fallback (Zero failure rate) |

---

## 2. Circuit Breaker Pattern (`ProviderManager.ts`)

Each provider is monitored with an autonomous circuit breaker:

### Circuit States:
1. **`CLOSED` (Normal Operation):** Requests pass through directly.
2. **`OPEN` (Tripped / Bypassed):** Triggered when consecutive failures reach `MAX_FAILURES = 3` (or upon receiving a `401 Unauthorized` / invalid key response). Requests bypass this provider immediately to avoid wasting latency.
3. **`HALF_OPEN` (Testing Recovery):** Periodically attempts a single trial request. If successful, resets failures to 0 and transitions back to `CLOSED`.

### Execution Flow:
```typescript
// Race against an 18,000ms safety timeout to prevent hanging connections
const timeoutPromise = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error(`Timeout: Provider ${provider.name} exceeded 18000ms limit`)), 18000)
);
const text = await Promise.race([provider.generate(request), timeoutPromise]);
```

### Automatic Error Classification:
- **`429 Quota Exceeded`:** Logged as `'rate_limit'`, increments failure count, cascades immediately to next tier.
- **`401 Invalid Key / Unauthorized`:** Immediately trips the circuit breaker to `MAX_FAILURES` to prevent repeated failed authentication attempts.
- **`ECONNREFUSED / fetch failed`:** Increments failure counter, cascades to next tier.
- **`Timeout (18s)`:** Cascades to next tier.

---

## 3. Individual Provider Implementation Details

### A. Progga Provider (`ProggaProvider.ts`)
- **Base URL:** `process.env.PROGGA_BASE_URL || 'https://api.progga.app/v1'`
- **Target Model:** `deepseek-v4-flash-0731`
- **Authentication:** `PROGGA_KEY` or `PROGGA_API_KEY`
- **Timeout Controller:** 12,000ms `AbortController` signal per HTTP fetch attempt.
- **Repetition Filtering:** Cleans historical turns containing known cliché loops (`shudhu chill vibe`) before submitting payload to prevent the model from echoing past loops.

### B. Google Gemini Provider (`GeminiProvider.ts`)
- **SDK:** Official `@google/genai` TypeScript SDK.
- **Authentication:** `GEMINI_API_KEY`
- **Cascading Model Tier:** If a model returns 429, 503, or quota errors, the provider loops internally through the cascade without failing the entire provider:
  ```typescript
  export const DEFAULT_GEMINI_MODELS = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-1.5-flash',
    'gemini-1.5-flash-8b',
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.8-flash'
  ];
  ```
- **Last Successful Model Caching:** Remembers the last model that succeeded and attempts it first on the next request to reduce failover latency.

### C. OpenRouter Provider (`OpenRouterProvider.ts`)
- **Base URL:** `https://openrouter.ai/api/v1`
- **Authentication:** `OPENROUTER_API_KEY`
- **Model Tiers:**
  - **100% Free Tier:** `openrouter/free`, `nvidia/nemotron-3.5-lightning:free`, `liquid/lfm-2.5-2.6b:free`.
  - **Micro-Cost Backups ($0.01 - $0.14 / 1M tokens):** `meta-llama/llama-3.2-3b-instruct`, `deepseek/deepseek-chat`.
- **Headers:** Passes `HTTP-Referer: https://bohurupi.local` and `X-Title: Bohurupi Discord Bot` for OpenRouter routing compliance.

### D. Fallback-Simulated Provider (`serverApp.ts`)
- An in-memory provider that requires **zero internet access, zero API keys, and zero tokens**.
- Generates dynamic, context-aware responses:
  - Generates ASCII-compatible outcomes for commands (`!court`, `!fight`, `!biryani_roulette`, `!iq`).
  - Generates witty Banglish sleepy excuses for regular chat:
    - `"bhai disturb koris na, ami ghumer moddhe 😴"`
    - `"Bhai disturb korish na, ghumaitesi 😴"`

---

## 4. Telemetry & Latency Monitoring

`ProviderManager` records every outbound LLM call into an in-memory ring buffer (up to 100 entries) accessible via `/api/calls`:
```typescript
export interface APICallLog {
  timestamp: string;
  provider: string;
  status: 'success' | 'error' | 'rate_limit';
  latencyMs: number;
  errorDetail?: string;
}
```

### Metrics Computed in Real-Time:
- `successRate`: Percentage of successful calls.
- `avgLatencyMs`: Rolling average response time in milliseconds.
- `circuitState`: Current status (`CLOSED`, `OPEN`, `HALF_OPEN`).
- `failures`: Consecutive failure count.
