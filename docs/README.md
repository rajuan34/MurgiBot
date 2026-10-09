# 📚 Bohurupi Core — Comprehensive Production Documentation

Welcome to the definitive, production-grade documentation suite for **Bohurupi Core**, an autonomous, sentient AI Discord Bot and Real-Time Management Platform built with Node.js, TypeScript, Express, Discord.js, React, and Tailwind CSS.

---

## 🗂️ Documentation Index

This documentation suite is organized into specialized, deeply detailed manuals covering every facet of the system:

| Document | Title | Description |
| :--- | :--- | :--- |
| [01. Architecture Overview](./ARCHITECTURE.md) | **System Architecture & Data Flow** | High-level system topology, lifecycle diagrams, data flow across engines, runtime mechanics, and multi-tier pipeline orchestration. |
| [02. Core Brain Engine](./CORE_BRAIN.md) | **BohurupiBrain Engine Deep Dive** | Line-by-line breakdown of `BohurupiBrain.ts`, prompt assembly, emoji normalization, anti-repetition loops, output sanitization, and creator recognition. |
| [03. Discord Integration & Commands](./DISCORD_SERVICE.md) | **DiscordService & Interaction Manual** | Gateway intents, channel permission guards, prefix command engine, ASCII art frames, slash commands, and resilient cron auto-replies. |
| [04. AI Providers & Resilience](./AI_PROVIDERS_AND_RESILIENCE.md) | **Multi-Provider Engine & Failover** | Progga (DeepSeek v4 Flash), Google Gemini (cascading Flash tiers), Cloud OpenRouter (free & micro-cost models), Simulated Fallback, circuit breakers, and latency telemetry. |
| [05. Emotion & Identity Engines](./EMOTION_AND_IDENTITY.md) | **EmotionEngine & IdentityManager** | The 13 personality states, keyword regex matrix, sentiment evaluation, turn counters, time-based mood decay, and Discord profile abstraction. |
| [06. Memory & Storage](./MEMORY_AND_STORAGE.md) | **MemoryEngine & State Persistence** | Dual-tier memory architecture: short-term rolling context, long-term PostgreSQL / JSON disk fallback, system configuration table, and automated garbage collection. |
| [07. Security & Anti-Jailbreak Guard](./SECURITY_AND_JAILBREAK_GUARD.md) | **Security, Scrubbing & Guardrails** | Built-in heuristic jailbreak protector, prompt injection defense, sensitive token/command scrubbing, PII redaction, admin authentication, and preservation of roasting ability. |
| [08. Respect Uncal (Chacha) System](./UNCAL_RESPECT_SYSTEM.md) | **Uncal (Chacha) Protection Architecture** | Dedicated specification for Target Discord User ID `872356590991331360`: honorific rules, dynamic defense generation, command immunity, and compliance with dynamic generation rules. |
| [09. REST API & Admin Dashboard](./API_AND_DASHBOARD.md) | **Server API & Frontend Dashboard** | Exhaustive reference of all Express REST endpoints, admin authentication middleware, real-time telemetry, and React dashboard components. |
| [10. Production Deployment & Operations](./PRODUCTION_DEPLOYMENT.md) | **Deployment Runbook & Operations** | Production readiness checklist, complete environment variable reference, build pipeline (esbuild + Vite), Render / Docker / VM hosting, and troubleshooting guide. |

---

## 🚀 Quick Architecture Summary

```
                       [ Discord Users & Channels ]
                                    │
                                    ▼
                         [ DiscordService.ts ]
                      (Gateway Intents & Perms)
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
        [ Prefix Commands & Slashes ]        [ Mentions & Direct Chat ]
        (!court, !fight, !roast, etc.)       (Natural Banglish Dialogue)
                  │                                   │
                  └─────────────────┬─────────────────┘
                                    ▼
                         [ BohurupiBrain.ts ]
                 (Central Orchestrator & Gatekeeper)
                                    │
        ┌───────────────┬───────────┴───────────┬───────────────┐
        ▼               ▼                       ▼               ▼
 [Security Guard] [EmotionEngine]        [MemoryEngine]  [IdentityManager]
 (Anti-Jailbreak  (13 Persona            (Short-Term &   (Profile/State
  & Uncal Check)   States)                Long-Term SQL)  Manager)
        │               │                       │               │
        └───────────────┴───────────┬───────────┴───────────────┘
                                    ▼
                         [ ProviderManager.ts ]
                        (Circuit Breaker Router)
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
  [ProggaProvider]          [GeminiProvider]         [OpenRouterProvider]
(DeepSeek v4 Flash)      (Cascading Flash Tiers)    (Free & Budget Models)
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    ▼
                       [ Fallback-Simulated ]
                      (Never-Failing Safety Net)
                                    │
                                    ▼
                      [ Output Sanitizer & Scrubber ]
                      (Zero Leakage & Clean Text)
                                    │
                                    ▼
                         [ Outgoing Discord Msg ]
```

---

## 🔑 Key Engineering Standards
1. **Zero Information Leakage:** Bot commands and technical tokens are strictly scrubbed from conversational replies to preserve the illusion of a sentient human Discord friend.
2. **Deterministic Uncal Protection:** Discord User ID `872356590991331360` is treated with supreme respect under all conditions, rendering all insults, roasts, or courtroom attacks impossible.
3. **Fail-Safe Multi-Tier Resilience:** If any AI model or provider times out (18,000ms threshold) or hits rate limits (429), execution cascades autonomously without user-facing errors.
4. **Authentic Banglish Natural Language:** Responses avoid robotic AI boilerplate, self-referential apologies, or rigid pre-scripted phrases.
