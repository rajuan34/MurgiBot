# 01. System Architecture & Data Flow

This document outlines the architectural topology, component boundaries, execution flow, and operational mechanics of the **Bohurupi Core** platform.

---

## 1. System Philosophy & Objectives

Bohurupi Core is designed not as a generic corporate chatbot, but as an **organic digital persona**:
1. **Sentient Member Persona:** Operates on Discord with authentic slang, emotional shifts, unpredictable wit, and proactive banter.
2. **Deterministic Security:** Protects creator credentials, bot tokens, internal prompt structure, and database integrity via deterministic multi-layer heuristics.
3. **High-Resilience Multi-Provider Topology:** Connects to multiple LLM backends (Progga / DeepSeek, Google Gemini, Cloud OpenRouter) with autonomous circuit breakers and cascading fallbacks.
4. **Hierarchical Respect Matrix:** Recognizes primary creators (Leably / Zabir) as "Father" (Abba), co-creator (Rajuan) as "Co-Creator", and specific Discord ID `872356590991331360` as "Uncal" (Chacha), adhering strictly to unconditional respect rules.

---

## 2. Global Component Topology

```
+-----------------------------------------------------------------------------+
|                               DISCORD GATEWAY                               |
|                         (WebSocket Events: Shards)                          |
+-----------------------------------------------------------------------------+
                                      │
                                      ▼
+-----------------------------------------------------------------------------+
|                            DISCORD SERVICE LAYER                            |
|  - Channel Permission Validator                                             |
|  - Channel Allow-List Filter (705092446366728236, 1453357071931019304, etc.) |
|  - Prefix Command Router (!court, !fight, !roast, !biryani_roulette, etc.)  |
|  - Interaction Handler (/slash commands)                                    |
|  - Scheduled Auto-Reply Cron Service (node-cron @ Asia/Dhaka)               |
+-----------------------------------------------------------------------------+
                                      │
                                      ▼
+-----------------------------------------------------------------------------+
|                            BOHURUPI BRAIN ENGINE                            |
|  - normalizeIncomingEmojis(): Discord custom emoji -> semantic unicode      |
|  - detectJailbreakOrHarmfulInput(): Heuristic anti-jailbreak parser         |
|  - Uncal Protection Interceptor: ID 872356590991331360 gatekeeper          |
|  - Conversational Command Interceptor: Blocks command leaks in casual chat |
|  - Priority Override & Persona Directives Builder                          |
|  - System Instruction Assembly (behavior.md + Directives)                   |
|  - stripParrotingEcho(): Eliminates repetitive prompt reflection            |
|  - isRepetitiveResponse(): Jaccard & 3-gram anti-cliché detection           |
|  - sanitizeOutgoingText() & scrubSensitiveInformation(): Leak scrubber     |
+---------------------+-------------------+---------------------+-------------+
                      │                   │                     │
                      ▼                   ▼                     ▼
              +---------------+   +---------------+   +-------------------+
              | EMOTION ENGINE|   | MEMORY ENGINE |   | IDENTITY MANAGER  |
              | 13 Moods      |   | - Short-Term  |   | Profile/State     |
              | Keyword Regex |   |   (Rolling 10)|   | Abstraction       |
              | Time Decay    |   | - Long-Term   |   | (Rate-limited)    |
              | Turn Decay    |   |   (PostgreSQL)|   |                   |
              +---------------+   +---------------+   +-------------------+
                                          │
                                          ▼
+-----------------------------------------------------------------------------+
|                           PROVIDER RESILIENCE LAYER                         |
|  - Circuit Breakers (Per-Provider Failure Counters & Auto-Tripping)         |
|  - Race Condition Timeout Protection (18,000ms safety limit)                |
|  - Priority Sorting & Dynamic Admin Re-ordering                             |
+-----------------------------------------------------------------------------+
         │                              │                             │
         ▼                              ▼                             ▼
+------------------+          +-------------------+         +-----------------+
| PROGGA PROVIDER  |          |  GEMINI PROVIDER  |         |   OPENROUTER    |
| DeepSeek v4      |          | Cascading Flash:  |         |   PROVIDER      |
| Flash (0731)     |          | - gemini-2.5-flash|         | OpenRouter/free |
| Base URL:        |          | - gemini-2.0-flash|         | Nemotron Free   |
| api.progga.app   |          | - gemini-1.5-flash|         | Micro-cost tier |
+------------------+          +-------------------+         +-----------------+
         │                              │                             │
         └──────────────────────────────┼─────────────────────────────┘
                                        ▼
+-----------------------------------------------------------------------------+
|                         FALLBACK-SIMULATED PROVIDER                         |
|  Deterministic, offline-safe Banglish persona generator that never fails   |
+-----------------------------------------------------------------------------+
                                        │
                                        ▼
+-----------------------------------------------------------------------------+
|                          OUTGOING SANITIZATION GATE                         |
|  - Numerical snowflake ID redactor (17-20 digit check)                      |
|  - Technical credential redactor (API keys, DB URLs, passwords)             |
|  - Command syntax scrubber (!/ triggers & lists)                            |
|  - Respectful Uncal honorific validator ("Uncal" / "Chacha" injector)       |
+-----------------------------------------------------------------------------+
                                        │
                                        ▼
                              [ DISCORD CHANNEL ]
```

