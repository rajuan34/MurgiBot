# 🐔 Bohurupi Core (Advanced Sentient AI Discord Bot)

**Bohurupi Core** is an autonomous, highly sentient digital character (Discord Bot) powered by a robust AI processing pipeline. It is not just a standard QA chatbot—it possesses an organic architecture that includes memory retention, emotional state simulation, identity shifting, and multi-provider AI resilience.

Engineered with a unique **"lazy, sarcastic, Gen-Z Banglish"** persona, Bohurupi complains about being woken up, plays games, roasts users, and throws random tantrums. This repository includes both the **Discord Bot Backend (Node.js)** and a **Real-Time Admin Dashboard (React + Tailwind)**.

---

## 🌟 What is Bohurupi?
Bohurupi is designed to act like a real, slightly unhinged server member. It features:
- **Autonomous Activity:** Can send scheduled messages without user prompts (e.g., waking up in the afternoon, complaining about sleep).
- **Banglish Mastery:** Speaks in authentic, raw Banglish (Bengali written in the English alphabet) mixed with modern slang.
- **Contextual Awareness:** Remembers previous conversations and adapts its mood based on the chat's toxicity or friendliness.
- **Savage Commands:** Offers highly interactive roleplay commands like holding court trials or street fights.

---

## 🛠️ Core Architecture & Engines

### 🧠 1. Bohurupi Brain Engine
The central orchestrator that glues Memory, Emotion, Identity, and AI Providers into a single organic pipeline. Every incoming message passes through the Brain to evaluate the current state before generating a response.

### 🛡️ 2. Multi-Provider Resilience (Circuit Breaker)
Ensures maximum uptime by cascading through multiple AI providers if one goes down or rate-limits:
- **Primary:** `Cloud-OpenRouter` (e.g., DeepSeek / Claude / Llama variants).
- **Secondary:** `Google-Gemini-3.5-Flash` (Fast, native Google GenAI SDK integration).
- **Tertiary:** `Nemotron-Lightning-Free` (Used for extremely short, fast, lazy refusal fallbacks).
- **Fallback:** `Simulated Dummy` (Prevents total system crashes with hardcoded system-overload messages).

### ❤️ 3. Emotion Engine
Evaluates conversations to dynamically shift Bohurupi's mood. It analyzes keywords and sentiment to trigger states like:
- 😴 `Sleepy`
- 😈 `Chaos`
- 🎮 `Competitive`
- 😒 `Annoyed`
- 💖 `Affectionate`

### 💾 4. Memory Node
- **Short-Term Memory:** Retains the context of the last few messages in a rolling window to maintain conversational flow.
- **Long-Term Memory:** Synthesizes facts about users (e.g., "User X loves biryani", "User Y always loses fights") to make conversations feel organic and continuous over months.

### 🎭 5. Identity Manager
Dynamically switches Discord bot profiles/avatars and bios based on the current emotional state (respecting Discord's strict rate limits for profile updates).

---

## 🎮 Interactive Discord Commands

Bohurupi features several hardcoded mini-games and roleplay commands that utilize structured AI outputs (Regex Parsed) for highly formatted, cinematic Discord messages.

| Command | Description |
| :--- | :--- |
| `!court [@user]` | Puts a user on trial for a hilarious fake crime with a bizarre penalty. |
| `!fight [@user]` | Initiates a street fight, generating absurd knockout moves and savage Banglish trash talk. |
| `!biryani_roulette [@user]` | A game of luck where the user finds out what terrible inedible item they got in their biryani instead of meat. |
| `!bully [@user]` | Generates a savage, personalized roast for the targeted user. |
| `!hype [@user]` | Aggressively praises and hypes up the targeted user in maximum energy mode. |
| `!expose [@user]` | Makes up a completely fake, embarrassing secret about the user. |
| `!predict` | Gives a completely unhinged, chaotic prediction about your future. |
| `!roast_chat` | Scans the vibe of the server and insults the entire chat collectively. |

*(Note: Command execution is strictly restricted to designated Server Owners / Creators).*

---

## 🎛️ Admin Control Dashboard

Served on the root URL (`http://localhost:3000`), the sleek React-based admin panel allows creators to monitor the bot's internal state.
- **System Telemetry:** View Uptime, Memory Usage, and API Latency.
- **Live Memory Stream:** See what Bohurupi is committing to Short-Term and Long-Term memory in real-time.
- **Emotion State:** Track the bot's current mood.
- **Thought Injection:** Manually override the bot's prompt or force a specific response without typing in Discord.

---

## ⚙️ Configuration (Environment Variables)

Rename `.env.example` to `.env` and configure the following variables:

```env
# AI Providers
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
OPENROUTER_API_KEY="YOUR_OPENROUTER_API_KEY"

# Discord Configuration
DISCORD_TOKEN="YOUR_DISCORD_BOT_TOKEN"
DISCORD_CLIENT_ID="YOUR_CLIENT_ID"
DISCORD_OWNER_IDS="123456789,987654321" # Comma-separated Discord User IDs

# Application Settings
APP_URL="http://localhost:3000"

# Auto-Reply Scheduler (Cron)
TIMEZONE="Asia/Dhaka"
SCHEDULE_1="15:30"
SCHEDULE_2="22:30"
```

---

## 🚀 Installation & Local Setup

### Prerequisites
*   **Node.js** (v18 or higher)
*   **Discord Bot Token** (Create a bot via [Discord Developer Portal](https://discord.com/developers/applications) and enable **Message Content Intent**)

### Steps
1. **Clone the repository.**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Setup `.env`** (See Configuration section above).
4. **Run in Development Mode:**
   ```bash
   npm run dev
   ```
   *The server will start on `http://localhost:3000`, spinning up both the Express API and Vite React frontend.*
5. **Build & Run for Production:**
   ```bash
   npm run build
   npm start
   ```

---

## 💻 Server & Hosting Recommendations

For production deployment, standard Cloud platforms are recommended.

- **Platform:** Google Cloud Run, Render, Railway, or a basic VPS (DigitalOcean Droplet / Hetzner CX11).
- **Specs:** 1 vCPU, 1 GB RAM (2 GB Recommended) is more than enough since the heavy AI processing is offloaded to Cloud-OpenRouter and Gemini.
- **Storage:** 10 - 20 GB SSD.
- **Networking:** Ensure port `3000` is exposed.

*(Note: If you decide to re-enable local Ollama fallback in the codebase, you will require at least 4 vCPUs and 16GB RAM for local model execution).*

---

## 🏗️ Code Structure Overview

- `/server.ts`: The main Express server entry point, binding the AI Core and serving the compiled React frontend.
- `/src/backend/core/BohurupiBrain.ts`: The central nervous system orchestrating all modules.
- `/src/backend/discord/DiscordService.ts`: Handles the Discord.js client, message events, and command regex parsing.
- `/src/backend/emotion/`: Sentiment analysis and state mapping.
- `/src/backend/identity/`: Dynamic profile/bio switching logic.
- `/src/backend/memory/`: Context window management and persistence logic.
- `/src/backend/providers/`: The Provider Manager implementing the Circuit Breaker pattern across multiple LLM endpoints.
- `/src/components/`, `/src/pages/`: Frontend React components for the Admin Dashboard.

---

## 🛡️ License

Private / Proprietary. Created specifically for the Bohurupi AI project.
