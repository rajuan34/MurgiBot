# 🐔 Murgi AI Core

**Murgi AI Core** is an autonomous, highly sentient digital character (Discord Bot) powered by a robust AI processing pipeline. It is not just a chatbot—it possesses an organic architecture including memory retention, emotional state simulation, identity shifting, and multi-provider AI resilience.

This repository includes both the **Discord Bot Backend (Node.js)** and a **Real-Time Admin Dashboard (React + Tailwind)**.

---

## ✨ Key Features

*   **🧠 Murgi Brain Engine:** The central orchestrator that glues Memory, Emotion, Identity, and AI Providers into a single organic pipeline.
*   **🛡️ Multi-Provider Resilience (Circuit Breaker):** 
    *   Primary: **Google Gemini API** (Fast, cloud-based).
    *   Secondary: **Local Ollama (Llama 3)** (Self-hosted fallback if Gemini fails or rate-limits).
    *   Ultimate Fallback: **Simulated Dummy** (Prevents total system crashes).
*   **❤️ Emotion Engine:** Evaluates conversations to dynamically shift Murgi's mood (e.g., Playful, Sleepy, Chaos, Competitive).
*   **💾 Memory Node:** 
    *   *Short-Term:* Retains recent chat context.
    *   *Long-Term:* Stores core facts about users to make conversations feel organic and continuous.
*   **🎭 Identity Manager:** Dynamically switches Discord bot profiles/avatars based on current emotional states (respecting Discord's rate limits).
*   **🎛️ Admin Dashboard:** A sleek, real-time React control panel to monitor brain states, memory stats, and inject thoughts directly into the system.

---

## 🛠️ Prerequisites

*   **Node.js** (v18 or higher)
*   **Discord Bot Token** (Create a bot via [Discord Developer Portal](https://discord.com/developers/applications) and enable Message Content Intent)
*   **Gemini API Key** (Get from [Google AI Studio](https://aistudio.google.com/))
*   *(Optional)* **Ollama** installed locally or on your server for self-hosted AI fallback.

---

## 🚀 Installation & Local Setup

1. **Clone or Download the repository.**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure Environment Variables:**
   Rename `.env.example` to `.env` and fill in your details:
   ```env
   GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
   APP_URL="http://localhost:3000"
   DISCORD_TOKEN="YOUR_DISCORD_BOT_TOKEN"

   # Optional: Local Ollama Fallback
   OLLAMA_BASE_URL="http://127.0.0.1:11434"
   OLLAMA_MODEL="llama3"
   ```
4. **Run in Development Mode:**
   ```bash
   npm run dev
   ```
   *The server will start on `http://localhost:3000` (serving both the Discord Bot and the React Dashboard).*

5. **Build & Run for Production:**
   ```bash
   npm run build
   npm start
   ```

---

## 💻 Server & Hosting Recommendations

Depending on how you want to process the AI responses, here are the recommended VPS (Virtual Private Server) configurations:

### Scenario A: Using Cloud APIs (Gemini) - *Recommended for Budget*
If you rely on Gemini API for AI generation, the server only needs to run the Node.js application.
*   **Minimum Specs:** 1 vCPU, 1 GB RAM (2 GB Recommended)
*   **Storage:** 10 - 20 GB SSD/NVMe
*   **Best for:** Render, Railway, DigitalOcean Basic Droplets, Hetzner CX11.

### Scenario B: Self-Hosted Local AI (Ollama + Llama 3)
If you want total privacy and wish to run Llama 3 locally via Ollama alongside the bot.
*   **Minimum Specs:** 2 vCPU, 8 GB RAM (Will run, but generation takes 5-15 seconds).
*   **Recommended Specs:** 4 vCPU, 16 GB RAM.
*   **Storage:** 50 GB+ NVMe.
*   **Best for:** Hetzner CPX31, Contabo VPS 2.

---

## 🏗️ Architecture / Code Structure

*   `/server.ts`: The main Express server entry point, binding the AI Core and React Dashboard.
*   `/src/backend/core/`: Contains the `MurgiBrain` orchestrator.
*   `/src/backend/discord/`: Handles the Discord.js client and message event parsing.
*   `/src/backend/emotion/`: Evaluates interaction sentiment to determine the current state.
*   `/src/backend/identity/`: Manages character profile logic.
*   `/src/backend/memory/`: Manages short-term context and long-term user facts.
*   `/src/backend/providers/`: Holds the `ProviderManager` (Circuit Breaker) and individual AI providers (Gemini, Ollama).
*   `/src/App.tsx`: The frontend React component for the Admin Control Panel.

---

## 🛡️ License
Private / Proprietary.
