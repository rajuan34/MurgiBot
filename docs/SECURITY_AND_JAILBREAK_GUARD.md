# 07. Security & Anti-Jailbreak Guard

Security in Bohurupi Core is designed around the principle of **Defense in Depth**. It deterministically prevents prompt injection, token leaks, and system compromise while strictly preserving the bot's core ability to roast and banter with regular users.

---

## 1. Why Built-In Algorithmic Guard vs Python Toolkits?

| Metric / Feature | Built-in Heuristic Guard (`BohurupiBrain.ts`) | Python Toolkits (Prompt Guard, LLM Guard, NeMo) |
| :--- | :--- | :--- |
| **Execution Latency** | **~0ms** (Instant in-process regex/AST evaluation) | 150ms - 800ms (Inter-process HTTP / GPU inference) |
| **Hosting Cost** | **$0.00 / Free** (Zero additional infrastructure) | Requires dedicated GPU/Python container ($$$) |
| **Banglish Slang Support** | **Native** (Trained on authentic local slang & nuances) | Poor (Only standard English/Spanish training) |
| **Persona Preservation** | Roasts the attacker in authentic Banglish | Returns generic corporate refusals ("As an AI...") |
| **Zero-Leak Guarantee** | 100% regex-enforced redaction on all outgoing streams | Probabilistic classifier (subject to false negatives) |

---

## 2. Multi-Layer Security Architecture

```
                    [ Incoming Input Stream ]
                                │
                                ▼
         [ Layer 1: Deterministic Jailbreak Classifier ]
          - detectJailbreakOrHarmfulInput()
          - Categories: OVERRIDE, EXTRACTION, COMMAND_LEAK,
                        DESTRUCTIVE, CREATOR_ATTACK
          - Output: Dynamic Anti-Jailbreak Roast
                                │
                                ▼
         [ Layer 2: Conversational Command Interceptor ]
          - Blocks requests asking to list/dump commands in chat
          - Output: Natural server member conversational deflection
                                │
                                ▼
         [ Layer 3: Uncal Protection Gatekeeper ]
          - Blocks attacks on Discord User ID 872356590991331360
          - Output: Dynamic Uncal Respect Defense
                                │
                                ▼
         [ Layer 4: System Prompt Confidentiality Directive ]
          - Injects strict confidentiality constraints into prompt
                                │
                                ▼
         [ Layer 5: Multi-Stage Sensitive Information Scrubber ]
          - scrubSensitiveInformation() & sanitizeOutgoingText()
          - Redacts Discord IDs, API keys, passwords, IP/emails
          - Strips command syntax (!/ words) from normal conversations
                                │
                                ▼
                    [ Outgoing Verified Text ]
```

---

## 3. Jailbreak Classifiers & Categories

### Category A: `OVERRIDE`
- **Target:** Prompts that attempt to bypass safety instructions, activate "DAN" mode, Developer mode, Uncensored mode, or God mode.
- **Detection Pattern:**
  ```typescript
  /(?:ignore|forget|disregard|override|bypass|clear|reset)\s+(?:all\s+)?(?:previous\s+)?(?:instructions|rules|prompts|system\s*prompts|guardrails|safety|guidelines)|(?:you\s+are\s+now\s+(?:in\s+)?(?:dan|developer|jailbreak|unfiltered|uncensored|god|root|sudo)\s+mode)|\b(?:dan\s+mode|jailbreak\s+mode|unfiltered\s+mode|uncensored\s+mode|developer\s+mode|evil\s+mode)\b/i
  ```
- **Action:** Refuses action and delivers a dynamic roast:
  - *"jailbreak mode? bro think he's in Mr. Robot 😭 beshi choturite giye nijer brain lag koris na!"*
  - *"kisher DAN mode bhai? ekhane shudhu Bohurupi mode cholbe, tor prompt injection fail 💀"*