---

## 3. Directory Structure & File Map

```
/
├── package.json                   # Dependency definitions, build/dev/lint scripts
├── server.ts                      # Universal production & development bootstrapper
├── vite.config.ts                 # Frontend bundling config with Tailwind v4
├── behavior.md                    # Core persona matrix, rules of engagement, and prompt
├── AGENTS.md                      # Bot response generation rules (dynamic outputs only)
├── .env.example                   # Environment variable templates
├── data/                          # Persistent local storage for file-fallback configs
├── src/
│   ├── main.tsx                   # React client entrypoint
│   ├── App.tsx                    # React client router & shell
│   ├── Dashboard.tsx              # Main administrative telemetry dashboard
│   ├── index.css                  # Tailwind CSS import
│   ├── pages/
│   │   ├── Commands.tsx           # Web catalog of Discord commands
│   │   ├── PrivacyPolicy.tsx      # Privacy policy documentation page
│   │   └── TermsOfService.tsx     # Terms of service documentation page
│   ├── components/
│   │   ├── LandingPage.tsx        # Public landing overview
│   │   └── dashboard/
│   │       ├── Sidebar.tsx        # Navigation sidebar
│   │       ├── OverviewView.tsx   # System health, live chat, metrics
│   │       ├── AIEngineView.tsx   # Model selection & priority configuration
│   │       ├── ProviderResilience.tsx # Detailed circuit breaker statistics
│   │       ├── TasksView.tsx      # Background task telemetry
│   │       ├── LogsView.tsx       # Live Winston log stream
│   │       ├── APILogsView.tsx    # Live LLM API call telemetry & latency table
│   │       └── MoodIndicator.tsx  # Dynamic mood badge indicator
│   └── backend/
│       ├── serverApp.ts           # Express HTTP API & server orchestration
│       ├── core/
│       │   └── BohurupiBrain.ts   # Core AI orchestration, sanitization, Uncal logic
│       ├── discord/
│       │   └── DiscordService.ts  # Discord.js client, commands, cron scheduler
│       ├── emotion/
│       │   └── EmotionEngine.ts   # 13 personality states, emotion triggers, decay
│       ├── identity/
│       │   └── IdentityManager.ts # Profile & presence state representation
│       ├── memory/
│       │   └── MemoryEngine.ts    # Short-term rolling memory & PostgreSQL storage
│       ├── providers/
│       │   ├── ProviderManager.ts # Multi-provider failover & circuit breaker engine
│       │   ├── ProggaProvider.ts  # DeepSeek v4 Flash integration via Progga API
│       │   ├── GeminiProvider.ts  # Google GenAI SDK with cascading flash failover
│       │   └── OpenRouterProvider.ts # OpenRouter free and micro-cost provider
│       └── telemetry/
│           ├── logger.ts          # Winston logger with PII scrubbing & memory ring
│           └── systemMetrics.ts   # Real-time CPU, RAM, and load metrics collector
└── docs/                          # Comprehensive production documentation suite
```

---

## 4. Execution Flow: Incoming Message Lifecycle

When a Discord message arrives, it undergoes the following strict pipeline:

