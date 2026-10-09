# 09. REST API & Admin Dashboard

Bohurupi Core includes a full-featured Express HTTP API alongside a real-time React + Tailwind administrative dashboard served on the root port (`http://localhost:3000`).

---

## 1. REST API Reference

All `/api/*` administrative endpoints are secured by the `adminAuth` middleware using the `x-admin-password` header or `admin_password` query parameter.

### Health & System Telemetry

#### `GET /health` or `GET /api/health`
- **Auth:** None (Public).
- **Description:** Returns service health, uptime, and Node.js process heap memory.
- **Sample Response:**
  ```json
  {
    "status": "ok",
    "service": "Bohurupi AI Core Engine",
    "uptimeSeconds": 14205,
    "memoryMB": { "rss": 74, "heapUsed": 42, "heapTotal": 68 },
    "timestamp": "2026-10-09T13:10:00.000Z"
  }
  ```

#### `GET /api/system/metrics`
- **Auth:** Required.
- **Description:** Collects OS-level CPU percentage, core counts, load averages, and free memory via `systemMetrics.ts`.

#### `GET /api/system/tasks`
- **Auth:** Required.
- **Description:** Returns the active background tasks list (`activeTasks`).

#### `GET /api/system/ip` or `GET /api/ip`
- **Auth:** Required.
- **Description:** Returns the outbound server IP address for IP-allowlisting with AI providers (e.g. Progga API).

---

### Core State & Interactivity

#### `GET /api/state`
- **Auth:** Required.
- **Description:** Aggregates current snapshot of Identity, Providers, Emotion, Memory, and Discord connectivity.
- **Sample Response:**
  ```json
  {
    "identity": "playful",
    "providers": [ ... ],
    "emotion": "Playful",
    "memory": { "shortTermCount": 10, "longTermFactsCount": 42, "databaseStatus": "connected" },
    "discord": { "connected": true, "isPaused": false, "botTag": "Bohurupi#1234" }
  }
  ```

#### `POST /api/interact`
- **Auth:** Required.
- **Description:** Directly injects a message into `BohurupiBrain.processInteraction()`. Used by the Dashboard live chat tester.
- **Payload:**
  ```json
  { "message": "ki obostha bro?", "userId": "web-admin-id" }
  ```
- **Response:**
  ```json
  { "success": true, "text": "shob calm ase bhai, tor ki khobor? 💀" }
  ```

#### `POST /api/bot/mood` (Aliases: `/api/bot/emotion`, `/api/emotion/set`)
- **Auth:** Required.
- **Description:** Overrides Bohurupi’s current emotional state.
- **Payload:** `{ "mood": "Chaos" }`

---

### AI Providers & Circuit Breaker Management

#### `GET /api/providers/config`
- **Auth:** Required.
- **Description:** Returns current priority order and enabled status for all providers.

#### `POST /api/providers/config` or `POST /api/providers/settings`
- **Auth:** Required.
- **Description:** Updates priority and enabled state, saving configuration to database or disk config.
- **Payload:**
  ```json
  {
    "config": [
      { "name": "Progga", "enabled": true, "priority": 0 },
      { "name": "Google-Gemini", "enabled": true, "priority": 1 },
      { "name": "Cloud-OpenRouter", "enabled": true, "priority": 2 }
    ]
  }
  ```

#### `GET /api/providers/resilience`
- **Auth:** Required.
- **Description:** Returns detailed circuit breaker status, total requests, success rates, average latencies, and active cascading models.

#### `POST /api/providers/reset-circuit`
- **Auth:** Required.
- **Description:** Resets consecutive failure counter for a tripped provider, re-enabling it.
- **Payload:** `{ "providerName": "Google-Gemini" }`

#### `POST /api/providers/test`
- **Auth:** Required.
- **Description:** Sends a dry-run prompt (`"oi"`) to test an individual provider's connectivity.

#### `GET /api/calls`
- **Auth:** Required.
- **Description:** Returns the last 100 LLM API call telemetry records (timestamps, latencies, statuses, error details).

---

### Discord Bot Controls

#### `POST /api/discord/pause` (Alias: `/api/bot/pause`)
- **Auth:** Required.
- **Description:** Pauses Discord bot activity. All incoming messages and mentions are silently ignored, and rich presence is set to `⏸️ Activity Paused by Admin`.

#### `POST /api/discord/resume` (Alias: `/api/bot/resume`)
- **Auth:** Required.
- **Description:** Resumes Discord bot activity.

#### `POST /api/discord/toggle-pause`
- **Auth:** Required.
- **Description:** Toggles bot between active and paused states.

#### `POST /api/discord/trigger-schedule`
- **Auth:** Required.
- **Description:** Manually triggers the autonomous scheduled auto-reply cron task.

#### `POST /api/discord/standby`
- **Auth:** Required.
- **Description:** Destroys Discord client session and puts bot into standby mode.

#### `GET /api/logs`
- **Auth:** Required.
- **Description:** Returns the last 300 Winston server log entries.

---

## 2. Frontend React Dashboard Architecture

The dashboard is built with **React 19**, **Tailwind CSS v4**, and **Lucide React** icons.

```
src/Dashboard.tsx (Main Shell)
├── Sidebar.tsx                # Tab navigation & status indicators
├── OverviewView.tsx           # Health metrics, quick stats, live chat tester
├── AIEngineView.tsx           # Drag-and-drop provider priorities & testing
├── ProviderResilience.tsx     # Circuit breaker diagnostics & failure analytics
├── APILogsView.tsx            # Live table of recent LLM API calls with latencies
├── LogsView.tsx               # Real-time console log viewer with level filtering
├── TasksView.tsx              # Background task telemetry viewer
└── MoodIndicator.tsx          # Animated mood badge with state description
```

### Authentication Flow:
- When the dashboard loads, it checks `localStorage.getItem('admin_password')`.
- If the backend returns `401 Unauthorized`, an authentication modal prompts for the admin password, storing it in `localStorage` upon submission.