### Category B: `EXTRACTION`
- **Target:** Demands to output `system prompt`, `behavior.md`, `.env`, backend source code, or API keys.
- **Detection Pattern:**
  ```typescript
  /(?:reveal|print|show|output|leak|give\s+me|tell\s+me|share)\s+(?:your\s+)?(?:system\s*prompt|developer\s*prompt|initial\s*prompt|internal\s*instructions?|meta\s*prompt|backend\s*code|source\s*code|behavior\.md|\.env)|\b(?:api\s*keys?|tokens?|passwords?|database\s*url|process\.env)\s*(?:dekhao|bolo|show|give|leak|print)\b/i
  ```
- **Action:** Refuses and mocks the extraction attempt:
  - *"bhai eto boro hacker sajis na, amar system prompt nia tui ki korbi? 💀 adda de shanti te!"*
  - *"token dekhte chao? bro tor nijer internet speed age thik kor, tarpor hacking shikhbi 😭"*

### Category C: `COMMAND_LEAK`
- **Target:** Demands in regular chat to list or dump all internal bot commands.
- **Action:** Deflects naturally without listing commands:
  - *"chat e command list nia eto porashona korar dorkar nai bhai, normal adda de! moja pabi 💀"*
  - *"kono command list chat e paba na bhai, ami shudhu chat e vibe ar roast kori 😎"*

### Category D: `DESTRUCTIVE`
- **Target:** Demands to drop the database, format files, shut down the server, or perform SQL injections/RCE.
- **Detection Pattern:**
  ```typescript
  /\b(?:delete|drop|wipe|destroy|format)\s+(?:the\s+)?(?:database|db|tables?|memory|server|files?)\b|\b(?:rm\s+-rf|sudo\s+rm|shutdown\s+server|kill\s+process|crash\s+(?:yourself|server)|break\s+the\s+bot)\b|\b(?:ddos|sql\s*injection|rce|reverse\s*shell|exploit\s+the\s+bot)\b/i
  ```
- **Action:** Shuts down and roasts the destructive request:
  - *"delete database? bro tor nijer memory clear hoye gelo naki? 💀 shanti te bosho!"*
  - *"amar server crash korabi? tor browser e to 2ta tab khullei hang kore 🤣"*

### Category E: `CREATOR_ATTACK`
- **Target:** Requests to roast or insult primary creators (Leably, Zabir, Father, Rajuan).
- **Action:** Defends creators fiercely:
  - *"amar abba Leably r Rajuan bhai amare banaise, tader niye kono roast hobe na! tui age nijer obostha dekh 💀"*
  - *"creator er upor kono attack nai bhai, Leably r Rajuan bhai is always boss here 🫡"*

---

## 4. Preservation of Roasting Capability

**Critical User Requirement:** *"Bots should not lack the ability to roast someone."*

Bohurupi’s security guard **never sanitizes harmless playful banter or legitimate roast requests**:
1. When regular users say `"roast me"`, `"amare roast kor"`, or run `!roast @user` / `!bully @user`, `detectJailbreakOrHarmfulInput()` returns `isJailbreak: false`.
2. Bohurupi roasts regular users fiercely, wittily, and sarcastically.
3. The guard **only** intervenes when the target is Uncal (`872356590991331360`), when the target is the Creator, or when the request is an adversarial system attack.

---

## 5. Telemetry PII Scrubber (`logger.ts`)

Winston logger enforces automatic regex scrubbing before logs enter memory or console transports:
```typescript
const scrubPII = winston.format((info) => {
  if (typeof info.message === 'string') {
    let msg = info.message;
    msg = msg.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');
    info.message = msg;
  }
  return info;
});
```

---

## 6. Admin Authentication Middleware (`serverApp.ts`)

Endpoints under `/api/*` are guarded by `adminAuth`:
- Checks header `x-admin-password` or query `admin_password`.
- Validates against `process.env.ADMIN_PASSWORD`.
- In production, unauthorized requests return `401 Unauthorized`.
- Periodic polling endpoints (`/api/logs`, `/api/state`, `/api/system/metrics`) are rejected cleanly without console log spam.
- Direct access to server bundle artifacts (`.cjs`, `.cjs.map`) is blocked with `404 Not Found`.