```
[Incoming Discord Message]
          │
          ▼
1. Bot Filter: Ignore if message.author.bot === true
          │
          ▼
2. Admin Pause Check: If discordService.isPaused === true -> Drop immediately
          │
          ▼
3. Channel Allow-List Check:
   - Primary Guild (705092446366728233) restricts to #bot-tasting-general (705092446366728236),
     #media (1453357071931019304), #memes (1470329659693600768).
   - Other invited servers permit text channels.
          │
          ▼
4. Command Prefix & Mention Router:
   - If message begins with '!' or mentions bot with a command verb:
     -> Routes to handleCommand(command, args, message)
   - If not a command: Must be a direct bot mention (<@bot>) or direct reply to bot.
          │
          ▼
5. Permission Pre-Flight Guard:
   - Checks bot's permissions in target channel: ViewChannel & SendMessages.
   - If missing: Silently aborts (preventing Discord API 403 Missing Permissions error).
          │
          ▼
6. Emoji Normalization:
   - normalizeIncomingEmojis(): Converts Discord custom emoji tags <:name:id> into semantic
     Unicode emojis so LLMs comprehend emotional nuance without syntax confusion.
          │
          ▼
7. Memory Context Extraction:
   - Fetches short-term memory (last 10 turns) from MemoryEngine.
   - Fetches long-term user facts from PostgreSQL / disk fallback.
          │
          ▼
8. Emotional Evaluation & State Shift:
   - EmotionEngine scans text against 13 mood regex patterns.
   - Sets state (Playful, Chaos, Chill, Curious, Supportive, Wise, etc.).
          │
          ▼
9. Security & Relationship Override:
   - PRIMARY_CREATOR_IDS -> Role: FATHER (Abba), Mood: RESPECTFUL_SON_CALM
   - CO_CREATOR_IDS -> Role: CO_CREATOR, Mood: RESPECTFUL_FRIENDLY
   - UNCAL_USER_ID ('872356590991331360') -> Role: UNCAL, Mood: RESPECTFUL_UNCAL_CALM
   - If other user tries to roast/disrespect Uncal -> Triggers generateDynamicUncalDefense()
   - detectJailbreakOrHarmfulInput() -> Triggers generateDynamicAntiJailbreakRoast()
   - Conversational command query -> Triggers getDiverseDynamicReply()
          │
          ▼
10. System Prompt & Directive Assembly:
    - Injects behavior.md rules.
    - Injects role-specific directives (Son obedience, Uncal respect, Co-creator banter).
    - Injects confidentiality & zero-leakage constraints.
          │
          ▼
11. Provider Execution via ProviderManager:
    - Tries enabled providers in priority order.
    - Enforces 18,000ms race timeout.
    - Catches 429, 401, timeouts -> Cascades to next tier.
    - If all fail -> Invokes Fallback-Simulated provider.
          │
          ▼
12. Anti-Repetition & Anti-Echo Check:
    - stripParrotingEcho() removes user prompt questions echoed back.
    - isRepetitiveResponse() checks Jaccard similarity and 3-word n-grams against last 3 replies.
    - If repetitive -> Re-generates with explicit anti-repetition penalty prompt.
          │
          ▼
13. Sensitive Information & Command Scrubber:
    - scrubSensitiveInformation() scrubs command syntax (!/ words), Discord IDs, API keys.
    - Replaces with safe dynamic reply if contaminated.
          │
          ▼
14. Uncal Honorific Verification:
    - If speaker is Uncal, ensures "Uncal" or "Chacha" is respectfully present.
          │
          ▼
15. Storage & Delivery:
    - Commits interaction to MemoryEngine.
    - Sends message to Discord channel via message.reply() with fallback to channel.send().
```

---

## 5. Background Tasks & Cron Lifecycles

Bohurupi operates asynchronous autonomous background processes:

### A. Auto-Reply Cron Scheduler (`DiscordService.ts`)
- **Configured Times:** Default `15:30` (3:30 PM) and `22:30` (10:30 PM) in `Asia/Dhaka` timezone.
- **Execution:** Randomly picks one channel from allowed list, checks channel permissions, fetches recent user messages.
- **Resilience:** If user messages exist, formulates contextual reply. If chat is quiet, sends spontaneous Banglish conversation starter. If AI fails, uses hardcoded dynamic fallback lines.

### B. Keep-Alive Pinger (`serverApp.ts`)
- On free-tier cloud platforms (e.g., Render), HTTP servers sleep after 15 minutes of inactivity.
- An autonomous interval pings `/api/health` every 14 minutes (`14 * 60 * 1000`) using `RENDER_EXTERNAL_URL` or `APP_URL`.

### C. Database Garbage Collector (`MemoryEngine.ts`)
- Runs every 60 minutes (`60 * 60 * 1000`) using `.unref()`.
- Purges temporary contextual memories older than 7 days from `bohurupi_temp_memory`.
